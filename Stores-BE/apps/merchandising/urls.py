from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_views import HomepageSectionAdminViewSet, HomepageSectionItemAdminViewSet
from .hero_views import HeroSlideAdminViewSet, hero_config_admin, hero_public
from .views import homepage_section_detail, homepage_sections

router = DefaultRouter(trailing_slash=True)
router.register(r"homepage/admin/sections", HomepageSectionAdminViewSet, basename="merch-admin-section")
router.register(r"homepage/admin/hero/slides", HeroSlideAdminViewSet, basename="merch-admin-hero-slide")
router.register(
    r"homepage/admin/section-items",
    HomepageSectionItemAdminViewSet,
    basename="merch-admin-item",
)

urlpatterns = [
    path("homepage/hero/", hero_public, name="homepage-hero"),
    path("homepage/admin/hero/config/", hero_config_admin, name="merch-admin-hero-config"),
    path("homepage/sections/", homepage_sections, name="homepage-sections"),
    path("homepage/sections/<slug:slug>/", homepage_section_detail, name="homepage-section-detail"),
] + router.urls
