"""Django admin for the promo system."""

import csv

from django.contrib import admin
from django.db.models import Sum
from django.http import HttpResponse
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    Discount,
    DiscountRedemption,
    GiftCard,
    PromoAttempt,
    PromoCode,
    PromoPolicy,
    PromoRedemption,
    ReferralCode,
)


@admin.register(PromoPolicy)
class PromoPolicyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "max_seller_discount_percentage",
        "max_seller_codes_per_month",
        "commission_basis",
        "allow_seller_platform_stacking",
        "public_storefront_codes_visible",
        "updated_at",
    )

    def has_add_permission(self, request):
        return not PromoPolicy.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


# ─── New PromoCode system ────────────────────────────────────────────────────


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "scope_badge",
        "discount_badge",
        "target_type",
        "is_live_display",
        "usage_display",
        "min_order_value",
        "schedule_display",
        "revenue_display",
        "updated_at",
    )
    list_filter = (
        "is_active",
        "discount_type",
        "target_type",
        "user_segment",
        "auto_apply",
        "stackable",
        ("seller", admin.RelatedOnlyFieldListFilter),
    )
    search_fields = ("code", "name", "seller__business_name")
    readonly_fields = (
        "current_redemptions",
        "is_live_display",
        "revenue_display",
        "created_at",
        "updated_at",
    )
    filter_horizontal = ("products", "categories", "specific_users")
    raw_id_fields = ("seller",)
    ordering = ("-created_at",)
    actions = ["activate", "deactivate", "export_codes_csv", "generate_bulk_codes"]

    fieldsets = (
        (
            "Identity",
            {
                "fields": (
                    "code",
                    "name",
                    "description",
                    "is_active",
                    "auto_apply",
                    "auto_apply_priority",
                ),
            },
        ),
        (
            "Ownership",
            {
                "fields": ("seller",),
                "description": "Leave blank for a platform-wide promo. Set to a Seller for a seller-scoped promo.",
            },
        ),
        (
            "Discount Rule",
            {
                "fields": (
                    "discount_type",
                    "discount_value",
                    "max_discount_amount",
                    "buy_quantity",
                    "get_quantity",
                    "fixed_price",
                    "include_free_shipping",
                ),
                "description": (
                    "PERCENTAGE: discount_value = 1-100. "
                    "FIXED_AMOUNT: discount_value = GHS amount. "
                    "FREE_SHIPPING: discount_value ignored. "
                    "BUY_X_GET_Y: fill buy_quantity + get_quantity. "
                    "FIXED_PRICE: fill fixed_price."
                ),
            },
        ),
        (
            "What It Applies To",
            {
                "fields": ("target_type", "products", "categories"),
                "description": (
                    "ENTIRE_ORDER: applies to whole subtotal. "
                    "PRODUCTS / CATEGORIES: restrict by selection. "
                    "SELLER_PRODUCTS: only this seller's items in the cart (requires seller above)."
                ),
            },
        ),
        (
            "Eligibility",
            {
                "fields": (
                    "min_order_value",
                    "min_items_count",
                    "user_segment",
                    "specific_users",
                    "first_order_only",
                    "stackable",
                ),
            },
        ),
        ("Usage Limits", {"fields": ("max_redemptions", "current_redemptions", "max_redemptions_per_user")}),
        ("Schedule", {"fields": ("starts_at", "ends_at", "is_live_display")}),
        ("Analytics", {"fields": ("revenue_display",), "classes": ("collapse",)}),
        ("Timestamps", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )

    @admin.display(description="Scope")
    def scope_badge(self, obj):
        if obj.seller_id:
            return format_html(
                '<span style="background:#0ea5e9;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">SELLER</span>'
            )
        return format_html(
            '<span style="background:#6366f1;color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">PLATFORM</span>'
        )

    @admin.display(description="Discount")
    def discount_badge(self, obj):
        DT = PromoCode.DiscountType
        labels = {
            DT.PERCENTAGE: (f"{obj.discount_value:.0f}% off", "#6366f1"),
            DT.FIXED_AMOUNT: (f"GHS {obj.discount_value} off", "#0ea5e9"),
            DT.FREE_SHIPPING: ("Free Shipping", "#10b981"),
            DT.BUY_X_GET_Y: (f"B{obj.buy_quantity}G{obj.get_quantity}", "#f97316"),
            DT.FIXED_PRICE: (f"Pay GHS {obj.fixed_price}", "#8b5cf6"),
        }
        label, colour = labels.get(obj.discount_type, ("-", "#999"))
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">{}</span>',
            colour,
            label,
        )

    @admin.display(description="Live?", boolean=True)
    def is_live_display(self, obj):
        return obj.is_live

    @admin.display(description="Usage")
    def usage_display(self, obj):
        if obj.max_redemptions:
            pct = (obj.current_redemptions / obj.max_redemptions) * 100
            colour = "#ef4444" if pct >= 90 else "#f59e0b" if pct >= 70 else "#10b981"
            return format_html(
                '<span style="color:{};font-weight:700;">{} / {}</span>',
                colour,
                obj.current_redemptions,
                obj.max_redemptions,
            )
        return format_html('<span style="color:#6b7280;">{} uses</span>', obj.current_redemptions)

    @admin.display(description="Schedule")
    def schedule_display(self, obj):
        now = timezone.now()
        if not obj.starts_at and not obj.ends_at:
            return format_html('<span style="color:#6b7280;font-size:11px;">Always</span>')
        if obj.ends_at and now > obj.ends_at:
            return format_html('<span style="color:#ef4444;font-size:11px;">Ended</span>')
        if obj.ends_at:
            days = (obj.ends_at - now).days
            c = "#ef4444" if days < 2 else "#f59e0b" if days < 7 else "#10b981"
            return format_html('<span style="color:{};font-size:11px;">{}d left</span>', c, days)
        return "-"

    @admin.display(description="Revenue Influenced")
    def revenue_display(self, obj):
        total = obj.redemptions.aggregate(s=Sum("order_subtotal"))["s"] or 0
        saved = obj.redemptions.aggregate(s=Sum("discount_amount"))["s"] or 0
        return format_html("Orders: GHS {:,.0f} | Discounts given: GHS {:,.0f}", total, saved)

    @admin.action(description="Activate selected codes")
    def activate(self, request, queryset):
        queryset.update(is_active=True)

    @admin.action(description="Deactivate selected codes")
    def deactivate(self, request, queryset):
        queryset.update(is_active=False)

    @admin.action(description="Export codes as CSV")
    def export_codes_csv(self, request, queryset):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="promo_codes.csv"'
        writer = csv.writer(response)
        writer.writerow(["Code", "Name", "Scope", "Type", "Value", "Uses", "Max Uses", "Expires"])
        for promo in queryset:
            writer.writerow(
                [
                    promo.code,
                    promo.name,
                    "seller" if promo.seller_id else "platform",
                    promo.discount_type,
                    promo.discount_value,
                    promo.current_redemptions,
                    promo.max_redemptions or "Unlimited",
                    promo.ends_at.strftime("%Y-%m-%d") if promo.ends_at else "No expiry",
                ]
            )
        return response

    @admin.action(description="Generate 10 bulk codes from selected template(s)")
    def generate_bulk_codes(self, request, queryset):
        created = 0
        for template in queryset:
            for _ in range(10):
                code = PromoCode.generate_code(prefix=template.code[:4])
                PromoCode.objects.create(
                    code=code,
                    name=f"{template.name} (bulk)",
                    seller=template.seller,
                    discount_type=template.discount_type,
                    discount_value=template.discount_value,
                    max_redemptions=1,
                    max_redemptions_per_user=1,
                    starts_at=template.starts_at,
                    ends_at=template.ends_at,
                    user_segment=template.user_segment,
                    min_order_value=template.min_order_value,
                    is_active=False,
                )
                created += 1
        self.message_user(request, f"{created} bulk codes created as drafts (inactive).")


