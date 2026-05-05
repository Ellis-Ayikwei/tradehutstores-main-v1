/**
 * renderErrorMessage
 *
 * Extracts a human-readable string from an Axios error (or similar).
 * Aggregates **multiple** API messages when the body exposes more than one
 * (e.g. DRF `detail` + field errors + `non_field_errors`).
 *
 * Usage:
 *   showNotification({ message: renderErrorMessage(error), type: 'error' });
 *
 * ─── Handled shapes ────────────────────────────────────────────────────────
 *
 *  No response (network / timeout / CORS)
 *    error.message                        JS / Axios Error
 *
 *  JSON object body (messages combined when several exist)
 *    { description }                      Flask abort(description=...)
 *    { message } string | string[]
 *    { error } string | object (stringified / nested keys)
 *    { msg }                              Flask-JWT-Extended
 *    { detail } string | string[] | object (DRF / Marshmallow / OpenAPI)
 *    { name }                             Werkzeug-style
 *    { title }                            Some JSON APIs
 *    { code } + other fields              Shown alongside other messages
 *    { non_field_errors }                 DRF string[]
 *    { errors: string[] }
 *    { errors: Record<string, …> }        Nested arrays/objects flattened
 *    Top-level field keys                 DRF { "email": ["…"], "password": ["…"] }
 *
 *  JSON array body
 *    string[] | object[]                  Joined / stringified per item
 *
 *  String body
 *    Plain string | HTML (Werkzeug)       → extractFromHtml
 *
 *  Fallback
 *    response.status + statusText         When body is empty / unrecognized
 *
 * NOTE: textContent (not innerText) for DOMParser output.
 * ───────────────────────────────────────────────────────────────────────────
 */

const META_KEYS = new Set([
    'description',
    'message',
    'error',
    'msg',
    'detail',
    'name',
    'title',
    'errors',
    'non_field_errors',
    'code',
    'status',
    'type',
    'success',
    'error_code',
])

const MAX_NEST_DEPTH = 6

const safeJsonStringify = (value: unknown): string => {
    if (typeof value === 'string') return value
    if (typeof value === 'bigint') return value.toString()
    if (typeof value === 'symbol') return value.toString()
    try {
        return JSON.stringify(value)
    } catch {
        return '(unserializable)'
    }
}

// ─── HTML extraction ─────────────────────────────────────────────────────────

const extractFromHtml = (html: string): string | null => {
    const doc = new DOMParser().parseFromString(html, 'text/html')

    const pText = doc.querySelector('p')?.textContent?.trim()
    if (pText) return pText

    const h1Text = doc.querySelector('h1')?.textContent?.trim()
    if (h1Text) return h1Text

    const titleText = doc.querySelector('title')?.textContent?.trim()
    if (titleText) return titleText

    const bodyText = doc.body?.textContent?.trim()
    if (bodyText) return bodyText

    return null
}

// ─── Value → string fragments ───────────────────────────────────────────────

const pushIfText = (out: string[], v: unknown) => {
    if (typeof v === 'string') {
        const t = v.trim()
        if (t) out.push(t)
    }
}

/** DRF / Marshmallow `detail`: string | string[] | { … } | list of dicts with msg/message */
const collectFromDetail = (detail: unknown, out: string[], depth: number) => {
    if (detail == null || depth > MAX_NEST_DEPTH) return
    if (typeof detail === 'string') {
        pushIfText(out, detail)
        return
    }
    if (Array.isArray(detail)) {
        for (const item of detail) {
            if (typeof item === 'string') pushIfText(out, item)
            else if (item !== null && typeof item === 'object') {
                const o = item as Record<string, unknown>
                if (typeof o.msg === 'string') pushIfText(out, o.msg)
                if (typeof o.message === 'string') pushIfText(out, o.message)
                if (typeof o.detail === 'string') pushIfText(out, o.detail)
                if (typeof o.attr === 'string' && typeof o.code === 'string') {
                    pushIfText(out, `${o.attr}: ${o.code}`)
                }
                const nested = o.errors ?? o.non_field_errors
                if (nested != null) collectFromDetail(nested, out, depth + 1)
            }
        }
        return
    }
    if (typeof detail === 'object') {
        out.push(flattenObjectErrors(detail as Record<string, unknown>, depth + 1))
    }
}

const collectFromErrorField = (err: unknown, out: string[], depth: number) => {
    if (err == null || depth > MAX_NEST_DEPTH) return
    if (typeof err === 'string') {
        pushIfText(out, err)
        return
    }
    if (Array.isArray(err)) {
        for (const x of err) collectFromErrorField(x, out, depth + 1)
        return
    }
    if (typeof err === 'object') {
        const o = err as Record<string, unknown>
        pushIfText(out, o.message)
        pushIfText(out, o.msg)
        pushIfText(out, o.detail as string)
        collectFromDetail(o.detail, out, depth + 1)
        if (o.errors != null && typeof o.errors === 'object') {
            if (Array.isArray(o.errors)) collectFromErrorField(o.errors, out, depth + 1)
            else out.push(flattenObjectErrors(o.errors as Record<string, unknown>, depth + 1))
        }
        const rest = Object.keys(o).filter((k) => !['message', 'msg', 'detail', 'errors'].includes(k))
        if (rest.length && !o.message && !o.msg && !o.detail) {
            out.push(flattenObjectErrors(o, depth + 1))
        }
    }
}

/**
 * { email: ["Not a valid email."], name: "Required.", nested: { x: ["y"] } }
 * →  "email: Not a valid email. | name: Required. | nested.x: y"
 */
const formatArrayElementForFlatten = (x: unknown, depth: number): string => {
    if (typeof x === 'string') return x.trim()
    if (x !== null && typeof x === 'object') {
        return flattenObjectErrors(x as Record<string, unknown>, depth + 1)
    }
    return safeJsonStringify(x)
}

