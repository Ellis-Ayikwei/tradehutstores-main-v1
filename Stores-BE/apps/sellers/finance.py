"""What a seller has sold, earned and been sent - the staff view of one seller's money.

Everything is computed from the seller's own order lines (``OrderItem.product.seller_profile``), the same
relation the seller screens use, so a shared multi-seller order only counts the lines that are theirs.

Rules (plan 20 section 3 / README D4):
  * Commission is ``commission_rate`` % of the goods value of a seller's *delivered* lines. It uses the seller's
    current rate: no per-order rate snapshot is stored yet.
  * Money the platform collected (online orders that are paid) is OWED to the seller: lines - commission.
  * Cash on delivery: the seller already holds the cash, so the platform is owed the commission: -commission.
  * Earnings are ``pending`` for ``HOLD_DAYS`` after delivery, then ``available``.
  * ``balance`` = available earnings - payouts already recorded. Negative means the seller owes the platform.
  * Refunds are not modelled yet, so they are not deducted.
"""

from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.core.currency import get_store_base_currency
from apps.orders.models import Order, OrderItem
from apps.orders.services import OrderApiError, money
from apps.products.models import Product

from .models import PAYOUT_METHODS, SellerPayout, SellerProfile

HOLD_DAYS = 7
CENT = Decimal("0.01")
CLOSED = ("Cancelled", "Refunded")
METHODS = tuple(m for m, _ in PAYOUT_METHODS)
REFERENCE_REQUIRED = ("bank_transfer", "mobile_money")
ZERO = Decimal("0.00")


def _d(value) -> Decimal:
    return Decimal(value or 0)


def _pct(amount: Decimal, rate: Decimal) -> Decimal:
    return (amount * rate / 100).quantize(CENT, rounding=ROUND_HALF_UP)


def seller_lines(seller):
    return OrderItem.objects.filter(product__seller_profile=seller)


def _earnings(seller, now):
    """Aggregate delivered line values into the four money buckets."""
    cutoff = now - timedelta(days=HOLD_DAYS)
    delivered = Q(order__order_status="Delivered")
    cod = Q(order__pay_mode="COD")
    online_paid = ~cod & Q(order__payment_status__in=("paid", "partially_refunded"))
    released = Q(order__delivered_at__lte=cutoff)
    agg = seller_lines(seller).aggregate(
        sold_gross=Sum("total_price", filter=~Q(order__order_status__in=CLOSED)),
        units_sold=Sum("quantity", filter=~Q(order__order_status__in=CLOSED)),
        delivered_gross=Sum("total_price", filter=delivered),
        online_available=Sum("total_price", filter=delivered & online_paid & released),
        online_pending=Sum("total_price", filter=delivered & online_paid & ~released),
        cod_available=Sum("total_price", filter=delivered & cod & released),
        cod_pending=Sum("total_price", filter=delivered & cod & ~released),
    )
    return agg


def seller_finance_summary(seller: SellerProfile, now=None) -> dict:
    now = now or timezone.now()
    rate = _d(seller.commission_rate)
    a = _earnings(seller, now)
    online_available, online_pending = _d(a["online_available"]), _d(a["online_pending"])
    cod_available, cod_pending = _d(a["cod_available"]), _d(a["cod_pending"])

    # Owed to the seller = online lines less commission; cash orders only cost the seller their commission.
    available_earnings = online_available - _pct(online_available, rate) - _pct(cod_available, rate)
    pending_earnings = online_pending - _pct(online_pending, rate) - _pct(cod_pending, rate)
    paid_out = _d(SellerPayout.objects.filter(seller=seller).aggregate(s=Sum("amount"))["s"])
    commission = _pct(_d(a["delivered_gross"]), rate)

    status_counts = {
        row["order_status"] or "Pending": row["n"]
        for row in Order.objects.filter(items__product__seller_profile=seller)
        .values("order_status")
        .annotate(n=Count("id", distinct=True))
    }
    products = Product.objects.filter(seller_profile=seller)

    return {
        "currency": get_store_base_currency(),
        "commission_rate": str(rate),
        "hold_days": HOLD_DAYS,
        "products": {"total": products.count(), "available": products.filter(available=True).count()},
        "orders": {"total": sum(status_counts.values()), "by_status": status_counts},
        "units_sold": int(a["units_sold"] or 0),
        "sold_gross": str(money(a["sold_gross"])),
        "delivered_gross": str(money(a["delivered_gross"])),
        "commission": str(commission),
        "cod_gross": str(money(cod_available + cod_pending)),
        "pending_earnings": str(money(pending_earnings)),
        "available_earnings": str(money(available_earnings)),
        "paid_out": str(money(paid_out)),
        "balance": str(money(available_earnings - paid_out)),
    }


def sold_items(seller: SellerProfile, limit=200) -> list:
    """What they sold: one row per product, best earners first. Cancelled/refunded orders are excluded."""
    rows = (
        seller_lines(seller)
        .exclude(order__order_status__in=CLOSED)
        .values("product_id", "product__name")
        .annotate(units=Sum("quantity"), revenue=Sum("total_price"), orders=Count("order", distinct=True))
        .order_by("-revenue", "product__name")[:limit]
    )
    return [
        {
            "product_id": str(r["product_id"]) if r["product_id"] else None,
            "title": r["product__name"] or "Deleted product",
            "units": int(r["units"] or 0),
            "revenue": str(money(r["revenue"])),
            "orders": r["orders"],
        }
        for r in rows
    ]


def payout_row(p: SellerPayout) -> dict:
    return {
        "id": str(p.pk),
        "amount": str(money(p.amount)),
        "currency": p.currency,
        "method": p.method,
        "reference": p.reference or None,
        "note": p.note or None,
        "paid_at": p.paid_at.isoformat(),
        "recorded_by": (p.recorded_by.get_full_name().strip() or p.recorded_by.email) if p.recorded_by else None,
    }


def record_payout(admin, seller_id, *, amount, method, reference, note, key, paid_at=None):
    """Record money sent to a seller. Returns ``(payout, created)``; the same key again returns the first row.

    The seller row is locked while the balance is re-checked, so two clicks can never pay out the same money twice.
    """
    if method not in METHODS:
        raise OrderApiError(400, "invalid_method", f"method must be one of: {', '.join(METHODS)}.")
    reference = (reference or "").strip()
    if method in REFERENCE_REQUIRED and not reference:
        raise OrderApiError(400, "reference_required", "A transaction reference is required for this payment method.")
    amount = money(amount)
    if amount <= 0:
        raise OrderApiError(400, "invalid_amount", "Amount must be greater than zero.")

    with transaction.atomic():
        existing = SellerPayout.objects.filter(recorded_by=admin, idempotency_key=key).first()
        if existing:
            return existing, False
        seller = SellerProfile.objects.select_for_update().filter(pk=seller_id).first()
        if seller is None:
            raise OrderApiError(404, "seller_not_found", "Seller not found.")
        balance = money(seller_finance_summary(seller)["balance"])
        if amount > balance:
            raise OrderApiError(
                409, "exceeds_balance", f"Only {balance} is available to pay out to this seller.", available=str(max(balance, ZERO))
            )
        payout = SellerPayout.objects.create(
            seller=seller,
            amount=amount,
            currency=get_store_base_currency(),
            method=method,
            reference=reference,
            note=(note or "").strip()[:500],
            paid_at=paid_at or timezone.now(),
            recorded_by=admin,
            idempotency_key=key,
        )
        return payout, True
