"""Thin views: parse -> permission -> service -> serialize (plan 11 section 6).

Buyer endpoints are ``IsAuthenticated`` and every queryset filters ``buyer=request.user``;
supplier endpoints are ``IsSeller`` (read) / ``IsVerifiedSeller`` (write) and are scoped to the
caller's seller profile. Another party's id is always a 404.
"""

from django.db import transaction
from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auctions.errors import ApiError, require_idempotency_key
from apps.auctions.pagination import StandardPagination
from apps.auctions.permissions import IsSeller, IsVerifiedSeller

from . import selectors, services
from .models import RFQ, Quote
from .serializers import (
    AwardInputSerializer,
    CancelInputSerializer,
    MatchDetailSerializer,
    MatchRowSerializer,
    QuoteWriteSerializer,
    RFQDetailSerializer,
    RFQRowSerializer,
    RFQWriteSerializer,
    SupplierQuoteSerializer,
    attachment_payload,
)


def _ctx(request):
    return {"request": request}


def _buyer_rfq(request, pk):
    try:
        return selectors.buyer_detail_queryset(request.user).get(pk=pk)
    except RFQ.DoesNotExist:
        raise ApiError(404, "rfq_not_found", "Request not found.")


def _detail(request, pk, http_status=status.HTTP_200_OK):
    return Response(RFQDetailSerializer(_buyer_rfq(request, pk), context=_ctx(request)).data, status=http_status)


def _supplier_quote(request, quote_id):
    try:
        quote = Quote.objects.select_related("rfq", "product").get(
            pk=quote_id, supplier=request.user.seller_profile
        )
    except Quote.DoesNotExist:
        raise ApiError(404, "quote_not_found", "Quote not found.")
    return Response(SupplierQuoteSerializer(quote, context=_ctx(request)).data)


# --------------------------------------------------------------------------- buyer


class RFQListCreateView(generics.ListAPIView):
    """R1 (GET) and R2 (POST)."""

    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    serializer_class = RFQRowSerializer

    def get_queryset(self):
        return selectors.buyer_list_queryset(self.request.user, self.request.query_params)

    def post(self, request):
        key = require_idempotency_key(request)
        body = RFQWriteSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        rfq, created = services.create_rfq(
            buyer=request.user, data=dict(body.validated_data), idempotency_key=key
        )
        return _detail(request, rfq.pk, status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class RFQDetailView(APIView):
    """R3 (GET) and R4 (PATCH)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        return _detail(request, pk)

    def patch(self, request, pk):
        body = RFQWriteSerializer(data=request.data, partial=True)
        body.is_valid(raise_exception=True)
        data = dict(body.validated_data)
        data.pop("publish", None)
        services.update_rfq(buyer=request.user, rfq_id=pk, data=data)
        return _detail(request, pk)


class RFQPublishView(APIView):
    """R5."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        services.publish_rfq(buyer=request.user, rfq_id=pk)
        return _detail(request, pk)


class RFQCancelView(APIView):
    """R6. ``reason`` is accepted for the client's convenience; the RFQ has no field to store it."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        CancelInputSerializer(data=request.data).is_valid(raise_exception=True)
        services.cancel_rfq(buyer=request.user, rfq_id=pk)
        return _detail(request, pk)


class RFQAttachmentCreateView(APIView):
    """R7 (POST, multipart ``file``)."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, pk):
        upload = request.FILES.get("file")
        if upload is None:
            raise ApiError(400, "file_required", "Attach a file.")
        attachment = services.add_attachment(buyer=request.user, rfq_id=pk, upload=upload)
        return Response(attachment_payload(attachment, request), status=status.HTTP_201_CREATED)


class RFQAttachmentDeleteView(APIView):
    """R7 (DELETE)."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, pk, attachment_id):
        services.remove_attachment(buyer=request.user, rfq_id=pk, attachment_id=attachment_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class RFQAwardView(APIView):
    """R8."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        key = require_idempotency_key(request)
        body = AwardInputSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        rfq = services.award(
            rfq_id=pk, buyer=request.user, quote_id=body.validated_data["quote_id"], idempotency_key=key
        )
        detail = RFQDetailSerializer(_buyer_rfq(request, pk), context=_ctx(request)).data
        return Response({"rfq": detail, "order_id": str(rfq.order_id) if rfq.order_id else None})


# --------------------------------------------------------------------------- supplier


class SellerMatchListView(generics.ListAPIView):
    """Q1."""

    permission_classes = [IsSeller]
    pagination_class = StandardPagination
    serializer_class = MatchRowSerializer

    def get_queryset(self):
        return selectors.matches_queryset(self.request.user.seller_profile, self.request.query_params)


class SellerMatchDetailView(APIView):
    """Q2."""

    permission_classes = [IsSeller]

    def get(self, request, pk):
        seller = request.user.seller_profile
        try:
            rfq = selectors.match_detail_queryset(seller).get(pk=pk)
        except RFQ.DoesNotExist:
            raise ApiError(404, "rfq_not_found", "Request not found.")
        my_quote = Quote.objects.filter(rfq=rfq, supplier=seller).select_related("product").first()
        if my_quote:
            my_quote.rfq = rfq
        context = {**_ctx(request), "my_quote": my_quote}
        return Response(MatchDetailSerializer(rfq, context=context).data)


class SellerQuoteCreateView(APIView):
    """Q3."""

    permission_classes = [IsVerifiedSeller]

    def post(self, request, pk):
        key = require_idempotency_key(request)
        body = QuoteWriteSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        quote, created = services.submit_quote(
            rfq_id=pk,
            seller=request.user.seller_profile,
            data=dict(body.validated_data),
            idempotency_key=key,
        )
        response = _supplier_quote(request, quote.pk)
        response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return response


class SellerQuoteDetailView(APIView):
    """Q4."""

    permission_classes = [IsVerifiedSeller]

    def patch(self, request, quote_id):
        body = QuoteWriteSerializer(data=request.data, partial=True)
        body.is_valid(raise_exception=True)
        services.edit_quote(
            quote_id=quote_id, seller=request.user.seller_profile, data=dict(body.validated_data)
        )
        return _supplier_quote(request, quote_id)


class SellerQuoteWithdrawView(APIView):
    """Q5."""

    permission_classes = [IsVerifiedSeller]

    def post(self, request, quote_id):
        services.withdraw_quote(quote_id=quote_id, seller=request.user.seller_profile)
        return _supplier_quote(request, quote_id)


class SellerQuoteListView(generics.ListAPIView):
    """Q6."""

    permission_classes = [IsSeller]
    pagination_class = StandardPagination
    serializer_class = SupplierQuoteSerializer

    def get_queryset(self):
        return selectors.seller_quotes_queryset(self.request.user.seller_profile, self.request.query_params)
