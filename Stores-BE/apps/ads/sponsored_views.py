"""Sponsored products API (plan 26). Thin views: parse, permission, service, serialize."""

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.auctions.errors import ApiError, require_idempotency_key
from apps.auctions.pagination import StandardPagination
from apps.auctions.permissions import IsSeller, IsVerifiedSeller
from apps.products.models import Product
from apps.products.serializers import list_row_prefetches
from apps.products.visibility import visible_products
from apps.search.serializers import SearchProductSerializer

from . import sponsored_services as services
from .permissions import AdsAdminPermission
from .sponsored_models import SponsoredPackage, SponsoredPromotion
from .sponsored_serializers import (
    ApproveInput,
    CompInput,
    PackageSerializer,
    PurchaseInput,
    RejectInput,
    SellerPackageSerializer,
    SellerPromotionSerializer,
    StaffPromotionSerializer,
    StopInput,
)

MAX_PACKAGE_LIST = 50


def _promotion_body(request, promotion, serializer=SellerPromotionSerializer, **extra):
    return {"promotion": serializer(promotion, context={"request": request}).data, **extra}


def _page(request, qs, serializer, view):
    paginator = StandardPagination()
    page = paginator.paginate_queryset(qs, request, view=view)
    now = timezone.now()
    return paginator.get_paginated_response(serializer(page, many=True, context={"request": request, "now": now}).data)


# ------------------------------------------------------------------------------ seller


class SellerPackageListView(APIView):
    """P1 - the active packages a seller can buy."""

    permission_classes = [IsSeller]

    def get(self, request):
        packages = SponsoredPackage.objects.filter(is_active=True).order_by("sort_order", "price", "name")[:MAX_PACKAGE_LIST]
        return Response({"results": SellerPackageSerializer(packages, many=True).data})


