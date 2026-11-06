'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'
import { HIDE_SCROLLBAR, HOME_CONTAINER, SectionHeader } from './HomeSection'
import { RECENTLY_VIEWED_KEY, type RecentlyViewedItem } from './homeProduct'
import { resolveMediaSrc } from '@/lib/mediaUrl'

function readItems(): RecentlyViewedItem[] {
    try {
        const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY)
        const parsed: unknown = raw ? JSON.parse(raw) : []
        if (!Array.isArray(parsed)) return []
        return parsed
            .filter(
                (p): p is RecentlyViewedItem =>
                    !!p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.price === 'number'
            )
            .slice(0, 12)
    } catch {
        return []
    }
}

/** Reads items the PDP stored in localStorage; renders nothing when there are none. */
export default function RecentlyViewed() {
    const { formatDisplayPrice } = useCurrency()
    const [items, setItems] = useState<RecentlyViewedItem[]>([])

    useEffect(() => {
        setItems(readItems())
    }, [])

    if (items.length === 0) return null

    return (
        <section aria-label="Recently viewed" className={`${HOME_CONTAINER} mt-6`}>
            <SectionHeader title="Recently viewed" />
            <ul className={`-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 ${HIDE_SCROLLBAR}`}>
                {items.map((item) => (
                    <li key={item.id} className="w-28 shrink-0 snap-start sm:w-32 lg:w-36">
                        <Link
                            href={`/products/${item.id}`}
                            className="block overflow-hidden rounded-xl border border-neutral-200 bg-white hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
                        >
                            <div className="relative aspect-square bg-neutral-100 dark:bg-neutral-800">
                                {item.image ? (
                                    <Image
                                        src={resolveMediaSrc(item.image)}
                                        alt={item.name}
                                        fill
                                        sizes="(max-width: 640px) 112px, 144px"
                                        loading="lazy"
                                        className="object-cover"
                                    />
                                ) : null}
                            </div>
                            <div className="p-2">
                                <p className="line-clamp-1 text-xs text-neutral-700 dark:text-neutral-200">{item.name}</p>
                                <p className="font-mono text-sm font-bold tabular-nums text-neutral-900 dark:text-white">
                                    {formatDisplayPrice(item.price)}
                                </p>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}
