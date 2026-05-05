'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, Camera, Clock, TrendingUp, X, ArrowRight, Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import ImageSearchModal from './ImageSearchModal'
import {
    autocomplete as autocompleteApi,
    getRecentSearches,
    removeRecentSearch,
    saveRecentSearch,
    type AutocompleteHit,
} from '@/lib/searchClient'
import { useCurrency } from '@/contexts/CurrencyContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SearchBarProps {
    variant?: 'hero' | 'navbar'
    className?: string
}

interface Suggestion {
    type: 'trending' | 'recent' | 'category' | 'suggestion'
    label: string
    category?: string
}

// ─── Mock / local data ────────────────────────────────────────────────────────

const TRENDING: Suggestion[] = [
    { type: 'trending', label: 'iPhone 15 Pro Max', category: 'Electronics' },
    { type: 'trending', label: 'Nike Air Force 1', category: 'Fashion' },
    { type: 'trending', label: 'Air Fryer XL', category: 'Home & Garden' },
    { type: 'trending', label: 'Wireless Earbuds', category: 'Electronics' },
    { type: 'trending', label: 'Yoga Mat Premium', category: 'Sports' },
]

// Local fallback pool — used when the API is unreachable so the dropdown
// never goes blank during dev.
const POOL = [
    { label: 'iPhone 15 Pro', category: 'Electronics' },
    { label: 'iPhone 15 Pro Max case', category: 'Electronics' },
    { label: 'Samsung Galaxy S24', category: 'Electronics' },
    { label: 'Nike Air Max 270', category: 'Fashion' },
    { label: 'Nike Running Shoes', category: 'Fashion' },
    { label: 'Adidas Ultraboost', category: 'Fashion' },
    { label: 'Air Fryer 5.5L', category: 'Home & Garden' },
    { label: 'Wireless Noise Cancelling Headphones', category: 'Electronics' },
    { label: 'Bluetooth Speaker Portable', category: 'Electronics' },
    { label: 'Gaming Chair Ergonomic', category: 'Furniture' },
    { label: 'MacBook Pro M3', category: 'Electronics' },
    { label: 'Laptop Stand Adjustable', category: 'Electronics' },
    { label: 'Women\'s Yoga Pants', category: 'Sports' },
    { label: 'Protein Powder Whey', category: 'Health' },
    { label: 'Smart Watch Fitness', category: 'Electronics' },
]

function getMockSuggestions(q: string): Suggestion[] {
    if (!q.trim()) return []
    return POOL
        .filter(p => p.label.toLowerCase().includes(q.toLowerCase()))
        .slice(0, 6)
        .map(p => ({ type: 'suggestion' as const, ...p }))
}

function highlightMatch(text: string, query: string) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return <span>{text}</span>
    return (
        <span>
            {text.slice(0, idx)}
            <span className="font-bold text-orange-500">{text.slice(idx, idx + query.length)}</span>
            {text.slice(idx + query.length)}
        </span>
    )
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────

