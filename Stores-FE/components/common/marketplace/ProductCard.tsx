'use client'

import { useState, type PointerEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, Heart, ImageOff, Loader2, ShoppingCart } from 'lucide-react'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import Badge from './Badge'
import Countdown from './Countdown'
import PriceTag, { discountPercent } from './PriceTag'
import { useReserveCardMeta } from './CardMetaContext'
import RatingStars from './RatingStars'
import { cx } from './cx'

/** Display shape for a card. Map API rows into this at the call site. */
export interface MarketplaceProduct {
    id: string | number
    title: string
    href: string
    imageUrl?: string | null
    /**
     * Extra gallery images (any order; the main image is ignored if repeated). When at least one
     * other image exists the card crossfades to it on desktop hover. Nothing extra is shown without it.
     */
    images?: Array<string | null | undefined>
    /** Defaults to the title. */
    imageAlt?: string
    price: number
    originalPrice?: number
    rating?: number
    reviewCount?: number
    soldCount?: number
    /** Units remaining. 0 renders "Out of stock"; 1-5 renders "Only N left". */
    stockLeft?: number
    freeShipping?: boolean
    /** e.g. "Arrives Thu, 12 Nov". Shown after "Free delivery" (or alone). */
    arrivalText?: string
    verifiedSeller?: boolean
    /** Store name, rendered as "by {sellerName}". Omit when the API does not provide it. */
    sellerName?: string
    /** Short promo label shown on the image, e.g. "Flash deal". */
    badge?: string
    /** ISO end time; shows a compact countdown on the image and marks the card as a time-limited deal. */
    endsAt?: string
    /** Pass-through metadata for add-to-cart handlers. Never rendered. */
    brand?: string
    category?: string
}

export interface ProductCardProps {
    product: MarketplaceProduct
    /** Pass CurrencyContext `formatDisplayPrice`. */
    formatPrice?: (amount: number) => string
    wishlisted?: boolean
    onToggleWishlist?: (product: MarketplaceProduct) => void
    onAddToCart?: (product: MarketplaceProduct) => void
    addToCartLoading?: boolean
    onCountdownEnd?: (product: MarketplaceProduct) => void
    /** Set true for above-the-fold cards so the image is not lazy-loaded. */
    priority?: boolean
    /** Tighter padding and type for dense listing grids. */
    compact?: boolean
    /** grid = vertical card (default). list = horizontal card with a larger image on the left. */
    variant?: 'grid' | 'list'
    /**
     * Mark as a real time-limited deal: solid red badge and a claimed progress bar
     * (when sold + stock are both known). Defaults to true when `product.endsAt` is set.
     */
    deal?: boolean
    /**
     * Grid only. Default true keeps the empty 16px rating/meta row so all cards are equally tall. Set false (or
     * wrap in `<ProductGrid hasMeta={false}>` / `CardMetaProvider`) when no card in the set has anything to show.
     */
    reserveMeta?: boolean
    /** Grid only: show the full-width "Add to cart" pill instead of the compact round icon button. */
    showCta?: boolean
    /** Override the image `sizes` attribute (defaults to the standard grid sizes). */
    sizes?: string
    className?: string
}

const GRID_SIZES =
    '(min-width: 1536px) 15vw, (min-width: 1280px) 18vw, (min-width: 1024px) 23vw, (min-width: 640px) 31vw, 48vw'
const LIST_SIZES = '(min-width: 640px) 140px, 112px'

/** A discount below this is shown as plain red text in the price row, not as an image badge. */
const BADGE_MIN_DISCOUNT = 5

/** True when a card would show a rating or a meta line. Pages use it to set `hasMeta` on a grid/row. */
export function productHasMeta(p: MarketplaceProduct): boolean {
    return Boolean(
        (p.rating ?? 0) > 0 ||
            p.freeShipping ||
            p.arrivalText ||
            (p.stockLeft !== undefined && p.stockLeft > 0 && p.stockLeft <= 5) ||
            (p.soldCount ?? 0) > 0 ||
            p.sellerName ||
            p.verifiedSeller
    )
}

export function compactCount(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
    return String(n)
}

const BUTTON_FOCUS =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-primary-400 dark:focus-visible:ring-offset-zinc-900'

/** Mouse hover only; touch devices never get a stuck hover state. */
const FINE_POINTER = '[@media(hover:hover)_and_(pointer:fine)]'

/**
 * On hover-capable desktop screens the round cart button is faded out until the card is hovered or
 * focused. It stays in the layout and in the tab order, so keyboard users can always reach it.
 */