class SellerPromotionListCreateView(APIView):
    """P2 list the seller's promotions, P3 buy one."""

    def get_permissions(self):
        return [IsVerifiedSeller() if self.request.method == "POST" else IsSeller()]

    def get(self, request):
        qs = services.promotions().filter(seller=request.user.seller_profile).order_by("-created_on", "-id")
        wanted = (request.query_params.get("status") or "").strip()
        if wanted:
            qs = services.apply_status_filter(qs, wanted, timezone.now())
        return _page(request, qs, SellerPromotionSerializer, self)

    def post(self, request):
        key = require_idempotency_key(request)
        serializer = PurchaseInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        promotion, created = services.purchase(
            seller=request.user.seller_profile,
            user=request.user,
            product_id=data["product_id"],
            package_id=data["package_id"],
            starts_on=data["starts_on"],
            idempotency_key=key,
        )
        if not created:
            if promotion.status == SponsoredPromotion.STATUS_ABANDONED:
                raise ApiError(409, "promotion_abandoned", "That payment attempt did not complete. Start again.")
            if promotion.status == SponsoredPromotion.STATUS_AWAITING_PAYMENT and not promotion.authorization_url:
                raise ApiError(409, "request_in_progress", "This purchase is already being started. Try again in a moment.")
        promotion = services.promotions().get(pk=promotion.pk)
        body = _promotion_body(
            request, promotion, authorization_url=promotion.authorization_url, reference=promotion.reference
        )
        return Response(body, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


def _own(request, pk):
    promotion = services.promotions().filter(pk=pk, seller=request.user.seller_profile).first()
    if promotion is None:
        raise ApiError(404, "promotion_not_found", "Promotion not found.")
    return promotion


class SellerPromotionDetailView(APIView):
    """P4."""

    permission_classes = [IsSeller]

    def get(self, request, pk):
        return Response(SellerPromotionSerializer(_own(request, pk), context={"request": request}).data)


class SellerPromotionVerifyView(APIView):
    """P5 - ask Paystack whether the payment went through (at most once per 2 seconds per promotion)."""

    permission_classes = [IsSeller]

    def post(self, request, pk):
        promotion = services.verify(_own(request, pk))
        return Response(SellerPromotionSerializer(promotion, context={"request": request}).data)


class SellerPromotionCancelView(APIView):
    """P6."""

    permission_classes = [IsVerifiedSeller]

    def post(self, request, pk):
        promotion = services.cancel(pk, seller=request.user.seller_profile)
        return Response(SellerPromotionSerializer(promotion, context={"request": request}).data)


# ------------------------------------------------------------------------------- staff


class StaffPromotionListCreateView(APIView):
    """P7 list every promotion, P13 add a free one."""

    permission_classes = [AdsAdminPermission]

    def get(self, request):
        params = request.query_params
        qs = services.promotions().order_by("-created_on", "-id")
        wanted = (params.get("status") or "").strip()
        if wanted:
            qs = services.apply_status_filter(qs, wanted, timezone.now())
        search = (params.get("q") or "").strip()[:100]
        if search:
            qs = qs.filter(
                Q(product__name__icontains=search)
                | Q(seller__business_name__icontains=search)
                | Q(reference__icontains=search)
            )
        seller = (params.get("seller") or "").strip()
        if seller:
            ident = services.uuid_or_none(seller)
            qs = qs.filter(seller_id=ident) if ident else qs.none()
        return _page(request, qs, StaffPromotionSerializer, self)

    def post(self, request):
        serializer = CompInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        promotion = services.create_comp(
            staff=request.user,
            product_id=data["product_id"],
            package_id=data["package_id"],
            starts_on=data["starts_on"],
            note=data["note"],
        )
        return Response(StaffPromotionSerializer(promotion, context={"request": request}).data, status=status.HTTP_201_CREATED)


class StaffPromotionDetailView(APIView):
    """P8."""

    permission_classes = [AdsAdminPermission]

    def get(self, request, pk):
        promotion = services.promotions().filter(pk=pk).first()
        if promotion is None:
            raise ApiError(404, "promotion_not_found", "Promotion not found.")
        return Response(StaffPromotionSerializer(promotion, context={"request": request}).data)


class StaffApproveView(APIView):
    """P9."""

    permission_classes = [AdsAdminPermission]

    def post(self, request, pk):
        serializer = ApproveInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        promotion = services.approve(pk, staff=request.user, note=serializer.validated_data["note"])
        return Response(StaffPromotionSerializer(promotion, context={"request": request}).data)


class StaffRejectView(APIView):
    """P10."""

    permission_classes = [AdsAdminPermission]

    def post(self, request, pk):
        serializer = RejectInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        promotion = services.reject(pk, staff=request.user, reason=serializer.validated_data["reason"].strip())
        return Response(StaffPromotionSerializer(promotion, context={"request": request}).data)


class StaffStopView(APIView):
    """P11."""

    permission_classes = [AdsAdminPermission]

    def post(self, request, pk):
        serializer = StopInput(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        promotion = services.stop(pk, staff=request.user, refund=data["refund"], reason=data["reason"].strip())
        return Response(StaffPromotionSerializer(promotion, context={"request": request}).data)


class StaffRetryRefundView(APIView):
    """P12."""

    permission_classes = [AdsAdminPermission]

    def post(self, request, pk):
        promotion = services.retry_refund(pk)
        return Response(StaffPromotionSerializer(promotion, context={"request": request}).data)


class StaffPackageListCreateView(generics.ListCreateAPIView):
    """P14 - every package (inactive ones too) and create."""

    permission_classes = [AdsAdminPermission]
    serializer_class = PackageSerializer
    pagination_class = StandardPagination
    queryset = SponsoredPackage.objects.order_by("sort_order", "price", "name")


class StaffPackageDetailView(generics.UpdateAPIView):
    """P14 - edit or deactivate a package. No DELETE: promotions keep their snapshot and a PROTECT foreign key."""

    permission_classes = [AdsAdminPermission]
    serializer_class = PackageSerializer
    queryset = SponsoredPackage.objects.all()
    http_method_names = ["patch", "options"]


# ------------------------------------------------------------------------------ public


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def public_sponsored(request):
    """P15 - live sponsored product cards for a surface. Junk input yields an empty list, never an error."""
    params = request.query_params
    picked = services.select_for_surface(
        (params.get("surface") or "").strip(),
        q=params.get("q") or "",
        category=params.get("category") or "",
        product=params.get("product") or "",
        limit=params.get("limit"),
    )
    if not picked:
        return Response({"results": []})
    products = visible_products(
        Product.objects.select_related("category", "sub_category", "brand", "default_variant").prefetch_related(
            *list_row_prefetches()
        ),
        None,
    ).in_bulk([product_id for _, product_id in picked])
    cards = []
    for promotion_id, product_id in picked:
        product = products.get(product_id)
        if product is not None:
            card = dict(SearchProductSerializer(product, context={"request": request}).data)
            card["sponsored_id"] = str(promotion_id)
            cards.append(card)
    return Response({"results": cards})
