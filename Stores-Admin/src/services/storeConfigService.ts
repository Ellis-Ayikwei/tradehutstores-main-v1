import axiosInstance from './axiosInstance';

// ─── Mirrors apps/store/models.py StoreConfig ───────────────────────────────
// Keep this in sync when you add/remove fields on the BE model.

export interface PaymentGateway {
    id: string;
    name: string;
    enabled: boolean;
    testMode: boolean;
    publicKey: string;
    secretKey: string;
    [k: string]: any;
}

export interface ShippingZone {
    id: string;
    name: string;
    countries: string[];
    enabled: boolean;
    [k: string]: any;
}

export interface ShippingMethod {
    id: string;
    name: string;
    rate: number;
    transit: string;
    enabled: boolean;
    [k: string]: any;
}

export interface CountryTaxRate {
    country: string;
    label: string;
    rate: number;
}

export interface StoreConfig {
    id: string;
    created_at: string;
    updated_at: string;

    // Storefront
    storefront_name: string;
    storefront_legal_name: string;
    storefront_tagline: string;
    storefront_description: string;
    storefront_logo_url: string;
    storefront_favicon_url: string;
    storefront_og_image_url: string;
    storefront_support_email: string;
    storefront_support_phone: string;
    storefront_address: string;
    storefront_website_url: string;
    storefront_status: 'open' | 'invite-only' | 'maintenance';
    storefront_show_rfq: boolean;
    storefront_show_auctions: boolean;
    storefront_allow_guest_browsing: boolean;

    // Currency & tax
    currency_base: string;
    currency_enabled_display: string[];
    tax_mode: 'inclusive' | 'exclusive';
    tax_default_rate: number | string;
    tax_country_rates: CountryTaxRate[];
    tax_charge_on_shipping: boolean;
    tax_show_id_at_checkout: boolean;
    tax_id: string;

    // Localization
    locale_default_language: string;
    locale_enabled_languages: string[];
    locale_timezone: string;
    locale_country: string;
    locale_date_format: 'DMY' | 'MDY' | 'YMD';
    locale_week_start: 'monday' | 'sunday';
    locale_measurement: 'metric' | 'imperial';
    locale_auto_detect: boolean;
    locale_rtl_support: boolean;

    // Payments
    payments_gateways: PaymentGateway[];
    payments_capture_mode: 'auto' | 'manual';
    payments_risk_level: 'low' | 'standard' | 'strict';
    payments_require_3ds: boolean;
    payments_seller_commission: number | string;
    payments_min_payout: number | string;
    payments_payout_schedule: 'daily' | 'weekly' | 'monthly';
    payments_auto_refund_eligible: boolean;

    // Shipping
    shipping_zones: ShippingZone[];
    shipping_methods: ShippingMethod[];
    shipping_free_threshold: number | string;
    shipping_weight_unit: 'kg' | 'lb';
    shipping_dimension_unit: 'cm' | 'in';
    shipping_estimate_at_cart: boolean;
    shipping_require_signature: boolean;
    shipping_insurance_by_default: boolean;

    // Customers / checkout
    customers_allow_guest_checkout: boolean;
    customers_require_email_verification: boolean;
    customers_require_phone_verification: boolean;
    customers_min_password_length: number;
    customers_two_factor_required: 'off' | 'optional' | 'required';
    customers_session_timeout_mins: number;
    customers_account_deletion_policy: 'admin-only' | 'self-serve' | 'self-serve-with-cooloff';
    customers_marketing_opt_in_default: boolean;
    customers_review_moderation: 'auto-approve' | 'pre-moderate' | 'post-moderate';
    customers_min_order_age: number;
    customers_abandoned_cart_recovery_hours: number;

    // System
    system_maintenance_mode: boolean;
    system_maintenance_message: string;
    system_maintenance_allow_admin: boolean;
    system_backup_cadence: 'hourly' | 'daily' | 'weekly';
    system_retention_days: number;
    system_audit_logging: boolean;
    system_debug_mode: boolean;
    system_rate_limit_per_min: number;
    system_api_version: string;
    system_embedding_service_url: string;
    system_elasticsearch_url: string;
}

export type StoreConfigPatch = Partial<StoreConfig>;

const PATH = 'store/config/';

export async function fetchStoreConfig(): Promise<StoreConfig> {
    const r = await axiosInstance.get<StoreConfig>(PATH);
    return r.data;
}

export async function updateStoreConfig(patch: StoreConfigPatch): Promise<StoreConfig> {
    // axiosInstance defaults POST/etc bodies to a stub object — pass `data`
    // explicitly as an object so the request interceptor doesn't override it.
    const r = await axiosInstance.patch<StoreConfig>(PATH, patch);
    return r.data;
}
