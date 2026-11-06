import axios from 'axios'
import axiosInstance from '@/lib/axiosInstance'

/**
 * Checkout / payments / order-pay client.
 * Implements `.claude/plans/20-seller-and-checkout-gaps.md` endpoints P1 (checkout), P2 (quote),
 * P3 (start payment), P5 (verify), O2 (order detail) and O3 (pay an existing order).
 *
 * IMPLEMENTED, NOT EXERCISED: at the time of writing the backend does not serve these routes yet.
 * Callers must treat `isBackendUnavailable()` errors honestly and never fake a result.
 */

// ---------------------------------------------------------------------------
// Types (contract shapes; money values are decimal strings)
// ---------------------------------------------------------------------------

export type PaymentMethodId = 'paystack' | 'cod'

export interface CheckoutItemInput {
    variant_id: string
    quantity: number
}

export interface QuoteBody {
    items: CheckoutItemInput[]
    address_id: string
    delivery_method?: string
    promo_code?: string
}

export interface CheckoutBody extends QuoteBody {
    payment_method: PaymentMethodId
    /** Money string from the last quote; the backend answers 409 price_changed when it differs. */
    expected_total?: string
}

export interface QuoteOrder {
    id?: string
    seller?: { id: string; business_name: string } | null
    subtotal?: string | number | null
    shipping_cost?: string | number | null
    tax_amount?: string | number | null
    promo_discount?: string | number | null
    total_amount?: string | number | null
}

/** Normalised view of a P2 `CartQuote` (the contract does not freeze its shape; see summariseQuote). */
export interface QuoteSummary {
    currency: string | null
    subtotal: number | null
    shipping: number | null
    tax: number | null
    promo: number | null
    total: number | null
    /** Money string to send back as `expected_total`. */
    totalText: string | null
    orders: QuoteOrder[]
}

export interface PaymentInfo {
    provider: string
    authorization_url: string
    reference: string
}

export interface CheckoutResult {
    checkout_id: string
    status: string
    currency: string
    amount: string
    orders: QuoteOrder[]
    payment: PaymentInfo | null
    payment_error?: string
}

export interface OrderItemRow {
    title: string
    sku?: string
    quantity: number
    unit_price: string | number
    total_price: string | number
    product_id?: string
    variant_id?: string
    image?: string | null
}

export interface OrderDetail {
    id: string
    placed_at?: string
    seller?: { id: string; business_name: string } | null
    source?: string
    order_status: string
    payment_status: string
    total_amount: string | number
    currency: string
    item_count?: number
    payment_due_at?: string | null
    items?: OrderItemRow[]
    /** The contract lists these without exact keys; both spellings are read. */
    subtotal?: string | number | null
    shipping_cost?: string | number | null
    shipping?: string | number | null
    tax_amount?: string | number | null
    tax?: string | number | null
    promo_discount?: string | number | null
    promo?: string | number | null
}

