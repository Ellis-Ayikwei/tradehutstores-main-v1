'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    LayoutGrid,
    List,
    SearchX,
    SlidersHorizontal,
    X,
} from 'lucide-react'
import { AppDispatch, RootState } from '@/store'
import { fetchProducts } from '@/store/productSlice'
import MainLayout from '@/components/Layouts/MainLayout'
import Pagination from '@/components/common/Pagination'
import {
    ProductCardSkeleton,
    ProductGrid,
    productHasMeta,
    cardVariantsFromRaw,
} from '@/components/common/marketplace'
import type { MarketplaceProduct } from '@/components/common/marketplace'
import { CommerceProductCard } from '@/components/Products/ProductCard'
import ProductFilters, {
    FilterState,
    DEFAULT_FILTERS,
    countActiveFilters,
} from '@/components/Products/ProductFilters'
import { useCurrency } from '@/contexts/CurrencyContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
    { value: 'featured', label: 'Featured' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'rating', label: 'Highest rated' },
    { value: 'newest', label: 'Newest' },
]

const PAGE_SIZES = [20, 40, 80]
const DEFAULT_PAGE_SIZE = 40
const SKELETON_COUNT = 10
/** Columns beside the filter rail: 2 / 3 / 4 (lg) / 5 (xl). */
const LISTING_SIZES = '(min-width: 1280px) 16vw, (min-width: 1024px) 19vw, (min-width: 640px) 33vw, 50vw'

const FOCUS_RING =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-950'

const CONTROL =
    'h-11 rounded-lg border border-gray-300 bg-white text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 sm:h-9'

// ─── Catalog row (shape of GET /products/catalog/ after the slice maps it) ────

interface CatalogProduct {
    id: string | number
    name: string
    description?: string | null
    main_product_image?: string | null
    price?: string | number | null
    final_price?: string | number | null
    discount_percentage?: string | number | null
    rating?: string | number | null
    total_reviews?: number | null
    category?: string | null
    sub_category?: string | null
    brand?: string | null
    condition?: string | null
    available?: boolean
    createdAt?: string
    inStock?: boolean
    onSale?: boolean
    transactionType?: string
    sustainable?: boolean
    eco?: boolean
    /** Not served by /products/catalog/ yet; passed through when present (BE-PRD-1). */
    free_shipping?: boolean | null
    sold_count?: number | string | null
    inventory_level?: number | string | null
    stock_left?: number | string | null
    store_name?: string | null
    seller_name?: string | null
    estimated_delivery?: string | null
    arrival_text?: string | null
    /** Not served by /products/catalog/ yet; when present (BE-PRD-2) the card shows colour swatches. */
    variants?: unknown
    default_variant?: string | { id?: string } | null
}

/** Finite non-negative number, or undefined when the row does not carry the field. */
function optionalCount(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined
    const n = Number(value)
    return Number.isFinite(n) && n >= 0 ? n : undefined
}

