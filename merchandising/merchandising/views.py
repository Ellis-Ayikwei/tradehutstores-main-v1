"""
merchandising/views.py

GET /api/homepage/sections/       — all live sections with resolved products
GET /api/homepage/sections/<slug>/ — single section
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .models import HomepageSection
from .services import get_homepage_sections, resolve_section_products
from .serializers import HomepageSectionSerializer


@api_view(["GET"])
def homepage_sections(request):
    """
    Returns all live sections with their resolved products.
    Frontend calls this once on page load.
    """
    sections  = get_homepage_sections()
    data      = []

    for section in sections:
        products = resolve_section_products(section)
        data.append(HomepageSectionSerializer(section, context={
            "request":  request,
            "products": products,
        }).data)

    return Response(data)


@api_view(["GET"])
def homepage_section_detail(request, slug: str):
    """Single section by slug — useful for lazy-loading individual sections."""
    try:
        section = HomepageSection.objects.get(slug=slug, is_active=True)
    except HomepageSection.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not section.is_live:
        return Response(status=status.HTTP_404_NOT_FOUND)

    products = resolve_section_products(section)
    return Response(HomepageSectionSerializer(section, context={
        "request":  request,
        "products": products,
    }).data)
