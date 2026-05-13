from apps.core.models import BaseModel
from django.core.exceptions import ValidationError
from django.db import models


# ─────────────────────────────────────────────────────────────────────────────
# Legacy KV table — kept for back-compat with anything that wrote to it.
# New work should use StoreConfig (typed columns) below.
# ─────────────────────────────────────────────────────────────────────────────
class StoreSettings(BaseModel):
    setting_name = models.CharField(max_length=255)
    setting_value = models.CharField(max_length=255)

    class Meta:
        managed = True
        db_table = "store_settings"


# ─────────────────────────────────────────────────────────────────────────────
# Marketplace-wide configuration. Singleton — use StoreConfig.singleton().
# Scalars are typed columns; variable-length collections use JSONField so we
# don't churn migrations for every UI tweak.
# ─────────────────────────────────────────────────────────────────────────────
STOREFRONT_STATUS = (
    ("open", "Open"),
    ("invite-only", "Invite only"),
    ("maintenance", "Maintenance"),
)
TAX_MODES = (("inclusive", "Inclusive"), ("exclusive", "Exclusive"))
PAYMENT_CAPTURE_MODES = (("auto", "Auto"), ("manual", "Manual"))
PAYMENT_RISK_LEVELS = (("low", "Low"), ("standard", "Standard"), ("strict", "Strict"))
PAYOUT_SCHEDULES = (("daily", "Daily"), ("weekly", "Weekly"), ("monthly", "Monthly"))
WEIGHT_UNITS = (("kg", "Kilograms"), ("lb", "Pounds"))
DIMENSION_UNITS = (("cm", "Centimetres"), ("in", "Inches"))
DATE_FORMATS = (("DMY", "DD/MM/YYYY"), ("MDY", "MM/DD/YYYY"), ("YMD", "YYYY-MM-DD"))
WEEK_STARTS = (("monday", "Monday"), ("sunday", "Sunday"))
MEASUREMENTS = (("metric", "Metric"), ("imperial", "Imperial"))
TWO_FACTOR_MODES = (("off", "Off"), ("optional", "Optional"), ("required", "Required"))
ACCOUNT_DELETION_POLICIES = (
    ("admin-only", "Admin only"),
    ("self-serve", "Self-serve"),
    ("self-serve-with-cooloff", "Self-serve with cooloff"),
)
REVIEW_MODERATION = (
    ("auto-approve", "Auto-approve"),
    ("pre-moderate", "Pre-moderate"),
    ("post-moderate", "Post-moderate"),
)
BACKUP_CADENCES = (("hourly", "Hourly"), ("daily", "Daily"), ("weekly", "Weekly"))


def _default_enabled_display():
    return ["GHS", "USD", "EUR", "GBP", "NGN"]


def _default_country_tax_rates():
    return [
        {"country": "GH", "label": "Ghana — VAT", "rate": 12.5},
        {"country": "NG", "label": "Nigeria — VAT", "rate": 7.5},
        {"country": "KE", "label": "Kenya — VAT", "rate": 16},
    ]


def _default_enabled_languages():
    return ["en", "fr", "tw"]


def _default_payment_gateways():
    return [
        {
            "id": "paystack",
            "name": "Paystack",
            "enabled": True,
            "testMode": True,
            "publicKey": "",
            "secretKey": "",
        },
        {
            "id": "momo",
            "name": "Mobile Money (MTN / Vodafone / AirtelTigo)",
            "enabled": True,
            "testMode": False,
            "publicKey": "",
            "secretKey": "",
        },
        {
            "id": "flutterwave",
            "name": "Flutterwave",
            "enabled": False,
            "testMode": True,
            "publicKey": "",
            "secretKey": "",
        },
        {
            "id": "stripe",
            "name": "Stripe",
            "enabled": False,
            "testMode": True,
            "publicKey": "",
            "secretKey": "",
        },
        {
            "id": "paypal",
            "name": "PayPal",
            "enabled": False,
            "testMode": True,
            "publicKey": "",
            "secretKey": "",
        },
        {
            "id": "cod",
            "name": "Cash on delivery",
            "enabled": True,
            "testMode": False,
            "publicKey": "",
            "secretKey": "",
        },
    ]


def _default_shipping_zones():
    return [
        {"id": "gh-domestic", "name": "Ghana — Domestic", "countries": ["GH"], "enabled": True},
        {
            "id": "ecowas",
            "name": "ECOWAS region",
            "countries": ["NG", "CI", "BJ", "TG", "BF", "SN"],
            "enabled": True,
        },
        {"id": "international", "name": "International", "countries": ["*"], "enabled": False},
    ]


