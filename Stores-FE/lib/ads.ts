/**
 * Storefront client for the ad system.
 *   - fetchPlacement(slug) → resolved ad(s) for a slot
 *   - sendImpression(slotId) / sendClick(slotId, dest) → tracking beacons
 *
 * Uses sendBeacon when available so impressions survive page navigation.
 */

import { apiUrl } from './config'

export type AdFormat = 'image' | 'video' | 'html' | 'text'

export interface AdCreative {
    id: string
    format: AdFormat
    image_desktop: string | null
    image_mobile: string | null
    video_url: string
    html_body: string
    headline: string
    subheadline: string
    eyebrow: string
    cta_label: string
    cta_url: string
    open_in_new_tab: boolean
    background_color: string
    text_color: string
    accent_color: string
    alt_text: string
}

export interface AdSlot {
    id: string
    creative: AdCreative
    position_hint: number
    dismissible: boolean
    show_close_after_seconds: number
    delay_seconds: number
}

export interface AdPlacement {
    slug: string
    name: string
    format: 'banner' | 'carousel' | 'modal' | 'topbar' | 'sidebar' | 'inline_card' | 'fullscreen'
    aspect_ratio: string
    max_active_slots: number
    rotation_seconds: number
    slots: AdSlot[]
}

const AD_SESSION_KEY = 'th_ad_session'

function getOrCreateSessionId(): string {
    if (typeof window === 'undefined') return ''
    try {
        let sid = localStorage.getItem(AD_SESSION_KEY)
        if (!sid) {
            sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
            localStorage.setItem(AD_SESSION_KEY, sid)
        }
        return sid
    } catch {
        return ''
    }
}

function buildHeaders(): HeadersInit {
    const sid = getOrCreateSessionId()
    return {
        'Content-Type': 'application/json',
        ...(sid ? { Cookie: `ad_session=${sid}` } : {}),
    }
}

interface FetchOptions {
    path?: string
    ab?: string
    categoryIds?: string[]
}

export async function fetchPlacement(
    slug: string,
    opts: FetchOptions = {},
    signal?: AbortSignal
): Promise<AdPlacement | null> {
    const params = new URLSearchParams()
    if (opts.path) params.set('path', opts.path)
    if (opts.ab) params.set('ab', opts.ab)
    if (opts.categoryIds) opts.categoryIds.forEach((c) => params.append('cat', c))

    const url = `${apiUrl}ads/placement/${slug}/${params.toString() ? `?${params}` : ''}`
    try {
        const res = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: buildHeaders(),
            signal,
        })
        if (!res.ok) return null
        return (await res.json()) as AdPlacement
    } catch {
        return null
    }
}

function postBeacon(path: string, body: object): void {
    if (typeof window === 'undefined') return
    const url = `${apiUrl}${path}`
    const sid = getOrCreateSessionId()
    const payload = JSON.stringify({ ...body, session_id: sid })

    try {
        if ('sendBeacon' in navigator) {
            const blob = new Blob([payload], { type: 'application/json' })
            const ok = navigator.sendBeacon(url, blob)
            if (ok) return
        }
    } catch {
        /* fallthrough */
    }

    fetch(url, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: buildHeaders(),
        body: payload,
    }).catch(() => undefined)
}

export function sendImpression(slotId: string, pageUrl?: string): void {
    postBeacon('ads/beacon/impression/', {
        slot: slotId,
        page_url: pageUrl ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
        referrer: typeof document !== 'undefined' ? document.referrer : '',
    })
}

export function sendClick(slotId: string, destinationUrl: string, pageUrl?: string): void {
    postBeacon('ads/beacon/click/', {
        slot: slotId,
        destination_url: destinationUrl,
        page_url: pageUrl ?? (typeof window !== 'undefined' ? window.location.pathname : ''),
    })
}

// ── Dismiss tracking ─────────────────────────────────────────────────────────

const DISMISS_PREFIX = 'th_ad_dismiss:'

export function isDismissed(slotId: string): boolean {
    if (typeof window === 'undefined') return false
    try {
        const v = localStorage.getItem(`${DISMISS_PREFIX}${slotId}`)
        if (!v) return false
        const expires = Number(v)
        if (Number.isNaN(expires)) return true
        if (expires === 0) return true
        return Date.now() < expires
    } catch {
        return false
    }
}

export function markDismissed(slotId: string, ttlMs: number = 7 * 24 * 60 * 60 * 1000): void {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(`${DISMISS_PREFIX}${slotId}`, String(Date.now() + ttlMs))
    } catch {
        /* ignore */
    }
}
