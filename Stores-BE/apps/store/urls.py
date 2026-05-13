from django.urls import path

from .views import public_store_config_view, store_config_view


urlpatterns = [
    # Marketplace-wide configuration singleton (admin only — full read/write).
    path("config/", store_config_view, name="store-config"),
    # Anonymous-readable subset for the public storefront. Strips secrets.
    path("config/public/", public_store_config_view, name="store-config-public"),
]
