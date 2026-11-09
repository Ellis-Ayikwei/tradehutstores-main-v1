"""Staff fulfilment actions on ANY order (the owner sells here too, and admins must be able to step in).

Unlike the seller actions in ``services.py`` these are not limited to the seller's own lines, so they also
work on legacy shared (multi-seller) orders. Every action locks the order row, is idempotent where a replay
makes sense, and writes an audit row.

  * ``admin_ship_order``        Processing -> Shipped (platform-generated tracking number + shipment details)
  * ``admin_confirm_delivery``  Shipped -> Delivered (cash orders are also recorded as collected)
  * ``admin_update_shipping``   Edit the shipping details of ANY order at ANY time (no status change)
  * ``admin_cancel_order``      Pending / Processing -> Cancelled, stock given back; gateway-paid orders are refunded
"""

import logging

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.products.models import ProductVariant

from . import services
from .models import Order, OrderItem, OrderShipment
from .services import OrderApiError

logger = logging.getLogger(__name__)

CANCELLABLE = ("Pending", "Processing")


def _audit(actor, action: str) -> None:
    """Best-effort audit row; never breaks the transition."""
    try:
        from apps.activity.models import ActivityLog

        with transaction.atomic():
            ActivityLog.objects.create(user=actor if getattr(actor, "pk", None) else None, action=action[:255], ip_address="0.0.0.0")
    except Exception:
        logger.exception("audit log failed: %s", action)
    logger.info("audit: %s (actor=%s)", action, getattr(actor, "pk", None))


def _short(order) -> str:
    return str(order.pk)[:8].upper()


def _lock(order_id) -> Order:
    order = Order.objects.select_for_update().filter(pk=order_id).first()
    if order is None:
        raise OrderApiError(404, "order_not_found", "Order not found.")
    return order


def admin_ship_order(actor, order_id, *, details):
    """Processing -> Shipped with a platform-generated tracking number. Returns ``(order, replayed)``.

    The same request repeated within two minutes (double click) is a no-op success.
    """
    with transaction.atomic():
        order = _lock(order_id)
        now = timezone.now()
        if services.is_ship_replay(order, details["carrier"], now):
            return order, True
        shipment = services.ship_locked_order(order, actor=actor, details=details, now=now)
        _audit(actor, f"Order {_short(order)}: admin marked shipped ({shipment.carrier} {shipment.tracking_number})")
        return order, False


def admin_confirm_delivery(actor, order_id):
    """Shipped -> Delivered. A cash-on-delivery order is also recorded as paid. Already delivered -> success."""
    with transaction.atomic():
        order = _lock(order_id)
        if order.order_status == "Delivered":
            return order, True
        if order.order_status != "Shipped":
            raise OrderApiError(
                409, "not_shipped", "Delivery can only be confirmed once the order has been shipped.", order_status=order.order_status
            )
        now = timezone.now()
        order.order_status = "Delivered"
        order.delivered_at = now
        fields = ["order_status", "delivered_at", "updated_at"]
        collect_cash = order.pay_mode == "COD" and order.payment_status != "paid"
        if collect_cash:
            order.payment_status = "paid"
            if order.paid_at is None:
                order.paid_at = now
            fields += ["payment_status", "paid_at"]
        order.save(update_fields=fields)
        if collect_cash:
            # Local import: payment_flow imports services, which this module also imports.
            from .payment_flow import mark_cod_collected

            mark_cod_collected(order, now)
        _audit(actor, f"Order {_short(order)}: admin confirmed delivery")
        return order, False


def _restore_stock(order) -> None:
    """Give the reserved stock back, locking variants in a fixed order so concurrent actions cannot deadlock."""
    lines = list(OrderItem.objects.filter(order=order, variant__isnull=False).values("variant_id", "quantity"))
    if not lines:
        return
    list(ProductVariant.objects.select_for_update().filter(pk__in={ln["variant_id"] for ln in lines}).order_by("pk").values_list("pk", flat=True))
    for ln in lines:
        ProductVariant.objects.filter(pk=ln["variant_id"]).update(quantity=F("quantity") + ln["quantity"])


