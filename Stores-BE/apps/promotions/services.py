"""
Promo code validation, discount calculation, and atomic redemption.

All validation runs server-side — never trust client-supplied discount values.

Typical flow:

    from apps.promotions.services import validate_promo, redeem_promo, CartContext

    cart = CartContext(subtotal=Decimal("500.00"), item_count=3, item_ids=["uuid"], ...)
    result = validate_promo(code="SUMMER20", cart=cart, user=request.user)
    if result.valid:
        discount = result.discount_amount
        # ... build the order at the discounted total ...
        redeem_promo(promo=result.promo, order=order, user=request.user,
                     discount_amount=result.discount_amount)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .models import PromoAttempt, PromoCode, PromoPolicy, PromoRedemption

logger = logging.getLogger(__name__)


# ─── Result + cart context ───────────────────────────────────────────────────


@dataclass
class ValidationResult:
    valid: bool
    promo: Optional[PromoCode]
    discount_amount: Decimal
    free_shipping: bool
    error_code: str
    error_message: str

    @classmethod
    def fail(cls, code: str, message: str) -> "ValidationResult":
        return cls(
            valid=False,
            promo=None,
            discount_amount=Decimal("0"),
            free_shipping=False,
            error_code=code,
            error_message=message,
        )

    @classmethod
    def ok(cls, promo: PromoCode, discount: Decimal, free_shipping: bool = False) -> "ValidationResult":
        return cls(
            valid=True,
            promo=promo,
            discount_amount=discount,
            free_shipping=free_shipping,
            error_code="",
            error_message="",
        )


@dataclass
class CartContext:
    """Snapshot of the cart at validation time."""

    subtotal: Decimal
    item_count: int
    item_ids: list[str] = field(default_factory=list)
    category_ids: list[str] = field(default_factory=list)
    seller_ids: list[str] = field(default_factory=list)
    seller_subtotals: dict[str, Decimal] = field(default_factory=dict)
    user_id: Optional[str] = None
    session_key: str = ""
    ip_address: str = ""


# ─── Main validation ─────────────────────────────────────────────────────────


def validate_promo(
    code: str,
    cart: CartContext,
    user=None,
    existing_promo_codes: list[str] | None = None,
) -> ValidationResult:
    """Full server-side validation. Returns a ValidationResult.

    ``existing_promo_codes`` is the list of codes already applied to this cart
    (other than the one being validated). Used to enforce stacking policy:
    by default a seller code and a platform code cannot share an order.
    """

    code = (code or "").strip().upper()
    if not code:
        return ValidationResult.fail("not_found", "Please enter a promo code.")

    # 1. Code exists
    try:
        promo = PromoCode.objects.prefetch_related(
            "products", "categories", "specific_users"
        ).select_related("seller").get(code=code)
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
        return ValidationResult.fail(
            "not_started",
            f"This code isn't valid until {promo.starts_at.strftime('%d %b %Y')}.",
        )
    if promo.ends_at and now > promo.ends_at:
        _log_attempt(code, user, cart, success=False, error="expired")
        return ValidationResult.fail("expired", "This promo code has expired.")

    # 4. Global redemption limit
    if promo.max_redemptions:
        current = (
            PromoCode.objects.filter(pk=promo.pk)
            .values_list("current_redemptions", flat=True)
            .first()
        )
        if current is not None and current >= promo.max_redemptions:
            _log_attempt(code, user, cart, success=False, error="exhausted")
            return ValidationResult.fail("exhausted", "This promo code has been fully redeemed.")

    # 5. Min order value
    if cart.subtotal < (promo.min_order_value or 0):
        needed = promo.min_order_value - cart.subtotal
        _log_attempt(code, user, cart, success=False, error="min_order")
        return ValidationResult.fail(
            "min_order",
            f"Add GHS {needed:.2f} more to your cart to use this code.",
        )

    # 6. Min items
    if promo.min_items_count and cart.item_count < promo.min_items_count:
        _log_attempt(code, user, cart, success=False, error="min_items")
        return ValidationResult.fail(
            "min_items",
            f"You need at least {promo.min_items_count} items in your cart.",
        )

    # 7. User segment
    seg_error = _check_user_segment(promo, user)
    if seg_error:
        _log_attempt(code, user, cart, success=False, error="user_segment")
        return ValidationResult.fail("user_segment", seg_error)

    # 8. Per-user limit
    if user and getattr(user, "is_authenticated", False) and promo.max_redemptions_per_user:
        used = PromoRedemption.objects.filter(promo=promo, user=user).count()
        if used >= promo.max_redemptions_per_user:
            _log_attempt(code, user, cart, success=False, error="per_user_limit")
            return ValidationResult.fail("per_user_limit", "You have already used this promo code.")

    # 9. Stacking policy — seller + platform combo blocked unless opted in
    if existing_promo_codes:
        stacking_error = _check_stacking(promo, existing_promo_codes)
        if stacking_error:
            _log_attempt(code, user, cart, success=False, error="not_stackable")
            return ValidationResult.fail("not_stackable", stacking_error)

    # 10. Seller scoping — seller-owned promos require eligible items in cart
    if promo.seller_id:
        if not cart.seller_ids or str(promo.seller_id) not in {str(s) for s in cart.seller_ids}:
            _log_attempt(code, user, cart, success=False, error="seller_mismatch")
            return ValidationResult.fail(
                "seller_mismatch",
                "This code only applies to specific seller's products — none are in your cart.",
            )

    # 11. Product / category eligibility
    eligible_subtotal = _eligible_subtotal(promo, cart)
    if eligible_subtotal == Decimal("0") and promo.target_type != PromoCode.TargetType.ENTIRE_ORDER:
        _log_attempt(code, user, cart, success=False, error="no_eligible_items")
        return ValidationResult.fail("no_eligible_items", "No items in your cart are eligible for this code.")

    # 12. Calculate discount
    discount = _calculate_discount(promo, cart, eligible_subtotal)
    free_shipping = (
        promo.discount_type == PromoCode.DiscountType.FREE_SHIPPING
        or promo.include_free_shipping
    )

    _log_attempt(code, user, cart, success=True, error="")
    return ValidationResult.ok(promo, discount, free_shipping)


# ─── Eligibility + discount math ─────────────────────────────────────────────


def _eligible_subtotal(promo: PromoCode, cart: CartContext) -> Decimal:
    """Return the portion of cart subtotal that the promo applies to."""
    TT = PromoCode.TargetType

    if promo.target_type == TT.ENTIRE_ORDER:
        return cart.subtotal

    if promo.target_type == TT.SELLER_PRODUCTS and promo.seller_id:
        seller_key = str(promo.seller_id)
        return cart.seller_subtotals.get(seller_key, Decimal("0"))

    # PRODUCTS / CATEGORIES need per-item snapshots from the FE.
    # Without them, fall back to "applies to whole cart" if we can't tell.
    eligible_product_ids = {str(p) for p in promo.products.values_list("id", flat=True)}
    eligible_category_ids = {str(c) for c in promo.categories.values_list("id", flat=True)}

    if promo.target_type == TT.PRODUCTS:
        if not eligible_product_ids:
            return Decimal("0")
        if any(str(pid) in eligible_product_ids for pid in cart.item_ids):
            # Optimistic: apply to whole subtotal until per-line snapshots are passed.
            return cart.subtotal
        return Decimal("0")

    if promo.target_type == TT.CATEGORIES:
        if not eligible_category_ids:
            return Decimal("0")
        if any(str(cid) in eligible_category_ids for cid in cart.category_ids):
            return cart.subtotal
        return Decimal("0")

    return cart.subtotal


def _calculate_discount(
    promo: PromoCode, cart: CartContext, eligible_subtotal: Decimal
) -> Decimal:
    DT = PromoCode.DiscountType
    discount = Decimal("0")

    if promo.discount_type == DT.PERCENTAGE:
        discount = (eligible_subtotal * promo.discount_value / Decimal("100")).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if promo.max_discount_amount:
            discount = min(discount, promo.max_discount_amount)

    elif promo.discount_type == DT.FIXED_AMOUNT:
        discount = min(promo.discount_value, eligible_subtotal)

    elif promo.discount_type == DT.FREE_SHIPPING:
        discount = Decimal("0")

    elif promo.discount_type == DT.FIXED_PRICE:
        if promo.fixed_price and cart.subtotal > promo.fixed_price:
            discount = cart.subtotal - promo.fixed_price

    elif promo.discount_type == DT.BUY_X_GET_Y:
        total = (promo.buy_quantity or 0) + (promo.get_quantity or 0)
        if total > 0:
            free_fraction = Decimal(promo.get_quantity) / Decimal(total)
            discount = (eligible_subtotal * free_fraction).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

    return max(Decimal("0"), min(discount, cart.subtotal))


# ─── User segment ────────────────────────────────────────────────────────────


def _check_stacking(promo: PromoCode, existing_codes: list[str]) -> str | None:
    """Block seller + platform combo unless both promos opt in via ``stackable=True``
    or the active policy allows it globally.
    """
    existing_codes = [c.strip().upper() for c in existing_codes if c]
    if not existing_codes:
        return None

    policy = PromoPolicy.get_active()
    if policy.allow_seller_platform_stacking:
        return None
    if promo.stackable:
        return None

    others = (
        PromoCode.objects.filter(code__in=existing_codes)
        .only("code", "seller_id", "stackable")
    )
    new_is_seller = bool(promo.seller_id)
    for other in others:
        if other.stackable:
            continue
        other_is_seller = bool(other.seller_id)
        if new_is_seller != other_is_seller:
            return (
                f"This {'seller' if new_is_seller else 'platform'} code can't be combined "
                f"with the {'platform' if new_is_seller else 'seller'} code already on your order. "
                "Remove one to use the other."
            )
    return None


def _check_user_segment(promo: PromoCode, user) -> str | None:
    seg = promo.user_segment
    US = PromoCode.UserSegment

    is_authed = bool(user and getattr(user, "is_authenticated", False))

    if seg == US.ALL and not promo.first_order_only:
        return None

    if seg == US.LOGGED_IN and not is_authed:
        return "You must be logged in to use this code."

    if seg == US.NEW or promo.first_order_only:
        if not is_authed:
            return "You must be logged in to use this code."
        if _user_has_completed_order(user):
            return "This code is only valid on your first order."

    if seg == US.RETURNING:
        if not is_authed:
            return "You must be logged in to use this code."
        if not _user_has_completed_order(user):
            return "This code is only valid for returning customers."

    if seg == US.SPECIFIC:
        if not is_authed or not promo.specific_users.filter(pk=user.pk).exists():
            return "You are not eligible for this promo code."

    return None


def _user_has_completed_order(user) -> bool:
    """Best-effort check against the orders app. Returns False if orders aren't wired yet."""
    try:
        from django.apps import apps
        Order = apps.get_model("orders", "Order")
    except (LookupError, Exception):
        return False
    try:
        # Filter by status if the model has it; otherwise just any order.
        qs = Order.objects.filter(user=user)
        if hasattr(Order, "status"):
            qs = qs.filter(status__in=["completed", "delivered", "fulfilled"])
        return qs.exists()
    except Exception:
        return False


