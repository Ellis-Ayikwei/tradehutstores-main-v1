from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FeatureFlagViewSet, feature_flags_view, public_store_config_view, store_config_view

router = DefaultRouter()
router.register(r"feature-flags", FeatureFlagViewSet, basename="feature-flag")

urlpatterns = [
    # Marketplace-wide configuration singleton (admin only — full read/write).
    path("config/", store_config_view, name="store-config"),
    # Anonymous-readable subset for the public storefront. Strips secrets.
    path("config/public/", public_store_config_view, name="store-config-public"),
    # Feature flags evaluated for the caller (anonymous OK).
    path("flags/", feature_flags_view, name="store-flags"),
    # Staff CRUD for flags.
    path("", include(router.urls)),
]
