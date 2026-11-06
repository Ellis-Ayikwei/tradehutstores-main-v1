/**
 * Seller dashboard overview data. Built against the frozen contract in
 * `.claude/plans/20-seller-and-checkout-gaps.md`:
 *   SE4  GET /sellers/me/stats/        (IsSeller)
 *   P6   GET /payments/seller/balance/ (IsSeller)
 *   O6   GET /orders/seller/           (IsSeller, paginated)
 * Money values are decimal strings with a currency code (contract section 0).
 */
import axios from 'axios';
import axiosInstance from './axiosInstance';

export interface SellerDailySales {
    /** YYYY-MM-DD */
    date: string;
    /** Decimal string */
    total: string;
}

export interface SellerStats {
    sales_30d: string;
    orders_30d: number;
    orders_to_ship: number;
    /** Variants with quantity <= 5 */
    low_stock_variants: number;
    active_listings: number;
    live_auctions: number;
    open_rfq_matches: number;
    currency: string;
    /**
     * NOT in contract SE4. Optional daily series (last 30 days) the sales chart renders when the
     * backend provides it. Proposed amendment; the chart is hidden while this is absent.
     */
    sales_by_day?: SellerDailySales[];
}

export interface SellerBalance {
    currency: string;
    pending: string;
    available: string;
    paid_out: string;
    min_payout: string;
}

export interface SellerOrderRow {
    id: string;
    placed_at: string;
    seller?: { id: string; business_name: string };
    source: 'cart' | 'auction' | 'rfq';
    order_status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Refunded' | string;
    payment_status: 'unpaid' | 'paid' | 'refunded' | 'partially_refunded' | string;
    total_amount: string;
    currency: string;
    item_count: number;
    first_item: { title: string; image: string | null } | null;
    payment_due_at: string | null;
}

export interface Paginated<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export type SellerApiErrorKind = 'forbidden' | 'not_found' | 'network' | 'server' | 'unknown';

export interface SellerApiError {
    kind: SellerApiErrorKind;
    message: string;
    status?: number;
    /** Contract error code (`{"detail", "code"}`) when the API sent one. */
    code?: string;
}

/** Turns any thrown value into a message the UI can show. Never leaks raw axios text. */
export function toSellerApiError(err: unknown): SellerApiError {
    if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data as { detail?: unknown; code?: unknown } | undefined;
        const detail = typeof data?.detail === 'string' ? data.detail : undefined;
        const code = typeof data?.code === 'string' ? data.code : undefined;

        if (!err.response) {
            return { kind: 'network', message: "We can't reach the server. Check your connection and try again." };
        }
        if (status === 403) {
            return { kind: 'forbidden', status, code, message: detail || "This account doesn't have an active seller profile." };
        }
        if (status === 404) {
            return { kind: 'not_found', status, code, message: 'This information is not available yet. Please try again later.' };
        }
        if (status && status >= 500) {
            return { kind: 'server', status, code, message: 'Something went wrong on our side. Please try again.' };
        }
        return { kind: 'unknown', status, code, message: detail || 'We could not load this. Please try again.' };
    }
    return { kind: 'unknown', message: 'We could not load this. Please try again.' };
}

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    try {
        const res = await axiosInstance.get<T>(url, { params });
        return res.data;
    } catch (err) {
        throw toSellerApiError(err);
    }
}

export const sellerStatsApi = {
    stats: 'sellers/me/stats/',
    balance: 'payments/seller/balance/',
    orders: 'orders/seller/',
};

export const fetchSellerStats = () => get<SellerStats>(sellerStatsApi.stats);

export const fetchSellerBalance = () => get<SellerBalance>(sellerStatsApi.balance);

/** Newest orders for the overview list. Assumes O6 returns newest first by default. */
export const fetchRecentSellerOrders = (pageSize = 5) => get<Paginated<SellerOrderRow>>(sellerStatsApi.orders, { page: 1, page_size: pageSize });

/** Formats a decimal string for display. Falls back to "CODE amount" if the currency code is unknown to Intl. */
export function formatMoney(amount: string | number | null | undefined, currency: string | undefined): string {
    if (amount === null || amount === undefined || amount === '') return '-';
    const n = Number(amount);
    if (!Number.isFinite(n)) return '-';
    if (!currency) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
    } catch {
        return `${currency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
}
