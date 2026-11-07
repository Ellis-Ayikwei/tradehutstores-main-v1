'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { AlertCircle, BadgeCheck, ChevronRight, Eye, Gavel } from 'lucide-react'
import { RatingStars } from '@/components/common/marketplace'
import AuctionGallery from '@/components/Auctions/AuctionGallery'
import AuctionStatusBadge from '@/components/Auctions/AuctionStatusBadge'
import BidHistory from '@/components/Auctions/BidHistory'
import BidPanel, {
    BidForm,
    BidSheet,
    MobileBidBar,
    PriceBlock,
    StatusBanner,
    TimeBlock,
    type BidAuction,
} from '@/components/Auctions/BidPanel'
import { useAuctionState } from '@/hooks/useAuctionState'
import { parseIso } from '@/hooks/useServerClock'
import { isGenericVariantName } from '@/lib/variantLabel'
import {
    fetchAuction,
    formatMoney,
    imageUrls,
    isBiddable,
    type AuctionDetail,
    type AuctionsApiError,
} from '@/lib/auctionsApi'

const BTN_PRIMARY =
    'inline-flex h-11 items-center justify-center rounded-full bg-primary-700 px-5 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950'
const BTN_SECONDARY =
    'inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'

function formatDate(iso: string): string {
    const t = parseIso(iso)
    if (!Number.isFinite(t)) return ''
    return new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AuctionDetailPage() {
    const params = useParams<{ id: string }>()
    const id = typeof params?.id === 'string' ? params.id : undefined
    const [sheetOpen, setSheetOpen] = useState(false)
    const closeSheet = useCallback(() => setSheetOpen(false), [])

    const {
        data: detail,
        error: detailError,
        isLoading,
        mutate: reloadDetail,
    } = useSWR<AuctionDetail, AuctionsApiError>(id ? ['auction', id] : null, ([, auctionId]: [string, string]) => fetchAuction(auctionId), {
        revalidateOnFocus: false,
        shouldRetryOnError: false,
    })
    const { state, applyState, refresh } = useAuctionState(id)

    if (!id || (isLoading && !detail)) return <DetailSkeleton />

    if (detailError?.status === 404) {
        return (
            <Frame>
                <Notice
                    icon={<Gavel className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />}
                    title="Auction not found"
                    body="This auction does not exist or is no longer available."
                >
                    <Link href="/auctions" className={BTN_PRIMARY}>
                        Back to Bid Central
                    </Link>
                    <Link href="/products" className={BTN_SECONDARY}>
                        Browse products
                    </Link>
                </Notice>
            </Frame>
        )
    }

    if (!detail) {
        return (
            <Frame>
                <Notice
                    icon={<AlertCircle className="h-8 w-8 text-red-700 dark:text-red-400" aria-hidden="true" />}
                    title="We could not load this auction"
                    body={detailError?.isNetwork ? 'Check your connection and try again.' : 'Something went wrong on our side. Please try again.'}
                    alert
                >
                    <button type="button" onClick={() => void reloadDetail()} className={BTN_PRIMARY}>
                        Try again
                    </button>
                    <Link href="/auctions" className={BTN_SECONDARY}>
                        Back to Bid Central
                    </Link>
                </Notice>
            </Frame>
        )
    }

    const auction: AuctionDetail = { ...detail, ...state }
    const bidAuction: BidAuction = auction
    const status = auction.display_status
    const finished = status === 'ended' || status === 'cancelled'
    const images = imageUrls(auction)
    const seller = auction.seller
    const sellerRating = Number(seller.rating ?? 0)
    const attributes = (auction.variant?.attributes ?? []).filter(a => !isGenericVariantName(a.value))
    // The attribute rows below already spell out Colour/Size etc., so only a real (non-placeholder) name earns an 'Item' row.
    const itemLabel = auction.variant?.name && !isGenericVariantName(auction.variant.name) ? auction.variant.name.trim() : null

    const facts: Array<[string, string]> = [
        ['Starting bid', formatMoney(auction.starting_price, auction.currency)],
        ['Bid increment', formatMoney(auction.min_increment, auction.currency)],
        ['Quantity', String(auction.quantity)],
        ...(auction.buy_now_available && auction.buy_now_price ? ([['Buy now price', formatMoney(auction.buy_now_price, auction.currency)]] as Array<[string, string]>) : []),
        [status === 'scheduled' ? 'Starts' : 'Ends', formatDate(status === 'scheduled' ? auction.starts_at : auction.ends_at)],
        ...(auction.product?.category?.name ? ([['Category', auction.product.category.name]] as Array<[string, string]>) : []),
        ...(itemLabel ? ([['Item', itemLabel]] as Array<[string, string]>) : []),
        ...attributes.map(a => [a.name, a.value] as [string, string]),
        ...(auction.variant?.sku ? ([['SKU', auction.variant.sku]] as Array<[string, string]>) : []),
    ]

    return (
        <div className="mx-auto max-w-[1440px] px-3 py-3 sm:px-4 lg:px-6">
            <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 overflow-hidden text-xs text-zinc-600 dark:text-zinc-400">
                <Link href="/auctions" className="shrink-0 hover:text-primary-700 hover:underline dark:hover:text-primary-400">
                    Bid Central
                </Link>
                <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate text-zinc-900 dark:text-zinc-100" aria-current="page">
                    {auction.title}
                </span>
            </nav>

            <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_300px] lg:gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_340px]">
                <AuctionGallery images={images} alt={auction.title} dimmed={finished} />

                <div className="mt-3 min-w-0 space-y-3 lg:mt-0">
                    <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                            <AuctionStatusBadge status={status} />
                            {auction.watch_count > 0 ? (
                                <span className="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                                    {auction.watch_count.toLocaleString()} watching
                                </span>
                            ) : null}
                        </div>
                        <h1 className="break-words text-xl font-medium leading-snug text-zinc-900 dark:text-zinc-100 lg:text-2xl">{auction.title}</h1>
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                            <span>Sold by</span>
                            <Link href={`/seller/${encodeURIComponent(seller.id)}`} className="font-medium text-primary-700 hover:underline dark:text-primary-400">
                                {seller.business_name}
                            </Link>
                            {seller.is_verified ? (
                                <span className="inline-flex items-center gap-0.5 font-medium text-emerald-700 dark:text-emerald-400">
                                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                                    Verified seller
                                </span>
                            ) : null}
                            {sellerRating > 0 ? <RatingStars rating={sellerRating} showValue /> : null}
                        </p>
                    </div>

                    {/* Mobile / tablet: summary in flow (desktop has the buy box on the right) */}
                    <div className="space-y-3 lg:hidden">
                        <StatusBanner auction={bidAuction} />
                        <PriceBlock auction={bidAuction} />
                        <TimeBlock auction={bidAuction} onEnd={refresh} />
                    </div>

                    <hr className="border-zinc-200 dark:border-zinc-800" />

                    <section aria-labelledby="facts-title">
                        <h2 id="facts-title" className="mb-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Auction details
                        </h2>
                        <dl className="text-sm">
                            {facts.map(([k, v], i) => (
                                <div key={`${k}-${i}`} className="flex gap-4 border-b border-zinc-200 py-1.5 last:border-b-0 dark:border-zinc-800">
                                    <dt className="w-28 shrink-0 text-zinc-600 dark:text-zinc-400">{k}</dt>
                                    <dd className="min-w-0 break-words font-medium text-zinc-900 dark:text-zinc-100">{v}</dd>
                                </div>
                            ))}
                        </dl>
                        {auction.product ? (
                            <Link href={`/products/${encodeURIComponent(auction.product.id)}`} className="mt-1 inline-block text-sm text-primary-700 hover:underline dark:text-primary-400">
                                View product page
                            </Link>
                        ) : null}
                    </section>

                    {auction.description.trim() ? (
                        <section aria-labelledby="about-title">
                            <h2 id="about-title" className="mb-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                About this item
                            </h2>
                            <p className="whitespace-pre-line break-words text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">{auction.description}</p>
                        </section>
                    ) : null}

                    <BidHistory auctionId={auction.id} currency={auction.currency} bidCount={auction.bid_count} initialBids={detail.recent_bids} />
                </div>

                <aside className="hidden self-start lg:sticky lg:top-28 lg:block">
                    <BidPanel auction={bidAuction} onState={applyState} onRefresh={refresh} />
                </aside>
            </div>

            <MobileBidBar auction={bidAuction} onOpen={() => setSheetOpen(true)} />
            <BidSheet open={sheetOpen && isBiddable(status)} onClose={closeSheet}>
                <PriceBlock auction={bidAuction} size="md" />
                <TimeBlock auction={bidAuction} onEnd={refresh} />
                <BidForm auction={bidAuction} onState={applyState} onRefresh={refresh} onPlaced={closeSheet} />
            </BidSheet>
        </div>
    )
}

function Frame({ children }: { children: React.ReactNode }) {
    return <div className="mx-auto max-w-[1440px] px-3 py-6 sm:px-4 lg:px-6">{children}</div>
}

function Notice({
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
            <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
            <p className="max-w-md text-sm text-zinc-700 dark:text-zinc-300">{body}</p>
            {children ? <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div> : null}
        </div>
    )
}

function DetailSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading auction" className="mx-auto max-w-[1440px] animate-pulse px-3 py-3 sm:px-4 lg:px-6">
            <div className="mb-2 h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_300px] lg:gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_340px]">
                <div className="aspect-square w-full rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-3 space-y-3 lg:mt-0">
                    <div className="h-5 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-7 w-11/12 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-4 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-24 w-full rounded-md bg-zinc-200 dark:bg-zinc-800 lg:hidden" />
                    <div className="h-40 w-full rounded-md bg-zinc-200 dark:bg-zinc-800" />
                </div>
                <div className="mt-3 hidden h-96 rounded-lg bg-zinc-200 dark:bg-zinc-800 lg:mt-0 lg:block" />
            </div>
        </div>
    )
}