export interface VerifyResult {
    status: string
    orders: Array<{ id: string; order_status: string; payment_status: string }>
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class CheckoutApiError extends Error {
    status: number
    code: string | null
    extra: Record<string, unknown>
    /** True when no HTTP response was received (offline, DNS, CORS, timeout). */
    isNetwork: boolean
    isAborted: boolean

    constructor(
        message: string,
        status: number,
        code: string | null,
        extra: Record<string, unknown>,
        isNetwork: boolean,
        isAborted = false
    ) {
        super(message)
        this.name = 'CheckoutApiError'
        this.status = status
        this.code = code
        this.extra = extra
        this.isNetwork = isNetwork
        this.isAborted = isAborted
    }
}

/** Normalises axios errors into the contract shape `{detail, code, ...extra}`. */
export function toCheckoutError(err: unknown): CheckoutApiError {
    if (err instanceof CheckoutApiError) return err
    if (axios.isCancel(err)) return new CheckoutApiError('Request cancelled', 0, null, {}, false, true)
    if (axios.isAxiosError(err)) {
        const status = err.response?.status ?? 0
        const body = err.response?.data
        if (body && typeof body === 'object' && !Array.isArray(body)) {
            const { detail, code, ...extra } = body as Record<string, unknown>
            return new CheckoutApiError(
                typeof detail === 'string' ? detail : err.message,
                status,
                typeof code === 'string' ? code : null,
                extra,
                false
            )
        }
        return new CheckoutApiError(err.message, status, null, {}, !err.response)
    }
    return new CheckoutApiError(err instanceof Error ? err.message : 'Unknown error', 0, null, {}, true)
}

/**
 * True when the route is missing or the server cannot be reached: network failure, 501, gateway
 * errors, or a 404 without a contract `code` (a real contract 404 always carries one).
 */
export function isBackendUnavailable(err: CheckoutApiError): boolean {
    if (err.isAborted) return false
    if (err.isNetwork || err.status === 0) return true
    if (err.status === 501 || err.status === 502 || err.status === 503 || err.status === 504) return true
    return err.status === 404 && !err.code
}

// ---------------------------------------------------------------------------
// Money helpers (integer cents; the API quantises to 2 dp)
// ---------------------------------------------------------------------------

export function moneyToCents(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return null
    return Math.round(n * 100)
}

export function centsToText(cents: number): string {
    return (cents / 100).toFixed(2)
}

/** Safe number for display: never NaN. */
export function moneyToNumber(value: unknown): number | null {
    const c = moneyToCents(value)
    return c === null ? null : c / 100
}

function sumCents(rows: QuoteOrder[], key: keyof QuoteOrder): number | null {
    let total = 0
    let seen = false
    for (const row of rows) {
        const c = moneyToCents(row[key])
        if (c !== null) {
            total += c
            seen = true
        }
    }
    return seen ? total : null
}

/**
 * Reads a P2 response. Top-level totals win; otherwise per-seller `orders[]` are summed
 * (same field names as the P1 response). Anything the backend does not send stays `null`.
 */
export function summariseQuote(raw: unknown): QuoteSummary {
    const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
    const orders = Array.isArray(data.orders) ? (data.orders as QuoteOrder[]) : []
    const pick = (names: string[], key: keyof QuoteOrder): number | null => {
        for (const n of names) {
            const c = moneyToCents(data[n])
            if (c !== null) return c
        }
        return sumCents(orders, key)
    }
    const subtotal = pick(['subtotal', 'items_subtotal'], 'subtotal')
    const shipping = pick(['shipping_cost', 'shipping'], 'shipping_cost')
    const tax = pick(['tax_amount', 'tax'], 'tax_amount')
    const promo = pick(['promo_discount', 'discount_amount', 'promo'], 'promo_discount')
    const total = pick(['total_amount', 'total', 'amount'], 'total_amount')
    return {
        currency: typeof data.currency === 'string' ? data.currency : null,
        subtotal: subtotal === null ? null : subtotal / 100,
        shipping: shipping === null ? null : shipping / 100,
        tax: tax === null ? null : tax / 100,
        promo: promo === null ? null : promo / 100,
        total: total === null ? null : total / 100,
        totalText: total === null ? null : centsToText(total),
        orders,
    }
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

async function request<T>(
    method: 'get' | 'post',
    path: string,
    options: { body?: Record<string, unknown>; params?: Record<string, unknown>; idempotencyKey?: string; signal?: AbortSignal } = {}
): Promise<T> {
    try {
        const res = await axiosInstance.request<T>({
            method,
            url: path,
            data: options.body,
            params: options.params,
            signal: options.signal,
            headers: options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : undefined,
        })
        return res.data
    } catch (err) {
        throw toCheckoutError(err)
    }
}

// ---------------------------------------------------------------------------
// Endpoints (prefix is the axios baseURL: /tradehut/api/v1/)
// ---------------------------------------------------------------------------

/** P2: price the cart without writing anything. */
export async function quoteCheckout(body: QuoteBody, signal?: AbortSignal): Promise<QuoteSummary> {
    const raw = await request<unknown>('post', 'checkout/quote/', { body: { ...body }, signal })
    return summariseQuote(raw)
}

/** P1: create orders + checkout session. 201 new, 200 replay (same body). */
export const placeCheckout = (body: CheckoutBody, idempotencyKey: string) =>
    request<CheckoutResult>('post', 'checkout/', { body: { ...body }, idempotencyKey })

/** P3: (re)initialise payment for a pending session. */
export const startPayment = (checkoutId: string) =>
    request<{ payment: PaymentInfo | null }>('post', `checkout/${encodeURIComponent(checkoutId)}/payment/`, {
        body: {},
    })

/** P5: verify a Paystack reference (same code path as the webhook). */
export const verifyPayment = (reference: string) =>
    request<VerifyResult>('get', 'payments/paystack/verify/', { params: { reference } })

/** O2 */
export const fetchOrder = (id: string) => request<OrderDetail>('get', `orders/${encodeURIComponent(id)}/`)

/** O3: pay an existing Pending order (auction win / RFQ award). Online only. */
export const payOrder = (id: string, body: { address_id: string; delivery_method?: string }, idempotencyKey: string) =>
    request<CheckoutResult>('post', `orders/${encodeURIComponent(id)}/pay/`, {
        body: { ...body },
        idempotencyKey,
    })

// ---------------------------------------------------------------------------
// Idempotency key + result persistence (sessionStorage; survives the Paystack round trip)
// ---------------------------------------------------------------------------

const IDEM_STORAGE_KEY = 'th:checkout:idem'
const RESULT_STORAGE_KEY = 'th:checkout:result'
const CART_CLEAR_STORAGE_KEY = 'th:checkout:clear-cart'
const PROMO_STORAGE_KEY = 'th:promo-code'

interface IdemEntry {
    fingerprint: string
    key: string
}

function readStore<T>(storageKey: string): T | null {
    if (typeof window === 'undefined') return null
    try {
        const raw = window.sessionStorage.getItem(storageKey)
        return raw ? (JSON.parse(raw) as T) : null
    } catch {
        return null
    }
}

function writeStore(storageKey: string, value: unknown | null): void {
    if (typeof window === 'undefined') return
    try {
        if (value === null) window.sessionStorage.removeItem(storageKey)
        else window.sessionStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
        /* storage unavailable (private mode): the key simply is not reused across reloads */
    }
}

/** Fixed key order so the same logical payload always produces the same fingerprint. */
export function fingerprintOf(scope: string, body: Record<string, unknown>): string {
    const items = Array.isArray(body.items)
        ? [...(body.items as CheckoutItemInput[])].sort((a, b) => a.variant_id.localeCompare(b.variant_id))
        : undefined
    return JSON.stringify([
        scope,
        items,
        body.address_id ?? null,
        body.delivery_method ?? null,
        body.payment_method ?? null,
        body.promo_code ?? null,
        body.expected_total ?? null,
    ])
}

/** Reuses the stored key when the payload is unchanged (retry); otherwise issues a new one. */
export function idempotencyKeyFor(fingerprint: string): string {
    const stored = readStore<IdemEntry>(IDEM_STORAGE_KEY)
    if (stored && stored.fingerprint === fingerprint && stored.key) return stored.key
    const key = crypto.randomUUID()
    writeStore(IDEM_STORAGE_KEY, { fingerprint, key } satisfies IdemEntry)
    return key
}

/** Call after any 4xx (the request was rejected, so the key must not be replayed) and on success. */
export function clearIdempotencyKey(): void {
    writeStore(IDEM_STORAGE_KEY, null)
}

export interface StoredCheckout {
    checkout_id: string
    status: string
    provider: string | null
    reference: string | null
    currency: string
    amount: string
    orders: QuoteOrder[]
}

export function rememberCheckout(result: CheckoutResult, providerFallback: PaymentMethodId): void {
    writeStore(RESULT_STORAGE_KEY, {
        checkout_id: result.checkout_id,
        status: result.status,
        provider: result.payment?.provider ?? providerFallback,
        reference: result.payment?.reference ?? null,
        currency: result.currency,
        amount: result.amount,
        orders: result.orders ?? [],
    } satisfies StoredCheckout)
}

export function recallCheckout(): StoredCheckout | null {
    return readStore<StoredCheckout>(RESULT_STORAGE_KEY)
}

export function forgetCheckout(): void {
    writeStore(RESULT_STORAGE_KEY, null)
}

/** Cart line ids to remove once the order is confirmed (cart checkout only; never buy-now). */
export function markCartForClearing(lineIds: string[]): void {
    writeStore(CART_CLEAR_STORAGE_KEY, lineIds)
}

export function takeCartLinesToClear(): string[] {
    const ids = readStore<string[]>(CART_CLEAR_STORAGE_KEY)
    writeStore(CART_CLEAR_STORAGE_KEY, null)
    return Array.isArray(ids) ? ids : []
}

export function savePromoCode(code: string | null): void {
    writeStore(PROMO_STORAGE_KEY, code)
}

export function loadPromoCode(): string | null {
    const code = readStore<string>(PROMO_STORAGE_KEY)
    return typeof code === 'string' && code.trim() ? code.trim() : null
}

/** Only follow https redirects handed back by the backend. */
export function isSafeRedirect(url: string | null | undefined): url is string {
    if (!url) return false
    try {
        return new URL(url).protocol === 'https:'
    } catch {
        return false
    }
}
