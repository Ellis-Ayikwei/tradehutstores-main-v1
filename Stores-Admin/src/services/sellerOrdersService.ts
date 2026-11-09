/**
 * Seller order management. Built against the frozen contract in
 * `.claude/plans/20-seller-and-checkout-gaps.md` (section 4):
 *   O6  GET  /orders/seller/            ?status= &q= &page= &page_size=  (IsSeller, newest first)
 *   O6  GET  /orders/seller/<id>/       order detail for fulfilment
 *   O7  POST /orders/seller/<id>/ship/               {carrier, parcels, weight_kg, dates, contact, notes...} (tracking number is generated)
 *   O8  POST /orders/seller/<id>/cancel/             {reason}   (Processing only)
 *   O9  POST /orders/seller/<id>/confirm-delivery/   (COD only, cash collected)
 * None of the seller order writes require an Idempotency-Key in the contract (it is required on
 * checkout / pay / payouts only), so none is sent. Money values are decimal strings with a currency.
 *
 * Contract gaps (the shapes below mark these fields optional and the UI shows them only when present):
 *   - the buyer name field name and the address snapshot key names are not specified,
 *   - `pay_mode` is not listed on OrderRow/OrderDetail (needed to tell COD apart),
 *   - O6 defines no `ordering` parameter, so list sorting is not offered.
 */
import axios from 'axios';
import axiosInstance from './axiosInstance';
import type { Paginated, SellerApiError, SellerOrderRow } from './sellerStatsService';

export type { Paginated, SellerApiError, SellerOrderRow };

/** O6 list row. `pay_mode` is assumed (see header). */
export interface SellerOrderListRow extends SellerOrderRow {
    pay_mode?: string | null;
    /** Buyer's name, sent by the list endpoint (shipping name, else the account name). */
    buyer_name?: string | null;
}

export interface SellerOrderItem {
    id?: string;
    title: string;
    sku?: string;
    quantity: number;
    unit_price: string;
    total_price: string;
    product_id?: string | null;
    variant_id?: string | null;
    image?: string | null;
}

/** Address snapshot. Keys follow the `users.Address` model the snapshot is taken from. */
export interface OrderAddress {
    label?: string | null;
    full_name?: string | null;
    phone?: string | null;
    address?: string | null;
    address_line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
}

export interface OrderShipment {
    carrier: string;
    /** Issued by the platform when the order is shipped (e.g. TH7K2M9XQ4PD); nobody types it. */
    tracking_number: string;
    tracking_url?: string | null;
    /** The carrier's own waybill / reference, when there is one. */
    courier_reference?: string | null;
    service_level?: string | null;
    parcels?: number | null;
    weight_kg?: string | null;
    length_cm?: string | null;
    width_cm?: string | null;
    height_cm?: string | null;
    dispatch_date?: string | null;
    estimated_delivery_date?: string | null;
    contact_name?: string | null;
    contact_phone?: string | null;
    /** Shown to the buyer. */
    buyer_note?: string | null;
    /** Seller / staff only. */
    internal_note?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
}

export interface OrderTimelineEntry {
    status: string;
    at: string;
}

export interface SellerOrderDetail extends SellerOrderListRow {
    items: SellerOrderItem[];
    subtotal?: string | null;
    shipping_cost?: string | null;
    tax_amount?: string | null;
    promo_discount?: string | null;
    commission_amount?: string | null;
    /** Assumed name for the seller net the contract mentions ("commission, net"). */
    net_amount?: string | null;
    /** Address snapshot (contract: "address snapshot"); key name assumed. */
    address?: OrderAddress | null;
    shipping_address?: OrderAddress | null;
    /** Buyer name (contract: "buyer name"); field name assumed. */
    buyer_name?: string | null;
    buyer?: { name?: string | null; full_name?: string | null } | null;
    shipments?: OrderShipment[];
    timeline?: OrderTimelineEntry[];
    paid_at?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
    cancelled_at?: string | null;
    cancel_reason?: string | null;
}

/** The ship form. There is no tracking number: the platform generates one when the order is shipped. */
export interface ShipOrderInput {
    carrier: string;
    service_level?: string;
    /** The carrier's own waybill / reference (optional). */
    courier_reference?: string;
    tracking_url?: string;
    parcels?: number;
    weight_kg?: string;
    length_cm?: string;
    width_cm?: string;
    height_cm?: string;
    /** YYYY-MM-DD */
    dispatch_date?: string;
    estimated_delivery_date?: string;
    contact_name?: string;
    contact_phone?: string;
    buyer_note?: string;
    internal_note?: string;
}

/** The request body for a ship call: only the fields that have a value. */
export function buildShipBody(input: ShipOrderInput): Record<string, unknown> {
    const body: Record<string, unknown> = { carrier: input.carrier.trim() };
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
        const value = input[key]?.trim();
        if (value) body[key] = value;
    }
    if (input.parcels && input.parcels > 0) body.parcels = input.parcels;
    return body;
}

