'use client'

import { useState } from 'react'
import { useAd } from '@/hooks/useAd'
import AdBanner from './AdBanner'
import AdCarousel from './AdCarousel'
import { markDismissed } from '@/lib/ads'

interface AdSlotProps {
    slug: string
    aspectClass?: string
    rounded?: string
    className?: string
    /** Rendered when no live ad. Default: nothing. */
    fallback?: React.ReactNode
}

/**
 * Generic placement renderer. Picks the right component based on
 * placement.format and how many slots come back.
 *
 * Use AdTopBar / AdModal directly for those formats.
 */
export default function AdSlot({
    slug,
    aspectClass,
    rounded,
    className,
    fallback = null,
}: AdSlotProps) {
    const { placement } = useAd(slug, { trackImpressions: true })
    const [hidden, setHidden] = useState<Set<string>>(new Set())

    if (!placement || placement.slots.length === 0) {
        return <>{fallback}</>
    }

    const slots = placement.slots.filter((s) => !hidden.has(s.id))
    if (!slots.length) return <>{fallback}</>

    if (placement.format === 'carousel' || (placement.max_active_slots > 1 && slots.length > 1)) {
        return (
            <AdCarousel
                slug={slug}
                aspectClass={aspectClass}
                rounded={rounded}
                className={className}
            />
        )
    }

    return (
        <AdBanner
            slot={slots[0]}
            aspectClass={aspectClass}
            rounded={rounded}
            className={className}
            onDismiss={() => {
                markDismissed(slots[0].id)
                setHidden((p) => new Set(p).add(slots[0].id))
            }}
        />
    )
}
