from django.db.models import Count, Q
from rest_framework import serializers

from .models import Category, SubCategory, Brand, Attribute, AttributeValue


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

    class Meta:
        model = Category
        fields = ["id", "name", "description", "sub_categories"]

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
