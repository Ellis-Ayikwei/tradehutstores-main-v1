"""Thin views: parse -> permission -> service -> serialize (plan 10 section 7)."""

from django.conf import settings
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView

from . import queries, services
from .errors import ApiError, require_idempotency_key
from .models import Auction, Bid
from .pagination import StandardPagination
from .permissions import IsSeller, IsVerifiedSeller
from .serializers import (
    AuctionDetailSerializer,
    AuctionCardSerializer,
    AuctionStateSerializer,
    AuctionWriteSerializer,
    BidInputSerializer,
    BidRowSerializer,
    CancelInputSerializer,
    MyBiddingSerializer,
    SellerAuctionDetailSerializer,
    SellerAuctionRowSerializer,
)

# --------------------------------------------------------------------------- throttles


class _ScopedThrottle(SimpleRateThrottle):
    """Per-user (or per-IP when anonymous) throttle with a settings-overridable rate."""

    default_rate = "60/min"

    def get_rate(self):
        return getattr(settings, f"AUCTIONS_{self.scope.upper()}_RATE", self.default_rate)

    def get_cache_key(self, request, view):
        user = request.user
        ident = user.pk if user and user.is_authenticated else self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": ident}


class BidThrottle(_ScopedThrottle):
    scope = "bids"
    default_rate = "30/min"


class AuctionPollThrottle(_ScopedThrottle):
    scope = "auction_poll"
    default_rate = "120/min"


def _throttles(*extra):
    return list(api_settings.DEFAULT_THROTTLE_CLASSES) + list(extra)


# --------------------------------------------------------------------------- helpers


def _visible_auction(request, pk):
    try:
        return queries.public_detail_queryset(request.user).get(pk=pk)
    except Auction.DoesNotExist:
        raise ApiError(404, "auction_not_found", "Auction not found.")


def _seller_auction(request, pk):
    seller = request.user.seller_profile
    try:
        a = queries.seller_detail_queryset(seller, request.user).get(pk=pk)
    except Auction.DoesNotExist:
        raise ApiError(404, "auction_not_found", "Auction not found.")
    queries.attach_order_info([a])
    return a


class _OrderInfoPagination(StandardPagination):
    """Adds the batched order status lookup to each page (one query, not per row)."""

    def paginate_queryset(self, queryset, request, view=None):
        page = super().paginate_queryset(queryset, request, view)
        return queries.attach_order_info(page) if page is not None else page


def _ctx(request):
    return {"request": request}


# --------------------------------------------------------------------------- buyer / public


class AuctionListView(generics.ListAPIView):
    """A1."""

    permission_classes = [AllowAny]
    pagination_class = StandardPagination
    serializer_class = AuctionCardSerializer

    def get_queryset(self):
        return queries.public_list_queryset(self.request.user, self.request.query_params)


class AuctionDetailView(APIView):
    """A2."""

    permission_classes = [AllowAny]

    def get(self, request, pk):
        a = _visible_auction(request, pk)
        return Response(AuctionDetailSerializer(a, context=_ctx(request)).data)


class AuctionStateView(APIView):
    """A3 (polled every 2-5s; never cached)."""

    permission_classes = [AllowAny]
    throttle_classes = _throttles(AuctionPollThrottle)

    def get(self, request, pk):
        a = _visible_auction(request, pk)
        response = Response(AuctionStateSerializer(a, context=_ctx(request)).data)
        response["Cache-Control"] = "no-store"
        return response


