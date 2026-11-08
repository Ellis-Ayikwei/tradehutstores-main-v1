'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard, { type MarketplaceProduct } from './ProductCard'
import ProductCardSkeleton from './ProductCardSkeleton'
import { cx } from './cx'

export interface ProductRailProps {
    title: string
    items: MarketplaceProduct[]
    /** Pass CurrencyContext `formatDisplayPrice`. */
    formatPrice?: (amount: number) => string
    /** Right-aligned text link in the header, e.g. "See more in Shoes". */
    seeAllHref?: string
    seeAllLabel?: string
    /** Render fixed-size skeleton cards instead of items while the data loads. */
    loading?: boolean
    /** Show the failure line instead of the rail. */
    error?: boolean
    className?: string
}

const ITEM = 'w-40 shrink-0 snap-start sm:w-44 lg:w-48'

const ARROW =
    'absolute top-[88px] z-10 hidden h-12 w-9 items-center justify-center border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:hidden dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-primary-400 md:flex'

/**
 * One horizontal scroll-snap rail of grid product cards (Amazon "Customers also viewed" style).
 * Touch scrolls natively; from md up, square arrow buttons page through the cards.
 * Renders nothing when there are no items (and it is not loading), so empty rails never take space.
 */
export default function ProductRail({
    title,
    items,
    formatPrice,
    seeAllHref,
    seeAllLabel,
    loading = false,
    error = false,
    className,
}: ProductRailProps) {
    const scroller = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState({ page: 1, pages: 1, atStart: true, atEnd: true })

    const measure = useCallback(() => {
        const el = scroller.current
        if (!el) return
        const view = el.clientWidth
        const pages = view > 0 ? Math.max(1, Math.ceil((el.scrollWidth - 8) / view)) : 1
        const page = view > 0 ? Math.min(pages, Math.round(el.scrollLeft / view) + 1) : 1
        setPos({
            page,
            pages,
            atStart: el.scrollLeft <= 2,
            atEnd: el.scrollLeft + view >= el.scrollWidth - 2,
        })
    }, [])

    useEffect(() => {
        measure()
        window.addEventListener('resize', measure)
        return () => window.removeEventListener('resize', measure)
    }, [measure, items.length, loading])

    const page = (dir: 1 | -1) => {
        const el = scroller.current
        if (!el) return
        el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' })
    }

    if (!loading && !error && items.length === 0) return null

    const headingId = `rail-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

    return (
        <section aria-labelledby={headingId} className={cx('border-t border-zinc-200 pt-3 dark:border-zinc-800', className)}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
                <h2 id={headingId} className="text-lg font-bold text-zinc-900 dark:text-zinc-100 lg:text-xl">
                    {title}
                </h2>
                <div className="flex shrink-0 items-baseline gap-3 text-sm">
                    {!loading && !error && pos.pages > 1 ? (
                        <span className="hidden text-zinc-600 dark:text-zinc-400 md:inline">
                            Page {pos.page} of {pos.pages}
                        </span>
                    ) : null}
                    {seeAllHref ? (
                        <Link href={seeAllHref} className="text-primary-700 hover:underline dark:text-primary-400">
                            {seeAllLabel ?? 'See all'}
                        </Link>
                    ) : null}
                </div>
            </div>

            {error ? (
                <p className="py-4 text-sm text-zinc-600 dark:text-zinc-400">These products could not be loaded.</p>
            ) : (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => page(-1)}
                        disabled={pos.atStart}
                        aria-label={`Previous ${title}`}
                        className={cx(ARROW, 'left-0 rounded-r-md border-l-0')}
                    >
                        <ChevronLeft className="h-5 w-5" aria-hidden />
                    </button>
                    <div
                        ref={scroller}
                        onScroll={measure}
                        tabIndex={0}
                        role="region"
                        aria-label={title}
                        className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:thin] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 sm:gap-3 [&::-webkit-scrollbar]:h-1.5"
                    >
                        {loading
                            ? Array.from({ length: 6 }, (_, i) => (
                                  <div key={i} className={ITEM}>
                                      <ProductCardSkeleton compact />
                                  </div>
                              ))
                            : items.map(p => (
                                  <div key={p.id} className={ITEM}>
                                      <ProductCard
                                          product={p}
                                          formatPrice={formatPrice}
                                          compact
                                          sizes="(min-width: 1024px) 192px, (min-width: 640px) 176px, 160px"
                                      />
                                  </div>
                              ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => page(1)}
                        disabled={pos.atEnd}
                        aria-label={`Next ${title}`}
                        className={cx(ARROW, 'right-0 rounded-l-md border-r-0')}
                    >
                        <ChevronRight className="h-5 w-5" aria-hidden />
                    </button>
                </div>
            )}
        </section>
    )
}
