/**
 * Seller auctions (storefront Seller Central).
 * Contract: .claude/plans/10-auctions.md section 7 "Seller" rows S1 to S5, serializers in
 * Stores-BE/apps/auctions/serializers.py.
 *   S1 GET   auctions/seller/            ?status= &q= &page= &page_size=   (newest first)
 *   S2 POST  auctions/seller/            header Idempotency-Key; 201 created, 200 replay
 *   S3 GET   auctions/seller/<id>/       detail with `bids` (last 50)
 *   S4 PATCH auctions/seller/<id>/       any create field except variant_id / quantity
 *   S5 POST  auctions/seller/<id>/cancel/ {reason?}
 * Money is a decimal string in GHS major units. Send strings, never numbers. Times are ISO 8601 UTC.
 * Error body: `{detail, code, ...extra}` or DRF field errors.
 */
import { sellerGet, sellerPatch, sellerPost } from '@/lib/seller/client'
import { toSellerError, type SellerErrorKind } from '@/lib/seller/errors'
import type { Paginated } from '@/lib/seller/orders'

/** TRADEHUT_STORE_BASE_CURRENCY. The server stores every auction in the base currency. */
export const AUCTION_CURRENCY = 'GHS'

/* ------------------------------------------------------------------ types */

/** What the buyer sees: derived from status and the clock on the server. */
export type AuctionDisplayStatus = 'scheduled' | 'live' | 'ending_soon' | 'ended' | 'cancelled'
/** Stored status. A scheduled or live auction past `ends_at` is displayed as ended until the closer runs. */
export type AuctionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled'
export type AuctionResult = 'sold' | 'bought_now' | 'reserve_not_met' | 'no_bids'
export type AuctionSettlement = 'not_applicable' | 'pending_order' | 'order_created'

/** One row of S1 (AuctionCard plus the seller fields). */
export interface SellerAuctionRow {
    id: string
    title: string
    image: string | null
    currency: string
    starting_price: string
    /** Null until the first bid. */
    current_price: string | null
    next_min_bid: string
    bid_count: number
    /** The server only sends this while a buy-now can still happen (live, no bids). */
    buy_now_price: string | null
    buy_now_available: boolean
    starts_at: string
    ends_at: string
    display_status: AuctionDisplayStatus
    /** Null when there is no reserve. */
    reserve_met: boolean | null
    product_id: string
    status: AuctionStatus
    reserve_price: string | null
    result: AuctionResult | null
    winner_display: string | null
    original_ends_at: string | null
    settlement_status: AuctionSettlement
    payment_due_at: string | null
    order_id: string | null
    order_status: string | null
    payment_status: string | null
}

export interface SellerAuctionBid {
    amount: string
    bidder_display: string
    placed_at: string
    is_buy_now: boolean
}

/** S3 / S2 / S4 / S5 response (AuctionDetail plus the seller fields). Only the fields this UI reads are typed. */
export interface SellerAuctionDetail {
    id: string
    status: AuctionStatus
    display_status: AuctionDisplayStatus
    currency: string
    title: string
    description: string
    quantity: number
    soft_close_seconds: number
    images: string[]
    starting_price: string
    current_price: string | null
    min_increment: string
    next_min_bid: string
    bid_count: number
    starts_at: string
    ends_at: string
    original_ends_at: string | null
    reserve_price: string | null
    reserve_met: boolean | null
    /** Only sent while buy-now can still happen (live, no bids). Never sent for a scheduled auction. */
    buy_now_price: string | null
    buy_now_available: boolean
    result: AuctionResult | null
    winner_display: string | null
    order_id: string | null
    order_status: string | null
    payment_status: string | null
    settlement_status: AuctionSettlement
    payment_due_at: string | null
    cancel_reason: string | null
    watch_count: number
    product: { id: string; name: string; slug: string; category: { id: string; name: string } | null }
    variant: { id: string; sku: string; name: string | null; attributes: { name: string | null; value: string | null }[] }
    bids: SellerAuctionBid[]
    /** Server clock when the response was built. */
    server_time: string
}

/** S2 / S4 body. Money fields are decimal strings. */
export interface AuctionWriteBody {
    variant_id?: string
    title?: string
    description?: string
    quantity?: number
    starting_price?: string
    min_increment?: string
    reserve_price?: string | null
    buy_now_price?: string | null
    starts_at?: string
    ends_at?: string
    soft_close_seconds?: number
}

export interface SellerAuctionListParams {
    page: number
    pageSize: number
    /** Display status or `cancelled`. Empty = all. */
    status?: string
    q?: string
}

/* ------------------------------------------------------------------ tabs */

export interface AuctionTab {
    value: string
    label: string
    /** Sent as `?status=`. Values come from `filter_by_display_status` plus `cancelled`. */
    status: string
}

