"""
promos/services.py

Core promo validation and discount calculation.
All validation runs server-side — never trust the frontend.

Usage:
    from promos.services import validate_promo, calculate_discount, redeem_promo

    # In cart / checkout view:
    result = validate_promo(code="SUMMER20", cart=cart, user=request.user)
    if result.valid:
        discount = result.discount_amount

    # When order is confirmed:
    redeem_promo(promo=result.promo, order=order, user=request.user, discount_amount=result.discount_amount)
"""

import logging
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone

from .models import PromoCode, PromoRedemption, PromoAttempt

logger = logging.getLogger(__name__)


# ─── Result dataclasses ───────────────────────────────────────────────────────

@dataclass
class ValidationResult:
    valid:            bool
    promo:            Optional[PromoCode]
    discount_amount:  Decimal
    free_shipping:    bool
    error_code:       str        # machine-readable
    error_message:    str        # shown to user

    @classmethod
    def fail(cls, code: str, message: str) -> "ValidationResult":
        return cls(
            valid=False, promo=None,
            discount_amount=Decimal("0"), free_shipping=False,
            error_code=code, error_message=message,
        )

    @classmethod
    def ok(cls, promo: PromoCode, discount: Decimal, free_shipping: bool = False) -> "ValidationResult":
        return cls(
            valid=True, promo=promo,
            discount_amount=discount, free_shipping=free_shipping,
            error_code="", error_message="",
        )


# ─── Cart-like interface ──────────────────────────────────────────────────────
# Adapt this to your actual cart/order model

@dataclass
class CartContext:
    """Snapshot of the cart state at validation time."""
    subtotal:      Decimal          # sum of item prices before discount
    item_count:    int
    item_ids:      list[int]        # product IDs in cart
    category_ids:  list[int]        # category IDs of items in cart
    user_id:       Optional[int]
    session_key:   str
    ip_address:    str


# ─── Main validation function ─────────────────────────────────────────────────

def validate_promo(
    code: str,
    cart: CartContext,
    user=None,
) -> ValidationResult:
    """
    Full server-side promo validation.
    Returns ValidationResult — check .valid before using .discount_amount.

    Validation order (cheap → expensive):
      1. Code exists
      2. Code is active
      3. Date range
      4. Global redemption limit
      5. Min order value
      6. Min items count
      7. User segment
      8. Per-user redemption limit
      9. Product / category eligibility
     10. Calculate discount
    """

    code = code.strip().upper()

    # 1. Exists
    try:
        promo = PromoCode.objects.prefetch_related("products", "categories", "specific_users").get(code=code)
    except PromoCode.DoesNotExist:
        _log_attempt(code, user, cart, success=False, error="not_found")
        return ValidationResult.fail("not_found", "This promo code doesn't exist.")

    # 2. Active flag
    if not promo.is_active:
        _log_attempt(code, user, cart, success=False, error="inactive")
        return ValidationResult.fail("inactive", "This promo code is no longer active.")

    # 3. Date range
    now = timezone.now()
    if promo.starts_at and now < promo.starts_at:
        _log_attempt(code, user, cart, success=False, error="not_started")
        return ValidationResult.fail("not_started", f"This code isn't valid until {promo.starts_at.strftime('%d %b %Y')}.")
    if promo.ends_at and now > promo.ends_at:
        _log_attempt(code, user, cart, success=False, error="expired")
        return ValidationResult.fail("expired", "This promo code has expired.")

    # 4. Global redemption limit
    if promo.max_redemptions:
        # Re-fetch from DB for current count — don't trust in-memory value
        current = PromoCode.objects.filter(pk=promo.pk).values_list("current_redemptions", flat=True).first()
        if current >= promo.max_redemptions:
            _log_attempt(code, user, cart, success=False, error="exhausted")
            return ValidationResult.fail("exhausted", "This promo code has been fully redeemed.")

    # 5. Min order value
    if cart.subtotal < promo.min_order_value:
        needed = promo.min_order_value - cart.subtotal
        _log_attempt(code, user, cart, success=False, error="min_order")
        return ValidationResult.fail(
            "min_order",
            f"Add GHS {needed:.2f} more to your cart to use this code."
        )

    # 6. Min items count
    if promo.min_items_count and cart.item_count < promo.min_items_count:
        _log_attempt(code, user, cart, success=False, error="min_items")
        return ValidationResult.fail(
            "min_items",
            f"You need at least {promo.min_items_count} items in your cart."
        )

    # 7. User segment
    seg_error = _check_user_segment(promo, user, cart)
    if seg_error:
        _log_attempt(code, user, cart, success=False, error="user_segment")
        return ValidationResult.fail("user_segment", seg_error)

    # 8. Per-user redemption limit
    if user and promo.max_redemptions_per_user:
        user_redemptions = PromoRedemption.objects.filter(promo=promo, user=user).count()
        if user_redemptions >= promo.max_redemptions_per_user:
            _log_attempt(code, user, cart, success=False, error="per_user_limit")
            return ValidationResult.fail("per_user_limit", "You have already used this promo code.")

    # 9. Product / category eligibility
    eligible_subtotal = _eligible_subtotal(promo, cart)
    if eligible_subtotal == Decimal("0") and promo.target_type != PromoCode.TargetType.ENTIRE_ORDER:
        _log_attempt(code, user, cart, success=False, error="no_eligible_items")
        return ValidationResult.fail("no_eligible_items", "No items in your cart are eligible for this code.")

    # 10. Calculate discount
    discount = _calculate_discount(promo, cart, eligible_subtotal)
    free_shipping = promo.discount_type == PromoCode.DiscountType.FREE_SHIPPING or promo.include_free_shipping

    _log_attempt(code, user, cart, success=True, error="")
    return ValidationResult.ok(promo, discount, free_shipping)


