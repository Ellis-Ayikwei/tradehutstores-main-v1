'use client'

import { useState, useCallback, useEffect } from 'react'
import { useCurrency } from '@/contexts/CurrencyContext'
import {
    ChevronDown,
    SlidersHorizontal,
    X,
    Star,
    RotateCcw,
    Zap,
    Gavel,
    FileText,
    Search,
    Leaf,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
    categories: string[]
    subCategories: string[]
    brands: string[]
    priceRange: [number, number]
    minRating: number
    inStock: boolean
    onSale: boolean
    // Extended Kinetic filters
    conditions: string[]
    transactionType: 'all' | 'buy' | 'auction' | 'rfq'
    brandSearch: string
    sustainableOnly: boolean
}

interface ProductFiltersProps {
    categories?: string[]
    subCategoriesByCategory?: Record<string, string[]>
    categoryCounts?: Record<string, number>
    subCategoryCounts?: Record<string, number>
    brands?: string[]
    brandCounts?: Record<string, number>
    conditions?: string[]
    maxPrice?: number
    filters: FilterState
    onChange: (filters: FilterState) => void
    resultCount?: number
    mobileOpen?: boolean
    onMobileClose?: () => void
}

export const DEFAULT_FILTERS: FilterState = {
    categories: [],
    subCategories: [],
    brands: [],
    priceRange: [0, 5000],
    minRating: 0,
    inStock: false,
    onSale: false,
    conditions: [],
    transactionType: 'all',
    brandSearch: '',
    sustainableOnly: false,
}

const DEFAULT_CONDITION_OPTIONS = [
    'New / Factory Sealed',
    'Refurbished (A+)',
    'Lightly Used',
    'Used – Good',
    'Used – Fair',
]

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
        <div className="border-b border-neutral-200 dark:border-neutral-700 last:border-0">
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center justify-between w-full py-3.5 text-sm font-bold text-neutral-900 dark:text-neutral-100 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
            >
                <span className="uppercase tracking-wider text-[11px] text-neutral-600 dark:text-neutral-400 font-bold">
                    {title}
                </span>
                <ChevronDown
                    className={`h-4 w-4 text-neutral-500 dark:text-neutral-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && <div className="pb-5">{children}</div>}
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
                            ? 'bg-orange-500 border-orange-500 dark:bg-orange-600 dark:border-orange-600'
                            : 'border-neutral-300 dark:border-neutral-600 group-hover:border-orange-500'
                        }`}
                >
                    {checked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                            <path
                                d="M1.5 5l2.5 2.5 4.5-4.5"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}
                </div>
                <span
                    className={`text-sm transition-colors ${
                        checked
                            ? 'text-orange-600 dark:text-orange-400 font-semibold'
                            : 'text-neutral-600 dark:text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100'
                    }`}
                >
                    {label}
                </span>
            </div>
            {count !== undefined && (
                <span className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">{count.toLocaleString()}</span>
            )}
        </label>
    )
}

// ─── Transaction type button ──────────────────────────────────────────────────

