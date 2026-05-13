'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Tag } from 'lucide-react'
import { useAd } from '@/hooks/useAd'
import { markDismissed, sendClick } from '@/lib/ads'

interface AdTopBarProps {
    /** Placement slug. Defaults to homepage-top-bar. */
    slug?: string
    /** Rendered when no live ad is found (or while loading). */
    fallback?: React.ReactNode
}

/**
 * Sticky promotional strip above the navbar. Reads the `homepage-top-bar`
 * placement; rotates between slots if more than one is returned.
 */
export default function AdTopBar({ slug = 'homepage-top-bar', fallback = null }: AdTopBarProps) {
    const { placement } = useAd(slug, { trackImpressions: true })
    const [activeIdx, setActiveIdx] = useState(0)
    const [hidden, setHidden] = useState<Set<string>>(new Set())

    const liveSlots = (placement?.slots ?? []).filter((s) => !hidden.has(s.id))
    const rotation = (placement?.rotation_seconds ?? 0) * 1000

    useEffect(() => {
        if (liveSlots.length <= 1 || rotation <= 0) return
        const t = setInterval(
            () => setActiveIdx((i) => (i + 1) % liveSlots.length),
            rotation
        )
        return () => clearInterval(t)
    }, [liveSlots.length, rotation])

    if (!liveSlots.length) {
        return <>{fallback}</>
    }

    const slot = liveSlots[activeIdx % liveSlots.length]
    const c = slot.creative
    const customBg = c.background_color
    const accent = c.accent_color
    const isGradientBg =
        !!customBg &&
        (customBg.includes('gradient') || customBg.startsWith('linear-'))

    const fg = c.text_color || (customBg ? '#ffffff' : undefined)

    const handleClick = () => {
        if (c.cta_url) sendClick(slot.id, c.cta_url)
    }

    const dismiss = () => {
        markDismissed(slot.id)
        setHidden((prev) => {
            const next = new Set(prev)
            next.add(slot.id)
            return next
        })
    }

    const ctaInner = (
        <span
            className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all active:scale-95 border ${
                accent
                    ? 'border-white/30 bg-inverse-on-surface/15'
                    : !customBg
                      ? 'border-white/25 bg-inverse-on-surface/15'
                      : 'border-outline-variant/40 bg-inverse-on-surface/15'
            }`}
            style={
                accent
                    ? { borderColor: `${accent}88`, color: fg ?? undefined }
                    : { color: fg ?? undefined }
            }
        >
            <Tag className="h-3 w-3" />
            {c.cta_label || 'Shop now'}
        </span>
    )

    return (
        <div
            className={`relative overflow-hidden font-body ${!customBg ? 'bg-primary-gradient text-on-primary' : ''}`}
            style={
                customBg
                    ? {
                          ...(isGradientBg
                              ? { background: customBg }
                              : { backgroundColor: customBg }),
                          color: fg,
                      }
                    : c.text_color
                      ? { color: c.text_color }
                      : undefined
            }
        >
            <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 relative z-10">
                <div className="flex items-center justify-between gap-2 py-1.5 sm:py-2">
                    <div className="flex-1 flex items-center justify-center min-w-0 text-xs sm:text-sm font-medium gap-2 text-inherit">
                        {c.eyebrow && (
                            <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs shrink-0 text-inherit">
                                {c.eyebrow}
                            </span>
                        )}
                        <span className="truncate text-inherit">
                            {c.headline}
                            {c.subheadline && (
                                <span className="hidden md:inline opacity-90"> · {c.subheadline}</span>
                            )}
                        </span>
                        {c.cta_url ? (
                            c.open_in_new_tab ? (
                                <a
                                    href={c.cta_url}
                                    target="_blank"
                                    rel="noopener noreferrer sponsored"
                                    onClick={handleClick}
                                >
                                    {ctaInner}
                                </a>
                            ) : (
                                <Link href={c.cta_url} onClick={handleClick}>
                                    {ctaInner}
                                </Link>
                            )
                        ) : null}
                    </div>

                    {slot.dismissible && (
                        <button
                            onClick={dismiss}
                            className="shrink-0 p-1 sm:p-1.5 hover:bg-inverse-on-surface/15 rounded-full transition-all hover:rotate-90 duration-300 active:scale-95"
                            aria-label="Close banner"
                        >
                            <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
