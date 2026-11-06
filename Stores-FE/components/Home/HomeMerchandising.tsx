'use client'

import { CardMetaProvider, productHasMeta } from '@/components/common/marketplace'
import HomeProductCard, { HomeProductCardSkeleton, toMarketplaceProduct } from './HomeProductCard'
import { HIDE_SCROLLBAR, HOME_CONTAINER, SectionEmpty, SectionError, SectionHeader } from './HomeSection'
import { normalizeProducts } from './homeProduct'
import { useHomeSections } from './useHomeSections'

export type { HomepageMerchSection } from './useHomeSections'

/**
 * Admin-managed product rows (`homepage/sections/`).
 * `flash_sale` is rendered by <FlashDeals/> and `banner` by the hero carousel,
 * so they are skipped here.
 */
export default function HomeMerchandising() {
    const { sections, loading, error, retry } = useHomeSections()

    if (loading) {
        return (
            <section aria-label="Featured collections" className={`${HOME_CONTAINER} mt-6`}>
                <div className="mb-3 h-6 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={i > 1 ? 'hidden sm:block' : ''}>
                            <HomeProductCardSkeleton />
                        </div>
                    ))}
                </div>
            </section>
        )
    }

    if (error && sections.length === 0) {
        return (
            <section aria-label="Featured collections" className={`${HOME_CONTAINER} mt-6`}>
                <SectionError message="Featured collections could not be loaded." onRetry={retry} />
            </section>
        )
    }

    const rows = sections.filter((s) => s.section_type !== 'flash_sale' && s.section_type !== 'banner')
    if (rows.length === 0) return null

    return (
        <>
            {rows.map((section) => {
                const products = normalizeProducts(section.products)
                const asGrid = section.section_type === 'grid'
                const hasMeta = products.some((p) => productHasMeta(toMarketplaceProduct(p)))

                return (
                    <section key={section.id} aria-label={section.title} className={`${HOME_CONTAINER} mt-6`}>
                        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800 sm:p-4">
                            <SectionHeader
                                title={section.title}
                                subtitle={section.subtitle}
                                href="/products"
                            />
                            {products.length === 0 ? (
                                <SectionEmpty message="No products in this collection yet." href="/products" cta="Browse all products" />
                            ) : asGrid ? (
                                <CardMetaProvider reserve={hasMeta}>
                                    <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                                        {products.map((p) => (
                                            <HomeProductCard key={p.id} product={p} />
                                        ))}
                                    </div>
                                </CardMetaProvider>
                            ) : (
                                <CardMetaProvider reserve={hasMeta}>
                                    <ul
                                        className={`-mx-3 flex snap-x snap-mandatory items-stretch gap-2 overflow-x-auto px-3 pb-1 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 ${HIDE_SCROLLBAR}`}
                                    >
                                        {products.slice(0, Math.max(section.max_products || 12, 6)).map((p) => (
                                            <li key={p.id} className="w-40 shrink-0 snap-start sm:w-44 lg:w-48">
                                                <HomeProductCard
                                                    product={p}
                                                    sizes="(min-width: 1024px) 192px, (min-width: 640px) 176px, 160px"
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                </CardMetaProvider>
                            )}
                        </div>
                    </section>
                )
            })}
        </>
    )
}
