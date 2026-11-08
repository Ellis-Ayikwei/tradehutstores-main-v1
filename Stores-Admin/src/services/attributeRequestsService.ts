/**
 * "Request a new option value" (for example a new colour, Mustard). Option values stay staff-managed;
 * sellers ask, staff approve or reject.
 *
 * Seller:
 *   POST catalog/attribute-value-requests/            {attribute, value_name, color_code?, note?}
 *        201 request | 409 {code:'value_exists', detail, value} | 409 {code:'already_requested', request} | 429 {code:'too_many_requests'}
 *   GET  catalog/attribute-value-requests/mine/?status=   paginated
 * Staff:
 *   GET  catalog/admin/attribute-value-requests/?status=&attribute=&q=   paginated, rows include `requester`
 *   POST catalog/admin/attribute-value-requests/<id>/approve/   {value_name?, color_code?}
 *   POST catalog/admin/attribute-value-requests/<id>/reject/    {review_note} (5+ characters)
 *        409 {code:'already_reviewed'}
 */
import axios from 'axios';
import axiosInstance from './axiosInstance';
import type { Paginated } from './sellerStatsService';

export type { Paginated };

/** `duplicate` = approved, but linked to a value that already existed. */
export type AttributeRequestStatus = 'pending' | 'approved' | 'rejected' | 'duplicate';

export interface CreatedValueRef {
    id: string;
    value_name?: string | null;
    color_code?: string | null;
}

export interface AttributeValueRequest {
    id: string;
    attribute: { id: string; name: string };
    value_name: string;
    color_code: string;
    note: string;
    status: AttributeRequestStatus;
    review_note: string;
    created_on: string;
    /** The value that now exists for this request (set once approved). Sent as an id or an object; both are handled. */
    created_value: string | CreatedValueRef | null;
    /** Staff list only. */
    requester?: { id: string; email?: string | null; store_name?: string | null } | null;
}

/** Id of the value created or linked by an approved request, if any. */
export function createdValueId(request: AttributeValueRequest): string | null {
    const v = request.created_value;
    if (!v) return null;
    return typeof v === 'string' ? v : String(v.id);
}

export interface ExistingValueRef {
    id: string;
    value_name: string;
    color_code?: string | null;
}

export interface NewValueBody {
    attribute: string;
    value_name: string;
    color_code?: string;
    note?: string;
}

export type RequestValueOutcome =
    | { kind: 'created'; request: AttributeValueRequest }
    | { kind: 'exists'; value: ExistingValueRef; message: string }
    | { kind: 'already_requested'; request: AttributeValueRequest };

export type AttributeRequestErrorKind = 'forbidden' | 'not_found' | 'conflict' | 'rate_limited' | 'validation' | 'network' | 'server' | 'unknown';

export interface AttributeRequestError {
    kind: AttributeRequestErrorKind;
    message: string;
    status?: number;
    code?: string;
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
export function toAttributeRequestError(err: unknown): AttributeRequestError {
    if (!axios.isAxiosError(err)) return { kind: 'unknown', message: 'Something went wrong. Please try again.' };
    if (!err.response) return { kind: 'network', message: "We can't reach the server. Check your connection and try again." };

    const status = err.response.status;
    const data = (err.response.data ?? {}) as Record<string, unknown>;
    const detail = typeof data.detail === 'string' ? data.detail : undefined;
    const code = typeof data.code === 'string' ? data.code : undefined;

    if (status === 403) return { kind: 'forbidden', status, code, message: detail || "You don't have permission to do that." };
    if (status === 404) return { kind: 'not_found', status, code, message: detail || 'This request could not be found. It may have been removed.' };
    if (status === 409) return { kind: 'conflict', status, code, message: detail || 'This request changed while you were looking at it. Refresh and try again.' };
    if (status === 429) return { kind: 'rate_limited', status, code, message: detail || 'You have sent too many requests. Please wait a while and try again.' };
    if (status >= 500) return { kind: 'server', status, code, message: 'Something went wrong on our side. Please try again.' };
    if (status === 400 && !detail) {
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
        throw toAttributeRequestError(err);
    }
}

export const attributeRequestsApi = {
    create: 'catalog/attribute-value-requests/',
    mine: 'catalog/attribute-value-requests/mine/',
    adminList: 'catalog/admin/attribute-value-requests/',
    approve: (id: string) => `catalog/admin/attribute-value-requests/${id}/approve/`,
    reject: (id: string) => `catalog/admin/attribute-value-requests/${id}/reject/`,
};

/** Every staff-side list, count and detail SWR key starts with this so one predicate refreshes them all. */
export const ATTRIBUTE_REQUESTS_KEY = 'admin:attribute-value-requests';

/* ------------------------------------------------------------------ seller */

/** Sends a request. A 409 is a normal outcome (the value exists, or is already requested), not an error. */
export async function requestNewValue(body: NewValueBody): Promise<RequestValueOutcome> {
    try {
        const res = await axiosInstance.post<AttributeValueRequest>(attributeRequestsApi.create, body);
        return { kind: 'created', request: res.data };
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
            const data = (err.response.data ?? {}) as { code?: string; detail?: string; value?: ExistingValueRef; request?: AttributeValueRequest };
            if (data.code === 'value_exists' && data.value) {
                return { kind: 'exists', value: data.value, message: data.detail ?? '' };
            }
            if (data.code === 'already_requested' && data.request) {
                return { kind: 'already_requested', request: data.request };
            }
        }
        throw toAttributeRequestError(err);
    }
}

/** The signed-in seller's own requests. `status` '' = all. */
export const fetchMyValueRequests = (status: AttributeRequestStatus | '' = '') =>
    request(() => axiosInstance.get<Paginated<AttributeValueRequest> | AttributeValueRequest[]>(attributeRequestsApi.mine, { params: { status: status || undefined, page_size: 100 } })).then((data) =>
        Array.isArray(data) ? data : (data.results ?? [])
    );

/* ------------------------------------------------------------------- staff */

export interface AdminRequestListParams {
    /** '' = all statuses. */
    status?: string; // one status or a comma list, e.g. "approved,duplicate"
    attribute?: string;
    q?: string;
    page?: number;
    pageSize?: number;
}

export const fetchAdminValueRequests = ({ status = '', attribute = '', q = '', page = 1, pageSize = 25 }: AdminRequestListParams) =>
    request(() =>
        axiosInstance.get<Paginated<AttributeValueRequest>>(attributeRequestsApi.adminList, {
            params: { status: status || undefined, attribute: attribute || undefined, q: q.trim() || undefined, page, page_size: pageSize },
        })
    );

export interface ApproveBody {
    value_name?: string;
    color_code?: string;
}

export const approveValueRequest = (id: string, body: ApproveBody) => request(() => axiosInstance.post<AttributeValueRequest>(attributeRequestsApi.approve(id), body));

export const rejectValueRequest = (id: string, reviewNote: string) => request(() => axiosInstance.post<AttributeValueRequest>(attributeRequestsApi.reject(id), { review_note: reviewNote }));
