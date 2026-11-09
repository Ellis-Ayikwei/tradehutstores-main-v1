"""Seller order shapes (O6-O9). Field names follow Stores-Seller/lib/seller/orders.ts.

Everything is computed from the seller's own lines (``order.seller_items``, see
``services.seller_orders``) so a shared order never leaks other sellers' lines or totals.
"""

from datetime import timezone as dt_timezone
from decimal import Decimal

from rest_framework import serializers

from apps.core.currency import get_store_base_currency

from .services import money


def iso(value):
    if value is None:
        return None
    return value.astimezone(dt_timezone.utc).isoformat().replace("+00:00", "Z")


def _decimal_str(value):
    return None if value is None else str(money(value))


def _image_url(item, request):
    product = item.product
    image = getattr(product, "main_product_image", None) if product else None
    if not image:
        return None
    try:
        url = image.url
    except ValueError:
        return None
    return request.build_absolute_uri(url) if request is not None else url


def _title(item):
    if item.product is None:
        return ""
    variant_name = (item.variant.name or "").strip() if item.variant else ""
    return f"{item.product.name} - {variant_name}" if variant_name else item.product.name


def _item(item, request):
    return {
        "id": str(item.id),
        "title": _title(item),
        "sku": item.variant.sku if item.variant else "",
        "quantity": item.quantity,
        "unit_price": _decimal_str(item.unit_price),
        "total_price": _decimal_str(item.total_price),
        "product_id": str(item.product_id) if item.product_id else None,
        "variant_id": str(item.variant_id) if item.variant_id else None,
        "image": _image_url(item, request),
    }


def _buyer_name(order):
    if order.address and (order.address.full_name or "").strip():
        return order.address.full_name.strip()
    if order.user:
        return order.user.get_full_name().strip() or None
    return None


def _pay_mode(order):
    return "COD" if order.pay_mode == "COD" else "ONLINE"


def _lines_subtotal(order):
    return sum((money(i.total_price) for i in order.seller_items), money(0))


def _totals(order, seller):
    """Seller-visible money. Shared orders expose only the seller's own lines (no shipping,
    tax or promo, which cannot be attributed to one seller)."""
    lines = _lines_subtotal(order)
    if order.has_other_sellers:
        total = lines
        subtotal, shipping, tax, promo = lines, None, None, None
    else:
        total = money(order.total_amount)
        subtotal = money(order.subtotal) if order.subtotal is not None else lines
        shipping, tax, promo = order.shipping_cost, order.tax_amount, order.promo_discount
    # Commission is on the pre-discount goods value of this seller's lines (seller rate snapshot
    # is not stored on the order yet).
    commission = money(lines * money(seller.commission_rate) / 100)
    return {
        "total_amount": str(total),
        "subtotal": str(subtotal),
        "shipping_cost": _decimal_str(shipping),
        "tax_amount": _decimal_str(tax),
        "promo_discount": _decimal_str(promo),
        "commission_amount": str(commission),
        "net_amount": str(money(total - commission)),
    }


def seller_order_row(order, seller, request=None):
    items = order.seller_items
    first = items[0] if items else None
    totals = _totals(order, seller)
    return {
        "id": str(order.id),
        "placed_at": iso(order.placed_at),
        "order_status": order.order_status,
        "payment_status": order.payment_status,
        "pay_mode": _pay_mode(order),
        "total_amount": totals["total_amount"],
        "currency": get_store_base_currency(),
        "item_count": len(items),
        "first_item": {"title": _title(first), "image": _image_url(first, request)} if first else None,
        "payment_due_at": None,
        "buyer_name": _buyer_name(order),
    }


def _shipping_address(order):
    a = order.address
    if a is None:
        return None
    return {
        "full_name": a.full_name,
        "phone": a.phone or (str(order.phone) if order.phone else None),
        "address": a.address,
        "address_line2": a.address_line2,
        "city": a.city,
        "state": a.state,
        "postal_code": a.postal_code,
        "country": a.country,
    }


def _num(value):
    return str(value) if value is not None else None


