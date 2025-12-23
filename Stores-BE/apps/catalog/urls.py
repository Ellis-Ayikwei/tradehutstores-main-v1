from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    SubCategoryViewSet,
    BrandViewSet,
    AttributeViewSet,
    AttributeValueViewSet,
)

router = DefaultRouter(trailing_slash=True)
router.register(r"categories", CategoryViewSet, basename="categories")
router.register(r"subcategories", SubCategoryViewSet, basename="subcategories")
router.register(r"brands", BrandViewSet, basename="brands")
router.register(r"attributes", AttributeViewSet, basename="attributes")
router.register(r"attribute-values", AttributeValueViewSet, basename="attribute-values")

urlpatterns = [
    path("", include(router.urls)),
]

