/**
 * Staff side of seller approval (ADM-A-SEL). Built against the frozen contract in
 * `.claude/plans/20-seller-and-checkout-gaps.md` (addendum "Seller self-onboarding with KYC", SE7):
 *   GET    sellers/admin/list/?status=&is_active=&q=&page=&page_size=   paginated application queue
 *   GET    sellers/admin/<id>/                                          full record for review
 *   PATCH  sellers/admin/<id>/    {verification_status, verification_notes, is_active, is_accepting_orders, commission_rate}
 *   DELETE sellers/admin/<id>/                                          soft deactivate (204)
 *   GET    sellers/admin/<id>/documents/
 *   PATCH  sellers/admin/documents/<doc_id>/  {status: 'approved' | 'rejected', note}
 * Errors are `{detail, code, ...}`; field errors are plain DRF 400 bodies. 409 `missing_documents` carries `missing: string[]`.
 */
import axios from 'axios';
import axiosInstance from './axiosInstance';
import type { SellerOrderListRow } from './sellerOrdersService';

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type BusinessType = 'individual' | 'registered_business';
/** Known kinds are `id_card`, `id_card_back`, `selfie_with_id`, `proof_of_address`, `business_registration`; unknown kinds are shown humanized. */
export type DocumentKind = string;

export interface Paginated<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface SellerOwner {
    id: string | number;
    username: string;
    email?: string | null;
    first_name?: string | null;
    last_name?: string | null;
}

export interface SellerListRow {
    id: string | number;
    business_name: string;
    business_type?: BusinessType | null;
    user: SellerOwner;
    verification_status: VerificationStatus;
    id_number_last4?: string | null;
    missing_documents?: DocumentKind[] | null;
    documents_count?: number | null;
    /** Category names the seller sells in (compact, for the queue). */
    selling_categories?: string[] | null;
    /** Free text for a category not in the catalog; non-empty means the catalog team may want to add it. */
    other_category?: string | null;
    /** "if present" in the contract. Falls back to `updated_on`/`updated_at` when the list provides those. */
    created_on?: string | null;
    updated_on?: string | null;
    updated_at?: string | null;
}

export interface SellerDocument {
    id: string | number;
    kind: DocumentKind;
    status: DocumentStatus;
    note?: string | null;
    uploaded_at?: string | null;
    file_url?: string | null;
}

export interface SellingCategory {
    id: string;
    name: string;
}

export interface SellerDetail extends Omit<SellerListRow, 'selling_categories'> {
    /** Detail carries ids and names. */
    selling_categories?: SellingCategory[] | null;
    id_type?: string | null;
    /** Full number, staff only. */
    id_number?: string | null;
    documents?: SellerDocument[] | null;
    bank_account_last4?: string | null;
    business_description?: string | null;
    business_email?: string | null;
    business_phone?: string | null;
    business_address?: string | null;
    business_registration_number?: string | null;
    tax_id?: string | null;
    verification_notes?: string | null;
    /** Not listed in the detail contract; shown when the API sends it. */
    verification_date?: string | null;
    commission_rate?: string | number | null;
    is_active?: boolean;
    is_accepting_orders?: boolean;
    return_policy?: string | null;
    shipping_policy?: string | null;
}

export interface SellerListParams {
    /** '' = all statuses. */
    status?: VerificationStatus | '';
    q?: string;
    page?: number;
    pageSize?: number;
    isActive?: boolean;
}

export interface SellerUpdate {
    verification_status?: VerificationStatus;
    verification_notes?: string;
    is_active?: boolean;
    is_accepting_orders?: boolean;
    commission_rate?: string | number;
}

export interface DocumentReview {
    status: 'approved' | 'rejected';
    note?: string;
}

export type AdminSellerErrorKind = 'forbidden' | 'not_found' | 'conflict' | 'validation' | 'network' | 'server' | 'unknown';

export interface AdminSellerError {
    kind: AdminSellerErrorKind;
    message: string;
    status?: number;
    code?: string;
    /** Required document kinds that are absent (409 `missing_documents`). */
    missing?: DocumentKind[];
    /** DRF field errors, first message per field. */
    fieldErrors?: Record<string, string>;
}

function firstMessage(value: unknown): string | undefined {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) {
        for (const item of value) {
            const found = firstMessage(item);
            if (found) return found;
        }
    }
    return undefined;
}

/** Turns any thrown value into a message the UI can show. Never leaks raw axios text. */
export function toAdminSellerError(err: unknown): AdminSellerError {
    if (!axios.isAxiosError(err)) return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
    if (!err.response) return { kind: 'network', message: "We can't reach the server. Check your connection and try again." };

    const status = err.response.status;
    const data = (err.response.data ?? {}) as Record<string, unknown>;
    const detail = typeof data.detail === 'string' ? data.detail : undefined;
    const code = typeof data.code === 'string' ? data.code : undefined;
    const missing = Array.isArray(data.missing) ? data.missing.filter((item): item is string => typeof item === 'string') : undefined;

    if (status === 403) return { kind: 'forbidden', status, code, message: detail || "You don't have permission to manage sellers." };
    if (status === 404) return { kind: 'not_found', status, code, message: detail || 'This seller could not be found. It may have been removed.' };
    if (status === 409) return { kind: 'conflict', status, code, missing, message: detail || 'This change conflicts with the seller’s current state. Refresh and try again.' };
    if (status >= 500) return { kind: 'server', status, code, message: 'Something went wrong on our side. Please try again.' };
    if (status === 400 && data && typeof data === 'object' && !detail) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
            const message = firstMessage(value);
            if (message) fieldErrors[key] = message;
        }
        const first = Object.values(fieldErrors)[0];
        return { kind: 'validation', status, code, fieldErrors, message: first || 'Please check the details and try again.' };
    }
    return { kind: status === 400 ? 'validation' : 'unknown', status, code, message: detail || 'We could not complete that. Please try again.' };
}

