"""
Public-facing serializers used by the storefront placement endpoint.
Trimmed: no internal IDs, schedule windows, weights, etc.
"""

from rest_framework import serializers

from .models import AdPlacement, AdSlot, Creative


class CreativePublicSerializer(serializers.ModelSerializer):
    image_desktop = serializers.SerializerMethodField()
    image_mobile = serializers.SerializerMethodField()

    class Meta:
        model = Creative
        fields = (
            "id",
            "format",
            "image_desktop",
            "image_mobile",
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
        )

    def _abs(self, file):
        if not file:
            return None
        request = self.context.get("request")
        url = file.url if hasattr(file, "url") else str(file)
        return request.build_absolute_uri(url) if request else url

    def get_image_desktop(self, obj):
        return self._abs(obj.image_desktop)

    def get_image_mobile(self, obj):
        return self._abs(obj.image_mobile or obj.image_desktop)


class SlotPublicSerializer(serializers.ModelSerializer):
    creative = CreativePublicSerializer(read_only=True)

    class Meta:
        model = AdSlot
        fields = (
            "id",
            "creative",
            "position_hint",
            "dismissible",
            "show_close_after_seconds",
            "delay_seconds",
        )


class PlacementPublicSerializer(serializers.ModelSerializer):
    slots = serializers.SerializerMethodField()

    class Meta:
        model = AdPlacement
        fields = (
            "slug",
            "name",
            "format",
            "aspect_ratio",
            "max_active_slots",
            "rotation_seconds",
            "slots",
        )

    def get_slots(self, obj):
        slots = self.context.get("slots") or []
        return SlotPublicSerializer(slots, many=True, context=self.context).data
