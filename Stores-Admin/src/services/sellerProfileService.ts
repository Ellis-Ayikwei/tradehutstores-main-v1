/**
 * Seller store profile and verification (KYC). Built against the frozen contract in
 * `.claude/plans/20-seller-and-checkout-gaps.md` (addendum "Seller self-onboarding with KYC"):
 *   SE2  GET   sellers/me/               profile + verification state
 *        PATCH sellers/me/               edit profile (allowed while pending / rejected)
 *   SE3  POST  sellers/me/documents/     multipart upload, one document per request
 *        POST  sellers/me/resubmit/      send a rejected application back for review
 */
import axios from 'axios';
import axiosInstance from './axiosInstance';
import { toSellerApiError, type SellerApiError } from './sellerStatsService';

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type DocumentKind = 'id_card' | 'id_card_back' | 'selfie_with_id' | 'proof_of_address' | 'business_registration';
export type DocumentStatus = 'pending' | 'approved' | 'rejected';
export type BusinessType = 'individual' | 'registered_business';
export type IdType = 'ghana_card' | 'passport' | 'drivers_licence' | 'voters_id';

export interface SellerDocument {
    kind: DocumentKind;
    status: DocumentStatus;
    /** Reviewer note, normally set when rejected. */
    note?: string | null;
    /** Not in the contract; used when the API provides them. */
    id?: string;
    url?: string | null;
    uploaded_at?: string | null;
}

export interface SellingCategory {
    id: string;
    name: string;
}

export interface SellerProfile {
    id: string;
    verification_status: VerificationStatus;
    /** Only populated when rejected. */
    verification_notes?: string | null;
    missing_documents: DocumentKind[];
    /** Profile fields still needed before review, e.g. `selling_categories`. Only set for pending / rejected sellers. */
    missing_fields?: string[];
    can_resubmit?: boolean;
    documents: SellerDocument[];

    business_name: string;
    business_type?: BusinessType | null;
    business_description?: string | null;
    /** Categories the seller sells in (catalog categories). Absent on older API responses. */
    selling_categories?: SellingCategory[] | null;
    /** Free text for a category that isn't in the catalog. */
    other_category?: string | null;
    business_email?: string | null;
    business_phone?: string | null;
    business_address?: string | null;
    business_registration_number?: string | null;
    tax_id?: string | null;
    id_type?: IdType | null;
    /** Last four characters of the ID number. The full number is never returned. */
    id_number_last4?: string | null;

    return_policy?: string | null;
    shipping_policy?: string | null;
    is_accepting_orders?: boolean;
}

/** Fields the seller may change from the Store profile tab. */
export type SellerProfileUpdate = Partial<SellerProfileFields>;

export interface SellerProfileFields {
    business_name: string;
    business_description: string;
    /** Catalog category ids (max 10). */
    selling_categories: string[];
    other_category: string;
    business_email: string;
    business_phone: string;
    business_address: string;
    return_policy: string;
    shipping_policy: string;
    is_accepting_orders: boolean;
}

export const sellerProfileApi = {
    me: 'sellers/me/',
    documents: 'sellers/me/documents/',
    resubmit: 'sellers/me/resubmit/',
};

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
    id_card: 'ID card (front)',
    id_card_back: 'ID card (back)',
    selfie_with_id: 'Selfie holding your ID',
    proof_of_address: 'Proof of address',
    business_registration: 'Business registration',
};

export const DOCUMENT_KINDS = Object.keys(DOCUMENT_KIND_LABELS) as DocumentKind[];

export const ID_TYPE_LABELS: Record<IdType, string> = {
    ghana_card: 'Ghana Card',
    passport: 'Passport',
    drivers_licence: "Driver's licence",
    voters_id: "Voter's ID",
};

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
    individual: 'Individual',
    registered_business: 'Registered business',
};

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_ACCEPT = 'image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf';
const DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/** Returns an error message when the file can't be uploaded, otherwise null. */
export function validateDocumentFile(file: File): string | null {
    const okType = DOCUMENT_TYPES.includes(file.type) || /\.(jpe?g|png|pdf)$/i.test(file.name);
    if (!okType) return 'Upload a JPG, PNG or PDF file.';
    if (file.size > DOCUMENT_MAX_BYTES) return 'This file is larger than 10 MB. Choose a smaller one.';
    return null;
}

/* ------------------------------------------------------------------ errors */

export interface ProfileFieldIssue {
    name: string;
    message: string;
}

export class SellerProfileWriteError extends Error {
    kind: SellerApiError['kind'] | 'validation';
    fields: ProfileFieldIssue[];
    status?: number;
    code?: string;
    /** Resubmit only: missing document kinds (`missing_documents`). */
    missing: string[] = [];
    /** Resubmit only: profile fields still needed, e.g. `selling_categories`. */
    missingFields: string[] = [];

