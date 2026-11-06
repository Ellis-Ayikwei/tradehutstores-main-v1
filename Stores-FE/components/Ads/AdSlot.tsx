'use client'

import { useState } from 'react'
import { useAd } from '@/hooks/useAd'
import AdBanner from './AdBanner'
import { AdCarouselView } from './AdCarousel'
import { resolveAspect } from './adLayout'
import { markDismissed } from '@/lib/ads'

interface AdSlotProps {
    slug: string
    aspectClass?: string
    rounded?: string
    className?: string
    /** Rendered when no live ad. Default: nothing (the slot collapses to zero height). */
    fallback?: React.ReactNode
    /** Preload the image. Pass only for the first hero on the page. */
    priority?: boolean
    /** Show a grey placeholder with the reserved aspect ratio while the placement loads. Default: true. */
    reserveSpace?: boolean
}

/**
 * Generic placement renderer. Picks the right component based on
 * placement.format and how many slots come back. Collapses to nothing when
 * there is no live ad.
 *
 * Use AdTopBar / AdModal directly for those formats.
 */
export default function AdSlot({
    slug,
    aspectClass,
    rounded = 'rounded-lg',
    className,
    fallback = null,
    priority = false,
    reserveSpace = true,
}: AdSlotProps) {
    const { placement, loading } = useAd(slug, { trackImpressions: true })
    const [hidden, setHidden] = useState<Set<string>>(new Set())

    if (loading) {
        if (!reserveSpace) return null
        const aspect = resolveAspect(aspectClass)
        return (
            <div className={className} aria-hidden="true">
                <div
                    className={`w-full animate-pulse bg-zinc-100 ${aspect.className} ${rounded}`}
                    style={aspect.style}
                />
            </div>
        )
    }

    if (!placement || placement.slots.length === 0) {
        return <>{fallback}</>
    }

    const slots = placement.slots.filter((s) => !hidden.has(s.id))
    if (!slots.length) return <>{fallback}</>

    const dismiss = (id: string) => {
        markDismissed(id)
        setHidden((p) => new Set(p).add(id))
    }

    if (placement.format === 'carousel' || (placement.max_active_slots > 1 && slots.length > 1)) {
        return (
            <AdCarouselView
                slots={slots}
                rotationSeconds={placement.rotation_seconds}
                ratio={placement.aspect_ratio}
                aspectClass={aspectClass}
                rounded={rounded}
                className={className}
                priority={priority}
                onDismiss={(slot) => dismiss(slot.id)}
            />
        )
    }

    return (
        <AdBanner
            slot={slots[0]}
            aspectClass={aspectClass}
            ratio={placement.aspect_ratio}
            rounded={rounded}
            className={className}
            priority={priority}
            onDismiss={() => dismiss(slots[0].id)}
        />
    )
}
