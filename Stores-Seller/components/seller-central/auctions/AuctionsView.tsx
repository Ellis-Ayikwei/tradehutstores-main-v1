'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Search, X } from 'lucide-react'
import { EmptyPanel, ErrorPanel, PageHeader, Skeleton, btnPrimary, btnSecondary, inputClass } from '@/components/seller-central/ui'
import { AUCTION_LIST_KEY, AUCTION_TABS, auctionTabFromParam, fetchSellerAuctions, type AuctionApiError, type SellerAuctionRow } from '@/lib/seller/auctions'
import { formatMoney } from '@/lib/seller/listings'
import type { Paginated } from '@/lib/seller/orders'
import { useSellerProfile } from '@/hooks/useSellerProfile'
import { AuctionStatusBadge, AuctionThumb, NEW_AUCTION_HREF, ResultBadge, SettlementBadges, VerificationNotice, auctionHref, formatDateTime, formatRelative, orderHref, useNow } from './auctionUi'

const PAGE_SIZE = 20
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: true, keepPreviousData: true, refreshInterval: 15_000, refreshWhenHidden: false } as const

function ListSkeleton() {
    return (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800" aria-busy="true" aria-label="Loading auctions">
            {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-12 w-12 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                </li>
            ))}
        </ul>
    )
}

/** Time cell: when it starts, ends or ended, in relative terms with the exact time on hover. */
function TimeText({ row, nowMs }: { row: SellerAuctionRow; nowMs: number }) {
    if (row.display_status === 'cancelled') return <span className="text-zinc-600 dark:text-zinc-400">Cancelled</span>
    if (row.display_status === 'scheduled') {
        return (
            <span title={formatDateTime(row.starts_at)}>
                Starts <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatRelative(row.starts_at, nowMs)}</span>
            </span>
        )
    }
    return (
        <span title={formatDateTime(row.ends_at)}>
            {row.display_status === 'ended' ? 'Ended ' : 'Ends '}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{formatRelative(row.ends_at, nowMs)}</span>
        </span>
    )
}

function PriceText({ row }: { row: SellerAuctionRow }) {
    const hasBids = row.bid_count > 0 && row.current_price !== null
    return (
        <>
            <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{formatMoney(hasBids ? row.current_price : row.starting_price, row.currency)}</span>
            {!hasBids ? <span className="ml-1 text-xs text-zinc-600 dark:text-zinc-400">start</span> : null}
        </>
    )
}

function Outcome({ row }: { row: SellerAuctionRow }) {
    if (row.display_status !== 'ended' || !row.result) return <span className="text-zinc-500 dark:text-zinc-400">-</span>
    return (
        <div className="space-y-1">
            <ResultBadge result={row.result} />
            {row.winner_display ? <p className="text-xs text-zinc-600 dark:text-zinc-400">Winner: {row.winner_display}</p> : null}
            <SettlementBadges orderId={row.order_id} orderStatus={row.order_status} paymentStatus={row.payment_status} settlement={row.settlement_status} />
            {row.order_id ? (
                <Link href={orderHref(row.order_id)} className="block text-xs font-semibold text-primary-700 hover:underline dark:text-primary-400">
                    View order
                </Link>
            ) : null}
        </div>
    )
}

