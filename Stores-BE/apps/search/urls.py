"""
apps.search.urls

URL routing for the search subsystem.

Mounted under the API prefix in ``backend/urls.py`` as::

    path("search/", include("apps.search.urls"))

Resulting endpoints (relative to /tradehut/api/v1/search/):

    GET  ./                      Full-text search + facets
    GET  ./autocomplete/         Dropdown autocomplete
    POST ./image/                Upload-image visual search
    GET  ./visual/               Text-to-visual search
    GET  ./products/<id>/similar/   PDP "similar products" widget
    GET  ./health/               Subsystem availability probe
    GET  ./admin/stats/          Admin-only diagnostics
"""

from django.urls import path

from . import views

app_name = "search"

urlpatterns = [
    path("", views.search, name="search"),
    path("autocomplete/", views.autocomplete, name="autocomplete"),
    path("image/", views.image_search, name="image-search"),
    path("visual/", views.visual_search, name="visual-search"),
    path(
        "products/<uuid:product_id>/similar/",
        views.similar_products,
        name="similar-products",
    ),
    path("health/", views.health, name="health"),
    path("admin/stats/", views.admin_stats, name="admin-stats"),
]
