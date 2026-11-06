'use client'

import Link from 'next/link'
import { Flame } from 'lucide-react'
import SearchBar from '@/components/common/SearchBar'
import { HIDE_SCROLLBAR } from './HomeSection'

interface HeroSearchPanelProps {
    trendingTerms: string[]
}

/** Prominent search box with a swipeable row of trending-term chips. */
export default function HeroSearchPanel({ trendingTerms }: HeroSearchPanelProps) {
    return (
        <div className="space-y-2">
            <div className="rounded-xl bg-white p-1 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800">
                <SearchBar variant="hero" />
            </div>
            {trendingTerms.length > 0 ? (
                <div className={`-mx-3 flex items-center gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0 ${HIDE_SCROLLBAR}`}>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                        <Flame className="h-3.5 w-3.5" aria-hidden />
                        Trending
                    </span>
                    {trendingTerms.map((term) => (
                        <Link
                            key={term}
                            href={`/products?search=${encodeURIComponent(term)}`}
                            className="inline-flex min-h-[32px] shrink-0 items-center rounded-full bg-white px-3 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200 hover:text-orange-600 hover:ring-orange-300 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-700"
                        >
                            {term}
                        </Link>
                    ))}
                </div>
            ) : null}
        </div>
    )
}
