import axios from 'axios'
import axiosInstance from '@/lib/axiosInstance'

/**
 * RFQ buyer API client. Implements `.claude/plans/11-rfq.md` §6 (R1-R8) exactly.
 * Paths are relative to the API base (`.../tradehut/api/v1/`).
 */

// ─── Constants mirrored from the contract (§3 constants.py, R2, R7) ──────────

export const RFQ_LIMITS = {
    titleMax: 200,
    descriptionMax: 5000,
    unitMax: 32,
    cityMax: 120,
    specsMax: 20,
    attachmentsMax: 5,
    attachmentBytesMax: 10 * 1024 * 1024,
    /** MIN_OPEN / MAX_OPEN, expressed in whole days for the deadline picker. */
    minOpenHours: 24,
    maxOpenDays: 60,
} as const

export const RFQ_ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'] as const
export const RFQ_ATTACHMENT_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'] as const
export const RFQ_ATTACHMENT_ACCEPT = [...RFQ_ATTACHMENT_TYPES, ...RFQ_ATTACHMENT_EXTENSIONS].join(',')

// ─── Types ───────────────────────────────────────────────────────────────────

export type RFQStatus = 'draft' | 'open' | 'quoting' | 'awarded' | 'closed' | 'cancelled' | 'expired'
export type QuoteStatus = 'submitted' | 'withdrawn' | 'accepted' | 'not_selected'

export const RFQ_STATUSES: RFQStatus[] = ['draft', 'open', 'quoting', 'awarded', 'closed', 'cancelled', 'expired']

