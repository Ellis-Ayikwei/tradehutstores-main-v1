from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_views import HomepageSectionAdminViewSet, HomepageSectionItemAdminViewSet
from .views import homepage_section_detail, homepage_sections

router = DefaultRouter(trailing_slash=True)
router.register(r"homepage/admin/sections", HomepageSectionAdminViewSet, basename="merch-admin-section")
router.register(
    r"homepage/admin/section-items",
    HomepageSectionItemAdminViewSet,
    basename="merch-admin-item",
)

urlpatterns = [
    path("homepage/sections/", homepage_sections, name="homepage-sections"),
    path("homepage/sections/<slug:slug>/", homepage_section_detail, name="homepage-section-detail"),
] + router.urls