/** `live` on the server excludes the last hour, which has its own `ending_soon` value, so it gets its own tab. */
export const AUCTION_TABS: AuctionTab[] = [
    { value: 'all', label: 'All', status: '' },
    { value: 'live', label: 'Live', status: 'live' },
    { value: 'ending_soon', label: 'Ending soon', status: 'ending_soon' },
    { value: 'scheduled', label: 'Upcoming', status: 'scheduled' },
    { value: 'ended', label: 'Ended', status: 'ended' },
    { value: 'cancelled', label: 'Cancelled', status: 'cancelled' },
]

/** Accepts a tab value. Anything unknown is All. */
export function auctionTabFromParam(param: string | null | undefined): AuctionTab {
    const v = (param ?? '').trim().toLowerCase()
    return AUCTION_TABS.find((t) => t.value === v) ?? AUCTION_TABS[0]
}

/* ------------------------------------------------------------------ errors */

/** A failed request as a plain object, so SWR can hold it. */
export interface AuctionApiError {
    kind: SellerErrorKind
    message: string
    status?: number
    code?: string
    /** Server field errors, keyed by request field name. */
    fieldErrors: Record<string, string>
    /** `insufficient_stock` only: units the variant currently has. */
    available?: number
}

export type AuctionErrorContext = 'list' | 'detail' | 'create' | 'edit' | 'cancel'

const CODE_MESSAGES: Record<string, string> = {
    seller_not_verified: 'Only verified sellers can run auctions. Finish verification in Settings first.',
    variant_not_found: 'That variant was not found in your listings. Pick it again.',
    not_editable: 'This auction can no longer be edited. It has started, has bids or was cancelled. The page was refreshed.',
    not_cancellable: 'This auction cannot be cancelled because it has bids or has ended. The page was refreshed.',
    bad_filter: 'That filter is not valid.',
}

function isAuctionApiError(value: unknown): value is AuctionApiError {
    return typeof value === 'object' && value !== null && 'kind' in value && 'fieldErrors' in value && !('raw' in value)
}

/** Turns any thrown value into a message and field errors the UI can show (built on `toSellerError`). */
export function toAuctionError(err: unknown, context: AuctionErrorContext): AuctionApiError {
    if (isAuctionApiError(err)) return err
    const e = toSellerError(err)
    const base: AuctionApiError = { kind: e.kind, message: e.message, status: e.status ?? undefined, code: e.code ?? undefined, fieldErrors: {} }
    if (e.code && CODE_MESSAGES[e.code]) base.message = CODE_MESSAGES[e.code]
    if (e.code === 'insufficient_stock') {
        const available = Number(e.data.available)
        base.available = Number.isFinite(available) ? available : undefined
        base.message = base.available === undefined ? 'There is not enough stock for this lot.' : `Not enough stock for this lot. ${base.available} available.`
        base.fieldErrors = { quantity: base.message }
        return base
    }
    switch (e.kind) {
        case 'forbidden':
            if (!e.code) base.message = context === 'list' || context === 'detail' ? "This account doesn't have an active seller profile." : "You don't have permission to do this."
            return base
        case 'not_found':
            base.message =
                e.code === 'variant_not_found'
                    ? CODE_MESSAGES.variant_not_found
                    : context === 'list'
                      ? "Auctions aren't available yet. Please try again later."
                      : 'This auction was not found. It may have been removed, or it belongs to another seller.'
            return base
        case 'validation':
            base.fieldErrors = e.fields
            return base
        default:
            return base
    }
}

/* ------------------------------------------------------------------ api */

/** SWR key prefix of every auctions list query. */
export const AUCTION_LIST_KEY = 'seller:auctions:list'
export const auctionDetailKey = (id: string) => ['seller:auctions:detail', id] as const

export const sellerAuctionsApi = {
    list: 'auctions/seller/',
    detail: (id: string) => `auctions/seller/${encodeURIComponent(id)}/`,
    cancel: (id: string) => `auctions/seller/${encodeURIComponent(id)}/cancel/`,
}

export async function fetchSellerAuctions({ page, pageSize, status, q }: SellerAuctionListParams): Promise<Paginated<SellerAuctionRow>> {
    try {
        return await sellerGet<Paginated<SellerAuctionRow>>(sellerAuctionsApi.list, { page, page_size: pageSize, status, q })
    } catch (err) {
        throw toAuctionError(err, 'list')
    }
}

export async function fetchSellerAuction(id: string): Promise<SellerAuctionDetail> {
    try {
        return await sellerGet<SellerAuctionDetail>(sellerAuctionsApi.detail(id))
    } catch (err) {
        throw toAuctionError(err, 'detail')
    }
}

