from rest_framework import serializers
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


class ProductVariantSerializer(serializers.ModelSerializer):
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


class ProductCatalogSerializer(serializers.ModelSerializer):
    category = serializers.CharField(source="category.name", read_only=True)
    sub_category = serializers.CharField(source="sub_category.sub_category_name", read_only=True)
    brand = serializers.CharField(source="brand.name", read_only=True)
    price = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()
    rating = serializers.DecimalField(
        source="average_rating", max_digits=3, decimal_places=2, read_only=True
    )

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

