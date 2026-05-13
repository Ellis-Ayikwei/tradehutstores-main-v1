"""
promos/views.py

POST /api/promos/validate/  — validate a promo code against a cart
GET  /api/promos/auto/      — check for auto-apply promos (on cart update)
"""

from decimal import Decimal
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from .services import validate_promo, get_auto_apply_promo, is_suspicious, CartContext
from .serializers import PromoValidationRequestSerializer


class PromoValidateThrottle(AnonRateThrottle):
    """Max 20 attempts per minute for unauthenticated users."""
    rate = "20/min"

class PromoValidateUserThrottle(UserRateThrottle):
    rate = "60/min"


@api_view(["POST"])
@throttle_classes([PromoValidateThrottle, PromoValidateUserThrottle])
def validate_promo_view(request):
    """
    POST /api/promos/validate/
    Body: { code, subtotal, item_count, item_ids, category_ids, session_key }
    """
    serializer = PromoValidationRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data       = serializer.validated_data
    ip_address = _get_ip(request)

    # Abuse gate — too many failed attempts from this IP
    if is_suspicious(ip_address=ip_address, code=data["code"]):
        return Response(
            {"error": "Too many attempts. Please try again later."},
            status=status.HTTP_429_TOO_MANY_REQUESTS,
        )

    cart = CartContext(
        subtotal     = data["subtotal"],
        item_count   = data["item_count"],
        item_ids     = data["item_ids"],
        category_ids = data["category_ids"],
        user_id      = request.user.id if request.user.is_authenticated else None,
        session_key  = data.get("session_key", ""),
        ip_address   = ip_address,
    )

    result = validate_promo(code=data["code"], cart=cart, user=request.user if request.user.is_authenticated else None)

    return Response({
        "valid":           result.valid,
        "code":            data["code"],
        "discount_type":   result.promo.discount_type if result.promo else "",
        "discount_amount": str(result.discount_amount),
        "free_shipping":   result.free_shipping,
        "description":     result.promo.description if result.promo else "",
        "error_code":      result.error_code,
        "error_message":   result.error_message,
    })


@api_view(["GET"])
def auto_apply_promo_view(request):
    """
    GET /api/promos/auto/?subtotal=500&item_count=3
    Called on every cart update to check if an auto-apply promo qualifies.
    """
    try:
        subtotal    = Decimal(request.GET.get("subtotal", "0"))
        item_count  = int(request.GET.get("item_count", "0"))
    except (ValueError, Exception):
        return Response({"promo": None})

    cart = CartContext(
        subtotal     = subtotal,
        item_count   = item_count,
        item_ids     = [],
        category_ids = [],
        user_id      = request.user.id if request.user.is_authenticated else None,
        session_key  = request.session.session_key or "",
        ip_address   = _get_ip(request),
    )

    result = get_auto_apply_promo(cart=cart, user=request.user if request.user.is_authenticated else None)

    if result and result.valid:
        return Response({
            "promo": {
                "code":            result.promo.code,
                "description":     result.promo.description,
                "discount_amount": str(result.discount_amount),
                "free_shipping":   result.free_shipping,
            }
        })
    return Response({"promo": None})


def _get_ip(request) -> str:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    return xff.split(",")[0].strip() if xff else request.META.get("REMOTE_ADDR", "")
