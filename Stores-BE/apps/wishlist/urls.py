from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WishlistViewSet, WishlistItemViewSet, FavoriteViewSet

router = DefaultRouter(trailing_slash=True)
router.register(r"lists", WishlistViewSet, basename="wishlist")
router.register(r"items", WishlistItemViewSet, basename="wishlist-items")
router.register(r"favorites", FavoriteViewSet, basename="favorites")

urlpatterns = [
    path("", include(router.urls)),
]

