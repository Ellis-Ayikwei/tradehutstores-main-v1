/**
 * Staff & seller promo code API client.
 *
 * The same shape is used for both endpoints — the URL prefix decides scope:
 *   - admin codes:  promos/admin/codes/   (full CRUD across the platform)
 *   - seller codes: promos/seller/codes/  (CRUD over the requesting seller's only)
 *
 * The viewset infers the seller server-side, so seller writes don't pass it.
 */
import type { AxiosError } from 'axios';
import axiosInstance from './axiosInstance';

const ADMIN_BASE = 'promos/admin/codes/';
const ADMIN_REDEMPTIONS = 'promos/admin/redemptions/';
const ADMIN_REFERRALS = 'promos/admin/referrals/';
const SELLER_BASE = 'promos/seller/codes/';

// ── Types ───────────────────────────────────────────────────────────────────

export type DiscountType =
    | 'percentage'
    | 'fixed_amount'
    | 'free_shipping'
    | 'buy_x_get_y'
    | 'fixed_price';

export type TargetType = 'entire_order' | 'products' | 'categories' | 'seller_products';

export type UserSegment = 'all' | 'new' | 'returning' | 'logged_in' | 'specific';

export interface PromoCode {
    id: number;
    code: string;
    name: string;
    description: string;
    is_active: boolean;
    is_live: boolean;
    seller: string | null;
    seller_name: string | null;
    is_seller_scoped: boolean;
    discount_type: DiscountType;
    discount_value: string;
    discount_label: string;
    max_discount_amount: string | null;
    target_type: TargetType;
    min_order_value: string;
    min_items_count: number;
    max_redemptions: number | null;
    max_redemptions_per_user: number;
    current_redemptions: number;
    redemptions_remaining: number | null;
    starts_at: string | null;
    ends_at: string | null;
    auto_apply: boolean;
    auto_apply_priority: number;
    stackable: boolean;
    first_order_only: boolean;
    created_at: string;
    updated_at: string;
    // Detail-only
    products?: string[];
    categories?: string[];
    specific_users?: string[];
    buy_quantity?: number;
    get_quantity?: number;
    fixed_price?: string | null;
    include_free_shipping?: boolean;
    user_segment?: UserSegment;
}

export interface PromoCodeWritePayload {
    code: string;
    name: string;
    description?: string;
    is_active?: boolean;
    seller?: string | null;
    discount_type: DiscountType;
    discount_value: number;
    max_discount_amount?: number | null;
    buy_quantity?: number;
    get_quantity?: number;
    fixed_price?: number | null;
    target_type?: TargetType;
    products?: string[];
    categories?: string[];
    include_free_shipping?: boolean;
    min_order_value?: number;
    min_items_count?: number;
    user_segment?: UserSegment;
    specific_users?: string[];
    stackable?: boolean;
    first_order_only?: boolean;
    max_redemptions?: number | null;
    max_redemptions_per_user?: number;
    starts_at?: string | null;
    ends_at?: string | null;
    auto_apply?: boolean;
    auto_apply_priority?: number;
}

export interface PromoRedemption {
    id: number;
    promo: number;
    promo_code: string;
    user: string | null;
    user_email: string | null;
    order_id: string;
    session_key: string;
    discount_amount: string;
    order_subtotal: string;
    discount_type_snap: string;
    discount_value_snap: string;
    created_at: string;
}

export interface PromoStats {
    total_codes: number;
    active_codes: number;
    platform_codes: number;
    seller_codes: number;
    redemptions_30d: number;
    discount_given_30d: number;
}

export interface SellerPromoStats {
    total_codes: number;
    active_codes: number;
    redemptions_30d: number;
    discount_given_30d: number;
}

export interface PromoFilter {
    seller?: string;
    platform_only?: boolean;
    is_active?: boolean;
    q?: string;
}

// ── Admin (platform) ────────────────────────────────────────────────────────

function listUrl(base: string, filter: PromoFilter = {}): string {
    const params = new URLSearchParams();
    if (filter.seller) params.set('seller', filter.seller);
    if (filter.platform_only) params.set('platform_only', '1');
    if (filter.is_active === true) params.set('is_active', '1');
    if (filter.is_active === false) params.set('is_active', '0');
    if (filter.q) params.set('q', filter.q);
    return params.toString() ? `${base}?${params}` : base;
}

export async function fetchAdminPromos(filter: PromoFilter = {}): Promise<PromoCode[]> {
    const { data } = await axiosInstance.get(listUrl(ADMIN_BASE, filter));
    return Array.isArray(data) ? data : (data as { results?: PromoCode[] }).results ?? [];
}

export async function fetchAdminPromo(id: number): Promise<PromoCode> {
    const { data } = await axiosInstance.get<PromoCode>(`${ADMIN_BASE}${id}/`);
    return data;
}

export async function createAdminPromo(body: PromoCodeWritePayload): Promise<PromoCode> {
    const { data } = await axiosInstance.post<PromoCode>(ADMIN_BASE, body);
    return data;
}

export async function patchAdminPromo(
    id: number,
    body: Partial<PromoCodeWritePayload>
): Promise<PromoCode> {
    const { data } = await axiosInstance.patch<PromoCode>(`${ADMIN_BASE}${id}/`, body);
    return data;
}

