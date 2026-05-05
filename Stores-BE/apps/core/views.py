import logging

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .fx_service import get_or_build_fx_snapshot, quote_checkout_amounts

logger = logging.getLogger(__name__)


class FxQuoteLineSerializer(serializers.Serializer):
    unit_price = serializers.FloatField(min_value=0)
    quantity = serializers.IntegerField(min_value=1)


class FxQuoteRequestSerializer(serializers.Serializer):
    target_currency = serializers.CharField(max_length=3)
    snapshot_id = serializers.CharField(max_length=32, required=False, allow_blank=True)
    subtotal = serializers.FloatField(min_value=0)
    shipping = serializers.FloatField(min_value=0)
    tax = serializers.FloatField(min_value=0)
    line_items = FxQuoteLineSerializer(many=True, required=False)


@api_view(["GET"])
@permission_classes([AllowAny])
def fx_snapshot(_request):
    """
    GET tradehut/api/v1/core/fx/snapshot/

    Includes `snapshot_id` (stable for this rate table) and `as_of` (when built).
    Use the same `snapshot_id` with POST …/fx/quote/ so the server can flag stale clients.
    """
    payload = get_or_build_fx_snapshot()
    return Response(payload)


@api_view(["POST"])
@permission_classes([AllowAny])
def fx_quote(request):
    """
    POST tradehut/api/v1/core/fx/quote/

    Authoritative checkout display totals in `target_currency` using the cached FX table.
    Send catalog-line `subtotal` / `shipping` / `tax` in **base_currency** (from snapshot).

    Request:
      {
        "target_currency": "EUR",
        "snapshot_id": "optional from GET snapshot",
        "subtotal": 100.0,
        "shipping": 10.0,
        "tax": 15.0,
        "line_items": [{"unit_price": 49.99, "quantity": 2}]
      }

    Response: `amounts` + optional `line_items` with `line_total` in target currency;
    `snapshot_mismatch` if client snapshot_id does not match server table.
    """
    ser = FxQuoteRequestSerializer(data=request.data)
    if not ser.is_valid():
        return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

    snap = get_or_build_fx_snapshot()
    vd = ser.validated_data
    line_raw = vd.get("line_items")
    line_items = [dict(x) for x in line_raw] if line_raw else None

    out = quote_checkout_amounts(
        snapshot=snap,
        target_currency=vd["target_currency"],
        client_snapshot_id=(vd.get("snapshot_id") or "").strip() or None,
        subtotal_base=vd["subtotal"],
        shipping_base=vd["shipping"],
        tax_base=vd["tax"],
        line_items=line_items,
    )
    return Response(out)
