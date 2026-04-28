'use client'

import { useRouter } from 'next/navigation'
import SearchBar from '@/components/common/SearchBar'

interface HeroSearchPanelProps {
    trendingTerms: string[]
}

export default function HeroSearchPanel({ trendingTerms }: HeroSearchPanelProps) {
    const router = useRouter()

    return (
        <div className="max-w-3xl mx-auto text-center space-y-3">
            <div className="bg-gradient-to-r from-slate-100 via-white to-cyan-50 dark:from-zinc-900 dark:via-zinc-900 dark:to-slate-900 rounded-2xl p-1.5 shadow-sm border border-slate-200/80 dark:border-zinc-800">
                <SearchBar variant="hero" />
            </div>
            <div className="flex flex-wrap justify-center items-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                <span>Trending:</span>
                {trendingTerms.map((term) => (
                    <button
                        key={term}
                        onClick={() => router.push(`/products?search=${encodeURIComponent(term)}`)}
                        className="text-cyan-700 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
                    >
                        {term}
                    </button>
                ))}
            </div>
        </div>
    )
}
