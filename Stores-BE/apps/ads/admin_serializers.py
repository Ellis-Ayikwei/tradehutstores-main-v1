"""
Staff-facing serializers — full CRUD over Campaign / Creative / Placement / AdSlot.
"""

import re
from urllib.parse import urljoin

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import URLValidator
from rest_framework import serializers

from .models import (
    AdClick,
    AdImpression,
    AdPlacement,
    AdSlot,
    Campaign,
    Creative,
    TargetingRule,
)
from .services import campaign_stats, slot_stats

_SCHEME_RE = re.compile(r"^https?://", re.IGNORECASE)
_URL_ERR = "Enter a valid URL."


def _normalize_creative_url(value, *, max_length: int, field: str) -> str:
    """Coerce optional URL input to a valid absolute http(s) URL or empty string."""
    if value is None:
        return ""
    s = str(value).strip()
    if not s:
        return ""
    if s.startswith("//"):
        s = "https:" + s
    if s.startswith("/") and not s.startswith("//"):
        base = str(getattr(settings, "FRONTEND_URL", "") or "").strip().rstrip("/")
        if not base:
            raise serializers.ValidationError(
                {
                    field: [
                        f"{_URL_ERR} Relative paths (starting with /) need FRONTEND_URL set, or send a full https:// URL."
                    ]
                }
            )
        normalized = urljoin(base + "/", s)
    elif _SCHEME_RE.match(s):
        normalized = s
    else:
        normalized = f"https://{s}"

    if len(normalized) > max_length:
        raise serializers.ValidationError({field: [_URL_ERR]})
    validator = URLValidator()
    try:
        validator(normalized)
    except DjangoValidationError:
        raise serializers.ValidationError({field: [_URL_ERR]})
    return normalized


# ── Placement ─────────────────────────────────────────────────────────────────


class PlacementAdminSerializer(serializers.ModelSerializer):
    active_slot_count = serializers.SerializerMethodField()

    class Meta:
        model = AdPlacement
        fields = (
            "id",
            "slug",
            "name",
            "description",
            "format",
            "aspect_ratio",
            "max_active_slots",
            "rotation_seconds",
            "is_active",
            "active_slot_count",
            "created_at",
            "updated_at",
        )

    def get_active_slot_count(self, obj):
        return obj.slots.filter(is_active=True).count()


# ── Campaign ──────────────────────────────────────────────────────────────────


class CampaignAdminListSerializer(serializers.ModelSerializer):
    is_live = serializers.SerializerMethodField()
    creative_count = serializers.SerializerMethodField()
    seller_name = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = (
            "id",
            "name",
            "advertiser",
            "seller",
            "seller_name",
            "status",
            "priority",
            "starts_at",
            "ends_at",
            "daily_impression_cap",
            "total_impression_cap",
            "is_live",
            "creative_count",
            "created_at",
            "updated_at",
        )

    def get_is_live(self, obj):
        return obj.is_live

    def get_creative_count(self, obj):
        return obj.creatives.count()

    def get_seller_name(self, obj):
        return getattr(obj.seller, "business_name", None) or getattr(obj.seller, "name", None)


class CampaignAdminDetailSerializer(CampaignAdminListSerializer):
    stats = serializers.SerializerMethodField()
    notes = serializers.CharField(required=False, allow_blank=True)

    class Meta(CampaignAdminListSerializer.Meta):
        fields = CampaignAdminListSerializer.Meta.fields + ("notes", "stats")

    def get_stats(self, obj):
        return campaign_stats(obj, days=30)


class CampaignAdminWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = (
            "name",
            "advertiser",
            "seller",
            "status",
            "priority",
            "starts_at",
            "ends_at",
            "daily_impression_cap",
            "total_impression_cap",
            "notes",
        )


# ── Creative ──────────────────────────────────────────────────────────────────


