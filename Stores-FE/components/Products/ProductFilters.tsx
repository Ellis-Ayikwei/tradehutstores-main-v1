'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
    Truck,
    BadgeCheck,
    PackageCheck,
    Tag,
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
    conditions: string[]
    transactionType: 'all' | 'buy' | 'auction' | 'rfq'
    brandSearch: string
    sustainableOnly: boolean
    /** Optional so existing FilterState literals keep compiling. Callers must apply it to results. */
    freeShipping?: boolean
    /** Optional so existing FilterState literals keep compiling. Callers must apply it to results. */
    verifiedSellerOnly?: boolean
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
    freeShipping: false,
    verifiedSellerOnly: false,
}

const FOCUS_RING =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-900'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Number of active filter groups, shown as "Filters (n)" on mobile and as a badge in the panel. */
export function countActiveFilters(filters: FilterState, maxPrice: number): number {
    return [
        filters.categories.length > 0,
        filters.subCategories.length > 0,
        filters.brands.length > 0,
        filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice,
        filters.minRating > 0,
        filters.inStock,
        filters.onSale,
        filters.freeShipping,
        filters.verifiedSellerOnly,
        filters.conditions.length > 0,
        filters.transactionType !== 'all',
        filters.sustainableOnly,
    ].filter(Boolean).length
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
        <div className="border-b border-gray-200 last:border-0 dark:border-gray-700">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                className={`flex min-h-[44px] w-full items-center justify-between rounded py-1 text-left lg:min-h-[36px] ${FOCUS_RING}`}
            >
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    {title}
                </span>
                <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${open ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                />
            </button>
            {open && <div className="pb-2">{children}</div>}
        </div>
    )
}

function CheckItem({
    label,
    checked,
    count,
    icon,
    onChange,
}: {
    label: string
    checked: boolean
    count?: number
    icon?: React.ReactNode
    onChange: (checked: boolean) => void
}) {
    return (
        <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 rounded-md px-1 hover:bg-gray-50 dark:hover:bg-gray-800 lg:min-h-[30px]">
            <span className="flex min-w-0 items-center gap-2">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => onChange(e.target.checked)}
                    className={`h-5 w-5 shrink-0 cursor-pointer rounded border-gray-300 accent-primary lg:h-4 lg:w-4 ${FOCUS_RING}`}
                />
                {icon ? (
                    <span className="shrink-0 text-gray-500 dark:text-gray-400 [&>svg]:h-4 [&>svg]:w-4" aria-hidden="true">
                        {icon}
                    </span>
                ) : null}
                <span
                    className={`truncate text-sm ${
                        checked
                            ? 'font-semibold text-gray-900 dark:text-gray-100'
                            : 'text-gray-700 dark:text-gray-300'
                    }`}
                >
                    {label}
                </span>
            </span>
            {count !== undefined && (
                <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{count.toLocaleString()}</span>
            )}
        </label>
    )
}

