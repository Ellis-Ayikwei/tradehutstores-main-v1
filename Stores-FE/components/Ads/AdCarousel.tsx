'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useAd } from '@/hooks/useAd'
import { markDismissed, type AdSlot } from '@/lib/ads'
import AdBanner from './AdBanner'

const DEFAULT_ROTATION_MS = 6000

interface AdCarouselViewProps {
    slots: AdSlot[]
    /** Seconds between slides; falls back to 6. */
    rotationSeconds?: number
    aspectClass?: string
    ratio?: string | null
    rounded?: string
    className?: string
    /** Preload the first slide's image. Only for the first hero on a page. */
    priority?: boolean
    onDismiss?: (slot: AdSlot) => void
}

const ARROW =
    'absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 shadow-md hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 [@media(hover:none)]:hidden'

/**
 * Presentational carousel (scroll-snap track, arrows, dots). Does not fetch or track:
 * AdSlot / AdCarousel own the data and impression beacons.
 */
export function AdCarouselView({
    slots,
    rotationSeconds,
    aspectClass,
    ratio,
    rounded = 'rounded-lg',
    className = '',
    priority = false,
    onDismiss,
}: Readonly<AdCarouselViewProps>) {
    const trackRef = useRef<HTMLDivElement>(null)
    const [active, setActive] = useState(0)
    const [paused, setPaused] = useState(false)
    const [touched, setTouched] = useState(false)
    const [reducedMotion, setReducedMotion] = useState(false)

    const count = slots.length
    const rotationMs = rotationSeconds && rotationSeconds > 0 ? rotationSeconds * 1000 : DEFAULT_ROTATION_MS

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
        setReducedMotion(mq.matches)
        const onChange = () => setReducedMotion(mq.matches)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    const goTo = useCallback(
        (index: number, behavior: ScrollBehavior = 'smooth') => {
            const track = trackRef.current
            if (!track || count === 0) return
            const next = ((index % count) + count) % count
            track.scrollTo({ left: next * track.clientWidth, behavior: reducedMotion ? 'auto' : behavior })
            setActive(next)
        },
        [count, reducedMotion]
    )

    // Keep the active index in sync with swipes / trackpad scrolls.
    const onScroll = () => {
        const track = trackRef.current
        if (!track || track.clientWidth === 0) return
        const idx = Math.round(track.scrollLeft / track.clientWidth)
        setActive((cur) => (cur === idx ? cur : Math.min(Math.max(idx, 0), Math.max(count - 1, 0))))
    }

    // A dismissed slide shifts the list: snap back inside range.
    useEffect(() => {
        if (active > count - 1) goTo(Math.max(count - 1, 0), 'auto')
    }, [count, active, goTo])

    // Auto-advance: off for reduced motion, a single slide, hover / focus / touch.
    useEffect(() => {
        if (count <= 1 || paused || touched || reducedMotion) return
        const t = window.setTimeout(() => goTo(active + 1), rotationMs)
        return () => window.clearTimeout(t)
    }, [active, count, paused, touched, reducedMotion, rotationMs, goTo])

    const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (count <= 1) return
        if (e.key === 'ArrowRight') {
            e.preventDefault()
            goTo(active + 1)
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            goTo(active - 1)
        }
    }

    if (count === 0) return null

    return (
        <div
            role="region"
            aria-roledescription="carousel"
            aria-label="Sponsored promotions"
            className={`group relative ${rounded} ${className}`}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            onTouchStart={() => setTouched(true)}
            onKeyDown={onKeyDown}
        >
            <div
                ref={trackRef}
                onScroll={onScroll}
                className={`flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${rounded}`}
            >
                {slots.map((slot, i) => (
                    <div
                        key={slot.id}
                        role="group"
                        aria-roledescription="slide"
                        aria-label={`${i + 1} of ${count}`}
                        aria-hidden={i === active ? undefined : true}
                        className="w-full shrink-0 snap-center"
                    >
                        <AdBanner
                            slot={slot}
                            aspectClass={aspectClass}
                            ratio={ratio}
                            rounded={rounded}
                            priority={priority && i === 0}
                            interactive={i === active}
                            onDismiss={onDismiss ? () => onDismiss(slot) : undefined}
                        />
                    </div>
                ))}
            </div>

            {count > 1 ? (
                <>
                    <button
                        type="button"
                        onClick={() => goTo(active - 1)}
                        aria-label="Previous promotion"
                        className={`${ARROW} left-2`}
                    >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => goTo(active + 1)}
                        aria-label="Next promotion"
                        className={`${ARROW} right-2`}
                    >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>

                    <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center rounded-full bg-white px-1.5 shadow-sm">
                        {slots.map((slot, i) => (
                            <button
                                key={slot.id}
                                type="button"
                                onClick={() => goTo(i)}
                                aria-label={`Show promotion ${i + 1} of ${count}`}
                                aria-current={i === active ? 'true' : undefined}
                                className="relative flex h-5 w-4 items-center justify-center before:absolute before:-inset-x-0.5 before:-inset-y-3 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                            >
                                <span
                                    className={`block h-1.5 rounded-full transition-[width,background-color] ${
                                        i === active ? 'w-4 bg-zinc-900' : 'w-1.5 bg-zinc-400'
                                    }`}
                                />
                            </button>
                        ))}
                    </div>
                </>
            ) : null}
        </div>
    )
}

interface AdCarouselProps {
    slug: string
    aspectClass?: string
    rounded?: string
    className?: string
    priority?: boolean
}

/** Standalone carousel: fetches the placement itself (impressions tracked by useAd). */
export default function AdCarousel({ slug, aspectClass, rounded, className, priority }: AdCarouselProps) {
    const { placement } = useAd(slug, { trackImpressions: true })
    const [hidden, setHidden] = useState<Set<string>>(new Set())

    const slots = (placement?.slots ?? []).filter((s) => !hidden.has(s.id))
    if (!slots.length) return null

    return (
        <AdCarouselView
            slots={slots}
            rotationSeconds={placement?.rotation_seconds}
            ratio={placement?.aspect_ratio}
            aspectClass={aspectClass}
            rounded={rounded}
            className={className}
            priority={priority}
            onDismiss={(slot) => {
                markDismissed(slot.id)
                setHidden((p) => new Set(p).add(slot.id))
            }}
        />
    )
}
