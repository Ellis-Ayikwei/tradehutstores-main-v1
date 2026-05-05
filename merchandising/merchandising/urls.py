"""
merchandising/urls.py — mount under /api/ in root urls.py
"""
from django.urls import path
from .views import homepage_sections, homepage_section_detail

urlpatterns = [
    path("homepage/sections/",         homepage_sections,       name="homepage-sections"),
    path("homepage/sections/<slug:slug>/", homepage_section_detail, name="homepage-section-detail"),
]