export type Paginated<T> = {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

export type RFQCategoryRef = { id: string | number; name: string }

/** R1 row. */
export type RFQRow = {
    id: string
    reference: string
    title: string
    category: RFQCategoryRef | null
    quantity: number
    unit: string
    status: RFQStatus
    quote_count: number
    closes_at: string
    awarded_quote_id: string | null
    order_id: string | null
    created_on: string
}

export type RFQAttachment = { id: string; filename: string; url: string; size: number }

export type RFQSpec = { label: string; value: string }

export type BuyerQuote = {
    id: string
    supplier: {
        id: string
        business_name: string
        store_slug: string
        is_verified: boolean
        rating: number | string | null
    }
    product: { id: string; name: string; image: string | null } | null
    unit_price: string
    quantity: number
    total_price: string
    shipping_cost: string
    grand_total: string
    currency: string
    lead_time_days: number
    valid_until: string | null
    notes: string
    status: QuoteStatus
    submitted_at: string | null
}

/** R3 detail = R1 + the fields below. */
export type RFQDetail = RFQRow & {
    description: string
    budget_min: string | null
    budget_max: string | null
    currency: string
    delivery_country: string
    delivery_city: string
    needed_by: string | null
    specs: RFQSpec[]
    attachments: RFQAttachment[]
    quotes: BuyerQuote[]
}

export type CreateRFQPayload = {
    title: string
    description: string
    category_id: string | number
    sub_category_id?: string | number
    quantity: number
    unit?: string
    budget_min?: string
    budget_max?: string
    delivery_country: string
    delivery_city?: string
    needed_by?: string
    closes_at: string
    specs?: RFQSpec[]
    publish: boolean
}

export type PatchRFQPayload = Partial<Omit<CreateRFQPayload, 'publish'>>

export type AwardResult = { rfq: RFQDetail; order_id: string }

// ─── Idempotency keys ────────────────────────────────────────────────────────

export function newIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

// ─── Calls ───────────────────────────────────────────────────────────────────

function unwrapPage<T>(data: Paginated<T> | T[]): Paginated<T> {
    if (Array.isArray(data)) return { count: data.length, next: null, previous: null, results: data }
    return data
}

/** R1 */
export async function listRequests(params: { status?: RFQStatus | ''; page?: number }): Promise<Paginated<RFQRow>> {
    const { data } = await axiosInstance.get<Paginated<RFQRow> | RFQRow[]>('rfq/requests/', {
        params: { ...(params.status ? { status: params.status } : {}), ...(params.page && params.page > 1 ? { page: params.page } : {}) },
    })
    return unwrapPage(data)
}

/** R3 */
export async function getRequest(id: string): Promise<RFQDetail> {
    const { data } = await axiosInstance.get<RFQDetail>(`rfq/requests/${encodeURIComponent(id)}/`)
    return data
}

/** R2 (Idempotency-Key required; 201 on create, 200 on replay) */
export async function createRequest(payload: CreateRFQPayload, idempotencyKey: string): Promise<RFQDetail> {
    const { data } = await axiosInstance.post<RFQDetail>('rfq/requests/', payload, {
        headers: { 'Idempotency-Key': idempotencyKey },
    })
    return data
}

/** R4 */
export async function patchRequest(id: string, payload: PatchRFQPayload): Promise<RFQDetail> {
    const { data } = await axiosInstance.patch<RFQDetail>(`rfq/requests/${encodeURIComponent(id)}/`, payload)
    return data
}

/** R5 */
export async function publishRequest(id: string): Promise<RFQDetail> {
    const { data } = await axiosInstance.post<RFQDetail>(`rfq/requests/${encodeURIComponent(id)}/publish/`, {})
    return data
}

/** R6 */
export async function cancelRequest(id: string, reason?: string): Promise<void> {
    await axiosInstance.post(`rfq/requests/${encodeURIComponent(id)}/cancel/`, reason ? { reason } : {})
}

/** R7 upload (multipart `file`) */
export async function uploadAttachment(id: string, file: File): Promise<RFQAttachment> {
    const body = new FormData()
    body.append('file', file)
    const { data } = await axiosInstance.post<RFQAttachment>(`rfq/requests/${encodeURIComponent(id)}/attachments/`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
}

/** R7 delete */
export async function deleteAttachment(id: string, attachmentId: string): Promise<void> {
    await axiosInstance.delete(`rfq/requests/${encodeURIComponent(id)}/attachments/${encodeURIComponent(attachmentId)}/`)
}

/** R8 (Idempotency-Key required; replay of the same quote returns 200) */
export async function awardQuote(id: string, quoteId: string, idempotencyKey: string): Promise<AwardResult> {
    const { data } = await axiosInstance.post<AwardResult>(
        `rfq/requests/${encodeURIComponent(id)}/award/`,
        { quote_id: quoteId },
        { headers: { 'Idempotency-Key': idempotencyKey } }
    )
    return data
}

/** Categories for the form: existing public catalog endpoint, nested subcategories. */
export type CatalogCategoryOption = {
    id: string | number
    name: string
    sub_categories: { id: string | number; sub_category_name: string }[]
}

export async function listCategories(): Promise<CatalogCategoryOption[]> {
    const { data } = await axiosInstance.get<unknown>('catalog/categories/', { params: { include: 'subcategories' } })
    const list: unknown[] = Array.isArray(data)
        ? data
        : data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)
          ? ((data as { results: unknown[] }).results)
          : []
    const out: CatalogCategoryOption[] = []
    for (const raw of list) {
        const c = raw as Record<string, unknown>
        if (c.id == null || typeof c.name !== 'string') continue
        const subs = Array.isArray(c.sub_categories) ? (c.sub_categories as Record<string, unknown>[]) : []
        out.push({
            id: c.id as string | number,
            name: c.name,
            sub_categories: subs
                .filter((s) => s.id != null && typeof s.sub_category_name === 'string')
                .map((s) => ({ id: s.id as string | number, sub_category_name: s.sub_category_name as string })),
        })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name))
}

// ─── Error mapping ───────────────────────────────────────────────────────────

/** Every `code` the contract documents for R1-R8 (plus shared §0 codes), mapped to buyer-facing copy. */
export const RFQ_ERROR_MESSAGES: Record<string, string> = {
    category_not_found: 'That category is no longer available. Pick another one.',
    idempotency_key_required: 'Something went wrong sending your request. Please try again.',
    not_editable: 'This request can no longer be edited in its current state.',
    invalid_state: 'This action is not available for the request in its current state.',
    file_too_large: 'That file is larger than 10 MB.',
    file_type: 'Only PDF, PNG, JPEG or WebP files can be attached.',
    too_many_attachments: `You can attach at most ${RFQ_LIMITS.attachmentsMax} files.`,
    already_awarded: 'This request has already been awarded to a different quote.',
    rfq_not_awardable: 'This request is not open for awarding right now.',
    award_window_closed: 'The window to award this request has closed.',
    quote_not_available: 'That quote is no longer available (it may have been withdrawn).',
    quote_expired: 'That quote has expired. Ask the supplier to resubmit or choose another quote.',
}

