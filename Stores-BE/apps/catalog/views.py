from rest_framework import viewsets, permissions
from django.db.models import Q
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


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [PublicReadOnly]


class SubCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubCategorySerializer
    permission_classes = [PublicReadOnly]

    def get_queryset(self):
        qs = SubCategory.objects.select_related("category")
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

