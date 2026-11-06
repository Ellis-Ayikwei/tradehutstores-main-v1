import axios from 'axios'
import axiosInstance from '@/lib/axiosInstance'

/**
 * Seller self-onboarding client. Contract: .claude/plans/20-seller-and-checkout-gaps.md
 * (addendum "Seller self-onboarding with KYC": SE1 / SE2 / SE3).
 */

export type SellerStatus = 'none' | 'pending' | 'verified' | 'rejected' | 'suspended'

export type BusinessType = 'individual' | 'registered_business'
export type IdType = 'ghana_card' | 'passport' | 'drivers_licence' | 'voters_id'
export type DocKind =
    | 'id_card'
    | 'id_card_back'
    | 'selfie_with_id'
    | 'proof_of_address'
    | 'business_registration'

export const ID_TYPE_OPTIONS: { value: IdType; label: string }[] = [
    { value: 'ghana_card', label: 'Ghana Card' },
    { value: 'passport', label: 'Passport' },
    { value: 'drivers_licence', label: "Driver's licence" },
    { value: 'voters_id', label: 'Voter ID' },
]

export const MAX_DOC_BYTES = 10 * 1024 * 1024
export const ACCEPTED_DOC_MIME = ['image/jpeg', 'image/png', 'application/pdf']
export const ACCEPTED_DOC_ATTR = 'image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf'

export const DOC_LABELS: Record<DocKind, string> = {
    id_card: 'ID (front)',
    id_card_back: 'ID (back)',
    selfie_with_id: 'Selfie holding your ID',
    proof_of_address: 'Proof of address',
    business_registration: 'Business registration',
}

/** SE1 request body. */
export interface OnboardingPayload {
    business_name: string
    business_type: BusinessType
    business_description?: string
    /** Category uuids from catalog/categories/ (max 10). Required unless `other_category` is set. */
    selling_categories: string[]
    /** Free-text category, only when none listed fits (trimmed, 3-80 chars). Empty string clears it. */
    other_category: string
    business_email: string
    business_phone: string
    business_address: string
    business_registration_number?: string
    tax_id?: string
    id_type: IdType
    id_number: string
    accept_terms: true
}

/** PATCH sellers/me/ body (resubmission): same fields, none required, no terms. */
export type SellerProfilePatch = Partial<Omit<OnboardingPayload, 'accept_terms'>>

export interface SellerDocument {
    kind: DocKind
    status?: string
    note?: string | null
    uploaded_at?: string
}

/** SE2 response (field names beyond the contract's listed ones follow SE1's names). */
export interface SellerMe {
    verification_status: Exclude<SellerStatus, 'none'>
    verification_notes?: string | null
    missing_documents?: DocKind[]
    /** Profile fields the backend still needs, e.g. `['selling_categories']` (pending/rejected sellers only). */
    missing_fields?: string[]
    can_resubmit?: boolean
    documents?: SellerDocument[]
    id_number_last4?: string | null
    business_name?: string
    business_type?: BusinessType
    business_description?: string | null
    selling_categories?: { id: string; name: string }[]
    other_category?: string | null
    business_email?: string
    business_phone?: string
    business_address?: string
    business_registration_number?: string | null
    tax_id?: string | null
    id_type?: IdType
}

/** `null` means the user has no seller profile yet (404, or 403 `not_a_seller`). */
export type SellerMeResult = SellerMe | null

function hasNotASellerCode(data: unknown): boolean {
    try {
        return JSON.stringify(data ?? '').includes('not_a_seller')
    } catch {
        return false
    }
}

export async function getSellerMe(): Promise<SellerMeResult> {
    try {
        const { data } = await axiosInstance.get<SellerMe>('sellers/me/')
        return data
    } catch (err) {
        if (axios.isAxiosError(err)) {
            const status = err.response?.status
            if (status === 404) return null
            if (status === 403 && hasNotASellerCode(err.response?.data)) return null
        }
        throw err
    }
}

export async function submitOnboarding(payload: OnboardingPayload): Promise<SellerMe> {
    const { data } = await axiosInstance.post<SellerMe>('sellers/onboarding/', payload)
    return data
}

export async function updateSellerProfile(patch: SellerProfilePatch): Promise<SellerMe> {
    const { data } = await axiosInstance.patch<SellerMe>('sellers/me/', patch)
    return data
}

export async function uploadSellerDocument(kind: DocKind, file: File): Promise<SellerDocument> {
    const body = new FormData()
    body.append('kind', kind)
    body.append('file', file)
    const { data } = await axiosInstance.post<SellerDocument>('sellers/me/documents/', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
}

export async function resubmitApplication(): Promise<SellerMe> {
    const { data } = await axiosInstance.post<SellerMe>('sellers/me/resubmit/', {})
    return data
}

// ─── Error helpers ───────────────────────────────────────────────────────────

export interface ParsedApiError {
    status: number | null
    code: string | null
    /** DRF field errors, first message per field. */
    fields: Record<string, string>
    /** Non-field message (detail / non_field_errors / network). */
    message: string
}

function firstMessage(v: unknown): string | null {
    if (typeof v === 'string') return v
    if (Array.isArray(v)) {
        for (const item of v) {
            const m = firstMessage(item)
            if (m) return m
        }
        return null
    }
    if (v && typeof v === 'object') {
        for (const item of Object.values(v as Record<string, unknown>)) {
            const m = firstMessage(item)
            if (m) return m
        }
    }
    return null
}

export function parseApiError(err: unknown): ParsedApiError {
    const fallback = 'Something went wrong. Please try again.'
    if (!axios.isAxiosError(err)) {
        return { status: null, code: null, fields: {}, message: fallback }
    }
    if (!err.response) {
        return {
            status: null,
            code: null,
            fields: {},
            message: 'Could not reach the server. Check your connection and try again.',
        }
    }
    const { status, data } = err.response
    const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
    const code =
        typeof body.code === 'string'
            ? body.code
            : typeof body.error === 'string'
              ? body.error
              : null
    const fields: Record<string, string> = {}
    let message = ''
    for (const [key, value] of Object.entries(body)) {
        // `missing` / `missing_fields` are machine hints (arrays of field names), not messages.
        if (key === 'code' || key === 'error' || key === 'missing' || key === 'missing_fields') continue
        const m = firstMessage(value)
        if (!m) continue
        if (key === 'detail' || key === 'non_field_errors' || key === 'message') {
            if (!message) message = m
        } else {
            fields[key] = m
        }
    }
    if (!message && Object.keys(fields).length === 0) {
        message = status === 413 ? 'That file is too large.' : fallback
    }
    return { status, code, fields, message }
}

// ─── Seller dashboard (Stores-Admin) link ────────────────────────────────────

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL

/** `${NEXT_PUBLIC_ADMIN_URL}/seller/overview`, or null when the env var is not set. */
export const SELLER_DASHBOARD_URL: string | null = ADMIN_URL
    ? `${ADMIN_URL.replace(/\/+$/, '')}/seller/overview`
    : null
