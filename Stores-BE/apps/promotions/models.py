"""
Promo code system for TradeHut.

Adds enterprise promo codes alongside the existing legacy `Discount` and
`GiftCard` tables. Supports both system-wide promos (run by ops) and
seller-scoped promos (run by individual sellers for their own products).

Hierarchy:
    PromoCode  ─► PromoRedemption  (one row per successful order use)
              ─► PromoAttempt      (one row per validation attempt — abuse log)
              ─► ReferralCode      (per-user referral codes that trigger a promo)
"""

from __future__ import annotations

import random
import string
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from datetime import datetime as _dt
from apps.core.models import BaseModel


# ─── Existing legacy models (kept for back-compat) ───────────────────────────

DISCOUNT_TYPE = (
    ("Percentage", "Percentage"),
    ("Fixed", "Fixed"),
)


class Discount(BaseModel):
    """LEGACY — kept so existing rows / FK references keep working.

    For new code, use ``PromoCode`` below. This model will be deprecated.
    """

    code = models.CharField(db_column="Code", unique=True, max_length=50)
    description = models.TextField(db_column="Description", blank=True, null=True)
    discounttype = models.CharField(db_column="DiscountType", choices=DISCOUNT_TYPE, max_length=11)
    value = models.DecimalField(db_column="Value", max_digits=10, decimal_places=2)
    validfrom = models.DateField(db_column="ValidFrom", blank=True, null=True)
    validto = models.DateField(db_column="ValidTo", blank=True, null=True)
    unique_user = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL, null=True, blank=True
    )
    unique_product = models.ForeignKey(
        "products.Product", on_delete=models.SET_NULL, null=True, blank=True
    )
    max_uses = models.IntegerField(default=1)
    uses_count = models.IntegerField(default=0)

    class Meta:
        managed = True
        db_table = "discounts"

    def clean(self):
        today = _dt.today().date()
        if self.validfrom and today < self.validfrom:
            raise ValidationError("Discount is not valid yet.")
        if self.validto and today > self.validto:
            raise ValidationError("Discount has expired.")
        if self.uses_count >= self.max_uses:
            raise ValidationError("Discount usage limit reached.")


class DiscountRedemption(models.Model):
    """LEGACY redemption row tied to ``Discount``."""

    user = models.ForeignKey("users.User", on_delete=models.CASCADE)
    discount = models.ForeignKey(Discount, on_delete=models.CASCADE)
    redeemed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "discount")


class GiftCard(BaseModel):
    code = models.CharField(max_length=255, unique=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2)
    expiration_date = models.DateTimeField()

    class Meta:
        managed = True
        db_table = "gift_cards"


# ─── New promo code system ────────────────────────────────────────────────────


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ─── Platform-wide promo policy (singleton; admin-editable) ──────────────────


class PromoPolicy(TimeStampedModel):
    """Singleton row that holds the marketplace-wide promo policy.

    Admins edit these from /admin/promos (Settings tab). Sellers and the
    storefront read them via ``get_active_policy()``.

    Why a singleton instead of Django settings: ops need to tune these without
    a deploy (e.g. tighten the discount cap during a refund-fraud incident).
    """

    class CommissionBasis(models.TextChoices):
        PRE_DISCOUNT = "pre_discount", "Pre-discount (Amazon — platform takes % on original price)"
        POST_DISCOUNT = "post_discount", "Post-discount (Etsy — platform takes % on what customer paid)"

    # Always row id=1
    singleton_key = models.PositiveSmallIntegerField(default=1, unique=True, editable=False)

    # ── Seller guardrails ────────────────────────────────────────────────────
    max_seller_discount_percentage = models.PositiveSmallIntegerField(
        default=50,
        help_text="Hard cap on the % a seller can offer in any single code (1-100).",
    )
    max_seller_codes_per_month = models.PositiveSmallIntegerField(
        default=20,
        help_text="Per-seller cap on how many new codes can be created in a calendar month. 0 = unlimited.",
    )
    seller_max_redemptions_cap = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Optional ceiling on a seller code's max_redemptions (protect against runaway promos). Blank = no cap.",
    )

    # ── Commission accounting ────────────────────────────────────────────────
    commission_basis = models.CharField(
        max_length=20,
        choices=CommissionBasis.choices,
        default=CommissionBasis.PRE_DISCOUNT,
        help_text=(
            "PRE_DISCOUNT: platform commission is calculated on the pre-discount price; the seller absorbs the full discount. "
            "POST_DISCOUNT: commission is on what the customer actually paid; platform shares the discount cost."
        ),
    )

    # ── Stacking ─────────────────────────────────────────────────────────────
    allow_seller_platform_stacking = models.BooleanField(
        default=False,
        help_text=(
            "When OFF (default): a seller code and a platform code cannot be applied to the same order — "
            "validation rejects the second one. Per-code opt-in via the existing `stackable` flag overrides this."
        ),
    )

    # ── Misc ─────────────────────────────────────────────────────────────────
    public_storefront_codes_visible = models.BooleanField(
        default=True,
        help_text="If True, a seller's active promo codes are visible on their public storefront page.",
    )

    class Meta:
        verbose_name = "Promo Policy"
        verbose_name_plural = "Promo Policies"

    def __str__(self) -> str:
        return f"PromoPolicy (max seller {self.max_seller_discount_percentage}%, {self.commission_basis})"

    def save(self, *args, **kwargs):
        # Enforce singleton — always id=1
        self.singleton_key = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_active(cls) -> "PromoPolicy":
        obj, _ = cls.objects.get_or_create(singleton_key=1)
        return obj


