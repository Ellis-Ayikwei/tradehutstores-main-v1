"""
merchandising/serializers.py
"""

from rest_framework import serializers
from .models import HomepageSection


class HomepageSectionSerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()
    is_live  = serializers.BooleanField(read_only=True)

    class Meta:
        model  = HomepageSection
        fields = (
            "id", "title", "subtitle", "slug", "section_type",
            "max_products", "position", "is_live",
            "starts_at", "ends_at", "show_countdown",
            "background_color", "accent_color",
            "products",
        )

    def get_products(self, obj):
        # Products are pre-resolved and injected via context by the view
        from apps.products.serializers import ProductSearchSerializer
        products = self.context.get("products", [])
        return ProductSearchSerializer(
            products, many=True, context=self.context
        ).data