const HOVER_REVEAL = `${FINE_POINTER}:opacity-0 ${FINE_POINTER}:group-hover:opacity-100 ${FINE_POINTER}:group-focus-within:opacity-100 ${FINE_POINTER}:focus-visible:opacity-100`

export default function ProductCard({
    product,
    formatPrice,
    wishlisted = false,
    onToggleWishlist,
    onAddToCart,
    addToCartLoading = false,
    onCountdownEnd,
    priority = false,
    compact = false,
    variant = 'grid',
    deal,
    showCta = false,
    reserveMeta = true,
    sizes,
    className,
}: ProductCardProps) {
    const {
        title,
        href,
        imageUrl,
        images,
        imageAlt,
        price,
        originalPrice,
        rating,
        reviewCount,
        soldCount,
        stockLeft,
        freeShipping,
        arrivalText,
        verifiedSeller,
        sellerName,
        badge,
        endsAt,
    } = product

    const reserveFromGrid = useReserveCardMeta()
    const [imgFailed, setImgFailed] = useState(false)
    const [hoverReady, setHoverReady] = useState(false)

    const isList = variant === 'list'
    const pct = discountPercent(price, originalPrice)
    const src = resolveMediaSrc(imageUrl)
    const secondRaw = (images ?? []).map(i => resolveMediaSrc(i)).find(s => s && s !== src)
    const secondSrc = secondRaw || ''
    const outOfStock = stockLeft === 0
    const lowStock = stockLeft !== undefined && stockLeft > 0 && stockLeft <= 5
    const isDeal = deal ?? Boolean(endsAt)

    // One red rectangle on the image: custom label wins; otherwise the discount (deals, or >= 5%).
    const pctBadge = !badge && pct > 0 && (isDeal || pct >= BADGE_MIN_DISCOUNT)
    const imageBadgeText = badge ?? (pctBadge ? `-${pct}%` : undefined)
    const inlineDiscount = pct > 0 && !pctBadge

    const showProgress =
        isDeal && soldCount !== undefined && stockLeft !== undefined && stockLeft > 0 && soldCount + stockLeft > 0
    const progressPct = showProgress ? Math.min(100, Math.round((soldCount / (soldCount + stockLeft)) * 100)) : 0
    const showSoldText = soldCount !== undefined && soldCount > 0
    // Every image fills the same square box the same way, whatever the photo's own ratio.
    const fit = 'object-cover object-center'

    const onPointerEnter =
        secondSrc && !hoverReady
            ? (e: PointerEvent<HTMLElement>) => {
                  if (e.pointerType === 'mouse') setHoverReady(true)
              }
            : undefined

    const stage = (
        <div
            className={cx(
                'relative shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800',
                isList
                    ? 'min-h-28 w-28 self-stretch rounded-l-[7px] sm:min-h-[140px] sm:w-[140px]'
                    : 'aspect-square w-full rounded-t-[7px]'
            )}
        >
            {src && !imgFailed ? (
                <div
                    className={cx(
                        'absolute inset-0 transition-transform duration-300 ease-out motion-reduce:transition-none',
                        `${FINE_POINTER}:group-hover:scale-[1.03] motion-reduce:group-hover:scale-100`
                    )}
                >
                    <Image
                        src={src}
                        alt={imageAlt ?? title}
                        fill
                        sizes={sizes ?? (isList ? LIST_SIZES : GRID_SIZES)}
                        priority={priority}
                        loading={priority ? undefined : 'lazy'}
                        onError={() => setImgFailed(true)}
                        className={cx(fit, outOfStock && 'opacity-60 grayscale')}
                    />
                    {secondSrc && hoverReady && !outOfStock ? (
                        <Image
                            src={secondSrc}
                            alt=""
                            fill
                            sizes={sizes ?? (isList ? LIST_SIZES : GRID_SIZES)}
                            className={cx(
                                fit,
                                `bg-zinc-100 opacity-0 transition-opacity duration-300 dark:bg-zinc-800 ${FINE_POINTER}:group-hover:opacity-100`
                            )}
                        />
                    ) : null}
                </div>
            ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                    <ImageOff className="h-8 w-8" aria-hidden="true" />
                    <span className="sr-only">No image available</span>
                </div>
            )}

            {imageBadgeText ? (
                <Badge
                    variant={isDeal || pctBadge ? 'danger' : 'dark'}
                    className="pointer-events-none absolute left-2 top-2 rounded-md font-bold"
                >
                    {imageBadgeText}
                </Badge>
            ) : null}

            {endsAt && !outOfStock ? (
                <div className="pointer-events-none absolute bottom-1.5 left-1.5">
                    <Countdown
                        endsAt={endsAt}
                        variant="compact"
                        onEnd={onCountdownEnd ? () => onCountdownEnd(product) : undefined}
                    />
                </div>
            ) : null}

            {outOfStock ? (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-zinc-900 py-1 text-center text-xs font-semibold text-white dark:bg-zinc-950">
                    Out of stock
                </span>
            ) : null}

            {onToggleWishlist ? (
                <button
                    type="button"
                    onClick={() => onToggleWishlist(product)}
                    aria-pressed={wishlisted}
                    aria-label={wishlisted ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
                    className={cx(
                        'absolute right-0.5 top-0.5 z-10 flex h-11 w-11 items-center justify-center rounded-full',
                        BUTTON_FOCUS
                    )}
                >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-700 shadow transition-colors hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
                        <Heart
                            className={cx(
                                'h-[18px] w-[18px]',
                                wishlisted ? 'fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400' : ''
                            )}
                            aria-hidden="true"
                        />
                    </span>
                </button>
            ) : null}
        </div>
    )

    const priceEl = (
        <PriceTag
            price={price}
            originalPrice={originalPrice}
            formatPrice={formatPrice}
            size="md"
            showDiscount={inlineDiscount}
            stacked={!isList}
        />
    )

    const titleEl = (
        <h3
            className={cx(
                'font-normal text-zinc-800 dark:text-zinc-100',
                isList
                    ? 'text-sm leading-snug sm:text-base'
                    : cx(
                          'line-clamp-2 h-9 text-[13px] leading-[18px]',
                          !compact && 'sm:h-10 sm:text-sm sm:leading-5'
                      )
            )}
        >
            <Link
                href={href}
                className={cx(
                    isList && 'line-clamp-2',
                    'outline-none after:absolute after:inset-0 after:rounded-lg after:content-[""] hover:text-primary-700 hover:underline dark:hover:text-primary-400',
                    'focus-visible:after:ring-2 focus-visible:after:ring-primary-700 dark:focus-visible:after:ring-primary-400'
                )}
            >
                {title}
            </Link>
        </h3>
    )

    const hasRating = rating !== undefined && rating > 0
    // List only. In the grid the rating shares the single meta row below.
    const ratingEl =
        isList && hasRating ? (
            <div className="flex items-center overflow-hidden">
                <RatingStars rating={rating as number} count={reviewCount} countTone="link" />
            </div>
        ) : null

    const progressBar = showProgress ? (
        <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progressPct}% claimed`}
            className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
        >
            <div
                className={cx(
                    'h-full rounded-full',
                    progressPct >= 80 ? 'bg-red-600 dark:bg-red-500' : 'bg-orange-500 dark:bg-orange-400'
                )}
                style={{ width: `${progressPct}%` }}
            />
        </div>
    ) : null

    const metaBase = 'text-xs leading-4 text-zinc-600 dark:text-zinc-400'
    const lowStockCls =
        'font-semibold ' +
        (stockLeft !== undefined && stockLeft <= 3
            ? 'text-red-700 dark:text-red-400'
            : 'text-amber-700 dark:text-amber-400')
    const verifiedIcon = verifiedSeller ? (
        <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-emerald-700 dark:text-emerald-400">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {sellerName ? <span className="sr-only">Verified seller</span> : 'Verified seller'}
        </span>
    ) : null

    // Grid: one truncated line. Segments are real data only, joined with a middle dot.
    const metaSegments: Array<{ key: string; node: React.ReactNode }> = []
    if (lowStock) metaSegments.push({ key: 'low', node: <span className={lowStockCls}>Only {stockLeft} left</span> })
    if (freeShipping || arrivalText) {
        metaSegments.push({
            key: 'ship',
            node: (
                <>
                    {freeShipping ? (
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">Free delivery</span>
                    ) : null}
                    {freeShipping && arrivalText ? ' ' : null}
                    {arrivalText ? <span>{arrivalText}</span> : null}
                </>
            ),
        })
    }
    if (showSoldText) metaSegments.push({ key: 'sold', node: <span>{compactCount(soldCount as number)} sold</span> })
    if (metaSegments.length === 0 && (sellerName || verifiedSeller)) {
        metaSegments.push({
            key: 'seller',
            node: (
                <>
                    {sellerName ? <span>by {sellerName}</span> : null}
                    {sellerName && verifiedSeller ? ' ' : null}
                    {verifiedIcon}
                </>
            ),
        })
    }

    const progressEl = isList && progressBar ? <div className="flex">{progressBar}</div> : null

    // Grid: ONE h-4 row = stars + count, then " · ", then the meta text (truncates first). A deal with known
    // stock + sold shows the claimed bar + "N sold" instead. The row is reserved (even when empty) unless the
    // card (`reserveMeta`) or its grid/row (CardMetaProvider) opts out; if it has content it always renders.
    const hasRow = hasRating || metaSegments.length > 0 || Boolean(progressBar)
    const gridMeta =
        !hasRow && !(reserveMeta && reserveFromGrid) ? null : progressBar ? (
            <div className={cx('flex h-4 items-center gap-1.5', metaBase)}>
                {progressBar}
                {showSoldText ? (
                    <span className="shrink-0 whitespace-nowrap">{compactCount(soldCount as number)} sold</span>
                ) : null}
            </div>
        ) : (
            <div className={cx('flex h-4 items-center overflow-hidden whitespace-nowrap', metaBase)}>
                {hasRating ? (
                    <span className="shrink-0">
                        <RatingStars rating={rating as number} count={reviewCount} countTone="link" />
                    </span>
                ) : null}
                {hasRating && metaSegments.length > 0 ? (
                    <span aria-hidden="true" className="mx-1 shrink-0">
                        &middot;
                    </span>
                ) : null}
                {metaSegments.length > 0 ? (
                    <span className="min-w-0 truncate">
                        {metaSegments.map((seg, i) => (
                            <span key={seg.key}>
                                {i > 0 ? <span aria-hidden="true"> &middot; </span> : null}
                                {seg.node}
                            </span>
                        ))}
                    </span>
                ) : null}
            </div>
        )

    // List: roomier, one fact per line.
    const hasListLines = freeShipping || arrivalText || lowStock || showSoldText || sellerName || verifiedSeller
    const listMeta = hasListLines ? (
        <div className={cx('space-y-0.5', metaBase)}>
            {freeShipping || arrivalText ? (
                <p>
                    {freeShipping ? (
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">Free delivery</span>
                    ) : null}
                    {freeShipping && arrivalText ? ' ' : null}
                    {arrivalText ? <span>{arrivalText}</span> : null}
                </p>
            ) : null}
            {lowStock ? <p className={lowStockCls}>Only {stockLeft} left</p> : null}
            {showSoldText ? <p>{compactCount(soldCount as number)} sold</p> : null}
            {sellerName || verifiedSeller ? (
                <p className="flex items-center gap-1 truncate">
                    {sellerName ? <span className="truncate">by {sellerName}</span> : null}
                    {verifiedIcon}
                </p>
            ) : null}
        </div>
    ) : null

    const canAdd = Boolean(onAddToCart) && !outOfStock
    const cartIcon = addToCartLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    ) : (
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
    )

    const ctaPill = canAdd ? (
        <button
            type="button"
            onClick={() => onAddToCart?.(product)}
            disabled={addToCartLoading}
            aria-label={`Add ${title} to cart`}
            className={cx(
                'relative z-10 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary-700 px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-700 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-200 sm:h-9',
                BUTTON_FOCUS
            )}
        >
            {cartIcon}
            Add to cart
        </button>
    ) : null

    const cartIconBtn =
        canAdd && !isList && !showCta ? (
            <button
                type="button"
                onClick={() => onAddToCart?.(product)}
                disabled={addToCartLoading}
                aria-label={`Add ${title} to cart`}
                className={cx(
                    'relative z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-700 text-white transition-[background-color,opacity] before:absolute before:-inset-[2px] before:rounded-full before:content-[""] hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-700 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-200',
                    BUTTON_FOCUS,
                    HOVER_REVEAL
                )}
            >
                {cartIcon}
            </button>
        ) : null

    return (
        <article
            onPointerEnter={onPointerEnter}
            className={cx(
                'group relative min-w-0 rounded-lg border border-zinc-200 bg-white transition-[border-color,box-shadow] hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700',
                isList ? 'flex' : 'flex h-full flex-col',
                className
            )}
        >
            {stage}

            {isList ? (
                <div
                    className={cx(
                        'flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:gap-4',
                        compact ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3'
                    )}
                >
                    <div className="min-w-0 flex-1 space-y-1">
                        {titleEl}
                        {ratingEl}
                        {priceEl}
                        {progressEl}
                        {listMeta}
                    </div>
                    {ctaPill ? (
                        <div className="mt-1 sm:mt-0 sm:flex sm:w-44 sm:shrink-0 sm:flex-col sm:justify-end">
                            {ctaPill}
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className={cx('flex min-w-0 flex-col gap-1', compact ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3')}>
                    <div className="flex h-10 items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">{priceEl}</div>
                        {cartIconBtn}
                    </div>
                    {titleEl}
                    {gridMeta}
                    {showCta && ctaPill ? <div className="pt-1">{ctaPill}</div> : null}
                </div>
            )}
        </article>
    )
}
