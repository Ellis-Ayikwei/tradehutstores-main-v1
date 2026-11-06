'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { AlertTriangle, BadgeCheck, MessageSquareText, RefreshCw } from 'lucide-react'
import { RatingStars } from '@/components/common/marketplace'
import fetcher from '@/lib/fetcher'
import { mapReviewFromApi, type MappedReview } from '@/lib/reviewUtils'
import type { StoreProduct } from './types'

const PAGE_SIZE = 10

interface StoreReviewsProps {
    products: StoreProduct[]
}

function formatDate(iso: string | undefined): string {
    if (!iso) return ''
    const d = new Date(iso)
    return Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Reviews for this seller's products. The reviews API only filters by a single
 * `product`, so we load the list and keep reviews whose product belongs to this store.
 */
export default function StoreReviews({ products }: StoreReviewsProps) {
    const [visible, setVisible] = useState(PAGE_SIZE)
    const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

    const { data, error, isLoading, mutate } = useSWR<unknown>(products.length > 0 ? 'reviews/' : null, fetcher, {
        revalidateOnFocus: false,
    })

    const reviews = useMemo<MappedReview[]>(() => {
        if (!data) return []
        const raw: unknown[] = Array.isArray(data)
            ? data
            : Array.isArray((data as { results?: unknown[] }).results)
              ? ((data as { results: unknown[] }).results)
              : []
        return raw
            .filter((r) => productById.has(String((r as { product?: unknown }).product)))
            .map(mapReviewFromApi)
    }, [data, productById])

    const summary = useMemo(() => {
        if (reviews.length === 0) return null
        const total = reviews.reduce((sum, r) => sum + (Number.isFinite(r.rating) ? r.rating : 0), 0)
        return { avg: total / reviews.length, count: reviews.length }
    }, [reviews])

    if (products.length === 0) {
        return <Empty title="No reviews yet" hint="Reviews appear here once buyers rate this store's products." />
    }

    if (isLoading) {
        return (
            <div className="space-y-3" aria-busy="true" aria-label="Loading reviews">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="animate-pulse space-y-2 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                        <div className="h-3.5 w-24 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="h-3.5 w-11/12 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
                    </div>
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div role="alert" className="flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-8 text-center dark:border-red-900 dark:bg-gray-900">
                <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
                <p className="text-sm font-semibold text-gray-900 dark:text-white">We couldn&apos;t load reviews right now.</p>
                <button
                    type="button"
                    onClick={() => mutate()}
                    className="mt-1 inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 sm:h-10"
                >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Try again
                </button>
            </div>
        )
    }

    if (!summary) {
        return <Empty title="No reviews yet" hint="Reviews appear here once buyers rate this store's products." />
    }

    const shown = reviews.slice(0, visible)

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.avg.toFixed(1)}</p>
                <div>
                    <RatingStars rating={summary.avg} size="md" />
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        {summary.count.toLocaleString()} review{summary.count === 1 ? '' : 's'} on this store&apos;s products
                    </p>
                </div>
            </div>

            <ul className="space-y-2">
                {shown.map((r) => {
                    const product = productById.get(String(r.product))
                    return (
                        <li key={r.id} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <RatingStars rating={r.rating} />
                                {r.verified ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                                        <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                        Verified purchase
                                    </span>
                                ) : null}
                            </div>
                            {r.comment ? (
                                <p className="mt-1.5 whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">{r.comment}</p>
                            ) : null}
                            <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-400">
                                {r.user.username}
                                {formatDate(r.created_at) ? ` · ${formatDate(r.created_at)}` : ''}
                                {product ? (
                                    <>
                                        {' · on '}
                                        <Link href={`/products/${product.id}`} className="font-medium text-primary-700 hover:underline dark:text-primary-300">
                                            {product.name}
                                        </Link>
                                    </>
                                ) : null}
                            </p>
                        </li>
                    )
                })}
            </ul>

            {reviews.length > shown.length ? (
                <div className="flex justify-center">
                    <button
                        type="button"
                        onClick={() => setVisible((v) => v + PAGE_SIZE)}
                        className="inline-flex h-11 w-full max-w-xs items-center justify-center rounded-lg border border-primary-700 bg-white px-4 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 dark:bg-gray-900 dark:text-primary-300 dark:hover:bg-gray-800"
                    >
                        Show more reviews
                    </button>
                </div>
            ) : null}
        </div>
    )
}

function Empty({ title, hint }: { title: string; hint: string }) {
    return (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
            <MessageSquareText className="h-8 w-8 text-gray-500" aria-hidden="true" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{hint}</p>
        </div>
    )
}
