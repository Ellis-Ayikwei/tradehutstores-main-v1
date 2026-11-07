'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, PackageOpen, RefreshCw, Search, SearchX, X } from 'lucide-react'
import { ProductCard, ProductGrid } from '@/components/common/marketplace'
import type { MarketplaceProduct } from '@/components/common/marketplace'
import { SellerPromosStrip } from '@/components/Promo'
import { useCurrency } from '@/contexts/CurrencyContext'
import type { StoreProduct } from './types'

type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'discount'

const SORTS: Array<{ key: SortKey; label: string }> = [
    { key: 'newest', label: 'Newest' },
    { key: 'price-asc', label: 'Price: low to high' },
    { key: 'price-desc', label: 'Price: high to low' },
    { key: 'rating', label: 'Top rated' },
    { key: 'discount', label: 'Biggest discount' },
]

const PAGE_SIZE = 20

function sortProducts(list: StoreProduct[], sort: SortKey): StoreProduct[] {
    const out = [...list]
    switch (sort) {
        case 'price-asc':
            return out.sort((a, b) => a.price - b.price)
        case 'price-desc':
            return out.sort((a, b) => b.price - a.price)
        case 'rating':
            return out.sort(
                (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0)
            )
        case 'discount':
            return out.sort((a, b) => b.discountPct - a.discountPct)
        default:
            return out.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    }
}

interface StoreProductsProps {
    storeId: string
    storeName: string | null
    products: StoreProduct[]
    productsError: boolean
}

export default function StoreProducts({ storeId, storeName, products, productsError }: StoreProductsProps) {
    const router = useRouter()
    const { formatDisplayPrice } = useCurrency()
    const [query, setQuery] = useState('')
    const [sort, setSort] = useState<SortKey>('newest')
    const [category, setCategory] = useState<string | null>(null)
    const [visible, setVisible] = useState(PAGE_SIZE)

    const categories = useMemo(() => {
        const counts = new Map<string, number>()
        for (const p of products) {
            if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
        }
        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
    }, [products])

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase()
        const base = products.filter(
            (p) => (!category || p.category === category) && (!q || p.name.toLowerCase().includes(q))
        )
        return sortProducts(base, sort)
    }, [products, query, category, sort])

    const filtersActive = query.trim() !== '' || category !== null
    const shown = filtered.slice(0, visible)

    const clearFilters = () => {
        setQuery('')
        setCategory(null)
        setVisible(PAGE_SIZE)
    }

    if (productsError) {
        return (
            <div role="alert" className="flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-8 text-center dark:border-red-900 dark:bg-gray-900">
                <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">We couldn&apos;t load this store&apos;s products.</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Check your connection and try again.</p>
                <button
                    type="button"
                    onClick={() => router.refresh()}
                    className="mt-1 inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 sm:h-10"
                >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Try again
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <SellerPromosStrip sellerId={storeId} sellerName={storeName ?? undefined} variant="compact" />

            {products.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
                    <PackageOpen className="h-8 w-8 text-gray-500" aria-hidden="true" />
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">No products listed yet</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">This store hasn&apos;t published any products. Check back soon.</p>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value)
                                    setVisible(PAGE_SIZE)
                                }}
                                placeholder="Search in this store"
                                aria-label="Search in this store"
                                className="h-11 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-base text-gray-900 placeholder:text-gray-500 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:ring-primary-900 sm:h-10 sm:text-sm"
                            />
                        </div>
                        <label className="shrink-0">
                            <span className="sr-only">Sort products</span>
                            <select
                                value={sort}
                                onChange={(e) => {
                                    setSort(e.target.value as SortKey)
                                    setVisible(PAGE_SIZE)
                                }}
                                className="h-11 w-[8.25rem] rounded-lg border border-gray-300 bg-white px-2 text-base text-gray-900 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:ring-primary-900 sm:h-10 sm:w-auto sm:min-w-[11rem] sm:text-sm"
                            >
                                {SORTS.map((s) => (
                                    <option key={s.key} value={s.key}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    {categories.length > 1 ? (
                        <div role="group" aria-label="Filter by category" className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-0.5 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
                            <CategoryChip label="All" active={category === null} onClick={() => { setCategory(null); setVisible(PAGE_SIZE) }} />
                            {categories.map(([name, count]) => (
                                <CategoryChip
                                    key={name}
                                    label={`${name} (${count})`}
                                    active={category === name}
                                    onClick={() => { setCategory(category === name ? null : name); setVisible(PAGE_SIZE) }}
                                />
                            ))}
                        </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <p role="status" aria-live="polite">
                            {filtered.length.toLocaleString()} product{filtered.length === 1 ? '' : 's'}
                            {filtersActive ? ' found' : ''}
                        </p>
                        {filtersActive ? (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex h-8 items-center gap-1 rounded px-2 font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:text-primary-300 dark:hover:bg-gray-800"
                            >
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                                Clear filters
                            </button>
                        ) : null}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
                            <SearchX className="h-8 w-8 text-gray-500" aria-hidden="true" />
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">No products match your search</p>
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-1 inline-flex h-11 items-center rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 sm:h-10"
                            >
                                Clear filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <ProductGrid layout="default">
                                {shown.map((p, i) => {
                                    const card: MarketplaceProduct = {
                                        id: p.id,
                                        title: p.name,
                                        href: `/products/${p.id}`,
                                        imageUrl: p.imageUrl,
                                        price: p.price,
                                        originalPrice: p.originalPrice,
                                        rating: p.rating,
                                        reviewCount: p.reviewCount,
                                        stockLeft: p.stockLeft,
                                        variants: p.variants,
                                        defaultVariantId: p.defaultVariantId,
                                    }
                                    return <ProductCard key={p.id} product={card} formatPrice={formatDisplayPrice} priority={i < 4} />
                                })}
                            </ProductGrid>

                            {filtered.length > shown.length ? (
                                <div className="flex flex-col items-center gap-1 pt-1">
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                        Showing {shown.length.toLocaleString()} of {filtered.length.toLocaleString()}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setVisible((v) => v + PAGE_SIZE)}
                                        className="inline-flex h-11 w-full max-w-xs items-center justify-center rounded-lg border border-primary-700 bg-white px-4 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 dark:bg-gray-900 dark:text-primary-300 dark:hover:bg-gray-800"
                                    >
                                        Show more products
                                    </button>
                                </div>
                            ) : null}
                        </>
                    )}
                </>
            )}
        </div>
    )
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-1 ${
                active
                    ? 'border-primary-700 bg-primary-700 text-white'
                    : 'border-gray-300 bg-white text-gray-800 hover:border-primary-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'
            }`}
        >
            {label}
        </button>
    )
}