class AuctionBidsView(generics.ListAPIView):
    """A4 (GET) and A5 (POST)."""

    pagination_class = StandardPagination
    serializer_class = BidRowSerializer

    def get_permissions(self):
        return [IsAuthenticated()] if self.request.method == "POST" else [AllowAny()]

    def get_throttles(self):
        extra = [BidThrottle()] if self.request.method == "POST" else []
        return super().get_throttles() + extra

    def get_queryset(self):
        a = _visible_auction(self.request, self.kwargs["pk"])
        return Bid.objects.filter(auction_id=a.pk).select_related("bidder").order_by("-amount")

    def post(self, request, pk):
        key = require_idempotency_key(request)
        body = BidInputSerializer(data=request.data)
        if not body.is_valid():
            raise ApiError(400, "invalid_amount", "Enter a valid bid amount.", errors=body.errors)
        bid, created = services.place_bid(
            auction_id=pk,
            user=request.user,
            amount=body.validated_data["amount"],
            idempotency_key=key,
        )
        state = AuctionStateSerializer(_visible_auction(request, pk), context=_ctx(request)).data
        return Response(
            {
                "bid": {
                    "id": str(bid.id),
                    "amount": str(bid.amount),
                    "placed_at": bid.placed_at.isoformat(),
                },
                "state": state,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AuctionBuyNowView(APIView):
    """A6."""

    permission_classes = [IsAuthenticated]
    throttle_classes = _throttles(BidThrottle)

    def post(self, request, pk):
        key = require_idempotency_key(request)
        a, created = services.buy_now(auction_id=pk, user=request.user, idempotency_key=key)
        state = AuctionStateSerializer(_visible_auction(request, pk), context=_ctx(request)).data
        return Response(
            {"order_id": str(a.order_id) if a.order_id else None, "state": state},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class AuctionWatchView(APIView):
    """A7: POST watches, DELETE unwatches."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        a = _visible_auction(request, pk)
        return Response({"is_watching": services.set_watch(auction=a, user=request.user, watching=True)})

    def delete(self, request, pk):
        a = _visible_auction(request, pk)
        services.set_watch(auction=a, user=request.user, watching=False)
        return Response({"is_watching": False})


class MyBiddingView(generics.ListAPIView):
    """A8."""

    permission_classes = [IsAuthenticated]
    pagination_class = _OrderInfoPagination
    serializer_class = MyBiddingSerializer

    def get_queryset(self):
        return queries.my_bidding_queryset(self.request.user, self.request.query_params)


class MyWatchingView(generics.ListAPIView):
    """A9."""

    permission_classes = [IsAuthenticated]
    pagination_class = StandardPagination
    serializer_class = AuctionCardSerializer

    def get_queryset(self):
        return queries.my_watching_queryset(self.request.user)


# --------------------------------------------------------------------------- seller


class SellerAuctionListCreateView(generics.ListAPIView):
    """S1 (GET, IsSeller) and S2 (POST, IsVerifiedSeller)."""

    pagination_class = _OrderInfoPagination
    serializer_class = SellerAuctionRowSerializer

    def get_permissions(self):
        return [IsVerifiedSeller()] if self.request.method == "POST" else [IsSeller()]

    def get_queryset(self):
        return queries.seller_queryset(
            self.request.user.seller_profile, self.request.user, self.request.query_params
        )

    def post(self, request):
        key = require_idempotency_key(request)
        body = AuctionWriteSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        a, created = services.create_auction(
            seller=request.user.seller_profile,
            data=dict(body.validated_data),
            idempotency_key=key,
        )
        data = SellerAuctionDetailSerializer(_seller_auction(request, a.pk), context=_ctx(request)).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class SellerAuctionDetailView(APIView):
    """S3 (GET, IsSeller) and S4 (PATCH, IsVerifiedSeller)."""

    def get_permissions(self):
        return [IsVerifiedSeller()] if self.request.method == "PATCH" else [IsSeller()]

    def get(self, request, pk):
        a = _seller_auction(request, pk)
        return Response(SellerAuctionDetailSerializer(a, context=_ctx(request)).data)

    def patch(self, request, pk):
        current = _seller_auction(request, pk)
        body = AuctionWriteSerializer(current, data=request.data, partial=True)
        body.is_valid(raise_exception=True)
        services.update_auction(
            seller=request.user.seller_profile, auction_id=pk, data=body.validated_data
        )
        return Response(
            SellerAuctionDetailSerializer(_seller_auction(request, pk), context=_ctx(request)).data
        )


class SellerAuctionCancelView(APIView):
    """S5."""

    permission_classes = [IsVerifiedSeller]

    def post(self, request, pk):
        body = CancelInputSerializer(data=request.data)
        body.is_valid(raise_exception=True)
        services.cancel_auction(
            auction_id=pk,
            seller=request.user.seller_profile,
            reason=body.validated_data.get("reason", ""),
        )
        return Response(
            SellerAuctionDetailSerializer(_seller_auction(request, pk), context=_ctx(request)).data
        )
