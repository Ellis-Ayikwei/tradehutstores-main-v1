"""
Staff ad-management API. JWT-authenticated, is_staff required.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .admin_serializers import (
    AdSlotAdminSerializer,
    CampaignAdminDetailSerializer,
    CampaignAdminListSerializer,
    CampaignAdminWriteSerializer,
    CreativeAdminSerializer,
    PlacementAdminSerializer,
)
from .models import AdPlacement, AdSlot, Campaign, Creative
from .permissions import AdsAdminPermission
from .services import campaign_stats, slot_stats


class PlacementAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [AdsAdminPermission]
    queryset = AdPlacement.objects.all().order_by("slug")
    serializer_class = PlacementAdminSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]


class CampaignAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [AdsAdminPermission]
    queryset = Campaign.objects.all().order_by("-created_at")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action == "list":
            return CampaignAdminListSerializer
        if self.action in ("create", "update", "partial_update"):
            return CampaignAdminWriteSerializer
        return CampaignAdminDetailSerializer

    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, pk=None):
        campaign = self.get_object()
        days = int(request.query_params.get("days", 30))
        return Response(campaign_stats(campaign, days=days))


class CreativeAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [AdsAdminPermission]
    queryset = Creative.objects.select_related("campaign").order_by("-created_at")
    serializer_class = CreativeAdminSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        campaign_id = self.request.query_params.get("campaign")
        if campaign_id:
            qs = qs.filter(campaign_id=campaign_id)
        return qs


class AdSlotAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [AdsAdminPermission]
    serializer_class = AdSlotAdminSerializer
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = (
            AdSlot.objects.select_related("placement", "creative", "creative__campaign", "targeting")
            .prefetch_related("targeting__categories")
            .order_by("placement__slug", "position_hint", "-weight")
        )
        placement = self.request.query_params.get("placement")
        if placement:
            qs = qs.filter(placement_id=placement)
        creative = self.request.query_params.get("creative")
        if creative:
            qs = qs.filter(creative_id=creative)
        campaign = self.request.query_params.get("campaign")
        if campaign:
            qs = qs.filter(creative__campaign_id=campaign)
        return qs

    @action(detail=True, methods=["get"], url_path="stats")
    def stats(self, request, pk=None):
        slot = self.get_object()
        days = int(request.query_params.get("days", 7))
        return Response(slot_stats(slot, days=days))

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        slot = self.get_object()
        slot.is_active = not slot.is_active
        slot.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(slot).data)