def _default_shipping_methods():
    return [
        {"id": "standard", "name": "Standard delivery", "rate": 25, "transit": "3–5 days", "enabled": True},
        {"id": "express", "name": "Express same-day (Accra)", "rate": 75, "transit": "Same day", "enabled": True},
        {"id": "pickup", "name": "Local pickup", "rate": 0, "transit": "On collection", "enabled": True},
        {"id": "courier", "name": "Cross-border courier", "rate": 250, "transit": "5–10 days", "enabled": True},
        {"id": "dhl", "name": "DHL international", "rate": 600, "transit": "3–7 days", "enabled": False},
    ]


class StoreConfig(BaseModel):
    """Singleton row of marketplace-wide configuration.

    Always read via :py:meth:`singleton` — never query directly. The save()
    override enforces a single row.
    """

    # ── Storefront ───────────────────────────────────────────────────────────
    storefront_name = models.CharField(max_length=255, default="TradeHut Stores")
    storefront_legal_name = models.CharField(max_length=255, blank=True, default="TradeHut Limited")
    storefront_tagline = models.CharField(max_length=500, blank=True, default="Africa's procurement marketplace")
    storefront_description = models.TextField(blank=True, default="")
    storefront_logo_url = models.URLField(blank=True, default="")
    storefront_favicon_url = models.URLField(blank=True, default="")
    storefront_og_image_url = models.URLField(blank=True, default="")
    storefront_support_email = models.EmailField(blank=True, default="support@tradehut.com")
    storefront_support_phone = models.CharField(max_length=64, blank=True, default="+233 30 000 0000")
    storefront_address = models.CharField(max_length=500, blank=True, default="Accra, Ghana")
    storefront_website_url = models.URLField(blank=True, default="https://tradehut.com")
    storefront_status = models.CharField(max_length=16, choices=STOREFRONT_STATUS, default="open")
    storefront_show_rfq = models.BooleanField(default=True)
    storefront_show_auctions = models.BooleanField(default=True)
    storefront_allow_guest_browsing = models.BooleanField(default=True)

    # ── Currency & Tax ───────────────────────────────────────────────────────
    currency_base = models.CharField(max_length=3, default="GHS")
    currency_enabled_display = models.JSONField(default=_default_enabled_display)
    tax_mode = models.CharField(max_length=16, choices=TAX_MODES, default="inclusive")
    tax_default_rate = models.DecimalField(max_digits=6, decimal_places=2, default=12.5)
    tax_country_rates = models.JSONField(default=_default_country_tax_rates)
    tax_charge_on_shipping = models.BooleanField(default=True)
    tax_show_id_at_checkout = models.BooleanField(default=True)
    tax_id = models.CharField(max_length=64, blank=True, default="")

    # ── Localization ─────────────────────────────────────────────────────────
    locale_default_language = models.CharField(max_length=8, default="en")
    locale_enabled_languages = models.JSONField(default=_default_enabled_languages)
    locale_timezone = models.CharField(max_length=64, default="Africa/Accra")
    locale_country = models.CharField(max_length=2, default="GH")
    locale_date_format = models.CharField(max_length=8, choices=DATE_FORMATS, default="DMY")
    locale_week_start = models.CharField(max_length=8, choices=WEEK_STARTS, default="monday")
    locale_measurement = models.CharField(max_length=16, choices=MEASUREMENTS, default="metric")
    locale_auto_detect = models.BooleanField(default=True)
    locale_rtl_support = models.BooleanField(default=False)

    # ── Payments ─────────────────────────────────────────────────────────────
    payments_gateways = models.JSONField(default=_default_payment_gateways)
    payments_capture_mode = models.CharField(max_length=16, choices=PAYMENT_CAPTURE_MODES, default="auto")
    payments_risk_level = models.CharField(max_length=16, choices=PAYMENT_RISK_LEVELS, default="standard")
    payments_require_3ds = models.BooleanField(default=True)
    payments_seller_commission = models.DecimalField(max_digits=6, decimal_places=2, default=7.5)
    payments_min_payout = models.DecimalField(max_digits=12, decimal_places=2, default=100)
    payments_payout_schedule = models.CharField(max_length=16, choices=PAYOUT_SCHEDULES, default="weekly")
    payments_auto_refund_eligible = models.BooleanField(default=True)

    # ── Shipping ─────────────────────────────────────────────────────────────
    shipping_zones = models.JSONField(default=_default_shipping_zones)
    shipping_methods = models.JSONField(default=_default_shipping_methods)
    shipping_free_threshold = models.DecimalField(max_digits=12, decimal_places=2, default=500)
    shipping_weight_unit = models.CharField(max_length=4, choices=WEIGHT_UNITS, default="kg")
    shipping_dimension_unit = models.CharField(max_length=4, choices=DIMENSION_UNITS, default="cm")
    shipping_estimate_at_cart = models.BooleanField(default=True)
    shipping_require_signature = models.BooleanField(default=False)
    shipping_insurance_by_default = models.BooleanField(default=False)

    # ── Customers / checkout ─────────────────────────────────────────────────
    customers_allow_guest_checkout = models.BooleanField(default=True)
    customers_require_email_verification = models.BooleanField(default=True)
    customers_require_phone_verification = models.BooleanField(default=False)
    customers_min_password_length = models.PositiveSmallIntegerField(default=10)
    customers_two_factor_required = models.CharField(max_length=16, choices=TWO_FACTOR_MODES, default="optional")
    customers_session_timeout_mins = models.PositiveIntegerField(default=60)
    customers_account_deletion_policy = models.CharField(
        max_length=32, choices=ACCOUNT_DELETION_POLICIES, default="self-serve-with-cooloff"
    )
    customers_marketing_opt_in_default = models.BooleanField(default=False)
    customers_review_moderation = models.CharField(
        max_length=16, choices=REVIEW_MODERATION, default="post-moderate"
    )
    customers_min_order_age = models.PositiveSmallIntegerField(default=18)
    customers_abandoned_cart_recovery_hours = models.PositiveIntegerField(default=24)

    # ── System ───────────────────────────────────────────────────────────────
    system_maintenance_mode = models.BooleanField(default=False)
    system_maintenance_message = models.TextField(
        default="TradeHut Stores is undergoing scheduled maintenance. We’ll be back shortly."
    )
    system_maintenance_allow_admin = models.BooleanField(default=True)
    system_backup_cadence = models.CharField(max_length=16, choices=BACKUP_CADENCES, default="daily")
    system_retention_days = models.PositiveIntegerField(default=30)
    system_audit_logging = models.BooleanField(default=True)
    system_debug_mode = models.BooleanField(default=False)
    system_rate_limit_per_min = models.PositiveIntegerField(default=600)
    system_api_version = models.CharField(max_length=8, default="v1")
    system_embedding_service_url = models.URLField(blank=True, default="")
    system_elasticsearch_url = models.URLField(blank=True, default="")

    class Meta:
        managed = True
        db_table = "store_config"
        verbose_name = "Store configuration"
        verbose_name_plural = "Store configuration"

    # ── Singleton helpers ────────────────────────────────────────────────────
    @classmethod
    def singleton(cls) -> "StoreConfig":
        instance = cls.objects.first()
        if instance is None:
            instance = cls.objects.create()
        return instance

    def save(self, *args, **kwargs):  # noqa: D401
        # Enforce singleton — multiple rows would silently fork config.
        if not self.pk and StoreConfig.objects.exists():
            raise ValidationError(
                "StoreConfig is a singleton; use StoreConfig.singleton() to mutate the existing row."
            )
        super().save(*args, **kwargs)


# ─────────────────────────────────────────────────────────────────────────────
# Per-seller storefront. Unrelated to StoreConfig (which is platform-wide).
# ─────────────────────────────────────────────────────────────────────────────
class Store(BaseModel):
    """
    Individual store/shop managed by a seller.
    A seller can have multiple stores (optional feature).
    """

    seller = models.ForeignKey(
        "sellers.SellerProfile", on_delete=models.CASCADE, related_name="stores"
    )

    # Store Information
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)

    # Store Images
    logo = models.ImageField(upload_to="store_logos/", blank=True, null=True)
    banner = models.ImageField(upload_to="store_banners/", blank=True, null=True)

    # Contact Information
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)

    # Settings
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    # Metrics
    total_products = models.IntegerField(default=0)
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    class Meta:
        managed = True
        db_table = "stores"
        indexes = [
            models.Index(fields=["seller", "is_active"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return f"{self.name} - {self.seller.business_name}"

    def update_product_count(self):
        """Update total products count"""
        from apps.products.models import Product

        self.total_products = Product.objects.filter(store=self).count()
        self.save()
