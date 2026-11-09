/**
 * Seller order management (storefront Seller Central).
 * Contract: .claude/plans/20-seller-and-checkout-gaps.md section 4 + the "seller Orders UI" addendum.
 *   O6  GET  orders/seller/            ?status= &q= &page= &page_size=   (newest first)
 *   O6  GET  orders/seller/<id>/       order detail for fulfilment
 *   O7  POST orders/seller/<id>/ship/               {carrier, tracking_number, tracking_url?}
 *   O8  POST orders/seller/<id>/cancel/             {reason}   (Processing only)
 *   O9  POST orders/seller/<id>/confirm-delivery/   (COD only, cash collected)
 * None of the seller order writes take an Idempotency-Key. Money values are decimal strings + currency.
 * Optional fields below are shown only when the API sends them; nothing is invented.
 */
import { sellerGet, sellerPost } from '@/lib/seller/client'
import { toSellerError, type SellerErrorKind } from '@/lib/seller/errors'

export interface Paginated<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

export interface SellerOrderListRow {
    id: string
    placed_at: string
    source?: 'cart' | 'auction' | 'rfq' | string
    order_status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded' | string
    payment_status: 'unpaid' | 'paid' | 'refunded' | 'partially_refunded' | string
    /** "COD" | "ONLINE" (addendum). Without it COD orders cannot be told apart. */
    pay_mode?: string | null
    total_amount: string
    currency: string
    item_count: number
    first_item: { title: string; image: string | null } | null
    payment_due_at: string | null
    buyer_name?: string | null
}

export interface SellerOrderItem {
    id?: string
    title: string
    sku?: string
    quantity: number
    unit_price: string
    total_price: string
    product_id?: string | null
    variant_id?: string | null
    image?: string | null
}

/** Shipping address snapshot taken at order time. */
export interface OrderAddress {
    full_name?: string | null
    phone?: string | null
    address?: string | null
    address_line2?: string | null
    city?: string | null
    state?: string | null
    postal_code?: string | null
    country?: string | null
}

export interface OrderShipment {
    carrier: string
    /** Issued by the platform when the order is shipped (e.g. TH7K2M9XQ4PD); sellers never type it. */
    tracking_number: string
    tracking_url?: string | null
    /** The carrier's own waybill / reference, when there is one. */
    courier_reference?: string | null
    service_level?: string | null
    parcels?: number | null
    weight_kg?: string | null
    length_cm?: string | null
    width_cm?: string | null
    height_cm?: string | null
    dispatch_date?: string | null
    estimated_delivery_date?: string | null
    contact_name?: string | null
    contact_phone?: string | null
    /** Shown to the buyer. */
    buyer_note?: string | null
    /** Seller / staff only. */
    internal_note?: string | null
    shipped_at?: string | null
    delivered_at?: string | null
}

export interface OrderTimelineEntry {
    status: string
    at: string
}

export interface SellerOrderDetail extends SellerOrderListRow {
    seller?: { id?: string; business_name?: string } | null
    items: SellerOrderItem[]
    subtotal?: string | null
    shipping_cost?: string | null
    tax_amount?: string | null
    promo_discount?: string | null
    commission_amount?: string | null
    net_amount?: string | null
    shipping_address?: OrderAddress | null
    shipments?: OrderShipment[]
    timeline?: OrderTimelineEntry[]
    paid_at?: string | null
    shipped_at?: string | null
    delivered_at?: string | null
    cancelled_at?: string | null
    cancel_reason?: string | null
}

/** The ship form. There is no tracking number: the platform generates one when the order is shipped. */
export interface ShipOrderInput {
    carrier: string
    service_level?: string
    /** The carrier's own waybill / reference (optional). */
    courier_reference?: string
    tracking_url?: string
    parcels?: number
    weight_kg?: string
    length_cm?: string
    width_cm?: string
    height_cm?: string
    /** YYYY-MM-DD */
    dispatch_date?: string
    estimated_delivery_date?: string
    contact_name?: string
    contact_phone?: string
    buyer_note?: string
    internal_note?: string
}

export interface SellerOrderListParams {
    page: number
    pageSize: number
    /** Order status sent as `?status=`. Empty = all. */
    status?: string
    q?: string
}

/* ------------------------------------------------------------------ status tabs */

export interface StatusTab {
    value: string
    label: string
    /** Value sent as `?status=`. Empty = all. */
    status: string
}

