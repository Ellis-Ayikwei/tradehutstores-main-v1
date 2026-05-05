from django.conf import settings
from rest_framework import serializers
from apps.catalog.models import AttributeValue as CatalogAttributeValue
from .models import (
    Product,
    ProductVariant,
    ProductImage,
    Inventory,
    ProductDiscount,
    ProductKeyFeature,
)


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductVariantAttributeValueSerializer(serializers.ModelSerializer):
    """Exposes swatch metadata (`color_code`, `image`) for PDP variant pickers."""

    attribute_name = serializers.CharField(source="attribute.name", read_only=True)
    attribute_display_type = serializers.CharField(
        source="attribute.display_type", read_only=True
    )
    image = serializers.SerializerMethodField()

    class Meta:
        model = CatalogAttributeValue
        fields = [
            "id",
            "attribute",
            "attribute_name",
            "attribute_display_type",
            "value_name",
            "color_code",
            "image",
        ]

    def get_image(self, obj):
        if not obj.image:
            return None
        request = self.context.get("request")
        try:
            url = obj.image.url
        except ValueError:
            return None
        return request.build_absolute_uri(url) if request else url


class ProductVariantSerializer(serializers.ModelSerializer):
    attribute_values = ProductVariantAttributeValueSerializer(
        many=True, read_only=True
    )
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = ProductVariant
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_primary_image(self, obj):
        """Main variant gallery image (``is_main`` first), else first image row."""
        cache = getattr(obj, "_prefetched_objects_cache", None) or {}
        if "product_variant_images" in cache:
            rows = [
                r
                for r in cache["product_variant_images"]
                if r.image and getattr(r.image, "name", None)
            ]
        else:
            rows = list(
                obj.product_variant_images.exclude(image="")
                .exclude(image__isnull=True)
                .order_by("-is_main", "created_at")
            )
        if not rows:
            return None
        main = next((r for r in rows if r.is_main), None)
        row = main or rows[0]
        try:
            url = row.image.url
        except ValueError:
            return None
        if not url:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class ProductVariantWriteSerializer(serializers.ModelSerializer):
    """
    Create/update payloads: ``attribute_values`` is a list of AttributeValue UUIDs.
    (Read serializers keep nested AttributeValue rendering for PDP/admin views.)
    """

    attribute_values = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=CatalogAttributeValue.objects.all(),
        required=False,
    )

    class Meta:
        model = ProductVariant
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class InventorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Inventory
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductDiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductDiscount
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductKeyFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductKeyFeature
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["pricing_currency"] = str(
            getattr(settings, "TRADEHUT_STORE_BASE_CURRENCY", "USD")
        ).upper()
        disp = instance.display_main_image
        if disp:
            request = self.context.get("request")
            try:
                url = disp.url
            except ValueError:
                url = None
            if url:
                data["main_product_image"] = (
                    request.build_absolute_uri(url) if request else url
                )
        # Convenience fields for storefront / admin grids (nested FK ids only in ``__all__``).
        data["category_name"] = getattr(instance.category, "name", None)
        data["sub_category_name"] = getattr(
            instance.sub_category, "sub_category_name", None
        )
        data["brand_name"] = getattr(instance.brand, "name", None)

        prefetch = getattr(instance, "_prefetched_objects_cache", None) or {}
        if "variants" in prefetch:
            variant_list = list(prefetch["variants"])
        else:
            variant_list = list(instance.variants.all())

        primary = instance.default_variant
        if primary is None and variant_list:
            primary = variant_list[0]
        data["primary_sku"] = primary.sku if primary else None
        if primary is not None and getattr(primary, "price", None) is not None:
            data["primary_variant_price"] = str(primary.price)
        else:
            data["primary_variant_price"] = None
        data["variant_stock_total"] = sum((v.quantity or 0) for v in variant_list)

        return data


class ProductCatalogSerializer(serializers.ModelSerializer):
    """
    Catalog money fields (`price`, `final_price`) are in **pricing_currency**
    (settings.TRADEHUT_STORE_BASE_CURRENCY). API clients should convert client-side or call
    GET …/core/fx/snapshot/ for rates (Frankfurter-backed when enabled).
    """

    category = serializers.CharField(source="category.name", read_only=True)
    sub_category = serializers.CharField(source="sub_category.sub_category_name", read_only=True)
    brand = serializers.CharField(source="brand.name", read_only=True)
    price = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()
    pricing_currency = serializers.SerializerMethodField()
    rating = serializers.DecimalField(
        source="average_rating", max_digits=3, decimal_places=2, read_only=True
    )
    main_product_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "main_product_image",
            "price",
            "final_price",
            "pricing_currency",
            "discount_percentage",
            "rating",
            "total_reviews",
            "category",
            "sub_category",
            "brand",
            "condition",
            "available",
            "created_at",
        ]

    def get_pricing_currency(self, _obj) -> str:
        return str(getattr(settings, "TRADEHUT_STORE_BASE_CURRENCY", "USD")).upper()

    def get_main_product_image(self, obj):
        f = obj.display_main_image
        if not f:
            return None
        request = self.context.get("request")
        try:
            url = f.url
        except ValueError:
            return None
        return request.build_absolute_uri(url) if request else url

    def _resolve_variant_price(self, obj):
        if obj.default_variant and obj.default_variant.price is not None:
            return obj.default_variant.price
        first_variant = obj.variants.order_by("created_at").first()
        if first_variant and first_variant.price is not None:
            return first_variant.price
        return None

    def get_price(self, obj):
        return self._resolve_variant_price(obj)

    def get_final_price(self, obj):
        price = self._resolve_variant_price(obj)
        if price is None:
            return None

        discount = obj.discount_percentage or 0
        return price - (price * discount / 100)

