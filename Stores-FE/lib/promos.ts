/**
 * Storefront client for promo codes.
 *   - validatePromo(code, cart) -> ValidationResult
 *   - autoApplyPromo(cart)      -> ValidationResult | null
 *   - listApplicablePromos(cart)-> PromoSummary[]
 *
 * The BE always re-validates server-side at order time; nothing here is trusted.
 */

import { apiUrl } from './config'

export interface PromoResult {
    valid: boolean
    code: string
    discount_type: string
    discount_amount: string  // Decimal as string e.g. "25.00"
    free_shipping: boolean
    description: string
    error_code: string
    error_message: string
}

export interface CartSnapshot {
    subtotal: number
    item_count: number
    item_ids?: string[]
    category_ids?: string[]
    seller_ids?: string[]
    seller_subtotals?: Record<string, number>
    session_key?: string
}

export interface PromoSummary {
    code: string
    description: string
    discount_type: string
    discount_value: string
    min_order_value: string
    ends_at: string | null
    is_seller_scoped: boolean
}

function token(): string {
    if (typeof document === 'undefined') return ''
    const m = document.cookie.match(/_auth=([^;]+)/)
    return m ? decodeURIComponent(m[1]) : ''
}

function authHeaders(): Record<string, string> {
    const t = token()
    return t ? { Authorization: t.startsWith('Bearer ') ? t : `Bearer ${t}` } : {}
}

function failResult(code: string, errorCode: string, message: string): PromoResult {
    return {
        valid: false,
        code,
        discount_type: '',
        discount_amount: '0',
        free_shipping: false,
        description: '',
        error_code: errorCode,
        error_message: message,
    }
}

export async function validatePromo(code: string, cart: CartSnapshot): Promise<PromoResult> {
    if (!code || !code.trim()) {
        return failResult(code, 'not_found', 'Please enter a promo code.')
    }

    try {
        const res = await fetch(`${apiUrl}promos/validate/`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
                code: code.trim().toUpperCase(),
                subtotal: cart.subtotal,
                item_count: cart.item_count,
                item_ids: cart.item_ids ?? [],
                category_ids: cart.category_ids ?? [],
                seller_ids: cart.seller_ids ?? [],
                seller_subtotals: cart.seller_subtotals ?? {},
                session_key: cart.session_key ?? '',
            }),
        })

        if (res.status === 429) {
            return failResult(code, 'rate_limited', 'Too many attempts. Please try again later.')
        }

        const data = (await res.json()) as PromoResult
        return data
    } catch {
        return failResult(code, 'network_error', 'Could not validate code. Please try again.')
    }
}

export async function autoApplyPromo(cart: CartSnapshot): Promise<PromoResult | null> {
    try {
        const params = new URLSearchParams({
            subtotal: String(cart.subtotal),
            item_count: String(cart.item_count),
        })
        const res = await fetch(`${apiUrl}promos/auto/?${params}`, {
            method: 'GET',
            credentials: 'include',
            headers: { ...authHeaders() },
        })
        if (!res.ok) return null
        const data = await res.json()
        if (!data?.promo) return null
        return {
            valid: true,
            code: data.promo.code,
            discount_type: '',
            discount_amount: data.promo.discount_amount,
            free_shipping: !!data.promo.free_shipping,
            description: data.promo.description ?? '',
            error_code: '',
            error_message: '',
        }
    } catch {
        return null
    }
}

export interface SellerStorefrontPromo {
    code: string
    name: string
    description: string
    discount_type: string
    discount_value: string
    discount_label: string
    min_order_value: string
    ends_at: string | null
    redemptions_remaining: number | null
    first_order_only: boolean
}

export async function fetchSellerStorefrontPromos(
    sellerId: string
): Promise<SellerStorefrontPromo[]> {
    try {
        const res = await fetch(`${apiUrl}promos/store/${sellerId}/`, {
            credentials: 'include',
        })
        if (!res.ok) return []
        const data = await res.json()
        return (data?.promos ?? []) as SellerStorefrontPromo[]
    } catch {
        return []
    }
}

export async function listApplicablePromos(cart: CartSnapshot): Promise<PromoSummary[]> {
    try {
        const params = new URLSearchParams({
            subtotal: String(cart.subtotal),
            item_count: String(cart.item_count),
        })
        const res = await fetch(`${apiUrl}promos/applicable/?${params}`, {
            credentials: 'include',
        })
        if (!res.ok) return []
        const data = await res.json()
        return (data?.promos ?? []) as PromoSummary[]
    } catch {
        return []
    }
}