function optionalText(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function num(value: unknown): number {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
}

/** Price the buyer actually pays (discounted when a discount exists). */
function effectivePrice(p: CatalogProduct): number {
    return num(p.final_price ?? p.price)
}

function toCardProduct(p: CatalogProduct): MarketplaceProduct {
    const list = num(p.price)
    const pay = effectivePrice(p)
    const rating = num(p.rating)
    const reviews = num(p.total_reviews)
    return {
        id: p.id,
        title: p.name,
        href: `/products/${p.id}`,
        imageUrl: p.main_product_image ?? null,
        price: pay,
        originalPrice: list > pay ? list : undefined,
        rating: rating > 0 ? rating : undefined,
        reviewCount: reviews > 0 ? reviews : undefined,
        stockLeft: p.available === false ? 0 : optionalCount(p.stock_left ?? p.inventory_level),
        freeShipping: p.free_shipping === true ? true : undefined,
        soldCount: optionalCount(p.sold_count),
        sellerName: optionalText(p.store_name) ?? optionalText(p.seller_name),
        arrivalText: optionalText(p.arrival_text) ?? optionalText(p.estimated_delivery),
        brand: p.brand ?? undefined,
        category: p.category ?? undefined,
        condition: optionalText(p.condition),
        variants: cardVariantsFromRaw(p.variants, { discountPct: num(p.discount_percentage) }),
        defaultVariantId:
            typeof p.default_variant === 'string' ? p.default_variant : (p.default_variant?.id ?? undefined),
    }
}

// ─── Active filter chips (single scrollable row on mobile) ────────────────────

interface Chip {
    key: string
    label: string
    onRemove: () => void
}

function FilterChips({
    filters,
    maxPrice,
    searchQuery,
    onClearSearch,
    onChange,
}: {
    filters: FilterState
    maxPrice: number
    searchQuery: string
    onClearSearch: () => void
    onChange: (f: FilterState) => void
}) {
    const { formatDisplayPrice } = useCurrency()
    const chips: Chip[] = []

    if (searchQuery) chips.push({ key: 'search', label: `“${searchQuery}”`, onRemove: onClearSearch })
    filters.categories.forEach(c =>
        chips.push({
            key: `cat-${c}`,
            label: c,
            onRemove: () => onChange({ ...filters, categories: filters.categories.filter(x => x !== c) }),
        })
    )
    filters.subCategories.forEach(sub =>
        chips.push({
            key: `sub-${sub}`,
            label: sub,
            onRemove: () => onChange({ ...filters, subCategories: filters.subCategories.filter(x => x !== sub) }),
        })
    )
    filters.brands.forEach(b =>
        chips.push({
            key: `brand-${b}`,
            label: b,
            onRemove: () => onChange({ ...filters, brands: filters.brands.filter(x => x !== b) }),
        })
    )
    filters.conditions.forEach(cond =>
        chips.push({
            key: `cond-${cond}`,
            label: cond,
            onRemove: () => onChange({ ...filters, conditions: filters.conditions.filter(x => x !== cond) }),
        })
    )
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < maxPrice)
        chips.push({
            key: 'price',
            label: `${formatDisplayPrice(filters.priceRange[0])}–${formatDisplayPrice(filters.priceRange[1])}`,
            onRemove: () => onChange({ ...filters, priceRange: [0, maxPrice] }),
        })
    if (filters.minRating > 0)
        chips.push({
            key: 'rating',
            label: `${filters.minRating}★ & up`,
            onRemove: () => onChange({ ...filters, minRating: 0 }),
        })
    if (filters.inStock) chips.push({ key: 'stock', label: 'In stock', onRemove: () => onChange({ ...filters, inStock: false }) })
    if (filters.onSale) chips.push({ key: 'sale', label: 'On sale', onRemove: () => onChange({ ...filters, onSale: false }) })
    if (filters.transactionType !== 'all')
        chips.push({
            key: 'type',
            label:
                filters.transactionType === 'buy' ? 'Buy now' : filters.transactionType === 'auction' ? 'Auction' : 'Bulk / RFQ',
            onRemove: () => onChange({ ...filters, transactionType: 'all' }),
        })
    if (filters.sustainableOnly)
        chips.push({ key: 'eco', label: 'Sustainable', onRemove: () => onChange({ ...filters, sustainableOnly: false }) })

    if (chips.length === 0) return null

    return (
        <div
            className="-mx-3 mb-2 flex items-center gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden"
            aria-label="Active filters"
        >
            {chips.map(chip => (
                <button
                    key={chip.key}
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Remove ${chip.label} filter`}
                    className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-gray-300 bg-white px-2.5 text-xs font-semibold text-gray-800 hover:border-primary-700 hover:text-primary-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 ${FOCUS_RING}`}
                >
                    <span className="max-w-[160px] truncate">{chip.label}</span>
                    <X className="h-3 w-3" aria-hidden="true" />
                </button>
            ))}
            <button
                type="button"
                onClick={() => {
                    onClearSearch()
                    onChange({ ...DEFAULT_FILTERS, priceRange: [0, maxPrice] })
                }}
                className={`h-8 shrink-0 rounded-full px-2 text-xs font-semibold text-primary-700 underline underline-offset-2 hover:text-primary-800 dark:text-primary-300 ${FOCUS_RING}`}
            >
                Clear all
            </button>
        </div>
    )
}

