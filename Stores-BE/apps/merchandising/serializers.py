from rest_framework import serializers

from apps.products.serializers import ProductCatalogSerializer

from .models import HomepageSection


class HomepageSectionSerializer(serializers.ModelSerializer):
    products = serializers.SerializerMethodField()
    is_live = serializers.SerializerMethodField()

    class Meta:
        model = HomepageSection
        fields = (
            "id",
            "title",
            "subtitle",
            "slug",
            "section_type",
            "max_products",
            "position",
            "is_live",
            "starts_at",
            "ends_at",
            "show_countdown",
            "background_color",
            "accent_color",
            "products",
        )

    def get_is_live(self, obj: HomepageSection) -> bool:
        return obj.is_live

    def get_products(self, obj: HomepageSection):
        products = self.context.get("products") or []
        return ProductCatalogSerializer(products, many=True, context=self.context).data
