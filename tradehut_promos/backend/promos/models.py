"""
promos/models.py

Full promo code system for TradeHut.

Models:
  PromoCode        — the rule + code definition
  PromoRedemption  — every successful use, per user per order
  PromoAttempt     — every validation attempt (for abuse detection)
  ReferralCode     — per-user referral codes (extends promo system)
"""

import string
import random
from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.db.models import F
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.conf import settings


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True


# ─── PromoCode ────────────────────────────────────────────────────────────────

class PromoCode(TimeStampedModel):

    class DiscountType(models.TextChoices):
        PERCENTAGE     = "percentage",     "Percentage Off (%)"
        FIXED_AMOUNT   = "fixed_amount",   "Fixed Amount Off (GHS)"
        FREE_SHIPPING  = "free_shipping",  "Free Shipping"
        BUY_X_GET_Y    = "buy_x_get_y",   "Buy X Get Y Free"
        FIXED_PRICE    = "fixed_price",    "Fixed Cart Price"

    class TargetType(models.TextChoices):
        ENTIRE_ORDER = "entire_order", "Entire Order"
        PRODUCTS     = "products",     "Specific Products"
        CATEGORIES   = "categories",   "Specific Categories"

    class UserSegment(models.TextChoices):
        ALL         = "all",         "All Customers"
        NEW         = "new",         "New Customers Only (first order)"
        RETURNING   = "returning",   "Returning Customers"
        LOGGED_IN   = "logged_in",   "Logged-in Users Only"
        SPECIFIC    = "specific",    "Specific User IDs"

    # ── Identity ──────────────────────────────────────────────────────────────
    code         = models.CharField(max_length=50, unique=True, db_index=True)
    name         = models.CharField(max_length=200, help_text="Internal name e.g. 'Summer 2025 Campaign'")
    description  = models.TextField(blank=True, help_text="Shown to customer on successful apply")
    is_active    = models.BooleanField(default=True)

    # ── Discount rule ─────────────────────────────────────────────────────────
    discount_type  = models.CharField(max_length=20, choices=DiscountType.choices, default=DiscountType.PERCENTAGE)
    discount_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Percentage (0–100) for PERCENTAGE type. Amount for FIXED_AMOUNT. 0 for FREE_SHIPPING."
    )
    # Cap the max discount for percentage codes
    max_discount_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Maximum GHS discount regardless of % (e.g. 20% off but never more than GHS 50)"
    )
    # Buy X Get Y
    buy_quantity  = models.PositiveSmallIntegerField(default=0, help_text="For BUY_X_GET_Y: qty to buy")
    get_quantity  = models.PositiveSmallIntegerField(default=0, help_text="For BUY_X_GET_Y: qty given free")
    # Fixed cart price
    fixed_price   = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="For FIXED_PRICE: total cart price regardless of items"
    )

    # ── What it applies to ────────────────────────────────────────────────────
    target_type  = models.CharField(max_length=20, choices=TargetType.choices, default=TargetType.ENTIRE_ORDER)
    products     = models.ManyToManyField("products.Product",     blank=True, related_name="promos")
    categories   = models.ManyToManyField("catalog.Category",     blank=True, related_name="promos")
    # If true, free shipping is also applied regardless of discount_type
    include_free_shipping = models.BooleanField(default=False)

    # ── Eligibility constraints ───────────────────────────────────────────────
    min_order_value = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        help_text="Minimum cart subtotal before this code can be applied"
    )
    min_items_count = models.PositiveSmallIntegerField(
        default=0, help_text="Minimum number of items in cart"
    )
    user_segment    = models.CharField(max_length=15, choices=UserSegment.choices, default=UserSegment.ALL)
    specific_users  = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="assigned_promos",
        help_text="Only relevant when user_segment = SPECIFIC"
    )
    stackable = models.BooleanField(
        default=False,
        help_text="Can this code be combined with other promos on the same order?"
    )
    first_order_only = models.BooleanField(default=False, help_text="Shortcut for user_segment=NEW")

    # ── Usage limits ──────────────────────────────────────────────────────────
    max_redemptions        = models.PositiveIntegerField(null=True, blank=True, help_text="Global cap. Leave blank for unlimited.")
    max_redemptions_per_user = models.PositiveSmallIntegerField(default=1, help_text="Per-user cap. 0 = unlimited.")
    current_redemptions    = models.PositiveIntegerField(default=0, editable=False)

    # ── Scheduling ────────────────────────────────────────────────────────────
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at   = models.DateTimeField(null=True, blank=True)

    # ── Auto-apply ────────────────────────────────────────────────────────────
    auto_apply = models.BooleanField(
        default=False,
        help_text="Apply automatically when conditions are met — no code entry required"
    )
    auto_apply_priority = models.PositiveSmallIntegerField(
        default=0,
        help_text="If multiple auto-apply codes qualify, higher priority wins"
    )

    class Meta:
        ordering     = ["-created_at"]
        verbose_name = "Promo Code"
        verbose_name_plural = "Promo Codes"
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["is_active", "starts_at", "ends_at"]),
        ]

    def __str__(self):
        return f"{self.code} — {self.name}"

    # ── Properties ────────────────────────────────────────────────────────────

    @property
    def is_live(self) -> bool:
        if not self.is_active:
            return False
        now = timezone.now()
        if self.starts_at and now < self.starts_at:
            return False
        if self.ends_at and now > self.ends_at:
            return False
        if self.max_redemptions and self.current_redemptions >= self.max_redemptions:
            return False
        return True

    @property
    def redemptions_remaining(self) -> int | None:
        if self.max_redemptions is None:
            return None
        return max(0, self.max_redemptions - self.current_redemptions)

    # ── Validation ────────────────────────────────────────────────────────────

    def clean(self):
        if self.discount_type == self.DiscountType.PERCENTAGE:
            if not (0 < self.discount_value <= 100):
                raise ValidationError({"discount_value": "Percentage must be between 1 and 100."})
        if self.ends_at and self.starts_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "End date must be after start date."})
        if self.discount_type == self.DiscountType.BUY_X_GET_Y:
            if not self.buy_quantity or not self.get_quantity:
                raise ValidationError("BUY_X_GET_Y requires buy_quantity and get_quantity.")
        if self.discount_type == self.DiscountType.FIXED_PRICE and not self.fixed_price:
            raise ValidationError({"fixed_price": "FIXED_PRICE type requires a fixed_price value."})

    # ── Code generation helpers ───────────────────────────────────────────────

    @classmethod
    def generate_code(cls, prefix: str = "", length: int = 8) -> str:
        """Generate a unique random code e.g. SUMMER-X7K2MN9P"""
        chars = string.ascii_uppercase + string.digits
        while True:
            suffix = "".join(random.choices(chars, k=length))
            code   = f"{prefix.upper()}-{suffix}" if prefix else suffix
            if not cls.objects.filter(code=code).exists():
                return code

    @classmethod
    def generate_bulk(cls, count: int, prefix: str = "", length: int = 8) -> list[str]:
        """Generate N unique codes for influencer / bulk campaigns."""
        codes = []
        while len(codes) < count:
            code = cls.generate_code(prefix=prefix, length=length)
            codes.append(code)
        return codes


