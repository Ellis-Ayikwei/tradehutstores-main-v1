from django.db import transaction
from rest_framework import status, viewsets
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
    """Storefront hero: the current hero's config + its live slides. `slides` is empty when nothing is configured."""
    hero = HeroConfig.current()
    live = [s for s in hero.slides.filter(is_active=True) if s.is_live] if hero else []
    context = {"request": request}
    return Response(
        {
            # With no hero saved yet the storefront still gets the default arrangement.
            "config": HeroConfigPublicSerializer(hero or HeroConfig()).data,
            "slides": HeroSlidePublicSerializer(live, many=True, context=context).data,
        }
    )


class HeroConfigAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [MerchandisingAdminPermission]
    queryset = HeroConfig.objects.all()
    serializer_class = HeroConfigAdminSerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def perform_create(self, serializer):
        # The first hero goes live straight away; later ones wait for the activate action.
        with transaction.atomic():
            serializer.save(is_active=not HeroConfig.objects.filter(is_active=True).exists())

    def destroy(self, request, *args, **kwargs):
        hero = self.get_object()
        if hero.is_active:
            return Response(
                {"detail": "This hero is live. Make another hero live before deleting it."},
                status=status.HTTP_409_CONFLICT,
            )
        hero.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request, pk=None):
        """Make this hero the live one. Safe to repeat."""
        target = self.get_object()
        with transaction.atomic():
            # Lock every hero so two staff activating different heroes run one after the other.
            list(HeroConfig.objects.select_for_update().order_by("id"))
            # Clear the old one first: the database allows only one active row at a time.
            HeroConfig.objects.filter(is_active=True).exclude(pk=target.pk).update(is_active=False)
            HeroConfig.objects.filter(pk=target.pk).update(is_active=True)
        target.refresh_from_db()
        return Response(HeroConfigAdminSerializer(target).data)


class HeroSlideAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [MerchandisingAdminPermission]
    queryset = HeroSlide.objects.all()
    serializer_class = HeroSlideAdminSerializer
    pagination_class = None
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        hero = self.request.query_params.get("hero")
        if self.action == "list" and hero:
            # A non-numeric id matches nothing instead of raising inside the ORM.
            qs = qs.filter(hero_id=hero) if hero.isdigit() else qs.none()
        return qs

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        """Body: {"hero": 2, "ids": [3, 1, 2]}. That hero's positions are rewritten in that order."""
        serializer = HeroReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        hero = serializer.validated_data["hero"]
        with transaction.atomic():
            for position, pk in enumerate(serializer.validated_data["ids"]):
                HeroSlide.objects.filter(pk=pk, hero=hero).update(position=position)
        return Response(HeroSlideAdminSerializer(hero.slides.all(), many=True, context={"request": request}).data)
