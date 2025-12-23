from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReviewViewSet, ProductReviewImageViewSet

router = DefaultRouter(trailing_slash=True)
router.register(r"reviews", ReviewViewSet, basename="reviews")
router.register(r"review-images", ProductReviewImageViewSet, basename="review-images")

urlpatterns = [
    path("", include(router.urls)),
]

