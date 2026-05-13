"""
Marketplace-wide configuration endpoints.

Admin (is_staff):
  GET   /tradehut/api/v1/store/config/   → full StoreConfig blob
  PATCH /tradehut/api/v1/store/config/   → partial update.
                                            Send only the fields the calling
                                            tab owns; everything else is left
                                            untouched.

Public (storefront — anonymous):
  GET   /tradehut/api/v1/store/config/public/  → safe subset (no secret keys,
                                                  no internal URLs, no admin-only
                                                  operational thresholds).
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import StoreConfig
from .permissions import StoreConfigAdminPermission
from .serializers import StoreConfigSerializer


@api_view(["GET", "PATCH"])
@permission_classes([StoreConfigAdminPermission])
def store_config_view(request):
    config = StoreConfig.singleton()
    if request.method == "PATCH":
        serializer = StoreConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    return Response(StoreConfigSerializer(config).data)


# ─── Public projection ─────────────────────────────────────────────────────────
# Whitelist of fields the storefront is allowed to read anonymously. Anything
# not in this set is either operationally sensitive (rate limits, debug flags),
# a secret (gateway keys), or admin-only (review moderation strategy).

PUBLIC_FIELDS = (
    # Storefront identity
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
    # Storefront mode + feature toggles
    "storefront_status",
    "storefront_show_rfq",
    "storefront_show_auctions",
    "storefront_allow_guest_browsing",
    # Currency & tax (no secrets)
    "currency_base",
    "currency_enabled_display",
    "tax_mode",
    "tax_default_rate",
    "tax_country_rates",
    "tax_charge_on_shipping",
    "tax_show_id_at_checkout",
    "tax_id",
    # Localization
    "locale_default_language",
    "locale_enabled_languages",
    "locale_timezone",
    "locale_country",
    "locale_date_format",
    "locale_week_start",
    "locale_measurement",
    "locale_auto_detect",
    "locale_rtl_support",
    # Shipping (no admin-only)
    "shipping_zones",
    "shipping_methods",
    "shipping_free_threshold",
    "shipping_weight_unit",
    "shipping_dimension_unit",
    "shipping_estimate_at_cart",
    # Customer-facing checkout policy
    "customers_allow_guest_checkout",
    "customers_require_email_verification",
    "customers_require_phone_verification",
    "customers_min_password_length",
    "customers_marketing_opt_in_default",
    "customers_min_order_age",
)


def _public_payment_gateways(gateways):
    """Strip secret keys; expose only what the checkout UI needs."""
    out = []
    for g in gateways or []:
        if not isinstance(g, dict):
            continue
        if not g.get("enabled"):
            continue
        out.append(
            {
                "id": g.get("id"),
                "name": g.get("name"),
                "testMode": bool(g.get("testMode")),
                # NOTE: publicKey could be exposed here if your storefront needs
                # client-side gateway init (Stripe, Paystack inline). Add it
                # back once you wire client-side payment widgets.
            }
        )
    return out


@api_view(["GET"])
@permission_classes([AllowAny])
def public_store_config_view(request):
    """Anonymous read of the storefront-relevant config subset."""
    config = StoreConfig.singleton()
    data = {field: getattr(config, field) for field in PUBLIC_FIELDS}
    # Decimals → float for JSON-friendly cart math on the FE.
    for k in ("tax_default_rate", "shipping_free_threshold"):
        if data.get(k) is not None:
            data[k] = float(data[k])
    data["payments_enabled_gateways"] = _public_payment_gateways(config.payments_gateways)
    return Response(data)
