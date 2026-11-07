'use client'

/** /search - results from the search API (lib/searchClient.ts). */

import { useState, useCallback, Suspense } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { SearchX, LayoutGrid, List, ChevronRight, Loader2 } from 'lucide-react'
import MainLayout from '@/components/Layouts/MainLayout'
import Pagination from '@/components/common/Pagination'
import { ProductCard, ProductCardSkeleton, ProductGrid, cardVariantsFromRaw, productHasMeta } from '@/components/common/marketplace'
import type { CardVariant, MarketplaceProduct } from '@/components/common/marketplace'
import { CommerceProductCard } from '@/components/Products/ProductCard'
import { useCurrency } from '@/contexts/CurrencyContext'
import { searchProducts, type SearchProduct } from '@/lib/searchClient'
import { resolveMediaSrc } from '@/lib/mediaUrl'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  slug: string
  title: string
  /** Brand, falling back to category. This is not a seller name. */
  brand: string
  imageUrl: string
  price?: number
  originalPrice?: number
  inStock?: boolean
  condition?: string
  rating?: number
  ratingCount?: number
  /** Real variants, only when the search row carries them. */
  variants?: CardVariant[]
}

/** Search rows may carry `variants` (not in the typed contract yet); passed through when present. */
type SearchRow = SearchProduct & { variants?: unknown; discount_percentage?: number | null }

function toProduct(p: SearchRow): Product {
  const price = p.final_price ?? p.price ?? undefined
  const original =
    p.final_price != null && p.price != null && p.price > p.final_price ? p.price : undefined
  return {
    id: String(p.id),
    slug: String(p.slug || p.id),
    title: p.name,
    brand: p.brand || p.category || '',
    imageUrl: resolveMediaSrc(p.main_product_image || p.image),
    price: price ?? undefined,
    originalPrice: original,
    inStock: p.in_stock,
    condition: p.condition ?? undefined,
    rating: p.rating ?? undefined,
    ratingCount: p.total_reviews ?? undefined,
    variants: cardVariantsFromRaw(p.variants, { discountPct: p.discount_percentage ?? 0 }),
  }
}

function toCard(p: Product): MarketplaceProduct {
  return {
    id: p.id,
    title: p.title,
    href: `/products/${p.slug}`,
    imageUrl: p.imageUrl || null,
    price: p.price ?? 0,
    originalPrice: p.originalPrice,
    rating: p.rating,
    reviewCount: p.ratingCount,
    condition: p.condition,
    variants: p.variants,
  }
}

function useSearchResults(q: string, category: string, page: number) {
  const { data, error, isLoading, mutate } = useSWR(
    ['search-page', q, category, page],
    () => searchProducts({ q, category, page }),
    { revalidateOnFocus: false }
  )
  return {
    products: (data?.results ?? []).map(toProduct),
    total: data?.total ?? 0,
    pageSize: data?.page_size || 20,
    loading: isLoading,
    // searchProducts resolves `null` when the request fails.
    failed: Boolean(error) || (data === null && !isLoading),
    retry: () => mutate(),
  }
}

// ─── States ───────────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
        <SearchX className="h-7 w-7 text-gray-500" aria-hidden />
      </span>
      <div>
        <p className="font-syne text-lg font-bold text-gray-900 dark:text-gray-100">
          {query ? <>No results for &ldquo;{query}&rdquo;</> : 'No products found'}
        </p>
        <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
          Try a different search term or browse all products.
        </p>
      </div>
      <Link
        href="/products"
        className="inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary-600"
      >
        Browse products
      </Link>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="font-syne text-lg font-bold text-gray-900 dark:text-gray-100">Search is unavailable right now</p>
      <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">Please check your connection and try again.</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-[44px] rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary-600"
      >
        Try again
      </button>
    </div>
  )
}

function ResultsSkeleton() {
  return (
    <div aria-busy="true">
      <ProductGrid layout="listing">
        {Array.from({ length: 10 }).map((_, i) => (
          <ProductCardSkeleton key={i} showCta={false} />
        ))}
      </ProductGrid>
    </div>
  )
}

