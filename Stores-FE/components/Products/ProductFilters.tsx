'use client'

import { useState, useCallback } from 'react'
import {
    ChevronDown,
    SlidersHorizontal,
    X,
    Star,
    RotateCcw,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
    categories: string[]
    brands: string[]
    priceRange: [number, number]
    minRating: number
    inStock: boolean
    onSale: boolean
}

interface ProductFiltersProps {
    categories?: string[]
    brands?: string[]
    maxPrice?: number
    filters: FilterState
    onChange: (filters: FilterState) => void
    resultCount?: number
    // Mobile drawer mode
    mobileOpen?: boolean
    onMobileClose?: () => void
}

const DEFAULT_FILTERS: FilterState = {
    categories: [],
    brands: [],
    priceRange: [0, 5000],
    minRating: 0,
    inStock: false,
    onSale: false,
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
    title,
    children,
    defaultOpen = true,
}: {
    title: string
    children: React.ReactNode
    defaultOpen?: boolean
}) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center justify-between w-full py-3 text-sm font-semibold text-gray-900 dark:text-white hover:text-orange-500 dark:hover:text-orange-400 transition-colors"
            >
                {title}
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && <div className="pb-4">{children}</div>}
        </div>
    )
}

function CheckItem({
    label,
    checked,
    count,
    onChange,
}: {
    label: string
    checked: boolean
    count?: number
    onChange: (checked: boolean) => void
}) {
    return (
        <label className="flex items-center justify-between gap-2 py-1.5 cursor-pointer group">
            <div className="flex items-center gap-2.5">
                <div
                    onClick={() => onChange(!checked)}
                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all
                        ${checked
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-gray-300 dark:border-gray-600 group-hover:border-orange-400'
                        }`}
                >
                    {checked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                            <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
                <span className={`text-sm transition-colors ${checked ? 'text-orange-500 font-medium' : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'}`}>
                    {label}
                </span>
            </div>
            {count !== undefined && (
                <span className="text-xs text-gray-400 dark:text-gray-600 tabular-nums">{count.toLocaleString()}</span>
            )}
        </label>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductFilters({
    categories = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Health & Beauty', 'Books & Media', 'Automotive', 'Toys & Games'],
    brands = ['Apple', 'Samsung', 'Nike', 'Adidas', 'Sony', 'LG', 'Dell', 'HP'],
    maxPrice = 5000,
    filters,
    onChange,
    resultCount,
    mobileOpen = false,
    onMobileClose,
}: ProductFiltersProps) {

    const activeCount = [
        filters.categories.length > 0,
        filters.brands.length > 0,
        filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice,
        filters.minRating > 0,
        filters.inStock,
        filters.onSale,
    ].filter(Boolean).length

    const reset = useCallback(() => {
        onChange({ ...DEFAULT_FILTERS, priceRange: [0, maxPrice] })
    }, [onChange, maxPrice])

    const toggleList = (key: 'categories' | 'brands', value: string) => {
        const current = filters[key]
        onChange({
            ...filters,
            [key]: current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value],
        })
    }

    const content = (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-orange-500" />
                    <span className="font-bold text-sm text-gray-900 dark:text-white">Filters</span>
                    {activeCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-extrabold leading-none">
                            {activeCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeCount > 0 && (
                        <button
                            onClick={reset}
                            className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-semibold transition-colors"
                        >
                            <RotateCcw className="h-3 w-3" /> Reset
                        </button>
                    )}
                    {/* Mobile close */}
                    {onMobileClose && (
                        <button
                            onClick={onMobileClose}
                            className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Result count */}
            {resultCount !== undefined && (
                <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900/30 shrink-0">
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                        {resultCount.toLocaleString()} product{resultCount !== 1 ? 's' : ''} found
                    </p>
                </div>
            )}

            {/* Scrollable filter sections */}
            <div className="flex-1 overflow-y-auto px-4">

                {/* Quick toggles */}
                <Section title="Availability">
                    <div className="space-y-1">
                        <CheckItem
                            label="In Stock Only"
                            checked={filters.inStock}
                            onChange={v => onChange({ ...filters, inStock: v })}
                        />
                        <CheckItem
                            label="On Sale"
                            checked={filters.onSale}
                            onChange={v => onChange({ ...filters, onSale: v })}
                        />
                    </div>
                </Section>

                {/* Categories */}
                <Section title="Category">
                    <div className="space-y-0.5">
                        {categories.map(cat => (
                            <CheckItem
                                key={cat}
                                label={cat}
                                checked={filters.categories.includes(cat)}
                                onChange={() => toggleList('categories', cat)}
                            />
                        ))}
                    </div>
                </Section>

                {/* Price range */}
                <Section title="Price Range">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
                            <span>${filters.priceRange[0].toLocaleString()}</span>
                            <span>${filters.priceRange[1].toLocaleString()}</span>
                        </div>
                        {/* Min slider */}
                        <input
                            type="range"
                            min={0}
                            max={maxPrice}
                            step={10}
                            value={filters.priceRange[0]}
                            onChange={e => {
                                const val = Number(e.target.value)
                                if (val < filters.priceRange[1]) {
                                    onChange({ ...filters, priceRange: [val, filters.priceRange[1]] })
                                }
                            }}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-orange-500 bg-gray-200 dark:bg-gray-700"
                        />
                        {/* Max slider */}
                        <input
                            type="range"
                            min={0}
                            max={maxPrice}
                            step={10}
                            value={filters.priceRange[1]}
                            onChange={e => {
                                const val = Number(e.target.value)
                                if (val > filters.priceRange[0]) {
                                    onChange({ ...filters, priceRange: [filters.priceRange[0], val] })
                                }
                            }}
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-orange-500 bg-gray-200 dark:bg-gray-700"
                        />
                        {/* Manual inputs */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-1 block">Min</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={filters.priceRange[1]}
                                    value={filters.priceRange[0]}
                                    onChange={e => {
                                        const val = Math.min(Number(e.target.value), filters.priceRange[1] - 10)
                                        onChange({ ...filters, priceRange: [Math.max(0, val), filters.priceRange[1]] })
                                    }}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-600 mb-1 block">Max</label>
                                <input
                                    type="number"
                                    min={filters.priceRange[0]}
                                    max={maxPrice}
                                    value={filters.priceRange[1]}
                                    onChange={e => {
                                        const val = Math.max(Number(e.target.value), filters.priceRange[0] + 10)
                                        onChange({ ...filters, priceRange: [filters.priceRange[0], Math.min(maxPrice, val)] })
                                    }}
                                    className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                />
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Rating */}
                <Section title="Minimum Rating">
                    <div className="space-y-1">
                        {[4, 3, 2, 1].map(r => (
                            <button
                                key={r}
                                onClick={() => onChange({ ...filters, minRating: filters.minRating === r ? 0 : r })}
                                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm transition-all
                                    ${filters.minRating === r
                                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500 font-semibold'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <div className="flex">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-3.5 w-3.5 ${i < r ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-gray-700 fill-gray-200 dark:fill-gray-700'}`}
                                        />
                                    ))}
                                </div>
                                <span>& up</span>
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Brands */}
                <Section title="Brand" defaultOpen={false}>
                    <div className="space-y-0.5">
                        {brands.map(brand => (
                            <CheckItem
                                key={brand}
                                label={brand}
                                checked={filters.brands.includes(brand)}
                                onChange={() => toggleList('brands', brand)}
                            />
                        ))}
                    </div>
                </Section>
            </div>

            {/* Mobile apply button */}
            {onMobileClose && (
                <div className="lg:hidden px-4 py-3 border-t border-gray-100 dark:border-gray-800 shrink-0">
                    <button
                        onClick={onMobileClose}
                        className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm transition-colors"
                    >
                        Show {resultCount?.toLocaleString() ?? ''} Results
                    </button>
                </div>
            )}
        </div>
    )

    // ── Mobile: full-screen drawer ──────────────────────────────────────────
    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm"
                    onClick={onMobileClose}
                />
            )}

            {/* Mobile drawer */}
            <div className={`
                lg:hidden fixed inset-y-0 left-0 z-[401] w-80 max-w-[85vw]
                bg-white dark:bg-gray-900 shadow-2xl
                transition-transform duration-300 ease-in-out
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {content}
            </div>

            {/* Desktop sidebar — always visible */}
            <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden self-start sticky top-4">
                {content}
            </aside>
        </>
    )
}
