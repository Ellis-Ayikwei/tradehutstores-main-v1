'use client'

import { useEffect, useState } from 'react'
import { useAd } from '@/hooks/useAd'
import AdBanner from './AdBanner'
import { markDismissed } from '@/lib/ads'

interface AdCarouselProps {
    slug: string
    aspectClass?: string
    rounded?: string
    className?: string
}

/** Auto-rotating carousel that shows one slot at a time and exposes dot nav. */
export default function AdCarousel({
    slug,
    aspectClass = 'aspect-[16/4]',
    rounded = 'rounded-2xl',
    className = '',
}: AdCarouselProps) {
    const { placement } = useAd(slug, { trackImpressions: true })
    const [active, setActive] = useState(0)
    const [hidden, setHidden] = useState<Set<string>>(new Set())

    const slots = (placement?.slots ?? []).filter((s) => !hidden.has(s.id))
    const rotation = (placement?.rotation_seconds ?? 5) * 1000 || 5000

    useEffect(() => {
        if (slots.length <= 1) return
        const t = setInterval(() => setActive((i) => (i + 1) % slots.length), rotation)
        return () => clearInterval(t)
    }, [slots.length, rotation])

    if (!slots.length) return null

    const current = slots[active % slots.length]

    return (
        <div className={`relative ${className}`}>
            <AdBanner
                slot={current}
                aspectClass={aspectClass}
                rounded={rounded}
                onDismiss={() => {
                    markDismissed(current.id)
                    setHidden((p) => new Set(p).add(current.id))
                }}
            />
            {slots.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {slots.map((s, i) => (
                        <button
                            key={s.id}
                            onClick={() => setActive(i)}
                            aria-label={`Show ad ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all active:scale-95 ${
                                i === active
                                    ? 'w-6 bg-surface-container-lowest shadow-sm'
                                    : 'w-1.5 bg-surface-container-lowest/50 hover:bg-surface-container-lowest/80'
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