# ─── Atomic redemption ───────────────────────────────────────────────────────


class PromoExhaustedException(Exception):
    """Raised when concurrent requests race on the last redemption slot."""


@transaction.atomic
def redeem_promo(
    promo: PromoCode,
    order,
    user,
    discount_amount: Decimal,
    session_key: str = "",
) -> PromoRedemption:
    """Increment the usage counter and create an immutable redemption row.

    Call this inside the order-creation transaction so rollback unwinds both.
    Uses ``F()`` conditional update to handle the race of two requests hitting
    the last slot simultaneously — only one wins; the other gets
    ``PromoExhaustedException``.
    """

    if promo.max_redemptions:
        updated = PromoCode.objects.filter(
            pk=promo.pk,
            current_redemptions__lt=F("max_redemptions"),
        ).update(current_redemptions=F("current_redemptions") + 1)
        if updated == 0:
            raise PromoExhaustedException(
                f"Promo {promo.code} was exhausted by a concurrent request."
            )
    else:
        PromoCode.objects.filter(pk=promo.pk).update(
            current_redemptions=F("current_redemptions") + 1
        )

    order_subtotal = _safe_subtotal(order)

    redemption = PromoRedemption.objects.create(
        promo=promo,
        user=user if user and getattr(user, "is_authenticated", False) else None,
        order_id=str(getattr(order, "pk", getattr(order, "id", ""))),
        session_key=session_key,
        discount_amount=discount_amount,
        order_subtotal=order_subtotal,
        discount_type_snap=promo.discount_type,
        discount_value_snap=promo.discount_value or Decimal("0"),
    )

    logger.info(
        "Promo %s redeemed (order=%s discount=GHS %s)",
        promo.code,
        redemption.order_id,
        discount_amount,
    )
    return redemption


