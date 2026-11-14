"""Payments API: seller balance (P6), Paystack webhook + polling (P4/P5), and the admin payment ledger."""

import json
import logging
from datetime import timedelta
from decimal import Decimal

from django.db.models import CharField, DecimalField, Q, Sum, Value
from django.db.models.functions import Cast, Coalesce, Replace
from django.utils import timezone
from rest_framework import serializers
from rest_framework import status as http
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ads import sponsored_services
from apps.orders import payment_flow
from apps.orders.admin_views import _customer_name, admin_order_detail
from apps.orders.checkout_views import find_owned_session
from apps.orders.models import (
    PAYMENT_METHOD,
    PAYMENT_PROVIDER,
    PAYMENT_STATE,
    REFUND_STATE,
    CheckoutSession,
    Order,
    OrderPayment,
    OrderRefund,
)
from apps.orders.services import OrderApiError, money
from apps.sellers.models import SellerProfile
from apps.sellers.permissions import IsStaff
from apps.sellers.views import _MyProfileMixin

from . import paystack, services

logger = logging.getLogger("tradehut.payments")

_MONEY = DecimalField(max_digits=12, decimal_places=2)
_ZERO = Value(Decimal("0.00"), output_field=_MONEY)
MAX_WEBHOOK_BYTES = 256 * 1024


def _plain_id(path: str):
    """A UUID column as hyphen-free text. PostgreSQL keeps the hyphens when casting a uuid to text (SQLite stores
    none), so prefix searches must compare against the hyphen-free form on both."""
    return Replace(Cast(path, CharField()), Value("-"), Value(""))


def _id_prefix(search: str) -> str:
    return search.strip().lstrip("#").replace("-", "").lower()


class SellerBalanceView(_MyProfileMixin, APIView):
    """P6 - the requesting seller's balance. Read-only."""

    def get(self, request):
        seller = SellerProfile.objects.get(user=request.user)
        return Response(services.seller_balance(seller))


# ------------------------------------------------------------------ Paystack (buyers)


