import axios from 'axios'

/**
 * Seller Central error mapper. Every seller API helper throws the raw axios error; call
 * `toSellerError(e)` in the catch block to get a UI-ready shape.
 *
 * Backend conventions (plans/20-seller-and-checkout-gaps.md section 0):
 *   - `{ detail, code, ...extra }` for domain errors,
 *   - DRF field errors `{ field: "msg" }` or list form `{ field: ["msg", ...] }`
 *     (nested serializers give `{ items: [{ sku: ["msg"] }] }`).
 */

export type SellerErrorKind =
    | 'network'
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'validation'
    | 'conflict'
    | 'too_large'
    | 'server'
    | 'unknown'

export interface SellerError {
    kind: SellerErrorKind
    /** HTTP status, or null when there was no response (network failure). */
    status: number | null
    /** Machine code from the API (`identity_locked`, `out_of_stock`, ...), or null. */
    code: string | null
    /** A message that is safe to show to the seller. Never raw axios text. */
    message: string
    /**
     * First message per field. Nested errors use dotted paths (`variants.1.sku`).
     * For `identity_locked` it maps each locked field name to the API detail.
     */
    fields: Record<string, string>
    /** Response body (object) when there was one, for codes that carry extra data (`missing`, `available`, ...). */
    data: Record<string, unknown>
    /** The thrown value, untouched. */
    raw: unknown
}

const GENERIC = 'Something went wrong. Please try again.'
const MACHINE_KEYS = new Set(['code', 'error', 'missing', 'missing_fields', 'fields'])
const MESSAGE_KEYS = new Set(['detail', 'non_field_errors', 'message'])

function firstMessage(value: unknown): string | null {
    if (typeof value === 'string') return value.trim() ? value : null
    if (Array.isArray(value)) {
        for (const item of value) {
            const m = firstMessage(item)
            if (m) return m
        }
        return null
    }
    if (value && typeof value === 'object') {
        for (const item of Object.values(value as Record<string, unknown>)) {
            const m = firstMessage(item)
            if (m) return m
        }
    }
    return null
}

function collectFields(value: unknown, path: string, out: Record<string, string>): void {
    if (typeof value === 'string') {
        if (path && value.trim() && !(path in out)) out[path] = value
        return
    }
    if (Array.isArray(value)) {
        const flat = value.filter((v): v is string => typeof v === 'string' && v.trim() !== '')
        if (flat.length > 0) {
            if (path && !(path in out)) out[path] = flat[0]
            return
        }
        value.forEach((item, i) => {
            if (item && typeof item === 'object') collectFields(item, path ? `${path}.${i}` : String(i), out)
        })
        return
    }
    if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
            collectFields(item, path ? `${path}.${key}` : key, out)
        }
    }
}

function isSellerError(e: unknown): e is SellerError {
    return Boolean(e) && typeof e === 'object' && 'kind' in (e as object) && 'fields' in (e as object) && 'raw' in (e as object)
}

function kindFor(status: number, code: string | null): SellerErrorKind {
    if (status === 401) return 'unauthenticated'
    if (status === 403) return 'forbidden'
    if (status === 404) return 'not_found'
    if (status === 409) return 'conflict'
    if (status === 413) return 'too_large'
    if (status >= 500) return 'server'
    if (status === 400 || status === 422) return 'validation'
    return code ? 'validation' : 'unknown'
}

/** Idempotent: passing an already-mapped SellerError returns it unchanged. */
export function toSellerError(e: unknown): SellerError {
    if (isSellerError(e)) return e

    if (!axios.isAxiosError(e)) {
        return { kind: 'unknown', status: null, code: null, message: GENERIC, fields: {}, data: {}, raw: e }
    }
    if (!e.response) {
        return {
            kind: 'network',
            status: null,
            code: null,
            message: "We can't reach the server. Check your connection and try again.",
            fields: {},
            data: {},
            raw: e,
        }
    }

    const { status } = e.response
    const body: Record<string, unknown> =
        e.response.data && typeof e.response.data === 'object' && !Array.isArray(e.response.data)
            ? (e.response.data as Record<string, unknown>)
            : {}
    const code = typeof body.code === 'string' ? body.code : typeof body.error === 'string' ? body.error : null

    const fields: Record<string, string> = {}
    let message = ''
    for (const [key, value] of Object.entries(body)) {
        if (MACHINE_KEYS.has(key)) continue
        if (MESSAGE_KEYS.has(key)) {
            const m = firstMessage(value)
            if (m && !message) message = m
            continue
        }
        collectFields(value, key, fields)
    }
    if (Array.isArray(body.fields)) {
        // `{detail, code: 'identity_locked', fields: [name, ...]}`
        const note = typeof body.detail === 'string' && body.detail ? body.detail : 'Contact support to change this.'
        for (const name of body.fields) if (typeof name === 'string') fields[name] = note
    }

    if (!message && status === 413) message = 'That file is too large.'
    if (!message && status === 401) message = 'Please sign in to continue.'
    if (!message && status === 403) message = "This account doesn't have access to this."
    if (!message && status === 404) message = 'We could not find that.'
    if (!message && status >= 500) message = 'Something went wrong on our side. Please try again.'
    if (!message && Object.keys(fields).length === 0) message = GENERIC
    if (!message) message = 'Check the highlighted details and try again.'

    return { kind: kindFor(status, code), status, code, message, fields, data: body, raw: e }
}

/** True for "this user has no seller profile" (404, or 403 with code `not_a_seller`). */
export function isNotASeller(e: unknown): boolean {
    const err = toSellerError(e)
    if (err.status === 404) return true
    return err.status === 403 && (err.code === 'not_a_seller' || JSON.stringify(err.data).includes('not_a_seller'))
}

/** String list from an API array (for `missing`, `missing_fields`). */
export function stringList(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
}
