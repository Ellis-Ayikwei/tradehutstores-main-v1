'use client'

import Image from 'next/image'
import Link from 'next/link'
import { formatMoney } from '@/lib/seller/stats'
import type { RecentSellerOrder } from '@/lib/seller/types'
import { EmptyPanel, ErrorPanel, Panel, Skeleton, StatusBadge, linkClass, type Tone } from '@/components/seller-central/ui'

const STATUS_TONE: Record<string, Tone> = {
    Pending: 'warning',
    Processing: 'info',
    Shipped: 'info',
    Delivered: 'success',
    Cancelled: 'danger',
    Refunded: 'neutral',
}

function placed(value: string): string {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function OrderRow({ order }: { order: RecentSellerOrder }) {
    const title = order.first_item?.title || 'Order'
    const extra = order.item_count > 1 ? ` + ${order.item_count - 1} more` : ''
    const image = order.first_item?.image
    return (
        <li>
            <Link
                href={`/seller-central/orders?q=${encodeURIComponent(order.id)}`}
                className="flex min-h-[44px] items-center gap-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                    {image ? <Image src={image} alt="" fill sizes="48px" loading="lazy" className="object-contain p-1 mix-blend-multiply dark:mix-blend-normal" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {title}
                        <span className="font-normal text-zinc-600 dark:text-zinc-400">{extra}</span>
                    </span>
                    <span className="block truncate text-xs text-zinc-600 dark:text-zinc-400">
                        #{String(order.id).slice(0, 8).toUpperCase()} · {placed(order.placed_at)}
                    </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{formatMoney(order.total_amount, order.currency)}</span>
                    <StatusBadge tone={STATUS_TONE[order.order_status] ?? 'neutral'}>{order.order_status}</StatusBadge>
                </span>
            </Link>
        </li>
    )
}

export default function RecentOrders({
    orders,
    isLoading,
    error,
    onRetry,
    retrying,
}: {
    orders?: RecentSellerOrder[]
    isLoading: boolean
    error?: string
    onRetry: () => void
    retrying: boolean
}) {
    return (
        <Panel
            title="Recent orders"
            actions={
                <Link href="/seller-central/orders" className={`${linkClass} text-sm`}>
                    View all
                </Link>
            }
            bodyClassName="px-3 py-1 sm:px-4"
        >
            {error ? (
                <div className="py-2">
                    <ErrorPanel title="Couldn't load recent orders" message={error} onRetry={onRetry} retrying={retrying} />
                </div>
            ) : isLoading ? (
                <ul aria-busy="true" aria-label="Loading recent orders" className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <li key={i} className="flex items-center gap-3 py-2">
                            <Skeleton className="h-12 w-12 shrink-0" />
                            <div className="flex-1 space-y-1.5">
                                <Skeleton className="h-4 w-3/5" />
                                <Skeleton className="h-3 w-2/5" />
                            </div>
                            <Skeleton className="h-8 w-20" />
                        </li>
                    ))}
                </ul>
            ) : orders && orders.length > 0 ? (
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {orders.map((order) => (
                        <OrderRow key={order.id} order={order} />
                    ))}
                </ul>
            ) : (
                <div className="py-2">
                    <EmptyPanel title="No orders yet" description="Orders from buyers will show up here as soon as they are placed." />
                </div>
            )}
        </Panel>
    )
}
