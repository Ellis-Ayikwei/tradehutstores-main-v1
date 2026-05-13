import { apiUrl } from '@/lib/config'

// ─── Public projection of Stores-BE apps/store/models.py StoreConfig ─────────
// Mirrors PUBLIC_FIELDS in Stores-BE/apps/store/views.py. Keep in sync when
// you add fields to the public projection.

export interface PublicPaymentGateway {
    id: string
    name: string
    testMode: boolean
}

export interface PublicShippingZone {
    id: string
    name: string
    countries: string[]
    enabled: boolean
}

export interface PublicShippingMethod {
    id: string
    name: string
    rate: number
    transit: string
    enabled: boolean
}

export interface PublicCountryTaxRate {
    country: string
    label: string
    rate: number
}

export interface PublicStoreConfig {
    // Storefront
    storefront_name: string
    storefront_legal_name: string
    storefront_tagline: string
    storefront_description: string
    storefront_logo_url: string
    storefront_favicon_url: string
    storefront_og_image_url: string
    storefront_support_email: string
    storefront_support_phone: string
    storefront_address: string
    storefront_website_url: string

    storefront_status: 'open' | 'invite-only' | 'maintenance'
    storefront_show_rfq: boolean
    storefront_show_auctions: boolean
    storefront_allow_guest_browsing: boolean

    // Currency & tax
    currency_base: string
    currency_enabled_display: string[]
    tax_mode: 'inclusive' | 'exclusive'
    tax_default_rate: number
    tax_country_rates: PublicCountryTaxRate[]
    tax_charge_on_shipping: boolean
    tax_show_id_at_checkout: boolean
    tax_id: string

    // Localization
    locale_default_language: string
    locale_enabled_languages: string[]
    locale_timezone: string
    locale_country: string
    locale_date_format: 'DMY' | 'MDY' | 'YMD'
    locale_week_start: 'monday' | 'sunday'
    locale_measurement: 'metric' | 'imperial'
    locale_auto_detect: boolean
    locale_rtl_support: boolean

    // Shipping
    shipping_zones: PublicShippingZone[]
    shipping_methods: PublicShippingMethod[]
    shipping_free_threshold: number
    shipping_weight_unit: 'kg' | 'lb'
    shipping_dimension_unit: 'cm' | 'in'
    shipping_estimate_at_cart: boolean

    // Customer-facing checkout policy
    customers_allow_guest_checkout: boolean
    customers_require_email_verification: boolean
    customers_require_phone_verification: boolean
    customers_min_password_length: number
    customers_marketing_opt_in_default: boolean
    customers_min_order_age: number

    // Payment gateways enabled at checkout (no secrets)
    payments_enabled_gateways: PublicPaymentGateway[]
}

export async function fetchPublicStoreConfig(): Promise<PublicStoreConfig | null> {
    try {
        const r = await fetch(`${apiUrl}store/config/public/`, {
            // Public — don't send credentials so caches can satisfy multiple visitors.
            cache: 'no-store',
        })
        if (!r.ok) return null
        return (await r.json()) as PublicStoreConfig
    } catch {
        return null
    }
}
