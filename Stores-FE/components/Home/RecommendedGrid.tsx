'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { fetchFeaturedProducts, fetchNewArrivals, fetchPopularProducts } from '@/store/productSlice'
import { CardMetaProvider, productHasMeta } from '@/components/common/marketplace'
import HomeProductCard, { HomeProductCardSkeleton, toMarketplaceProduct } from './HomeProductCard'
import { HOME_CONTAINER, SectionEmpty, SectionError, SectionHeader } from './HomeSection'
import { normalizeProducts } from './homeProduct'

type TabKey = 'foryou' | 'popular' | 'new'

const TABS: { key: TabKey; label: string }[] = [
    { key: 'foryou', label: 'Recommended for you' },
    { key: 'popular', label: 'Trending' },
    { key: 'new', label: 'New arrivals' },
]

const GRID = 'grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
const PAGE_SIZE = 18

/** Personalised grid backed by the existing product slice (featured / popular / new arrivals). */
export default function RecommendedGrid() {
    const dispatch = useDispatch<AppDispatch>()
    const { featuredProducts, popularProducts, newArrivals } = useSelector((state: RootState) => state.products)
    const [tab, setTab] = useState<TabKey>('foryou')
    const [loading, setLoading] = useState(true)
    const [failed, setFailed] = useState<Record<TabKey, boolean>>({ foryou: false, popular: false, new: false })
    const [visible, setVisible] = useState(PAGE_SIZE)

    const load = useCallback(async () => {
        setLoading(true)
        const results = await Promise.allSettled([
            dispatch(fetchFeaturedProducts()).unwrap(),
            dispatch(fetchPopularProducts()).unwrap(),
            dispatch(fetchNewArrivals()).unwrap(),
        ])
        setFailed({
            foryou: results[0].status === 'rejected',
            popular: results[1].status === 'rejected',
            new: results[2].status === 'rejected',
        })
        setLoading(false)
    }, [dispatch])

    useEffect(() => {
        void load()
    }, [load])

    const source = tab === 'foryou' ? featuredProducts : tab === 'popular' ? popularProducts : newArrivals
    const products = normalizeProducts(source)
    const shown = products.slice(0, visible)

    return (
        <section aria-label="Recommended products" className={`${HOME_CONTAINER} mt-6`}>
            <SectionHeader title="Picked for you" href="/products" linkLabel="Browse all" />

            <div
                role="tablist"
                aria-label="Product lists"
                className="-mx-3 mb-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        role="tab"
                        type="button"
                        aria-selected={tab === t.key}
                        onClick={() => {
                            setTab(t.key)
                            setVisible(PAGE_SIZE)
                        }}
                        className={`min-h-[44px] shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${
                            tab === t.key
                                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                                : 'bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50 dark:bg-neutral-900 dark:text-neutral-200 dark:ring-neutral-700'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading && products.length === 0 ? (
                <div className={GRID}>
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className={i >= 4 ? 'hidden sm:block' : ''}>
                            <HomeProductCardSkeleton />
                        </div>
                    ))}
                </div>
            ) : products.length === 0 && failed[tab] ? (
                <SectionError message="We could not load products right now." onRetry={() => void load()} />
            ) : products.length === 0 ? (
                <SectionEmpty message="No products to show yet. Check back soon." href="/products" cta="Browse all products" />
            ) : (
                <>
                    <CardMetaProvider reserve={shown.some((p) => productHasMeta(toMarketplaceProduct(p)))}>
                        <div className={`${GRID} items-stretch`}>
                            {shown.map((p) => (
                                <HomeProductCard
                                    key={p.id}
                                    product={p}
                                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 17vw"
                                />
                            ))}
                        </div>
                    </CardMetaProvider>
                    {products.length > shown.length ? (
                        <div className="mt-4 flex justify-center">
                            <button
                                type="button"
                                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                                className="min-h-[44px] rounded-full border border-neutral-300 bg-white px-8 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                            >
                                Show more
                            </button>
                        </div>
                    ) : null}
                </>
            )}
        </section>
    )
}