def _shipments(order):
    shipment = getattr(order, "order_shipment", None)  # absent for orders shipped before shipments existed
    if shipment is not None:
        return [
            {
                "carrier": shipment.carrier,
                "tracking_number": shipment.tracking_number,
                "tracking_url": shipment.tracking_url or None,
                "courier_reference": shipment.courier_reference or None,
                "service_level": shipment.service_level or None,
                "parcels": shipment.parcels,
                "weight_kg": _num(shipment.weight_kg),
                "length_cm": _num(shipment.length_cm),
                "width_cm": _num(shipment.width_cm),
                "height_cm": _num(shipment.height_cm),
                "dispatch_date": shipment.dispatch_date.isoformat() if shipment.dispatch_date else None,
                "estimated_delivery_date": shipment.estimated_delivery_date.isoformat() if shipment.estimated_delivery_date else None,
                "contact_name": shipment.contact_name or None,
                "contact_phone": shipment.contact_phone or None,
                "buyer_note": shipment.buyer_note or None,
                "internal_note": shipment.internal_note or None,
                "shipped_at": iso(order.shipped_at),
                "delivered_at": iso(order.delivered_at),
            }
        ]
    if not order.tracking_number:
        return []
    return [
        {
            "carrier": order.tracking_carrier,
            "tracking_number": order.tracking_number,
            "tracking_url": order.tracking_url or None,
            "shipped_at": iso(order.shipped_at),
            "delivered_at": iso(order.delivered_at),
        }
    ]


def _timeline(order):
    steps = [
        ("Placed", order.placed_at),
        ("Paid", order.paid_at),
        ("Shipped", order.shipped_at),
        ("Delivered", order.delivered_at),
        ("Cancelled", order.cancelled_at),
    ]
    return [{"status": s, "at": iso(at)} for s, at in steps if at]


def seller_order_detail(order, seller, request=None):
    data = seller_order_row(order, seller, request)
    totals = _totals(order, seller)
    data.update(
        {
            "seller": {"id": str(seller.id), "business_name": seller.business_name},
            "items": [_item(i, request) for i in order.seller_items],
            "subtotal": totals["subtotal"],
            "shipping_cost": totals["shipping_cost"],
            "tax_amount": totals["tax_amount"],
            "promo_discount": totals["promo_discount"],
            "commission_amount": totals["commission_amount"],
            "net_amount": totals["net_amount"],
            "shipping_address": _shipping_address(order),
            "shipments": _shipments(order),
            "timeline": _timeline(order),
            "paid_at": iso(order.paid_at),
            "shipped_at": iso(order.shipped_at),
            "delivered_at": iso(order.delivered_at),
            "cancelled_at": iso(order.cancelled_at),
            "cancel_reason": order.cancel_reason or None,
        }
    )
    return data


class CancelOrderSerializer(serializers.Serializer):
    reason = serializers.CharField(min_length=3, max_length=200, trim_whitespace=True)


def _optional_text(max_length):
    return serializers.CharField(max_length=max_length, required=False, allow_blank=True, default="", trim_whitespace=True)


def _optional_decimal(max_digits, places):
    return serializers.DecimalField(
        max_digits=max_digits,
        decimal_places=places,
        min_value=Decimal("0.1") if places == 1 else Decimal("0.01"),
        required=False,
        allow_null=True,
        default=None,
    )


class ShipOrderSerializer(serializers.Serializer):
    """The ship form. The tracking number is NOT an input: the platform generates it. ``courier_reference`` is the
    carrier's own waybill number, when there is one (older clients still send it as ``tracking_number``)."""

    carrier = serializers.CharField(max_length=100, trim_whitespace=True)
    service_level = _optional_text(50)
    courier_reference = _optional_text(100)
    tracking_number = _optional_text(100)  # legacy alias of courier_reference
    tracking_url = serializers.URLField(max_length=500, required=False, allow_blank=True, default="")
    parcels = serializers.IntegerField(min_value=1, max_value=50, required=False, default=1)
    weight_kg = _optional_decimal(8, 2)
    length_cm = _optional_decimal(7, 1)
    width_cm = _optional_decimal(7, 1)
    height_cm = _optional_decimal(7, 1)
    dispatch_date = serializers.DateField(required=False, allow_null=True, default=None)
    estimated_delivery_date = serializers.DateField(required=False, allow_null=True, default=None)
    contact_name = _optional_text(100)
    contact_phone = _optional_text(32)
    buyer_note = _optional_text(300)
    internal_note = _optional_text(500)

    def validate(self, attrs):
        dims = [attrs.get(k) for k in ("length_cm", "width_cm", "height_cm")]
        if any(d is not None for d in dims) and not all(d is not None for d in dims):
            raise serializers.ValidationError({"length_cm": "Give length, width and height together (or none of them)."})
        dispatch, eta = attrs.get("dispatch_date"), attrs.get("estimated_delivery_date")
        if dispatch and eta and eta < dispatch:
            raise serializers.ValidationError({"estimated_delivery_date": "Delivery can't be before the dispatch date."})
        legacy = attrs.pop("tracking_number", "")
        if legacy and not attrs.get("courier_reference"):
            attrs["courier_reference"] = legacy
        return attrs
