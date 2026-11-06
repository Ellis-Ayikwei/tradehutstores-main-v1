'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Server clock offset (serverNow - clientNow, in ms).
 *
 * Every auctions API response carries `server_time` (or, failing that, a `Date` header). Each
 * response is recorded as one sample: server_time minus the midpoint of the request round trip.
 * The offset is the median of the last 3 samples. It is used for DISPLAY only (countdowns);
 * the server alone decides whether a bid is accepted.
 */

const MAX_SAMPLES = 3
/** Ignore jitter smaller than this so countdowns do not re-render on every response. */
const NOTIFY_THRESHOLD_MS = 250

let samples: number[] = []
let offsetMs = 0
const listeners = new Set<() => void>()

/**
 * Parse an ISO timestamp from the API. Python emits microseconds (6 fractional digits), which
 * some engines reject, so the fraction is trimmed to milliseconds first. Returns NaN if invalid.
 */
export function parseIso(value: string | null | undefined): number {
    if (!value) return Number.NaN
    return Date.parse(value.replace(/(\.\d{3})\d+/, '$1'))
}

export function recordServerTime(serverTime: string | null | undefined, requestStartMs: number, responseMs: number): void {
    const server = parseIso(serverTime)
    if (!Number.isFinite(server)) return
    const midpoint = (requestStartMs + responseMs) / 2
    samples = [...samples, server - midpoint].slice(-MAX_SAMPLES)
    const sorted = [...samples].sort((a, b) => a - b)
    const next = Math.round(sorted[Math.floor(sorted.length / 2)])
    const first = samples.length === 1
    if (first || Math.abs(next - offsetMs) >= NOTIFY_THRESHOLD_MS) {
        offsetMs = next
        listeners.forEach(fn => fn())
    }
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

const getSnapshot = () => offsetMs
const getServerSnapshot = () => 0

export function useServerClock(): { offsetMs: number; serverNow: () => number } {
    const offset = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
    const serverNow = useCallback(() => Date.now() + offset, [offset])
    return { offsetMs: offset, serverNow }
}