async function request<T>(call: () => Promise<{ data: T }>): Promise<T> {
    try {
        const res = await call();
        return res.data;
    } catch (err) {
        throw toAdminSellerError(err);
    }
}

export const adminSellersApi = {
    list: 'sellers/admin/list/',
    detail: (id: string | number) => `sellers/admin/${id}/`,
    documents: (id: string | number) => `sellers/admin/${id}/documents/`,
    document: (docId: string | number) => `sellers/admin/documents/${docId}/`,
    summary: (id: string | number) => `sellers/admin/${id}/summary/`,
    orders: (id: string | number) => `sellers/admin/${id}/orders/`,
    sold: (id: string | number) => `sellers/admin/${id}/sold/`,
    payouts: (id: string | number) => `sellers/admin/${id}/payouts/`,
};

export const fetchAdminSellers = ({ status = '', q = '', page = 1, pageSize = 25, isActive }: SellerListParams) =>
    request(() =>
        axiosInstance.get<Paginated<SellerListRow>>(adminSellersApi.list, {
            params: {
                status: status || undefined,
                is_active: isActive === undefined ? undefined : isActive,
                q: q.trim() || undefined,
                page,
                page_size: pageSize,
            },
        })
    );

export const fetchAdminSeller = (id: string | number) => request(() => axiosInstance.get<SellerDetail>(adminSellersApi.detail(id)));

export const updateAdminSeller = (id: string | number, body: SellerUpdate) => request(() => axiosInstance.patch<SellerDetail>(adminSellersApi.detail(id), body));

/** Soft deactivate (204). */
export const deactivateAdminSeller = (id: string | number) => request(() => axiosInstance.delete<void>(adminSellersApi.detail(id)));

export const fetchAdminSellerDocuments = (id: string | number) => request(() => axiosInstance.get<SellerDocument[] | Paginated<SellerDocument>>(adminSellersApi.documents(id)));

export const reviewAdminSellerDocument = (docId: string | number, body: DocumentReview) => request(() => axiosInstance.patch<SellerDocument>(adminSellersApi.document(docId), body));

// ----------------------------------------------------------------------------- money (staff only)
// Computed on the server from the seller's own order lines; see apps/sellers/finance.py for the rules.

export interface SellerFinanceSummary {
    currency: string;
    commission_rate: string;
    /** Days after delivery before earnings become payable. */
    hold_days: number;
    products: { total: number; available: number };
    orders: { total: number; by_status: Record<string, number> };
    units_sold: number;
    /** Goods value of every order that is not cancelled or refunded. */
    sold_gross: string;
    delivered_gross: string;
    /** Platform commission on delivered goods. */
    commission: string;
    /** Delivered goods the seller collected in cash (COD). */
    cod_gross: string;
    pending_earnings: string;
    available_earnings: string;
    paid_out: string;
    /** Available earnings less payouts. Negative means the seller owes the platform. */
    balance: string;
}

export interface SoldItem {
    product_id: string | null;
    title: string;
    units: number;
    revenue: string;
    orders: number;
}

export type PayoutMethod = 'bank_transfer' | 'mobile_money' | 'cash' | 'other';

export interface SellerPayoutRow {
    id: string;
    amount: string;
    currency: string;
    method: PayoutMethod;
    reference: string | null;
    note: string | null;
    paid_at: string;
    recorded_by: string | null;
}

export interface RecordPayoutInput {
    amount: string;
    method: PayoutMethod;
    reference?: string;
    note?: string;
}

export const fetchSellerSummary = (id: string | number) => request(() => axiosInstance.get<SellerFinanceSummary>(adminSellersApi.summary(id)));

export const fetchSellerSold = (id: string | number) => request(() => axiosInstance.get<SoldItem[]>(adminSellersApi.sold(id)));

export const fetchSellerOrders = (id: string | number, { status = '', q = '', page = 1, pageSize = 20 }: { status?: string; q?: string; page?: number; pageSize?: number }) =>
    request(() =>
        axiosInstance.get<Paginated<SellerOrderListRow>>(adminSellersApi.orders(id), {
            params: { status: status || undefined, q: q.trim() || undefined, page, page_size: pageSize },
        })
    );

export const fetchSellerPayouts = (id: string | number) => request(() => axiosInstance.get<SellerPayoutRow[]>(adminSellersApi.payouts(id)));

/** One key per submit attempt: a double click or a retry returns the first payout instead of paying twice. */
export const recordSellerPayout = (id: string | number, body: RecordPayoutInput, idempotencyKey: string) =>
    request(() => axiosInstance.post<SellerPayoutRow>(adminSellersApi.payouts(id), body, { headers: { 'Idempotency-Key': idempotencyKey } }));