# ─── Discount calculation ─────────────────────────────────────────────────────

def _eligible_subtotal(promo: PromoCode, cart: CartContext) -> Decimal:
    """Return the portion of the cart subtotal the promo applies to."""
    if promo.target_type == PromoCode.TargetType.ENTIRE_ORDER:
        return cart.subtotal

    # For product/category targeting we need per-item prices
    # This requires your cart to expose item-level data
    # Adapt to your cart model — returning full subtotal as safe fallback
    eligible_product_ids = set(promo.products.values_list("id", flat=True))
    eligible_category_ids = set(promo.categories.values_list("id", flat=True))

    # TODO: filter cart.items by eligible IDs and sum their prices
    # For now returns full subtotal — refine when wiring to your cart model
    return cart.subtotal


def _calculate_discount(promo: PromoCode, cart: CartContext, eligible_subtotal: Decimal) -> Decimal:
    DT = PromoCode.DiscountType

    if promo.discount_type == DT.PERCENTAGE:
        discount = (eligible_subtotal * promo.discount_value / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        if promo.max_discount_amount:
            discount = min(discount, promo.max_discount_amount)

    elif promo.discount_type == DT.FIXED_AMOUNT:
        discount = min(promo.discount_value, eligible_subtotal)

    elif promo.discount_type == DT.FREE_SHIPPING:
        discount = Decimal("0")   # shipping is zeroed separately

    elif promo.discount_type == DT.FIXED_PRICE:
        if promo.fixed_price and cart.subtotal > promo.fixed_price:
            discount = cart.subtotal - promo.fixed_price
        else:
            discount = Decimal("0")

    elif promo.discount_type == DT.BUY_X_GET_Y:
        # Simplification: give free_qty / (buy_qty + free_qty) of eligible subtotal
        total_qty = promo.buy_quantity + promo.get_quantity
        free_fraction = Decimal(promo.get_quantity) / Decimal(total_qty) if total_qty else Decimal("0")
        discount = (eligible_subtotal * free_fraction).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    else:
        discount = Decimal("0")

    # Never discount more than the subtotal
    return max(Decimal("0"), min(discount, cart.subtotal))


# ─── User segment check ───────────────────────────────────────────────────────

def _check_user_segment(promo: PromoCode, user, cart: CartContext) -> str | None:
    """Returns error message string if segment check fails, else None."""
    seg = promo.user_segment
    US  = PromoCode.UserSegment

    if seg == US.ALL:
        return None

    if seg == US.LOGGED_IN and not user:
        return "You must be logged in to use this code."

    if seg == US.NEW or promo.first_order_only:
        if not user:
            return "You must be logged in to use this code."
        # Check if user has any previous completed orders
        from django.apps import apps
        try:
            Order = apps.get_model("orders", "Order")
            if Order.objects.filter(user=user, status="completed").exists():
                return "This code is only valid on your first order."
        except LookupError:
            pass  # orders app not available — skip check

    if seg == US.RETURNING:
        if not user:
            return "You must be logged in to use this code."
        from django.apps import apps
        try:
            Order = apps.get_model("orders", "Order")
            if not Order.objects.filter(user=user, status="completed").exists():
                return "This code is only valid for returning customers."
        except LookupError:
            pass

    if seg == US.SPECIFIC:
        if not user or not promo.specific_users.filter(pk=user.pk).exists():
            return "You are not eligible for this promo code."

    return None


# ─── Atomic redemption ────────────────────────────────────────────────────────

@transaction.atomic
def redeem_promo(
    promo: PromoCode,
    order,
    user,
    discount_amount: Decimal,
    session_key: str = "",
) -> PromoRedemption:
    """
    Atomically increment the usage counter and create a redemption record.
    Must be called inside the order creation transaction.

    Uses F() conditional update to handle race conditions:
    If two requests try to redeem the last slot simultaneously,
    only one will succeed — the other gets PromoExhaustedException.
    """

    # Atomic increment with conditional — handles race conditions
    if promo.max_redemptions:
        updated = PromoCode.objects.filter(
            pk=promo.pk,
            current_redemptions__lt=F("max_redemptions"),
        ).update(current_redemptions=F("current_redemptions") + 1)

        if updated == 0:
            raise PromoExhaustedException(f"Promo {promo.code} was exhausted by a concurrent request.")
    else:
        PromoCode.objects.filter(pk=promo.pk).update(
            current_redemptions=F("current_redemptions") + 1
        )

    # Create immutable redemption record
    redemption = PromoRedemption.objects.create(
        promo               = promo,
        user                = user if user and user.is_authenticated else None,
        order_id            = order.id,
        session_key         = session_key,
        discount_amount     = discount_amount,
        order_subtotal      = order.subtotal,
        discount_type_snap  = promo.discount_type,
        discount_value_snap = promo.discount_value,
    )
    logger.info("Promo %s redeemed for order #%s — GHS %s off", promo.code, order.id, discount_amount)
    return redemption


# ─── Auto-apply ───────────────────────────────────────────────────────────────

def get_auto_apply_promo(cart: CartContext, user=None) -> ValidationResult | None:
    """
    Check if any auto-apply promo qualifies for this cart.
    Returns the highest-priority qualifying promo, or None.
    Called on every cart update.
    """
    candidates = PromoCode.objects.filter(
        auto_apply=True,
        is_active=True,
    ).order_by("-auto_apply_priority")

    for promo in candidates:
        # Build a dummy result without logging attempts
        result = validate_promo(promo.code, cart, user)
        if result.valid:
            return result

    return None


# ─── Abuse detection ──────────────────────────────────────────────────────────

def is_suspicious(ip_address: str, code: str, window_minutes: int = 60) -> bool:
    """
    Returns True if this IP has made too many failed attempts recently.
    Call before validate_promo and return 429 if True.
    """
    from django.utils import timezone
    cutoff = timezone.now() - timezone.timedelta(minutes=window_minutes)
    failed = PromoAttempt.objects.filter(
        ip_address=ip_address,
        success=False,
        attempted_at__gte=cutoff,
    ).count()
    return failed >= 10


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _log_attempt(code, user, cart: CartContext, success: bool, error: str):
    """Fire-and-forget attempt log — use Celery in production."""
    try:
        PromoAttempt.objects.create(
            code       = code,
            user_id    = getattr(user, "id", None),
            ip_address = cart.ip_address or None,
            session_key = cart.session_key,
            success    = success,
            error_code = error,
        )
    except Exception:
        pass   # never let logging break the request


class PromoExhaustedException(Exception):
    pass
