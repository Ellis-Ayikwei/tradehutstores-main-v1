"""
fx/urls.py

Include in root urls.py:
    path("api/", include("fx.urls")),
"""

from django.urls import path
from .views import fx_rates

urlpatterns = [
    path("fx/rates/", fx_rates, name="fx-rates"),
]
