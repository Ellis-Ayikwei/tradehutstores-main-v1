from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ProductViewSet,
    ProductVariantViewSet,
    ProductImageViewSet,
    InventoryViewSet,
    ProductDiscountViewSet,
    ProductKeyFeatureViewSet,
)

router = DefaultRouter(trailing_slash=True)
# `ProductViewSet` uses prefix "". Its detail route `^<pk>/` would swallow
# "variants", "images", etc. if registered first — register specific prefixes first.
router.register(r"variants", ProductVariantViewSet, basename="product-variants")
router.register(r"images", ProductImageViewSet, basename="product-images")
router.register(r"inventory", InventoryViewSet, basename="inventory")
router.register(r"discounts", ProductDiscountViewSet, basename="product-discounts")
router.register(
    r"key-features", ProductKeyFeatureViewSet, basename="product-key-features"
)
router.register(r"", ProductViewSet, basename="products")

urlpatterns = [
    path("", include(router.urls)),
]
