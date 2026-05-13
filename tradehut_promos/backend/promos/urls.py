"""
promos/urls.py — mount under /api/ in root urls.py
"""
from django.urls import path
from .views import validate_promo_view, auto_apply_promo_view

urlpatterns = [
    path("promos/validate/", validate_promo_view,    name="promo-validate"),
    path("promos/auto/",     auto_apply_promo_view,  name="promo-auto-apply"),
]
