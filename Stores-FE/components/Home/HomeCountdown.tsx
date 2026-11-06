'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Local countdown (swap for the shared marketplace countdown later).
 * Renders nothing until mounted so server and client markup match.
 */
export default function HomeCountdown({
    endsAt,
    tone = 'light',
    label = 'Ends in',
}: {
    endsAt: string
    tone?: 'light' | 'dark'
    label?: string
}) {
    const [remaining, setRemaining] = useState<number | null>(null)

    useEffect(() => {
        const end = new Date(endsAt).getTime()
        if (Number.isNaN(end)) return
        const tick = () => setRemaining(Math.max(0, end - Date.now()))
        tick()
        const id = window.setInterval(tick, 1000)
        return () => window.clearInterval(id)
    }, [endsAt])

    if (remaining === null) return null

    if (remaining === 0) {
        return <span className="text-xs font-semibold text-neutral-400">Ended</span>
    }

    const days = Math.floor(remaining / 86_400_000)
    const h = Math.floor((remaining % 86_400_000) / 3_600_000)
    const m = Math.floor((remaining % 3_600_000) / 60_000)
    const s = Math.floor((remaining % 60_000) / 1000)

    const box =
        tone === 'dark'
            ? 'bg-white text-neutral-900'
            : 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
    const text = tone === 'dark' ? 'text-white/90' : 'text-neutral-600 dark:text-neutral-300'

    const parts = [...(days > 0 ? [`${days}d`] : []), pad(h), pad(m), pad(s)]

    return (
        <div className={`flex items-center gap-1.5 text-xs font-semibold ${text}`} role="timer">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
            <span className="flex items-center gap-1 font-mono tabular-nums">
                {parts.map((p, i) => (
                    <span key={i} className="flex items-center gap-1">
                        <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold leading-none ${box}`}>
                            {p}
                        </span>
                        {i < parts.length - 1 ? <span aria-hidden>:</span> : null}
                    </span>
                ))}
            </span>
        </div>
    )
}