/** Tabs map onto the contract's `order_status` values (O6 `?status=`). */
export const STATUS_TABS: StatusTab[] = [
    { value: 'all', label: 'All', status: '' },
    { value: 'to-pay', label: 'To pay', status: 'Pending' },
    { value: 'to-ship', label: 'To ship', status: 'Processing' },
    { value: 'shipped', label: 'Shipped', status: 'Shipped' },
    { value: 'delivered', label: 'Delivered', status: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled', status: 'Cancelled' },
    { value: 'refunded', label: 'Refunded', status: 'Refunded' },
]

/** Accepts a tab slug (`to-ship`) or the raw contract status (`Processing`, any case). Unknown = All. */
export function tabFromParam(param: string | null | undefined): StatusTab {
    const v = (param ?? '').trim().toLowerCase()
    if (!v) return STATUS_TABS[0]
    return STATUS_TABS.find((t) => t.value === v || (t.status !== '' && t.status.toLowerCase() === v)) ?? STATUS_TABS[0]
}

/* ------------------------------------------------------------------ errors */

export type OrderErrorKind = SellerErrorKind

export interface OrderApiError {
    kind: OrderErrorKind
    message: string
    status?: number
    code?: string
    /** Per-field messages from a 400, keyed by request field name. */
    fieldErrors?: Record<string, string>
}

type OrderErrorContext = 'list' | 'detail' | 'action'

const CONFLICT_MESSAGES: Record<string, string> = {
    not_shippable: 'This order can no longer be shipped. Its status has changed, so it was refreshed.',
    not_cancellable: 'This order can no longer be cancelled. Its status has changed, so it was refreshed.',
    not_cod: 'Only cash on delivery orders can be confirmed this way.',
    not_shipped: 'Delivery can only be confirmed once the order has been shipped.',
    refund_in_progress: 'This order is being refunded, so it can no longer be shipped.',
    needs_manual_refund: 'Part of this order was paid in cash or by bank, so it can’t be cancelled here. Please contact support.',
    gateway_refund_unavailable: 'The refund can’t be sent right now, so the order was not cancelled. Please try again shortly.',
    refund_window_closed: 'This payment is too old to refund automatically, so the order was not cancelled. Please contact support.',
}

function isOrderApiError(value: unknown): value is OrderApiError {
    return typeof value === 'object' && value !== null && 'kind' in value && 'message' in value && !('raw' in value)
}

/** Turns any thrown value into a message the UI can show (built on `toSellerError`). */
export function toOrderError(err: unknown, context: OrderErrorContext): OrderApiError {
    if (isOrderApiError(err)) return err
    const e = toSellerError(err)
    const base: OrderApiError = { kind: e.kind, message: e.message, status: e.status ?? undefined, code: e.code ?? undefined }
    switch (e.kind) {
        case 'forbidden':
            return {
                ...base,
                message: typeof e.data.detail === 'string' && e.data.detail ? e.data.detail : context === 'action' ? "You don't have permission to change this order." : "This account doesn't have an active seller profile.",
            }
        case 'not_found':
            return {
                ...base,
                message: context === 'list' ? "Orders aren't available yet. Please try again later." : 'This order was not found. It may have been removed, or it belongs to another seller.',
            }
        case 'conflict':
            return {
                ...base,
                message: (e.code && CONFLICT_MESSAGES[e.code]) || (typeof e.data.detail === 'string' && e.data.detail) || 'This order changed in the meantime. It was refreshed; please check and try again.',
            }
        case 'validation':
            return { ...base, fieldErrors: e.fields }
        default:
            return base
    }
}

/** SWR key prefix of every orders list query (used to revalidate all pages/tabs after an action). */
export const ORDER_LIST_KEY = 'seller:orders:list'
export const orderDetailKey = (id: string) => ['seller:orders:detail', id] as const

export const sellerOrdersApi = {
    list: 'orders/seller/',
    detail: (id: string) => `orders/seller/${encodeURIComponent(id)}/`,
    ship: (id: string) => `orders/seller/${encodeURIComponent(id)}/ship/`,
    cancel: (id: string) => `orders/seller/${encodeURIComponent(id)}/cancel/`,
    confirmDelivery: (id: string) => `orders/seller/${encodeURIComponent(id)}/confirm-delivery/`,
}

export async function fetchSellerOrders({ page, pageSize, status, q }: SellerOrderListParams): Promise<Paginated<SellerOrderListRow>> {
    try {
        const params: Record<string, string | number> = { page, page_size: pageSize }
        if (status) params.status = status
        if (q) params.q = q
        return await sellerGet<Paginated<SellerOrderListRow>>(sellerOrdersApi.list, params)
    } catch (err) {
        throw toOrderError(err, 'list')
    }
}

export async function fetchSellerOrder(id: string): Promise<SellerOrderDetail> {
    try {
        return await sellerGet<SellerOrderDetail>(sellerOrdersApi.detail(id))
    } catch (err) {
        throw toOrderError(err, 'detail')
    }
}

async function post(url: string, body: Record<string, unknown>): Promise<void> {
    try {
        await sellerPost<unknown>(url, body)
    } catch (err) {
        throw toOrderError(err, 'action')
    }
}

/** O7. Processing to Shipped. The server issues the tracking number. The same request again within 2 minutes returns 200. */
export function shipSellerOrder(id: string, input: ShipOrderInput): Promise<void> {
    const body: Record<string, unknown> = { carrier: input.carrier.trim() }
    for (const key of [
        'service_level',
        'courier_reference',
        'tracking_url',
        'weight_kg',
        'length_cm',
        'width_cm',
        'height_cm',
        'dispatch_date',
        'estimated_delivery_date',
        'contact_name',
        'contact_phone',
        'buyer_note',
        'internal_note',
    ] as const) {
        const value = input[key]?.trim()
        if (value) body[key] = value
    }
    if (input.parcels && input.parcels > 0) body.parcels = input.parcels
    return post(sellerOrdersApi.ship(id), body)
}

/** O8. Processing only. A gateway-paid order is refunded in full automatically. */
export function cancelSellerOrder(id: string, reason: string): Promise<void> {
    return post(sellerOrdersApi.cancel(id), { reason: reason.trim() })
}

/** O9. COD only: the seller confirms the cash was collected on delivery. */
export function confirmSellerCodDelivery(id: string): Promise<void> {
    return post(sellerOrdersApi.confirmDelivery(id), {})
}
