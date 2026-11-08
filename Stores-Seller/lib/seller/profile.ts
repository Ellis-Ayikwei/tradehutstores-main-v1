import { sellerGet, sellerPatch, sellerPost, sellerUpload } from './client'
import { isNotASeller } from './errors'
import type {
    BusinessType,
    DocumentKind,
    IdType,
    SellerDocument,
    SellerProfile,
    SellerProfilePatch,
    VerificationStatus,
} from './types'

/**
 * Seller store profile and verification (KYC).
 *   SE2  GET   sellers/me/               profile + verification state
 *        PATCH sellers/me/               edit profile (pending / rejected; verified: non-identity fields only)
 *   SE3  POST  sellers/me/documents/     multipart `kind` + `file`, one document per request
 *        POST  sellers/me/resubmit/      rejected -> pending
 */

export const SELLER_PROFILE_URL = 'sellers/me/'

export const DOCUMENT_KIND_LABELS: Record<DocumentKind, string> = {
    id_card: 'ID card (front)',
    id_card_back: 'ID card (back)',
    selfie_with_id: 'Selfie holding your ID',
    proof_of_address: 'Proof of address',
    business_registration: 'Business registration',
}

export const DOCUMENT_KINDS = Object.keys(DOCUMENT_KIND_LABELS) as DocumentKind[]

export const ID_TYPE_LABELS: Record<IdType, string> = {
    ghana_card: 'Ghana Card',
    passport: 'Passport',
    drivers_licence: "Driver's licence",
    voters_id: "Voter's ID",
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
    individual: 'Individual',
    registered_business: 'Registered business',
}

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
    pending: 'Pending review',
    verified: 'Verified',
    rejected: 'Not approved',
    suspended: 'Suspended',
}

export const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024
export const DOCUMENT_ACCEPT = 'image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf'
const DOCUMENT_MIME = ['image/jpeg', 'image/png', 'application/pdf']

/** Error message when the file cannot be uploaded, otherwise null. */
export function validateDocumentFile(file: File): string | null {
    const okType = DOCUMENT_MIME.includes(file.type) || /\.(jpe?g|png|pdf)$/i.test(file.name)
    if (!okType) return 'Upload a JPG, PNG or PDF file.'
    if (file.size > DOCUMENT_MAX_BYTES) return 'This file is larger than 10 MB. Choose a smaller one.'
    return null
}

function normalise(p: SellerProfile): SellerProfile {
    return {
        ...p,
        missing_documents: p.missing_documents ?? [],
        missing_fields: p.missing_fields ?? [],
        documents: p.documents ?? [],
    }
}

/** Resolves `null` when the signed-in user has no seller profile (404 / 403 `not_a_seller`). */
export async function getSellerProfile(): Promise<SellerProfile | null> {
    try {
        return normalise(await sellerGet<SellerProfile>(SELLER_PROFILE_URL))
    } catch (e) {
        if (isNotASeller(e)) return null
        throw e
    }
}

export async function updateSellerProfile(patch: SellerProfilePatch): Promise<SellerProfile> {
    return normalise(await sellerPatch<SellerProfile>(SELLER_PROFILE_URL, patch))
}

/** Uploads (or replaces) one document. */
export function uploadSellerDocument(kind: DocumentKind, file: File): Promise<SellerDocument> {
    return sellerUpload<SellerDocument>('sellers/me/documents/', { kind, file })
}

export function resubmitSellerApplication(): Promise<unknown> {
    return sellerPost<unknown>('sellers/me/resubmit/')
}