/** S2. Reuse the same `idempotencyKey` to retry the same submit; the server replays instead of creating a second auction. */
export async function createSellerAuction(body: AuctionWriteBody, idempotencyKey: string): Promise<SellerAuctionDetail> {
    try {
        return await sellerPost<SellerAuctionDetail>(sellerAuctionsApi.list, body, { headers: { 'Idempotency-Key': idempotencyKey } })
    } catch (err) {
        throw toAuctionError(err, 'create')
    }
}

/** S4. Only while scheduled, before the start time and with no bids. */
export async function updateSellerAuction(id: string, body: AuctionWriteBody): Promise<SellerAuctionDetail> {
    try {
        return await sellerPatch<SellerAuctionDetail>(sellerAuctionsApi.detail(id), body)
    } catch (err) {
        throw toAuctionError(err, 'edit')
    }
}

/** S5. Only with no bids and before it has ended. Cancelling again is a no-op on the server. */
export async function cancelSellerAuction(id: string, reason: string): Promise<SellerAuctionDetail> {
    try {
        const trimmed = reason.trim()
        return await sellerPost<SellerAuctionDetail>(sellerAuctionsApi.cancel(id), trimmed ? { reason: trimmed } : {})
    } catch (err) {
        throw toAuctionError(err, 'cancel')
    }
}

/* ------------------------------------------------------------------ form model */

/** The auction form as typed. Keys match the API field names so server field errors map straight back. */
export interface AuctionFormValues {
    title: string
    description: string
    quantity: string
    starting_price: string
    min_increment: string
    reserve_price: string
    buy_now_price: string
    /** `datetime-local` value in the seller's local time. */
    starts_at: string
    /** `datetime-local` value in the seller's local time. */
    ends_at: string
    soft_close_seconds: string
}

export type AuctionFormField = keyof AuctionFormValues | 'variant_id'
export type AuctionFormErrors = Partial<Record<AuctionFormField, string>>

export const DEFAULT_SOFT_CLOSE_SECONDS = 120
export const MAX_SOFT_CLOSE_SECONDS = 600
export const MAX_TITLE_LENGTH = 200
export const DURATION_PRESET_DAYS = [1, 3, 7, 14] as const

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MIN_DURATION_MS = HOUR
const MAX_DURATION_MS = 14 * DAY
const START_GRACE_MS = 5 * MINUTE
const MAX_START_AHEAD_MS = 30 * DAY

const pad = (n: number) => String(n).padStart(2, '0')

