"""Staff order list for the Admin app (``GET orders/``).

Staff only (``is_staff``): this is the one place that returns every buyer's name, email and address, so it is
never reachable by buyers or sellers (they get 403). The response is the flat array Admin's Order Management
page already renders; its status vocabulary is lowercase and its payment vocabulary is pending/paid/refunded.
"""

from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sellers.permissions import IsStaff

from . import admin_actions, payment_flow
from .admin_actions import CANCELLABLE
from .models import Order
from .serializers import ShipOrderSerializer
from .services import ORDER_STATUSES, OrderApiError, money

DEFAULT_LIMIT = 500
MAX_LIMIT = 1000

_STATUS_FOR_ADMIN = {
    "pending": "pending",
    "processing": "processing",
    "shipped": "shipped",
    "delivered": "delivered",
    "cancelled": "cancelled",
    "refunded": "cancelled",  # Admin has no "refunded" fulfilment pill
}
_PAYMENT_FOR_ADMIN = {
    "unpaid": "pending",
    "paid": "paid",
    "refunded": "refunded",
    "partially_refunded": "refunded",
}


def _customer_name(user) -> str:
    if user is None:
        return "Guest"
    return (user.get_full_name() or "").strip() or user.email or "Customer"


def _shipping_address(address) -> str:
    if address is None:
        return ""
    parts = [address.address, address.city, address.state, address.country]
    return ", ".join(str(p).strip() for p in parts if p and str(p).strip())


def admin_order_row(order) -> dict:
    return {
        "id": str(order.pk),
        "order_number": f"#{str(order.pk)[:8].upper()}",
        "customer_name": _customer_name(order.user),
        "customer_email": order.user.email if order.user else "",
        # A JSON number, not a string: Admin sums these.
        "total_amount": float(money(order.total_amount)),
        "status": _STATUS_FOR_ADMIN.get((order.order_status or "pending").lower(), "pending"),
        "payment_status": _PAYMENT_FOR_ADMIN.get(order.payment_status, "pending"),
        "items_count": int(order.items_count or 0),
        "shipping_address": _shipping_address(order.address),
        "created_at": (order.placed_at or order.created_at).isoformat(),
        "updated_at": order.updated_at.isoformat() if getattr(order, "updated_at", None) else None,
    }


def admin_order_detail(order, request=None) -> dict:
    """Whole order (every seller's lines) for staff. Reuses the seller serializers' item/address/shipment
    shapes so the Admin detail page and the Seller Central sheet read the same field names."""
    from apps.core.currency import get_store_base_currency

    from .serializers import _buyer_name, _decimal_str, _item, _shipments, _shipping_address, _timeline, iso

    user = order.user
    items = []
    for line in order.items.all():
        row = _item(line, request)
        seller_profile = getattr(line.product, "seller_profile", None) if line.product else None
        row["seller"] = seller_profile.business_name if seller_profile else None
        items.append(row)

    ledger = list(order.payments.all())  # prefetched by _load_order
    payments = [
        {
            "id": str(p.pk),
            "provider": p.provider,
            "method": p.method or None,
            "status": p.status,
            "amount": _decimal_str(p.amount),
            "currency": p.currency,
            "reference": p.reference or None,
            "paid_at": iso(p.paid_at),
            "note": p.note or None,
        }
        for p in sorted(ledger, key=lambda p: p.recorded_at)
    ]
    paid = sum((money(p.amount) for p in ledger if p.status == "succeeded"), money(0))

    # Same rules as the real cancel (payment_flow.plan_cancel), so the button never promises what the action refuses.
    cancel_blocker_info, cancel_refunds = (None, False)
    if order.order_status in CANCELLABLE:
        cancel_blocker_info, cancel_refunds = payment_flow.cancel_blocker(order)
    refunds = [
        {
            "id": str(r.pk),
            "payment_id": str(r.payment_id),
            "status": r.status,
            "provider": r.provider,
            "amount": _decimal_str(r.amount),
            "currency": r.currency,
            "reason": r.reason or None,
            "failure_note": r.failure_note or None,
            "created_at": iso(r.requested_at),
            "processed_at": iso(r.processed_at),
        }
        for r in sorted(order.refunds.all(), key=lambda r: r.requested_at)
    ]

    return {
        "id": str(order.pk),
        "order_number": f"#{str(order.pk)[:8].upper()}",
        "order_status": order.order_status or "Pending",
        "payment_status": order.payment_status,
        "pay_mode": order.pay_mode,
        "delivery_method": order.delivery_method or None,
        "currency": get_store_base_currency(),
        "placed_at": iso(order.placed_at),
        "paid_at": iso(order.paid_at),
        "shipped_at": iso(order.shipped_at),
        "delivered_at": iso(order.delivered_at),
        "estimated_delivery_date": order.estimated_delivery_date.isoformat() if order.estimated_delivery_date else None,
        "customer": {
            "name": _buyer_name(order) or _customer_name(user),
            "email": user.email if user else "",
        },
        "items": items,
        "subtotal": _decimal_str(order.subtotal),
        "shipping_cost": _decimal_str(order.shipping_cost),
        "tax_amount": _decimal_str(order.tax_amount),
        "promo_code": order.promo_code or None,
        "promo_discount": _decimal_str(order.promo_discount),
        "total_amount": _decimal_str(order.total_amount),
        "shipping_address": _shipping_address(order),
        "shipments": _shipments(order),
        "timeline": _timeline(order),
        "payments": payments,
        "refunds": refunds,
        "amount_paid": str(paid),
        "amount_outstanding": str(max(money(order.total_amount) - paid, money(0))),
        # What the staff member can do right now; the page renders buttons from this, not its own rules.
        "actions": {
            # Shipping details can be added or corrected at any time, whatever the status.
            "edit_shipping": True,
            "ship": order.order_status == "Processing" and not _has_open_refund(order),
            "confirm_delivery": order.order_status == "Shipped",
            "cancel": cancel_blocker_info is None and order.order_status in CANCELLABLE,
            # Why cancelling is not offered even though the order has not shipped (money that must be paid back
            # by hand first, the buyer still paying online...), and whether cancelling refunds the buyer.
            "cancel_blocker": cancel_blocker_info if order.order_status in CANCELLABLE else None,
            "cancel_refunds_buyer": cancel_refunds,
        },
    }


