from django.db.models import Count, Q
from rest_framework import serializers

from .models import (
    Attribute,
    AttributeValue,
    AttributeValueRequest,
    Brand,
    Category,
    SubCategory,
)
from .services import COLOR_CODE_VALIDATOR, MIN_REJECT_NOTE_LENGTH, normalise_value_name


class SubCategorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    active_product_count = serializers.SerializerMethodField()

    class Meta:
        model = SubCategory
        fields = [
            "id",
            "sub_category_name",
            "category",
            "category_name",
            "active_product_count",
        ]

    def get_active_product_count(self, obj):
        if hasattr(obj, "active_product_count"):
            return obj.active_product_count
        return obj.product_set.filter(status="Active").count()


class SubCategoryNestedSerializer(SubCategorySerializer):
    """Subcategories embedded under a category (no redundant category FK)."""

    class Meta(SubCategorySerializer.Meta):
        fields = ["id", "sub_category_name", "active_product_count"]


class CategorySerializer(serializers.ModelSerializer):
    """
    Nested subcategories are omitted unless the view sets
    context['include_subcategories'] (see ``?include=subcategories`` on categories).
    """

    sub_categories = serializers.SerializerMethodField()
    tile_image = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "description",
            "sub_categories",
            "show_on_home",
            "home_position",
            "home_label",
            "tile_icon",
            "tile_image",
        ]

    def get_tile_image(self, obj):
        if not obj.tile_image:
            return None
        request = self.context.get("request")
        url = obj.tile_image.url
        return request.build_absolute_uri(url) if request else url

    def get_sub_categories(self, obj):
        if not self.context.get("include_subcategories"):
            return None
        cache = getattr(obj, "_prefetched_objects_cache", None) or {}
        if "subcategory_set" in cache:
            subs = cache["subcategory_set"]
        else:
            subs = (
                SubCategory.objects.filter(category_id=obj.pk)
                .select_related("category")
                .annotate(
                    active_product_count=Count(
                        "product", filter=Q(product__status="Active")
                    ),
                )
            )
        return SubCategoryNestedSerializer(subs, many=True).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get("sub_categories") is None:
            data.pop("sub_categories", None)
        return data


class BrandSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = Brand
        fields = ["id", "name", "category", "category_name"]


class AttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attribute
        fields = ["id", "name", "display_type"]


class AttributeValueSerializer(serializers.ModelSerializer):
    attribute_name = serializers.CharField(source="attribute.name", read_only=True)

    class Meta:
        model = AttributeValue
        fields = ["id", "attribute", "attribute_name", "value_name", "color_code", "image"]


# ---------------------------------------------------------------- value requests

def _value_ref(value):
    if value is None:
        return None
    return {"id": str(value.pk), "value_name": value.value_name, "color_code": value.color_code}


class AttributeValueRequestCreateSerializer(serializers.Serializer):
    attribute = serializers.PrimaryKeyRelatedField(queryset=Attribute.objects.all())
    value_name = serializers.CharField(max_length=100)
    color_code = serializers.CharField(
        max_length=7, required=False, allow_blank=True, validators=[COLOR_CODE_VALIDATOR]
    )
    note = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate_value_name(self, value):
        value = normalise_value_name(value)
        if not value:
            raise serializers.ValidationError("This field may not be blank.")
        return value

    def validate_note(self, value):
        return (value or "").strip()


class AttributeValueRequestSerializer(serializers.ModelSerializer):
    """Seller view of their own request."""

    attribute = serializers.SerializerMethodField()
    created_value = serializers.SerializerMethodField()

    class Meta:
        model = AttributeValueRequest
        fields = [
            "id",
            "attribute",
            "value_name",
            "color_code",
            "note",
            "status",
            "review_note",
            "created_on",
            "created_value",
        ]
        read_only_fields = fields

    def get_attribute(self, obj):
        return {"id": str(obj.attribute_id), "name": obj.attribute.name}

    def get_created_value(self, obj):
        return _value_ref(obj.created_value)


class AttributeValueRequestAdminSerializer(AttributeValueRequestSerializer):
    """Staff view: adds the requester and review timestamp."""

    requester = serializers.SerializerMethodField()

    class Meta(AttributeValueRequestSerializer.Meta):
        fields = AttributeValueRequestSerializer.Meta.fields + ["requester", "reviewed_at"]
        read_only_fields = fields

    def get_requester(self, obj):
        user = obj.requested_by
        return {
            "id": str(user.pk),
            "email": user.email,
            "store_name": obj.seller.business_name if obj.seller_id else "",
        }


class AttributeValueRequestApproveSerializer(serializers.Serializer):
    value_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    color_code = serializers.CharField(
        max_length=7, required=False, allow_blank=True, validators=[COLOR_CODE_VALIDATOR]
    )

    def validate_value_name(self, value):
        return normalise_value_name(value)


class AttributeValueRequestRejectSerializer(serializers.Serializer):
    review_note = serializers.CharField(max_length=1000, trim_whitespace=True)

    def validate_review_note(self, value):
        value = value.strip()
        if len(value) < MIN_REJECT_NOTE_LENGTH:
            raise serializers.ValidationError(
                f"Enter at least {MIN_REJECT_NOTE_LENGTH} characters."
            )
        return value