/** Date to a `datetime-local` value in local time (minute precision). */
export function toLocalInput(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `datetime-local` value (local time) to a Date, or null when empty or invalid. */
export function fromLocalInput(value: string): Date | null {
    if (!value) return null
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

const MONEY_PATTERN = /^\d{1,10}(\.\d{1,2})?$/

/** Decimal string to integer pesewas for exact comparison. Null when it is not a valid amount of at least 0.01. */
function toPesewas(value: string): number | null {
    const v = value.trim()
    if (!MONEY_PATTERN.test(v)) return null
    const [whole, frac = ''] = v.split('.')
    const pesewas = Number(whole) * 100 + Number(frac.padEnd(2, '0'))
    return pesewas >= 1 ? pesewas : null
}

export function emptyAuctionForm(now: Date): AuctionFormValues {
    return {
        title: '',
        description: '',
        quantity: '1',
        starting_price: '',
        min_increment: '',
        reserve_price: '',
        buy_now_price: '',
        starts_at: toLocalInput(now),
        ends_at: toLocalInput(new Date(now.getTime() + 7 * DAY)),
        soft_close_seconds: String(DEFAULT_SOFT_CLOSE_SECONDS),
    }
}

/** Form values for editing an existing auction. The buy-now price is blank because the API hides it before the start. */
export function formFromDetail(a: SellerAuctionDetail): AuctionFormValues {
    return {
        title: a.title,
        description: a.description ?? '',
        quantity: String(a.quantity),
        starting_price: a.starting_price,
        min_increment: a.min_increment,
        reserve_price: a.reserve_price ?? '',
        buy_now_price: a.buy_now_price ?? '',
        starts_at: toLocalInput(new Date(a.starts_at)),
        ends_at: toLocalInput(new Date(a.ends_at)),
        soft_close_seconds: String(a.soft_close_seconds),
    }
}

export interface ValidateOptions {
    mode: 'create' | 'edit'
    /** Create only: start immediately (the start field is ignored and the server uses its own clock). */
    startNow: boolean
    /** Create only: units the chosen variant has. Null while no variant is chosen. */
    stock: number | null
    now: Date
}

/**
 * Mirrors `AuctionWriteSerializer` on the server: reserve at least the start price, buy-now above both,
 * duration 1 hour to 14 days, start between 5 minutes ago and 30 days ahead. The server stays the authority.
 * In edit mode a blank buy-now means "keep the current one" because the API does not return it before the start.
 */
export function validateAuctionForm(values: AuctionFormValues, { mode, startNow, stock, now }: ValidateOptions): AuctionFormErrors {
    const errors: AuctionFormErrors = {}
    const title = values.title.trim()
    if (!title) errors.title = 'Enter a title.'
    else if (title.length > MAX_TITLE_LENGTH) errors.title = `Keep the title under ${MAX_TITLE_LENGTH} characters.`

    if (mode === 'create') {
        const qty = Number(values.quantity)
        if (!/^\d+$/.test(values.quantity.trim()) || qty < 1) errors.quantity = 'Enter a whole number of at least 1.'
        else if (stock !== null && qty > stock) errors.quantity = `Only ${stock} in stock for this variant.`
    }

    const moneyMessage = 'Enter an amount of at least 0.01 with up to 2 decimals.'
    const start = toPesewas(values.starting_price)
    if (start === null) errors.starting_price = moneyMessage
    if (toPesewas(values.min_increment) === null) errors.min_increment = moneyMessage

    const reserveText = values.reserve_price.trim()
    const reserve = reserveText ? toPesewas(reserveText) : null
    if (reserveText && reserve === null) errors.reserve_price = moneyMessage
    else if (reserve !== null && start !== null && reserve < start) errors.reserve_price = 'The reserve must be at least the starting price.'

    const buyNowText = values.buy_now_price.trim()
    const buyNow = buyNowText ? toPesewas(buyNowText) : null
    if (buyNowText && buyNow === null) errors.buy_now_price = moneyMessage
    else if (buyNow !== null && start !== null && buyNow <= Math.max(start, reserve ?? 0)) errors.buy_now_price = 'Buy now must be above the starting price and the reserve.'

    let startMs = now.getTime()
    if (!(mode === 'create' && startNow)) {
        const startsAt = fromLocalInput(values.starts_at)
        if (!startsAt) errors.starts_at = 'Choose a start time.'
        else {
            startMs = startsAt.getTime()
            if (startMs < now.getTime() - START_GRACE_MS || startMs > now.getTime() + MAX_START_AHEAD_MS) errors.starts_at = 'Start must be within the next 30 days.'
        }
    }
    const endsAt = fromLocalInput(values.ends_at)
    if (!endsAt) errors.ends_at = 'Choose an end time.'
    else if (!errors.starts_at) {
        const duration = endsAt.getTime() - startMs
        if (duration < MIN_DURATION_MS || duration > MAX_DURATION_MS) errors.ends_at = 'An auction must run between 1 hour and 14 days.'
    }

    const soft = values.soft_close_seconds.trim()
    if (!/^\d+$/.test(soft) || Number(soft) > MAX_SOFT_CLOSE_SECONDS) errors.soft_close_seconds = `Enter 0 to ${MAX_SOFT_CLOSE_SECONDS} seconds.`
    return errors
}

/** Request body for S2. Optional fields are left out when blank; money stays a string; times become ISO UTC. */
export function buildCreateBody(values: AuctionFormValues, variantId: string, startNow: boolean): AuctionWriteBody {
    const body: AuctionWriteBody = {
        variant_id: variantId,
        title: values.title.trim(),
        quantity: Number(values.quantity),
        starting_price: values.starting_price.trim(),
        min_increment: values.min_increment.trim(),
        ends_at: (fromLocalInput(values.ends_at) as Date).toISOString(),
        soft_close_seconds: Number(values.soft_close_seconds),
    }
    const description = values.description.trim()
    if (description) body.description = description
    if (values.reserve_price.trim()) body.reserve_price = values.reserve_price.trim()
    if (values.buy_now_price.trim()) body.buy_now_price = values.buy_now_price.trim()
    if (!startNow) body.starts_at = (fromLocalInput(values.starts_at) as Date).toISOString()
    return body
}

/**
 * Request body for S4. `quantity` and `variant_id` are never sent (the server rejects them).
 * A blank reserve or buy-now clears the stored value (the form is prefilled with both).
 */
export function buildEditBody(values: AuctionFormValues): AuctionWriteBody {
    return {
        title: values.title.trim(),
        description: values.description.trim(),
        starting_price: values.starting_price.trim(),
        min_increment: values.min_increment.trim(),
        reserve_price: values.reserve_price.trim() || null,
        buy_now_price: values.buy_now_price.trim() || null,
        starts_at: (fromLocalInput(values.starts_at) as Date).toISOString(),
        ends_at: (fromLocalInput(values.ends_at) as Date).toISOString(),
        soft_close_seconds: Number(values.soft_close_seconds),
    }
}
