import axios from 'axios'
import axiosInstance from '@/lib/axiosInstance'
import { recordServerTime } from '@/hooks/useServerClock'

/**
 * Bid Central client. Implements `.claude/plans/10-auctions.md` section 7 (A1-A8).
 * Money values are decimal strings from the API; never use floats for bid maths (see cents helpers).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DisplayStatus = 'scheduled' | 'live' | 'ending_soon' | 'ended' | 'cancelled'
export type StoredStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'
export type MyStatus = 'winning' | 'outbid' | 'won' | 'lost'
export type AuctionResult = 'sold' | 'bought_now' | 'reserve_not_met' | 'no_bids'
export type AuctionListStatus = 'live' | 'ending_soon' | 'scheduled' | 'ended'
export type AuctionSort = 'ending_soonest' | 'newest' | 'price_asc' | 'price_desc' | 'most_bids'

export interface AuctionSeller {
    id: string
    business_name: string
    store_slug?: string | null
    is_verified: boolean
    rating?: number | string | null
}

export interface AuctionCardData {
    id: string
    title: string
    image: string | null
    currency: string
    starting_price: string
    current_price: string | null
    next_min_bid: string
    bid_count: number
    buy_now_price?: string | null
    buy_now_available: boolean
    starts_at: string
    ends_at: string
    display_status: DisplayStatus
    reserve_met: boolean | null
    seller: AuctionSeller
    product_id: string
    is_watching: boolean
}

export interface AuctionState {
    id: string
    status: StoredStatus
    display_status: DisplayStatus
    currency: string
    starting_price: string
    current_price: string | null
    min_increment: string
    next_min_bid: string
    bid_count: number
    starts_at: string
    ends_at: string
    reserve_met: boolean | null
    buy_now_price: string | null
    buy_now_available: boolean
    leading_bidder: string | null
    my_status: MyStatus | null
    my_highest_bid: string | null
    is_watching: boolean
    result: AuctionResult | null
    order_id: string | null
    /** Winner only. Present in the BE state payload, not in the frozen contract. */
    payment_due_at?: string | null
    server_time: string
}

export interface AuctionBid {
    amount: string
    bidder: string
    placed_at: string
    is_me: boolean
    is_buy_now: boolean
}

/** The contract says `images[]` without a shape; accept plain URLs or `{image|url}` objects. */
export type AuctionImageRef = string | { image?: string | null; url?: string | null }

export interface AuctionDetail extends AuctionState {
    title: string
    description: string
    quantity: number
    soft_close_seconds: number
    images: AuctionImageRef[]
    product: { id: string; name: string; slug?: string | null; category?: { id: string; name: string } | null } | null
    variant: {
        id: string
        sku?: string | null
        name?: string | null
        attributes?: Array<{ name: string; value: string }>
    } | null
    seller: AuctionSeller
    recent_bids: AuctionBid[]
    watch_count: number
}

export interface Paginated<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
    server_time?: string
}

export interface MyBidRow extends AuctionCardData {
    my_status: MyStatus
    my_highest_bid: string | null
    order_id: string | null
    order_payment_status: string | null
    /** NOT in the frozen contract (gap). Rendered only if the API supplies it. */
    order_payment_due_at?: string | null
}

export interface ListAuctionsParams {
    status?: AuctionListStatus
    category?: string
    seller?: string
    q?: string
    sort?: AuctionSort
    page?: number
    page_size?: number
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AuctionsApiError extends Error {
    status: number
    code: string | null
    extra: Record<string, unknown>
    /** True when no HTTP response was received (offline, DNS, CORS, timeout). */
    isNetwork: boolean

    constructor(message: string, status: number, code: string | null, extra: Record<string, unknown>, isNetwork: boolean) {
        super(message)
        this.name = 'AuctionsApiError'
        this.status = status
        this.code = code
        this.extra = extra
        this.isNetwork = isNetwork
    }
}

/** Normalises axios errors into the contract shape `{detail, code, ...extra}`. */
export function toApiError(err: unknown): AuctionsApiError {
    if (err instanceof AuctionsApiError) return err
    if (axios.isAxiosError(err)) {
        const status = err.response?.status ?? 0
        const body = err.response?.data
        if (body && typeof body === 'object' && !Array.isArray(body)) {
            const { detail, code, ...extra } = body as Record<string, unknown>
            return new AuctionsApiError(
                typeof detail === 'string' ? detail : err.message,
                status,
                typeof code === 'string' ? code : null,
                extra,
                false
            )
        }
        return new AuctionsApiError(err.message, status, null, {}, !err.response)
    }
    return new AuctionsApiError(err instanceof Error ? err.message : 'Unknown error', 0, null, {}, true)
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

function serverTimeOf(data: unknown, headers: unknown): string | undefined {
    if (data && typeof data === 'object' && 'server_time' in data) {
        const st = (data as { server_time?: unknown }).server_time
        if (typeof st === 'string') return st
    }
    const h = headers as { date?: unknown } | undefined
    return typeof h?.date === 'string' ? h.date : undefined
}

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    const t0 = Date.now()
    try {
        const res = await axiosInstance.get<T>(path, { params })
        recordServerTime(serverTimeOf(res.data, res.headers), t0, Date.now())
        return res.data
    } catch (err) {
        throw toApiError(err)
    }
}

async function send<T>(
    method: 'post' | 'delete',
    path: string,
    body: Record<string, unknown>,
    idempotencyKey?: string
): Promise<T> {
    const t0 = Date.now()
    try {
        const res = await axiosInstance.request<T>({
            method,
            url: path,
            data: body,
            headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
        })
        recordServerTime(serverTimeOf(res.data, res.headers), t0, Date.now())
        return res.data
    } catch (err) {
        throw toApiError(err)
    }
}

function clean<T extends object>(params: T): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') out[k] = v
    }
    return out
}

