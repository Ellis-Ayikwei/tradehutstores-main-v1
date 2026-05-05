from rest_framework import serializers
from .models import Wishlist, WishlistItem, Favorite


class WishlistItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)
    product_price = serializers.DecimalField(
        source="product.default_variant.price",
        read_only=True,
        max_digits=10,
        decimal_places=2,
    )
    product_image = serializers.SerializerMethodField()

    class Meta:
        model = WishlistItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_slug",
            "product_price",
            "product_image",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "product_name",
            "product_slug",
            "product_price",
            "product_image",
        ]

    def get_product_image(self, obj):
        img = getattr(obj.product, "display_main_image", None) if obj.product else None
        if not img:
            return None
        try:
            request = self.context.get("request")
            url = img.url
            return request.build_absolute_uri(url) if request else url
        except Exception:
            return None


class WishlistSerializer(serializers.ModelSerializer):
    items = WishlistItemSerializer(source="wishlistitem_set", many=True, read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Wishlist
        fields = ["id", "user", "items", "item_count", "created_at", "updated_at"]
        read_only_fields = ["id", "user", "items", "item_count", "created_at", "updated_at"]

    def get_item_count(self, obj):
        return obj.wishlistitem_set.count()


class FavoriteSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_slug = serializers.CharField(source="product.slug", read_only=True)

    class Meta:
        model = Favorite
        fields = ["id", "product", "product_name", "product_slug", "created_at"]
        read_only_fields = ["id", "product_name", "product_slug", "created_at"]

    def create(self, validated_data):
        request = self.context.get("request")
        user = request.user if request else None
        # prevent duplicates
        fav, _ = Favorite.objects.get_or_create(user=user, product=validated_data["product"])
        return fav

