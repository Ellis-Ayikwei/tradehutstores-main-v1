from rest_framework import viewsets
from django.db.models import Prefetch

from .admin_serializers import (
    HomepageSectionAdminDetailSerializer,
    HomepageSectionAdminListSerializer,
    HomepageSectionAdminWriteSerializer,
    HomepageSectionItemReadSerializer,
    HomepageSectionItemWriteSerializer,
)
from .models import HomepageSection, HomepageSectionItem
from .permissions import MerchandisingAdminPermission


class HomepageSectionAdminViewSet(viewsets.ModelViewSet):
    """
    Staff API: CRUD homepage merchandising sections (+ nested rule via write serializer).
    """

    permission_classes = [MerchandisingAdminPermission]
    queryset = HomepageSection.objects.all()
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        items_qs = HomepageSectionItem.objects.select_related("product").order_by("position", "id")
        return (
            HomepageSection.objects.prefetch_related(Prefetch("items", queryset=items_qs), "rule")
            .order_by("position", "id")
        )

    def get_serializer_class(self):
        if self.action == "list":
            return HomepageSectionAdminListSerializer
        if self.action in ("create", "partial_update", "update"):
            return HomepageSectionAdminWriteSerializer
        return HomepageSectionAdminDetailSerializer


class HomepageSectionItemAdminViewSet(viewsets.ModelViewSet):
    """Staff API: add/remove/reorder manual (or mixed-strategy) section products."""

    permission_classes = [MerchandisingAdminPermission]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = HomepageSectionItem.objects.select_related("section", "product").order_by(
            "section__position", "position", "id"
        )
        section_id = self.request.query_params.get("section")
        if section_id:
            qs = qs.filter(section_id=section_id)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "partial_update", "update"):
            return HomepageSectionItemWriteSerializer
        return HomepageSectionItemReadSerializer
