"""
User and Seller Profile Serializers
"""

from rest_framework import serializers
from django.contrib.auth.models import Group, Permission
from .models import (
    User,
    Profile,
    Address,
    UserSearchHistory,
)
from apps.wishlist.models import Wishlist, WishlistItem, Favorite
from apps.cart.models import Cart, CartItem
from apps.orders.models import Order, OrderItem
from apps.reviews.models import Review
from django.utils.text import slugify


class UserBasicSerializer(serializers.ModelSerializer):
    """
    Basic user information serializer
    """

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "is_active"]
        read_only_fields = ["id"]


class GroupSerializer(serializers.ModelSerializer):
    """
    Serializer for Django Group model
    """

    permissions = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(), many=True, required=False
    )

    class Meta:
        model = Group
        fields = ["id", "name", "permissions"]
        read_only_fields = ["id"]


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "name", "codename", "content_type"]
        read_only_fields = fields


class GroupDetailSerializer(serializers.ModelSerializer):
    users = serializers.SerializerMethodField()
    permissions = PermissionSerializer(many=True, read_only=True)
    user_count = serializers.SerializerMethodField()
    permission_count = serializers.SerializerMethodField()

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "users",
            "permissions",
            "user_count",
            "permission_count",
        ]

    def get_users(self, obj):
        return [
            {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
            for user in obj.user_set.all()
        ]

    def get_user_count(self, obj):
        return obj.user_set.count()

    def get_permission_count(self, obj):
        return obj.permissions.count()


class UserWithGroupsSerializer(serializers.ModelSerializer):
    groups = GroupSerializer(many=True, read_only=True)
    user_permissions = PermissionSerializer(
        many=True, read_only=True, source="user_permissions.all"
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "is_staff",
            "is_superuser",
            "is_active",
            "date_joined",
            "last_login",
            "groups",
            "user_permissions",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(), many=True, required=False
    )
    user_permissions = serializers.PrimaryKeyRelatedField(
        queryset=Permission.objects.all(), many=True, required=False
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "is_active",
            "is_staff",
            "is_superuser",
            "groups",
            "user_permissions",
        ]
        read_only_fields = ["id"]

    def update(self, instance, validated_data):
        groups = validated_data.pop("groups", None)
        perms = validated_data.pop("user_permissions", None)
        instance = super().update(instance, validated_data)
        if groups is not None:
            instance.groups.set(groups)
        if perms is not None:
            instance.user_permissions.set(perms)
        return instance


class UserProfileSerializer(serializers.ModelSerializer):
    """
    User profile serializer with groups and extended information
    Used for /users/{id}/profile/ endpoint
    """

    groups = GroupSerializer(many=True, read_only=True)
    name = serializers.SerializerMethodField()
    user_type = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "name",
            "is_active",
            "is_staff",
            "is_superuser",
            "groups",
            "user_type",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]

    def get_name(self, obj):
        """Get full name or fallback to username"""
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}".strip()
        elif obj.first_name:
            return obj.first_name
        elif obj.last_name:
            return obj.last_name
        return obj.username

    def get_user_type(self, obj):
        """Get user type - check if user has a profile with user_type or use is_staff/is_superuser"""
        # Check if user has a profile model with user_type
        # For now, derive from is_staff/is_superuser flags
        if obj.is_superuser:
            return "super_admin"
        elif obj.is_staff:
            return "admin"
        else:
            # Check if there's a user_type field or related profile
            # You can extend this based on your actual user_type implementation
            return getattr(obj, "user_type", None) or "user"


class ProfileSerializer(serializers.ModelSerializer):
    """
    User profile serializer
    """

    class Meta:
        model = Profile
        fields = "__all__"


class AddressSerializer(serializers.ModelSerializer):
    """
    Address serializer
    """

    class Meta:
        model = Address
        fields = "__all__"


class SellerProfilePublicSerializer(serializers.ModelSerializer):
    """
    Public seller profile (limited information for customers)
    """

    rating_percentage = serializers.SerializerMethodField()

    class Meta:
        model = None
        fields = [
            "id",
            "business_name",
            "business_description",
            "store_logo",
            "store_banner",
            "store_slug",
            "rating",
            "total_reviews",
            "rating_percentage",
            "total_orders",
            "is_verified",
            "is_accepting_orders",
            "return_policy",
            "shipping_policy",
            "website_url",
            "facebook_url",
            "instagram_url",
            "twitter_url",
        ]

    def get_rating_percentage(self, obj):
        return obj.get_rating_percentage()


class SellerStatsSerializer(serializers.Serializer):
    total_sales = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_orders = serializers.IntegerField()
    total_products = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    total_reviews = serializers.IntegerField()
    recent_orders = serializers.ListField()


class FavoriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favorite
        fields = ["id", "user", "product", "created_at"]
        read_only_fields = ["id", "created_at"]


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_variant_sku = serializers.CharField(
        source="product_variant.sku", read_only=True
    )

    class Meta:
        model = CartItem
        fields = [
            "id",
            "cart",
            "product",
            "product_variant",
            "product_name",
            "product_variant_sku",
            "selected_variant_configuartion",
            "quantity",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(source="cartitem_set", many=True, read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "user", "items", "item_count", "created_at", "updated_at"]
        read_only_fields = [
            "id",
            "user",
            "items",
            "item_count",
            "created_at",
            "updated_at",
        ]

    def get_item_count(self, obj):
        return obj.cartitem_set.count()


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "order",
            "product",
            "product_name",
            "quantity",
            "unit_price",
            "total_price",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(source="orderitem_set", many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "user",
            "total_amount",
            "order_status",
            "address_id",
            "pay_mode",
            "phone",
            "estimated_delivery_date",
            "items",
            "created_at",
            "updated_at",
        ]

    read_only_fields = ["id", "created_at", "updated_at"]


class ReviewSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = Review
        fields = [
            "id",
            "product",
            "product_name",
            "user",
            "rating",
            "comment",
            "verified",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
