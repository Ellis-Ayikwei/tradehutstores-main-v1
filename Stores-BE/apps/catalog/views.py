import uuid

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from django.db.models import Q, Count, Prefetch
from . import services
from .models import (
    Attribute,
    AttributeValue,
    AttributeValueRequest,
    Brand,
    Category,
    SubCategory,
)
from .permissions import CatalogAdminPermission, IsEligibleSeller
from .serializers import (
    AttributeValueRequestAdminSerializer,
    AttributeValueRequestApproveSerializer,
    AttributeValueRequestCreateSerializer,
    AttributeValueRequestRejectSerializer,
    AttributeValueRequestSerializer,
    CategorySerializer,
    SubCategorySerializer,
    BrandSerializer,
    AttributeSerializer,
    AttributeValueSerializer,
)


class PublicReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return True


def _parse_include_subcategories(request) -> bool:
    """True when ``?include=subcategories`` or ``?include=foo,subcategories``."""
    raw = (request.query_params.get("include") or "").strip()
    if not raw:
        return False
    parts = {p.strip().lower() for p in raw.split(",") if p.strip()}
    return "subcategories" in parts


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [PublicReadOnly]

    def get_queryset(self):
        qs = Category.objects.all()
        if _parse_include_subcategories(self.request):
            sub_qs = SubCategory.objects.select_related("category").annotate(
                active_product_count=Count(
                    "product", filter=Q(product__status="Active")
                ),
            )
            qs = qs.prefetch_related(
                Prefetch("subcategory_set", queryset=sub_qs.order_by("sub_category_name"))
            )
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["include_subcategories"] = _parse_include_subcategories(self.request)
        return ctx


class SubCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubCategorySerializer
    permission_classes = [PublicReadOnly]

    def get_queryset(self):
        qs = SubCategory.objects.select_related("category").annotate(
            active_product_count=Count("product", filter=Q(product__status="Active")),
        )
        category_id = self.request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs


class BrandViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BrandSerializer
    permission_classes = [PublicReadOnly]

    def get_queryset(self):
        qs = Brand.objects.select_related("category")
        category_id = self.request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs


class AttributeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Attribute.objects.all()
    serializer_class = AttributeSerializer
    permission_classes = [PublicReadOnly]


class AttributeValueViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AttributeValueSerializer
    permission_classes = [PublicReadOnly]

    def get_queryset(self):
        qs = AttributeValue.objects.select_related("attribute")
        attr_name = self.request.query_params.get("attribute_name")
        attr_param = self.request.query_params.get("attribute")
        if attr_name:
            qs = qs.filter(attribute__name__iexact=attr_name)
        if attr_param:
            qs = qs.filter(Q(attribute__name__iexact=attr_param) | Q(attribute_id=attr_param))
        return qs



# ---------------------------------------------------------------- value requests

class ValueRequestPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _requests_qs():
    return AttributeValueRequest.objects.select_related(
        "attribute", "created_value", "requested_by", "seller"
    )


def _filter_by_status(qs, request):
    raw = (request.query_params.get("status") or "").strip()
    statuses = [s.strip() for s in raw.split(",") if s.strip()]
    return qs.filter(status__in=statuses) if statuses else qs


class AttributeValueRequestViewSet(viewsets.GenericViewSet):
    """Seller: ask staff for a new attribute value, and list my own requests."""

    permission_classes = [IsEligibleSeller]
    serializer_class = AttributeValueRequestSerializer
    pagination_class = ValueRequestPagination

    def get_queryset(self):
        return _requests_qs().filter(requested_by=self.request.user)

    def create(self, request):
        profile = services.ensure_seller_eligible(request.user)
        serializer = AttributeValueRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        obj = services.create_request(
            request.user,
            profile,
            data["attribute"],
            data["value_name"],
            color_code=data.get("color_code", ""),
            note=data.get("note", ""),
        )
        return Response(
            AttributeValueRequestSerializer(obj).data, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        qs = _filter_by_status(self.get_queryset(), request).order_by("-created_on")
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(self.get_serializer(page, many=True).data)


class AttributeValueRequestAdminViewSet(viewsets.GenericViewSet):
    """Staff: review seller requests for new attribute values."""

    permission_classes = [CatalogAdminPermission]
    serializer_class = AttributeValueRequestAdminSerializer
    pagination_class = ValueRequestPagination
    lookup_value_regex = "[0-9a-fA-F-]{36}"
    queryset = AttributeValueRequest.objects.none()

    def get_queryset(self):
        return _requests_qs()

    def list(self, request):
        qs = _filter_by_status(self.get_queryset(), request)
        params = request.query_params
        attribute = (params.get("attribute") or "").strip()
        if attribute:
            try:
                qs = qs.filter(attribute_id=uuid.UUID(attribute))
            except ValueError:
                qs = qs.none()
        q = (params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(value_name__icontains=q)
                | Q(attribute__name__icontains=q)
                | Q(requested_by__email__icontains=q)
                | Q(seller__business_name__icontains=q)
            )
        page = self.paginate_queryset(qs.order_by("-created_on"))
        return self.get_paginated_response(self.get_serializer(page, many=True).data)

    def _respond(self, obj):
        obj = self.get_queryset().get(pk=obj.pk)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None):
        serializer = AttributeValueRequestApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        obj = services.approve_request(
            pk,
            request.user,
            value_name=data.get("value_name"),
            color_code=data.get("color_code"),
        )
        return self._respond(obj)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        serializer = AttributeValueRequestRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        obj = services.reject_request(pk, request.user, serializer.validated_data["review_note"])
        return self._respond(obj)