class PromoCode(TimeStampedModel):
    """A discount code redeemable on the cart / checkout.

    Owned either by **the platform** (when ``seller`` is null — typically
    administered by ops/marketing) or by **a single seller** (when ``seller``
    is set — applies only to that seller's products in the cart).
    """

    class DiscountType(models.TextChoices):
        PERCENTAGE = "percentage", "Percentage Off (%)"
        FIXED_AMOUNT = "fixed_amount", "Fixed Amount Off (GHS)"
        FREE_SHIPPING = "free_shipping", "Free Shipping"
        BUY_X_GET_Y = "buy_x_get_y", "Buy X Get Y Free"
        FIXED_PRICE = "fixed_price", "Fixed Cart Price"

    class TargetType(models.TextChoices):
        ENTIRE_ORDER = "entire_order", "Entire Order"
        PRODUCTS = "products", "Specific Products"
        CATEGORIES = "categories", "Specific Categories"
        SELLER_PRODUCTS = "seller_products", "All of seller's products"

    class UserSegment(models.TextChoices):
        ALL = "all", "All Customers"
        NEW = "new", "New Customers Only (first order)"
        RETURNING = "returning", "Returning Customers"
        LOGGED_IN = "logged_in", "Logged-in Users Only"
        SPECIFIC = "specific", "Specific User IDs"

    # ── Identity ─────────────────────────────────────────────────────────────
    code = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(
        max_length=200,
        help_text="Internal name e.g. 'Summer 2026 Campaign'",
    )
    description = models.TextField(
        blank=True, help_text="Shown to customer on successful apply"
    )
    is_active = models.BooleanField(default=True)

    # ── Ownership ────────────────────────────────────────────────────────────
    seller = models.ForeignKey(
        "sellers.SellerProfile",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="promo_codes",
        help_text=(
            "Leave blank for a platform-wide promo (ops / marketing). "
            "Set to a SellerProfile to scope this promo to that seller's products only."
        ),
    )

    # ── Discount rule ────────────────────────────────────────────────────────
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE,
    )
    discount_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text=(
            "Percentage (0–100) for PERCENTAGE. Amount for FIXED_AMOUNT. "
            "0 for FREE_SHIPPING / BUY_X_GET_Y / FIXED_PRICE."
        ),
    )
    max_discount_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Cap a percentage discount (e.g. 20% off but never more than GHS 50).",
    )
    buy_quantity = models.PositiveSmallIntegerField(
        default=0, help_text="BUY_X_GET_Y: qty to buy"
    )
    get_quantity = models.PositiveSmallIntegerField(
        default=0, help_text="BUY_X_GET_Y: qty given free"
    )
    fixed_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="FIXED_PRICE: total cart price after discount.",
    )

    # ── What it applies to ───────────────────────────────────────────────────
    target_type = models.CharField(
        max_length=20,
        choices=TargetType.choices,
        default=TargetType.ENTIRE_ORDER,
    )
    products = models.ManyToManyField(
        "products.Product", blank=True, related_name="promos"
    )
    categories = models.ManyToManyField(
        "catalog.Category", blank=True, related_name="promos"
    )
    include_free_shipping = models.BooleanField(
        default=False,
        help_text="When true, free shipping is also applied regardless of discount_type.",
    )

    # ── Eligibility constraints ──────────────────────────────────────────────
    min_order_value = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Minimum cart subtotal before this code can be applied.",
    )
    min_items_count = models.PositiveSmallIntegerField(
        default=0, help_text="Minimum number of items in cart."
    )
    user_segment = models.CharField(
        max_length=15,
        choices=UserSegment.choices,
        default=UserSegment.ALL,
    )
    specific_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="assigned_promos",
        help_text="Only relevant when user_segment = SPECIFIC.",
    )
    stackable = models.BooleanField(
        default=False,
        help_text="Can this code be combined with other promos on the same order?",
    )
    first_order_only = models.BooleanField(
        default=False, help_text="Shortcut for user_segment = NEW."
    )

    # ── Usage limits ─────────────────────────────────────────────────────────
    max_redemptions = models.PositiveIntegerField(
        null=True, blank=True, help_text="Global cap. Leave blank for unlimited."
    )
    max_redemptions_per_user = models.PositiveSmallIntegerField(
        default=1, help_text="Per-user cap. 0 = unlimited."
    )
    current_redemptions = models.PositiveIntegerField(default=0, editable=False)

    # ── Scheduling ───────────────────────────────────────────────────────────
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    # ── Auto-apply ───────────────────────────────────────────────────────────
    auto_apply = models.BooleanField(
        default=False,
        help_text="Apply automatically when conditions are met — no code entry required.",
    )
    auto_apply_priority = models.PositiveSmallIntegerField(
        default=0,
        help_text="If multiple auto-apply codes qualify, higher priority wins.",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Promo Code"
        verbose_name_plural = "Promo Codes"
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["is_active", "starts_at", "ends_at"]),
            models.Index(fields=["seller", "is_active"]),
        ]

    def __str__(self) -> str:
        owner = f" [seller {self.seller_id}]" if self.seller_id else " [platform]"
        return f"{self.code} — {self.name}{owner}"

    # ── Properties ───────────────────────────────────────────────────────────
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

    @property
    def is_seller_scoped(self) -> bool:
        return self.seller_id is not None

    # ── Validation ───────────────────────────────────────────────────────────
    def clean(self):
        if self.discount_type == self.DiscountType.PERCENTAGE:
            if not (0 < (self.discount_value or 0) <= 100):
                raise ValidationError({"discount_value": "Percentage must be between 1 and 100."})
        if self.ends_at and self.starts_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "End date must be after start date."})
        if self.discount_type == self.DiscountType.BUY_X_GET_Y:
            if not self.buy_quantity or not self.get_quantity:
                raise ValidationError("BUY_X_GET_Y requires buy_quantity and get_quantity.")
        if self.discount_type == self.DiscountType.FIXED_PRICE and not self.fixed_price:
            raise ValidationError({"fixed_price": "FIXED_PRICE type requires a fixed_price value."})
        if self.target_type == self.TargetType.SELLER_PRODUCTS and not self.seller_id:
            raise ValidationError({"seller": "SELLER_PRODUCTS target requires a seller to be set."})

    # ── Code generation helpers ──────────────────────────────────────────────
    @classmethod
    def generate_code(cls, prefix: str = "", length: int = 8) -> str:
        chars = string.ascii_uppercase + string.digits
        for _ in range(50):
            suffix = "".join(random.choices(chars, k=length))
            code = f"{prefix.upper()}-{suffix}" if prefix else suffix
            if not cls.objects.filter(code=code).exists():
                return code
        raise RuntimeError("Could not generate a unique promo code after 50 attempts.")

    @classmethod
    def generate_bulk(cls, count: int, prefix: str = "", length: int = 8) -> list[str]:
        codes: list[str] = []
        while len(codes) < count:
            codes.append(cls.generate_code(prefix=prefix, length=length))
        return codes


