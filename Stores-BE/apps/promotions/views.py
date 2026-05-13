"""
Public promo endpoints — used by the storefront cart & checkout.

  POST /tradehut/api/v1/promos/validate/   — validate a code against a cart
  GET  /tradehut/api/v1/promos/auto/       — auto-apply check (cart-update side effect)
  GET  /tradehut/api/v1/promos/applicable/ — listable promos for a "have a code?" hint
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from .serializers import PromoValidationRequestSerializer
from .services import (
    CartContext,
    get_auto_apply_promo,
    is_suspicious,
    list_applicable_promos,
    list_seller_storefront_promos,
    validate_promo,
)


class PromoValidateAnonThrottle(AnonRateThrottle):
    rate = "20/min"


class PromoValidateUserThrottle(UserRateThrottle):
    rate = "60/min"


def _get_ip(request) -> str:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    return xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR", "")


def _build_context(data, request) -> CartContext:
    seller_subtotals = {
        str(k): Decimal(str(v))
        for k, v in (data.get("seller_subtotals") or {}).items()
    }
    return CartContext(
        subtotal=Decimal(str(data["subtotal"])),
        item_count=int(data["item_count"]),
        item_ids=[str(i) for i in (data.get("item_ids") or [])],
        category_ids=[str(c) for c in (data.get("category_ids") or [])],
        seller_ids=[str(s) for s in (data.get("seller_ids") or [])],
        seller_subtotals=seller_subtotals,
        user_id=str(request.user.pk) if request.user.is_authenticated else None,
        session_key=data.get("session_key", "") or (request.session.session_key or ""),
        ip_address=_get_ip(request),
    )


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PromoValidateAnonThrottle, PromoValidateUserThrottle])
def validate_promo_view(request):
    serializer = PromoValidationRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    ip = _get_ip(request)

    if is_suspicious(ip_address=ip, code=data["code"]):
        return Response(
            {"error": "Too many attempts. Please try again later."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    cart = _build_context(data, request)
    user = request.user if request.user.is_authenticated else None
    existing = request.data.get("existing_promo_codes") or []
    result = validate_promo(
        code=data["code"], cart=cart, user=user, existing_promo_codes=existing
    )

    return Response(
        {
            "valid": result.valid,
            "code": data["code"],
            "discount_type": result.promo.discount_type if result.promo else "",
            "discount_amount": str(result.discount_amount),
            "free_shipping": result.free_shipping,
            "description": result.promo.description if result.promo else "",
            "error_code": result.error_code,
            "error_message": result.error_message,
        }
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def auto_apply_promo_view(request):
    try:
        subtotal = Decimal(request.GET.get("subtotal", "0"))
        item_count = int(request.GET.get("item_count", "0"))
    except (ValueError, InvalidOperation):
        return Response({"promo": None})

    cart = CartContext(
        subtotal=subtotal,
        item_count=item_count,
        user_id=str(request.user.pk) if request.user.is_authenticated else None,
        session_key=request.session.session_key or "",
        ip_address=_get_ip(request),
    )
    user = request.user if request.user.is_authenticated else None
    result = get_auto_apply_promo(cart=cart, user=user)

    if result and result.valid:
        return Response(
            {
                "promo": {
                    "code": result.promo.code,
                    "description": result.promo.description,
                    "discount_amount": str(result.discount_amount),
                    "free_shipping": result.free_shipping,
                }
            }
        )
    return Response({"promo": None})


@api_view(["GET"])
@permission_classes([AllowAny])
def storefront_seller_promos_view(request, seller_id):
    """List a seller's currently-live promo codes for their public storefront."""
    return Response({"promos": list_seller_storefront_promos(seller_id)})


@api_view(["GET"])
@permission_classes([AllowAny])
def applicable_promos_view(request):
    """List active promos that *could* be applied to a cart (sidebar hints)."""
    try:
        subtotal = Decimal(request.GET.get("subtotal", "0"))
        item_count = int(request.GET.get("item_count", "0"))
    except (ValueError, InvalidOperation):
        subtotal, item_count = Decimal("0"), 0

    cart = CartContext(
        subtotal=subtotal,
        item_count=item_count,
        user_id=str(request.user.pk) if request.user.is_authenticated else None,
        session_key=request.session.session_key or "",
        ip_address=_get_ip(request),
    )
    user = request.user if request.user.is_authenticated else None
    return Response({"promos": list_applicable_promos(cart, user)})
