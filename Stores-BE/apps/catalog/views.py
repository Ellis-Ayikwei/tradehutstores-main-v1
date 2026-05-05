from rest_framework import viewsets, permissions
from django.db.models import Q, Count, Prefetch
from .models import Category, SubCategory, Brand, Attribute, AttributeValue
from .serializers import (
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