class PaystackWebhookView(APIView):
    """P4 - Paystack's server-to-server event. Authenticated ONLY by the HMAC-SHA512 signature of the raw body.

    A bad or missing signature is 401. After that the answer is always 200 (so Paystack stops retrying), except
    for an unexpected server error, which is left as a 500 on purpose so Paystack retries it later.
    """

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = []

    def post(self, request):
        # Paystack events are a few KB. Refuse anything large BEFORE reading it (the HMAC would be wasted work).
        try:
            declared = int(request.META.get("CONTENT_LENGTH") or 0)
        except ValueError:
            declared = 0
        if declared > MAX_WEBHOOK_BYTES:
            return Response({"detail": "Payload too large.", "code": "payload_too_large"}, status=http.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        raw = request.body
        if not paystack.valid_signature(raw, request.headers.get("x-paystack-signature")):
            logger.warning("Rejected a Paystack webhook with a missing or invalid signature")
            return Response({"detail": "Invalid signature.", "code": "invalid_signature"}, status=http.HTTP_401_UNAUTHORIZED)
        try:
            event = json.loads(raw)
        except ValueError:
            return Response({"received": True})
        name = event.get("event") if isinstance(event, dict) else None
        data = event.get("data") if isinstance(event, dict) and isinstance(event.get("data"), dict) else {}
        if isinstance(name, str) and name.startswith("refund."):
            outcome = payment_flow.process_refund_event(name, data)
            if outcome == "unmatched":
                outcome = sponsored_services.process_refund_event(name, data)
            logger.info("Paystack %s handled: %s", name, outcome)
            return Response({"received": True})
        if name != "charge.success":
            return Response({"received": True})  # other events are acknowledged and ignored
        reference = str(data.get("reference") or "")
        if reference.startswith(sponsored_services.REFERENCE_PREFIX):
            logger.info("Paystack sponsored payment handled: %s", sponsored_services.mark_paid(reference, data))
            return Response({"received": True})
        session = CheckoutSession.objects.filter(reference=reference).first() if reference else None
        if session is None:
            logger.warning("Paystack webhook for an unknown reference (%s)", reference[:40])
        else:
            payment_flow.mark_session_paid(session.pk, data)
        return Response({"received": True})


class PaystackVerifyView(APIView):
    """P5 - the buyer's page asks "did my payment go through?". ``?reference=`` is the Paystack reference
    or the checkout id. We ask Paystack directly (never trusting the browser) at most once every 2 seconds."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        session = find_owned_session(request.user, request.query_params.get("reference", ""))
        transient_failure = False

        if session.status == "pending" and session.provider == "paystack" and paystack.is_configured():
            now = timezone.now()
            recently = session.last_verified_at and (now - session.last_verified_at) < timedelta(seconds=2)
            if not recently:
                CheckoutSession.objects.filter(pk=session.pk).update(last_verified_at=now)
                try:
                    data = paystack.verify(session.reference)
                except paystack.PaystackError as exc:
                    logger.warning("Could not verify %s: %s", session.reference, exc)
                    data = None
                if data and data.get("status") == "success":
                    payment_flow.mark_session_paid(session.pk, data)
                elif data and data.get("status") == "failed":
                    transient_failure = True  # reported to the page, but a later success can still settle it
                session.refresh_from_db()
            if session.status == "pending" and session.expires_at and session.expires_at < now:
                payment_flow.reconcile_or_expire(session, now=now)
                session.refresh_from_db()

        status = "failed" if (transient_failure and session.status == "pending") else session.status
        orders = [
            {
                "id": str(o.pk),
                "order_number": f"#{str(o.pk)[:8].upper()}",
                "order_status": o.order_status,
                "payment_status": o.payment_status,
                "total_amount": str(money(o.total_amount)),
            }
            for o in session.orders.order_by("placed_at", "id")
        ]
        totals = {"currency": session.currency, "amount": str(money(session.amount))}
        return Response({"status": status, "provider": session.provider, **totals, "orders": orders})


# --------------------------------------------------------------------- admin ledger


class PaymentsPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


ORDERING = {"created_at": "recorded_at", "amount": "amount", "status": "status"}


def _iso(value):
    return value.isoformat() if value else None


def payment_row(payment) -> dict:
    order = payment.order
    user = order.user
    payload = payment.provider_payload or {}
    return {
        "id": str(payment.pk),
        "reference": payment.reference or None,
        "transaction_id": str(payload["id"]) if payload.get("id") is not None else None,
        "order_id": str(order.pk),
        "order_number": f"#{str(order.pk)[:8].upper()}",
        "customer_name": _customer_name(user),
        "customer_email": user.email if user else "",
        "amount": str(money(payment.amount)),
        "currency": payment.currency,
        "status": payment.status,
        "payment_type": payment.method or payment.provider,
        "provider": payment.provider,
        "method": payment.method or None,
        "paid_at": _iso(payment.paid_at),
        "created_at": _iso(payment.recorded_at),
        "recorded_by": payment.recorded_by.email if payment.recorded_by else None,
        "note": payment.note or None,
        "refunded_amount": str(_refunded(payment)),
        "refundable_amount": str(_refundable(payment)),
    }


def _refunded(payment):
    """Succeeded refunds on ``payment`` (annotated on list queries, computed on demand elsewhere)."""
    value = getattr(payment, "refunded_sum", None)
    return money(value) if value is not None else payment_flow.refunded_amount(payment)


def _refundable(payment):
    reserved = getattr(payment, "reserved_sum", None)
    if reserved is None:
        return payment_flow.refundable_amount(payment)
    if payment.status not in ("succeeded", "refunded"):
        return money(0)
    return max(money(payment.amount) - money(reserved), money(0))


def refund_row(refund) -> dict:
    order = refund.order
    user = order.user
    return {
        "id": str(refund.pk),
        "reference": refund.provider_refund_id or None,
        "transaction_id": refund.payment.reference or None,
        "payment_id": str(refund.payment_id),
        "order_id": str(order.pk),
        "order_number": f"#{str(order.pk)[:8].upper()}",
        "customer_name": _customer_name(user),
        "customer_email": user.email if user else "",
        "amount": str(money(refund.amount)),
        "currency": refund.currency,
        "status": refund.status,
        "payment_type": "refund",
        "provider": refund.provider,
        "method": refund.payment.method or None,
        "recorded_by": refund.requested_by.email if refund.requested_by else None,
        "note": refund.reason or None,
        "failure_note": refund.failure_note or None,
        "created_at": _iso(refund.requested_at),
        "processed_at": _iso(refund.processed_at),
    }


class RecordPaymentInput(serializers.Serializer):
    # Either the order's UUID, or the number shown everywhere in the apps (e.g. "#9A3F21C4").
    order_id = serializers.UUIDField(required=False)
    order_number = serializers.CharField(required=False, allow_blank=True, max_length=40)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    method = serializers.ChoiceField(choices=[m for m, _ in PAYMENT_METHOD])
    reference = serializers.CharField(required=False, allow_blank=True, max_length=100)
    note = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, attrs):
        if not attrs.get("order_id") and not (attrs.get("order_number") or "").strip():
            raise serializers.ValidationError({"order_number": "Enter the order number."})
        return attrs


def _resolve_order_id(data):
    """The order UUID from ``order_id`` or an ``order_number`` prefix. 404 if none, 409 if it matches several."""
    if data.get("order_id"):
        return data["order_id"]
    term = _id_prefix(data["order_number"])
    if len(term) < 6 or any(ch not in "0123456789abcdef" for ch in term):
        raise OrderApiError(400, "invalid_order_number", "That doesn't look like an order number.")
    matches = list(
        Order.objects.annotate(plain_id=_plain_id("id")).filter(plain_id__startswith=term).values_list("pk", flat=True)[:2]
    )
    if not matches:
        raise OrderApiError(404, "order_not_found", "No order has that number.")
    if len(matches) > 1:
        raise OrderApiError(409, "ambiguous_order_number", "More than one order matches; type more of the number.")
    return matches[0]


class AdminPaymentCollectionView(APIView):
    """``GET payments/`` list (staff) and ``POST payments/`` record a payment received outside the gateway."""

    permission_classes = [IsAuthenticated, IsStaff]

    def get(self, request):
        params = request.query_params
        qs = OrderPayment.objects.select_related("order", "order__user", "recorded_by").annotate(
            refunded_sum=Coalesce(Sum("refunds__amount", filter=Q(refunds__status="succeeded")), _ZERO, output_field=_MONEY),
            reserved_sum=Coalesce(
                Sum("refunds__amount", filter=Q(refunds__status__in=("pending", "succeeded"))), _ZERO, output_field=_MONEY
            ),
        )

        wanted = {s.strip() for s in (params.get("status") or "").split(",") if s.strip()}
        if wanted:
            valid = wanted & {s for s, _ in PAYMENT_STATE}
            qs = qs.filter(status__in=valid) if valid else qs.none()
        provider = (params.get("provider") or "").strip()
        if provider in {p for p, _ in PAYMENT_PROVIDER}:
            qs = qs.filter(provider=provider)
        method = (params.get("method") or "").strip()
        if method in {m for m, _ in PAYMENT_METHOD}:
            qs = qs.filter(method=method)

        search = (params.get("search") or "").strip()
        if search:
            clause = Q(reference__icontains=search) | Q(order__user__email__icontains=search) | Q(note__icontains=search)
            term = _id_prefix(search)
            if len(term) >= 4:
                qs = qs.annotate(order_plain_id=_plain_id("order__id"))
                clause |= Q(order_plain_id__startswith=term)
            qs = qs.filter(clause)

        ordering = (params.get("ordering") or "-created_at").strip()
        desc = ordering.startswith("-")
        field = ORDERING.get(ordering.lstrip("-"))
        if field is None:
            raise OrderApiError(400, "invalid_ordering", f"ordering must be one of: {', '.join(ORDERING)} (prefix - for descending).")
        qs = qs.order_by(f"-{field}" if desc else field, "-id" if desc else "id")

        paginator = PaymentsPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response([payment_row(p) for p in page])

    def post(self, request):
        key = (request.headers.get("Idempotency-Key") or "").strip()
        if not key or len(key) > 64:
            raise OrderApiError(400, "idempotency_key_required", "An Idempotency-Key header (max 64 characters) is required.")
        serializer = RecordPaymentInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        payment, created = payment_flow.record_manual_payment(
            request.user,
            order_id=_resolve_order_id(data),
            amount=data["amount"],
            method=data["method"],
            reference=data.get("reference", ""),
            note=data.get("note", ""),
            key=key,
        )
        payment = OrderPayment.objects.select_related("order", "order__user", "recorded_by").get(pk=payment.pk)
        return Response(payment_row(payment), status=http.HTTP_201_CREATED if created else http.HTTP_200_OK)


def _timeline(payment, refunds) -> list:
    """Payment-level events, oldest first (the order's own fulfilment timeline is inside ``order``)."""
    started = {"paystack": "Payment started", "cod": "Cash on delivery expected", "manual": "Payment recorded by an admin"}
    events = []

    def add(at, label, kind):
        if at:
            events.append({"at": at.isoformat(), "label": label, "kind": kind})

    add(payment.recorded_at, started.get(payment.provider, "Payment created"), "info")
    if payment.paid_at:
        add(payment.paid_at, "Cash collected" if payment.provider == "cod" else "Payment received", "success")
    for r in refunds:
        add(r.requested_at, f"Refund of {money(r.amount)} {r.currency} requested", "info")
        if r.processed_at:
            ok = r.status == "succeeded"
            add(r.processed_at, f"Refund of {money(r.amount)} {r.currency} {'completed' if ok else 'failed'}", "success" if ok else "error")
    events.sort(key=lambda e: e["at"])
    return events


class AdminPaymentDetailView(APIView):
    """``GET payments/<id>/`` - everything about one payment (staff): who paid, for what, through which gateway
    reference, the whole order with its items and address, its refunds, sibling payments and a timeline."""

    permission_classes = [IsAuthenticated, IsStaff]

    def get(self, request, pk):
        payment = OrderPayment.objects.select_related("order", "order__user", "recorded_by", "session").filter(pk=pk).first()
        if payment is None:
            raise OrderApiError(404, "payment_not_found", "Payment not found.")
        order = (
            Order.objects.select_related("user", "address")
            .prefetch_related("items__product__seller_profile", "items__variant")
            .get(pk=payment.order_id)
        )
        refunds = list(
            payment.refunds.select_related("order", "order__user", "payment", "requested_by").order_by("requested_at")
        )
        siblings = OrderPayment.objects.filter(order=order).exclude(pk=payment.pk).order_by("recorded_at")
        gateway = payment.provider_payload or {}
        session = payment.session

        row = payment_row(payment)
        row.update(
            {
                "gateway": (
                    {
                        "transaction_id": str(gateway["id"]) if gateway.get("id") is not None else None,
                        "channel": gateway.get("channel"),
                        "gateway_response": gateway.get("gateway_response"),
                        "paid_at": gateway.get("paid_at"),
                    }
                    if payment.provider == "paystack"
                    else None
                ),
                "checkout": (
                    {
                        "id": session.id.hex,
                        "status": session.status,
                        "reference": session.reference,
                        "amount": str(money(session.amount)),
                        "expires_at": _iso(session.expires_at),
                        "paid_at": _iso(session.paid_at),
                    }
                    if session
                    else None
                ),
                "order": admin_order_detail(order, request),
                "amount_paid_on_order": str(payment_flow.paid_total(order)),
                "amount_outstanding_on_order": str(payment_flow.outstanding(order)),
                "other_payments": [
                    {
                        "id": str(s.pk),
                        "status": s.status,
                        "provider": s.provider,
                        "method": s.method or None,
                        "amount": str(money(s.amount)),
                        "currency": s.currency,
                        "reference": s.reference or None,
                        "created_at": _iso(s.recorded_at),
                    }
                    for s in siblings
                ],
                "refunds": [refund_row(r) for r in refunds],
                "timeline": _timeline(payment, refunds),
            }
        )
        return Response(row)


# ------------------------------------------------------------------------- refunds


class RefundInput(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    reason = serializers.CharField(max_length=500)
    # gateway = Paystack sends the money back; manual = you already paid the customer back yourself.
    mode = serializers.ChoiceField(choices=["gateway", "manual"], required=False, default="gateway")


REFUND_ORDERING = {"created_at": "requested_at", "amount": "amount", "status": "status"}


class AdminPaymentRefundView(APIView):
    """``POST payments/<id>/refund/`` - refund all or part of a payment (staff). Needs an ``Idempotency-Key``."""

    permission_classes = [IsAuthenticated, IsStaff]

    def post(self, request, pk):
        key = (request.headers.get("Idempotency-Key") or "").strip()
        if not key or len(key) > 64:
            raise OrderApiError(400, "idempotency_key_required", "An Idempotency-Key header (max 64 characters) is required.")
        serializer = RefundInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        refund, created = payment_flow.request_refund(
            request.user, payment_id=pk, amount=data["amount"], reason=data["reason"], mode=data["mode"], key=key
        )
        if created and refund.provider == "paystack" and refund.status == "pending":
            refund = payment_flow.submit_refund_to_gateway(refund.pk)  # raises 502 if the gateway says no / is unsure
        refund = OrderRefund.objects.select_related("order", "order__user", "payment", "requested_by").get(pk=refund.pk)
        return Response(refund_row(refund), status=http.HTTP_201_CREATED if created else http.HTTP_200_OK)


class AdminRefundListView(APIView):
    """``GET payments/refunds/`` - every refund (staff), the Admin "Refunds" tab."""

    permission_classes = [IsAuthenticated, IsStaff]

    def get(self, request):
        params = request.query_params
        qs = OrderRefund.objects.select_related("order", "order__user", "payment", "requested_by")

        wanted = {s.strip() for s in (params.get("status") or "").split(",") if s.strip()}
        if wanted:
            valid = wanted & {s for s, _ in REFUND_STATE}
            qs = qs.filter(status__in=valid) if valid else qs.none()
        search = (params.get("search") or "").strip()
        if search:
            clause = Q(reason__icontains=search) | Q(order__user__email__icontains=search) | Q(provider_refund_id__icontains=search)
            term = _id_prefix(search)
            if len(term) >= 4:
                qs = qs.annotate(order_plain_id=_plain_id("order__id"))
                clause |= Q(order_plain_id__startswith=term)
            qs = qs.filter(clause)

        ordering = (params.get("ordering") or "-created_at").strip()
        desc = ordering.startswith("-")
        field = REFUND_ORDERING.get(ordering.lstrip("-"))
        if field is None:
            raise OrderApiError(400, "invalid_ordering", f"ordering must be one of: {', '.join(REFUND_ORDERING)} (prefix - for descending).")
        qs = qs.order_by(f"-{field}" if desc else field, "-id" if desc else "id")

        paginator = PaymentsPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response([refund_row(r) for r in page])


class MarkRefundFailedInput(serializers.Serializer):
    note = serializers.CharField(required=False, allow_blank=True, max_length=300)


class AdminRefundMarkFailedView(APIView):
    """``POST payments/refunds/<id>/mark-failed/`` - for a gateway refund stuck pending after you confirmed on the
    gateway dashboard that it does not exist. Releases the reserved amount. If the gateway later reports it as
    processed anyway, the webhook records the truth."""

    permission_classes = [IsAuthenticated, IsStaff]

    def post(self, request, pk):
        serializer = MarkRefundFailedInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        refund = OrderRefund.objects.select_related("order", "order__user", "payment", "requested_by").filter(pk=pk).first()
        if refund is None:
            raise OrderApiError(404, "refund_not_found", "Refund not found.")
        note = (serializer.validated_data.get("note") or "").strip()
        changed = payment_flow.mark_refund_failed(refund.pk, note=f"Marked failed by {request.user.email}. {note}".strip())
        if not changed:
            raise OrderApiError(409, "not_pending", "Only a pending refund can be marked as failed.")
        refund.refresh_from_db()
        return Response(refund_row(refund))