// ---------------------------------------------------------------------------
// Endpoints (prefix is the axios baseURL: /tradehut/api/v1/)
// ---------------------------------------------------------------------------

/** A1 */
export const fetchAuctions = (params: ListAuctionsParams) =>
    get<Paginated<AuctionCardData>>('auctions/', clean(params))

/** A2 */
export const fetchAuction = (id: string) => get<AuctionDetail>(`auctions/${encodeURIComponent(id)}/`)

/** A3 (no-store, polled) */
export const fetchAuctionState = (id: string) => get<AuctionState>(`auctions/${encodeURIComponent(id)}/state/`)

/** A4 */
export const fetchAuctionBids = (id: string, page = 1) =>
    get<Paginated<AuctionBid>>(`auctions/${encodeURIComponent(id)}/bids/`, clean({ page }))

/** A5. 201 new bid / 200 replay; both return the same body. */
export const placeBid = (id: string, amount: string, idempotencyKey: string) =>
    send<{ bid: { id: string; amount: string; placed_at: string }; state: AuctionState }>(
        'post',
        `auctions/${encodeURIComponent(id)}/bids/`,
        { amount },
        idempotencyKey
    )

/** A6 */
export const buyNow = (id: string, idempotencyKey: string) =>
    send<{ order_id: string; state: AuctionState }>(
        'post',
        `auctions/${encodeURIComponent(id)}/buy-now/`,
        {},
        idempotencyKey
    )

/** A7 */
export const setWatching = (id: string, watching: boolean) =>
    send<{ is_watching: boolean }>(watching ? 'post' : 'delete', `auctions/${encodeURIComponent(id)}/watch/`, {})

/** A8 */
export const fetchMyBidding = (params: { my_status?: MyStatus; page?: number; page_size?: number }) =>
    get<Paginated<MyBidRow>>('auctions/me/bidding/', clean(params))

// ---------------------------------------------------------------------------
// Money helpers (integer cents; the API quantises to 2 dp)
// ---------------------------------------------------------------------------

export function toCents(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') return null
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) return null
    return Math.round(n * 100)
}

export function centsToAmount(cents: number): string {
    return (cents / 100).toFixed(2)
}

/** Strict user input: digits with optional 1-2 decimals. Returns cents or null. */
export function parseAmountInput(raw: string): number | null {
    const s = raw.trim().replace(/,/g, '')
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
    const cents = toCents(s)
    return cents !== null && cents > 0 ? cents : null
}

export function formatMoney(value: string | number | null | undefined, currency: string): string {
    const n = typeof value === 'number' ? value : Number(value)
    if (value === null || value === undefined || !Number.isFinite(n)) return '-'
    try {
        return new Intl.NumberFormat('en', {
            style: 'currency',
            currency,
            currencyDisplay: 'narrowSymbol',
        }).format(n)
    } catch {
        return `${currency} ${n.toFixed(2)}`
    }
}

export function numberOf(value: string | null | undefined): number {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
}

/** Normalises `images[]` to absolute-or-relative URL strings. */
export function imageUrls(detail: Pick<AuctionDetail, 'images'>): string[] {
    const out: string[] = []
    for (const ref of detail.images ?? []) {
        const url = typeof ref === 'string' ? ref : (ref?.image ?? ref?.url ?? '')
        if (url) out.push(url)
    }
    return out
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

export function isBiddable(status: DisplayStatus): boolean {
    return status === 'live' || status === 'ending_soon'
}

export function isFinished(status: DisplayStatus): boolean {
    return status === 'ended' || status === 'cancelled'
}

export function bidCountLabel(n: number): string {
    if (n <= 0) return 'No bids yet'
    return `${n.toLocaleString()} ${n === 1 ? 'bid' : 'bids'}`
}

export function describeSeconds(seconds: number): string {
    if (seconds % 60 === 0) {
        const m = seconds / 60
        return `${m} ${m === 1 ? 'minute' : 'minutes'}`
    }
    return `${seconds} seconds`
}
