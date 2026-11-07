'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search, Camera, X, ChevronDown } from 'lucide-react'
import ImageSearchModal from './ImageSearchModal'
import {
    autocomplete as autocompleteApi,
    getRecentSearches,
    removeRecentSearch,
    saveRecentSearch,
    type AutocompleteHit,
} from '@/lib/searchClient'
import { useCurrency } from '@/contexts/CurrencyContext'

interface SearchBarProps {
    /** Category names for the left select segment (lg and up only). Empty hides it. */
    categories?: string[]
    /** Prefill (e.g. the `q` param on /search). Re-syncs when it changes. */
    initialQuery?: string
    /** Where a submit goes: the /search results page (default) or the product listing deep-link. */
    target?: 'products' | 'search'
    className?: string
}

type Row =
    | { id: string; kind: 'recent'; label: string }
    | { id: string; kind: 'suggestion'; label: string }
    | { id: string; kind: 'product'; hit: AutocompleteHit }

const rowBase =
    'flex min-h-[44px] w-full items-center gap-3 px-3 text-left text-sm text-zinc-900 dark:text-zinc-100 lg:min-h-[40px]'
const rowActive = 'bg-zinc-100 dark:bg-zinc-800'
const groupLabel = 'px-3 pb-1 pt-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400'

function Match({ text, query }: { text: string; query: string }) {
    const q = query.trim()
    const idx = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1
    if (idx === -1) return <>{text}</>
    return (
        <>
            {text.slice(0, idx)}
            <span className="font-bold">{text.slice(idx, idx + q.length)}</span>
            {text.slice(idx + q.length)}
        </>
    )
}

/**
 * The one search component (header, /search, anywhere else).
 *
 * Spec: 1px zinc-300 / zinc-700 border, rounded-md, primary 2px focus ring, solid
 * white / zinc-900 field, optional category select as a left segment, solid
 * primary-700 submit segment on the right (magnifier only). 44px high on mobile,
 * 40px from lg. Autocomplete + recent searches + image search.
 */
