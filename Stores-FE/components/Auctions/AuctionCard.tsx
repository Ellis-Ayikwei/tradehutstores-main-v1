'use client'

import { memo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, ImageOff } from 'lucide-react'
import { PriceTag } from '@/components/common/marketplace'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { bidCountLabel, formatMoney, isBiddable, numberOf, type AuctionCardData } from '@/lib/auctionsApi'
import AuctionStatusBadge from './AuctionStatusBadge'
import Countdown from './Countdown'
import WatchButton from './WatchButton'

const GRID_SIZES = '(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'

/** Off-screen cards skip layout and paint; the size hint keeps the scrollbar steady. */
const SKIP_OFFSCREEN = '[content-visibility:auto] [contain-intrinsic-size:200px_340px]'

const META = 'text-xs leading-4 text-zinc-600 dark:text-zinc-400'

interface AuctionCardProps {
    auction: AuctionCardData
    priority?: boolean
    onCountdownEnd?: (auction: AuctionCardData) => void
}

/**
 * Same anatomy as the marketplace ProductCard: square full-bleed image, then fixed-height rows
 * (current bid + price h-10, title h-9/h-10, bids + time h-4, reserve/buy now h-4, seller h-4).
 * The whole card is one stretched link; the watch heart sits above it.
 */
function AuctionCard({ auction, priority = false, onCountdownEnd }: AuctionCardProps) {
    const [imgFailed, setImgFailed] = useState(false)
    const src = resolveMediaSrc(auction.image)
    const hasBids = auction.current_price !== null
    const shownPrice = numberOf(hasBids ? auction.current_price : auction.starting_price)
    const status = auction.display_status
    const upcoming = status === 'scheduled'
    const closed = status === 'ended' || status === 'cancelled'
    const hasReserve = auction.reserve_met === true || auction.reserve_met === false
    const hasBuyNow = Boolean(auction.buy_now_available && auction.buy_now_price)
    const countdownEnd = onCountdownEnd ? () => onCountdownEnd(auction) : undefined

    return (
        <article
            className={`group relative flex h-full min-w-0 flex-col rounded-md border border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 ${SKIP_OFFSCREEN}`}
        >
            <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-t-[5px] bg-zinc-100 dark:bg-zinc-800">
                {src && !imgFailed ? (
                    <Image
                        src={src}
                        alt={auction.title}
                        fill
                        sizes={GRID_SIZES}
                        quality={75}
                        priority={priority}
                        loading={priority ? undefined : 'lazy'}
                        onError={() => setImgFailed(true)}
                        className={`object-cover object-center ${closed ? 'grayscale' : ''}`}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <ImageOff className="h-8 w-8" aria-hidden="true" />
                        <span className="sr-only">No image available</span>
                    </div>
                )}
                <AuctionStatusBadge status={status} className="pointer-events-none absolute left-1.5 top-1.5" />
                {closed ? (
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-zinc-900 py-1 text-center text-xs font-semibold text-white dark:bg-zinc-950">
                        {status === 'cancelled' ? 'Cancelled' : 'Ended'}
                    </span>
                ) : null}
                <WatchButton
                    auctionId={auction.id}
                    title={auction.title}
                    isWatching={auction.is_watching}
                    className="absolute right-1.5 top-1.5 z-10"
                />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1 p-2 sm:p-3">
                <div className="flex h-10 flex-col justify-center">
                    <p className={`h-4 truncate ${META}`}>
                        {upcoming ? 'Starting bid' : hasBids ? 'Current bid' : 'Starting bid'}
                    </p>
                    <div className="flex h-6 items-center">
                        <PriceTag price={shownPrice} currencyCode={auction.currency} size="md" />
                    </div>
                </div>

                <h3 className="line-clamp-2 h-9 text-sm font-normal leading-[18px] text-zinc-800 dark:text-zinc-100">
                    <Link
                        href={`/auctions/${encodeURIComponent(auction.id)}`}
                        className='outline-none after:absolute after:inset-0 after:rounded-md after:content-[""] hover:text-primary-700 hover:underline focus-visible:after:ring-2 focus-visible:after:ring-primary-700 dark:hover:text-primary-400 dark:focus-visible:after:ring-primary-400'
                    >
                        {auction.title}
                    </Link>
                </h3>

                <div className={`flex h-4 items-center gap-x-1.5 overflow-hidden whitespace-nowrap ${META}`}>
                    {upcoming ? (
                        <Countdown
                            to={auction.starts_at}
                            label="Starts in"
                            urgentColor={false}
                            onEnd={countdownEnd}
                        />
                    ) : (
                        <>
                            <span>{bidCountLabel(auction.bid_count)}</span>
                            <span aria-hidden="true">&middot;</span>
                            {isBiddable(status) ? (
                                <Countdown
                                    to={auction.ends_at}
                                    onEnd={countdownEnd}
                                />
                            ) : (
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                    {status === 'cancelled' ? 'Cancelled' : 'Ended'}
                                </span>
                            )}
                        </>
                    )}
                </div>

                <p className={`h-4 truncate ${META}`}>
                    {auction.reserve_met === true ? (
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Reserve met</span>
                    ) : null}
                    {auction.reserve_met === false ? <span>Reserve not met</span> : null}
                    {hasReserve && hasBuyNow ? <span aria-hidden="true"> &middot; </span> : null}
                    {hasBuyNow ? (
                        <span>
                            Buy now{' '}
                            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                                {formatMoney(auction.buy_now_price as string, auction.currency)}
                            </span>
                        </span>
                    ) : null}
                </p>

                <p className={`flex h-4 items-center gap-1 ${META}`}>
                    <span className="truncate">by {auction.seller.business_name}</span>
                    {auction.seller.is_verified ? (
                        <span className="inline-flex shrink-0 items-center text-emerald-700 dark:text-emerald-400">
                            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="sr-only">Verified seller</span>
                        </span>
                    ) : null}
                </p>
            </div>
        </article>
    )
}

export default memo(AuctionCard)

/** Same fixed anatomy and heights as AuctionCard so nothing shifts on load. */
export function AuctionCardSkeleton() {
    const bone = 'rounded-sm bg-zinc-200 dark:bg-zinc-800'
    return (
        <div
            aria-hidden="true"
            className="flex h-full flex-col rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 motion-safe:animate-pulse"
        >
            <div className="aspect-square w-full rounded-t-[5px] bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex flex-col gap-1 p-2 sm:p-3">
                <div className="flex h-10 flex-col justify-center gap-1">
                    <div className={`h-3 w-16 ${bone}`} />
                    <div className={`h-5 w-24 ${bone}`} />
                </div>
                <div className="flex h-9 flex-col justify-center gap-1.5">
                    <div className={`h-3.5 w-11/12 ${bone}`} />
                    <div className={`h-3.5 w-2/3 ${bone}`} />
                </div>
                <div className="flex h-4 items-center">
                    <div className={`h-3 w-32 ${bone}`} />
                </div>
                <div className="flex h-4 items-center">
                    <div className={`h-3 w-24 ${bone}`} />
                </div>
                <div className="flex h-4 items-center">
                    <div className={`h-3 w-20 ${bone}`} />
                </div>
            </div>
        </div>
    )
}