def _has_open_refund(order) -> bool:
    """Money is being (or has been) paid back on this order: the goods must not leave."""
    return any(r.status in ("pending", "succeeded") for r in order.refunds.all())


def _load_order(pk):
    order = (
        Order.objects.select_related("user", "address")
        .prefetch_related("items__product__seller_profile", "items__variant", "payments", "refunds")
        .filter(pk=pk)
        .first()
    )
    if order is None:
        raise OrderApiError(404, "not_found", "Order not found.")
    return order


class AdminShippingSerializer(ShipOrderSerializer):
    """The ship form as a partial edit. Dimension / date consistency is checked against the stored shipment in
    the service, since a single changed field must be judged with the ones already saved."""

    def validate(self, attrs):
        return attrs


class AdminOrderDetailView(APIView):
    """``GET orders/<id>/`` - one order in full. Staff only, same gate as the list."""

    permission_classes = [IsAuthenticated, IsStaff]

    def get(self, request, pk):
        return Response(admin_order_detail(_load_order(pk), request))

    def patch(self, request, pk):
        """Edit the shipping details at any time, whatever the order's status (see ``admin_update_shipping``)."""
        data = AdminShippingSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        admin_actions.admin_update_shipping(request.user, pk, changes=data.validated_data)
        return Response(admin_order_detail(_load_order(pk), request))


class _AdminOrderAction(APIView):
    """Base for the staff fulfilment actions: run the service, answer with the refreshed order."""

    permission_classes = [IsAuthenticated, IsStaff]

    def respond(self, request, pk):
        return Response(admin_order_detail(_load_order(pk), request))


class AdminOrderShipView(_AdminOrderAction):
    """``POST orders/<id>/ship/`` - Processing -> Shipped. Same form as the seller's (carrier, parcels, weight,
    dates, contact, notes); the tracking number is generated by the platform."""

    def post(self, request, pk):
        data = ShipOrderSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        admin_actions.admin_ship_order(request.user, pk, details=data.validated_data)
        return self.respond(request, pk)


class AdminOrderConfirmDeliveryView(_AdminOrderAction):
    """``POST orders/<id>/confirm-delivery/`` - Shipped -> Delivered (cash orders recorded as collected)."""

    def post(self, request, pk):
        admin_actions.admin_confirm_delivery(request.user, pk)
        return self.respond(request, pk)


class AdminCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=200, trim_whitespace=True)


class AdminOrderCancelView(_AdminOrderAction):
    """``POST orders/<id>/cancel/`` ``{reason}`` - Pending/Processing -> Cancelled, stock returned; an order paid
    through the payment gateway is refunded in full automatically."""

    def post(self, request, pk):
        data = AdminCancelSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        admin_actions.admin_cancel_order(request.user, pk, reason=data.validated_data["reason"])
        return self.respond(request, pk)


class AdminOrderListView(APIView):
    """``GET orders/?status=&limit=`` - newest first, at most ``limit`` (default 500, max 1000)."""

    permission_classes = [IsAuthenticated, IsStaff]

    def get(self, request):
        qs = (
            Order.objects.select_related("user", "address")
            .annotate(items_count=Coalesce(Sum("items__quantity"), 0))
            .order_by("-placed_at", "-id")
        )

        status = (request.query_params.get("status") or "").strip()
        if status:
            match = next((s for s in ORDER_STATUSES if s.lower() == status.lower()), None)
            if match is None:
                raise OrderApiError(400, "invalid_status", f"Unknown status '{status}'.")
            qs = qs.filter(order_status=match)

        try:
            limit = int(request.query_params.get("limit", DEFAULT_LIMIT))
        except (TypeError, ValueError):
            raise OrderApiError(400, "invalid_limit", "limit must be a whole number.")
        limit = max(1, min(limit, MAX_LIMIT))

        return Response([admin_order_row(order) for order in qs[:limit]])
