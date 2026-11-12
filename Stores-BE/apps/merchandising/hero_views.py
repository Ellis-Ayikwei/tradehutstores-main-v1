from django.db import transaction
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .hero_serializers import (
    HeroConfigAdminSerializer,
    HeroConfigPublicSerializer,
    HeroReorderSerializer,
    HeroSlideAdminSerializer,
    HeroSlidePublicSerializer,
)
from .models import HeroConfig, HeroSlide
from .permissions import MerchandisingAdminPermission


@api_view(["GET"])
@permission_classes([AllowAny])
def hero_public(request):
    """Storefront hero: config + live slides. `slides` is empty when nothing is configured."""
    config = HeroConfig.load()
    live = [s for s in HeroSlide.objects.filter(is_active=True) if s.is_live]
    context = {"request": request}
    return Response(
        {
            "config": HeroConfigPublicSerializer(config).data,
            "slides": HeroSlidePublicSerializer(live, many=True, context=context).data,
        }
    )


@api_view(["GET", "PATCH"])
@permission_classes([MerchandisingAdminPermission])
def hero_config_admin(request):
    config = HeroConfig.load()
    if request.method == "PATCH":
        serializer = HeroConfigAdminSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return Response(HeroConfigAdminSerializer(config).data)


class HeroSlideAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [MerchandisingAdminPermission]
    queryset = HeroSlide.objects.all()
    serializer_class = HeroSlideAdminSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        """Body: {"ids": [3, 1, 2]}. Positions are rewritten in that order."""
        serializer = HeroReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data["ids"]
        with transaction.atomic():
            for position, pk in enumerate(ids):
                HeroSlide.objects.filter(pk=pk).update(position=position)
        return Response(
            HeroSlideAdminSerializer(self.get_queryset(), many=True, context={"request": request}).data
        )
