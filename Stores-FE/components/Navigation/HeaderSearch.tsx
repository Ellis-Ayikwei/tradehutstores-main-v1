'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Camera, Clock, X, ChevronDown } from 'lucide-react'
import ImageSearchModal from '@/components/common/ImageSearchModal'
import {
    autocomplete as autocompleteApi,
    getRecentSearches,
    removeRecentSearch,
    saveRecentSearch,
    type AutocompleteHit,
} from '@/lib/searchClient'
import { useCurrency } from '@/contexts/CurrencyContext'

interface HeaderSearchProps {
    /** Category names for the desktop select. Empty list hides the select. */
    categories: string[]
    className?: string
}

const rowClass =
    'flex w-full min-h-[44px] items-center gap-3 px-3 py-2 text-left text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'

/**
 * Primary header search. Same behaviour as the shared SearchBar (autocomplete +
 * recent searches + image search, navigates to /products?search=…) plus an
 * optional category scope that adds &category=… to the URL.
 */
export default function HeaderSearch({ categories, className = '' }: HeaderSearchProps) {
    const router = useRouter()
    const { formatDisplayPrice } = useCurrency()
    const listId = useId()

    const [query, setQuery] = useState('')
    const [category, setCategory] = useState('')
    const [open, setOpen] = useState(false)
    const [recent, setRecent] = useState<string[]>([])
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [hits, setHits] = useState<AutocompleteHit[]>([])
    const [loading, setLoading] = useState(false)
    const [imageOpen, setImageOpen] = useState(false)

    const wrapRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setRecent(getRecentSearches())
    }, [])

    useEffect(() => {
        function onDown(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        return () => document.removeEventListener('mousedown', onDown)
    }, [])

    // Debounced autocomplete (>= 2 chars). searchClient swallows network errors.
    useEffect(() => {
        const q = query.trim()
        if (q.length < 2) {
            setSuggestions([])
            setHits([])
            setLoading(false)
            return
        }
        setLoading(true)
        let cancelled = false
        const handle = setTimeout(async () => {
            const res = await autocompleteApi(q)
            if (cancelled) return
            setSuggestions((res.suggestions ?? []).slice(0, 6))
            setHits((res.products ?? []).slice(0, 4))
            setLoading(false)
        }, 220)
        return () => {
            cancelled = true
            clearTimeout(handle)
        }
    }, [query])

    const go = useCallback(
        (raw: string) => {
            const q = raw.trim()
            if (!q && !category) return
            if (q) {
                saveRecentSearch(q)
                setRecent(getRecentSearches())
                setQuery(q)
            }
            setOpen(false)
            inputRef.current?.blur()
            const params = new URLSearchParams()
            if (q) params.set('search', q)
            if (category) params.set('category', category)
            router.push(`/products?${params.toString()}`)
        },
        [category, router]
    )

    const goProduct = useCallback(
        (hit: AutocompleteHit) => {
            const id = String(hit.id ?? '').trim()
            if (!id) return
            setOpen(false)
            router.push(`/products/${encodeURIComponent(id)}`)
        },
        [router]
    )

    const hasQuery = query.trim().length > 0
    const showPanel = open && (hasQuery || recent.length > 0)

    return (
        <div ref={wrapRef} className={`relative w-full ${className}`}>
            <form
                role="search"
                onSubmit={(e) => {
                    e.preventDefault()
                    go(query)
                }}
                className="flex h-11 w-full items-stretch overflow-hidden rounded-lg border-2 border-orange-500 bg-white dark:bg-gray-900 focus-within:ring-2 focus-within:ring-orange-300 dark:focus-within:ring-orange-800"
            >
                {categories.length > 0 && (
                    <div className="relative hidden lg:block shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            aria-label="Search category"
                            className="h-full w-36 xl:w-44 appearance-none truncate bg-gray-50 dark:bg-gray-800 pl-3 pr-7 text-sm font-medium text-gray-700 dark:text-gray-200 outline-none cursor-pointer"
                        >
                            <option value="">All categories</option>
                            {categories.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    </div>
                )}

                <input
                    ref={inputRef}
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            setOpen(false)
                            inputRef.current?.blur()
                        }
                    }}
                    placeholder="Search products, brands, categories"
                    aria-label="Search products"
                    aria-controls={showPanel ? listId : undefined}
                    className="min-w-0 flex-1 bg-white dark:bg-gray-900 px-3 text-base lg:text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none [&::-webkit-search-cancel-button]:hidden"
                />

                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('')
                            inputRef.current?.focus()
                        }}
                        aria-label="Clear search"
                        className="flex w-9 shrink-0 items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setImageOpen(true)}
                    aria-label="Search by image"
                    className="flex w-10 shrink-0 items-center justify-center text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors"
                >
                    <Camera className="h-5 w-5" />
                </button>

                <button
                    type="submit"
                    aria-label="Search"
                    className="flex w-12 lg:w-14 shrink-0 items-center justify-center bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700 transition-colors"
                >
                    <Search className="h-5 w-5" />
                </button>
            </form>

            {showPanel && (
                <div
                    id={listId}
                    className="absolute left-0 right-0 top-full z-[300] mt-1.5 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                    style={{ animation: 'dropIn 0.15s cubic-bezier(0.16,1,0.3,1) forwards' }}
                >
                    {!hasQuery && recent.length > 0 && (
                        <div className="py-1.5">
                            <p className="px-3 pb-1 pt-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                                Recent searches
                            </p>
                            {recent.map((r) => (
                                <div key={r} className="flex items-center hover:bg-gray-50 dark:hover:bg-gray-800">
                                    <button
                                        type="button"
                                        onClick={() => go(r)}
                                        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 px-3 text-left text-sm text-gray-700 dark:text-gray-200"
                                    >
                                        <Clock className="h-4 w-4 shrink-0 text-gray-400" />
                                        <span className="truncate">{r}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            removeRecentSearch(r)
                                            setRecent(getRecentSearches())
                                        }}
                                        aria-label={`Remove ${r} from recent searches`}
                                        className="flex h-11 w-11 shrink-0 items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {hasQuery && (
                        <>
                            <div className="py-1.5">
                                <p className="px-3 pb-1 pt-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                                    {loading ? 'Searching…' : 'Suggestions'}
                                </p>
                                <button type="button" onClick={() => go(query)} className={rowClass}>
                                    <Search className="h-4 w-4 shrink-0 text-gray-400" />
                                    <span className="min-w-0 flex-1 truncate">
                                        Search for <span className="font-semibold">“{query.trim()}”</span>
                                        {category ? <span className="text-gray-500"> in {category}</span> : null}
                                    </span>
                                </button>
                                {suggestions.map((s) => (
                                    <button key={s} type="button" onClick={() => go(s)} className={rowClass}>
                                        <Search className="h-4 w-4 shrink-0 text-gray-400" />
                                        <span className="min-w-0 flex-1 truncate">{s}</span>
                                    </button>
                                ))}
                            </div>

                            {hits.length > 0 && (
                                <div className="border-t border-gray-100 py-1.5 dark:border-gray-800">
                                    <p className="px-3 pb-1 pt-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                                        Top products
                                    </p>
                                    {hits.map((p) => (
                                        <button key={p.id} type="button" onClick={() => goProduct(p)} className={rowClass}>
                                            {p.image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={p.image} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                                            ) : (
                                                <span className="h-9 w-9 shrink-0 rounded bg-gray-100 dark:bg-gray-800" />
                                            )}
                                            <span className="min-w-0 flex-1 truncate">{p.name}</span>
                                            {typeof p.price === 'number' && (
                                                <span className="shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                    {formatDisplayPrice(p.price)}
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            <ImageSearchModal open={imageOpen} onClose={() => setImageOpen(false)} />
        </div>
    )
}
