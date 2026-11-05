from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .address_views import AddressViewSet

router = DefaultRouter(trailing_slash=True)
router.register(r"", AddressViewSet, basename="addresses")

urlpatterns = [
    path("", include(router.urls)),
]