export default function AuctionsView() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { profile } = useSellerProfile()
    const canCreate = profile?.verification_status === 'verified'
    const showVerificationNotice = profile !== null && !canCreate
    const nowMs = useNow(30_000)

    const tab = auctionTabFromParam(searchParams.get('status'))
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const q = searchParams.get('q') ?? ''

    const update = useCallback(
        (patch: Record<string, string | null>) => {
            const next = new URLSearchParams(searchParams.toString())
            for (const [key, value] of Object.entries(patch)) {
                if (value === null || value === '') next.delete(key)
                else next.set(key, value)
            }
            const qs = next.toString()
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
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

    const { data, error, isLoading, isValidating, mutate } = useSWR<Paginated<SellerAuctionRow>, AuctionApiError>(
        [AUCTION_LIST_KEY, page, PAGE_SIZE, tab.status, q],
        () => fetchSellerAuctions({ page, pageSize: PAGE_SIZE, status: tab.status, q }),
        SWR_OPTIONS
    )

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
            <PageHeader
                title="Auctions"
                description="Run timed auctions on your listings and follow the bids"
                actions={
                    <>
                        <button type="button" className={btnSecondary} onClick={() => void mutate()} disabled={isValidating}>
                            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} aria-hidden="true" />
                            Refresh
                        </button>
                        {canCreate ? (
                            <Link href={NEW_AUCTION_HREF} className={btnPrimary}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Create auction
                            </Link>
                        ) : (
                            <button type="button" className={btnPrimary} disabled>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                Create auction
                            </button>
                        )}
                    </>
                }
            />

            {showVerificationNotice ? <VerificationNotice /> : null}

            <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div role="tablist" aria-label="Auction status" className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
                    {AUCTION_TABS.map((t) => {
                        const selected = t.value === tab.value
                        return (
                            <button
                                key={t.value}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => update({ status: t.value === 'all' ? null : t.value, page: null })}
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
                            placeholder="Search by title or product"
                            aria-label="Search auctions"
                            className={`${inputClass} pl-9 pr-11`}
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
                    <button type="submit" className={btnSecondary}>
                        Search
                    </button>
                </form>

                {isLoading && !data ? (
                    <ListSkeleton />
                ) : error && !data ? (
                    <div className="p-3">
                        <ErrorPanel title="Couldn't load your auctions" message={error.message} onRetry={() => void mutate()} retrying={isValidating} />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-3">
                        {q ? (
                            <EmptyPanel title={`No auctions match "${q}"`} description="Check the spelling or clear the search." />
                        ) : tab.value === 'all' ? (
                            <EmptyPanel
                                title="No auctions yet"
                                description="Pick one of your listings and set a starting price to run your first auction."
                                action={
                                    canCreate ? (
                                        <Link href={NEW_AUCTION_HREF} className={btnPrimary}>
                                            Create auction
                                        </Link>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <EmptyPanel title={`No ${tab.label.toLowerCase()} auctions`} description="Auctions with this status will appear here." />
                        )}
                    </div>
                ) : (
                    <>
                        {error ? (
                            <div className="p-3">
                                <ErrorPanel title="Couldn't refresh your auctions" message={error.message} onRetry={() => void mutate()} retrying={isValidating} />
                            </div>
                        ) : null}

                        {/* Cards below lg */}
                        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 lg:hidden">
                            {rows.map((row) => (
                                <li key={row.id}>
                                    <Link
                                        href={auctionHref(row.id)}
                                        className="flex min-h-[44px] items-start gap-3 p-3 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600 dark:hover:bg-zinc-800"
                                    >
                                        <AuctionThumb image={row.image} className="h-14 w-14" />
                                        <div className="min-w-0 flex-1 space-y-1">
                                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{row.title}</p>
                                            <p className="text-sm">
                                                <PriceText row={row} />
                                                <span className="ml-2 text-xs text-zinc-600 dark:text-zinc-400">
                                                    {row.bid_count} {row.bid_count === 1 ? 'bid' : 'bids'}
                                                </span>
                                            </p>
                                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                                <TimeText row={row} nowMs={nowMs} />
                                            </p>
                                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                                <AuctionStatusBadge displayStatus={row.display_status} status={row.status} />
                                                {row.display_status === 'ended' ? <ResultBadge result={row.result} /> : null}
                                                {row.display_status === 'ended' ? (
                                                    <SettlementBadges orderId={row.order_id} orderStatus={row.order_status} paymentStatus={row.payment_status} settlement={row.settlement_status} />
                                                ) : null}
                                            </div>
                                        </div>
                                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                                    </Link>
                                </li>
                            ))}
                        </ul>

                        {/* Table from lg */}
                        <div className="hidden lg:block">
                            <table className="w-full table-fixed border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                                        <th scope="col" className="px-3 py-2 font-medium">
                                            Auction
                                        </th>
                                        <th scope="col" className="w-36 px-3 py-2 text-right font-medium">
                                            Current price
                                        </th>
                                        <th scope="col" className="w-16 px-3 py-2 text-right font-medium">
                                            Bids
                                        </th>
                                        <th scope="col" className="w-40 px-3 py-2 font-medium">
                                            Ends
                                        </th>
                                        <th scope="col" className="w-32 px-3 py-2 font-medium">
                                            Status
                                        </th>
                                        <th scope="col" className="w-52 px-3 py-2 font-medium">
                                            Result
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {rows.map((row) => (
                                        <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                            <td className="px-3 py-2 align-top">
                                                <div className="flex items-center gap-3">
                                                    <AuctionThumb image={row.image} />
                                                    <Link
                                                        href={auctionHref(row.id)}
                                                        className="line-clamp-2 min-h-[44px] min-w-0 flex-1 py-2.5 font-semibold leading-snug text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 dark:text-primary-400"
                                                    >
                                                        {row.title}
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right align-top">
                                                <div className="py-2.5">
                                                    <PriceText row={row} />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right align-top tabular-nums text-zinc-900 dark:text-zinc-100">
                                                <div className="py-2.5">{row.bid_count}</div>
                                            </td>
                                            <td className="px-3 py-2 align-top text-zinc-600 dark:text-zinc-400">
                                                <div className="py-2.5">
                                                    <TimeText row={row} nowMs={nowMs} />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <div className="py-2.5">
                                                    <AuctionStatusBadge displayStatus={row.display_status} status={row.status} />
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 align-top">
                                                <div className="py-2.5">
                                                    <Outcome row={row} />
                                                </div>
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
                                <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => update({ page: page - 1 <= 1 ? null : String(page - 1) })} aria-label="Previous page">
                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                    <span className="hidden sm:inline">Previous</span>
                                </button>
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {page} / {pageCount}
                                </span>
                                <button type="button" className={btnSecondary} disabled={page >= pageCount} onClick={() => update({ page: String(page + 1) })} aria-label="Next page">
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        </nav>
                    </>
                )}
            </div>
        </div>
    )
}
