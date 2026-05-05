from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import HomepageSection
from .serializers import HomepageSectionSerializer
from .services import get_homepage_sections, resolve_section_products


@api_view(["GET"])
@permission_classes([AllowAny])
def homepage_sections(request):
    sections = get_homepage_sections()
    data = []
    for section in sections:
        products = resolve_section_products(section)
        data.append(
            HomepageSectionSerializer(
                section,
                context={"request": request, "products": products},
            ).data
        )
    return Response(data)


@api_view(["GET"])
@permission_classes([AllowAny])
def homepage_section_detail(request, slug: str):
    try:
        section = HomepageSection.objects.get(slug=slug, is_active=True)
    except HomepageSection.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not section.is_live:
        return Response(status=status.HTTP_404_NOT_FOUND)

    products = resolve_section_products(section)
    return Response(
        HomepageSectionSerializer(
            section,
            context={"request": request, "products": products},
        ).data
    )