export async function deleteAdminPromo(id: number): Promise<void> {
    await axiosInstance.delete(`${ADMIN_BASE}${id}/`);
}

export async function toggleAdminPromo(id: number): Promise<PromoCode> {
    const { data } = await axiosInstance.post<PromoCode>(`${ADMIN_BASE}${id}/toggle/`);
    return data;
}

export async function adminPromoStats(): Promise<PromoStats> {
    const { data } = await axiosInstance.get<PromoStats>(`${ADMIN_BASE}stats/`);
    return data;
}

export async function bulkGenerate(
    template_id: number,
    count: number,
    prefix?: string
): Promise<{ created: number; codes: string[] }> {
    const { data } = await axiosInstance.post(`${ADMIN_BASE}bulk-generate/`, {
        template_id,
        count,
        prefix,
    });
    return data;
}

// ── Redemptions / Referrals ─────────────────────────────────────────────────

export async function fetchRedemptions(promoId?: number): Promise<PromoRedemption[]> {
    const url = promoId ? `${ADMIN_REDEMPTIONS}?promo=${promoId}` : ADMIN_REDEMPTIONS;
    const { data } = await axiosInstance.get(url);
    return Array.isArray(data) ? data : (data as { results?: PromoRedemption[] }).results ?? [];
}

// ── Seller-scoped ───────────────────────────────────────────────────────────

export async function fetchSellerPromos(filter: PromoFilter = {}): Promise<PromoCode[]> {
    const { data } = await axiosInstance.get(listUrl(SELLER_BASE, filter));
    return Array.isArray(data) ? data : (data as { results?: PromoCode[] }).results ?? [];
}

export async function createSellerPromo(body: PromoCodeWritePayload): Promise<PromoCode> {
    const { data } = await axiosInstance.post<PromoCode>(SELLER_BASE, body);
    return data;
}

export async function patchSellerPromo(
    id: number,
    body: Partial<PromoCodeWritePayload>
): Promise<PromoCode> {
    const { data } = await axiosInstance.patch<PromoCode>(`${SELLER_BASE}${id}/`, body);
    return data;
}

export async function deleteSellerPromo(id: number): Promise<void> {
    await axiosInstance.delete(`${SELLER_BASE}${id}/`);
}

export async function toggleSellerPromo(id: number): Promise<PromoCode> {
    const { data } = await axiosInstance.post<PromoCode>(`${SELLER_BASE}${id}/toggle/`);
    return data;
}

export async function sellerPromoStats(): Promise<SellerPromoStats> {
    const { data } = await axiosInstance.get<SellerPromoStats>(`${SELLER_BASE}stats/`);
    return data;
}

// ── Errors ──────────────────────────────────────────────────────────────────

export function promosAdminErrorMessage(err: unknown): string {
    const ax = err as AxiosError<{ detail?: string; [k: string]: unknown }>;
    if (ax.response?.data) {
        const d = ax.response.data as Record<string, unknown>;
        if (typeof d.detail === 'string') return d.detail;
        const first = Object.entries(d)[0];
        if (first && Array.isArray(first[1]) && typeof (first[1] as string[])[0] === 'string') {
            return `${first[0]}: ${(first[1] as string[])[0]}`;
        }
    }
    if (ax.response?.status === 403) {
        return 'Forbidden — your account does not have access to manage these promos.';
    }
    return ax.message || 'Request failed';
}

// ── Constants ───────────────────────────────────────────────────────────────

export const DISCOUNT_TYPES: { value: DiscountType; label: string; color: string }[] = [
    { value: 'percentage', label: 'Percentage off', color: '#6366f1' },
    { value: 'fixed_amount', label: 'Fixed amount off (GHS)', color: '#0ea5e9' },
    { value: 'free_shipping', label: 'Free shipping', color: '#10b981' },
    { value: 'buy_x_get_y', label: 'Buy X get Y', color: '#f97316' },
    { value: 'fixed_price', label: 'Fixed cart price', color: '#8b5cf6' },
];

export const TARGET_TYPES: { value: TargetType; label: string }[] = [
    { value: 'entire_order', label: 'Entire order' },
    { value: 'products', label: 'Specific products' },
    { value: 'categories', label: 'Specific categories' },
    { value: 'seller_products', label: "All of seller's products" },
];

export const USER_SEGMENTS: { value: UserSegment; label: string }[] = [
    { value: 'all', label: 'All customers' },
    { value: 'new', label: 'New customers (first order)' },
    { value: 'returning', label: 'Returning customers' },
    { value: 'logged_in', label: 'Logged-in only' },
    { value: 'specific', label: 'Specific user IDs' },
];

export function emptyDraft(): PromoCodeWritePayload {
    return {
        code: '',
        name: '',
        description: '',
        is_active: true,
        seller: null,
        discount_type: 'percentage',
        discount_value: 10,
        max_discount_amount: null,
        buy_quantity: 0,
        get_quantity: 0,
        fixed_price: null,
        target_type: 'entire_order',
        products: [],
        categories: [],
        include_free_shipping: false,
        min_order_value: 0,
        min_items_count: 0,
        user_segment: 'all',
        specific_users: [],
        stackable: false,
        first_order_only: false,
        max_redemptions: null,
        max_redemptions_per_user: 1,
        starts_at: null,
        ends_at: null,
        auto_apply: false,
        auto_apply_priority: 0,
    };
}
