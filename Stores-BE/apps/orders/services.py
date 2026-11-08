"""Seller-facing order logic (plan 20, O6-O9).

Ownership: this codebase links sellers to orders only through the lines
(``OrderItem.product.seller_profile``, the same relation ``SellerProfile.update_metrics``
uses). A seller sees an order when at least one of its lines is theirs, and only ever
sees/sums their own lines. Orders that also contain another seller's lines (legacy
multi-seller carts) are read-only for sellers: a status change would affect the other
seller's goods, so writes are refused with 409 ``shared_order``.
"""

from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.db.models import CharField, Exists, OuterRef, Prefetch, Q
from django.db.models.functions import Cast
from django.utils import timezone
from rest_framework.exceptions import APIException

from .models import Order, OrderItem

CENT = Decimal("0.01")
ORDER_STATUSES = ("Pending", "Processing", "Shipped", "Delivered", "Cancelled", "Refunded")


class OrderApiError(APIException):
    """Error body: {"detail": "<message>", "code": "<snake_code>", ...extra}."""

    def __init__(self, status_code, code, detail=None, **extra):
        super().__init__(detail=detail or code.replace("_", " ").capitalize())
        self.status_code = status_code
        self.detail = {"detail": str(self.detail), "code": code, **extra}


def money(value) -> Decimal:
    return (Decimal(value or 0)).quantize(CENT, rounding=ROUND_HALF_UP)


# --------------------------------------------------------------------------- reads

def _own_lines(seller):
    return OrderItem.objects.filter(order_id=OuterRef("pk"), product__seller_profile=seller)


def _other_lines(seller):
    # Includes lines whose product was deleted/has no seller: they are not this seller's.
    return OrderItem.objects.filter(order_id=OuterRef("pk")).exclude(product__seller_profile=seller)


def seller_orders(seller):
    """Orders containing at least one of ``seller``'s lines, with only those lines prefetched
    on ``order.seller_items``. ``order.has_other_sellers`` flags shared (legacy) orders."""
    own_items = (
        OrderItem.objects.filter(product__seller_profile=seller)
        .select_related("product", "variant")
        .order_by("product__name", "id")
    )
    return (
        Order.objects.filter(Exists(_own_lines(seller)))
        .select_related("user", "address")
        .annotate(has_other_sellers=Exists(_other_lines(seller)))
        .prefetch_related(Prefetch("items", queryset=own_items, to_attr="seller_items"))
    )


def filter_seller_orders(qs, seller, *, status=None, q=None):
    if status:
        qs = qs.filter(order_status=status)
    q = (q or "").strip().lstrip("#")
    if q:
        title_hit = _own_lines(seller).filter(
            Q(product__name__icontains=q) | Q(variant__name__icontains=q)
        )
        qs = qs.annotate(id_text=Cast("id", CharField())).filter(
            Q(id_text__icontains=q)
            | Q(address__full_name__icontains=q)
            | Q(user__first_name__icontains=q)
            | Q(user__last_name__icontains=q)
            | Exists(title_hit)
        )
    return qs


def get_seller_order(seller, order_id):
    """Read access. Foreign or unknown id -> 404 (never 403)."""
    order = seller_orders(seller).filter(pk=order_id).first()
    if order is None:
        raise OrderApiError(404, "order_not_found", "Order not found.")
    return order


# --------------------------------------------------------------------------- writes

def lock_seller_order(seller, order_id) -> Order:
    """Lock one of the seller's orders for a state change. Call inside ``transaction.atomic()``.

    Foreign/unknown id -> 404. Shared multi-seller order -> 409 ``shared_order``.
    """
    order = (
        Order.objects.select_for_update()
        .filter(pk=order_id)
        .filter(Exists(_own_lines(seller)))
        .first()
    )
    if order is None:
        raise OrderApiError(404, "order_not_found", "Order not found.")
    if OrderItem.objects.filter(order_id=order.pk).exclude(product__seller_profile=seller).exists():
        raise OrderApiError(
            409,
            "shared_order",
            "This order contains items from another seller and cannot be changed from here.",
        )
    return order


def seller_ship_order(seller, order_id, *, carrier, tracking_number, tracking_url=""):
    """O7. Processing -> Shipped. Returns ``(order, replayed)``.

    A replay (already Shipped with the same tracking number) is a no-op success.
    Any other state, or Shipped with a different tracking number, -> 409 ``not_shippable``.
    """
    with transaction.atomic():
        order = lock_seller_order(seller, order_id)
        if order.order_status == "Shipped" and order.tracking_number == tracking_number:
            return order, True
        if order.order_status != "Processing":
            raise OrderApiError(
                409, "not_shippable", "This order cannot be shipped in its current state.",
                order_status=order.order_status,
            )
        order.order_status = "Shipped"
        order.tracking_carrier = carrier
        order.tracking_number = tracking_number
        order.tracking_url = tracking_url or ""
        order.shipped_at = timezone.now()
        order.save(
            update_fields=[
                "order_status", "tracking_carrier", "tracking_number", "tracking_url",
                "shipped_at", "updated_at",
            ]
        )
        return order, False


def seller_confirm_cod_delivery(seller, order_id):
    """O9. COD only; the seller confirms the cash was collected. Shipped -> Delivered + paid.

    Already-Delivered COD order -> success (idempotent). Not COD -> 409 ``not_cod``.
    Not yet shipped -> 409 ``not_shipped``.
    """
    with transaction.atomic():
        order = lock_seller_order(seller, order_id)
        if order.pay_mode != "COD":
            raise OrderApiError(409, "not_cod", "Only cash on delivery orders can be confirmed this way.")
        if order.order_status == "Delivered":
            return order, True
        if order.order_status != "Shipped":
            raise OrderApiError(
                409, "not_shipped", "Delivery can only be confirmed once the order has been shipped.",
                order_status=order.order_status,
            )
        now = timezone.now()
        order.order_status = "Delivered"
        order.delivered_at = now
        order.payment_status = "paid"
        if order.paid_at is None:
            order.paid_at = now
        order.save(
            update_fields=["order_status", "delivered_at", "payment_status", "paid_at", "updated_at"]
        )
        return order, False
