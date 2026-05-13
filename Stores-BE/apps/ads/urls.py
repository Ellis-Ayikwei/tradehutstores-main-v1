from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_views import (
    AdSlotAdminViewSet,
    CampaignAdminViewSet,
    CreativeAdminViewSet,
    PlacementAdminViewSet,
)
from .views import beacon_click, beacon_impression, serve_placement

router = DefaultRouter(trailing_slash=True)
router.register(r"ads/admin/placements", PlacementAdminViewSet, basename="ads-admin-placement")
router.register(r"ads/admin/campaigns", CampaignAdminViewSet, basename="ads-admin-campaign")
router.register(r"ads/admin/creatives", CreativeAdminViewSet, basename="ads-admin-creative")
router.register(r"ads/admin/slots", AdSlotAdminViewSet, basename="ads-admin-slot")

urlpatterns = [
    # Public — storefront
    path("ads/placement/<slug:slug>/", serve_placement, name="ads-serve-placement"),
    path("ads/beacon/impression/", beacon_impression, name="ads-beacon-impression"),
    path("ads/beacon/click/", beacon_click, name="ads-beacon-click"),
] + router.urls