export interface SellerOrderListParams {
    page: number;
    pageSize: number;
    /** Order status value sent as `?status=` (Pending, Processing, Shipped, Delivered, Cancelled, Refunded). */
    status?: string;
    /** Free-text search (`q`: order id / buyer name). */
    q?: string;
}

export type OrderErrorKind = 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'network' | 'server' | 'unknown';

export interface OrderApiError extends Omit<SellerApiError, 'kind'> {
    kind: OrderErrorKind;
    /** Per-field messages from a 400, keyed by request field name. */
    fieldErrors?: Record<string, string>;
}

type OrderErrorContext = 'list' | 'detail' | 'action';

const CONFLICT_MESSAGES: Record<string, string> = {
    not_shippable: 'This order can no longer be shipped. Its status has changed, so it was refreshed.',
    not_cancellable: 'This order can no longer be cancelled. Its status has changed, so it was refreshed.',
    not_cod: 'Only cash on delivery orders can be confirmed this way.',
    not_shipped: 'Delivery can only be confirmed once the order has been shipped.',
};

function firstString(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.find((v): v is string => typeof v === 'string');
    return undefined;
}

/** Turns any thrown value into a message the UI can show. Never leaks raw axios text. */
export function toOrderError(err: unknown, context: OrderErrorContext): OrderApiError {
    if (!axios.isAxiosError(err)) {
        return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
    }
    const status = err.response?.status;
    const data = err.response?.data as Record<string, unknown> | undefined;
    const detail = typeof data?.detail === 'string' ? data.detail : undefined;
    const code = typeof data?.code === 'string' ? data.code : undefined;

    if (!err.response) {
        return { kind: 'network', message: "We can't reach the server. Check your connection and try again." };
    }
    if (status === 403) {
        return { kind: 'forbidden', status, code, message: detail || (context === 'action' ? "You don't have permission to change this order." : "This account doesn't have an active seller profile.") };
    }
    if (status === 404) {
        const message =
            context === 'detail' || context === 'action'
                ? 'This order was not found. It may have been removed, or it belongs to another seller.'
                : "Orders aren't available yet. Please try again later.";
        return { kind: 'not_found', status, code, message };
    }
    if (status === 409) {
        return { kind: 'conflict', status, code, message: (code && CONFLICT_MESSAGES[code]) || detail || 'This order changed in the meantime. It was refreshed; please check and try again.' };
    }
    if (status === 400 && data) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
            if (key === 'detail' || key === 'code') continue;
            const msg = firstString(value);
            if (msg) fieldErrors[key] = msg;
        }
        const message = detail || Object.values(fieldErrors)[0] || 'Please check the details and try again.';
        return { kind: 'validation', status, code, message, fieldErrors };
    }
    if (status && status >= 500) {
        return { kind: 'server', status, code, message: 'Something went wrong on our side. Please try again.' };
    }
    return { kind: 'unknown', status, code, message: detail || 'We could not complete this. Please try again.' };
}

export const sellerOrdersApi = {
    list: 'orders/seller/',
    detail: (id: string) => `orders/seller/${encodeURIComponent(id)}/`,
    ship: (id: string) => `orders/seller/${encodeURIComponent(id)}/ship/`,
    cancel: (id: string) => `orders/seller/${encodeURIComponent(id)}/cancel/`,
    confirmDelivery: (id: string) => `orders/seller/${encodeURIComponent(id)}/confirm-delivery/`,
};

export async function fetchSellerOrders({ page, pageSize, status, q }: SellerOrderListParams): Promise<Paginated<SellerOrderListRow>> {
    try {
        const params: Record<string, string | number> = { page, page_size: pageSize };
        if (status) params.status = status;
        if (q) params.q = q;
        const res = await axiosInstance.get<Paginated<SellerOrderListRow>>(sellerOrdersApi.list, { params });
        return res.data;
    } catch (err) {
        throw toOrderError(err, 'list');
    }
}

export async function fetchSellerOrder(id: string): Promise<SellerOrderDetail> {
    try {
        const res = await axiosInstance.get<SellerOrderDetail>(sellerOrdersApi.detail(id));
        return res.data;
    } catch (err) {
        throw toOrderError(err, 'detail');
    }
}

async function post(url: string, body: Record<string, unknown>): Promise<void> {
    try {
        await axiosInstance.post(url, body);
    } catch (err) {
        throw toOrderError(err, 'action');
    }
}

/** O7. Processing to Shipped. The server issues the tracking number. The same request again within 2 minutes returns 200. */
export function shipSellerOrder(id: string, input: ShipOrderInput): Promise<void> {
    return post(sellerOrdersApi.ship(id), buildShipBody(input));
}

/** O8. Processing only. */
export function cancelSellerOrder(id: string, reason: string): Promise<void> {
    return post(sellerOrdersApi.cancel(id), { reason: reason.trim() });
}

/** O9. COD only: the seller confirms the cash was collected on delivery. */
export function confirmSellerCodDelivery(id: string): Promise<void> {
    return post(sellerOrdersApi.confirmDelivery(id), {});
}