function ChoiceButton({
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
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`flex min-h-[44px] w-full items-center justify-between rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors lg:min-h-[34px] ${FOCUS_RING} ${
                active
                    ? 'border-primary bg-primary-50 text-primary-800 dark:border-primary-400 dark:bg-primary-900 dark:text-primary-200'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
        >
            <span>{label}</span>
            <span aria-hidden="true">{icon}</span>
        </button>
    )
}

const INPUT_CLASS = `w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-base text-gray-900 placeholder:text-gray-500 lg:py-1.5 lg:text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 ${FOCUS_RING}`

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProductFilters({
    categories = [],
    subCategoriesByCategory = {},
    categoryCounts = {},
    subCategoryCounts = {},
    brands = [],
    brandCounts = {},
    conditions = [],
    maxPrice = 5000,
    filters,
    onChange,
    resultCount,
    mobileOpen = false,
    onMobileClose,
}: ProductFiltersProps) {
    // Filtering runs on base-currency prices, so label the inputs in the base currency.
    const { baseCurrency } = useCurrency()
    const [minInput, setMinInput] = useState(String(filters.priceRange[0]))
    const [maxInput, setMaxInput] = useState(String(filters.priceRange[1]))
    const [showAllCategories, setShowAllCategories] = useState(false)
    const [showAllSubCategories, setShowAllSubCategories] = useState(false)
    const [showAllBrands, setShowAllBrands] = useState(false)
    const sheetCloseRef = useRef<HTMLButtonElement>(null)

    const priceMin = filters.priceRange[0]
    const priceMax = filters.priceRange[1]
    useEffect(() => {
        setMinInput(String(priceMin))
        setMaxInput(String(priceMax))
    }, [priceMin, priceMax])

    // Bottom-sheet behaviour: Esc closes, page scroll locked, focus moves into the sheet.
    useEffect(() => {
        if (!mobileOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onMobileClose?.()
        }
        document.addEventListener('keydown', onKey)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        sheetCloseRef.current?.focus()
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = prevOverflow
        }
    }, [mobileOpen, onMobileClose])

    const activeCount = countActiveFilters(filters, maxPrice)

    const reset = useCallback(() => {
        onChange({ ...DEFAULT_FILTERS, priceRange: [0, maxPrice] })
    }, [onChange, maxPrice])

    const toggleList = (key: 'categories' | 'subCategories' | 'brands' | 'conditions', value: string) => {
        const current = filters[key]
        onChange({
            ...filters,
            [key]: current.includes(value) ? current.filter((v: string) => v !== value) : [...current, value],
        })
    }

    const commitMinPrice = () => {
        const parsed = Number(minInput)
        const safeMin = Number.isFinite(parsed) ? Math.max(0, parsed) : filters.priceRange[0]
        const normalizedMin = Math.min(safeMin, filters.priceRange[1])
        onChange({ ...filters, priceRange: [normalizedMin, filters.priceRange[1]] })
    }

    const commitMaxPrice = () => {
        const parsed = Number(maxInput)
        const safeMax = Number.isFinite(parsed) ? Math.max(0, parsed) : filters.priceRange[1]
        const normalizedMax = Math.max(filters.priceRange[0], Math.min(maxPrice, safeMax))
        onChange({ ...filters, priceRange: [filters.priceRange[0], normalizedMax] })
    }

    const filteredBrands = filters.brandSearch
        ? brands.filter(b => b.toLowerCase().includes(filters.brandSearch.toLowerCase()))
        : brands

    const visibleParentCategories = (filters.categories.length > 0 ? filters.categories : categories).filter(
        category => (subCategoriesByCategory[category] ?? []).length > 0
    )

    const visibleCategories = showAllCategories ? categories : categories.slice(0, 8)
    const visibleSubCategoryParents = showAllSubCategories ? visibleParentCategories : visibleParentCategories.slice(0, 5)
    const visibleBrands = showAllBrands ? filteredBrands : filteredBrands.slice(0, 10)

    const showMoreClass = `min-h-[44px] rounded px-1 text-sm font-semibold text-primary-700 hover:text-primary-800 lg:min-h-[30px] dark:text-primary-300 ${FOCUS_RING}`

    const renderContent = (isSheet: boolean) => (
        <div className="flex h-full min-h-0 flex-col bg-white dark:bg-gray-900">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 px-3 py-1.5 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-primary-700 dark:text-primary-300" aria-hidden="true" />
                    <h2 className="font-syne text-sm font-bold text-gray-900 dark:text-gray-100">Filters</h2>
                    {activeCount > 0 && (
                        <span className="rounded-full bg-primary-700 px-2 py-0.5 text-[11px] font-bold leading-none text-white">
                            {activeCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {activeCount > 0 && (
                        <button
                            type="button"
                            onClick={reset}
                            className={`inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary-700 hover:text-primary-800 lg:min-h-[32px] dark:text-primary-300 ${FOCUS_RING}`}
                        >
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                            Reset
                        </button>
                    )}
                    {isSheet && onMobileClose && (
                        <button
                            type="button"
                            ref={sheetCloseRef}
                            onClick={onMobileClose}
                            aria-label="Close filters"
                            className={`flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 ${FOCUS_RING}`}
                        >
                            <X className="h-5 w-5" aria-hidden="true" />
                        </button>
                    )}
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3">
                {categories.length > 0 && (
                    <Section title="Department">
                        <div>
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
                                    type="button"
                                    onClick={() => setShowAllCategories(v => !v)}
                                    className={showMoreClass}
                                >
                                    {showAllCategories ? 'Show fewer' : `Show all (${categories.length})`}
                                </button>
                            )}
                        </div>
                    </Section>
                )}

                {visibleParentCategories.length > 0 && (
                    <Section title="Sub-department" defaultOpen={filters.categories.length > 0}>
                        <div className="space-y-1">
                            {visibleSubCategoryParents.map(category => (
                                <div key={category}>
                                    <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        {category}
                                    </p>
                                    <div>
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
                                    type="button"
                                    onClick={() => setShowAllSubCategories(v => !v)}
                                    className={showMoreClass}
                                >
                                    {showAllSubCategories ? 'Show fewer' : 'Show more'}
                                </button>
                            )}
                        </div>
                    </Section>
                )}

                <Section title={`Price (${baseCurrency})`}>
                    <div className="space-y-1">
                        <div className="flex items-end gap-1.5">
                            <label className="block flex-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                Min
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    max={filters.priceRange[1]}
                                    value={minInput}
                                    onChange={e => setMinInput(e.target.value)}
                                    onBlur={commitMinPrice}
                                    onKeyDown={e => e.key === 'Enter' && commitMinPrice()}
                                    className={`${INPUT_CLASS} mt-0.5 font-mono`}
                                />
                            </label>
                            <span className="pb-2 text-gray-500" aria-hidden="true">
                                –
                            </span>
                            <label className="block flex-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                Max
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min={filters.priceRange[0]}
                                    max={maxPrice}
                                    value={maxInput}
                                    onChange={e => setMaxInput(e.target.value)}
                                    onBlur={commitMaxPrice}
                                    onKeyDown={e => e.key === 'Enter' && commitMaxPrice()}
                                    className={`${INPUT_CLASS} mt-0.5 font-mono`}
                                />
                            </label>
                        </div>
                        <input
                            type="range"
                            aria-label="Minimum price"
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
                            className={`block h-5 w-full cursor-pointer accent-primary ${FOCUS_RING}`}
                        />
                        <input
                            type="range"
                            aria-label="Maximum price"
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
                            className={`block h-5 w-full cursor-pointer accent-primary ${FOCUS_RING}`}
                        />
                    </div>
                </Section>

                <Section title="Delivery & availability">
                    <div>
                        <CheckItem
                            label="Free shipping"
                            icon={<Truck />}
                            checked={!!filters.freeShipping}
                            onChange={v => onChange({ ...filters, freeShipping: v })}
                        />
                        <CheckItem
                            label="Verified sellers"
                            icon={<BadgeCheck />}
                            checked={!!filters.verifiedSellerOnly}
                            onChange={v => onChange({ ...filters, verifiedSellerOnly: v })}
                        />
                        <CheckItem
                            label="In stock"
                            icon={<PackageCheck />}
                            checked={filters.inStock}
                            onChange={v => onChange({ ...filters, inStock: v })}
                        />
                        <CheckItem
                            label="On sale"
                            icon={<Tag />}
                            checked={filters.onSale}
                            onChange={v => onChange({ ...filters, onSale: v })}
                        />
                    </div>
                </Section>

                <Section title="Customer rating" defaultOpen={false}>
                    <div>
                        {[4, 3, 2, 1].map(r => (
                            <button
                                type="button"
                                key={r}
                                aria-pressed={filters.minRating === r}
                                onClick={() => onChange({ ...filters, minRating: filters.minRating === r ? 0 : r })}
                                className={`flex min-h-[44px] w-full items-center gap-2 rounded-md px-1 text-sm transition-colors lg:min-h-[30px] ${FOCUS_RING} ${
                                    filters.minRating === r
                                        ? 'bg-primary-50 font-semibold text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                                }`}
                            >
                                <span className="flex" aria-hidden="true">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-4 w-4 lg:h-3.5 lg:w-3.5 ${
                                                i < r
                                                    ? 'fill-amber-500 text-amber-500'
                                                    : 'fill-gray-300 text-gray-300 dark:fill-gray-600 dark:text-gray-600'
                                            }`}
                                        />
                                    ))}
                                </span>
                                <span>{r} &amp; up</span>
                            </button>
                        ))}
                    </div>
                </Section>

                {brands.length > 0 && (
                    <Section title="Brand" defaultOpen={false}>
                        {brands.length > 10 && (
                            <div className="relative mb-1.5 flex items-center">
                                <Search
                                    className="pointer-events-none absolute left-2.5 h-4 w-4 text-gray-500 dark:text-gray-400"
                                    aria-hidden="true"
                                />
                                <input
                                    type="text"
                                    aria-label="Search brands"
                                    placeholder="Search brands…"
                                    value={filters.brandSearch}
                                    onChange={e => onChange({ ...filters, brandSearch: e.target.value })}
                                    className={`${INPUT_CLASS} pl-8`}
                                />
                            </div>
                        )}
                        <div>
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
                                    type="button"
                                    onClick={() => setShowAllBrands(v => !v)}
                                    className={showMoreClass}
                                >
                                    {showAllBrands ? 'Show fewer' : `Show all (${filteredBrands.length})`}
                                </button>
                            )}
                            {filteredBrands.length === 0 && (
                                <p className="py-1 text-sm text-gray-600 dark:text-gray-400">
                                    No brands match &ldquo;{filters.brandSearch}&rdquo;
                                </p>
                            )}
                        </div>
                    </Section>
                )}

                {conditions.length > 0 && (
                    <Section title="Condition" defaultOpen={false}>
                        <div>
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
                )}

                <Section title="Buying model" defaultOpen={false}>
                    <div className="space-y-1.5">
                        <ChoiceButton
                            active={filters.transactionType === 'buy'}
                            label="Buy now"
                            icon={<Zap className="h-4 w-4" />}
                            onClick={() =>
                                onChange({ ...filters, transactionType: filters.transactionType === 'buy' ? 'all' : 'buy' })
                            }
                        />
                        <ChoiceButton
                            active={filters.transactionType === 'auction'}
                            label="Auctions only"
                            icon={<Gavel className="h-4 w-4" />}
                            onClick={() =>
                                onChange({
                                    ...filters,
                                    transactionType: filters.transactionType === 'auction' ? 'all' : 'auction',
                                })
                            }
                        />
                        <ChoiceButton
                            active={filters.transactionType === 'rfq'}
                            label="Bulk / RFQ"
                            icon={<FileText className="h-4 w-4" />}
                            onClick={() =>
                                onChange({ ...filters, transactionType: filters.transactionType === 'rfq' ? 'all' : 'rfq' })
                            }
                        />
                    </div>
                </Section>

                <Section title="Sustainability" defaultOpen={false}>
                    <ChoiceButton
                        active={filters.sustainableOnly}
                        label="Sustainable & verified"
                        icon={<Leaf className="h-4 w-4" />}
                        onClick={() => onChange({ ...filters, sustainableOnly: !filters.sustainableOnly })}
                    />
                </Section>
            </div>

            {isSheet && onMobileClose && (
                <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-gray-700 dark:bg-gray-900">
                    <button
                        type="button"
                        onClick={onMobileClose}
                        className={`min-h-[48px] w-full rounded-lg bg-primary-700 px-4 text-base font-bold text-white hover:bg-primary-800 active:scale-[0.99] ${FOCUS_RING}`}
                    >
                        Show {resultCount !== undefined ? resultCount.toLocaleString() : ''} results
                    </button>
                </div>
            )}
        </div>
    )

    return (
        <>
            <div
                aria-hidden="true"
                onClick={onMobileClose}
                className={`fixed inset-0 z-[400] bg-black/50 transition-opacity duration-200 lg:hidden ${
                    mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
            />

            <div
                role="dialog"
                aria-modal="true"
                aria-label="Filters"
                aria-hidden={!mobileOpen}
                className={`fixed inset-x-0 bottom-0 z-[401] flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl transition-[transform,visibility] duration-300 ease-out dark:bg-gray-900 lg:hidden ${
                    mobileOpen ? 'visible translate-y-0' : 'invisible translate-y-full'
                }`}
            >
                <div className="flex shrink-0 justify-center pt-1.5" aria-hidden="true">
                    <span className="h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
                </div>
                {renderContent(true)}
            </div>

            <aside
                aria-label="Product filters"
                className="hidden w-60 shrink-0 flex-col self-start overflow-hidden rounded-lg border border-gray-200 bg-white lg:sticky lg:top-28 lg:flex lg:max-h-[calc(100vh-8rem)] xl:w-64 dark:border-gray-700 dark:bg-gray-900"
            >
                {renderContent(false)}
            </aside>
        </>
    )
}
