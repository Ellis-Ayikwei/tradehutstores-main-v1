from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .admin_views import (
    AttributeAdminViewSet,
    AttributeValueAdminViewSet,
    BrandAdminViewSet,
    CategoryAdminViewSet,
    SubCategoryAdminViewSet,
)
from .views import (
    AttributeViewSet,
    AttributeValueViewSet,
    BrandViewSet,
    CategoryViewSet,
    SubCategoryViewSet,
)

router = DefaultRouter(trailing_slash=True)
# Public (storefront)
router.register(r"categories", CategoryViewSet, basename="categories")
router.register(r"subcategories", SubCategoryViewSet, basename="subcategories")
router.register(r"brands", BrandViewSet, basename="brands")
router.register(r"attributes", AttributeViewSet, basename="attributes")
router.register(r"attribute-values", AttributeValueViewSet, basename="attribute-values")
# Staff admin (Stores-Admin)
router.register(
    r"admin/categories", CategoryAdminViewSet, basename="catalog-admin-categories"
)
router.register(
    r"admin/subcategories",
    SubCategoryAdminViewSet,
    basename="catalog-admin-subcategories",
)
router.register(
    r"admin/attributes", AttributeAdminViewSet, basename="catalog-admin-attributes"
)
router.register(
    r"admin/attribute-values",
    AttributeValueAdminViewSet,
    basename="catalog-admin-attribute-values",
)
router.register(r"admin/brands", BrandAdminViewSet, basename="catalog-admin-brands")

urlpatterns = [
    path("", include(router.urls)),
]