function SearchDropdown({ query, recent, suggestions, hits, loading, onSelect, onSelectProduct, onRemoveRecent, variant }: {
    query: string
    recent: string[]
    suggestions: Suggestion[]
    hits: AutocompleteHit[]
    loading: boolean
    onSelect: (label: string) => void
    onSelectProduct: (hit: AutocompleteHit) => void
    onRemoveRecent: (label: string) => void
    variant: 'hero' | 'navbar'
}) {
    const { formatDisplayPrice } = useCurrency()
    const hasQuery = query.trim().length > 0

    const row = `flex items-center gap-3 w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors group cursor-pointer`

    return (
        <div
            className={`absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[300] ${variant === 'navbar' ? 'max-h-[420px]' : 'max-h-[480px]'} overflow-y-auto`}
            style={{ animation: 'dropIn 0.15s cubic-bezier(0.16,1,0.3,1) forwards' }}
        >
            {/* Live suggestions */}
            {hasQuery && (
                suggestions.length > 0 ? (
                    <div className="py-1.5">
                        <p className="px-4 pt-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-600">
                            {loading ? 'Searching…' : 'Suggestions'}
                        </p>
                        {suggestions.map((s, i) => (
                            <button key={i} className={row} onClick={() => onSelect(s.label)}>
                                <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">{highlightMatch(s.label, query)}</span>
                                {s.category && (
                                    <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-500">{s.category}</span>
                                )}
                                <ArrowRight className="h-3.5 w-3.5 text-gray-300 dark:text-gray-700 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-600">
                        {loading ? 'Searching…' : `No suggestions for “${query}”`}
                        <p className="text-xs mt-1">Press Enter to search anyway</p>
                    </div>
                )
            )}

            {/* Real product hits */}
            {hasQuery && hits.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800 py-1.5">
                    <p className="px-4 pt-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-600">Top products</p>
                    {hits.map((p) => (
                        <button key={p.id} type="button" className={row} onClick={() => onSelectProduct(p)}>
                            {p.image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={p.image} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                            ) : (
                                <div className="h-8 w-8 rounded bg-gray-100 dark:bg-gray-800 shrink-0" />
                            )}
                            <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">{p.name}</span>
                            {typeof p.price === 'number' && (
                                <span className="shrink-0 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                    {formatDisplayPrice(p.price ?? 0)}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}

            {/* Default: recent + trending */}
            {!hasQuery && (
                <>
                    {recent.length > 0 && (
                        <div className="py-1.5 border-b border-gray-100 dark:border-gray-800">
                            <p className="px-4 pt-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-600">Recent Searches</p>
                            {recent.map((r, i) => (
                                <div key={i} className={`${row} pr-2`}>
                                    <button className="flex items-center gap-3 flex-1 min-w-0" onClick={() => onSelect(r)}>
                                        <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{r}</span>
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRemoveRecent(r) }}
                                        className="ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="py-1.5">
                        <p className="px-4 pt-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-600">Trending Now</p>
                        {TRENDING.map((t, i) => (
                            <button key={i} className={row} onClick={() => onSelect(t.label)}>
                                <TrendingUp className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                                <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">{t.label}</span>
                                <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-500">{t.category}</span>
                            </button>
                        ))}
                    </div>

                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-600 mb-2">Popular Categories</p>
                        <div className="flex flex-wrap gap-1.5">
                            {['Electronics', 'Fashion', 'Home', 'Sports', 'Beauty', 'Automotive'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => onSelect(cat)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                                >
                                    <Tag className="h-2.5 w-2.5" /> {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

// ─── SearchBar ────────────────────────────────────────────────────────────────

export default function SearchBar({ variant = 'hero', className = '' }: SearchBarProps) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [recent, setRecent] = useState<string[]>([])
    const [imageModalOpen, setImageModalOpen] = useState(false)
    const [apiSuggestions, setApiSuggestions] = useState<Suggestion[]>([])
    const [apiHits, setApiHits] = useState<AutocompleteHit[]>([])
    const [loading, setLoading] = useState(false)
    const wrapperRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    useEffect(() => { setRecent(getRecentSearches()) }, [])

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Debounced autocomplete — falls back to local POOL on failure / empty API.
    useEffect(() => {
        const trimmed = query.trim()
        if (trimmed.length < 2) {
            setApiSuggestions([])
            setApiHits([])
            setLoading(false)
            return
        }
        setLoading(true)
        const handle = setTimeout(async () => {
            const result = await autocompleteApi(trimmed)
            const remoteSuggestions: Suggestion[] = (result.suggestions ?? []).map((s) => ({
                type: 'suggestion',
                label: s,
            }))
            const remoteHits = result.products ?? []

            // Keep mock matches in the mix for dev environments where the API is
            // empty / mocked; dedupe by lowercase label.
            const seen = new Set<string>()
            const merged: Suggestion[] = []
            for (const s of [...remoteSuggestions, ...getMockSuggestions(trimmed)]) {
                const key = s.label.toLowerCase()
                if (seen.has(key)) continue
                seen.add(key)
                merged.push(s)
                if (merged.length >= 8) break
            }
            setApiSuggestions(merged)
            setApiHits(remoteHits)
            setLoading(false)
        }, 220)
        return () => clearTimeout(handle)
    }, [query])

    const navigate = useCallback((q: string) => {
        const t = q.trim()
        if (!t) return
        saveRecentSearch(t)
        setRecent(getRecentSearches())
        setOpen(false)
        setQuery(t)
        router.push(`/products?search=${encodeURIComponent(t)}`)
    }, [router])

    const navigateToProduct = useCallback((hit: AutocompleteHit) => {
        const id = String(hit.id ?? '').trim()
        if (!id) return
        setOpen(false)
        router.push(`/products/${encodeURIComponent(id)}`)
    }, [router])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') navigate(query)
        if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
    }

    const handleRemoveRecent = (q: string) => {
        removeRecentSearch(q)
        setRecent(getRecentSearches())
    }

    // ── Navbar ─────────────────────────────────────────────────────────────

    if (variant === 'navbar') {
        return (
            <>
                <style>{`@keyframes dropIn { from{opacity:0;transform:translateY(6px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }`}</style>

                <div ref={wrapperRef} className={`relative flex-1 max-w-2xl ${className}`}>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onFocus={() => setOpen(true)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search products, brands, categories…"
                                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 transition-shadow"
                            />
                            {query && (
                                <button onClick={() => { setQuery(''); inputRef.current?.focus() }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Camera — opens modal */}
                        <button
                            onClick={() => setImageModalOpen(true)}
                            title="Search by image"
                            className="shrink-0 p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-500 hover:text-orange-500 transition-all"
                        >
                            <Camera className="h-4 w-4" />
                        </button>

                        <button
                            onClick={() => navigate(query)}
                            className="shrink-0 px-4 py-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                        >
                            <Search className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Search</span>
                        </button>
                    </div>

                    {open && (
                        <SearchDropdown
                            query={query}
                            recent={recent}
                            suggestions={apiSuggestions}
                            hits={apiHits}
                            loading={loading}
                            onSelect={navigate}
                            onSelectProduct={navigateToProduct}
                            onRemoveRecent={handleRemoveRecent}
                            variant="navbar"
                        />
                    )}
                </div>

                <ImageSearchModal open={imageModalOpen} onClose={() => setImageModalOpen(false)} />
            </>
        )
    }

    // ── Hero ────────────────────────────────────────────────────────────────

    return (
        <>
            <style>{`@keyframes dropIn { from{opacity:0;transform:translateY(6px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }`}</style>

            <div ref={wrapperRef} className={`relative ${className}`}>
                <div className="mb-3">
                    <label className="block text-left text-gray-700 dark:text-gray-300 font-semibold mb-3 text-sm">
                        What are you looking for?
                    </label>

                    <div className="flex flex-row gap-2 sm:gap-2.5">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onFocus={() => setOpen(true)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search products, brands, categories…"
                                className="w-full pl-10 pr-9 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 text-sm shadow-sm transition-shadow"
                            />
                            {query && (
                                <button onClick={() => { setQuery(''); inputRef.current?.focus() }} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Camera — opens modal */}
                        <button
                            onClick={() => setImageModalOpen(true)}
                            title="Search by image"
                            className="h-12 px-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-gray-500 hover:text-orange-500 transition-all flex items-center justify-center gap-2 text-sm font-semibold shrink-0 group"
                        >
                            <Camera className="h-5 w-5 group-hover:scale-110 transition-transform" />
                            <span className="hidden sm:inline">Image</span>
                        </button>

                        <button
                            onClick={() => navigate(query)}
                            className="h-12 px-7 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm transition-colors shadow-lg shadow-orange-200 dark:shadow-none flex items-center justify-center gap-2 shrink-0"
                        >
                            <Search className="h-4 w-4" />
                            Search
                        </button>
                    </div>
                </div>

                {open && (
                    <SearchDropdown
                        query={query}
                        recent={recent}
                        suggestions={apiSuggestions}
                        hits={apiHits}
                        loading={loading}
                        onSelect={navigate}
                        onSelectProduct={navigateToProduct}
                        onRemoveRecent={handleRemoveRecent}
                        variant="hero"
                    />
                )}
            </div>

            <ImageSearchModal open={imageModalOpen} onClose={() => setImageModalOpen(false)} />
        </>
    )
}
