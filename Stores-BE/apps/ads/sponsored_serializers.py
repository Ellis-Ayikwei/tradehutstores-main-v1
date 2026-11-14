"""Sponsored products: input validation and the shapes clients read (plan 26)."""

from django.utils import timezone
from rest_framework import serializers

from apps.orders.services import money
from apps.products.serializers import product_display_image

from . import sponsored_services as services
from .sponsored_models import SURFACES, SponsoredPackage, SponsoredPromotion

REFUND_CHOICES = ("prorata", "none")


def _money(value) -> str:
    return str(money(value))


def _iso(value):
    return value.isoformat() if value else None


# ----------------------------------------------------------------------------- packages


class PackageSerializer(serializers.ModelSerializer):
    """Staff read/write. ``currency`` is always the store base currency (set by the model default)."""

    surfaces = serializers.ListField(child=serializers.ChoiceField(choices=SURFACES), allow_empty=False)
    duration_days = serializers.IntegerField(min_value=1, max_value=90)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=money("0.01"))
    max_concurrent = serializers.IntegerField(min_value=1, allow_null=True, required=False)

    class Meta:
        model = SponsoredPackage
        fields = (
            "id",
            "name",
            "description",
            "surfaces",
            "duration_days",
            "price",
            "currency",
            "max_concurrent",
            "is_active",
            "sort_order",
            "created_on",
        )
        read_only_fields = ("id", "currency", "created_on")

    def validate_surfaces(self, value):
        return list(dict.fromkeys(value))


class SellerPackageSerializer(PackageSerializer):
    class Meta(PackageSerializer.Meta):
        fields = ("id", "name", "description", "surfaces", "duration_days", "price", "currency")
        read_only_fields = fields


# --------------------------------------------------------------------------- promotions


class SellerPromotionSerializer(serializers.ModelSerializer):
    """One promotion as its seller sees it. Rows must come from ``sponsored_services.promotions()``."""

    display_status = serializers.SerializerMethodField()
    product = serializers.SerializerMethodField()
    package = serializers.SerializerMethodField()
    price_paid = serializers.SerializerMethodField()
    refunded_amount = serializers.SerializerMethodField()
    authorization_url = serializers.SerializerMethodField()

    class Meta:
        model = SponsoredPromotion
        fields = (
            "id",
            "status",
            "display_status",
            "product",
            "package",
            "surfaces",
            "duration_days",
            "price_paid",
            "currency",
            "source",
            "starts_on",
            "starts_at",
            "ends_at",
            "paid_at",
            "reference",
            "authorization_url",
            "refunded_amount",
            "refund_status",
            "review_note",
            "stop_reason",
            "created_on",
        )

    def _now(self):
        return self.context.get("now") or timezone.now()

    def get_display_status(self, obj):
        return services.display_status(obj, self._now())

    def get_product(self, obj):
        product = obj.product
        image = product_display_image(product)
        try:
            url = image.url if image else None
        except ValueError:
            url = None
        return {"id": str(product.pk), "name": product.name, "slug": product.slug, "image": url}

    def get_package(self, obj):
        return {"id": str(obj.package_id), "name": obj.package.name}

    def get_price_paid(self, obj):
        return _money(obj.price_paid)

    def get_refunded_amount(self, obj):
        return _money(obj.refunded_amount)

    def get_authorization_url(self, obj):
        return obj.authorization_url if obj.status == SponsoredPromotion.STATUS_AWAITING_PAYMENT else ""


class StaffPromotionSerializer(SellerPromotionSerializer):
    """Adds the seller, payment and refund fields staff need, and the pro rata refund a stop would send now."""

    seller = serializers.SerializerMethodField()
    prorata_refund = serializers.SerializerMethodField()

    class Meta(SellerPromotionSerializer.Meta):
        fields = SellerPromotionSerializer.Meta.fields + (
            "seller",
            "payment_problem",
            "provider_payload",
            "provider_refund_id",
            "refund_requested_at",
            "reviewed_by",
            "reviewed_at",
            "stopped_by",
            "stopped_at",
            "prorata_refund",
        )

    def get_seller(self, obj):
        return {"id": str(obj.seller_id), "business_name": obj.seller.business_name}

    def get_prorata_refund(self, obj):
        now = self._now()
        if obj.status != SponsoredPromotion.STATUS_APPROVED or now >= obj.ends_at:
            return None
        return _money(services.prorated_refund(obj.price_paid, obj.starts_at, obj.ends_at, now))


# ----------------------------------------------------------------------------- inputs


class PurchaseInput(serializers.Serializer):
    product_id = serializers.UUIDField()
    package_id = serializers.UUIDField()
    starts_on = serializers.DateField(required=False, allow_null=True, default=None)

    def validate_starts_on(self, value):
        return services.check_starts_on(value)


class CompInput(PurchaseInput):
    note = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")


class ApproveInput(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")


class RejectInput(serializers.Serializer):
    reason = serializers.CharField(max_length=500)


class StopInput(serializers.Serializer):
    refund = serializers.ChoiceField(choices=REFUND_CHOICES)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")

    def validate(self, attrs):
        if attrs["refund"] == "none" and not attrs["reason"].strip():
            raise serializers.ValidationError({"reason": "A reason is required when no refund is given."})
        return attrs