@admin.register(PromoRedemption)
class PromoRedemptionAdmin(admin.ModelAdmin):
    list_display = ("promo", "user", "order_id", "discount_amount", "order_subtotal", "created_at")
    list_filter = ("promo",)
    search_fields = ("promo__code", "user__email", "order_id")
    readonly_fields = [f.name for f in PromoRedemption._meta.fields]
    ordering = ("-created_at",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(PromoAttempt)
class PromoAttemptAdmin(admin.ModelAdmin):
    list_display = ("code", "success", "error_code", "ip_address", "user_id", "attempted_at")
    list_filter = ("success", "error_code")
    search_fields = ("code", "ip_address")
    readonly_fields = [f.name for f in PromoAttempt._meta.fields]
    ordering = ("-attempted_at",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(ReferralCode)
class ReferralCodeAdmin(admin.ModelAdmin):
    list_display = ("code", "user", "reward_type", "reward_value", "total_referrals", "is_active")
    list_filter = ("reward_type", "is_active")
    search_fields = ("code", "user__email")
    readonly_fields = ("total_referrals", "created_at", "updated_at")
    raw_id_fields = ("user", "referral_promo")


# ─── Legacy ──────────────────────────────────────────────────────────────────


@admin.register(Discount)
class DiscountAdmin(admin.ModelAdmin):
    list_display = ("code", "discounttype", "value", "validfrom", "validto", "uses_count", "max_uses")
    search_fields = ("code",)


@admin.register(DiscountRedemption)
class DiscountRedemptionAdmin(admin.ModelAdmin):
    list_display = ("user", "discount", "redeemed_at")


@admin.register(GiftCard)
class GiftCardAdmin(admin.ModelAdmin):
    list_display = ("code", "balance", "expiration_date")
    search_fields = ("code",)
