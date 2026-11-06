import { CheckoutApiError, isBackendUnavailable, summariseQuote } from '@/lib/checkoutApi'
import type { QuoteSummary } from '@/lib/checkoutApi'

export type CheckoutErrorKind =
    | 'unavailable'
    | 'auth'
    | 'stock'
    | 'listing'
    | 'seller'
    | 'price_changed'
    | 'promo'
    | 'delivery'
    | 'payment_method'
    | 'address'
    | 'not_payable'
    | 'rate_limited'
    | 'server'
    | 'validation'
    | 'unknown'

export interface DescribedError {
    kind: CheckoutErrorKind
    message: string
    /** Variant the error is about (stock / listing). */
    variantId?: string
    available?: number
    /** Updated quote from a 409 price_changed. */
    quote?: QuoteSummary
}

function firstFieldError(extra: Record<string, unknown>): string | null {
    for (const value of Object.values(extra)) {
        const first = Array.isArray(value) ? value[0] : value
        if (typeof first === 'string' && first.trim()) return first
    }
    return null
}

/** Maps a checkout/quote/pay error to an inline message (contract section 3, P1/P2/O3 error list). */
export function describeCheckoutError(err: CheckoutApiError): DescribedError {
    if (isBackendUnavailable(err)) {
        return { kind: 'unavailable', message: "Online ordering isn't available right now." }
    }
    switch (err.code) {
        case 'address_not_found':
            return {
                kind: 'address',
                message: 'That delivery address could not be found. Choose another address or add a new one.',
            }
        case 'out_of_stock': {
            const available = Number(err.extra.available)
            const variantId = typeof err.extra.variant_id === 'string' ? err.extra.variant_id : undefined
            return {
                kind: 'stock',
                variantId,
                available: Number.isFinite(available) ? available : undefined,
                message:
                    Number.isFinite(available) && available > 0
                        ? `Stock changed: only ${available} left of an item in your order. Update the quantity and try again.`
                        : 'An item in your order is now out of stock. Remove it and try again.',
            }
        }
        case 'listing_unavailable':
            return {
                kind: 'listing',
                variantId: typeof err.extra.variant_id === 'string' ? err.extra.variant_id : undefined,
                message: 'An item in your order is no longer available. Remove it and try again.',
            }
        case 'seller_not_accepting_orders':
            return {
                kind: 'seller',
                message: 'A seller in your order is not accepting orders right now. Remove their items and try again.',
            }
        case 'price_changed':
            return {
                kind: 'price_changed',
                quote: err.extra.quote ? summariseQuote(err.extra.quote) : undefined,
                message: 'The price changed since you started checkout. Review the new total and place your order again.',
            }
        case 'invalid_promo': {
            const reason = typeof err.extra.reason === 'string' && err.extra.reason.trim() ? err.extra.reason : null
            return { kind: 'promo', message: reason ?? 'That promo code can’t be applied to this order.' }
        }
        case 'delivery_method_unavailable':
            return { kind: 'delivery', message: 'That delivery method isn’t available for this order. Choose another.' }
        case 'payment_method_unavailable':
            return { kind: 'payment_method', message: 'That payment method isn’t available for this order. Choose another.' }
        case 'order_not_payable':
        case 'not_pending':
            return {
                kind: 'not_payable',
                message: 'This order can no longer be paid online. It may already be paid, cancelled or past its payment deadline.',
            }
        default:
            break
    }
    if (err.status === 401) return { kind: 'auth', message: 'Please sign in to continue.' }
    if (err.status === 429) return { kind: 'rate_limited', message: 'Too many attempts. Please wait a moment and try again.' }
    if (err.status >= 500) {
        return {
            kind: 'server',
            message: 'Something went wrong on our side. Your order was not confirmed. Please try again.',
        }
    }
    if (err.status === 400 || err.status === 422) {
        return { kind: 'validation', message: firstFieldError(err.extra) ?? err.message ?? 'Please check your details and try again.' }
    }
    return { kind: 'unknown', message: err.message || 'Something went wrong. Please try again.' }
}

/** A 4xx means the request was rejected: the idempotency key must not be replayed. */
export function isClientRejection(err: CheckoutApiError): boolean {
    return err.status >= 400 && err.status < 500
}