class CreativeAdminSerializer(serializers.ModelSerializer):
    image_desktop_url = serializers.SerializerMethodField()
    image_mobile_url = serializers.SerializerMethodField()
    campaign_name = serializers.CharField(source="campaign.name", read_only=True)
    video_url = serializers.CharField(
        allow_blank=True,
        required=False,
        max_length=200,
        trim_whitespace=True,
    )
    cta_url = serializers.CharField(
        allow_blank=True,
        required=False,
        max_length=500,
        trim_whitespace=True,
    )

    class Meta:
        model = Creative
        fields = (
            "id",
            "campaign",
            "campaign_name",
            "name",
            "format",
            "image_desktop",
            "image_desktop_url",
            "image_mobile",
            "image_mobile_url",
            "video_url",
            "html_body",
            "headline",
            "subheadline",
            "eyebrow",
            "cta_label",
            "cta_url",
            "open_in_new_tab",
            "background_color",
            "text_color",
            "accent_color",
            "alt_text",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "image_desktop": {"required": False, "allow_null": True},
            "image_mobile": {"required": False, "allow_null": True},
        }

    def _abs(self, file):
        if not file:
            return None
        request = self.context.get("request")
        url = file.url if hasattr(file, "url") else str(file)
        return request.build_absolute_uri(url) if request else url

    def get_image_desktop_url(self, obj):
        return self._abs(obj.image_desktop)

    def get_image_mobile_url(self, obj):
        return self._abs(obj.image_mobile)

    def validate(self, attrs):
        if "video_url" in attrs:
            attrs["video_url"] = _normalize_creative_url(
                attrs.get("video_url"), max_length=200, field="video_url"
            )
        if "cta_url" in attrs:
            attrs["cta_url"] = _normalize_creative_url(
                attrs.get("cta_url"), max_length=500, field="cta_url"
            )
        return attrs


# ── Targeting + AdSlot ────────────────────────────────────────────────────────


class TargetingRuleAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = TargetingRule
        exclude = ("slot", "created_at", "updated_at")


class AdSlotAdminSerializer(serializers.ModelSerializer):
    targeting = TargetingRuleAdminSerializer(required=False, allow_null=True)
    creative_name = serializers.CharField(source="creative.name", read_only=True)
    placement_name = serializers.CharField(source="placement.name", read_only=True)
    placement_slug = serializers.CharField(source="placement.slug", read_only=True)
    is_live = serializers.SerializerMethodField()
    stats = serializers.SerializerMethodField()

    class Meta:
        model = AdSlot
        fields = (
            "id",
            "placement",
            "placement_name",
            "placement_slug",
            "creative",
            "creative_name",
            "is_active",
            "is_live",
            "weight",
            "position_hint",
            "starts_at",
            "ends_at",
            "dismissible",
            "show_close_after_seconds",
            "delay_seconds",
            "cap_per_session",
            "cap_per_day",
            "cap_per_week",
            "targeting",
            "stats",
            "created_at",
            "updated_at",
        )

    def get_is_live(self, obj):
        return obj.is_live

    def get_stats(self, obj):
        return slot_stats(obj, days=7)

    def create(self, validated_data):
        targeting = validated_data.pop("targeting", None)
        slot = AdSlot.objects.create(**validated_data)
        if targeting:
            cats = targeting.pop("categories", [])
            rule = TargetingRule.objects.create(slot=slot, **targeting)
            if cats:
                rule.categories.set(cats)
        return slot

    def update(self, instance, validated_data):
        targeting = validated_data.pop("targeting", serializers.empty)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if targeting is not serializers.empty:
            if targeting is None:
                TargetingRule.objects.filter(slot=instance).delete()
            else:
                cats = targeting.pop("categories", None)
                rule, _ = TargetingRule.objects.update_or_create(
                    slot=instance, defaults=dict(targeting)
                )
                if cats is not None:
                    rule.categories.set(cats)
        return instance


# ── Lightweight tracking writes ───────────────────────────────────────────────


class AdImpressionWriteSerializer(serializers.Serializer):
    slot = serializers.UUIDField()
    page_url = serializers.CharField(required=False, allow_blank=True, max_length=500)
    referrer = serializers.CharField(required=False, allow_blank=True, max_length=500)


class AdClickWriteSerializer(serializers.Serializer):
    slot = serializers.UUIDField()
    destination_url = serializers.CharField(required=False, allow_blank=True, max_length=500)
    page_url = serializers.CharField(required=False, allow_blank=True, max_length=500)
