"""Staff-only money views for one seller (Admin seller page): summary, orders, sold items, payouts."""

from django.http import Http404
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.serializers import seller_order_row
from apps.orders.services import OrderApiError, filter_seller_orders, seller_orders

from . import finance
from .models import SellerPayout, SellerProfile
from .permissions import IsStaff
from .views import SellersPagination


class _SellerStaffView(APIView):
    permission_classes = [IsAuthenticated, IsStaff]

    def seller(self, pk) -> SellerProfile:
        try:
            return SellerProfile.objects.get(pk=pk)
        except SellerProfile.DoesNotExist:
            raise Http404


class AdminSellerSummaryView(_SellerStaffView):
    """``GET sellers/admin/<id>/summary/`` - counts, sales, commission, earnings, payouts and balance."""

    def get(self, request, pk):
        return Response(finance.seller_finance_summary(self.seller(pk)))


class AdminSellerOrdersView(_SellerStaffView):
    """``GET sellers/admin/<id>/orders/?status=&q=&page=&page_size=`` - orders containing this seller's items."""

    def get(self, request, pk):
        seller = self.seller(pk)
        qs = filter_seller_orders(
            seller_orders(seller),
            seller,
            status=(request.query_params.get("status") or "").strip() or None,
            q=request.query_params.get("q"),
        ).order_by("-placed_at", "-id")
        paginator = SellersPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response([seller_order_row(o, seller, request) for o in page])


class AdminSellerSoldView(_SellerStaffView):
    """``GET sellers/admin/<id>/sold/`` - what they sold, per product."""

    def get(self, request, pk):
        return Response(finance.sold_items(self.seller(pk)))


class PayoutInputSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    method = serializers.ChoiceField(choices=finance.METHODS)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True, default="")
    note = serializers.CharField(max_length=500, required=False, allow_blank=True, default="")


class AdminSellerPayoutsView(_SellerStaffView):
    """``GET`` the payouts sent to this seller; ``POST`` records one (needs an ``Idempotency-Key``)."""

    def get(self, request, pk):
        seller = self.seller(pk)
        rows = SellerPayout.objects.filter(seller=seller).select_related("recorded_by")[:500]
        return Response([finance.payout_row(p) for p in rows])

    def post(self, request, pk):
        self.seller(pk)
        key = (request.headers.get("Idempotency-Key") or "").strip()
        if not key or len(key) > 64:
            raise OrderApiError(400, "idempotency_key_required", "An Idempotency-Key header (max 64 characters) is required.")
        data = PayoutInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        payout, created = finance.record_payout(request.user, pk, key=key, **data.validated_data)
        return Response(finance.payout_row(payout), status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
