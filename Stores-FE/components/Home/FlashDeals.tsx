'use client'

import Link from 'next/link'
import { Zap } from 'lucide-react'
import { CardMetaProvider, productHasMeta } from '@/components/common/marketplace'
import { FlashSaleCard, FlashSaleCardSkeleton } from '@/components/ProductCards/FlashSaleCards'
import { toMarketplaceProduct } from './HomeProductCard'
import HomeCountdown from './HomeCountdown'
import { HIDE_SCROLLBAR, HOME_CONTAINER, SectionError } from './HomeSection'
import { normalizeProducts } from './homeProduct'
import { useHomeSections } from './useHomeSections'

/**
 * Flash-deal strip. Uses the first live `flash_sale` homepage section.
 * Hidden when there is no such section (nothing to sell, nothing to show).
 */
export default function FlashDeals() {
    const { sections, loading, error, retry } = useHomeSections()
    const flash = sections.find((s) => s.section_type === 'flash_sale')
    const products = flash ? normalizeProducts(flash.products) : []

    if (loading) {
        return (
            <section aria-label="Flash deals" className={`${HOME_CONTAINER} mt-4`}>
                <div className="overflow-hidden rounded-2xl bg-red-700 p-3 sm:p-4">
                    <div className="mb-3 h-7 w-48 animate-pulse rounded bg-red-500" />
                    <div className="-mx-3 flex gap-2 overflow-hidden px-3 sm:mx-0 sm:px-0">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="w-40 shrink-0 sm:w-44 lg:w-48">
                                <FlashSaleCardSkeleton />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        )
    }

    if (error && !flash) {
        return (
            <section aria-label="Flash deals" className={`${HOME_CONTAINER} mt-4`}>
                <SectionError message="Flash deals could not be loaded." onRetry={retry} />
            </section>
        )
    }

    if (!flash || products.length === 0) return null

    return (
        <section aria-label="Flash deals" className={`${HOME_CONTAINER} mt-4`}>
            <div className="overflow-hidden rounded-2xl bg-red-700 p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <Zap className="h-5 w-5 shrink-0 fill-yellow-300 text-yellow-300" aria-hidden />
                        <h2 className="truncate font-syne text-lg font-bold text-white sm:text-xl">
                            {flash.title || 'Flash deals'}
                        </h2>
                        {flash.show_countdown && flash.ends_at ? (
                            <div className="ml-1">
                                <HomeCountdown endsAt={flash.ends_at} tone="dark" />
                            </div>
                        ) : null}
                    </div>
                    <Link
                        href="/deals"
                        className="inline-flex min-h-[44px] items-center text-sm font-semibold text-white underline-offset-2 hover:underline"
                    >
                        See all deals
                    </Link>
                </div>
                <CardMetaProvider reserve={products.some((p) => productHasMeta(toMarketplaceProduct(p)))}>
                    <ul
                        className={`-mx-3 flex snap-x snap-mandatory items-stretch gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 ${HIDE_SCROLLBAR}`}
                    >
                        {products.map((p) => (
                            <li key={p.id} className="w-40 shrink-0 snap-start sm:w-44 lg:w-48">
                                <FlashSaleCard product={p} />
                            </li>
                        ))}
                    </ul>
                </CardMetaProvider>
            </div>
        </section>
    )
}
