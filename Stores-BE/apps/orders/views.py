"""Seller order endpoints (plan 20, O6-O9).

Permission stack is the sellers one (``_MyProfileMixin``): authenticated + ``sellers``
feature flag + ``IsSeller`` (non-seller -> 404 ``not_a_seller``). Querysets are scoped to
the requesting seller's own lines in ``services.seller_orders``; a foreign id is a 404.
"""

from rest_framework import status as http
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.sellers.views import _MyProfileMixin

from . import services
from .serializers import ShipOrderSerializer, seller_order_detail, seller_order_row

ORDERING = {
    "placed_at": ("placed_at", "id"),
    "-placed_at": ("-placed_at", "id"),
    "total_amount": ("total_amount", "id"),
    "-total_amount": ("-total_amount", "id"),
}


class SellerOrdersPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class _SellerOrderView(_MyProfileMixin, APIView):
    def seller(self):
        return self.request.user.seller_profile

    def detail_response(self, order_id, code=http.HTTP_200_OK):
        seller = self.seller()
        order = services.get_seller_order(seller, order_id)
        return Response(seller_order_detail(order, seller, self.request), status=code)


class SellerOrderListView(_SellerOrderView):
    """O6 list. ``?status= &q= &ordering= &page= &page_size=`` (newest first by default)."""

    def get(self, request):
        seller = self.seller()

        status_param = (request.query_params.get("status") or "").strip()
        status_value = None
        if status_param:
            status_value = next(
                (s for s in services.ORDER_STATUSES if s.lower() == status_param.lower()), None
            )
            if status_value is None:
                raise ValidationError({"status": [f"Must be one of: {', '.join(services.ORDER_STATUSES)}."]})

        ordering = ORDERING.get(request.query_params.get("ordering") or "-placed_at")
        if ordering is None:
            raise ValidationError({"ordering": [f"Must be one of: {', '.join(ORDERING)}."]})

        qs = services.filter_seller_orders(
            services.seller_orders(seller),
            seller,
            status=status_value,
            q=request.query_params.get("q"),
        ).order_by(*ordering)

        paginator = SellerOrdersPagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        return paginator.get_paginated_response(
            [seller_order_row(o, seller, request) for o in page]
        )


class SellerOrderDetailView(_SellerOrderView):
    """O6 detail."""

    def get(self, request, pk):
        return self.detail_response(pk)


class SellerOrderShipView(_SellerOrderView):
    """O7. Processing -> Shipped; same tracking number replay -> 200; else 409 not_shippable."""

    def post(self, request, pk):
        serializer = ShipOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.seller_ship_order(self.seller(), pk, **serializer.validated_data)
        return self.detail_response(pk)


class SellerOrderConfirmDeliveryView(_SellerOrderView):
    """O9. COD only: seller confirms cash collected. 409 not_cod / not_shipped otherwise."""

    def post(self, request, pk):
        services.seller_confirm_cod_delivery(self.seller(), pk)
        return self.detail_response(pk)

# O8 (seller cancel) is intentionally not built: it needs stock restoration and, for paid
# orders, refund handling, and `orders.services.cancel_order` does not exist yet.