def _safe_subtotal(order) -> Decimal:
    for attr in ("subtotal", "items_total", "total", "amount", "grand_total"):
        v = getattr(order, attr, None)
        if v is not None:
            try:
                return Decimal(str(v))
            except Exception:
                continue
    return Decimal("0")


# ─── Auto-apply ──────────────────────────────────────────────────────────────


def get_auto_apply_promo(cart: CartContext, user=None) -> ValidationResult | None:
    """Return the highest-priority auto-apply promo that qualifies, or None."""
    candidates = (
        PromoCode.objects.filter(auto_apply=True, is_active=True)
        .order_by("-auto_apply_priority", "-created_at")
    )
    for promo in candidates:
        result = validate_promo(promo.code, cart, user)
        if result.valid:
            return result
    return None


# ─── Lookup helpers ──────────────────────────────────────────────────────────


def list_seller_storefront_promos(seller_id) -> list[dict]:
    """Public list of a seller's currently-live promo codes — for the seller's
    storefront page. Only returns codes where ``is_active=True``, in their
    schedule window, and not exhausted. No targeting / per-user checks here —
    those run at apply-time.
    """
    policy = PromoPolicy.get_active()
    if not policy.public_storefront_codes_visible:
        return []

    now = timezone.now()
    qs = (
        PromoCode.objects.filter(seller_id=seller_id, is_active=True)
        .filter(models_or(("starts_at__isnull", True), ("starts_at__lte", now)))
        .filter(models_or(("ends_at__isnull", True), ("ends_at__gte", now)))
        .order_by("-discount_value", "-created_at")[:25]
    )
    out: list[dict] = []
    for promo in qs:
        if promo.max_redemptions and promo.current_redemptions >= promo.max_redemptions:
            continue
        out.append(
            {
                "code": promo.code,
                "name": promo.name,
                "description": promo.description or promo.name,
                "discount_type": promo.discount_type,
                "discount_value": str(promo.discount_value),
                "discount_label": _discount_label(promo),
                "min_order_value": str(promo.min_order_value),
                "ends_at": promo.ends_at.isoformat() if promo.ends_at else None,
                "redemptions_remaining": promo.redemptions_remaining,
                "first_order_only": promo.first_order_only,
            }
        )
    return out


