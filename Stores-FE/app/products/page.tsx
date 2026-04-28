'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { fetchProducts } from '@/store/productSlice'
import MainLayout from '@/components/Layouts/MainLayout'
import ProductCard from '@/components/Products/ProductCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import Pagination from '@/components/common/Pagination'
import ProductFilters, { FilterState, DEFAULT_FILTERS } from '@/components/Products/ProductFilters'
import {
    LayoutGrid,
    List,
    Home,
    ChevronRight,
    SlidersHorizontal,
    ChevronDown,
    X,
    SearchX,
} from 'lucide-react'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'

// ─── Sort options ─────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
    { value: 'featured',   label: 'Featured First' },
    { value: 'price-asc',  label: 'Price: Low → High' },
    { value: 'price-desc', label: 'Price: High → Low' },
    { value: 'rating',     label: 'Highest Rated' },
    { value: 'newest',     label: 'Newest First' },
]

const PAGE_SIZES = [12, 24, 48]

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
    return (
        <nav className="flex items-center gap-1.5 text-sm text-on-surface-variant mb-6">
            {items.map((item, i) => (
                <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-outline" />}
                    {item.href ? (
                        <Link
                            href={item.href}
                            className="hover:text-primary transition-colors flex items-center gap-1"
                        >
                            {i === 0 && <Home className="h-3.5 w-3.5" />}
                            {item.label}
                        </Link>
                    ) : (
                        <span className="font-bold text-on-surface">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    )
}

// ─── Sort select ──────────────────────────────────────────────────────────────

function SortSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="appearance-none pl-4 pr-9 py-2.5 text-sm border border-outline-variant/30 rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer font-medium"
            >
                {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-outline pointer-events-none" />
        </div>
    )
}

// ─── Active filter chips ──────────────────────────────────────────────────────

function FilterChips({
    filters,
    maxPrice,
    onChange,
}: {
    filters: FilterState
    maxPrice: number
    onChange: (f: FilterState) => void
}) {
    const { formatCurrency } = useCurrency()
    const chips: { label: string; onRemove: () => void }[] = []

    filters.categories.forEach(c =>
        chips.push({
            label: c,
            onRemove: () =>
                onChange({ ...filters, categories: filters.categories.filter(x => x !== c) }),
        })
    )
    filters.subCategories.forEach(sub =>
        chips.push({
            label: sub,
            onRemove: () =>
                onChange({
                    ...filters,
                    subCategories: filters.subCategories.filter(x => x !== sub),
                }),
        })
    )
    filters.brands.forEach(b =>
        chips.push({
            label: b,
            onRemove: () =>
                onChange({ ...filters, brands: filters.brands.filter(x => x !== b) }),
        })
    )
    filters.conditions.forEach(cond =>
        chips.push({
            label: cond,
            onRemove: () =>
                onChange({ ...filters, conditions: filters.conditions.filter(x => x !== cond) }),
        })
    )
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice)
        chips.push({
            label: `${formatCurrency(filters.priceRange[0])}–${formatCurrency(filters.priceRange[1])}`,
            onRemove: () => onChange({ ...filters, priceRange: [0, maxPrice] }),
        })
    if (filters.minRating > 0)
        chips.push({
            label: `${filters.minRating}★ & up`,
            onRemove: () => onChange({ ...filters, minRating: 0 }),
        })
    if (filters.inStock)
        chips.push({ label: 'In Stock', onRemove: () => onChange({ ...filters, inStock: false }) })
    if (filters.onSale)
        chips.push({ label: 'On Sale', onRemove: () => onChange({ ...filters, onSale: false }) })
    if (filters.transactionType !== 'all')
        chips.push({
            label:
                filters.transactionType === 'buy'
                    ? 'Instant Buy'
                    : filters.transactionType === 'auction'
                    ? 'Auction'
                    : 'Bulk RFQ',
            onRemove: () => onChange({ ...filters, transactionType: 'all' }),
        })
    if (filters.sustainableOnly)
        chips.push({
            label: 'Sustainable',
            onRemove: () => onChange({ ...filters, sustainableOnly: false }),
        })

    if (chips.length === 0) return null

    return (
        <div className="flex items-center gap-2 flex-wrap mb-5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant shrink-0">
                Active:
            </span>
            {chips.map((chip, i) => (
                <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold border border-outline-variant/20"
                >
                    {chip.label}
                    <button
                        onClick={chip.onRemove}
                        className="hover:text-primary transition-colors active:scale-95"
                        aria-label={`Remove ${chip.label} filter`}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </span>
            ))}
            <button
                onClick={() => onChange({ ...DEFAULT_FILTERS, priceRange: [0, maxPrice] })}
                className="text-xs text-outline hover:text-primary transition-colors font-medium underline underline-offset-2"
            >
                Clear all
            </button>
        </div>
    )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onReset }: { onReset: () => void }) {
    const suggestions = ['Electronics', 'Tools', 'Industrial', 'New Arrivals', 'On Sale']
    return (
        <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
            <div className="p-6 rounded-3xl bg-surface-container-low">
                <SearchX className="h-14 w-14 text-outline" />
            </div>
            <div className="space-y-1.5">
                <p className="font-syne font-bold text-xl text-on-surface">No products found</p>
                <p className="text-sm text-on-surface-variant max-w-xs mx-auto">
                    Try adjusting your filters or browse one of these popular categories
                </p>
            </div>
            {/* Suggestion chips */}
            <div className="flex flex-wrap justify-center gap-2">
                {suggestions.map(s => (
                    <button
                        key={s}
                        onClick={onReset}
                        className="px-4 py-2 rounded-full bg-surface-container text-on-surface-variant text-xs font-semibold border border-outline-variant/20 hover:border-primary hover:text-primary transition-all active:scale-95"
                    >
                        {s}
                    </button>
                ))}
            </div>
            <button
                onClick={onReset}
                className="px-6 py-3 rounded-xl primary-gradient text-on-primary font-bold text-sm transition-all active:scale-95 hover:shadow-lg"
            >
                Clear all filters
            </button>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { allProducts, isUpdating } = useSelector((state: RootState) => state.products)

    const [viewMode, setViewMode]           = useState<'grid' | 'list'>('grid')
    const [sortBy, setSortBy]               = useState('featured')
    const [currentPage, setCurrentPage]     = useState(1)
    const [pageSize, setPageSize]           = useState(12)
    const [filters, setFilters]             = useState<FilterState>(DEFAULT_FILTERS)
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

    useEffect(() => {
        dispatch(fetchProducts())
        console.log(allProducts)
    }, [dispatch])

    // ── Filter + sort ─────────────────────────────────────────────────────────
    const processedProducts = useMemo(() => {
        let result = [...(allProducts ?? [])]

        if (filters.categories.length > 0)
            result = result.filter((p: any) => filters.categories.includes(p.category))
        if (filters.subCategories.length > 0)
            result = result.filter((p: any) => filters.subCategories.includes(p.sub_category))
        if (filters.brands.length > 0)
            result = result.filter((p: any) => filters.brands.includes(p.brand))
        if (filters.conditions.length > 0)
            result = result.filter((p: any) => filters.conditions.includes(p.condition))
        if (filters.transactionType !== 'all')
            result = result.filter((p: any) => p.transactionType === filters.transactionType)
        if (filters.minRating > 0)
            result = result.filter((p: any) => (p.rating ?? 0) >= filters.minRating)
        if (filters.inStock)
            result = result.filter((p: any) => p.inStock !== false)
        if (filters.onSale)
            result = result.filter((p: any) => p.onSale || p.discount > 0)
        if (filters.sustainableOnly)
            result = result.filter((p: any) => p.sustainable || p.eco)

        result = result.filter((p: any) => {
            const price = p.price ?? 0
            return price >= filters.priceRange[0] && price <= filters.priceRange[1]
        })

        switch (sortBy) {
            case 'price-asc':
                result.sort((a: any, b: any) => (a.price ?? 0) - (b.price ?? 0))
                break
            case 'price-desc':
                result.sort((a: any, b: any) => (b.price ?? 0) - (a.price ?? 0))
                break
            case 'rating':
                result.sort((a: any, b: any) => (b.rating ?? 0) - (a.rating ?? 0))
                break
            case 'newest':
                result.sort(
                    (a: any, b: any) =>
                        new Date(b.createdAt ?? 0).getTime() -
                        new Date(a.createdAt ?? 0).getTime()
                )
                break
        }

        return result
    }, [allProducts, filters, sortBy])

    const paginatedProducts = useMemo(
        () => processedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [processedProducts, currentPage, pageSize]
    )

    const availableCategories = useMemo(
        () =>
            Array.from(
                new Set(
                    (allProducts ?? [])
                        .map((p: any) => p.category)
                        .filter((value: string | undefined) => Boolean(value))
                )
            ).sort((a, b) => a.localeCompare(b)),
        [allProducts]
    )

    const availableBrands = useMemo(
        () =>
            Array.from(
                new Set(
                    (allProducts ?? [])
                        .map((p: any) => p.brand)
                        .filter((value: string | undefined) => Boolean(value))
                )
            ).sort((a, b) => a.localeCompare(b)),
        [allProducts]
    )

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        ;(allProducts ?? []).forEach((p: any) => {
            const key = p.category
            if (!key) return
            counts[key] = (counts[key] ?? 0) + 1
        })
        return counts
    }, [allProducts])

    const brandCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        ;(allProducts ?? []).forEach((p: any) => {
            const key = p.brand
            if (!key) return
            counts[key] = (counts[key] ?? 0) + 1
        })
        return counts
    }, [allProducts])

    const subCategoryCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        ;(allProducts ?? []).forEach((p: any) => {
            const key = p.sub_category
            if (!key) return
            counts[key] = (counts[key] ?? 0) + 1
        })
        return counts
    }, [allProducts])

    const subCategoriesByCategory = useMemo(() => {
        const map: Record<string, string[]> = {}
        ;(allProducts ?? []).forEach((p: any) => {
            const category = p.category
            const subCategory = p.sub_category
            if (!category || !subCategory) return
            if (!map[category]) map[category] = []
            if (!map[category].includes(subCategory)) map[category].push(subCategory)
        })
        Object.keys(map).forEach(category => {
            map[category].sort((a, b) => a.localeCompare(b))
        })
        return map
    }, [allProducts])

    const availableConditions = useMemo(
        () =>
            Array.from(
                new Set(
                    (allProducts ?? [])
                        .map((p: any) => p.condition)
                        .filter((value: string | undefined) => Boolean(value))
                )
            ).sort((a, b) => a.localeCompare(b)),
        [allProducts]
    )

    const maxProductPrice = useMemo(() => {
        const maxValue = Math.max(
            0,
            ...(allProducts ?? []).map((p: any) => Number(p.price ?? 0))
        )
        return maxValue > 0 ? Math.ceil(maxValue / 100) * 100 : 5000
    }, [allProducts])

    const handleFilterChange = useCallback(
        (f: FilterState) => {
            setFilters(f)
            setCurrentPage(1)
        },
        []
    )

    useEffect(() => {
        setFilters(prev => {
            if (prev.priceRange[0] === 0 && prev.priceRange[1] === 5000) {
                return { ...prev, priceRange: [0, maxProductPrice] }
            }
            const [min, max] = prev.priceRange
            const normalizedMax = Math.min(max, maxProductPrice)
            const normalizedMin = Math.min(min, normalizedMax)
            if (normalizedMin === min && normalizedMax === max) return prev
            return { ...prev, priceRange: [normalizedMin, normalizedMax] }
        })
    }, [maxProductPrice])

    const handleSortChange = (value: string) => {
        setSortBy(value)
        setCurrentPage(1)
    }

    // Active filter indicator for mobile button
    const hasActiveFilters =
        filters.categories.length > 0 ||
        filters.subCategories.length > 0 ||
        filters.brands.length > 0 ||
        filters.conditions.length > 0 ||
        filters.transactionType !== 'all' ||
        filters.minRating > 0 ||
        filters.inStock ||
        filters.onSale ||
        filters.sustainableOnly ||
        filters.priceRange[0] > 0 ||
        filters.priceRange[1] < maxProductPrice

    return (
        <MainLayout>
            <div className="min-h-screen bg-surface text-on-surface">
                <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-10">

                    {/* Breadcrumb */}
                    <Breadcrumb
                        items={[{ label: 'Home', href: '/' }, { label: 'Products' }]}
                    />

                    {/* Page heading */}
                    <div className="mb-8">
                        <h1 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-1">
                            Browse Products
                        </h1>
                        <p className="text-on-surface-variant text-sm">
                            <span className="font-bold text-on-surface">
                                {processedProducts.length.toLocaleString()}
                            </span>{' '}
                            result{processedProducts.length !== 1 ? 's' : ''} found
                        </p>
                    </div>

                    {/* 12-col layout: sidebar (3 cols) + grid (9 cols) */}
                    <div className="flex gap-8 items-start">

                        {/* ── Filter sidebar ── */}
                        <ProductFilters
                            categories={availableCategories}
                            subCategoriesByCategory={subCategoriesByCategory}
                            categoryCounts={categoryCounts}
                            subCategoryCounts={subCategoryCounts}
                            brands={availableBrands}
                            brandCounts={brandCounts}
                            conditions={availableConditions}
                            maxPrice={maxProductPrice}
                            filters={filters}
                            onChange={handleFilterChange}
                            resultCount={processedProducts.length}
                            mobileOpen={mobileFiltersOpen}
                            onMobileClose={() => setMobileFiltersOpen(false)}
                        />

                        {/* ── Main content ── */}
                        <section className="flex-1 min-w-0">

                            {/* Toolbar */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 px-4 py-3 shadow-card">
                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                    {/* Mobile filter trigger */}
                                    <button
                                        onClick={() => setMobileFiltersOpen(true)}
                                        className="lg:hidden flex items-center gap-2 px-3 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-semibold text-on-surface-variant hover:border-primary hover:text-primary transition-all active:scale-95"
                                    >
                                        <SlidersHorizontal className="h-4 w-4" />
                                        Filters
                                        {hasActiveFilters && (
                                            <span className="w-2 h-2 rounded-full bg-primary" />
                                        )}
                                    </button>

                                    <p className="text-sm text-on-surface-variant">
                                        <span className="font-bold text-on-surface">
                                            {processedProducts.length.toLocaleString()}
                                        </span>{' '}
                                        product{processedProducts.length !== 1 ? 's' : ''}
                                    </p>
                                </div>

                                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                    {/* Sort */}
                                    <SortSelect value={sortBy} onChange={handleSortChange} />

                                    {/* Page size */}
                                    <div className="relative hidden sm:block">
                                        <select
                                            value={pageSize}
                                            onChange={e => {
                                                setPageSize(Number(e.target.value))
                                                setCurrentPage(1)
                                            }}
                                            className="appearance-none pl-4 pr-8 py-2.5 text-sm border border-outline-variant/30 rounded-xl bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                        >
                                            {PAGE_SIZES.map(s => (
                                                <option key={s} value={s}>
                                                    Show {s}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-outline pointer-events-none" />
                                    </div>

                                    {/* View mode toggle */}
                                    <div className="flex rounded-xl border border-outline-variant/30 overflow-hidden">
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-2.5 transition-colors ${
                                                viewMode === 'grid'
                                                    ? 'bg-primary-container text-on-primary-container'
                                                    : 'bg-surface-container-lowest text-outline hover:bg-surface-container-low'
                                            }`}
                                            aria-label="Grid view"
                                        >
                                            <LayoutGrid className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-2.5 border-l border-outline-variant/30 transition-colors ${
                                                viewMode === 'list'
                                                    ? 'bg-primary-container text-on-primary-container'
                                                    : 'bg-surface-container-lowest text-outline hover:bg-surface-container-low'
                                            }`}
                                            aria-label="List view"
                                        >
                                            <List className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Active filter chips */}
                            <FilterChips
                                filters={filters}
                                maxPrice={maxProductPrice}
                                onChange={handleFilterChange}
                            />

                            {/* Products grid / list / states */}
                            {isUpdating ? (
                                <LoadingSpinner text="Loading products…" />
                            ) : paginatedProducts.length > 0 ? (
                                <>
                                    <div
                                        className={`grid gap-5 ${
                                            viewMode === 'grid'
                                                ? 'grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                                : 'grid-cols-1'
                                        }`}
                                    >
                                        {paginatedProducts.map((product: any) => (
                                            <ProductCard
                                                key={product.id}
                                                product={product}
                                                viewMode={viewMode}
                                            />
                                        ))}
                                    </div>

                                    <Pagination
                                        current={currentPage}
                                        total={processedProducts.length}
                                        pageSize={pageSize}
                                        onChange={page => {
                                            setCurrentPage(page)
                                            window.scrollTo({ top: 0, behavior: 'smooth' })
                                        }}
                                    />
                                </>
                            ) : (
                                <EmptyState onReset={() => handleFilterChange(DEFAULT_FILTERS)} />
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}
