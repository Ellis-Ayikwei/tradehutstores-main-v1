'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { fetchProducts } from '@/store/productSlice'
import MainLayout from '@/components/Layouts/MainLayout'
import ProductCard from '@/components/Products/ProductCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ProductFilters, { FilterState } from '@/components/Products/ProductFilters'
import {
    Grid3x3,
    List,
    Home,
    ChevronRight,
    SlidersHorizontal,
    ChevronLeft,
    ChevronDown,
    X,
    PackageSearch,
} from 'lucide-react'
import Link from 'next/link'

// ─── Sort options ─────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
    { value: 'featured',    label: 'Featured' },
    { value: 'price-asc',   label: 'Price: Low → High' },
    { value: 'price-desc',  label: 'Price: High → Low' },
    { value: 'rating',      label: 'Highest Rated' },
    { value: 'newest',      label: 'Newest First' },
]

const PAGE_SIZES = [12, 24, 48]

const DEFAULT_FILTERS: FilterState = {
    categories: [],
    brands: [],
    priceRange: [0, 5000],
    minRating: 0,
    inStock: false,
    onSale: false,
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────

function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
    return (
        <nav className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-6">
            {items.map((item, i) => (
                <span key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3 text-gray-300 dark:text-gray-700" />}
                    {item.href ? (
                        <Link href={item.href} className="hover:text-orange-500 transition-colors flex items-center gap-1">
                            {i === 0 && <Home className="h-3 w-3" />}
                            {item.label}
                        </Link>
                    ) : (
                        <span className="text-gray-900 dark:text-white font-semibold">{item.label}</span>
                    )}
                </span>
            ))}
        </nav>
    )
}

// ─── Custom select ────────────────────────────────────────────────────────────

function SortSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer font-medium"
            >
                {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
        </div>
    )
}

// ─── Active filter chips ──────────────────────────────────────────────────────

