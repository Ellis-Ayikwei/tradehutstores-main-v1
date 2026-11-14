"""Sponsored products: fixed-fee, fixed-period promotion of one listing (plan 26).

``SponsoredPackage`` is what staff sell; ``SponsoredPromotion`` is one purchase of it for one product.
"Live" is never stored: it is derived at query time (see ``sponsored_services.live_promotions``).
"""

from django.conf import settings
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from apps.core.currency import get_store_base_currency
from apps.core.models import BaseModel

SURFACE_SEARCH = "search"
SURFACE_CATEGORY = "category"
SURFACE_HOME = "home"
SURFACE_PRODUCT = "product"
SURFACES = (SURFACE_SEARCH, SURFACE_CATEGORY, SURFACE_HOME, SURFACE_PRODUCT)

REFERENCE_PREFIX = "spn_"


def default_currency() -> str:
    return get_store_base_currency()


class SponsoredPackage(BaseModel):
    name = models.CharField(max_length=80)
    description = models.CharField(max_length=240, blank=True)
    surfaces = models.JSONField(default=list)
    duration_days = models.PositiveSmallIntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default=default_currency)
    max_concurrent = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_on = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "sponsored_packages"
        ordering = ["sort_order", "price", "name"]
        constraints = [
            models.CheckConstraint(condition=Q(price__gt=0), name="spn_package_price_gt_0"),
            models.CheckConstraint(
                condition=Q(duration_days__gte=1) & Q(duration_days__lte=90), name="spn_package_duration_1_90"
            ),
            models.CheckConstraint(
                condition=Q(max_concurrent__isnull=True) | Q(max_concurrent__gt=0), name="spn_package_capacity_gt_0"
            ),
        ]

    def __str__(self):
        return self.name


class SponsoredPromotion(BaseModel):
    STATUS_AWAITING_PAYMENT = "awaiting_payment"
    STATUS_PENDING_REVIEW = "pending_review"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"
    STATUS_CANCELLED = "cancelled"
    STATUS_STOPPED = "stopped"
    STATUS_ABANDONED = "abandoned"
    STATUS_CHOICES = [
        (STATUS_AWAITING_PAYMENT, "Awaiting payment"),
        (STATUS_PENDING_REVIEW, "Pending review"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_STOPPED, "Stopped"),
        (STATUS_ABANDONED, "Abandoned"),
    ]
    # A promotion in one of these holds its product's surfaces and one slot of its package.
    HOLDING = (STATUS_AWAITING_PAYMENT, STATUS_PENDING_REVIEW, STATUS_APPROVED)

    SOURCE_SELLER = "seller"
    SOURCE_STAFF = "staff"
    SOURCE_CHOICES = [(SOURCE_SELLER, "Seller"), (SOURCE_STAFF, "Staff")]

    REFUND_NONE = "none"
    REFUND_PENDING = "pending"
    REFUND_SUCCEEDED = "succeeded"
    REFUND_FAILED = "failed"
    REFUND_CHOICES = [
        (REFUND_NONE, "None"),
        (REFUND_PENDING, "Pending"),
        (REFUND_SUCCEEDED, "Succeeded"),
        (REFUND_FAILED, "Failed"),
    ]

    seller = models.ForeignKey("sellers.SellerProfile", on_delete=models.PROTECT, related_name="sponsored_promotions")
    product = models.ForeignKey("products.Product", on_delete=models.PROTECT, related_name="sponsored_promotions")
    package = models.ForeignKey(SponsoredPackage, on_delete=models.PROTECT, related_name="promotions")

    # Copied from the package when the row is created; later package edits never change them.
    surfaces = models.JSONField(default=list)
    duration_days = models.PositiveSmallIntegerField()
    price_paid = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3)

    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default=SOURCE_SELLER)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_AWAITING_PAYMENT)

    starts_on = models.DateField(null=True, blank=True)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    idempotency_key = models.CharField(max_length=64)
    reference = models.CharField(max_length=64, unique=True, null=True, blank=True)
    authorization_url = models.CharField(max_length=500, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    payment_problem = models.BooleanField(default=False)
    provider_payload = models.JSONField(default=dict, blank=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.CharField(max_length=500, blank=True)

    stopped_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    stopped_at = models.DateTimeField(null=True, blank=True)
    stop_reason = models.CharField(max_length=500, blank=True)

    # ``refunded_amount`` is the amount asked back from the gateway (set once, when the refund is requested);
    # ``refund_status`` says whether it has moved.
    refunded_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refund_status = models.CharField(max_length=10, choices=REFUND_CHOICES, default=REFUND_NONE)
    provider_refund_id = models.CharField(max_length=64, blank=True)
    refund_requested_at = models.DateTimeField(null=True, blank=True)

    created_on = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = "sponsored_promotions"
        ordering = ["-created_on"]
        constraints = [
            models.UniqueConstraint(fields=["seller", "idempotency_key"], name="uniq_spn_seller_idem_key"),
            models.CheckConstraint(condition=Q(price_paid__gte=0), name="spn_price_paid_gte_0"),
            models.CheckConstraint(condition=Q(refunded_amount__gte=0), name="spn_refunded_gte_0"),
            models.CheckConstraint(condition=Q(refunded_amount__lte=F("price_paid")), name="spn_refunded_lte_paid"),
            models.CheckConstraint(
                condition=Q(starts_at__isnull=True) | Q(ends_at__isnull=True) | Q(ends_at__gt=F("starts_at")),
                name="spn_ends_after_start",
            ),
        ]
        indexes = [
            models.Index(fields=["status", "starts_at", "ends_at"], name="spn_status_window_idx"),
            models.Index(fields=["product", "status"], name="spn_product_status_idx"),
            models.Index(fields=["seller", "status"], name="spn_seller_status_idx"),
        ]

    def __str__(self):
        return f"{self.pk} ({self.status})"
