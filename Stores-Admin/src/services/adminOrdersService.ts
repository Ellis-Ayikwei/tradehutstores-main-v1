/**
 * Staff order management (Admin app).
 *   GET orders/?status=&limit=   flat array, newest first (max 1000)   - apps/orders/admin_views.AdminOrderListView
 *   GET orders/<id>/             one order, every seller's lines       - apps/orders/admin_views.AdminOrderDetailView
 * Both are staff only (403 for buyers and sellers).
 */
import axios from 'axios';
import axiosInstance from './axiosInstance';
import { buildShipBody, toOrderError } from './sellerOrdersService';
import type { OrderAddress, OrderApiError, OrderShipment, OrderTimelineEntry, ShipOrderInput } from './sellerOrdersService';

export type { OrderAddress, OrderApiError, OrderShipment, OrderTimelineEntry, ShipOrderInput };

/** List row. Statuses are already mapped for the Admin vocabulary by the API. */
export interface AdminOrderRow {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    /** A JSON number (base currency). */
    total_amount: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    payment_status: 'pending' | 'paid' | 'refunded';
    items_count: number;
    shipping_address: string;
    created_at: string;
    updated_at: string | null;
}

export interface AdminOrderItem {
    id: string;
    title: string;
    sku: string;
    quantity: number;
    unit_price: string | null;
    total_price: string | null;
    product_id: string | null;
    variant_id: string | null;
    image: string | null;
    seller: string | null;
}

export interface AdminOrderDetail {
    id: string;
    order_number: string;
    /** Raw order status: Pending, Processing, Shipped, Delivered, Cancelled, Refunded. */
    order_status: string;
    /** Raw payment status: unpaid, paid, refunded, partially_refunded. */
    payment_status: string;
    pay_mode: string;
    delivery_method: string | null;
    currency: string;
    placed_at: string | null;
    paid_at: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    estimated_delivery_date: string | null;
    customer: { name: string; email: string };
    items: AdminOrderItem[];
    subtotal: string | null;
    shipping_cost: string | null;
    tax_amount: string | null;
    promo_code: string | null;
    promo_discount: string | null;
    total_amount: string | null;
    shipping_address: OrderAddress | null;
    shipments: OrderShipment[];
    timeline: OrderTimelineEntry[];
    /** Payment ledger rows (online, cash on delivery, recorded by hand). */
    payments: AdminOrderPayment[];
    amount_paid: string;
    amount_outstanding: string;
    /** Refunds on this order (a gateway refund stays "pending" until the gateway confirms it). */
    refunds: AdminOrderRefund[];
    /** What the server allows right now. The page shows buttons from this, not its own rules. */
    actions: {
        /** Shipping details can be added or corrected at any time, whatever the status. */
        edit_shipping?: boolean;
        ship: boolean;
        confirm_delivery: boolean;
        cancel: boolean;
        /** Why an unshipped order cannot be cancelled (e.g. cash that must be paid back by hand first). */
        cancel_blocker: { code: string; message: string } | null;
        /** True when cancelling returns money to the buyer automatically. */
        cancel_refunds_buyer: boolean;
    };
}

export interface AdminOrderRefund {
    id: string;
    payment_id: string;
    status: 'pending' | 'succeeded' | 'failed' | string;
    provider: string;
    amount: string | null;
    currency: string;
    reason: string | null;
    failure_note: string | null;
    created_at: string | null;
    processed_at: string | null;
}

export interface AdminOrderPayment {
    id: string;
    provider: string;
    method: string | null;
    status: string;
    amount: string | null;
    currency: string;
    reference: string | null;
    paid_at: string | null;
    note: string | null;
}

export interface AdminOrderError {
    kind: 'forbidden' | 'not_found' | 'network' | 'server' | 'unknown';
    message: string;
}

export function toAdminOrderError(err: unknown): AdminOrderError {
    if (!axios.isAxiosError(err)) return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
    if (!err.response) return { kind: 'network', message: "We can't reach the server. Check your connection and try again." };
    const status = err.response.status;
    if (status === 403 || status === 401) return { kind: 'forbidden', message: 'Only staff accounts can view orders.' };
    if (status === 404) return { kind: 'not_found', message: 'This order was not found. It may have been removed.' };
    if (status >= 500) return { kind: 'server', message: 'Something went wrong on our side. Please try again.' };
    return { kind: 'unknown', message: 'We could not load this. Please try again.' };
}

/** `status` is a lowercase Admin status or empty for all. The API caps the list at `limit` rows. */
export async function fetchAdminOrders(status = '', limit = 1000): Promise<AdminOrderRow[]> {
    try {
        const params: Record<string, string | number> = { limit };
        if (status) params.status = status;
        const res = await axiosInstance.get<AdminOrderRow[]>('orders/', { params });
        return Array.isArray(res.data) ? res.data : [];
    } catch (err) {
        throw toAdminOrderError(err);
    }
}

export async function fetchAdminOrder(id: string): Promise<AdminOrderDetail> {
    try {
        const res = await axiosInstance.get<AdminOrderDetail>(`orders/${encodeURIComponent(id)}/`);
        return res.data;
    } catch (err) {
        throw toAdminOrderError(err);
    }
}

async function act(url: string, body?: Record<string, unknown>): Promise<AdminOrderDetail> {
    try {
        const res = await axiosInstance.post<AdminOrderDetail>(url, body ?? {});
        return res.data;
    } catch (err) {
        // Same error vocabulary as the seller screens (field errors on a 400, readable text on a 409).
        throw toOrderError(err, 'action');
    }
}

const orderUrl = (id: string, action: string) => `orders/${encodeURIComponent(id)}/${action}/`;

/** Processing -> Shipped. Works on any seller's order. */
export function shipAdminOrder(id: string, input: ShipOrderInput): Promise<AdminOrderDetail> {
    return act(orderUrl(id, 'ship'), buildShipBody(input));
}

/** Shipped -> Delivered. Cash-on-delivery orders are also recorded as paid. */
export function confirmAdminDelivery(id: string): Promise<AdminOrderDetail> {
    return act(orderUrl(id, 'confirm-delivery'));
}

/** Pending/Processing -> Cancelled; stock goes back. A gateway-paid order is refunded in full automatically. */
export function cancelAdminOrder(id: string, reason: string): Promise<AdminOrderDetail> {
    return act(orderUrl(id, 'cancel'), { reason: reason.trim() });
}

/** Fields staff may correct on a shipment. The platform's tracking number is not one of them. */
export interface ShippingPatch {
    carrier?: string;
    service_level?: string;
    courier_reference?: string;
    tracking_url?: string;
    parcels?: number;
    weight_kg?: string | null;
    length_cm?: string | null;
    width_cm?: string | null;
    height_cm?: string | null;
    dispatch_date?: string | null;
    estimated_delivery_date?: string | null;
    contact_name?: string;
    contact_phone?: string;
    buyer_note?: string;
    internal_note?: string;
}

/** Add or correct shipping details on any order, whatever its status. Before shipping only the estimate can be set. */
export async function updateAdminShipping(id: string, patch: ShippingPatch): Promise<AdminOrderDetail> {
    try {
        const res = await axiosInstance.patch<AdminOrderDetail>(`orders/${encodeURIComponent(id)}/`, patch);
        return res.data;
    } catch (err) {
        throw toOrderError(err, 'action');
    }
}
