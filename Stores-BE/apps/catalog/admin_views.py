"""
Staff-only catalog CRUD for Stores-Admin. Public storefront keeps read-only
endpoints on CategoryViewSet et al.
"""

from rest_framework import viewsets
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from .admin_serializers import (
    AttributeAdminSerializer,
    AttributeValueAdminSerializer,
    BrandAdminSerializer,
    CategoryAdminSerializer,
    SubCategoryAdminSerializer,
)
from .models import Attribute, AttributeValue, Brand, Category, SubCategory
from .permissions import CatalogAdminPermission


class CategoryAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [CatalogAdminPermission]
    serializer_class = CategoryAdminSerializer
    queryset = Category.objects.all().order_by("name")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]


class SubCategoryAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [CatalogAdminPermission]
    serializer_class = SubCategoryAdminSerializer
    queryset = SubCategory.objects.select_related("category").order_by(
        "category__name", "sub_category_name"
    )
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        category_id = self.request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs


class AttributeAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [CatalogAdminPermission]
    serializer_class = AttributeAdminSerializer
    queryset = Attribute.objects.all().order_by("name")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]


class AttributeValueAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [CatalogAdminPermission]
    serializer_class = AttributeValueAdminSerializer
    queryset = AttributeValue.objects.select_related("attribute").order_by(
        "attribute__name", "value_name"
    )
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        attribute_id = self.request.query_params.get("attribute")
        if attribute_id:
            qs = qs.filter(attribute_id=attribute_id)
        return qs


class BrandAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [CatalogAdminPermission]
    serializer_class = BrandAdminSerializer
    queryset = Brand.objects.select_related("category").order_by("name")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        category_id = self.request.query_params.get("category")
        if category_id:
            qs = qs.filter(category_id=category_id)
        return qs
