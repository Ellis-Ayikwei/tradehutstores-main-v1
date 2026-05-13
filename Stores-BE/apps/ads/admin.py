from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

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


class TargetingRuleInline(admin.StackedInline):
    model = TargetingRule
    extra = 0
    max_num = 1
    fieldsets = (
        ("Geo", {"fields": ("countries", "exclude_countries")}),
        ("Device & Locale", {"fields": ("devices", "languages")}),
        ("User", {"fields": ("user_states",)}),
        ("Catalog", {"fields": ("categories",), "classes": ("collapse",)}),
        ("Cart / Behavioural", {"fields": ("min_cart_value", "max_cart_value", "only_with_empty_cart")}),
        ("Path", {"fields": ("path_includes", "path_excludes"), "classes": ("collapse",)}),
        ("A/B", {"fields": ("ab_bucket",), "classes": ("collapse",)}),
    )
    filter_horizontal = ("categories",)


@admin.register(AdPlacement)
class AdPlacementAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "format", "max_active_slots", "rotation_seconds", "is_active", "active_slot_count")
    list_filter = ("format", "is_active")
    search_fields = ("slug", "name")
    prepopulated_fields = {"slug": ("name",)}

    @admin.display(description="Active slots")
    def active_slot_count(self, obj):
        return obj.slots.filter(is_active=True).count()


@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "advertiser",
        "status_badge",
        "priority",
        "schedule_display",
        "creative_count",
        "impressions_30d",
        "ctr_30d",
        "updated_at",
    )
    list_filter = ("status", "priority")
    search_fields = ("name", "advertiser")
    readonly_fields = ("created_at", "updated_at", "stats_preview")
    fieldsets = (
        ("Identity", {"fields": ("name", "advertiser", "seller", "notes")}),
        ("Lifecycle", {"fields": ("status", "priority", "starts_at", "ends_at")}),
        ("Caps", {"fields": ("daily_impression_cap", "total_impression_cap")}),
        ("Stats", {"fields": ("stats_preview",), "classes": ("collapse",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Status")
    def status_badge(self, obj):
        colours = {
            "draft": "#6b7280",
            "scheduled": "#3b82f6",
            "running": "#10b981",
            "paused": "#f59e0b",
            "ended": "#ef4444",
            "archived": "#1f2937",
        }
        c = colours.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">{}</span>',
            c,
            obj.get_status_display(),
        )

    @admin.display(description="Schedule")
    def schedule_display(self, obj):
        now = timezone.now()
        if not obj.starts_at and not obj.ends_at:
            return format_html('<span style="color:#6b7280">Always on</span>')
        if obj.starts_at and now < obj.starts_at:
            return format_html('<span style="color:#f59e0b">Starts {}</span>', obj.starts_at.strftime("%d %b %H:%M"))
        if obj.ends_at and now > obj.ends_at:
            return format_html('<span style="color:#ef4444">Ended {}</span>', obj.ends_at.strftime("%d %b %H:%M"))
        if obj.ends_at:
            return format_html('<span style="color:#10b981">Ends {}</span>', obj.ends_at.strftime("%d %b %H:%M"))
        return "—"

    @admin.display(description="Creatives")
    def creative_count(self, obj):
        return obj.creatives.count()

    @admin.display(description="Impressions (30d)")
    def impressions_30d(self, obj):
        return campaign_stats(obj, days=30)["impressions"]

    @admin.display(description="CTR (30d)")
    def ctr_30d(self, obj):
        s = campaign_stats(obj, days=30)
        return f"{s['ctr']}%"

    @admin.display(description="Performance (30d)")
    def stats_preview(self, obj):
        s = campaign_stats(obj, days=30)
        return format_html(
            "<b>{}</b> impressions · <b>{}</b> clicks · <b>{}%</b> CTR",
            s["impressions"], s["clicks"], s["ctr"],
        )


@admin.register(Creative)
class CreativeAdmin(admin.ModelAdmin):
    list_display = ("name", "campaign", "format", "preview", "updated_at")
    list_filter = ("format", "campaign__status")
    search_fields = ("name", "campaign__name", "headline")
    autocomplete_fields = ["campaign"]
    fieldsets = (
        ("Identity", {"fields": ("campaign", "name", "format")}),
        ("Media", {"fields": ("image_desktop", "image_mobile", "video_url", "html_body", "alt_text")}),
        ("Copy", {"fields": ("eyebrow", "headline", "subheadline", "cta_label", "cta_url", "open_in_new_tab")}),
        ("Styling", {"fields": ("background_color", "text_color", "accent_color"), "classes": ("collapse",)}),
    )

    @admin.display(description="Preview")
    def preview(self, obj):
        if obj.image_desktop:
            return format_html('<img src="{}" style="height:32px;border-radius:4px;" />', obj.image_desktop.url)
        return "—"


@admin.register(AdSlot)
class AdSlotAdmin(admin.ModelAdmin):
    list_display = (
        "creative",
        "placement",
        "is_active",
        "weight",
        "position_hint",
        "schedule_display",
        "impressions_7d",
        "ctr_7d",
    )
    list_filter = ("placement", "is_active")
    list_editable = ("is_active", "weight", "position_hint")
    autocomplete_fields = ["creative", "placement"]
    inlines = [TargetingRuleInline]
    fieldsets = (
        ("Binding", {"fields": ("placement", "creative")}),
        ("Lifecycle", {"fields": ("is_active", "weight", "position_hint", "starts_at", "ends_at")}),
        ("Behaviour", {"fields": ("dismissible", "show_close_after_seconds", "delay_seconds")}),
        ("Frequency caps", {"fields": ("cap_per_session", "cap_per_day", "cap_per_week")}),
    )

    @admin.display(description="Schedule")
    def schedule_display(self, obj):
        now = timezone.now()
        if obj.ends_at and now > obj.ends_at:
            return format_html('<span style="color:#ef4444">Ended</span>')
        if obj.starts_at and now < obj.starts_at:
            return format_html('<span style="color:#f59e0b">Pending</span>')
        return format_html('<span style="color:#10b981">Live</span>') if obj.is_live else "—"

    @admin.display(description="Impressions (7d)")
    def impressions_7d(self, obj):
        return slot_stats(obj, days=7)["impressions"]

    @admin.display(description="CTR (7d)")
    def ctr_7d(self, obj):
        return f"{slot_stats(obj, days=7)['ctr']}%"


@admin.register(AdImpression)
class AdImpressionAdmin(admin.ModelAdmin):
    list_display = ("slot", "device", "country", "session_id", "served_at")
    list_filter = ("device", "country")
    date_hierarchy = "served_at"
    readonly_fields = [f.name for f in AdImpression._meta.fields]


@admin.register(AdClick)
class AdClickAdmin(admin.ModelAdmin):
    list_display = ("slot", "device", "country", "destination_url", "clicked_at")
    list_filter = ("device", "country")
    date_hierarchy = "clicked_at"
    readonly_fields = [f.name for f in AdClick._meta.fields]