export default function SearchBar({
    categories = [],
    initialQuery = '',
    target = 'search',
    className = '',
}: SearchBarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { formatDisplayPrice } = useCurrency()
    const listId = useId()

    const [query, setQuery] = useState(initialQuery)
    const [category, setCategory] = useState('')
    const [open, setOpen] = useState(false)
    const [active, setActive] = useState(-1)
    const [recent, setRecent] = useState<string[]>([])
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [hits, setHits] = useState<AutocompleteHit[]>([])
    const [loading, setLoading] = useState(false)
    const [imageOpen, setImageOpen] = useState(false)

    const wrapRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        setQuery(initialQuery)
    }, [initialQuery])

    // On /search, mirror the URL (`q`, `category`) so the header shows the current search,
    // including after back/forward. window.location is used instead of useSearchParams so
    // the header does not force a Suspense boundary on every statically rendered page.
    const categoriesKey = categories.join('\u0001')
    useEffect(() => {
        if (pathname !== '/search') return
        const names = categoriesKey ? categoriesKey.split('\u0001') : []
        const sync = () => {
            const params = new URLSearchParams(window.location.search)
            setQuery(params.get('q') ?? '')
            const cat = params.get('category') ?? ''
            setCategory(cat && names.includes(cat) ? cat : '')
        }
        sync()
        window.addEventListener('popstate', sync)
        return () => window.removeEventListener('popstate', sync)
    }, [pathname, categoriesKey])

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
            const seen = new Set<string>()
            const unique: string[] = []
            for (const s of res.suggestions ?? []) {
                const key = s.toLowerCase()
                if (seen.has(key)) continue
                seen.add(key)
                unique.push(s)
                if (unique.length >= 6) break
            }
            setSuggestions(unique)
            setHits((res.products ?? []).slice(0, 4))
            setLoading(false)
        }, 220)
        return () => {
            cancelled = true
            clearTimeout(handle)
        }
    }, [query])

    const hasQuery = query.trim().length > 0

    const rows = useMemo<Row[]>(() => {
        if (!hasQuery) return recent.map((label) => ({ id: `r-${label}`, kind: 'recent', label }))
        return [
            ...suggestions.map((label): Row => ({ id: `s-${label}`, kind: 'suggestion', label })),
            ...hits.map((hit): Row => ({ id: `p-${hit.id}`, kind: 'product', hit })),
        ]
    }, [hasQuery, recent, suggestions, hits])

    useEffect(() => {
        setActive(-1)
    }, [rows])

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
            if (target === 'search') {
                if (q) params.set('q', q)
                if (category) params.set('category', category)
                router.push(`/search?${params.toString()}`)
                return
            }
            if (q) params.set('search', q)
            if (category) params.set('category', category)
            router.push(`/products?${params.toString()}`)
        },
        [category, router, target]
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

    const choose = (row: Row) => {
        if (row.kind === 'product') goProduct(row.hit)
        else go(row.label)
    }

    const showPanel = open && (rows.length > 0 || (hasQuery && loading))
    const activeId = active >= 0 && rows[active] ? `${listId}-${active}` : undefined
    const firstProduct = rows.findIndex((r) => r.kind === 'product')

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            setOpen(false)
            inputRef.current?.blur()
            return
        }
        if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && rows.length > 0) {
            e.preventDefault()
            setOpen(true)
            const step = e.key === 'ArrowDown' ? 1 : -1
            setActive((i) => (i + step + rows.length + (i === -1 && step === -1 ? 1 : 0)) % rows.length)
        }
    }

    return (
        <div ref={wrapRef} className={`relative w-full ${className}`}>
            <form
                role="search"
                onSubmit={(e) => {
                    e.preventDefault()
                    const row = active >= 0 ? rows[active] : undefined
                    if (row) choose(row)
                    else go(query)
                }}
                className="flex h-11 w-full items-stretch overflow-hidden rounded-md border border-zinc-300 bg-white focus-within:border-primary-600 focus-within:ring-2 focus-within:ring-primary-600 dark:border-zinc-700 dark:bg-zinc-900 lg:h-10"
            >
                {categories.length > 0 && (
                    <div className="relative hidden shrink-0 border-r border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 lg:block">
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            aria-label="Search category"
                            className="h-full w-24 cursor-pointer appearance-none truncate bg-zinc-100 pl-3 pr-7 text-sm text-zinc-800 outline-none dark:bg-zinc-800 dark:text-zinc-200 xl:w-40"
                        >
                            <option value="">All categories</option>
                            {categories.map((name) => (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600 dark:text-zinc-400"
                            aria-hidden
                        />
                    </div>
                )}

                <input
                    ref={inputRef}
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={showPanel}
                    aria-controls={showPanel ? listId : undefined}
                    aria-activedescendant={activeId}
                    aria-autocomplete="list"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setOpen(true)
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    placeholder="Search products and brands"
                    aria-label="Search products"
                    className="min-w-0 flex-1 bg-white px-3 text-base text-zinc-900 placeholder:text-zinc-500 outline-none dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 lg:text-sm [&::-webkit-search-cancel-button]:hidden"
                />

                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('')
                            inputRef.current?.focus()
                        }}
                        aria-label="Clear search"
                        className="flex w-9 shrink-0 items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                        <X className="h-4 w-4" aria-hidden />
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => setImageOpen(true)}
                    aria-label="Search by image"
                    className="flex w-10 shrink-0 items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                    <Camera className="h-5 w-5" aria-hidden />
                </button>

                <button
                    type="submit"
                    aria-label="Search"
                    className="flex w-12 shrink-0 items-center justify-center bg-primary-700 text-white hover:bg-primary-800 active:bg-primary-900 lg:w-14"
                >
                    <Search className="h-5 w-5" aria-hidden />
                </button>
            </form>

            {showPanel && (
                <div
                    id={listId}
                    role="listbox"
                    aria-label="Search suggestions"
                    className="absolute left-0 right-0 top-full z-[300] mt-1 max-h-[min(70vh,420px)] overflow-y-auto rounded-md border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                    {rows.length === 0 && (
                        <p className="px-3 py-3 text-sm text-zinc-600 dark:text-zinc-400">Searching…</p>
                    )}

                    {rows.map((row, i) => {
                        const selected = i === active
                        const header =
                            i === 0 && row.kind === 'recent' ? (
                                <p className={groupLabel}>Recent searches</p>
                            ) : i === firstProduct && i > 0 ? (
                                <p className={`${groupLabel} border-t border-zinc-200 dark:border-zinc-800`}>Products</p>
                            ) : i === 0 && row.kind === 'product' ? (
                                <p className={groupLabel}>Products</p>
                            ) : null

                        if (row.kind === 'recent') {
                            return (
                                <div key={row.id}>
                                    {header}
                                    <div
                                        id={`${listId}-${i}`}
                                        role="option"
                                        aria-selected={selected}
                                        onMouseEnter={() => setActive(i)}
                                        className={`flex items-center ${selected ? rowActive : ''}`}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => go(row.label)}
                                            className={`${rowBase} min-w-0 flex-1`}
                                        >
                                            <span className="truncate">{row.label}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                removeRecentSearch(row.label)
                                                setRecent(getRecentSearches())
                                            }}
                                            aria-label={`Remove ${row.label} from recent searches`}
                                            className="flex h-11 w-11 shrink-0 items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 lg:h-10"
                                        >
                                            <X className="h-4 w-4" aria-hidden />
                                        </button>
                                    </div>
                                </div>
                            )
                        }

                        if (row.kind === 'suggestion') {
                            return (
                                <div key={row.id}>
                                    {header}
                                    <button
                                        type="button"
                                        id={`${listId}-${i}`}
                                        role="option"
                                        aria-selected={selected}
                                        onMouseEnter={() => setActive(i)}
                                        onClick={() => go(row.label)}
                                        className={`${rowBase} ${selected ? rowActive : ''}`}
                                    >
                                        <span className="min-w-0 flex-1 truncate">
                                            <Match text={row.label} query={query} />
                                        </span>
                                    </button>
                                </div>
                            )
                        }

                        const p = row.hit
                        return (
                            <div key={row.id}>
                                {header}
                                <button
                                    type="button"
                                    id={`${listId}-${i}`}
                                    role="option"
                                    aria-selected={selected}
                                    onMouseEnter={() => setActive(i)}
                                    onClick={() => goProduct(p)}
                                    className={`${rowBase} ${selected ? rowActive : ''}`}
                                >
                                    {p.image ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={p.image}
                                            alt=""
                                            className="h-9 w-9 shrink-0 rounded bg-zinc-100 object-contain dark:bg-zinc-800"
                                        />
                                    ) : (
                                        <span className="h-9 w-9 shrink-0 rounded bg-zinc-100 dark:bg-zinc-800" />
                                    )}
                                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                                    {typeof p.price === 'number' && (
                                        <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                                            {formatDisplayPrice(p.price)}
                                        </span>
                                    )}
                                </button>
                            </div>
                        )
                    })}
                </div>
            )}

            <ImageSearchModal open={imageOpen} onClose={() => setImageOpen(false)} />
        </div>
    )
}
