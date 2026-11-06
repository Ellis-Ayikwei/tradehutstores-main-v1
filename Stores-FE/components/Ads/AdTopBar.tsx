'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { useAd } from '@/hooks/useAd'
import { markDismissed, sendClick } from '@/lib/ads'
import { creativeColors } from './adLayout'

interface AdTopBarProps {
    /** Placement slug. Defaults to homepage-top-bar. */
    slug?: string
    /** Rendered when no live ad is found (or while loading). Default: nothing. */
    fallback?: React.ReactNode
}

/**
 * Slim (h-9) single-line promo strip above the navbar. Reads the `homepage-top-bar`
 * placement; rotates between slots if the placement asks for it. Dismissal is remembered
 * per ad id in localStorage (see lib/ads markDismissed / isDismissed). Renders nothing when
 * there is no ad.
 */
export default function AdTopBar({ slug = 'homepage-top-bar', fallback = null }: AdTopBarProps) {
    const { placement } = useAd(slug, { trackImpressions: true })
    const [activeIdx, setActiveIdx] = useState(0)
    const [hidden, setHidden] = useState<Set<string>>(new Set())

    const liveSlots = (placement?.slots ?? []).filter((s) => !hidden.has(s.id))
    const rotation = (placement?.rotation_seconds ?? 0) * 1000

    useEffect(() => {
        if (liveSlots.length <= 1 || rotation <= 0) return
        const t = setInterval(() => setActiveIdx((i) => (i + 1) % liveSlots.length), rotation)
        return () => clearInterval(t)
    }, [liveSlots.length, rotation])

    if (!liveSlots.length) {
        return <>{fallback}</>
    }

    const slot = liveSlots[activeIdx % liveSlots.length]
    const c = slot.creative
    const colors = creativeColors(c)
    const text = [c.headline, c.subheadline].filter(Boolean).join(' · ')
    if (!text && !c.cta_label) return <>{fallback}</>

    const handleClick = () => {
        if (c.cta_url) sendClick(slot.id, c.cta_url)
    }

    const dismiss = () => {
        markDismissed(slot.id)
        setHidden((prev) => new Set(prev).add(slot.id))
    }

    const message = (
        <>
            {c.eyebrow ? <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide">{c.eyebrow}</span> : null}
            <span className="truncate">{text}</span>
            {c.cta_label ? (
                <span className="shrink-0 font-semibold underline underline-offset-2">{c.cta_label}</span>
            ) : null}
        </>
    )
    const messageClass =
        'flex min-w-0 items-center justify-center gap-1.5 rounded px-1 text-xs hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 sm:text-sm'

    return (
        <div
            className={`font-body ${colors ? '' : 'border-b border-primary-100 bg-primary-50 text-zinc-900'}`}
            style={colors ?? undefined}
        >
            <div className="mx-auto flex h-9 max-w-screen-2xl items-center gap-2 px-3 sm:px-6">
                <span
                    className={`shrink-0 text-[11px] leading-4 ${colors ? 'opacity-70' : 'text-zinc-500'}`}
                >
                    Sponsored
                </span>

                <div className="flex min-w-0 flex-1 items-center justify-center">
                    {c.cta_url ? (
                        c.open_in_new_tab ? (
                            <a
                                href={c.cta_url}
                                target="_blank"
                                rel="noopener noreferrer sponsored"
                                onClick={handleClick}
                                className={messageClass}
                            >
                                {message}
                            </a>
                        ) : (
                            <Link href={c.cta_url} onClick={handleClick} className={messageClass}>
                                {message}
                            </Link>
                        )
                    ) : (
                        <p className="flex min-w-0 items-center justify-center gap-1.5 px-1 text-xs sm:text-sm">
                            {message}
                        </p>
                    )}
                </div>

                {slot.dismissible ? (
                    <button
                        type="button"
                        onClick={dismiss}
                        aria-label="Close banner"
                        className="relative -mr-2 flex h-9 w-11 shrink-0 items-center justify-center rounded-full before:absolute before:-inset-y-1 before:inset-x-0 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                    >
                        <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                ) : null}
            </div>
        </div>
    )
}
