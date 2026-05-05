"""
apps.search.serializers

Lightweight serializers tailored for search hits. We don't reuse
``ProductCatalogSerializer`` from apps.products because:
  * Search hits often need the relevance score / similarity score attached.
  * We never want N+1 round-trips for variant prices on a result page.
"""

from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from apps.products.models import Product


class SearchProductSerializer(serializers.ModelSerializer):
    """
    Frontend-friendly product card payload.

    Mirrors ``ProductCatalogSerializer`` shape so the existing FE product
    grid can render search results without a parallel renderer.
    """

    category = serializers.SerializerMethodField()
    sub_category = serializers.SerializerMethodField()
    brand = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()
    main_product_image = serializers.SerializerMethodField()
    price = serializers.SerializerMethodField()
    final_price = serializers.SerializerMethodField()
    rating = serializers.DecimalField(
        source="average_rating", max_digits=3, decimal_places=2, read_only=True
    )
    in_stock = serializers.BooleanField(source="available", read_only=True)

    class Meta:
        model = Product
        fields = (
            "id",
            "slug",
            "name",
            "description",
            "image",
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
            "in_stock",
            "created_at",
        )

    def get_category(self, obj: Product):
        return getattr(obj.category, "name", None) if obj.category_id else None

    def get_sub_category(self, obj: Product):
        sc = obj.sub_category
        return getattr(sc, "sub_category_name", None) if sc else None

    def get_brand(self, obj: Product):
        return getattr(obj.brand, "name", None) if obj.brand_id else None

    def get_image(self, obj: Product):
        return self._image_url(obj)

    def get_main_product_image(self, obj: Product):
        return self._image_url(obj)

    def _image_url(self, obj: Product) -> str | None:
        img = obj.display_main_image
        if not img:
            return None
        try:
            return img.url
        except Exception:  # noqa: BLE001 - image not accessible
            return str(img)

    def _resolve_price(self, obj: Product) -> Decimal | None:
        if obj.default_variant_id and obj.default_variant and obj.default_variant.price is not None:
            return obj.default_variant.price
        first = obj.variants.order_by("created_at").first()
        return first.price if first and first.price is not None else None

    def get_price(self, obj: Product):
        price = self._resolve_price(obj)
        return float(price) if price is not None else None

    def get_final_price(self, obj: Product):
        price = self._resolve_price(obj)
        if price is None:
            return None
        discount = Decimal(obj.discount_percentage or 0)
        return float(price - (price * discount / 100))


class SearchHitSerializer(serializers.Serializer):
    """Slim payload optimised for the autocomplete dropdown."""

    id = serializers.CharField()
    name = serializers.CharField()
    price = serializers.FloatField(allow_null=True, required=False)
    image = serializers.CharField(allow_null=True, required=False)
    category = serializers.CharField(allow_null=True, required=False)
    score = serializers.FloatField(required=False)
