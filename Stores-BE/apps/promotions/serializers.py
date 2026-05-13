"""
Serializers for the promo code system.

  - Public:  validate request/response, applicable list (cart sidebar)
  - Admin:   full CRUD over PromoCode for ops
  - Seller:  same as admin but ``seller`` is forced to the request user's profile
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import PromoCode, PromoPolicy, PromoRedemption, ReferralCode

# Discount types a seller is NOT allowed to create.
SELLER_FORBIDDEN_DISCOUNT_TYPES = {
    PromoCode.DiscountType.FREE_SHIPPING,  # shipping is platform-controlled
    PromoCode.DiscountType.FIXED_PRICE,    # too easy to nuke margin by mistake
}


# ─── Public (cart / checkout) ─────────────────────────────────────────────────


class PromoValidationRequestSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    subtotal = serializers.DecimalField(max_digits=12, decimal_places=2)
    item_count = serializers.IntegerField(min_value=0)
    item_ids = serializers.ListField(child=serializers.CharField(), default=list)
    category_ids = serializers.ListField(child=serializers.CharField(), default=list)
    seller_ids = serializers.ListField(child=serializers.CharField(), default=list)
    seller_subtotals = serializers.DictField(
        child=serializers.DecimalField(max_digits=12, decimal_places=2),
        default=dict,
    )
    session_key = serializers.CharField(max_length=64, default="", allow_blank=True)


class PromoValidationResponseSerializer(serializers.Serializer):
    valid = serializers.BooleanField()
    code = serializers.CharField()
    discount_type = serializers.CharField(allow_blank=True)
    discount_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    free_shipping = serializers.BooleanField()
    description = serializers.CharField(allow_blank=True)
    error_code = serializers.CharField(allow_blank=True)
    error_message = serializers.CharField(allow_blank=True)


# ─── Admin ────────────────────────────────────────────────────────────────────


class PromoCodeAdminListSerializer(serializers.ModelSerializer):
    is_live = serializers.SerializerMethodField()
    redemptions_remaining = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()
    is_seller_scoped = serializers.SerializerMethodField()
    discount_label = serializers.SerializerMethodField()

    class Meta:
        model = PromoCode
        fields = (
            "id",
            "code",
            "name",
            "description",
            "is_active",
            "is_live",
            "seller",
            "seller_name",
            "is_seller_scoped",
            "discount_type",
            "discount_value",
            "discount_label",
            "max_discount_amount",
            "target_type",
            "min_order_value",
            "min_items_count",
            "max_redemptions",
            "max_redemptions_per_user",
            "current_redemptions",
            "redemptions_remaining",
            "starts_at",
            "ends_at",
            "auto_apply",
            "auto_apply_priority",
            "stackable",
            "first_order_only",
            "created_at",
            "updated_at",
        )

    def get_is_live(self, obj):
        return obj.is_live

    def get_redemptions_remaining(self, obj):
        return obj.redemptions_remaining

    def get_seller_name(self, obj):
        return getattr(obj.seller, "business_name", None) if obj.seller_id else None

    def get_is_seller_scoped(self, obj):
        return obj.is_seller_scoped

    def get_discount_label(self, obj):
        DT = PromoCode.DiscountType
        if obj.discount_type == DT.PERCENTAGE:
            return f"{int(obj.discount_value)}% off"
        if obj.discount_type == DT.FIXED_AMOUNT:
            return f"GHS {obj.discount_value} off"
        if obj.discount_type == DT.FREE_SHIPPING:
            return "Free shipping"
        if obj.discount_type == DT.BUY_X_GET_Y:
            return f"Buy {obj.buy_quantity} get {obj.get_quantity}"
        if obj.discount_type == DT.FIXED_PRICE:
            return f"Pay GHS {obj.fixed_price}"
        return ""


class PromoCodeAdminDetailSerializer(PromoCodeAdminListSerializer):
    products = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    categories = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    specific_users = serializers.PrimaryKeyRelatedField(many=True, read_only=True)

    class Meta(PromoCodeAdminListSerializer.Meta):
        fields = PromoCodeAdminListSerializer.Meta.fields + (
            "products",
            "categories",
            "specific_users",
            "buy_quantity",
            "get_quantity",
            "fixed_price",
            "include_free_shipping",
            "user_segment",
        )


class PromoCodeAdminWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = (
            "code",
            "name",
            "description",
            "is_active",
            "seller",
            "discount_type",
            "discount_value",
            "max_discount_amount",
            "buy_quantity",
            "get_quantity",
            "fixed_price",
            "target_type",
            "products",
            "categories",
            "include_free_shipping",
            "min_order_value",
            "min_items_count",
            "user_segment",
            "specific_users",
            "stackable",
            "first_order_only",
            "max_redemptions",
            "max_redemptions_per_user",
            "starts_at",
            "ends_at",
            "auto_apply",
            "auto_apply_priority",
        )
        extra_kwargs = {
            "products": {"required": False},
            "categories": {"required": False},
            "specific_users": {"required": False},
        }

    def validate_code(self, value: str) -> str:
        v = (value or "").strip().upper()
        if not v:
            raise serializers.ValidationError("Code cannot be empty.")
        return v

    def validate(self, attrs):
        instance = self.instance
        DT = PromoCode.DiscountType
        dt = attrs.get("discount_type") or (instance and instance.discount_type)
        dv = attrs.get("discount_value") if "discount_value" in attrs else (instance and instance.discount_value)
        if dt == DT.PERCENTAGE and dv is not None and not (0 < dv <= 100):
            raise serializers.ValidationError({"discount_value": "Percentage must be between 1 and 100."})
        return attrs


# ─── Seller-scoped (same as admin write but no ``seller`` field) ─────────────


class PromoCodeSellerWriteSerializer(serializers.ModelSerializer):
    """Seller-scoped CRUD with marketplace guardrails enforced.

    Enforced rules (read from the live ``PromoPolicy`` singleton so admins can
    tune them without redeploying):

      - Discount type cannot be FREE_SHIPPING or FIXED_PRICE.
      - PERCENTAGE discount_value cannot exceed ``max_seller_discount_percentage``.
      - ``include_free_shipping`` must be False (shipping is platform-only).
      - ``stackable`` must be False (per-code opt-in is admin-only).
      - ``auto_apply`` must be False (auto-apply is platform-only).
      - ``target_type`` must be ENTIRE_ORDER, PRODUCTS, or SELLER_PRODUCTS;
        any ``products`` listed must belong to the requesting seller.
      - ``categories`` cannot be set (sellers don't own categories).
      - On create, the seller must not have hit ``max_seller_codes_per_month``.
      - If ``seller_max_redemptions_cap`` is set, ``max_redemptions`` is capped.

    The seller FK is filled by the viewset from ``request.user.seller_profile``.
    """

    class Meta:
        model = PromoCode
        fields = (
            "code",
            "name",
            "description",
            "is_active",
            "discount_type",
            "discount_value",
            "max_discount_amount",
            "buy_quantity",
            "get_quantity",
            "fixed_price",
            "target_type",
            "products",
            "categories",
            "include_free_shipping",
            "min_order_value",
            "min_items_count",
            "user_segment",
            "specific_users",
            "stackable",
            "first_order_only",
            "max_redemptions",
            "max_redemptions_per_user",
            "starts_at",
            "ends_at",
            "auto_apply",
            "auto_apply_priority",
        )

    def _seller(self):
        request = self.context.get("request")
        return getattr(request and request.user, "seller_profile", None)

    def validate_code(self, value: str) -> str:
        v = (value or "").strip().upper()
        if not v:
            raise serializers.ValidationError("Code cannot be empty.")
        return v

    def validate_discount_type(self, value):
        if value in SELLER_FORBIDDEN_DISCOUNT_TYPES:
            raise serializers.ValidationError(
                "This discount type is reserved for the platform — sellers can use percentage, fixed amount, or buy-X-get-Y."
            )
        return value

    def validate_include_free_shipping(self, value):
        if value:
            raise serializers.ValidationError("Sellers cannot grant free shipping — that's platform-controlled.")
        return value

    def validate_stackable(self, value):
        if value:
            raise serializers.ValidationError(
                "Stackable codes are admin-only. Contact support if you need this for a campaign."
            )
        return value

    def validate_auto_apply(self, value):
        if value:
            raise serializers.ValidationError("Auto-apply is reserved for platform-wide promos.")
        return value

    def validate_categories(self, value):
        if value:
            raise serializers.ValidationError(
                "Sellers cannot target categories — use 'specific products' or 'all of seller's products' instead."
            )
        return value

    def validate_target_type(self, value):
        allowed = {
            PromoCode.TargetType.ENTIRE_ORDER,
            PromoCode.TargetType.PRODUCTS,
            PromoCode.TargetType.SELLER_PRODUCTS,
        }
        if value not in allowed:
            raise serializers.ValidationError(
                "Sellers can only target the entire order, specific products, or all their products."
            )
        return value

    def validate_products(self, value):
        if not value:
            return value
        seller = self._seller()
        if seller is None:
            raise serializers.ValidationError("Could not resolve your seller profile.")
        # Each product must belong to this seller.
        bad = [p for p in value if getattr(p, "seller_id", None) != seller.pk]
        if bad:
            raise serializers.ValidationError(
                "You can only target products that belong to your store."
            )
        return value

    def validate(self, attrs):
        policy = PromoPolicy.get_active()
        instance = self.instance
        DT = PromoCode.DiscountType

        # Resolve the effective discount_type / value (handles partial updates).
        dt = attrs.get("discount_type") or (instance and instance.discount_type)
        dv = attrs.get("discount_value") if "discount_value" in attrs else (instance and instance.discount_value)

        if dt == DT.PERCENTAGE and dv is not None:
            if not (0 < float(dv) <= 100):
                raise serializers.ValidationError({"discount_value": "Percentage must be between 1 and 100."})
            if float(dv) > policy.max_seller_discount_percentage:
                raise serializers.ValidationError(
                    {
                        "discount_value": (
                            f"Maximum discount for sellers is {policy.max_seller_discount_percentage}%. "
                            f"Contact support if your campaign needs more."
                        )
                    }
                )

        # Cap on max_redemptions (if policy sets one).
        cap = policy.seller_max_redemptions_cap
        if cap and attrs.get("max_redemptions") and attrs["max_redemptions"] > cap:
            raise serializers.ValidationError(
                {"max_redemptions": f"Per-code redemption cap for sellers is {cap}."}
            )

        # Monthly creation limit (only enforced on create).
        if instance is None and policy.max_seller_codes_per_month:
            seller = self._seller()
            if seller:
                month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                count = PromoCode.objects.filter(seller=seller, created_at__gte=month_start).count()
                if count >= policy.max_seller_codes_per_month:
                    raise serializers.ValidationError(
                        {
                            "code": (
                                f"You've already created {count} codes this month "
                                f"(limit: {policy.max_seller_codes_per_month}). "
                                f"Pause or delete an old code to free a slot, or wait until next month."
                            )
                        }
                    )

        return attrs


# ─── Redemption + Referral ────────────────────────────────────────────────────


class PromoRedemptionSerializer(serializers.ModelSerializer):
    promo_code = serializers.CharField(source="promo.code", read_only=True)
    user_email = serializers.SerializerMethodField()

    class Meta:
        model = PromoRedemption
        fields = (
            "id",
            "promo",
            "promo_code",
            "user",
            "user_email",
            "order_id",
            "session_key",
            "discount_amount",
            "order_subtotal",
            "discount_type_snap",
            "discount_value_snap",
            "created_at",
        )
        read_only_fields = fields

    def get_user_email(self, obj):
        return getattr(obj.user, "email", None)


class PromoPolicySerializer(serializers.ModelSerializer):
    """Read/write the marketplace-wide promo policy."""

    class Meta:
        model = PromoPolicy
        fields = (
            "id",
            "max_seller_discount_percentage",
            "max_seller_codes_per_month",
            "seller_max_redemptions_cap",
            "commission_basis",
            "allow_seller_platform_stacking",
            "public_storefront_codes_visible",
            "updated_at",
        )
        read_only_fields = ("id", "updated_at")


class ReferralCodeSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    referral_promo_code = serializers.CharField(source="referral_promo.code", read_only=True, default=None)

    class Meta:
        model = ReferralCode
        fields = (
            "id",
            "user",
            "user_email",
            "code",
            "referral_promo",
            "referral_promo_code",
            "reward_type",
            "reward_value",
            "total_referrals",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("total_referrals", "code")

    def get_user_email(self, obj):
        return getattr(obj.user, "email", None)
