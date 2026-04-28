"""
products/search_urls.py

Include in your root urls.py:
    path("api/", include("products.search_urls")),
"""

from django.urls import path
from .search_views import (
    search,
    autocomplete,
    image_search,
    text_to_image_search,
    similar_products,
)

urlpatterns = [
    # Text search
    path("search/",                        search,               name="search"),
    path("search/autocomplete/",           autocomplete,         name="search-autocomplete"),

    # Visual / image search
    path("search/image/",                  image_search,         name="image-search"),
    path("search/visual/",                 text_to_image_search, name="visual-search"),

    # Similar products (PDP widget)
    path("products/<int:product_id>/similar/", similar_products, name="similar-products"),
]
