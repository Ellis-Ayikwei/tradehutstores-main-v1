from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import HeroConfig, HeroSlide


MAX_HERO_IMAGE_BYTES = 5 * 1024 * 1024


def _abs(serializer, file):
    if not file:
        return None
    request = serializer.context.get("request")
    url = file.url if hasattr(file, "url") else str(file)
    return request.build_absolute_uri(url) if request else url


class _ModelCleanMixin:
    """DRF skips Model.clean(); run it against the merged instance state."""

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = self.instance or self.Meta.model()
        for key, value in attrs.items():
            setattr(instance, key, value)
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)
        return attrs


# ── Public ───────────────────────────────────────────────────────────────────


class HeroSlidePublicSerializer(serializers.ModelSerializer):
    image_desktop = serializers.SerializerMethodField()
    image_mobile = serializers.SerializerMethodField()

    class Meta:
        model = HeroSlide
        fields = (
            "id",
            "placement",
            "image_desktop",
            "image_mobile",
            "alt_text",
            "eyebrow",
            "title",
            "subtitle",
            "cta_label",
            "link_url",
            "open_in_new_tab",
            "text_color",
            "text_align",
            "overlay_strength",
            "background_style",
            "background_color",
            "gradient_from",
            "gradient_to",
            "gradient_angle",
        )

    def get_image_desktop(self, obj):
        return _abs(self, obj.image_desktop)

    def get_image_mobile(self, obj):
        return _abs(self, obj.image_mobile or obj.image_desktop)


class HeroConfigPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = HeroConfig
        fields = (
            "layout",
            "autoplay",
            "interval_seconds",
            "transition",
            "show_arrows",
            "show_dots",
            "height_desktop",
            "rounded",
            "background_style",
            "background_color",
            "gradient_from",
            "gradient_to",
            "gradient_angle",
        )


# ── Admin ────────────────────────────────────────────────────────────────────


class HeroConfigAdminSerializer(_ModelCleanMixin, serializers.ModelSerializer):
    class Meta:
        model = HeroConfig
        fields = ("id", "name", "is_active") + HeroConfigPublicSerializer.Meta.fields + ("updated_at",)
        # is_active moves only through the activate action, never through a plain save.
        read_only_fields = ("id", "is_active", "updated_at")

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Give this hero a name.")
        return value


class HeroSlideAdminSerializer(_ModelCleanMixin, serializers.ModelSerializer):
    image_desktop_url = serializers.SerializerMethodField()
    image_mobile_url = serializers.SerializerMethodField()
    is_live = serializers.BooleanField(read_only=True)

    class Meta:
        model = HeroSlide
        fields = (
            "id",
            "hero",
            "name",
            "placement",
            "position",
            "is_active",
            "is_live",
            "starts_at",
            "ends_at",
            "image_desktop",
            "image_desktop_url",
            "image_mobile",
            "image_mobile_url",
            "alt_text",
            "eyebrow",
            "title",
            "subtitle",
            "cta_label",
            "link_url",
            "open_in_new_tab",
            "text_color",
            "text_align",
            "overlay_strength",
            "background_style",
            "background_color",
            "gradient_from",
            "gradient_to",
            "gradient_angle",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {
            "hero": {"required": True, "allow_null": False},
            "image_desktop": {"required": False, "allow_null": True, "write_only": True},
            "image_mobile": {"required": False, "allow_null": True, "write_only": True},
        }

    def get_image_desktop_url(self, obj):
        return _abs(self, obj.image_desktop)

    def get_image_mobile_url(self, obj):
        return _abs(self, obj.image_mobile)

    @staticmethod
    def _check_size(file):
        if file is not None and file.size > MAX_HERO_IMAGE_BYTES:
            raise serializers.ValidationError("Image is larger than 5 MB.")
        return file

    def validate_image_desktop(self, file):
        return self._check_size(file)

    def validate_image_mobile(self, file):
        return self._check_size(file)


class HeroReorderSerializer(serializers.Serializer):
    """The ids must be exactly that hero's slides, each once, so positions can never collide."""

    hero = serializers.PrimaryKeyRelatedField(queryset=HeroConfig.objects.all())
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)

    def validate(self, attrs):
        ids = attrs["ids"]
        if len(set(ids)) != len(ids):
            raise serializers.ValidationError({"ids": "Each slide may appear only once."})
        if set(ids) != set(attrs["hero"].slides.values_list("id", flat=True)):
            raise serializers.ValidationError({"ids": "Send every slide id of this hero, and only those."})
        return attrs
