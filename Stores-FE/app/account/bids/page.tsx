'use client'

/**
 * My bids - /account/bids
 * Data: GET /auctions/me/bidding/?my_status=winning|outbid|won|lost (contract A8).
 * Layout: shared AccountShell via app/account/layout.tsx.
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { AlertCircle, Gavel, ImageOff, LogIn } from 'lucide-react'
import { AccountMobileHeader } from '@/components/account/AccountShell'
import { MyStatusBadge } from '@/components/Auctions/AuctionStatusBadge'
import Countdown from '@/components/Auctions/Countdown'
import Pager from '@/components/Auctions/Pager'
import { tryOpenAuthModalFromBridge } from '@/lib/authModalBridge'
import { fetchMyBidding, formatMoney, isBiddable, type AuctionsApiError, type MyBidRow, type MyStatus, type Paginated } from '@/lib/auctionsApi'
import { resolveMediaSrc } from '@/lib/mediaUrl'

const PAGE_SIZE = 20

const TABS: Array<{ value: MyStatus; label: string; empty: string; hint: string }> = [
    { value: 'winning', label: 'Winning', empty: 'You are not winning any auctions', hint: 'Auctions where you are the highest bidder appear here.' },
    { value: 'outbid', label: 'Outbid', empty: 'You have not been outbid', hint: 'Auctions where someone bid higher than you appear here.' },
    { value: 'won', label: 'Won', empty: 'No won auctions yet', hint: 'Auctions you win will appear here, ready to pay.' },
    { value: 'lost', label: 'Lost', empty: 'No lost auctions', hint: 'Finished auctions you did not win appear here.' },
]

const BTN_PRIMARY =
    'inline-flex h-11 items-center justify-center rounded-full bg-primary-700 px-5 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950'
const BTN_SECONDARY =
    'inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'

export default function MyBidsPage() {
    const isAuthenticated = useIsAuthenticated()
    const [mounted, setMounted] = useState(false)
    const [tab, setTab] = useState<MyStatus>('winning')
    const [page, setPage] = useState(1)

    useEffect(() => setMounted(true), [])

    const { data, error, isLoading, mutate } = useSWR<Paginated<MyBidRow>, AuctionsApiError>(
        mounted && isAuthenticated ? ['my-bids', tab, page] : null,
        () => fetchMyBidding({ my_status: tab, page, page_size: PAGE_SIZE }),
        {
            keepPreviousData: true,
            refreshInterval: tab === 'winning' || tab === 'outbid' ? 10000 : 0,
            refreshWhenHidden: false,
            revalidateOnFocus: true,
        }
    )

    const current = TABS.find(t => t.value === tab) ?? TABS[0]
    const rows = data?.results ?? []

    return (
        <div className="space-y-3">
            <AccountMobileHeader title="Bids" />
            <div className="flex items-center justify-between gap-3">
                <h1 className="hidden font-syne text-2xl font-bold text-zinc-900 dark:text-zinc-100 lg:block">My bids</h1>
                <Link href="/auctions" className="ml-auto text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400">
                    Browse auctions
                </Link>
            </div>

            <div role="tablist" aria-label="Bid status" className="grid grid-cols-4 border-b border-zinc-200 dark:border-zinc-800 sm:flex sm:gap-2">
                {TABS.map(t => {
                    const active = t.value === tab
                    return (
                        <button
                            key={t.value}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => {
                                setTab(t.value)
                                setPage(1)
                            }}
                            className={`-mb-px min-h-[44px] whitespace-nowrap border-b-2 px-1 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 sm:px-4 ${
                                active
                                    ? 'border-primary-700 text-primary-700 dark:border-primary-400 dark:text-primary-400'
                                    : 'border-transparent text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100'
                            }`}
                        >
                            {t.label}
                        </button>
                    )
                })}
            </div>

            {!mounted ? (
                <RowsSkeleton />
            ) : !isAuthenticated || error?.status === 401 ? (
                <Box icon={<LogIn className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />} title="Sign in to see your bids" body="Your winning, outbid, won and lost auctions are listed here once you are signed in.">
                    <button type="button" onClick={() => tryOpenAuthModalFromBridge('login')} className={BTN_PRIMARY}>
                        Sign in
                    </button>
                </Box>
            ) : error && !data ? (
                error.status === 404 ? (
                    <Box icon={<Gavel className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />} title="Bid Central is getting ready" body="Your bids will appear here once auctions are available.">
                        <Link href="/products" className={BTN_PRIMARY}>
                            Browse products
                        </Link>
                    </Box>
                ) : (
                    <Box
                        icon={<AlertCircle className="h-8 w-8 text-red-700 dark:text-red-400" aria-hidden="true" />}
                        title="We could not load your bids"
                        body={error.isNetwork ? 'Check your connection and try again.' : 'Something went wrong on our side. Please try again.'}
                        alert
                    >
                        <button type="button" onClick={() => void mutate()} className={BTN_PRIMARY}>
                            Try again
                        </button>
                    </Box>
                )
            ) : isLoading && !data ? (
                <RowsSkeleton />
            ) : rows.length === 0 ? (
                <Box icon={<Gavel className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />} title={current.empty} body={current.hint}>
                    <Link href="/auctions" className={BTN_PRIMARY}>
                        Browse live auctions
                    </Link>
                    <Link href="/products" className={BTN_SECONDARY}>
                        Browse products
                    </Link>
                </Box>
            ) : (
                <>
                    <ul className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                        {rows.map(row => (
                            <BidRow key={row.id} row={row} onEnd={() => void mutate()} />
                        ))}
                    </ul>
                    <Pager
                        page={page}
                        pageSize={PAGE_SIZE}
                        count={data?.count ?? 0}
                        onChange={p => {
                            setPage(p)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                    />
                </>
            )}
        </div>
    )
}

function BidRow({ row, onEnd }: { row: MyBidRow; onEnd: () => void }) {
    const src = resolveMediaSrc(row.image)
    const href = `/auctions/${encodeURIComponent(row.id)}`
    const live = isBiddable(row.display_status)
    const currentBid = row.current_price ?? row.starting_price
    const paymentStatus = (row.order_payment_status ?? '').toLowerCase()
    const unpaid = row.my_status === 'won' && row.order_id !== null && paymentStatus === 'unpaid'

    return (
        <li className="p-2 sm:flex sm:items-center sm:gap-4 sm:p-3">
            <div className="flex min-w-0 flex-1 gap-2 sm:gap-3">
                <Link href={href} className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-50 dark:bg-zinc-800 sm:h-20 sm:w-20" tabIndex={-1} aria-hidden="true">
                    {src ? (
                        <Image src={src} alt="" fill sizes="80px" className="object-contain p-1" />
                    ) : (
                        <span className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                            <ImageOff className="h-6 w-6" />
                        </span>
                    )}
                </Link>
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h2 className="min-w-0 text-sm font-normal leading-snug text-zinc-900 dark:text-zinc-100">
                            <Link href={href} className="line-clamp-2 hover:text-primary-700 hover:underline dark:hover:text-primary-400">
                                {row.title}
                            </Link>
                        </h2>
                        <MyStatusBadge status={row.my_status} className="shrink-0" />
                    </div>
                    <dl className="mt-1 grid grid-cols-3 gap-2 text-xs leading-4">
                        <div className="min-w-0">
                            <dt className="text-zinc-600 dark:text-zinc-400">Your bid</dt>
                            <dd className="truncate font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{formatMoney(row.my_highest_bid, row.currency)}</dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="text-zinc-600 dark:text-zinc-400">{row.my_status === 'won' ? 'Final price' : 'Current bid'}</dt>
                            <dd className="truncate font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{formatMoney(currentBid, row.currency)}</dd>
                        </div>
                        <div className="min-w-0">
                            <dt className="text-zinc-600 dark:text-zinc-400">Time left</dt>
                            <dd className="text-xs">
                                {live ? <Countdown to={row.ends_at} onEnd={onEnd} /> : <span className="font-semibold text-zinc-700 dark:text-zinc-300">{row.display_status === 'cancelled' ? 'Cancelled' : 'Ended'}</span>}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            {row.my_status === 'won' && row.order_id ? (
                <div className="mt-2 space-y-1 sm:mt-0 sm:w-44 sm:shrink-0">
                    {unpaid ? (
                        <>
                            <Link href={`/checkout?order=${encodeURIComponent(row.order_id)}`} className={`${BTN_PRIMARY} w-full`}>
                                Pay now
                            </Link>
                            {row.order_payment_due_at ? (
                                <p className="text-center text-xs text-zinc-700 dark:text-zinc-300">
                                    <Countdown to={row.order_payment_due_at} label="Pay within" endedLabel="Payment overdue" />
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <Link href={`/account/orders/${encodeURIComponent(row.order_id)}`} className={`${BTN_SECONDARY} w-full`}>
                            View order
                        </Link>
                    )}
                </div>
            ) : null}
        </li>
    )
}

function Box({
    icon,
    title,
    body,
    alert = false,
    children,
}: {
    icon: React.ReactNode
    title: string
    body: string
    alert?: boolean
    children?: React.ReactNode
}) {
    return (
        <div role={alert ? 'alert' : undefined} className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
            {icon}
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
            <p className="max-w-md text-sm text-zinc-700 dark:text-zinc-300">{body}</p>
            {children ? <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div> : null}
        </div>
    )
}

function RowsSkeleton() {
    return (
        <ul aria-hidden="true" className="animate-pulse divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {[0, 1, 2, 3].map(i => (
                <li key={i} className="flex gap-2 p-2 sm:gap-3 sm:p-3">
                    <div className="h-16 w-16 shrink-0 rounded-md bg-zinc-200 dark:bg-zinc-800 sm:h-20 sm:w-20" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-11/12 rounded bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-3.5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                </li>
            ))}
        </ul>
    )
}
