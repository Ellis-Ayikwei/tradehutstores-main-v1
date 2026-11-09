"""Buyer checkout endpoints (plan 20, P1/P2/P3): cash on delivery and Paystack. See ``checkout.py``."""

import uuid

from django.utils import timezone
from rest_framework import serializers
from rest_framework import status as http
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import Address

from . import checkout, payment_flow
from .models import CheckoutSession
from .services import OrderApiError


class _LineInput(serializers.Serializer):
    variant_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=999)


class QuoteInput(serializers.Serializer):
    items = _LineInput(many=True, allow_empty=False)
    address_id = serializers.UUIDField()
    delivery_method = serializers.CharField(required=False, allow_blank=True, max_length=50)
    promo_code = serializers.CharField(required=False, allow_blank=True, max_length=64)

    def validate_items(self, value):
        if len(value) > 50:
            raise serializers.ValidationError("A checkout can have at most 50 lines.")
        return value


class CheckoutInput(QuoteInput):
    payment_method = serializers.ChoiceField(choices=["cod", "paystack"])
    expected_total = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)


def _buyer_address(user, address_id):
    """A buyer can only ever use their own address (anything else is the same 404)."""
    address = Address.objects.filter(pk=address_id, user=user).first()
    if address is None:
        raise OrderApiError(404, "address_not_found", "That delivery address could not be found.")
    return address


class CheckoutQuoteView(APIView):
    """P2 - price the cart. Writes nothing."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = QuoteInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        address = _buyer_address(request.user, data["address_id"])
        quote = checkout.price_cart(
            request.user,
            data["items"],
            address,
            data.get("delivery_method", ""),
            data.get("promo_code", ""),
            strict=False,
        )
        return Response(checkout.quote_payload(quote))


class CheckoutView(APIView):
    """P1 - place the order(s). 201 when created, 200 when the same Idempotency-Key is replayed."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        key = (request.headers.get("Idempotency-Key") or "").strip()
        if not key or len(key) > 64:
            raise OrderApiError(400, "idempotency_key_required", "An Idempotency-Key header (max 64 characters) is required.")

        serializer = CheckoutInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Refuse an unavailable payment method before touching anything else.
        checkout.require_method_enabled(data["payment_method"])

        address = _buyer_address(request.user, data["address_id"])
        payload, created = checkout.place_checkout(
            request.user,
            items=data["items"],
            address=address,
            delivery_method=data.get("delivery_method", ""),
            promo_code=data.get("promo_code", ""),
            expected_total=data.get("expected_total"),
            key=key,
            payment_method=data["payment_method"],
        )
        return Response(payload, status=http.HTTP_201_CREATED if created else http.HTTP_200_OK)


def find_owned_session(user, ident: str):
    """A buyer's own session by id (hex or dashed UUID) or by Paystack reference. Anyone else's is a 404."""
    ident = (ident or "").strip()
    session = None
    try:
        session = CheckoutSession.objects.filter(pk=uuid.UUID(ident), user=user).first()
    except ValueError:
        pass
    if session is None and ident:
        session = CheckoutSession.objects.filter(reference=ident, user=user).first()
    if session is None:
        raise OrderApiError(404, "checkout_not_found", "We couldn't find that checkout.")
    return session


class CheckoutPaymentView(APIView):
    """P3 - (re)open the Paystack payment page for a pending checkout, e.g. after ``payment_error``."""

    permission_classes = [IsAuthenticated]

    def post(self, request, checkout_id):
        session = find_owned_session(request.user, checkout_id)
        if session.provider != "paystack" or session.status != "pending":
            raise OrderApiError(409, "not_pending", "This checkout isn't waiting for an online payment.")
        if session.expires_at and session.expires_at < timezone.now():
            raise OrderApiError(409, "not_pending", "This checkout has expired. Please place the order again.")
        error = checkout.start_online_payment(session, request.user)
        if error:
            raise OrderApiError(502, "payment_page_unavailable", error)
        return Response(checkout.session_payload(session, checkout.session_orders(session)))