def _discount_label(promo: PromoCode) -> str:
    DT = PromoCode.DiscountType
    if promo.discount_type == DT.PERCENTAGE:
        return f"{int(promo.discount_value)}% off"
    if promo.discount_type == DT.FIXED_AMOUNT:
        return f"GHS {promo.discount_value} off"
    if promo.discount_type == DT.FREE_SHIPPING:
        return "Free shipping"
    if promo.discount_type == DT.BUY_X_GET_Y:
        return f"Buy {promo.buy_quantity} get {promo.get_quantity}"
    if promo.discount_type == DT.FIXED_PRICE:
        return f"Pay GHS {promo.fixed_price}"
    return ""


def list_applicable_promos(cart: CartContext, user=None) -> list[dict]:
    """Cheap list of promos a user could *try* (e.g. to surface in cart sidebar).
    Filters by visibility rules but doesn't validate against the cart fully —
    use ``validate_promo`` for the real check on apply.
    """
    qs = PromoCode.objects.filter(is_active=True)
    now = timezone.now()
    qs = qs.filter(
        models_or(
            ("starts_at__isnull", True),
            ("starts_at__lte", now),
        )
    )
    qs = qs.filter(
        models_or(
            ("ends_at__isnull", True),
            ("ends_at__gte", now),
        )
    )
    out = []
    for promo in qs[:50]:
        out.append(
            {
                "code": promo.code,
                "description": promo.description or promo.name,
                "discount_type": promo.discount_type,
                "discount_value": str(promo.discount_value),
                "min_order_value": str(promo.min_order_value),
                "ends_at": promo.ends_at.isoformat() if promo.ends_at else None,
                "is_seller_scoped": promo.is_seller_scoped,
            }
        )
    return out


