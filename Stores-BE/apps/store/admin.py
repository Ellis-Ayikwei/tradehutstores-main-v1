from django.contrib import admin

from .models import Store, StoreConfig, StoreSettings


@admin.register(StoreConfig)
class StoreConfigAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "storefront_name",
        "currency_base",
        "storefront_status",
        "system_maintenance_mode",
        "updated_at",
    )
    readonly_fields = ("id", "created_at", "updated_at")
    fieldsets = (
        (
            "Storefront",
            {
                "fields": (
                    "storefront_name",
                    "storefront_legal_name",
                    "storefront_tagline",
                    "storefront_description",
                    "storefront_logo_url",
                    "storefront_favicon_url",
                    "storefront_og_image_url",
                    "storefront_support_email",
                    "storefront_support_phone",
                    "storefront_address",
                    "storefront_website_url",
                    "storefront_status",
                    "storefront_show_rfq",
                    "storefront_show_auctions",
                    "storefront_allow_guest_browsing",
                )
            },
        ),
        (
            "Currency & tax",
            {
                "fields": (
                    "currency_base",
                    "currency_enabled_display",
                    "tax_mode",
                    "tax_default_rate",
                    "tax_country_rates",
                    "tax_charge_on_shipping",
                    "tax_show_id_at_checkout",
                    "tax_id",
                )
            },
        ),
        (
            "Localization",
            {
                "fields": (
                    "locale_default_language",
                    "locale_enabled_languages",
                    "locale_timezone",
                    "locale_country",
                    "locale_date_format",
                    "locale_week_start",
                    "locale_measurement",
                    "locale_auto_detect",
                    "locale_rtl_support",
                )
            },
        ),
        (
            "Payments",
            {
                "fields": (
                    "payments_gateways",
                    "payments_capture_mode",
                    "payments_risk_level",
                    "payments_require_3ds",
                    "payments_seller_commission",
                    "payments_min_payout",
                    "payments_payout_schedule",
                    "payments_auto_refund_eligible",
                )
            },
        ),
        (
            "Shipping",
            {
                "fields": (
                    "shipping_zones",
                    "shipping_methods",
                    "shipping_free_threshold",
                    "shipping_weight_unit",
                    "shipping_dimension_unit",
                    "shipping_estimate_at_cart",
                    "shipping_require_signature",
                    "shipping_insurance_by_default",
                )
            },
        ),
        (
            "Customers / checkout",
            {
                "fields": (
                    "customers_allow_guest_checkout",
                    "customers_require_email_verification",
                    "customers_require_phone_verification",
                    "customers_min_password_length",
                    "customers_two_factor_required",
                    "customers_session_timeout_mins",
                    "customers_account_deletion_policy",
                    "customers_marketing_opt_in_default",
                    "customers_review_moderation",
                    "customers_min_order_age",
                    "customers_abandoned_cart_recovery_hours",
                )
            },
        ),
        (
            "System",
            {
                "fields": (
                    "system_maintenance_mode",
                    "system_maintenance_message",
                    "system_maintenance_allow_admin",
                    "system_backup_cadence",
                    "system_retention_days",
                    "system_audit_logging",
                    "system_debug_mode",
                    "system_rate_limit_per_min",
                    "system_api_version",
                    "system_embedding_service_url",
                    "system_elasticsearch_url",
                )
            },
        ),
        (
            "Audit",
            {"fields": ("id", "created_at", "updated_at")},
        ),
    )

    def has_add_permission(self, request):
        # Singleton — allow add only when no row exists.
        return not StoreConfig.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ("name", "seller", "is_active", "is_featured", "total_products", "total_sales")
    search_fields = ("name", "slug", "seller__business_name")
    list_filter = ("is_active", "is_featured")


@admin.register(StoreSettings)
class StoreSettingsAdmin(admin.ModelAdmin):
    list_display = ("setting_name", "setting_value", "updated_at")
    search_fields = ("setting_name",)
