"""
products/serializers.py  (search-specific serializer)
Add this to your existing serializers.py or import from here.
"""

from rest_framework import serializers
from .models import Product


class ProductSearchSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for search results and the autocomplete dropdown.
    Only includes fields needed to render a product card.
    """
    category = serializers.SerializerMethodField()
    brand    = serializers.SerializerMethodField()
    image    = serializers.SerializerMethodField()

    class Meta:
        model  = Product
        fields = ("id", "name", "price", "final_price", "image", "category", "brand", "in_stock")

    def get_category(self, obj):
        return getattr(obj.category, "name", None) if hasattr(obj, "category") else None

    def get_brand(self, obj):
        return getattr(obj.brand, "name", None) if hasattr(obj, "brand") else None

    def get_image(self, obj):
        return obj.main_product_image or getattr(obj, "image", None)