// ─── Inner page (needs useSearchParams) ───────────────────────────────────────

function SearchPageInner() {
  const router = useRouter()
  const { formatDisplayPrice } = useCurrency()
  const searchParams = useSearchParams()
  const rawQuery = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  // The page number lives in the URL, so a new query can never fetch a stale page.
  const currentPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { products, total, pageSize, loading, failed, retry } = useSearchResults(rawQuery, category, currentPage)

  const hasResults = products.length > 0

  const buildHref = useCallback(
    (q: string, cat: string, page: number) => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
      if (cat) params.set('category', cat)
      if (page > 1) params.set('page', String(page))
      const qs = params.toString()
      return qs ? `/search?${qs}` : '/search'
    },
    []
  )

  const handlePageChange = useCallback(
    (p: number) => {
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      if (p >= 1 && p <= totalPages) {
        router.push(buildHref(rawQuery, category, p))
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [total, pageSize, router, buildHref, rawQuery, category]
  )

  const toggleBase =
    'flex h-11 w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="mx-auto max-w-screen-xl px-3 py-3 sm:px-4 lg:px-6">
        <nav
          className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-semibold text-gray-600 dark:text-gray-400"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-primary-700">
            TradeHut
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <Link href="/products" className="hover:text-primary-700">
            Products
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden />
          <span className="text-gray-900 dark:text-gray-100">{rawQuery || category || 'All results'}</span>
        </nav>

        <div className="mb-3 flex items-center justify-between gap-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
            <p className="whitespace-nowrap text-xs font-semibold text-gray-600 dark:text-gray-400" aria-live="polite">
              {loading
                ? 'Searching…'
                : failed
                ? ''
                : hasResults
                ? `${total.toLocaleString()} results${rawQuery ? ` for "${rawQuery}"` : ''}${category ? ` in ${category}` : ''}`
                : 'No results found'}
            </p>
            <div className="flex shrink-0 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800" role="group" aria-label="Layout">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`${toggleBase} ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <LayoutGrid className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`${toggleBase} ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
                }`}
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <List className="h-5 w-5" aria-hidden />
              </button>
            </div>
        </div>

        {loading ? (
          <ResultsSkeleton />
        ) : failed ? (
          <ErrorState onRetry={retry} />
        ) : !hasResults ? (
          <EmptyState query={rawQuery} />
        ) : viewMode === 'grid' ? (
          <ProductGrid layout="listing" hasMeta={products.some((product) => productHasMeta(toCard(product)))}>
            {products.map((product, i) => (
              <ProductCard key={product.id} product={toCard(product)} formatPrice={formatDisplayPrice} priority={i < 4} />
            ))}
          </ProductGrid>
        ) : (
          <div className="flex flex-col gap-2">
            {products.map((product) => (
              <CommerceProductCard key={product.id} variant="list" product={toCard(product)} />
            ))}
          </div>
        )}

        {hasResults && !loading && !failed && (
          <Pagination
            current={currentPage}
            total={total}
            pageSize={pageSize}
            onChange={handlePageChange}
            className="mt-6 flex flex-col items-center gap-3"
            baseBtnClassName="flex h-11 min-w-[44px] items-center justify-center rounded-lg px-2 text-sm font-bold transition-colors"
            activeBtnClassName="bg-primary text-white"
            inactiveBtnClassName="border border-gray-200 bg-white text-gray-700 hover:border-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            navGapClassName="flex items-center gap-1"
            ellipsisClassName="px-2 text-gray-500"
            summaryClassName="text-xs font-semibold text-gray-600 dark:text-gray-400"
            summary={
              <>
                Showing {products.length} of {total.toLocaleString()} results
              </>
            }
          />
        )}
      </div>
    </div>
  )
}

// ─── Page export (Suspense required for useSearchParams in App Router) ─────────

export default function SearchPage() {
  return (
    <MainLayout>
      <Suspense
        fallback={
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-gray-400" aria-label="Loading" />
          </div>
        }
      >
        <SearchPageInner />
      </Suspense>
    </MainLayout>
  )
}
