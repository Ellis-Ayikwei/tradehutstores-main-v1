"""Seller-facing order logic (plan 20, O6-O9).

Ownership: this codebase links sellers to orders only through the lines
(``OrderItem.product.seller_profile``, the same relation ``SellerProfile.update_metrics``
uses). A seller sees an order when at least one of its lines is theirs, and only ever
sees/sums their own lines. Orders that also contain another seller's lines (legacy
multi-seller carts) are read-only for sellers: a status change would affect the other
seller's goods, so writes are refused with 409 ``shared_order``.
"""

import secrets
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
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


TRACKING_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O/1/I/L: easy to read out over the phone
REPLAY_WINDOW = timedelta(minutes=2)  # a double click / retry of the same shipment is a success, not an error


def generate_tracking_number() -> str:
    """A unique, platform-issued tracking number such as ``TH7K2M9XQ4PD``. Sellers never type this."""
    from .models import OrderShipment

    for _ in range(20):
        candidate = "TH" + "".join(secrets.choice(TRACKING_ALPHABET) for _ in range(10))
        if not OrderShipment.objects.filter(tracking_number=candidate).exists() and not Order.objects.filter(
            tracking_number=candidate
        ).exists():
            return candidate
    raise RuntimeError("Could not generate a unique tracking number")


def _tracking_link(order) -> str:
    base = str(getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
    return f"{base}/account/orders/{order.pk}" if base else ""


def is_ship_replay(order, carrier, now) -> bool:
    """Already shipped moments ago with the same carrier: the same request again (double click / retry)."""
    from .models import OrderShipment

    if order.order_status != "Shipped" or not order.shipped_at or now - order.shipped_at > REPLAY_WINDOW:
        return False
    shipment = OrderShipment.objects.filter(order=order).first()
    return bool(shipment and shipment.carrier == carrier)


def ship_locked_order(order, *, actor, details, now=None):
    """Processing -> Shipped for an order the caller already locked (inside ``transaction.atomic``).

    Creates the ``OrderShipment`` with a generated tracking number and mirrors carrier / number / link onto the
    order. ``details`` is the validated ship form (carrier, parcels, weight, dates, contact, notes...).
    """
    from .models import OrderRefund, OrderShipment

    now = now or timezone.now()
    if order.order_status != "Processing":
        raise OrderApiError(
            409, "not_shippable", "This order cannot be shipped in its current state.", order_status=order.order_status
        )
    # Money is being (or has been) paid back on this order: the goods must not leave.
    if OrderRefund.objects.filter(order=order, status__in=("pending", "succeeded")).exists():
        raise OrderApiError(
            409, "refund_in_progress", "This order is being refunded, so it can't be shipped.", order_status=order.order_status
        )

    tracking_number = generate_tracking_number()
    link = (details.get("tracking_url") or "").strip() or _tracking_link(order)
    dispatch = details.get("dispatch_date") or timezone.localdate(now)
    estimated = details.get("estimated_delivery_date") or order.estimated_delivery_date
    shipment = OrderShipment.objects.create(
        order=order,
        tracking_number=tracking_number,
        carrier=details["carrier"],
        service_level=details.get("service_level", ""),
        courier_reference=details.get("courier_reference", ""),
        tracking_url=link,
        parcels=details.get("parcels") or 1,
        weight_kg=details.get("weight_kg"),
        length_cm=details.get("length_cm"),
        width_cm=details.get("width_cm"),
        height_cm=details.get("height_cm"),
        dispatch_date=dispatch,
        estimated_delivery_date=estimated,
        contact_name=details.get("contact_name", ""),
        contact_phone=details.get("contact_phone", ""),
        buyer_note=details.get("buyer_note", ""),
        internal_note=details.get("internal_note", ""),
        shipped_by=actor if getattr(actor, "pk", None) else None,
    )
    order.order_status = "Shipped"
    order.tracking_carrier = shipment.carrier
    order.tracking_number = tracking_number
    order.tracking_url = link
    order.shipped_at = now
    update = ["order_status", "tracking_carrier", "tracking_number", "tracking_url", "shipped_at", "updated_at"]
    if estimated and estimated != order.estimated_delivery_date:
        order.estimated_delivery_date = estimated
        update.append("estimated_delivery_date")
    order.save(update_fields=update)
    return shipment


def seller_ship_order(seller, order_id, *, details):
    """O7. Processing -> Shipped with a platform-generated tracking number. Returns ``(order, replayed)``.

    The same request repeated within two minutes (double click) is a no-op success.
    Any other state -> 409 ``not_shippable``.
    """
    with transaction.atomic():
        order = lock_seller_order(seller, order_id)
        now = timezone.now()
        if is_ship_replay(order, details["carrier"], now):
            return order, True
        ship_locked_order(order, actor=seller.user, details=details, now=now)
        return order, False


def seller_cancel_order(seller, order_id, *, reason):
    """O8. Processing -> Cancelled, stock returned, and a gateway-paid order is refunded in full.

    Already cancelled -> success. Shared (multi-seller) orders are refused by ``lock_seller_order`` (409).
    A refund that the gateway cannot take right now is recorded as pending/failed on the payment page; the
    cancellation itself still stands. Returns ``(order, replayed)``.
    """
    from . import payment_flow

    with transaction.atomic():
        order = lock_seller_order(seller, order_id)
        if order.order_status == "Cancelled":
            return order, True
        if order.order_status != "Processing":
            raise OrderApiError(
                409, "not_cancellable", "This order can no longer be cancelled.", order_status=order.order_status
            )
        refund_ids = payment_flow.cancel_order_and_refund(order, actor=seller.user, reason=reason)
    payment_flow.submit_pending_refunds(refund_ids)
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
        already_paid = order.payment_status == "paid"  # e.g. an admin already recorded the cash by hand
        order.order_status = "Delivered"
        order.delivered_at = now
        order.payment_status = "paid"
        if order.paid_at is None:
            order.paid_at = now
        order.save(
            update_fields=["order_status", "delivered_at", "payment_status", "paid_at", "updated_at"]
        )
        if not already_paid:
            # Local import: payment_flow imports this module.
            from .payment_flow import mark_cod_collected

            mark_cod_collected(order, now)
        return order, False
