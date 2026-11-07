'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { cx } from './cx'

export interface CountdownProps {
    /** ISO string, epoch ms or Date. */
    endsAt: string | number | Date
    /** Fired once when the timer reaches zero (or immediately if already past). */
    onEnd?: () => void
    /**
     * chips:   boxed Days / Hrs / Min / Sec (hero and section headers)
     * inline:  "2d 03:04:05" text
     * compact: small clock chip for cards
     */
    variant?: 'chips' | 'inline' | 'compact'
    /**
     * serverNow - clientNow in ms. The server is the clock: pass the offset
     * derived from an API `server_time` field so skewed devices still agree.
     */
    serverOffsetMs?: number
    /** Text before the timer, e.g. "Ends in". */
    label?: string
    endedLabel?: string
    /** chips only. "light" gives white chips for use on dark backgrounds. */
    tone?: 'dark' | 'light'
    className?: string
}

interface Parts {
    days: number
    hours: number
    minutes: number
    seconds: number
}

function toParts(ms: number): Parts {
    const total = Math.max(0, Math.floor(ms / 1000))
    return {
        days: Math.floor(total / 86400),
        hours: Math.floor((total % 86400) / 3600),
        minutes: Math.floor((total % 3600) / 60),
        seconds: total % 60,
    }
}

const pad = (n: number) => String(n).padStart(2, '0')

function Chip({ value, unit, tone }: { value: string; unit: string; tone: 'dark' | 'light' }) {
    return (
        <span
            className={cx(
                'flex min-w-[44px] flex-col items-center rounded-md px-2 py-1.5',
                tone === 'light' ? 'bg-white text-zinc-900' : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
            )}
        >
            <span className="font-mono text-lg font-bold leading-none tabular-nums sm:text-xl">{value}</span>
            <span
                className={cx(
                    'mt-1 text-[11px] font-medium leading-none',
                    tone === 'light' ? 'text-zinc-600' : 'text-zinc-300 dark:text-zinc-600'
                )}
            >
                {unit}
            </span>
        </span>
    )
}

export default function Countdown({
    endsAt,
    onEnd,
    variant = 'inline',
    serverOffsetMs = 0,
    label,
    endedLabel = 'Ended',
    tone = 'dark',
    className,
}: CountdownProps) {
    const endMs = new Date(endsAt).getTime()
    const [remaining, setRemaining] = useState<number | null>(null)
    const onEndRef = useRef(onEnd)
    const firedRef = useRef(false)

    useEffect(() => {
        onEndRef.current = onEnd
    }, [onEnd])

    useEffect(() => {
        firedRef.current = false
        if (!Number.isFinite(endMs)) {
            setRemaining(0)
            return
        }
        const tick = () => {
            const left = endMs - (Date.now() + serverOffsetMs)
            setRemaining(Math.max(0, left))
            if (left <= 0 && !firedRef.current) {
                firedRef.current = true
                onEndRef.current?.()
                return true
            }
            return left <= 0
        }
        if (tick()) return
        const id = window.setInterval(() => {
            if (tick()) window.clearInterval(id)
        }, 1000)
        return () => window.clearInterval(id)
    }, [endMs, serverOffsetMs])

    const ready = remaining !== null
    const ended = ready && remaining === 0
    const p = toParts(remaining ?? 0)
    const spoken = ready
        ? ended
            ? endedLabel
            : `${p.days > 0 ? `${p.days} days ` : ''}${p.hours} hours ${p.minutes} minutes ${p.seconds} seconds remaining`
        : 'Loading countdown'

    if (ended) {
        return (
            <span
                className={cx(
                    'inline-flex items-center gap-1 text-sm font-semibold text-zinc-600 dark:text-zinc-400',
                    className
                )}
            >
                {endedLabel}
            </span>
        )
    }

    const dash = '--'
    const d = ready ? String(p.days) : dash
    const h = ready ? pad(p.hours) : dash
    const m = ready ? pad(p.minutes) : dash
    const s = ready ? pad(p.seconds) : dash

    if (variant === 'chips') {
        return (
            <span role="timer" aria-label={spoken} className={cx('inline-flex items-center gap-2', className)}>
                {label ? <span className="text-sm font-semibold">{label}</span> : null}
                <span className="inline-flex items-center gap-1.5" aria-hidden="true">
                    {!ready || p.days > 0 ? <Chip value={d} unit="Days" tone={tone} /> : null}
                    <Chip value={h} unit="Hrs" tone={tone} />
                    <Chip value={m} unit="Min" tone={tone} />
                    <Chip value={s} unit="Sec" tone={tone} />
                </span>
            </span>
        )
    }

    const text = `${!ready || p.days > 0 ? `${d}d ` : ''}${h}:${m}:${s}`

    if (variant === 'compact') {
        return (
            <span
                role="timer"
                aria-label={spoken}
                className={cx(
                    'inline-flex items-center gap-1 rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[11px] font-semibold leading-4 tabular-nums text-white dark:bg-zinc-950',
                    className
                )}
            >
                <Clock className="h-3 w-3" aria-hidden="true" />
                <span aria-hidden="true">{text}</span>
            </span>
        )
    }

    return (
        <span
            role="timer"
            aria-label={spoken}
            className={cx('inline-flex items-center gap-1.5 text-sm font-semibold', className)}
        >
            {label ? <span aria-hidden="true">{label}</span> : null}
            <span className="font-mono tabular-nums" aria-hidden="true">
                {text}
            </span>
        </span>
    )
}
