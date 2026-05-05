from rest_framework import serializers

from .models import HomepageSection, HomepageSectionItem, PopulationRule


class PopulationRuleAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = PopulationRule
        exclude = ("section", "created_at", "updated_at")


class HomepageSectionItemReadSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)

    class Meta:
        model = HomepageSectionItem
        fields = (
            "id",
            "product",
            "product_name",
            "position",
            "is_pinned",
            "label_override",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class HomepageSectionItemWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepageSectionItem
        fields = ("section", "product", "position", "is_pinned", "label_override")


class HomepageSectionAdminListSerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()
    rule_type = serializers.SerializerMethodField()
    is_live = serializers.SerializerMethodField()

    class Meta:
        model = HomepageSection
        fields = (
            "id",
            "title",
            "subtitle",
            "slug",
            "section_type",
            "strategy",
            "max_products",
            "position",
            "is_active",
            "is_live",
            "starts_at",
            "ends_at",
            "show_countdown",
            "background_color",
            "accent_color",
            "items_count",
            "rule_type",
            "created_at",
            "updated_at",
        )

    def get_items_count(self, obj):
        return obj.items.count()

    def get_rule_type(self, obj):
        rule = getattr(obj, "rule", None)
        return rule.rule_type if rule else None

    def get_is_live(self, obj):
        return obj.is_live


class HomepageSectionAdminDetailSerializer(HomepageSectionAdminListSerializer):
    rule = PopulationRuleAdminSerializer(read_only=True)
    items = HomepageSectionItemReadSerializer(many=True, read_only=True)

    class Meta(HomepageSectionAdminListSerializer.Meta):
        fields = HomepageSectionAdminListSerializer.Meta.fields + ("rule", "items")


class HomepageSectionAdminWriteSerializer(serializers.ModelSerializer):
    rule = PopulationRuleAdminSerializer(required=False, allow_null=True)

    class Meta:
        model = HomepageSection
        fields = (
            "title",
            "subtitle",
            "slug",
            "section_type",
            "max_products",
            "position",
            "is_active",
            "starts_at",
            "ends_at",
            "strategy",
            "background_color",
            "accent_color",
            "show_countdown",
            "rule",
        )

    def create(self, validated_data):
        from .services import bust_section_cache

        rule_data = validated_data.pop("rule", None)
        section = HomepageSection.objects.create(**validated_data)
        if rule_data is not None:
            PopulationRule.objects.create(section=section, **rule_data)
        bust_section_cache(section)
        return section

    def update(self, instance, validated_data):
        from .services import bust_section_cache

        rule_data = validated_data.pop("rule", serializers.empty)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        if rule_data is not serializers.empty:
            if rule_data is None:
                PopulationRule.objects.filter(section=instance).delete()
            else:
                PopulationRule.objects.update_or_create(section=instance, defaults=dict(rule_data))
        bust_section_cache(instance)
        return instance
