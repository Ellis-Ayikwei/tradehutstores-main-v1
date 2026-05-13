"""
URL conf for the promo system.

Public:
  POST   promos/validate/          validate a code against a cart
  GET    promos/auto/              auto-apply check (cart-update side effect)
  GET    promos/applicable/        cart-sidebar list of usable promos

Admin (is_staff):
  CRUD   promos/admin/codes/                   PromoCode CRUD across the platform
  POST   promos/admin/codes/<pk>/toggle/       pause/resume one code
  POST   promos/admin/codes/bulk-generate/     mint N codes from a template
  GET    promos/admin/codes/stats/             dashboard counts
  GET    promos/admin/redemptions/             read-only redemption log
  CRUD   promos/admin/referrals/               manage referral codes

Seller:
  CRUD   promos/seller/codes/                  CRUD over THIS seller's promos only
  POST   promos/seller/codes/<pk>/toggle/      pause/resume
  GET    promos/seller/codes/stats/            seller's own dashboard counts
"""

from django.urls import path
from rest_framework.routers import DefaultRouter

from .admin_views import (
    PromoCodeAdminViewSet,
    PromoCodeSellerViewSet,
    PromoRedemptionAdminViewSet,
    ReferralCodeAdminViewSet,
    promo_policy_view,
)
from .views import (
    applicable_promos_view,
    auto_apply_promo_view,
    storefront_seller_promos_view,
    validate_promo_view,
)


router = DefaultRouter(trailing_slash=True)
router.register(
    r"promos/admin/codes",
    PromoCodeAdminViewSet,
    basename="promos-admin-code",
)
router.register(
    r"promos/admin/redemptions",
    PromoRedemptionAdminViewSet,
    basename="promos-admin-redemption",
)
router.register(
    r"promos/admin/referrals",
    ReferralCodeAdminViewSet,
    basename="promos-admin-referral",
)
router.register(
    r"promos/seller/codes",
    PromoCodeSellerViewSet,
    basename="promos-seller-code",
)


urlpatterns = [
    # Public
    path("promos/validate/", validate_promo_view, name="promo-validate"),
    path("promos/auto/", auto_apply_promo_view, name="promo-auto-apply"),
    path("promos/applicable/", applicable_promos_view, name="promo-applicable"),
    path(
        "promos/store/<uuid:seller_id>/",
        storefront_seller_promos_view,
        name="promo-store-seller",
    ),
    # Admin policy singleton
    path("promos/admin/policy/", promo_policy_view, name="promo-admin-policy"),
] + router.urls