function FilterChips({ filters, onChange }: { filters: FilterState; onChange: (f: FilterState) => void }) {
    const chips: { label: string; onRemove: () => void }[] = []

    filters.categories.forEach(c => chips.push({
        label: c,
        onRemove: () => onChange({ ...filters, categories: filters.categories.filter(x => x !== c) }),
    }))
    filters.brands.forEach(b => chips.push({
        label: b,
        onRemove: () => onChange({ ...filters, brands: filters.brands.filter(x => x !== b) }),
    }))
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 5000) chips.push({
        label: `$${filters.priceRange[0]}–$${filters.priceRange[1]}`,
        onRemove: () => onChange({ ...filters, priceRange: [0, 5000] }),
    })
    if (filters.minRating > 0) chips.push({
        label: `${filters.minRating}★ & up`,
        onRemove: () => onChange({ ...filters, minRating: 0 }),
    })
    if (filters.inStock) chips.push({
        label: 'In Stock',
        onRemove: () => onChange({ ...filters, inStock: false }),
    })
    if (filters.onSale) chips.push({
        label: 'On Sale',
        onRemove: () => onChange({ ...filters, onSale: false }),
    })

    if (chips.length === 0) return null

    return (
        <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">Active:</span>
            {chips.map((chip, i) => (
                <span
                    key={i}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-xs font-semibold border border-orange-200 dark:border-orange-800"
                >
                    {chip.label}
                    <button onClick={chip.onRemove} className="hover:text-orange-800 dark:hover:text-orange-200 transition-colors">
                        <X className="h-3 w-3" />
                    </button>
                </span>
            ))}
            <button
                onClick={() => onChange(DEFAULT_FILTERS)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium underline underline-offset-2"
            >
                Clear all
            </button>
        </div>
    )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
    current,
    total,
    pageSize,
    onChange,
}: {
    current: number
    total: number
    pageSize: number
    onChange: (page: number) => void
}) {
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages <= 1) return null

    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
        pages.push(1)
        if (current > 3) pages.push('...')
        for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) pages.push(i)
        if (current < totalPages - 2) pages.push('...')
        pages.push(totalPages)
    }

    const btn = 'flex items-center justify-center h-8 min-w-[32px] px-2 rounded-lg text-sm font-medium transition-all'

    return (
        <div className="flex items-center justify-center gap-1 mt-8">
            <button
                onClick={() => onChange(current - 1)}
                disabled={current === 1}
                className={`${btn} border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
                <ChevronLeft className="h-4 w-4" />
            </button>

            {pages.map((p, i) => p === '...' ? (
                <span key={`dots-${i}`} className="px-1 text-gray-400">…</span>
            ) : (
                <button
                    key={p}
                    onClick={() => onChange(p as number)}
                    className={`${btn} ${current === p
                        ? 'bg-orange-500 text-white border border-orange-500 shadow-sm'
                        : 'border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-orange-400 hover:text-orange-500'
                    }`}
                >
                    {p}
                </button>
            ))}

            <button
                onClick={() => onChange(current + 1)}
                disabled={current === totalPages}
                className={`${btn} border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-orange-400 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed`}
            >
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { allProducts, isUpdating } = useSelector((state: RootState) => state.products)

    const [viewMode, setViewMode]     = useState<'grid' | 'list'>('grid')
    const [sortBy, setSortBy]         = useState('featured')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize]     = useState(12)
    const [filters, setFilters]       = useState<FilterState>(DEFAULT_FILTERS)
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

    useEffect(() => {
        dispatch(fetchProducts())
    }, [dispatch])

    // ── Filter + sort ─────────────────────────────────────────────────────────
    const processedProducts = useMemo(() => {
        let result = [...(allProducts ?? [])]

        if (filters.categories.length > 0)
            result = result.filter((p: any) => filters.categories.includes(p.category))
        if (filters.brands.length > 0)
            result = result.filter((p: any) => filters.brands.includes(p.brand))
        if (filters.minRating > 0)
            result = result.filter((p: any) => (p.rating ?? 0) >= filters.minRating)
        if (filters.inStock)
            result = result.filter((p: any) => p.inStock !== false)
        if (filters.onSale)
            result = result.filter((p: any) => p.onSale || p.discount > 0)

        result = result.filter((p: any) => {
            const price = p.price ?? 0
            return price >= filters.priceRange[0] && price <= filters.priceRange[1]
        })

        switch (sortBy) {
            case 'price-asc':  result.sort((a: any, b: any) => (a.price ?? 0) - (b.price ?? 0)); break
            case 'price-desc': result.sort((a: any, b: any) => (b.price ?? 0) - (a.price ?? 0)); break
            case 'rating':     result.sort((a: any, b: any) => (b.rating ?? 0) - (a.rating ?? 0)); break
            case 'newest':     result.sort((a: any, b: any) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()); break
        }

        return result
    }, [allProducts, filters, sortBy])

    const paginatedProducts = useMemo(() =>
        processedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize),
        [processedProducts, currentPage, pageSize]
    )

    const handleFilterChange = useCallback((f: FilterState) => {
        setFilters(f)
        setCurrentPage(1)
    }, [])

    const handleSortChange = (value: string) => {
        setSortBy(value)
        setCurrentPage(1)
    }

    return (
        <MainLayout>
            <div className="max-w-screen-2xl mx-auto px-3 sm:px-6 py-6">
                <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Products' }]} />

                <div className="flex gap-6 items-start">
                    {/* ── Sidebar ── */}
                    <ProductFilters
                        filters={filters}
                        onChange={handleFilterChange}
                        resultCount={processedProducts.length}
                        mobileOpen={mobileFiltersOpen}
                        onMobileClose={() => setMobileFiltersOpen(false)}
                    />

                    {/* ── Main content ── */}
                    <section className="flex-1 min-w-0">

                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                {/* Mobile filter trigger */}
                                <button
                                    onClick={() => setMobileFiltersOpen(true)}
                                    className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-orange-400 hover:text-orange-500 transition-all"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Filters
                                    {Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : v !== false && v !== 0 && !(Array.isArray(v))) && (
                                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                                    )}
                                </button>

                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-bold text-gray-900 dark:text-white">{processedProducts.length.toLocaleString()}</span>
                                    {' '}product{processedProducts.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                                {/* Sort */}
                                <SortSelect value={sortBy} onChange={handleSortChange} />

                                {/* Page size */}
                                <div className="relative hidden sm:block">
                                    <select
                                        value={pageSize}
                                        onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                                        className="appearance-none pl-3 pr-7 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                                    >
                                        {PAGE_SIZES.map(s => <option key={s} value={s}>Show {s}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                                </div>

                                {/* View mode */}
                                <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        aria-label="Grid view"
                                    >
                                        <Grid3x3 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-2 border-l border-gray-200 dark:border-gray-700 transition-colors ${viewMode === 'list' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                                        aria-label="List view"
                                    >
                                        <List className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Active filter chips */}
                        <FilterChips filters={filters} onChange={handleFilterChange} />

                        {/* Products */}
                        {isUpdating ? (
                            <LoadingSpinner text="Loading products..." />
                        ) : paginatedProducts.length > 0 ? (
                            <>
                                <div className={`grid gap-4 ${
                                    viewMode === 'grid'
                                        ? 'grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                                        : 'grid-cols-1'
                                }`}>
                                    {paginatedProducts.map((product: any) => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            viewMode={viewMode}
                                        />
                                    ))}
                                </div>

                                {/* Pagination + page info */}
                                <div className="flex flex-col items-center gap-2 mt-6">
                                    <Pagination
                                        current={currentPage}
                                        total={processedProducts.length}
                                        pageSize={pageSize}
                                        onChange={page => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                                    />
                                    <p className="text-xs text-gray-400 dark:text-gray-600">
                                        Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, processedProducts.length)} of {processedProducts.length.toLocaleString()} results
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="p-5 rounded-2xl bg-gray-100 dark:bg-gray-800">
                                    <PackageSearch className="h-12 w-12 text-gray-400 dark:text-gray-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-base font-bold text-gray-900 dark:text-white mb-1">No products found</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters or search terms</p>
                                </div>
                                <button
                                    onClick={() => setFilters(DEFAULT_FILTERS)}
                                    className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition-colors"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </MainLayout>
    )
}