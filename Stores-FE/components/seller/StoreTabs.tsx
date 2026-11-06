'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useSearchParams } from 'next/navigation'
import { StoreAbout, StorePolicies } from './StoreInfo'
import StoreProducts from './StoreProducts'
import StoreReviews from './StoreReviews'
import type { SellerPublic, StoreProduct, StoreTabKey } from './types'

interface StoreTabsProps {
    storeId: string
    seller: SellerPublic | null
    products: StoreProduct[]
    productsError: boolean
    reviewCount: number | null
}

const TAB_KEYS: StoreTabKey[] = ['products', 'about', 'reviews', 'policies']

function isTab(v: string | null): v is StoreTabKey {
    return v !== null && (TAB_KEYS as string[]).includes(v)
}

/** The nav is one sticky wrapper that is the sibling right before <main>; stick under it. */
function useNavOffset(): number {
    const [top, setTop] = useState(0)
    useEffect(() => {
        const nav = document.querySelector('main')?.previousElementSibling
        if (!(nav instanceof HTMLElement)) return
        const update = () => setTop(Math.round(nav.getBoundingClientRect().height))
        update()
        const ro = new ResizeObserver(update)
        ro.observe(nav)
        return () => ro.disconnect()
    }, [])
    return top
}

export default function StoreTabs({ storeId, seller, products, productsError, reviewCount }: StoreTabsProps) {
    const params = useSearchParams()
    const hasPolicies = Boolean(seller?.return_policy || seller?.shipping_policy)
    const top = useNavOffset()
    const tabRefs = useRef<Partial<Record<StoreTabKey, HTMLButtonElement | null>>>({})

    const tabs: Array<{ key: StoreTabKey; label: string }> = [
        { key: 'products', label: `Products (${products.length.toLocaleString()})` },
        { key: 'about', label: 'About' },
        {
            key: 'reviews',
            label: reviewCount && reviewCount > 0 ? `Reviews (${reviewCount.toLocaleString()})` : 'Reviews',
        },
        ...(hasPolicies ? [{ key: 'policies' as const, label: 'Policies' }] : []),
    ]

    const requested = params.get('tab')
    const active: StoreTabKey = isTab(requested) && tabs.some((t) => t.key === requested) ? requested : 'products'

    const select = useCallback((key: StoreTabKey) => {
        const url = new URL(window.location.href)
        if (key === 'products') url.searchParams.delete('tab')
        else url.searchParams.set('tab', key)
        window.history.pushState(null, '', url)
    }, [])

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let next = -1
        if (e.key === 'ArrowRight') next = (index + 1) % tabs.length
        else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
        else if (e.key === 'Home') next = 0
        else if (e.key === 'End') next = tabs.length - 1
        if (next < 0) return
        e.preventDefault()
        const key = tabs[next].key
        select(key)
        tabRefs.current[key]?.focus()
    }

    return (
        <>
            <div
                style={{ top }}
                className="sticky z-40 mt-3 border-y border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
            >
                <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 lg:px-6">
                    <div role="tablist" aria-label="Store sections" className="-mb-px flex overflow-x-auto no-scrollbar">
                        {tabs.map((t, i) => {
                            const selected = t.key === active
                            return (
                                <button
                                    key={t.key}
                                    ref={(el) => {
                                        tabRefs.current[t.key] = el
                                    }}
                                    type="button"
                                    role="tab"
                                    id={`store-tab-${t.key}`}
                                    aria-selected={selected}
                                    aria-controls={`store-panel-${t.key}`}
                                    tabIndex={selected ? 0 : -1}
                                    onClick={() => select(t.key)}
                                    onKeyDown={(e) => onKeyDown(e, i)}
                                    className={`h-11 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-700 ${
                                        selected
                                            ? 'border-primary-700 text-primary-700 dark:border-primary-300 dark:text-primary-300'
                                            : 'border-transparent text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-screen-2xl px-3 py-3 sm:px-4 lg:px-6">
                <div
                    role="tabpanel"
                    id="store-panel-products"
                    aria-labelledby="store-tab-products"
                    hidden={active !== 'products'}
                >
                    <StoreProducts
                        storeId={seller?.id ?? storeId}
                        storeName={seller?.business_name ?? null}
                        products={products}
                        productsError={productsError}
                    />
                </div>
                {active === 'about' ? (
                    <div role="tabpanel" id="store-panel-about" aria-labelledby="store-tab-about">
                        <StoreAbout seller={seller} productCount={products.length} />
                    </div>
                ) : null}
                {active === 'reviews' ? (
                    <div role="tabpanel" id="store-panel-reviews" aria-labelledby="store-tab-reviews">
                        <StoreReviews products={products} />
                    </div>
                ) : null}
                {active === 'policies' ? (
                    <div role="tabpanel" id="store-panel-policies" aria-labelledby="store-tab-policies">
                        <StorePolicies seller={seller} />
                    </div>
                ) : null}
            </div>
        </>
    )
}
