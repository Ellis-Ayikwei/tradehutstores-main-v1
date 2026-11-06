'use client'

/** /search - results from the search API (lib/searchClient.ts). */

import { useState, useCallback, useEffect, Suspense } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, SearchX, LayoutGrid, List, ChevronRight, Loader2, Package, Star } from 'lucide-react'
import MainLayout from '@/components/Layouts/MainLayout'
import Pagination from '@/components/common/Pagination'
import { ProductCard, ProductCardSkeleton, ProductGrid, productHasMeta } from '@/components/common/marketplace'
import type { MarketplaceProduct } from '@/components/common/marketplace'
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
}

function toProduct(p: SearchProduct): Product {
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
  }
}

function useSearchResults(q: string, page: number) {
  const { data, error, isLoading, mutate } = useSWR(
    ['search-page', q, page],
    () => searchProducts({ q, page }),
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

// ─── List row ─────────────────────────────────────────────────────────────────

function ListCard({ product }: { product: Product }) {
  const { formatDisplayPrice } = useCurrency()
  const href = `/products/${product.slug}`

  return (
    <article className="flex overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <Link href={href} className="relative aspect-square w-28 shrink-0 bg-gray-100 dark:bg-gray-800 sm:w-40">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 112px, 160px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <Package className="absolute inset-0 m-auto h-8 w-8 text-gray-400" aria-label={product.title} />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-2.5 sm:p-3">
        <div className="min-w-0">
          {product.brand ? (
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
              {product.brand}
            </p>
          ) : null}
          <Link href={href} className="hover:text-primary-700">
            <h2 className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-gray-100 sm:text-base">
              {product.title}
            </h2>
          </Link>
          {product.rating != null && product.rating > 0 ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden />
              <span className="font-semibold">{product.rating.toFixed(1)}</span>
              {product.ratingCount ? <span>({product.ratingCount})</span> : null}
            </p>
          ) : null}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {product.condition ? (
              <span className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {product.condition}
              </span>
            ) : null}
            {product.inStock != null ? (
              <span
                className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                  product.inStock
                    ? 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {product.inStock ? 'In stock' : 'Out of stock'}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0">
            <span className="font-mono text-lg font-bold tabular-nums text-gray-900 dark:text-gray-100">
              {product.price ? formatDisplayPrice(product.price) : '—'}
            </span>
            {product.originalPrice ? (
              <span className="ml-2 font-mono text-xs tabular-nums text-gray-500 line-through">
                {formatDisplayPrice(product.originalPrice)}
              </span>
            ) : null}
          </div>
          <Link
            href={href}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-bold text-white hover:bg-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            View item
          </Link>
        </div>
      </div>
    </article>
  )
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
          <ProductCardSkeleton key={i} />
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
  // The page number lives in the URL, so a new query can never fetch a stale page.
  const currentPage = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [queryInput, setQueryInput] = useState(rawQuery)

  // Sync query input when URL param changes
  useEffect(() => {
    setQueryInput(rawQuery)
  }, [rawQuery])

  const { products, total, pageSize, loading, failed, retry } = useSearchResults(rawQuery, currentPage)

  const hasResults = products.length > 0

  const buildHref = useCallback(
    (q: string, page: number) => {
      const params = new URLSearchParams()
      if (q) params.set('q', q)
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
        router.push(buildHref(rawQuery, p))
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [total, pageSize, router, buildHref, rawQuery]
  )

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(buildHref(queryInput.trim(), 1))
  }

  const toggleBase =
    'flex h-11 w-11 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <main className="mx-auto max-w-screen-xl px-3 py-3 sm:px-4 lg:px-6">
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
          <span className="text-gray-900 dark:text-gray-100">{rawQuery || 'All results'}</span>
        </nav>

        <form
          onSubmit={submitSearch}
          role="search"
          className="mb-3 flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between sm:p-3"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Search className="h-5 w-5 shrink-0 text-primary-700" aria-hidden />
            <input
              type="search"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search TradeHut marketplace..."
              className="min-h-[44px] min-w-0 flex-1 border-none bg-transparent text-base text-gray-900 placeholder:text-gray-500 focus:ring-0 dark:text-gray-100"
              aria-label="Search query"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="whitespace-nowrap text-xs font-semibold text-gray-600 dark:text-gray-400" aria-live="polite">
              {loading
                ? 'Searching…'
                : failed
                ? ''
                : hasResults
                ? `${total.toLocaleString()} results${rawQuery ? ` for "${rawQuery}"` : ''}`
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
        </form>

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
              <ListCard key={product.id} product={product} />
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
      </main>
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
