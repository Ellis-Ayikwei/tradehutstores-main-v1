'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { ChevronLeft, ChevronRight, RefreshCw, Search, X } from 'lucide-react'
import { ORDER_LIST_KEY, STATUS_TABS, fetchSellerOrders, tabFromParam, type OrderApiError, type Paginated, type SellerOrderListRow } from '@/lib/seller/orders'
import { OrderDetailPanel } from './OrderDetailPanel'
import { BTN_SECONDARY, FulfilmentBadge, INPUT, Notice, OrderThumb, PaymentBadge, PaymentDue, formatDate, formatMoney, itemSummary, shortId } from './orderUi'

const PAGE_SIZE = 25
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, keepPreviousData: true } as const

function ListSkeleton() {
    return (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800" aria-busy="true" aria-label="Loading orders">
            {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 p-3">
                    <div className="h-12 w-12 shrink-0 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                    <div className="h-4 w-16 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                </li>
            ))}
        </ul>
    )
}

function ItemText({ order }: { order: SellerOrderListRow }) {
    const { title, extra } = itemSummary(order)
    return (
        <>
            {title}
            {extra ? <span className="ml-1 text-zinc-500 dark:text-zinc-400">{extra}</span> : null}
        </>
    )
}

export default function OrdersView() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    const tab = tabFromParam(searchParams.get('status'))
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const q = searchParams.get('q') ?? ''
    const orderId = searchParams.get('id')

    const update = useCallback(
        (patch: Record<string, string | null>, push = false) => {
            const next = new URLSearchParams(searchParams.toString())
            for (const [key, value] of Object.entries(patch)) {
                if (value === null || value === '') next.delete(key)
                else next.set(key, value)
            }
            const qs = next.toString()
            const href = qs ? `${pathname}?${qs}` : pathname
            if (push) router.push(href, { scroll: false })
            else router.replace(href, { scroll: false })
        },
        [pathname, router, searchParams]
    )

    const [draft, setDraft] = useState(q)
    useEffect(() => {
        setDraft((current) => (current.trim() === q ? current : q))
    }, [q])
    useEffect(() => {
        const next = draft.trim()
        if (next === q) return
        const timer = window.setTimeout(() => update({ q: next || null, page: null }), 400)
        return () => window.clearTimeout(timer)
    }, [draft, q, update])

    const { data, error, isLoading, isValidating, mutate } = useSWR<Paginated<SellerOrderListRow>, OrderApiError>(
        [ORDER_LIST_KEY, page, PAGE_SIZE, tab.status, q],
        () => fetchSellerOrders({ page, pageSize: PAGE_SIZE, status: tab.status, q }),
        SWR_OPTIONS
    )

    const openOrder = useCallback((id: string) => update({ id }, true), [update])
    const closeOrder = useCallback(() => update({ id: null }), [update])

    const rows = data?.results ?? []
    const total = data?.count ?? 0
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
    const to = Math.min(total, page * PAGE_SIZE)

    const submitSearch = (e: FormEvent) => {
        e.preventDefault()
        update({ q: draft.trim() || null, page: null })
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Orders</h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Orders to fulfil and track</p>
                </div>
                <button type="button" className={BTN_SECONDARY} onClick={() => void mutate()} disabled={isValidating}>
                    <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} aria-hidden="true" />
                    Refresh
                </button>
            </div>

            <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div role="tablist" aria-label="Order status" className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
                    {STATUS_TABS.map((t) => {
                        const selected = t.value === tab.value
                        return (
                            <button
                                key={t.value}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => update({ status: t.value === 'all' ? null : t.value, page: null, id: null })}
                                className={`min-h-[44px] shrink-0 border-b-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600 sm:px-4 ${
                                    selected
                                        ? 'border-primary-700 text-primary-700 dark:border-primary-400 dark:text-primary-400'
                                        : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                                }`}
                            >
                                {t.label}
                            </button>
                        )
                    })}
                </div>

                <form onSubmit={submitSearch} role="search" className="flex gap-2 border-b border-zinc-200 p-3 dark:border-zinc-800">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                        <input
                            type="search"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Search by order ID, item or buyer"
                            aria-label="Search orders"
                            className={`${INPUT} pl-9 pr-11`}
                        />
                        {draft ? (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => {
                                    setDraft('')
                                    update({ q: null, page: null })
                                }}
                                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        ) : null}
                    </div>
                    <button type="submit" className={BTN_SECONDARY}>
                        Search
                    </button>
                </form>

                {isLoading && !data ? (
                    <ListSkeleton />
                ) : error && !data ? (
                    <div className="p-3">
                        <Notice title="Couldn't load your orders" message={error.message} onRetry={() => void mutate()} retrying={isValidating} />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                        {q ? (
                            <>
                                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">No orders match &ldquo;{q}&rdquo;</p>
                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Check the spelling or clear the search.</p>
                            </>
                        ) : tab.value === 'all' ? (
                            <>
                                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">No orders yet</p>
                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Orders from buyers show up here, ready to ship.</p>
                            </>
                        ) : (
                            <>
                                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">No {tab.label.toLowerCase()} orders</p>
                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Orders with this status will appear here.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {error ? (
                            <div className="p-3">
                                <Notice title="Couldn't refresh your orders" message={error.message} onRetry={() => void mutate()} retrying={isValidating} />
                            </div>
                        ) : null}

                        {/* Cards under md */}
                        <ul className="divide-y divide-zinc-200 md:hidden dark:divide-zinc-800">
                            {rows.map((order) => (
                                <li key={order.id}>
                                    <button
                                        type="button"
                                        onClick={() => openOrder(order.id)}
                                        className="flex min-h-[44px] w-full items-start gap-3 p-3 text-left hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600 dark:hover:bg-zinc-800"
                                    >
                                        <OrderThumb image={order.first_item?.image} />
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">#{shortId(order.id)}</p>
                                                <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{formatMoney(order.total_amount, order.currency)}</span>
                                            </div>
                                            <p className="truncate text-sm text-zinc-900 dark:text-zinc-100">
                                                <ItemText order={order} />
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                {formatDate(order.placed_at)}
                                                {order.buyer_name ? ` · ${order.buyer_name}` : ''}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                <FulfilmentBadge status={order.order_status} />
                                                <PaymentBadge order={order} />
                                            </div>
                                            <PaymentDue order={order} className="block" />
                                        </div>
                                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {/* Table from md */}
                        <div className="hidden md:block">
                            <table className="w-full table-fixed border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                                        <th scope="col" className="w-36 px-3 py-2 font-medium">
                                            Order
                                        </th>
                                        <th scope="col" className="px-3 py-2 font-medium">
                                            Items
                                        </th>
                                        <th scope="col" className="w-28 px-3 py-2 text-right font-medium">
                                            Total
                                        </th>
                                        <th scope="col" className="w-48 px-3 py-2 font-medium">
                                            Payment
                                        </th>
                                        <th scope="col" className="w-36 px-3 py-2 font-medium">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {rows.map((order) => (
                                        <tr
                                            key={order.id}
                                            onClick={() => openOrder(order.id)}
                                            className={`cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 ${order.id === orderId ? 'bg-zinc-50 dark:bg-zinc-800' : ''}`}
                                        >
                                            <td className="px-3 py-2 align-top">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        openOrder(order.id)
                                                    }}
                                                    className="min-h-[44px] text-left font-bold text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 dark:text-primary-400"
                                                    aria-label={`Open order ${shortId(order.id)}`}
                                                >
                                                    #{shortId(order.id)}
                                                </button>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{formatDate(order.placed_at)}</p>
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <div className="flex items-center gap-3">
                                                    <OrderThumb image={order.first_item?.image} />
                                                    <div className="min-w-0">
                                                        <p className="truncate text-zinc-900 dark:text-zinc-100">
                                                            <ItemText order={order} />
                                                        </p>
                                                        {order.buyer_name ? <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{order.buyer_name}</p> : null}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right align-top font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{formatMoney(order.total_amount, order.currency)}</td>
                                            <td className="px-3 py-2 align-top">
                                                <div className="flex flex-col items-start gap-0.5">
                                                    <PaymentBadge order={order} />
                                                    <PaymentDue order={order} />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <FulfilmentBadge status={order.order_status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <nav aria-label="Pagination" className="flex items-center justify-between gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                {from}-{to} of {total}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className={BTN_SECONDARY}
                                    disabled={page <= 1}
                                    onClick={() => update({ page: page - 1 <= 1 ? null : String(page - 1) })}
                                    aria-label="Previous page"
                                >
                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                    <span className="hidden sm:inline">Previous</span>
                                </button>
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {page} / {pageCount}
                                </span>
                                <button
                                    type="button"
                                    className={BTN_SECONDARY}
                                    disabled={page >= pageCount}
                                    onClick={() => update({ page: String(page + 1) })}
                                    aria-label="Next page"
                                >
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        </nav>
                    </>
                )}
            </div>

            <OrderDetailPanel orderId={orderId} onClose={closeOrder} />
        </div>
    )
}