# ─── PromoRedemption ──────────────────────────────────────────────────────────

class PromoRedemption(TimeStampedModel):
    """
    One successful use of a promo code on one order.
    Created atomically with the order — never created speculatively.
    """
    promo          = models.ForeignKey(PromoCode, on_delete=models.PROTECT, related_name="redemptions")
    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    order_id       = models.PositiveIntegerField(db_index=True, help_text="FK to your Order model")
    session_key    = models.CharField(max_length=64, blank=True, help_text="For guest checkouts")

    # Snapshot values at time of redemption — never rely on live promo values for history
    discount_amount     = models.DecimalField(max_digits=10, decimal_places=2)
    order_subtotal      = models.DecimalField(max_digits=12, decimal_places=2)
    discount_type_snap  = models.CharField(max_length=20)
    discount_value_snap = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = [("promo", "order_id")]
        verbose_name    = "Promo Redemption"
        verbose_name_plural = "Promo Redemptions"
        indexes = [models.Index(fields=["promo", "user"])]

    def __str__(self):
        return f"{self.promo.code} — Order #{self.order_id} — GHS {self.discount_amount}"


# ─── PromoAttempt ─────────────────────────────────────────────────────────────

class PromoAttempt(models.Model):
    """
    Every validation attempt — success or failure.
    Used for abuse detection and debugging.
    Write via Celery task, never in the request path.
    """
    code       = models.CharField(max_length=50, db_index=True)
    user_id    = models.IntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    session_key = models.CharField(max_length=64, blank=True)
    success    = models.BooleanField()
    error_code = models.CharField(max_length=50, blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Promo Attempt"
        verbose_name_plural = "Promo Attempts"
        indexes = [
            models.Index(fields=["code", "attempted_at"]),
            models.Index(fields=["ip_address", "attempted_at"]),
        ]


# ─── ReferralCode ─────────────────────────────────────────────────────────────

class ReferralCode(TimeStampedModel):
    """
    Per-user referral codes. Each user gets one.
    When another user uses it, referrer gets rewarded and referred user
    gets a first-order discount (linked PromoCode).
    """
    user          = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="referral_code")
    code          = models.CharField(max_length=30, unique=True, db_index=True)
    # The promo applied to the NEW user who uses this referral
    referral_promo = models.ForeignKey(PromoCode, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    # Reward given to the referrer per successful referral
    reward_type   = models.CharField(max_length=20, choices=[
        ("discount", "Discount on next order"),
        ("points",   "Loyalty points"),
        ("credit",   "Store credit"),
    ], default="discount")
    reward_value  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_referrals = models.PositiveIntegerField(default=0)
    is_active     = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Referral Code"
        verbose_name_plural = "Referral Codes"

    def __str__(self):
        return f"{self.code} ({self.user})"

    @classmethod
    def get_or_create_for_user(cls, user) -> "ReferralCode":
        if hasattr(user, "referral_code"):
            return user.referral_code
        code = f"REF-{user.username[:6].upper()}-{PromoCode.generate_code(length=4)}"
        return cls.objects.create(user=user, code=code)
