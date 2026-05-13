"""
Staff (is_staff) and seller-scoped CRUD APIs for promo codes.

Two viewsets:
  PromoCodeAdminViewSet  — full CRUD over every promo (platform + seller)
  PromoCodeSellerViewSet — sellers see/manage only their own promos
"""

from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import JSONParser
from rest_framework.response import Response

from .models import PromoCode, PromoPolicy, PromoRedemption, ReferralCode
from .permissions import PromosAdminPermission, SellerPromoPermission
from .serializers import (
    PromoCodeAdminDetailSerializer,
    PromoCodeAdminListSerializer,
    PromoCodeAdminWriteSerializer,
    PromoCodeSellerWriteSerializer,
    PromoPolicySerializer,
    PromoRedemptionSerializer,
    ReferralCodeSerializer,
)


# ─── Policy (singleton) ──────────────────────────────────────────────────────


@api_view(["GET", "PATCH"])
@permission_classes([PromosAdminPermission])
def promo_policy_view(request):
    """GET / PATCH the marketplace-wide promo policy singleton.

      GET  /tradehut/api/v1/promos/admin/policy/
      PATCH /tradehut/api/v1/promos/admin/policy/  { ...fields... }
    """
    policy = PromoPolicy.get_active()
    if request.method == "PATCH":
        serializer = PromoPolicySerializer(policy, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    return Response(PromoPolicySerializer(policy).data)


# ─── Admin (platform) ────────────────────────────────────────────────────────


class PromoCodeAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [PromosAdminPermission]
    parser_classes = [JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self):
        qs = (
            PromoCode.objects.select_related("seller")
            .prefetch_related("products", "categories", "specific_users")
            .order_by("-created_at")
        )
        seller = self.request.query_params.get("seller")
        if seller:
            qs = qs.filter(seller_id=seller)
        platform_only = self.request.query_params.get("platform_only")
        if platform_only in ("1", "true", "True"):
            qs = qs.filter(seller__isnull=True)
        active = self.request.query_params.get("is_active")
        if active in ("1", "true", "True"):
            qs = qs.filter(is_active=True)
        elif active in ("0", "false", "False"):
            qs = qs.filter(is_active=False)
        search = self.request.query_params.get("q")
        if search:
            qs = qs.filter(code__icontains=search.upper()) | qs.filter(name__icontains=search)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return PromoCodeAdminListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PromoCodeAdminWriteSerializer
        return PromoCodeAdminDetailSerializer

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        promo = self.get_object()
        promo.is_active = not promo.is_active
        promo.save(update_fields=["is_active", "updated_at"])
        return Response(PromoCodeAdminListSerializer(promo).data)

    @action(detail=False, methods=["post"], url_path="bulk-generate")
    def bulk_generate(self, request):
        """Bulk-mint codes from a template. Body: { template_id, count, prefix }."""
        template_id = request.data.get("template_id")
        count = int(request.data.get("count", 10))
        prefix = request.data.get("prefix") or ""
        try:
            template = PromoCode.objects.get(pk=template_id)
        except PromoCode.DoesNotExist:
            return Response({"detail": "template not found"}, status=status.HTTP_404_NOT_FOUND)

        created = []
        for _ in range(min(count, 500)):
            code = PromoCode.generate_code(prefix=prefix or template.code[:4])
            obj = PromoCode.objects.create(
                code=code,
                name=f"{template.name} (bulk)",
                description=template.description,
                seller=template.seller,
                discount_type=template.discount_type,
                discount_value=template.discount_value,
                max_discount_amount=template.max_discount_amount,
                target_type=template.target_type,
                min_order_value=template.min_order_value,
                min_items_count=template.min_items_count,
                user_segment=template.user_segment,
                stackable=template.stackable,
                first_order_only=template.first_order_only,
                max_redemptions=1,
                max_redemptions_per_user=1,
                starts_at=template.starts_at,
                ends_at=template.ends_at,
                is_active=False,  # require explicit activation
            )
            created.append(obj)
        return Response(
            {
                "created": len(created),
                "codes": [c.code for c in created],
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        from django.db.models import Sum, Count
        from django.utils import timezone

        cutoff = timezone.now() - timezone.timedelta(days=30)
        all_qs = PromoCode.objects.all()
        active_qs = all_qs.filter(is_active=True)

        agg = PromoRedemption.objects.filter(created_at__gte=cutoff).aggregate(
            total=Sum("discount_amount"),
            count=Count("id"),
        )

        return Response(
            {
                "total_codes": all_qs.count(),
                "active_codes": active_qs.count(),
                "platform_codes": active_qs.filter(seller__isnull=True).count(),
                "seller_codes": active_qs.filter(seller__isnull=False).count(),
                "redemptions_30d": agg["count"] or 0,
                "discount_given_30d": float(agg["total"] or 0),
            }
        )


class PromoRedemptionAdminViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [PromosAdminPermission]
    serializer_class = PromoRedemptionSerializer

    def get_queryset(self):
        qs = PromoRedemption.objects.select_related("promo", "user").order_by("-created_at")
        promo_id = self.request.query_params.get("promo")
        if promo_id:
            qs = qs.filter(promo_id=promo_id)
        return qs


class ReferralCodeAdminViewSet(viewsets.ModelViewSet):
    permission_classes = [PromosAdminPermission]
    serializer_class = ReferralCodeSerializer
    queryset = ReferralCode.objects.select_related("user", "referral_promo").order_by("-created_at")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]


# ─── Seller-scoped ────────────────────────────────────────────────────────────


class PromoCodeSellerViewSet(viewsets.ModelViewSet):
    """Sellers see and manage *only* their own promo codes."""

    permission_classes = [SellerPromoPermission]
    parser_classes = [JSONParser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def _seller_profile(self):
        return self.request.user.seller_profile

    def get_queryset(self):
        seller = self._seller_profile()
        return (
            PromoCode.objects.filter(seller=seller)
            .prefetch_related("products", "categories")
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action == "list":
            return PromoCodeAdminListSerializer
        if self.action in ("create", "update", "partial_update"):
            return PromoCodeSellerWriteSerializer
        return PromoCodeAdminDetailSerializer

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_create(self, serializer):
        seller = self._seller_profile()
        serializer.save(seller=seller)

    @action(detail=True, methods=["post"], url_path="toggle")
    def toggle(self, request, pk=None):
        promo = self.get_object()
        promo.is_active = not promo.is_active
        promo.save(update_fields=["is_active", "updated_at"])
        return Response(PromoCodeAdminListSerializer(promo).data)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        from django.db.models import Sum, Count
        from django.utils import timezone

        seller = self._seller_profile()
        cutoff = timezone.now() - timezone.timedelta(days=30)
        all_qs = PromoCode.objects.filter(seller=seller)
        agg = PromoRedemption.objects.filter(
            promo__seller=seller, created_at__gte=cutoff
        ).aggregate(total=Sum("discount_amount"), count=Count("id"))
        return Response(
            {
                "total_codes": all_qs.count(),
                "active_codes": all_qs.filter(is_active=True).count(),
                "redemptions_30d": agg["count"] or 0,
                "discount_given_30d": float(agg["total"] or 0),
            }
        )