// ─── Empty / error states ─────────────────────────────────────────────────────

function EmptyState({ catalogEmpty, onReset }: { catalogEmpty: boolean; onReset: () => void }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-8 text-center dark:border-gray-700 dark:bg-gray-900">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <SearchX className="h-6 w-6 text-gray-500 dark:text-gray-400" aria-hidden="true" />
            </span>
            <p className="font-syne text-base font-bold text-gray-900 dark:text-gray-100">
                {catalogEmpty ? 'No products available yet' : 'No products match your search'}
            </p>
            {!catalogEmpty ? (
                <>
                    <p className="max-w-xs text-sm text-gray-600 dark:text-gray-400">
                        Try removing a filter or searching with different words.
                    </p>
                    <button
                        type="button"
                        onClick={onReset}
                        className={`mt-1 inline-flex h-11 items-center rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 sm:h-10 ${FOCUS_RING}`}
                    >
                        Clear all filters
                    </button>
                </>
            ) : null}
        </div>
    )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            role="alert"
            className="flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-8 text-center dark:border-red-900 dark:bg-gray-900"
        >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-6 w-6 text-red-700 dark:text-red-200" aria-hidden="true" />
            </span>
            <p className="font-syne text-base font-bold text-gray-900 dark:text-gray-100">Couldn&apos;t load products</p>
            <p className="max-w-xs text-sm text-gray-600 dark:text-gray-400">
                Check your connection and try again.
            </p>
            <button
                type="button"
                onClick={onRetry}
                className={`mt-1 inline-flex h-11 items-center rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 sm:h-10 ${FOCUS_RING}`}
            >
                Try again
            </button>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPageClient() {
    const dispatch = useDispatch<AppDispatch>()
    const searchParams = useSearchParams()
    const { allProducts, isUpdating } = useSelector((state: RootState) => state.products)

    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [sortBy, setSortBy] = useState('featured')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
    const [searchQuery, setSearchQuery] = useState('')
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
    const [fetched, setFetched] = useState(false)
    const [loadFailed, setLoadFailed] = useState(false)

    const catalog = allProducts as unknown as CatalogProduct[]

    const loadProducts = useCallback(() => {
        setLoadFailed(false)
        dispatch(fetchProducts())
            .unwrap()
            .catch(() => setLoadFailed(true))
            .finally(() => setFetched(true))
    }, [dispatch])

    useEffect(() => {
        loadProducts()
    }, [loadProducts])

    /** Deep links: `/products?category=…&subcategory=…&search=…&sort=…&page=…` (header search, SubNav, PDP links). */
    useEffect(() => {
        const cat = searchParams.get('category')?.trim() ?? ''
        const sub = searchParams.get('subcategory')?.trim() ?? ''
        const query = (searchParams.get('search') ?? searchParams.get('q') ?? '').trim()
        const sortParam = searchParams.get('sort')
        const pageParam = Number(searchParams.get('page'))
        setFilters(prev => ({
            ...prev,
            categories: cat ? [cat] : [],
            subCategories: sub ? [sub] : [],
        }))
        setSearchQuery(query)
        if (sortParam && SORT_OPTIONS.some(o => o.value === sortParam)) setSortBy(sortParam)
        setCurrentPage(Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1)
    }, [searchParams])

    // ── Filter + sort ─────────────────────────────────────────────────────────
    const processedProducts = useMemo(() => {
        let result = [...catalog]

        const words = searchQuery.toLowerCase().split(/\s+/).filter(Boolean)
        if (words.length > 0) {
            result = result.filter(p => {
                const haystack = [p.name, p.brand, p.category, p.sub_category, p.description]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                return words.every(w => haystack.includes(w))
            })
        }

        if (filters.categories.length > 0)
            result = result.filter(p => p.category != null && filters.categories.includes(p.category))
        if (filters.subCategories.length > 0)
            result = result.filter(p => p.sub_category != null && filters.subCategories.includes(p.sub_category))
        if (filters.brands.length > 0)
            result = result.filter(p => p.brand != null && filters.brands.includes(p.brand))
        if (filters.conditions.length > 0)
            result = result.filter(p => p.condition != null && filters.conditions.includes(p.condition))
        if (filters.transactionType !== 'all')
            result = result.filter(p => p.transactionType === filters.transactionType)
        if (filters.minRating > 0) result = result.filter(p => num(p.rating) >= filters.minRating)
        if (filters.inStock) result = result.filter(p => p.inStock !== false)
        if (filters.onSale) result = result.filter(p => p.onSale || num(p.discount_percentage) > 0)
        if (filters.sustainableOnly) result = result.filter(p => p.sustainable || p.eco)

        result = result.filter(p => {
            const price = effectivePrice(p)
            return price >= filters.priceRange[0] && price <= filters.priceRange[1]
        })

        switch (sortBy) {
            case 'price-asc':
                result.sort((a, b) => effectivePrice(a) - effectivePrice(b))
                break
            case 'price-desc':
                result.sort((a, b) => effectivePrice(b) - effectivePrice(a))
                break
            case 'rating':
                result.sort((a, b) => num(b.rating) - num(a.rating))
                break
            case 'newest':
                result.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
                break
        }

        return result
    }, [catalog, filters, sortBy, searchQuery])

    const totalPages = Math.max(1, Math.ceil(processedProducts.length / pageSize))
    const page = Math.min(currentPage, totalPages)

    const paginatedProducts = useMemo(
        () => processedProducts.slice((page - 1) * pageSize, page * pageSize),
        [processedProducts, page, pageSize]
    )

    const { availableCategories, availableBrands, availableConditions, categoryCounts, brandCounts, subCategoryCounts, subCategoriesByCategory, maxProductPrice } =
        useMemo(() => {
            const cats = new Set<string>()
            const brands = new Set<string>()
            const conds = new Set<string>()
            const catCounts: Record<string, number> = {}
            const brandCnt: Record<string, number> = {}
            const subCounts: Record<string, number> = {}
            const subMap: Record<string, string[]> = {}
            let maxValue = 0

            catalog.forEach(p => {
                if (p.category) {
                    cats.add(p.category)
                    catCounts[p.category] = (catCounts[p.category] ?? 0) + 1
                }
                if (p.brand) {
                    brands.add(p.brand)
                    brandCnt[p.brand] = (brandCnt[p.brand] ?? 0) + 1
                }
                if (p.condition) conds.add(p.condition)
                if (p.sub_category) {
                    subCounts[p.sub_category] = (subCounts[p.sub_category] ?? 0) + 1
                    if (p.category) {
                        if (!subMap[p.category]) subMap[p.category] = []
                        if (!subMap[p.category].includes(p.sub_category)) subMap[p.category].push(p.sub_category)
                    }
                }
                maxValue = Math.max(maxValue, effectivePrice(p), num(p.price))
            })
            Object.keys(subMap).forEach(c => subMap[c].sort((a, b) => a.localeCompare(b)))

            return {
                availableCategories: Array.from(cats).sort((a, b) => a.localeCompare(b)),
                availableBrands: Array.from(brands).sort((a, b) => a.localeCompare(b)),
                availableConditions: Array.from(conds).sort((a, b) => a.localeCompare(b)),
                categoryCounts: catCounts,
                brandCounts: brandCnt,
                subCategoryCounts: subCounts,
                subCategoriesByCategory: subMap,
                maxProductPrice: maxValue > 0 ? Math.ceil(maxValue / 100) * 100 : 5000,
            }
        }, [catalog])

    const handleFilterChange = useCallback((f: FilterState) => {
        setFilters(f)
        setCurrentPage(1)
    }, [])

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

    const clearSearch = useCallback(() => {
        setSearchQuery('')
        setCurrentPage(1)
    }, [])

    const resetAll = useCallback(() => {
        setSearchQuery('')
        handleFilterChange({ ...DEFAULT_FILTERS, priceRange: [0, maxProductPrice] })
    }, [handleFilterChange, maxProductPrice])

    const activeCount = countActiveFilters(filters, maxProductPrice)

    // Cards own their wishlist/cart wiring (CommerceProductCard): this page does not subscribe to the cart or
    // wishlist, and converts the visible rows to card props once per page/filter change, not once per render.
    const cardProducts = useMemo(() => paginatedProducts.map(toCardProduct), [paginatedProducts])
    const gridHasMeta = useMemo(() => cardProducts.some(productHasMeta), [cardProducts])

    // ── Derived view state ────────────────────────────────────────────────────
    const isLoading = (isUpdating || !fetched) && catalog.length === 0 && !loadFailed
    const showError = loadFailed && catalog.length === 0

    const heading = searchQuery ? `Results for “${searchQuery}”` : 'All products'

    return (
        <MainLayout>
            <div className="bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
                <div className="mx-auto max-w-[1440px] px-3 py-3 sm:px-4 lg:px-6">
                    <div className="flex items-start gap-3">
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

                        <section className="min-w-0 flex-1" aria-label="Products">
                            {/* Toolbar: title + count left, controls right */}
                            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex min-w-0 items-baseline gap-2">
                                    <nav aria-label="Breadcrumb" className="hidden shrink-0 items-center gap-1 text-xs text-gray-600 sm:flex dark:text-gray-400">
                                        <Link href="/" className="hover:text-primary-700 dark:hover:text-primary-300">
                                            Home
                                        </Link>
                                        <ChevronRight className="h-3 w-3" aria-hidden="true" />
                                    </nav>
                                    <h1 className="truncate font-syne text-lg font-bold leading-tight text-gray-900 dark:text-gray-100">
                                        {heading}
                                    </h1>
                                    {!isLoading && !showError ? (
                                        <p className="shrink-0 text-xs text-gray-600 dark:text-gray-400" aria-live="polite">
                                            <span className="font-bold text-gray-900 dark:text-gray-100">
                                                {processedProducts.length.toLocaleString()}
                                            </span>{' '}
                                            result{processedProducts.length !== 1 ? 's' : ''}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMobileFiltersOpen(true)}
                                        className={`inline-flex shrink-0 items-center gap-1.5 px-3 text-sm font-semibold lg:hidden ${CONTROL} ${FOCUS_RING} ${
                                            activeCount > 0 ? 'border-primary-700 text-primary-800 dark:text-primary-200' : ''
                                        }`}
                                    >
                                        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                                        {activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
                                    </button>

                                    <div className="relative min-w-0 flex-1 sm:flex-none">
                                        <select
                                            aria-label="Sort products"
                                            value={sortBy}
                                            onChange={e => {
                                                setSortBy(e.target.value)
                                                setCurrentPage(1)
                                            }}
                                            className={`w-full cursor-pointer appearance-none pl-3 pr-8 text-base font-medium sm:w-auto sm:text-sm ${CONTROL} ${FOCUS_RING}`}
                                        >
                                            {SORT_OPTIONS.map(o => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown
                                            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                                            aria-hidden="true"
                                        />
                                    </div>

                                    <div className="relative hidden md:block">
                                        <select
                                            aria-label="Products per page"
                                            value={pageSize}
                                            onChange={e => {
                                                setPageSize(Number(e.target.value))
                                                setCurrentPage(1)
                                            }}
                                            className={`cursor-pointer appearance-none pl-3 pr-8 text-sm ${CONTROL} ${FOCUS_RING}`}
                                        >
                                            {PAGE_SIZES.map(s => (
                                                <option key={s} value={s}>
                                                    Show {s}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown
                                            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                                            aria-hidden="true"
                                        />
                                    </div>

                                    <div className="flex shrink-0 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('grid')}
                                            aria-label="Grid view"
                                            aria-pressed={viewMode === 'grid'}
                                            className={`flex h-11 w-11 items-center justify-center sm:h-9 sm:w-9 ${FOCUS_RING} ${
                                                viewMode === 'grid'
                                                    ? 'bg-primary-700 text-white'
                                                    : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('list')}
                                            aria-label="List view"
                                            aria-pressed={viewMode === 'list'}
                                            className={`flex h-11 w-11 items-center justify-center border-l border-gray-300 sm:h-9 sm:w-9 dark:border-gray-600 ${FOCUS_RING} ${
                                                viewMode === 'list'
                                                    ? 'bg-primary-700 text-white'
                                                    : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
                                            }`}
                                        >
                                            <List className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <FilterChips
                                filters={filters}
                                maxPrice={maxProductPrice}
                                searchQuery={searchQuery}
                                onClearSearch={clearSearch}
                                onChange={handleFilterChange}
                            />

                            {isLoading ? (
                                viewMode === 'grid' ? (
                                    <div role="status" aria-label="Loading products">
                                        <ProductGrid layout="listing">
                                            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                                                <ProductCardSkeleton key={i} />
                                            ))}
                                        </ProductGrid>
                                    </div>
                                ) : (
                                    <div role="status" aria-label="Loading products" className="space-y-2">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <ProductCardSkeleton key={i} variant="list" compact />
                                        ))}
                                    </div>
                                )
                            ) : showError ? (
                                <ErrorState onRetry={loadProducts} />
                            ) : paginatedProducts.length > 0 ? (
                                <>
                                    {viewMode === 'grid' ? (
                                        <ProductGrid layout="listing" hasMeta={gridHasMeta}>
                                            {cardProducts.map((card, i) => (
                                                <CommerceProductCard
                                                    key={card.id}
                                                    product={card}
                                                    compact
                                                    priority={i < 4}
                                                    sizes={LISTING_SIZES}
                                                />
                                            ))}
                                        </ProductGrid>
                                    ) : (
                                        <div className="space-y-2">
                                            {cardProducts.map(card => (
                                                <CommerceProductCard key={card.id} variant="list" compact product={card} />
                                            ))}
                                        </div>
                                    )}

                                    <Pagination
                                        current={page}
                                        total={processedProducts.length}
                                        pageSize={pageSize}
                                        onChange={next => {
                                            setCurrentPage(next)
                                            window.scrollTo({ top: 0, behavior: 'smooth' })
                                        }}
                                        className="mt-3 flex flex-col items-center gap-1.5"
                                        navGapClassName="flex flex-wrap items-center justify-center gap-1"
                                        baseBtnClassName="flex h-11 min-w-[44px] items-center sm:h-9 sm:min-w-[34px] justify-center rounded-lg px-1.5 text-sm font-medium transition-colors"
                                        activeBtnClassName="bg-primary-700 font-bold text-white"
                                        inactiveBtnClassName="border border-gray-300 bg-white text-gray-700 hover:border-primary-700 hover:text-primary-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300"
                                        ellipsisClassName="px-0.5 text-sm text-gray-500 dark:text-gray-400"
                                        summaryClassName="text-xs text-gray-600 dark:text-gray-400"
                                    />
                                </>
                            ) : (
                                <EmptyState catalogEmpty={catalog.length === 0} onReset={resetAll} />
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}
