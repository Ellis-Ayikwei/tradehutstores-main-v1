/**
 * Shared Seller Central types. Contract: .claude/plans/20-seller-and-checkout-gaps.md
 * (SE2 / SE3 / SE4, P6, O6 and the onboarding addenda). Money values are decimal strings with a currency code.
 */

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended'
export type DocumentKind = 'id_card' | 'id_card_back' | 'selfie_with_id' | 'proof_of_address' | 'business_registration'
export type DocumentStatus = 'pending' | 'approved' | 'rejected'
export type BusinessType = 'individual' | 'registered_business'
export type IdType = 'ghana_card' | 'passport' | 'drivers_licence' | 'voters_id'

export interface SellerDocument {
    kind: DocumentKind
    status: DocumentStatus
    /** Reviewer note, normally set when rejected. */
    note?: string | null
    uploaded_at?: string | null
    /** Not in the contract; used when the API provides it. */
    url?: string | null
}

export interface SellingCategory {
    id: string
    name: string
}

/** SE2 `GET sellers/me/`. */
export interface SellerProfile {
    verification_status: VerificationStatus
    /** Only populated when rejected. */
    verification_notes?: string | null
    missing_documents: DocumentKind[]
    /** Profile fields still needed before review, e.g. `selling_categories`. Only for pending / rejected sellers. */
    missing_fields: string[]
    can_resubmit?: boolean
    documents: SellerDocument[]

    business_name: string
    business_type?: BusinessType | null
    business_description?: string | null
    selling_categories?: SellingCategory[] | null
    /** Free text for a category that is not in the catalog. */
    other_category?: string | null
    business_email?: string | null
    business_phone?: string | null
    business_address?: string | null
    business_registration_number?: string | null
    tax_id?: string | null
    id_type?: IdType | null
    /** Last four characters of the ID number. The full number is never returned. */
    id_number_last4?: string | null

    return_policy?: string | null
    shipping_policy?: string | null
    is_accepting_orders?: boolean
}

/** Fields the seller can change with `PATCH sellers/me/`. */
export interface SellerProfileFields {
    business_name: string
    business_description: string
    /** Catalog category ids (max 10). */
    selling_categories: string[]
    other_category: string
    business_email: string
    business_phone: string
    business_address: string
    return_policy: string
    shipping_policy: string
    is_accepting_orders: boolean
}

export type SellerProfilePatch = Partial<SellerProfileFields>

/** SE4 `GET sellers/me/stats/`. */
export interface SellerStats {
    sales_30d: string
    orders_30d: number
    orders_to_ship: number
    /** Variants with quantity <= 5. */
    low_stock_variants: number
    active_listings: number
    live_auctions: number
    open_rfq_matches: number
    currency: string
    /** Amendment to SE4: last 30 days, one entry per day including zero days. Chart renders only when present. */
    sales_by_day?: SellerDailySales[]
}

export interface SellerDailySales {
    /** YYYY-MM-DD */
    date: string
    /** Decimal string */
    total: string
}

/** P6 `GET payments/seller/balance/`. */
export interface SellerBalance {
    currency: string
    pending: string
    available: string
    paid_out: string
    min_payout: string
}

export interface Paged<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

/** O6 list row (the fields Overview needs). */
export interface RecentSellerOrder {
    id: string
    placed_at: string
    order_status: string
    payment_status?: string
    total_amount: string
    currency: string
    item_count: number
    first_item: { title: string; image: string | null } | null
}
