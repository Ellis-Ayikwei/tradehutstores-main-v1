from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReviewViewSet, ProductReviewImageViewSet

router = DefaultRouter(trailing_slash=True)
# Mounted under ``…/reviews/`` in ``backend/urls.py`` — use ``""`` so list/create is
# ``…/reviews/`` not ``…/reviews/reviews/`` (and not DRF api-root, which is GET-only → POST 405).
router.register(
    r"review-images", ProductReviewImageViewSet, basename="review-images"
)
router.register(r"", ReviewViewSet, basename="reviews")

urlpatterns = [
    path("", include(router.urls)),
]