    constructor(message: string, kind: SellerProfileWriteError['kind'], fields: ProfileFieldIssue[] = [], status?: number, code?: string) {
        super(message);
        this.name = 'SellerProfileWriteError';
        this.kind = kind;
        this.fields = fields;
        this.status = status;
        this.code = code;
    }
}

const stringList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((n): n is string => typeof n === 'string') : []);

const flatten = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(flatten).filter(Boolean).join(' ');
    if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map(flatten).filter(Boolean).join(' ');
    return '';
};

/** Maps a failed write to a message plus DRF field-level issues (400). */
export function toProfileWriteError(err: unknown, context: string): SellerProfileWriteError {
    if (err instanceof SellerProfileWriteError) return err;
    if (axios.isAxiosError(err) && err.response?.status === 400) {
        const data = err.response.data as Record<string, unknown> | undefined;
        const fields: ProfileFieldIssue[] = [];
        if (data?.code === 'identity_locked') {
            // `{detail, code: 'identity_locked', fields: [name, ...]}`: the verified seller touched locked fields.
            const names = Array.isArray(data.fields) ? data.fields.filter((n): n is string => typeof n === 'string') : [];
            const detail = typeof data.detail === 'string' && data.detail ? data.detail : 'Contact support to change this.';
            return new SellerProfileWriteError(detail, 'validation', names.map((name) => ({ name, message: 'Contact support to change this.' })), 400, 'identity_locked');
        }
        if (data?.code === 'missing_categories' || data?.code === 'missing_documents') {
            // Resubmit refused: `{code, detail?, missing: [kinds], missing_fields: ['selling_categories']}`.
            const missingKinds = stringList(data.missing);
            const missingFields = stringList(data.missing_fields);
            const detail =
                typeof data.detail === 'string' && data.detail
                    ? data.detail
                    : data.code === 'missing_categories'
                      ? 'Add what you sell in the Profile tab first.'
                      : 'Upload the missing documents before resubmitting.';
            const e = new SellerProfileWriteError(detail, 'validation', [], 400, data.code);
            e.missing = missingKinds;
            e.missingFields = missingFields;
            return e;
        }
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            for (const [key, value] of Object.entries(data)) {
                if (key === 'detail' || key === 'code' || key === 'non_field_errors' || key === 'missing' || key === 'missing_fields') continue;
                // DRF list form `{"field": ["msg", ...]}`: show the first message only.
                const first = Array.isArray(value) ? value.find((v): v is string => typeof v === 'string' && v.length > 0) : undefined;
                const message = first ?? flatten(value);
                if (message) fields.push({ name: key, message });
            }
        }
        const general = typeof data?.detail === 'string' ? data.detail : flatten(data?.non_field_errors);
        const code = typeof data?.code === 'string' ? data.code : undefined;
        const message = general || (fields.length ? fields.map((f) => f.message).join(' ') : `${context}. Check the details and try again.`);
        return new SellerProfileWriteError(message, 'validation', fields, 400, code);
    }
    const api = toSellerApiError(err);
    if (api.kind === 'forbidden') return new SellerProfileWriteError(api.message, 'forbidden', [], api.status, api.code);
    if (api.kind === 'network') return new SellerProfileWriteError(api.message, 'network');
    const message = api.kind === 'unknown' && api.message ? api.message : `${context}. Please try again.`;
    return new SellerProfileWriteError(message, api.kind, [], api.status, api.code);
}

/* ------------------------------------------------------------------- calls */

const normalise = (d: SellerProfile): SellerProfile => ({ ...d, missing_documents: d.missing_documents ?? [], missing_fields: d.missing_fields ?? [], documents: d.documents ?? [] });

export async function fetchSellerProfile(): Promise<SellerProfile> {
    try {
        const res = await axiosInstance.get<SellerProfile>(sellerProfileApi.me);
        return normalise(res.data);
    } catch (err) {
        throw toSellerApiError(err);
    }
}

export async function updateSellerProfile(body: SellerProfileUpdate): Promise<SellerProfile> {
    try {
        const res = await axiosInstance.patch<SellerProfile>(sellerProfileApi.me, body);
        return normalise(res.data);
    } catch (err) {
        throw toProfileWriteError(err, 'Could not save your store details');
    }
}

/** Uploads (or replaces) one document. Multipart fields: `kind`, `file`. */
export async function uploadSellerDocument(kind: DocumentKind, file: File): Promise<SellerDocument> {
    const fd = new FormData();
    fd.append('kind', kind);
    fd.append('file', file);
    try {
        const res = await axiosInstance.post<SellerDocument>(sellerProfileApi.documents, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        return res.data;
    } catch (err) {
        throw toProfileWriteError(err, 'Could not upload this document');
    }
}

export async function resubmitSellerApplication(): Promise<void> {
    try {
        await axiosInstance.post(sellerProfileApi.resubmit, {});
    } catch (err) {
        throw toProfileWriteError(err, 'Could not resubmit your application');
    }
}