def models_or(*pairs):
    """Tiny helper: turn (lookup, value) pairs into an OR-Q without importing Q here."""
    from django.db.models import Q
    q = Q()
    for lookup, value in pairs:
        q |= Q(**{lookup: value})
    return q


# ─── Abuse detection ─────────────────────────────────────────────────────────


def commission_basis_amount(
    *, gross_subtotal: Decimal, discount_amount: Decimal, promo: PromoCode | None
) -> Decimal:
    """Return the dollar amount that the platform commission % should be applied to.

    Honours the active PromoPolicy.commission_basis:

      - PRE_DISCOUNT (Amazon): commission on the original subtotal regardless of
        discount. Seller absorbs the full discount.
      - POST_DISCOUNT (Etsy): commission on what the customer actually paid.
        Platform shares the discount cost proportionally.

    For PLATFORM-funded promos (promo.seller_id is None), the platform always
    eats the discount — commission is on the post-discount price. Only seller
    promos respect the basis switch.
    """
    if not promo or not promo.seller_id:
        # Platform promo (or no promo) — commission is on what was paid.
        return max(Decimal("0"), gross_subtotal - discount_amount)

    policy = PromoPolicy.get_active()
    if policy.commission_basis == PromoPolicy.CommissionBasis.PRE_DISCOUNT:
        return gross_subtotal
    return max(Decimal("0"), gross_subtotal - discount_amount)


def is_suspicious(ip_address: str, code: str = "", window_minutes: int = 60) -> bool:
    """True if this IP has too many failed attempts in the recent window."""
    if not ip_address:
        return False
    cutoff = timezone.now() - timezone.timedelta(minutes=window_minutes)
    failed = PromoAttempt.objects.filter(
        ip_address=ip_address, success=False, attempted_at__gte=cutoff
    ).count()
    return failed >= 10


# ─── Internal helpers ────────────────────────────────────────────────────────


def _log_attempt(code: str, user, cart: CartContext, success: bool, error: str) -> None:
    """Fire-and-forget log row. Never raises into the request."""
    try:
        PromoAttempt.objects.create(
            code=code[:50],
            user_id=str(getattr(user, "pk", "")) if user and getattr(user, "is_authenticated", False) else None,
            ip_address=cart.ip_address or None,
            session_key=(cart.session_key or "")[:64],
            success=success,
            error_code=error[:50],
        )
    except Exception:
        logger.exception("Failed to log promo attempt for code=%s", code)