class PromoRedemption(TimeStampedModel):
    """One successful use of a promo code on one order. Created atomically with the order."""

    promo = models.ForeignKey(
        PromoCode, on_delete=models.PROTECT, related_name="redemptions"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    order_id = models.CharField(
        max_length=64, db_index=True, help_text="Order ID (UUID or int as string)."
    )
    session_key = models.CharField(
        max_length=64, blank=True, help_text="For guest checkouts."
    )

    # Snapshot values at redemption time — never rely on live promo for history
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2)
    order_subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount_type_snap = models.CharField(max_length=20)
    discount_value_snap = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = [("promo", "order_id")]
        verbose_name = "Promo Redemption"
        verbose_name_plural = "Promo Redemptions"
        indexes = [models.Index(fields=["promo", "user"])]
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.promo.code} -> Order {self.order_id} (GHS {self.discount_amount})"


class PromoAttempt(models.Model):
    """Every validation attempt — success or failure. Used for abuse detection."""

    code = models.CharField(max_length=50, db_index=True)
    user_id = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    session_key = models.CharField(max_length=64, blank=True)
    success = models.BooleanField()
    error_code = models.CharField(max_length=50, blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Promo Attempt"
        verbose_name_plural = "Promo Attempts"
        indexes = [
            models.Index(fields=["code", "attempted_at"]),
            models.Index(fields=["ip_address", "attempted_at"]),
        ]
        ordering = ["-attempted_at"]


class ReferralCode(TimeStampedModel):
    """Per-user referral codes. When another user uses this, the referrer gets a reward
    and the new user gets a first-order discount via the linked PromoCode.
    """

    REWARD_TYPES = (
        ("discount", "Discount on next order"),
        ("points", "Loyalty points"),
        ("credit", "Store credit"),
    )

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="referral_code",
    )
    code = models.CharField(max_length=30, unique=True, db_index=True)
    referral_promo = models.ForeignKey(
        PromoCode,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
        help_text="The promo applied to the NEW user who uses this referral.",
    )
    reward_type = models.CharField(max_length=20, choices=REWARD_TYPES, default="discount")
    reward_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_referrals = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Referral Code"
        verbose_name_plural = "Referral Codes"

    def __str__(self) -> str:
        return f"{self.code} ({self.user_id})"

    @classmethod
    def get_or_create_for_user(cls, user) -> "ReferralCode":
        if hasattr(user, "referral_code"):
            return user.referral_code
        username = (getattr(user, "username", None) or getattr(user, "email", "user")).split("@")[0][:6]
        code = f"REF-{username.upper()}-{PromoCode.generate_code(length=4)}"
        return cls.objects.create(user=user, code=code)