export type ParsedRfqError = {
    status: number | null
    code: string | null
    message: string
    /** DRF field-level errors, first message per field. */
    fields: Record<string, string>
    retryable: boolean
}

function firstString(v: unknown): string | null {
    if (typeof v === 'string') return v
    if (Array.isArray(v)) {
        for (const item of v) {
            const s = firstString(item)
            if (s) return s
        }
    }
    if (v && typeof v === 'object') {
        for (const item of Object.values(v as Record<string, unknown>)) {
            const s = firstString(item)
            if (s) return s
        }
    }
    return null
}

export const RFQ_UNAVAILABLE_MESSAGE = "RFQ isn't available yet — please try again later or call 024 813 8722."

export function parseRfqError(err: unknown): ParsedRfqError {
    if (!axios.isAxiosError(err)) {
        return { status: null, code: null, message: 'Something went wrong. Please try again.', fields: {}, retryable: true }
    }
    if (!err.response) {
        return {
            status: null,
            code: null,
            message: RFQ_UNAVAILABLE_MESSAGE,
            fields: {},
            retryable: true,
        }
    }
    const { status, data } = err.response
    const body = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
    const code = typeof body.code === 'string' ? body.code : null
    // The RFQ backend may not exist yet: a 404 without a contract `code`, or a gateway/501 error, is "unavailable".
    if ((status === 404 && !code) || (status >= 501 && status <= 504)) {
        return { status, code, message: RFQ_UNAVAILABLE_MESSAGE, fields: {}, retryable: true }
    }
    const fields: Record<string, string> = {}
    for (const [key, val] of Object.entries(body)) {
        if (key === 'detail' || key === 'code') continue
        const s = firstString(val)
        if (s) fields[key] = s
    }
    let message: string
    if (code && RFQ_ERROR_MESSAGES[code]) message = RFQ_ERROR_MESSAGES[code]
    else if (status === 401) message = 'Please sign in to continue.'
    else if (status === 403) message = "You don't have permission to do that."
    else if (status === 404) message = "We couldn't find that request. It may have been removed."
    else if (status === 413) message = RFQ_ERROR_MESSAGES.file_too_large
    else if (status >= 500) message = 'Our servers had a problem. Please try again in a moment.'
    else if (typeof body.detail === 'string' && body.detail) message = body.detail
    else message = Object.values(fields)[0] ?? 'We could not complete that request. Please check your details and try again.'
    return { status, code, message, fields, retryable: status >= 500 }
}

// ─── Display helpers ─────────────────────────────────────────────────────────

export function formatMoney(amount: string | number | null | undefined, currency: string): string {
    if (amount == null || amount === '') return '—'
    const n = typeof amount === 'number' ? amount : Number(amount)
    if (!Number.isFinite(n)) return '—'
    try {
        return new Intl.NumberFormat('en-GH', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(n)
    } catch {
        return `${currency} ${n.toFixed(2)}`
    }
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString('en-GB', withTime ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** "3 days left", "5 hours left", "Closed". Display only; the server is the clock. */
export function timeLeft(iso: string, nowMs: number = Date.now()): string {
    const ms = new Date(iso).getTime() - nowMs
    if (!Number.isFinite(ms)) return ''
    if (ms <= 0) return 'Closed'
    const hours = Math.floor(ms / 3_600_000)
    if (hours < 1) return `${Math.max(1, Math.floor(ms / 60_000))} min left`
    if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} left`
    return `${Math.floor(hours / 24)} days left`
}

export function validateAttachmentFile(file: File): string | null {
    const name = file.name.toLowerCase()
    const extOk = RFQ_ATTACHMENT_EXTENSIONS.some((e) => name.endsWith(e))
    const typeOk = (RFQ_ATTACHMENT_TYPES as readonly string[]).includes(file.type)
    if (!extOk || !typeOk) return `${file.name}: ${RFQ_ERROR_MESSAGES.file_type}`
    if (file.size > RFQ_LIMITS.attachmentBytesMax) return `${file.name}: ${RFQ_ERROR_MESSAGES.file_too_large}`
    if (file.size === 0) return `${file.name}: the file is empty.`
    return null
}