def admin_cancel_order(actor, order_id, *, reason):
    """Pending / Processing -> Cancelled, stock returned. Already cancelled -> success.

    A never-paid order is simply cancelled. An order paid through the payment gateway is cancelled AND refunded in
    full automatically (the refund then shows on the payment page). An order paid in cash or by bank is refused
    until that money has been paid back by hand (Payments -> open the payment -> Refund).
    """
    from . import payment_flow

    reason = (reason or "").strip()
    with transaction.atomic():
        order = _lock(order_id)
        if order.order_status == "Cancelled":
            return order, True
        refund_ids = payment_flow.cancel_order_and_refund(order, actor=actor, reason=reason)
        _audit(
            actor,
            f"Order {_short(order)}: admin cancelled ({reason})" if reason else f"Order {_short(order)}: admin cancelled",
        )
    payment_flow.submit_pending_refunds(refund_ids)  # after the commit: never call the gateway under a lock
    return order, False


# Everything on the shipment a person may correct. The tracking number is the platform's own id and never changes.
SHIPMENT_FIELDS = (
    "carrier", "service_level", "courier_reference", "tracking_url", "parcels", "weight_kg",
    "length_cm", "width_cm", "height_cm", "dispatch_date", "estimated_delivery_date",
    "contact_name", "contact_phone", "buyer_note", "internal_note",
)


def admin_update_shipping(actor, order_id, *, changes):
    """Add or fix shipping details on any order, whatever its status. Returns the locked order.

    Before the order ships there is no shipment yet, so only the estimated delivery date can be set; carrier,
    parcel and contact details are entered when it is shipped (or edited here afterwards). Carrier, link and
    estimated date are mirrored onto the order exactly like shipping does.
    """
    changes = {k: v for k, v in changes.items() if k in SHIPMENT_FIELDS}
    if not changes:
        raise OrderApiError(400, "nothing_to_update", "Nothing to change.")
    with transaction.atomic():
        order = _lock(order_id)
        shipment = OrderShipment.objects.select_for_update().filter(order=order).first()
        if shipment is None:
            extra = sorted(set(changes) - {"estimated_delivery_date"})
            if extra:
                raise OrderApiError(
                    409, "not_shipped_yet",
                    "Carrier and parcel details are added when the order is shipped. Only the estimated delivery date can be set before then.",
                    fields=extra,
                )
            order.estimated_delivery_date = changes["estimated_delivery_date"]
            order.save(update_fields=["estimated_delivery_date", "updated_at"])
            _audit(actor, f"Order {_short(order)}: admin set estimated delivery")
            return order

        for field, value in changes.items():
            setattr(shipment, field, value)
        if not (shipment.carrier or "").strip():
            raise OrderApiError(400, "carrier_required", "The carrier can't be empty.")
        dims = [shipment.length_cm, shipment.width_cm, shipment.height_cm]
        if any(d is not None for d in dims) and not all(d is not None for d in dims):
            raise OrderApiError(400, "dimensions_incomplete", "Give length, width and height together (or none of them).")
        if shipment.dispatch_date and shipment.estimated_delivery_date and shipment.estimated_delivery_date < shipment.dispatch_date:
            raise OrderApiError(400, "dates_out_of_order", "Delivery can't be before the dispatch date.")
        shipment.save()

        order.tracking_carrier = shipment.carrier
        order.tracking_url = shipment.tracking_url
        update = ["tracking_carrier", "tracking_url", "updated_at"]
        if shipment.estimated_delivery_date != order.estimated_delivery_date:
            order.estimated_delivery_date = shipment.estimated_delivery_date
            update.append("estimated_delivery_date")
        order.save(update_fields=update)
        _audit(actor, f"Order {_short(order)}: admin edited shipping ({', '.join(sorted(changes))})")
        return order