function TransactionBtn({
    active,
    label,
    icon,
    onClick,
}: {
    active: boolean
    label: string
    icon: React.ReactNode
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-between w-full px-4 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                active
                    ? 'bg-orange-100 dark:bg-orange-950/45 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60'
                    : 'border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
        >
            <span>{label}</span>
            {icon}
        </button>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProducctFilters({
    categories = [
        'Electronics',
        'Fashion',
        'Home & Garden',
        'Sports',
        'Health & Beauty',
        'Books & Media',
        'Automotive',
        'Toys & Games',
    ],
    subCategoriesByCategory = {},
    categoryCounts = {},
    subCategoryCounts = {},
    brands = ['Apple', 'Samsung', 'Nike', 'Adidas', 'Sony', 'LG', 'Dell', 'HP'],
    brandCounts = {},
    conditions = DEFAULT_CONDITION_OPTIONS,
    maxPrice = 5000,
    filters,
    onChange,
    resultCount,
    mobileOpen = false,
    onMobileClose,
}: ProductFiltersProps) {
    const { currency, formatDisplayPrice } = useCurrency()
    const [minInput, setMinInput] = useState(String(filters.priceRange[0]))
    const [maxInput, setMaxInput] = useState(String(filters.priceRange[1]))
    const [showAllCategories, setShowAllCategories] = useState(false)
    const [showAllSubCategories, setShowAllSubCategories] = useState(false)
    const [showAllBrands, setShowAllBrands] = useState(false)

    useEffect(() => {
        setMinInput(String(filters.priceRange[0]))
        setMaxInput(String(filters.priceRange[1]))
    }, [filters.priceRange[0], filters.priceRange[1]])

    const activeCount = [
        filters.categories.length > 0,
        filters.subCategories.length > 0,
        filters.brands.length > 0,
        filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice,
        filters.minRating > 0,
        filters.inStock,
        filters.onSale,
        filters.conditions.length > 0,
        filters.transactionType !== 'all',
        filters.sustainableOnly,
    ].filter(Boolean).length

    const reset = useCallback(() => {
        onChange({ ...DEFAULT_FILTERS, priceRange: [0, maxPrice] })
    }, [onChange, maxPrice])

    const toggleList = (key: 'categories' | 'subCategories' | 'brands' | 'conditions', value: string) => {
        const current = filters[key]
        onChange({
            ...filters,
            [key]: current.includes(value)
                ? current.filter((v: string) => v !== value)
                : [...current, value],
        })
    }

    const commitMinPrice = () => {
        const parsed = Number(minInput)
        const safeMin = Number.isFinite(parsed) ? Math.max(0, parsed) : filters.priceRange[0]
        const normalizedMin = Math.min(safeMin, filters.priceRange[1])
        onChange({
            ...filters,
            priceRange: [normalizedMin, filters.priceRange[1]],
        })
    }

    const commitMaxPrice = () => {
        const parsed = Number(maxInput)
        const safeMax = Number.isFinite(parsed) ? Math.max(0, parsed) : filters.priceRange[1]
        const normalizedMax = Math.max(filters.priceRange[0], Math.min(maxPrice, safeMax))
        onChange({
            ...filters,
            priceRange: [filters.priceRange[0], normalizedMax],
        })
    }

    // Filtered brand list based on search
    const filteredBrands = filters.brandSearch
        ? brands.filter(b => b.toLowerCase().includes(filters.brandSearch.toLowerCase()))
        : brands

    const visibleParentCategories = (filters.categories.length > 0
        ? filters.categories
        : categories
    ).filter(category => (subCategoriesByCategory[category] ?? []).length > 0)

    const selectedFilters = [
        ...filters.categories.map(label => ({ key: `cat-${label}`, label, type: 'categories' as const })),
        ...filters.subCategories.map(label => ({ key: `sub-${label}`, label, type: 'subCategories' as const })),
        ...filters.brands.map(label => ({ key: `brand-${label}`, label, type: 'brands' as const })),
    ]

    const visibleCategories = showAllCategories ? categories : categories.slice(0, 8)
    const visibleSubCategoryParents = showAllSubCategories
        ? visibleParentCategories
        : visibleParentCategories.slice(0, 5)
    const visibleBrands = showAllBrands ? filteredBrands : filteredBrands.slice(0, 10)

    const content = (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-900 overflow-y-auto">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 dark:border-neutral-700 shrink-0">
                <div className="flex items-center gap-2.5">
                    <SlidersHorizontal className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span className="font-syne font-bold text-base text-neutral-900 dark:text-neutral-100">
                        Refine Search
                    </span>
                    {activeCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-orange-500 dark:bg-orange-600 text-white text-[10px] font-black leading-none">
                            {activeCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeCount > 0 && (
                        <button
                            onClick={reset}
                            className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-semibold transition-colors active:scale-95"
                        >
                            <RotateCcw className="h-3 w-3" />
                            Reset
                        </button>
                    )}
                    {onMobileClose && (
                        <button
                            onClick={onMobileClose}
                            className="lg:hidden p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Result count ────────────────────────────────────────────── */}
            {resultCount !== undefined && (
                <div className="px-5 py-2.5 bg-neutral-50 dark:bg-neutral-800/90 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                    <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                        <span className="font-bold text-neutral-900 dark:text-neutral-100">{resultCount.toLocaleString()}</span>
                        {' '}result{resultCount !== 1 ? 's' : ''} found
                    </p>
                </div>
            )}

            {/* ── Scrollable body ─────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-0">
                {selectedFilters.length > 0 && (
                    <div className="py-3 border-b border-neutral-200 dark:border-neutral-700 mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-2">
                            Selected Filters
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {selectedFilters.map(item => (
                                <button
                                    key={item.key}
                                    onClick={() =>
                                        onChange({
                                            ...filters,
                                            [item.type]: filters[item.type].filter(value => value !== item.label),
                                        })
                                    }
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-neutral-200 dark:border-neutral-600 text-[11px] text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500/40 transition-colors"
                                >
                                    <span className="truncate max-w-[140px]">{item.label}</span>
                                    <X className="h-3 w-3" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Availability */}
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
                <Section title="Department">
                    <div className="space-y-0.5">
                        {visibleCategories.map(cat => (
                            <CheckItem
                                key={cat}
                                label={cat}
                                checked={filters.categories.includes(cat)}
                                count={categoryCounts[cat]}
                                onChange={() => toggleList('categories', cat)}
                            />
                        ))}
                        {categories.length > 8 && (
                            <button
                                onClick={() => setShowAllCategories(v => !v)}
                                className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors mt-1"
                            >
                                {showAllCategories ? 'Show fewer departments' : `Show all (${categories.length})`}
                            </button>
                        )}
                    </div>
                </Section>

                <Section title="Sub-Department">
                    <div className="space-y-2">
                        {visibleSubCategoryParents.map(category => (
                            <div key={category} className="pt-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
                                    {category}
                                </p>
                                <div className="space-y-0.5">
                                    {(subCategoriesByCategory[category] ?? []).map(subCategory => (
                                        <CheckItem
                                            key={`${category}-${subCategory}`}
                                            label={subCategory}
                                            checked={filters.subCategories.includes(subCategory)}
                                            count={subCategoryCounts[subCategory]}
                                            onChange={() => toggleList('subCategories', subCategory)}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                        {visibleParentCategories.length > 5 && (
                            <button
                                onClick={() => setShowAllSubCategories(v => !v)}
                                className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors mt-1"
                            >
                                {showAllSubCategories ? 'Show fewer sub-departments' : 'Show more sub-departments'}
                            </button>
                        )}
                        {visibleParentCategories.length === 0 && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 py-2">No subcategories available</p>
                        )}
                    </div>
                </Section>

                {/* Price range */}
                <Section title={`Price Range (${currency})`}>
                    <div className="space-y-4">
                        {/* Display row */}
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-orange-50/80 dark:bg-neutral-800 rounded-lg p-3">
                                <span className="text-[10px] text-neutral-600 dark:text-neutral-400 block uppercase font-bold mb-0.5">
                                    Min
                                </span>
                                <span className="font-mono text-sm text-neutral-900 dark:text-neutral-100">
                                    {formatDisplayPrice(filters.priceRange[0])}
                                </span>
                            </div>
                            <div className="bg-orange-50/80 dark:bg-neutral-800 rounded-lg p-3">
                                <span className="text-[10px] text-neutral-600 dark:text-neutral-400 block uppercase font-bold mb-0.5">
                                    Max
                                </span>
                                <span className="font-mono text-sm text-neutral-900 dark:text-neutral-100">
                                    {formatDisplayPrice(filters.priceRange[1])}
                                </span>
                            </div>
                        </div>

                        {/* Track with primary fill */}
                        <div className="relative h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                            <div
                                className="absolute h-full bg-orange-500 dark:bg-orange-600 rounded-full"
                                style={{
                                    left: `${(filters.priceRange[0] / maxPrice) * 100}%`,
                                    right: `${100 - (filters.priceRange[1] / maxPrice) * 100}%`,
                                }}
                            />
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
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-orange-500 bg-transparent"
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
                            className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-orange-500 bg-transparent"
                        />

                        {/* Manual inputs */}
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1 block">
                                    Min
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={filters.priceRange[1]}
                                    value={minInput}
                                    onChange={e => setMinInput(e.target.value)}
                                    onBlur={commitMinPrice}
                                    className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-1 block">
                                    Max
                                </label>
                                <input
                                    type="number"
                                    min={filters.priceRange[0]}
                                    max={maxPrice}
                                    value={maxInput}
                                    onChange={e => setMaxInput(e.target.value)}
                                    onBlur={commitMaxPrice}
                                    className="w-full px-3 py-2 text-xs border border-neutral-200 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                                />
                            </div>
                        </div>
                    </div>
                </Section>

                {/* Condition */}
                <Section title="Condition">
                    <div className="space-y-1">
                        {conditions.map(cond => (
                            <CheckItem
                                key={cond}
                                label={cond}
                                checked={filters.conditions.includes(cond)}
                                onChange={() => toggleList('conditions', cond)}
                            />
                        ))}
                    </div>
                </Section>

                {/* Transaction Model */}
                <Section title="Transaction Model">
                    <div className="space-y-2">
                        <TransactionBtn
                            active={filters.transactionType === 'buy'}
                            label="Instant Buy"
                            icon={<Zap className="h-4 w-4" />}
                            onClick={() =>
                                onChange({
                                    ...filters,
                                    transactionType:
                                        filters.transactionType === 'buy' ? 'all' : 'buy',
                                })
                            }
                        />
                        <TransactionBtn
                            active={filters.transactionType === 'auction'}
                            label="Auction Only"
                            icon={<Gavel className="h-4 w-4" />}
                            onClick={() =>
                                onChange({
                                    ...filters,
                                    transactionType:
                                        filters.transactionType === 'auction' ? 'all' : 'auction',
                                })
                            }
                        />
                        <TransactionBtn
                            active={filters.transactionType === 'rfq'}
                            label="Bulk RFQ"
                            icon={<FileText className="h-4 w-4" />}
                            onClick={() =>
                                onChange({
                                    ...filters,
                                    transactionType:
                                        filters.transactionType === 'rfq' ? 'all' : 'rfq',
                                })
                            }
                        />
                    </div>
                </Section>

                {/* Brand */}
                <Section title="Brand" defaultOpen={false}>
                    {/* Brand search */}
                    <div className="relative flex items-center mb-3">
                        <Search className="absolute left-3 h-3.5 w-3.5 text-neutral-500 dark:text-neutral-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search brands…"
                            value={filters.brandSearch}
                            onChange={e => onChange({ ...filters, brandSearch: e.target.value })}
                            className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-200 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-800/90 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 dark:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25"
                        />
                    </div>
                    <div className="space-y-0.5">
                        {visibleBrands.map(brand => (
                            <CheckItem
                                key={brand}
                                label={brand}
                                checked={filters.brands.includes(brand)}
                                count={brandCounts[brand]}
                                onChange={() => toggleList('brands', brand)}
                            />
                        ))}
                        {filteredBrands.length > 10 && (
                            <button
                                onClick={() => setShowAllBrands(v => !v)}
                                className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors mt-1"
                            >
                                {showAllBrands ? 'Show fewer brands' : `Show all (${filteredBrands.length})`}
                            </button>
                        )}
                        {filteredBrands.length === 0 && (
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 py-2">No brands match "{filters.brandSearch}"</p>
                        )}
                    </div>
                </Section>

                {/* Rating */}
                <Section title="Minimum Rating">
                    <div className="space-y-1">
                        {[4, 3, 2, 1].map(r => (
                            <button
                                key={r}
                                onClick={() =>
                                    onChange({
                                        ...filters,
                                        minRating: filters.minRating === r ? 0 : r,
                                    })
                                }
                                className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm transition-all active:scale-95 ${
                                    filters.minRating === r
                                        ? 'bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 font-semibold'
                                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                                }`}
                            >
                                <div className="flex">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-3.5 w-3.5 ${
                                                i < r
                                                    ? 'text-amber-500 fill-amber-500 dark:text-amber-400 dark:fill-amber-400'
                                                    : 'text-neutral-400 dark:text-neutral-500 fill-neutral-400 dark:fill-neutral-600'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span>& up</span>
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Sustainability */}
                <Section title="Sustainability" defaultOpen={false}>
                    <button
                        onClick={() =>
                            onChange({ ...filters, sustainableOnly: !filters.sustainableOnly })
                        }
                        className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                            filters.sustainableOnly
                                ? 'bg-emerald-50 dark:bg-emerald-950/35 text-emerald-900 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                    >
                        <Leaf className="h-4 w-4 shrink-0" />
                        <span>Sustainable &amp; Verified</span>
                    </button>
                </Section>
            </div>

            {/* ── Reset all (bottom) ────────────────────────────────────── */}
            {activeCount > 0 && (
                <div className="px-5 py-4 border-t border-neutral-200 dark:border-neutral-700 shrink-0">
                    <button
                        onClick={reset}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 text-sm font-semibold hover:border-orange-500 dark:hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400 transition-all active:scale-95"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset all filters
                    </button>
                </div>
            )}

            {/* ── Mobile apply button ───────────────────────────────────── */}
            {onMobileClose && (
                <div className="lg:hidden px-5 py-4 border-t border-neutral-200 dark:border-neutral-700 shrink-0">
                    <button
                        onClick={onMobileClose}
                        className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 text-white font-bold text-sm transition-all active:scale-95 shadow-lg"
                    >
                        Show {resultCount?.toLocaleString() ?? ''} Results
                    </button>
                </div>
            )}
        </div>
    )

    return (
        <>
            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-[400] bg-neutral-950/50 dark:bg-black/55 backdrop-blur-sm"
                    onClick={onMobileClose}
                />
            )}

            {/* Mobile drawer */}
            <div
                className={`
                    lg:hidden fixed inset-y-0 left-0 z-[401] w-80 max-w-[88vw]
                    shadow-xl border-r border-neutral-200 dark:border-neutral-700 overflow-hidden
                    transition-transform duration-300 ease-in-out
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {content}
            </div>

            {/* Desktop sidebar — always visible */}
            <aside className="hidden lg:flex flex-col w-72 shrink-0 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-md dark:shadow-none dark:ring-1 dark:ring-neutral-700 overflow-hidden self-start md:sticky md:top-24 md:max-h-[calc(100vh-7rem)]">
                {content}
            </aside>
        </>
    )
}