const flattenObjectErrors = (errors: Record<string, unknown>, depth = 0): string => {
    if (depth > MAX_NEST_DEPTH) return JSON.stringify(errors)
    return Object.entries(errors)
        .map(([field, val]) => {
            if (val == null) return ''
            if (typeof val === 'string') return val.trim() ? `${field}: ${val.trim()}` : ''
            if (typeof val === 'number' || typeof val === 'boolean') {
                return `${field}: ${String(val)}`
            }
            if (Array.isArray(val)) {
                const inner = val.map((x) => formatArrayElementForFlatten(x, depth)).filter(Boolean).join(', ')
                return inner ? `${field}: ${inner}` : ''
            }
            if (typeof val === 'object') {
                const nested = flattenObjectErrors(val as Record<string, unknown>, depth + 1)
                return nested ? `${field}: ${nested}` : ''
            }
            return `${field}: ${safeJsonStringify(val)}`
        })
        .filter(Boolean)
        .join(' | ')
}

/** DRF-style root object with only field keys (no `detail` wrapper). */
const collectRootLevelFieldErrors = (data: Record<string, unknown>, out: string[]) => {
    for (const [key, val] of Object.entries(data)) {
        if (META_KEYS.has(key)) continue
        if (val == null) continue
        if (typeof val === 'string') {
            if (val.trim()) out.push(`${key}: ${val.trim()}`)
        } else if (Array.isArray(val)) {
            const parts = val
                .map((x) => (typeof x === 'string' ? x.trim() : JSON.stringify(x)))
                .filter(Boolean)
            if (parts.length) out.push(`${key}: ${parts.join(', ')}`)
        } else if (typeof val === 'object') {
            const flat = flattenObjectErrors(val as Record<string, unknown>, 0)
            if (flat) out.push(`${key}: ${flat}`)
        }
    }
}

const uniqueJoin = (parts: string[]): string => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const p of parts) {
        const t = p.trim()
        if (!t || seen.has(t)) continue
        seen.add(t)
        out.push(t)
    }
    return out.join(' | ')
}

const collectAllFromJsonBody = (data: Record<string, unknown>): string => {
    const parts: string[] = []

    pushIfText(parts, data.description)

    if (typeof data.message === 'string') pushIfText(parts, data.message)
    else if (Array.isArray(data.message)) collectFromErrorField(data.message, parts, 0)

    if (typeof data.error === 'string') pushIfText(parts, data.error)
    else collectFromErrorField(data.error, parts, 0)

    pushIfText(parts, data.msg)
    collectFromDetail(data.detail, parts, 0)

    pushIfText(parts, data.name)
    pushIfText(parts, data.title)

    if (typeof data.code === 'string' || typeof data.code === 'number') {
        const c = String(data.code).trim()
        if (c) parts.push(`code: ${c}`)
    }

    if (Array.isArray(data.non_field_errors)) {
        collectFromErrorField(data.non_field_errors, parts, 0)
    }

    if (Array.isArray(data.errors) && data.errors.length > 0) {
        collectFromErrorField(data.errors, parts, 0)
    } else if (
        data.errors !== null &&
        typeof data.errors === 'object' &&
        !Array.isArray(data.errors) &&
        Object.keys(data.errors).length > 0
    ) {
        parts.push(flattenObjectErrors(data.errors as Record<string, unknown>, 0))
    }

    collectRootLevelFieldErrors(data, parts)

    const joined = uniqueJoin(parts.filter(Boolean))
    return joined
}

const collectFromArrayBody = (arr: unknown[]): string => {
    const parts: string[] = []
    for (const item of arr) {
        if (typeof item === 'string') pushIfText(parts, item)
        else if (item !== null && typeof item === 'object') {
            const o = item as Record<string, unknown>
            pushIfText(parts, o.detail as string)
            collectFromDetail(o.detail, parts, 0)
            pushIfText(parts, o.message as string)
            if (Object.keys(o).length) parts.push(collectAllFromJsonBody(o))
        } else if (item != null) {
            parts.push(safeJsonStringify(item))
        }
    }
    return uniqueJoin(parts)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const renderErrorMessage = (error: unknown): string => {
    const err = error as {
        message?: string
        response?: { data?: unknown; status?: number; statusText?: string }
    }

    if (!err?.response) {
        return (
            (typeof err?.message === 'string' && err.message.trim()) ||
            'An error occurred, please try again.'
        )
    }

    const { data } = err.response
    const status = err.response.status
    const statusText =
        typeof err.response.statusText === 'string' ? err.response.statusText.trim() : ''

    // ── JSON object ──────────────────────────────────────────────────────────
    if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
        const combined = collectAllFromJsonBody(data as Record<string, unknown>)
        if (combined) return combined
    }

    // ── JSON array ───────────────────────────────────────────────────────────
    if (Array.isArray(data) && data.length > 0) {
        const fromArr = collectFromArrayBody(data)
        if (fromArr) return fromArr
    }

    // ── String body ───────────────────────────────────────────────────────────
    if (typeof data === 'string') {
        const trimmed = data.trim()

        if (!trimmed) {
            return (
                (status && statusText && `${status} ${statusText}`) ||
                'An error occurred, please try again.'
            )
        }

        if (!trimmed.startsWith('<')) {
            return trimmed
        }

        const extracted = extractFromHtml(trimmed)
        if (extracted) return extracted
    }

    // ── Empty / null body ─────────────────────────────────────────────────────
    if (data == null || data === '') {
        if (status && statusText) return `${status} ${statusText}`
    }

    return 'An error occurred, please try again.'
}

export default renderErrorMessage
