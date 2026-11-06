'use client'

import { useEffect, useRef, useSyncExternalStore } from 'react'
import { parseIso, useServerClock } from '@/hooks/useServerClock'

/** One shared 1s ticker for every countdown on the page (a grid of cards uses a single interval). */
let tickCount = 0
let timer: ReturnType<typeof setInterval> | null = null
const subscribers = new Set<() => void>()

function subscribeTick(cb: () => void): () => void {
    subscribers.add(cb)
    if (timer === null) {
        timer = setInterval(() => {
            tickCount += 1
            subscribers.forEach(fn => fn())
        }, 1000)
    }
    return () => {
        subscribers.delete(cb)
        if (subscribers.size === 0 && timer !== null) {
            clearInterval(timer)
            timer = null
        }
    }
}

function useTick(): number {
    return useSyncExternalStore(
        subscribeTick,
        () => tickCount,
        () => 0
    )
}

const URGENT_BELOW_MS = 60 * 60 * 1000

const pad = (n: number) => String(n).padStart(2, '0')

export function formatRemaining(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000))
    const d = Math.floor(total / 86400)
    const h = Math.floor((total % 86400) / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`
    if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`
    if (m > 0) return `${m}m ${pad(s)}s`
    return `${s}s`
}

function spoken(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000))
    const d = Math.floor(total / 86400)
    const h = Math.floor((total % 86400) / 3600)
    const m = Math.floor((total % 3600) / 60)
    const parts = []
    if (d) parts.push(`${d} ${d === 1 ? 'day' : 'days'}`)
    if (h) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`)
    parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`)
    return parts.join(' ')
}

export interface CountdownProps {
    /** ISO timestamp to count down to (ends_at, or starts_at for upcoming auctions). */
    to: string
    /** Fired once when the server-corrected time reaches zero. */
    onEnd?: () => void
    /** Text shown after the timer reaches zero. */
    endedLabel?: string
    /** Text before the timer. */
    label?: string
    /** Under one hour the text turns red-700 (solid text colour, no alpha backgrounds). */
    urgentColor?: boolean
    className?: string
}

/**
 * Counts down to `to` using Date.now() + the server offset (see useServerClock).
 * The text uses tabular numerals so the width changes only when a unit appears or disappears.
 */
export default function Countdown({
    to,
    onEnd,
    endedLabel = 'Ended',
    label,
    urgentColor = true,
    className = '',
}: CountdownProps) {
    useTick()
    const { offsetMs } = useServerClock()
    const target = parseIso(to)
    const left = Number.isFinite(target) ? target - (Date.now() + offsetMs) : 0
    const ended = left <= 0

    const onEndRef = useRef(onEnd)
    const firedFor = useRef<string | null>(null)
    useEffect(() => {
        onEndRef.current = onEnd
    }, [onEnd])
    useEffect(() => {
        if (ended && firedFor.current !== to) {
            firedFor.current = to
            onEndRef.current?.()
        }
        if (!ended && firedFor.current === to) firedFor.current = null
    }, [ended, to])

    if (ended) {
        return <span className={`font-semibold text-zinc-700 dark:text-zinc-300 ${className}`}>{endedLabel}</span>
    }

    const urgent = urgentColor && left < URGENT_BELOW_MS
    return (
        <time
            dateTime={to}
            role="timer"
            aria-label={`${label ? `${label} ` : ''}${spoken(left)}`}
            className={`whitespace-nowrap font-mono tabular-nums ${urgent ? 'font-bold text-red-700 dark:text-red-400' : 'font-semibold text-zinc-900 dark:text-zinc-100'} ${className}`}
        >
            {label ? <span className="mr-1 font-sans font-normal text-zinc-600 dark:text-zinc-400">{label}</span> : null}
            <span aria-hidden="true">{formatRemaining(left)}</span>
        </time>
    )
}
