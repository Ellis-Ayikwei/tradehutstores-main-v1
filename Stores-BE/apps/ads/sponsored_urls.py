"""Mounted at ``ads/sponsored/`` by ``apps/ads/urls.py``."""

from django.urls import path

from . import sponsored_views as views

urlpatterns = [
    path("", views.public_sponsored, name="sponsored-public"),
    path("packages/", views.SellerPackageListView.as_view(), name="sponsored-packages"),
    path("seller/", views.SellerPromotionListCreateView.as_view(), name="sponsored-seller-list"),
    path("seller/<uuid:pk>/", views.SellerPromotionDetailView.as_view(), name="sponsored-seller-detail"),
    path("seller/<uuid:pk>/verify/", views.SellerPromotionVerifyView.as_view(), name="sponsored-seller-verify"),
    path("seller/<uuid:pk>/cancel/", views.SellerPromotionCancelView.as_view(), name="sponsored-seller-cancel"),
    path("staff/", views.StaffPromotionListCreateView.as_view(), name="sponsored-staff-list"),
    path("staff/packages/", views.StaffPackageListCreateView.as_view(), name="sponsored-staff-packages"),
    path("staff/packages/<uuid:pk>/", views.StaffPackageDetailView.as_view(), name="sponsored-staff-package"),
    path("staff/<uuid:pk>/", views.StaffPromotionDetailView.as_view(), name="sponsored-staff-detail"),
    path("staff/<uuid:pk>/approve/", views.StaffApproveView.as_view(), name="sponsored-staff-approve"),
    path("staff/<uuid:pk>/reject/", views.StaffRejectView.as_view(), name="sponsored-staff-reject"),
    path("staff/<uuid:pk>/stop/", views.StaffStopView.as_view(), name="sponsored-staff-stop"),
    path("staff/<uuid:pk>/retry-refund/", views.StaffRetryRefundView.as_view(), name="sponsored-staff-retry-refund"),
]
