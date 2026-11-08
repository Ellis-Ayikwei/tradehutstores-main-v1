'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useSellerKeys } from '@/hooks/useSellerKeys'
import { toSellerError } from '@/lib/seller/errors'
import { fetchRecentSellerOrders, fetchSellerBalance, fetchSellerStats, formatMoney } from '@/lib/seller/stats'
import type { Paged, RecentSellerOrder, SellerBalance, SellerStats } from '@/lib/seller/types'
import { ErrorPanel, PageHeader, Skeleton } from '@/components/seller-central/ui'
import RecentOrders from './RecentOrders'
import SalesChart from './SalesChart'

const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false } as const
const DASH = '–'

interface Tile {
    key: string
    label: string
    value: string
    hint?: string
    href: string
    loading: boolean
}

function StatTile({ tile }: { tile: Tile }) {
    return (
        <Link
            href={tile.href}
            className="block rounded-md border border-zinc-200 bg-white p-3 hover:border-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary-400 dark:focus-visible:ring-primary-400"
        >
            <span className="block text-sm text-zinc-700 dark:text-zinc-300">{tile.label}</span>
            {tile.loading ? (
                <span className="mt-1 block" aria-busy="true" aria-label={`Loading ${tile.label}`}>
                    <Skeleton className="h-7 w-24" />
                    <Skeleton className="mt-1.5 h-3 w-28" />
                </span>
            ) : (
                <>
                    <span className="mt-0.5 block break-words text-xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100 sm:text-2xl">{tile.value}</span>
                    {tile.hint ? <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">{tile.hint}</span> : null}
                </>
            )}
        </Link>
    )
}

const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`

export default function SellerOverview() {
    const { statsKey } = useSellerKeys()
    const stats = useSWR<SellerStats>(statsKey, fetchSellerStats, SWR_OPTIONS)
    const balance = useSWR<SellerBalance>('seller-central:balance', fetchSellerBalance, SWR_OPTIONS)
    const recent = useSWR<Paged<RecentSellerOrder>>('seller-central:recent-orders', () => fetchRecentSellerOrders(5), SWR_OPTIONS)

    const s = stats.data
    const b = balance.data
    const statsError = stats.error ? toSellerError(stats.error) : null
    const balanceError = balance.error ? toSellerError(balance.error) : null
    const recentError = recent.error ? toSellerError(recent.error) : null
    const showBalanceError = balanceError && (!statsError || statsError.kind !== balanceError.kind)

    const tiles: Tile[] = [
        {
            key: 'sales',
            label: 'Sales, last 30 days',
            value: s ? formatMoney(s.sales_30d, s.currency) : DASH,
            hint: s ? plural(s.orders_30d, 'order', 'orders') : undefined,
            href: '/seller-central/orders',
            loading: stats.isLoading,
        },
        {
            key: 'to-ship',
            label: 'Orders to ship',
            value: s ? s.orders_to_ship.toLocaleString() : DASH,
            hint: 'Awaiting shipment',
            href: '/seller-central/orders?status=Processing',
            loading: stats.isLoading,
        },
        {
            key: 'available',
            label: 'Available balance',
            value: b ? formatMoney(b.available, b.currency) : DASH,
            hint: b ? `Minimum payout ${formatMoney(b.min_payout, b.currency)}` : undefined,
            href: '/seller-central/payouts',
            loading: balance.isLoading,
        },
        {
            key: 'pending',
            label: 'Pending balance',
            value: b ? formatMoney(b.pending, b.currency) : DASH,
            hint: 'Not yet withdrawable',
            href: '/seller-central/payouts',
            loading: balance.isLoading,
        },
        {
            key: 'low-stock',
            label: 'Low stock',
            value: s ? s.low_stock_variants.toLocaleString() : DASH,
            hint: 'Variants with 5 or fewer left',
            href: '/seller-central/listings?filter=low-stock',
            loading: stats.isLoading,
        },
        {
            key: 'listings',
            label: 'Active listings',
            value: s ? s.active_listings.toLocaleString() : DASH,
            href: '/seller-central/listings',
            loading: stats.isLoading,
        },
        {
            key: 'auctions',
            label: 'Live auctions',
            value: s ? s.live_auctions.toLocaleString() : DASH,
            href: '/seller-central/auctions',
            loading: stats.isLoading,
        },
        {
            key: 'rfq',
            label: 'Open RFQ matches',
            value: s ? s.open_rfq_matches.toLocaleString() : DASH,
            hint: 'Requests matching your categories',
            href: '/seller-central/rfq',
            loading: stats.isLoading,
        },
    ]

    const series = s?.sales_by_day
    const showChart = Boolean(s && series && series.length > 0)

    return (
        <div className="space-y-3">
            <PageHeader title="Overview" description="Your store at a glance" />

            {statsError ? (
                <ErrorPanel
                    title="Couldn't load your store numbers"
                    message={statsError.message}
                    onRetry={() => void stats.mutate()}
                    retrying={stats.isValidating}
                />
            ) : null}
            {showBalanceError && balanceError ? (
                <ErrorPanel
                    title="Couldn't load your balance"
                    message={balanceError.message}
                    onRetry={() => void balance.mutate()}
                    retrying={balance.isValidating}
                />
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                {tiles.map((tile) => (
                    <StatTile key={tile.key} tile={tile} />
                ))}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                {showChart && s && series ? (
                    <div className="min-w-0 lg:col-span-3">
                        <SalesChart series={series} currency={s.currency} />
                    </div>
                ) : null}
                <div className={`min-w-0 ${showChart ? 'lg:col-span-2' : 'lg:col-span-5'}`}>
                    <RecentOrders
                        orders={recent.data?.results}
                        isLoading={recent.isLoading}
                        error={recentError?.message}
                        onRetry={() => void recent.mutate()}
                        retrying={recent.isValidating}
                    />
                </div>
            </div>
        </div>
    )
}
