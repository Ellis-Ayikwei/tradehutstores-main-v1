'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { AlertCircle, Gavel } from 'lucide-react'
import { fetchAuctionBids, formatMoney, type AuctionBid, type AuctionsApiError } from '@/lib/auctionsApi'
import Pager from './Pager'

const PAGE_SIZE_GUESS = 10

interface BidHistoryProps {
    auctionId: string
    currency: string
    /** Changing bid_count re-keys the request, so the list refreshes exactly when a bid lands. */
    bidCount: number
    /** AuctionDetail.recent_bids, shown on page 1 while the first request is in flight. */
    initialBids?: AuctionBid[]
}

function formatPlacedAt(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Bidder names are masked by the API (first and last character only); we render them as given. */
export default function BidHistory({ auctionId, currency, bidCount, initialBids }: BidHistoryProps) {
    const [page, setPage] = useState(1)
    const { data, error, isLoading, mutate } = useSWR<Awaited<ReturnType<typeof fetchAuctionBids>>, AuctionsApiError>(
        bidCount > 0 ? ['auction-bids', auctionId, page, bidCount] : null,
        () => fetchAuctionBids(auctionId, page),
        { keepPreviousData: true, revalidateOnFocus: false }
    )

    const rows: AuctionBid[] = data?.results ?? (page === 1 ? (initialBids ?? []) : [])
    // The API does not state its page size, so learn it from a full first page.
    const [pageSize, setPageSize] = useState(PAGE_SIZE_GUESS)
    useEffect(() => {
        if (page === 1 && data && data.results.length > 0) setPageSize(data.next ? data.results.length : Math.max(data.results.length, data.count))
    }, [page, data])

    return (
        <section aria-labelledby="bid-history-title" className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <h2 id="bid-history-title" className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Bid history
                </h2>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{bidCount.toLocaleString()} {bidCount === 1 ? 'bid' : 'bids'}</span>
            </div>

            {bidCount === 0 ? (
                <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
                    <Gavel className="h-6 w-6 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No bids yet</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">Be the first to bid.</p>
                </div>
            ) : error && rows.length === 0 ? (
                <div role="alert" className="flex flex-col items-center gap-2 px-3 py-6 text-center">
                    <AlertCircle className="h-6 w-6 text-red-700 dark:text-red-400" aria-hidden="true" />
                    <p className="text-sm text-zinc-900 dark:text-zinc-100">Could not load the bid history.</p>
                    <button
                        type="button"
                        onClick={() => void mutate()}
                        className="inline-flex h-11 items-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-primary-400 dark:ring-offset-zinc-900 sm:h-9"
                    >
                        Try again
                    </button>
                </div>
            ) : isLoading && rows.length === 0 ? (
                <ul aria-hidden="true" className="animate-pulse divide-y divide-zinc-200 dark:divide-zinc-800">
                    {[0, 1, 2].map(i => (
                        <li key={i} className="flex items-center justify-between px-3 py-2.5">
                            <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
                            <div className="h-4 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
                        </li>
                    ))}
                </ul>
            ) : (
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {rows.map((bid, i) => {
                        const leading = page === 1 && i === 0
                        return (
                            <li
                                key={`${bid.placed_at}-${bid.amount}`}
                                className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${bid.is_me ? 'bg-primary-50 dark:bg-zinc-800' : 'bg-white dark:bg-zinc-900'}`}
                            >
                                <div className="min-w-0">
                                    <p className="flex flex-wrap items-center gap-x-1.5 text-zinc-900 dark:text-zinc-100">
                                        <span className="font-mono">{bid.bidder}</span>
                                        {bid.is_me ? (
                                            <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-white dark:bg-zinc-100 dark:text-zinc-900">You</span>
                                        ) : null}
                                        {bid.is_buy_now ? (
                                            <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-white dark:bg-zinc-600">Buy now</span>
                                        ) : null}
                                        {leading ? (
                                            <span className="rounded bg-emerald-700 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-white">Highest</span>
                                        ) : null}
                                    </p>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{formatPlacedAt(bid.placed_at)}</p>
                                </div>
                                <p className="shrink-0 font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{formatMoney(bid.amount, currency)}</p>
                            </li>
                        )
                    })}
                </ul>
            )}

            {bidCount > 0 && data ? (
                <Pager page={page} pageSize={pageSize} count={data.count} onChange={setPage} className="border-t border-zinc-200 px-3 py-2 dark:border-zinc-800" />
            ) : null}
        </section>
    )
}
