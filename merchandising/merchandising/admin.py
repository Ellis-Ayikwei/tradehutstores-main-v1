"""
merchandising/admin.py

Admin UI for homepage section management.

Features:
  - Live/scheduled status indicators
  - Inline product picker for manual sections
  - Rule configuration inline
  - Preview of what the auto rule would return
  - Drag-to-reorder via position field
  - Bulk activate/deactivate actions
  - Click analytics summary
"""

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.urls import reverse

from .models import HomepageSection, HomepageSectionItem, PopulationRule, SectionClickEvent


# ─── Inlines ─────────────────────────────────────────────────────────────────

class HomepageSectionItemInline(admin.TabularInline):
    model           = HomepageSectionItem
    extra           = 0
    fields          = ("product", "position", "is_pinned", "label_override")
    ordering        = ("position",)
    autocomplete_fields = ["product"]   # requires search_fields on ProductAdmin

    def get_extra(self, request, obj=None, **kwargs):
        return 0 if obj and obj.items.exists() else 3


class PopulationRuleInline(admin.StackedInline):
    model     = PopulationRule
    extra     = 0
    max_num   = 1
    fieldsets = (
        ("Rule Type", {
            "fields": ("rule_type",),
        }),
        ("Rule Parameters", {
            "fields": (
                "lookback_days", "min_rating", "tag",
                "category", "low_stock_threshold",
            ),
            "description": "Only the fields relevant to your chosen Rule Type are used.",
        }),
        ("Filters", {
            "fields": ("only_in_stock", "only_available", "min_price", "max_price"),
        }),
        ("Caching", {
            "fields": ("cache_minutes",),
        }),
    )


# ─── HomepageSection admin ────────────────────────────────────────────────────

@admin.register(HomepageSection)
class HomepageSectionAdmin(admin.ModelAdmin):
    list_display  = (
        "title", "section_type_badge", "strategy",
        "position", "is_live_display", "schedule_display",
        "product_count", "click_count_7d", "updated_at",
    )
    list_editable = ("position",)
    list_filter   = ("is_active", "section_type", "strategy")
    search_fields = ("title", "slug")
    ordering      = ("position",)
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields     = ("is_live_display", "created_at", "updated_at", "rule_preview")
    inlines       = [PopulationRuleInline, HomepageSectionItemInline]

    fieldsets = (
        ("Identity", {
            "fields": ("title", "subtitle", "slug", "section_type"),
        }),
        ("Display", {
            "fields": ("position", "max_products", "is_active", "show_countdown"),
        }),
        ("Schedule", {
            "fields": ("starts_at", "ends_at", "is_live_display"),
            "description": "Leave both blank to always show.",
        }),
        ("Population Strategy", {
            "fields": ("strategy",),
            "description": (
                "Manual: use the 'Section Products' inline below.\n"
                "Auto: configure a rule in the 'Population Rule' inline.\n"
                "Mixed: pin products manually, rule fills the rest up to max_products."
            ),
        }),
        ("Styling", {
            "fields": ("background_color", "accent_color"),
            "classes": ("collapse",),
        }),
        ("Live Preview", {
            "fields": ("rule_preview",),
            "classes": ("collapse",),
            "description": "Shows the first 5 products the current rule would return.",
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    # ── Display helpers ───────────────────────────────────────────────────────

    @admin.display(description="Type")
    def section_type_badge(self, obj):
        colours = {
            "horizontal_scroll":  "#3b82f6",
            "grid":               "#10b981",
            "flash_sale":         "#f97316",
            "banner":             "#8b5cf6",
            "category_spotlight": "#ec4899",
        }
        colour = colours.get(obj.section_type, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">{}</span>',
            colour, obj.get_section_type_display(),
        )

    @admin.display(description="Live?", boolean=True)
    def is_live_display(self, obj):
        return obj.is_live

    @admin.display(description="Schedule")
    def schedule_display(self, obj):
        now = timezone.now()
        if not obj.starts_at and not obj.ends_at:
            return format_html('<span style="color:#6b7280">Always on</span>')
        if obj.starts_at and now < obj.starts_at:
            return format_html('<span style="color:#f59e0b">Starts {}</span>', obj.starts_at.strftime("%d %b %H:%M"))
        if obj.ends_at:
            if now > obj.ends_at:
                return format_html('<span style="color:#ef4444">Ended {}</span>', obj.ends_at.strftime("%d %b %H:%M"))
            return format_html('<span style="color:#10b981">Ends {}</span>', obj.ends_at.strftime("%d %b %H:%M"))
        return "—"

    @admin.display(description="Products")
    def product_count(self, obj):
        count = obj.items.count()
        if obj.strategy == "manual":
            colour = "green" if count > 0 else "red"
            return format_html('<span style="color:{};font-weight:bold;">{}</span>', colour, count)
        return format_html('<span style="color:#6b7280">{} pinned</span>', count)

    @admin.display(description="Clicks (7d)")
    def click_count_7d(self, obj):
        cutoff = timezone.now() - timezone.timedelta(days=7)
        count  = obj.clicks.filter(clicked_at__gte=cutoff).count()
        return format_html('<span style="font-weight:bold;">{}</span>', count) if count else "—"

    @admin.display(description="Auto-rule preview")
    def rule_preview(self, obj):
        """Show the first 5 products the current rule would resolve to."""
        try:
            from .services import resolve_section_products
            products = resolve_section_products(obj, limit=5, bypass_cache=True)
            if not products:
                return "No products matched the current rule."
            rows = "".join(
                f"<li>{p.name} — GHS {getattr(p, 'final_price', p.price)}</li>"
                for p in products
            )
            return format_html(
                '<ul style="margin:0;padding-left:16px;">{}</ul>',
                format_html(rows),
            )
        except Exception as e:
            return f"Preview unavailable: {e}"

    actions = ["activate_sections", "deactivate_sections"]

    @admin.action(description="Activate selected sections")
    def activate_sections(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Deactivate selected sections")
    def deactivate_sections(self, request, queryset):
        queryset.update(is_active=False)


# ─── Standalone item admin (bulk management) ──────────────────────────────────

@admin.register(HomepageSectionItem)
class HomepageSectionItemAdmin(admin.ModelAdmin):
    list_display  = ("product", "section", "position", "is_pinned", "label_override")
    list_filter   = ("section", "is_pinned")
    list_editable = ("position", "is_pinned")
    search_fields = ("product__name", "section__title")
    autocomplete_fields = ["product"]
    ordering      = ("section__position", "position")


@admin.register(PopulationRule)
class PopulationRuleAdmin(admin.ModelAdmin):
    list_display  = ("section", "rule_type", "lookback_days", "cache_minutes", "only_in_stock")
    list_filter   = ("rule_type", "only_in_stock")
    search_fields = ("section__title",)
