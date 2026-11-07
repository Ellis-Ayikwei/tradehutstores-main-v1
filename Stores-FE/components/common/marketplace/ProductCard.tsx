'use client'

import { memo, useMemo, useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, Heart, ImageOff, Loader2 } from 'lucide-react'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { compareAttributeLabels } from '@/lib/variantLabel'
import Badge from './Badge'
import Countdown from './Countdown'
import PriceTag, { discountPercent } from './PriceTag'
import RatingStars from './RatingStars'
import VariantSwatches from './VariantSwatches'
import { colourGroups, priceSpan, type CardVariant } from './cardVariants'
import { cx } from './cx'

export type { CardVariant } from './cardVariants'

/** Display shape for a card. Map API rows into this at the call site. */
export interface MarketplaceProduct {
    id: string | number
    title: string
    href: string
    imageUrl?: string | null
    /** @deprecated Cards no longer swap images on hover; kept so existing mappers still compile. */
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
    /** e.g. "Mon, Nov 16". Shown after "FREE delivery" (or alone). */
    arrivalText?: string
    verifiedSeller?: boolean
    /** Store name, rendered as "by {sellerName}". Omit when the API does not provide it. */
    sellerName?: string
    /** Short promo label shown on the image, e.g. "Flash deal". */
    badge?: string
    /** ISO end time; shows an "Ends in" countdown line and marks the card as a time-limited deal. */
    endsAt?: string
    brand?: string
    category?: string
    /** "new" / "used" / "refurbished"; shown as a key spec in list mode. */
    condition?: string
    /**
     * Real variants of the product (see `cardVariantsFromRaw`). When two or more colours exist the card shows
     * colour swatches that swap image, price and the variant used by Add to cart. Omit when the API has none.
     */
    variants?: CardVariant[]
    /** Id of the default variant (preselected swatch in list mode). Falls back to the first colour. */
    defaultVariantId?: string
}

export interface ProductCardProps {
    product: MarketplaceProduct
    /** Pass CurrencyContext `formatDisplayPrice`. */
    formatPrice?: (amount: number) => string
    wishlisted?: boolean
    onToggleWishlist?: (product: MarketplaceProduct) => void
    /** `variant` is the selected swatch's variant when the card has one. */
    onAddToCart?: (product: MarketplaceProduct, variant?: CardVariant) => void
    addToCartLoading?: boolean
    onCountdownEnd?: (product: MarketplaceProduct) => void
    /** Set true for above-the-fold cards so the image is not lazy-loaded. */
    priority?: boolean
    /** Tighter spacing for dense listings. */
    compact?: boolean
    /** grid = borderless vertical card (default). list = full-width row with a divider. */
    variant?: 'grid' | 'list'
    /**
     * Mark as a real time-limited deal: solid red image badge and a claimed progress bar
     * (when sold + stock are both known). Defaults to true when `product.endsAt` is set.
     */
    deal?: boolean
    /** @deprecated No longer used (cards have no reserved meta row). */
    reserveMeta?: boolean
    /** @deprecated Grid cards never show Add to cart; list rows show it whenever `onAddToCart` is set. */
    showCta?: boolean
    /** Override the image `sizes` attribute (defaults to the standard grid sizes). Pass the real column width. */
    sizes?: string
    className?: string
}

const GRID_SIZES = '(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'
const LIST_SIZES = '(min-width: 768px) 240px, 160px'

/** True when a card would show a rating or a meta line. */
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

/** Off-screen cards skip layout and paint (up to 80 per page). The size hint keeps the scrollbar steady. */
const SKIP_OFFSCREEN_GRID = '[content-visibility:auto] [contain-intrinsic-size:200px_340px]'
const SKIP_OFFSCREEN_LIST = '[content-visibility:auto] [contain-intrinsic-size:600px_200px]'

const LINK_CLS =
    'outline-none after:absolute after:inset-0 after:content-[""] hover:text-primary-700 hover:underline dark:hover:text-primary-400 focus-visible:after:ring-2 focus-visible:after:ring-primary-700 dark:focus-visible:after:ring-primary-400'

interface Spec {
    label: string
    value: string
}

function ProductCard({
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
    sizes,
    className,
}: ProductCardProps) {
    const {
        title,
        href,
        imageUrl,
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
        brand,
        category,
        condition,
        variants,
        defaultVariantId,
    } = product

    const isList = variant === 'list'

    // ── Variant swatches ──────────────────────────────────────────────────────
    const groups = useMemo(() => colourGroups(variants), [variants])
    const defaultKey = useMemo(() => {
        const d = defaultVariantId ? groups.find(g => g.variants.some(v => v.id === defaultVariantId)) : undefined
        return (d ?? groups[0])?.key ?? null
    }, [groups, defaultVariantId])
    // Grid starts with nothing selected (range price, main photo, like Amazon); the list row starts on the default colour.
    const [picked, setPicked] = useState<string | null>(null)
    const selectedKey = picked ?? (isList ? defaultKey : null)
    const group = groups.find(g => g.key === selectedKey) ?? null
    const selected: CardVariant | null = group?.lead ?? null
    const needsOptions = Boolean(group && group.variants.length > 1)

    let shownPrice = price
    let shownOriginal = originalPrice
    let maxPrice: number | undefined
    if (group) {
        const span = priceSpan(group.variants)
        shownPrice = span.min
        if (span.max > span.min) {
            maxPrice = span.max
            shownOriginal = undefined
        } else {
            shownOriginal = group.lead.originalPrice
        }
    } else if (groups.length > 0 && variants) {
        const span = priceSpan(variants)
        if (span.max > span.min) {
            shownPrice = span.min
            maxPrice = span.max
            shownOriginal = undefined
        }
    }

    const [failedSrc, setFailedSrc] = useState<string | null>(null)
    const src = resolveMediaSrc(selected?.imageUrl || imageUrl)
    const imgFailed = failedSrc === src

    const stock = selected?.stock !== undefined ? selected.stock : stockLeft
    const outOfStock = stock === 0
    const lowStock = stock !== undefined && stock > 0 && stock <= 5
    const pct = maxPrice === undefined ? discountPercent(shownPrice, shownOriginal) : 0
    const isDeal = deal ?? Boolean(endsAt)

    // Image badge: only a custom label or a real time-limited deal. Everything else shows "-23%" next to the price.
    const pctBadge = !badge && pct > 0 && isDeal
    const imageBadgeText = badge ?? (pctBadge ? `-${pct}%` : undefined)
    const inlineDiscount = pct > 0 && !pctBadge

    const showProgress =
        isDeal && soldCount !== undefined && stock !== undefined && stock > 0 && soldCount + stock > 0
    const progressPct = showProgress ? Math.min(100, Math.round((soldCount / (soldCount + stock)) * 100)) : 0
    const showSoldText = soldCount !== undefined && soldCount > 0
    const imageSizes = sizes ?? (isList ? LIST_SIZES : GRID_SIZES)
    const hasRating = rating !== undefined && rating > 0

    // ── Pieces ───────────────────────────────────────────────────────────────

    const stage = (
        <div
            className={cx(
                'relative shrink-0 overflow-hidden bg-zinc-100 dark:bg-zinc-800',
                isList ? 'h-40 w-40 md:h-60 md:w-60' : 'aspect-square w-full rounded-md'
            )}
        >
            {src && !imgFailed ? (
                <Image
                    src={src}
                    alt={imageAlt ?? title}
                    fill
                    sizes={imageSizes}
                    quality={75}
                    priority={priority}
                    loading={priority ? undefined : 'lazy'}
                    onError={() => setFailedSrc(src)}
                    className={cx(
                        'object-contain object-center mix-blend-multiply dark:mix-blend-normal',
                        isList ? 'p-3' : 'p-2',
                        outOfStock && 'grayscale'
                    )}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-zinc-500 dark:text-zinc-400">
                    <ImageOff className="h-8 w-8" aria-hidden="true" />
                    <span className="sr-only">No image available</span>
                </div>
            )}

            {imageBadgeText ? (
                <Badge
                    variant={isDeal || pctBadge ? 'danger' : 'dark'}
                    radius="sm"
                    className="pointer-events-none absolute left-1.5 top-1.5"
                >
                    {imageBadgeText}
                </Badge>
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
                        'absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 before:absolute before:-inset-1.5 before:content-[""] hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800',
                        BUTTON_FOCUS
                    )}
                >
                    <Heart
                        className={cx(
                            'h-4 w-4',
                            wishlisted ? 'fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400' : ''
                        )}
                        aria-hidden="true"
                    />
                </button>
            ) : null}
        </div>
    )

    const titleEl = isList ? (
        <h3 className="line-clamp-3 text-base font-normal leading-6 text-zinc-900 dark:text-zinc-100">
            <Link href={href} className={LINK_CLS}>
                {title}
            </Link>
        </h3>
    ) : (
        <h3 className="line-clamp-4 text-sm font-normal leading-5 text-sky-800 dark:text-sky-400">
            <Link href={href} className={LINK_CLS}>
                {title}
            </Link>
        </h3>
    )

    const ratingEl = hasRating ? (
        <div className="flex items-center">
            <RatingStars
                rating={rating as number}
                count={reviewCount}
                countTone="link"
                showValue={isList}
                bracketed={isList}
                className="shrink-0 text-sm"
            />
        </div>
    ) : null

    const socialEl = showSoldText ? (
        <p className="text-sm leading-5 text-zinc-600 dark:text-zinc-400">{compactCount(soldCount as number)} sold</p>
    ) : null

    const priceEl = (
        <PriceTag
            price={shownPrice}
            maxPrice={maxPrice}
            originalPrice={maxPrice === undefined ? shownOriginal : undefined}
            formatPrice={formatPrice}
            layout="amazon"
            size={isList ? 'md' : 'sm'}
            showDiscount={inlineDiscount}
        />
    )

    const progressBar = showProgress ? (
        <div className="flex items-center gap-1.5 text-xs leading-4 text-zinc-600 dark:text-zinc-400">
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
        </div>
    ) : null

    const countdownEl =
        endsAt && !outOfStock ? (
            <div className="truncate">
                <Countdown
                    endsAt={endsAt}
                    variant="inline"
                    label="Ends in"
                    onEnd={onCountdownEnd ? () => onCountdownEnd(product) : undefined}
                    className="!text-xs !leading-4 text-red-600 dark:text-red-400"
                />
            </div>
        ) : null

    // Delivery / stock / seller lines: real data only.
    const sizeCls = isList ? 'text-sm leading-5' : 'text-xs leading-4'
    const verifiedIcon = verifiedSeller ? (
        <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-emerald-700 dark:text-emerald-400">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {sellerName ? <span className="sr-only">Verified seller</span> : 'Verified seller'}
        </span>
    ) : null
    const hasDeliveryLines = freeShipping || arrivalText || lowStock || sellerName || verifiedSeller
    const deliveryEl = hasDeliveryLines ? (
        <div className={cx('space-y-0.5 text-zinc-700 dark:text-zinc-300', sizeCls)}>
            {freeShipping || arrivalText ? (
                <p>
                    {freeShipping ? 'FREE delivery' : null}
                    {freeShipping && arrivalText ? ' ' : null}
                    {arrivalText ? <span className="font-bold">{arrivalText}</span> : null}
                </p>
            ) : null}
            {lowStock ? (
                <p
                    className={cx(
                        'font-medium',
                        (stock as number) <= 3 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                    )}
                >
                    Only {stock} left
                </p>
            ) : null}
            {sellerName || verifiedSeller ? (
                <p className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                    {sellerName ? <span className="truncate">by {sellerName}</span> : null}
                    {verifiedIcon}
                </p>
            ) : null}
        </div>
    ) : null

    const swatchesEl =
        groups.length > 0 ? (
            <VariantSwatches
                groups={groups}
                selectedKey={selectedKey}
                onSelect={setPicked}
                label={`Colour options for ${title}`}
                className="-ml-0.5"
            />
        ) : null

    // ── List-only pieces ──────────────────────────────────────────────────────

    const specs = useMemo<Spec[]>(() => {
        if (!isList) return []
        const out: Spec[] = []
        const seen = new Set<string>()
        const add = (label: string, value: string | undefined | null) => {
            const v = (value ?? '').trim()
            const k = label.trim().toLowerCase()
            if (!v || seen.has(k)) return
            seen.add(k)
            out.push({ label, value: v })
        }
        // Variant attributes only when that variant is unambiguous: a chosen swatch, or a product with one variant.
        const source = selected ?? (variants?.length === 1 ? variants[0] : null)
        for (const a of [...(source?.attributes ?? [])].sort((x, y) => compareAttributeLabels(x.label, y.label))) {
            add(a.label, a.value)
        }
        add('Brand', brand)
        add('Condition', condition)
        add('Category', category)
        return out.slice(0, 4)
    }, [isList, selected, variants, brand, condition, category])

    const specsEl =
        specs.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm leading-5 2xl:grid-cols-4">
                {specs.map(s => (
                    <div key={s.label} className="min-w-0">
                        <dt className="truncate text-zinc-600 dark:text-zinc-400">{s.label}</dt>
                        <dd className="break-words font-bold capitalize text-zinc-900 dark:text-zinc-100">{s.value}</dd>
                    </div>
                ))}
            </dl>
        ) : null

    const ctaCls =
        'relative z-10 inline-flex h-11 w-full max-w-xs items-center justify-center gap-1.5 rounded-full bg-primary-700 px-4 text-sm font-medium text-white hover:bg-primary-800 md:h-9 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-700 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-200'
    const ctaEl = !onAddToCart ? null : needsOptions ? (
        <Link href={href} className={cx(ctaCls, BUTTON_FOCUS)}>
            Select options
        </Link>
    ) : (
        <button
            type="button"
            onClick={() => onAddToCart(product, selected ?? undefined)}
            disabled={addToCartLoading || outOfStock}
            aria-label={`Add ${title} to cart`}
            className={cx(ctaCls, BUTTON_FOCUS)}
        >
            {addToCartLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {outOfStock ? 'Unavailable' : addToCartLoading ? 'Adding' : 'Add to cart'}
        </button>
    )

    // ── Layouts ───────────────────────────────────────────────────────────────

    if (isList) {
        return (
            <article
                className={cx(
                    'relative flex min-w-0 gap-3 border-b border-zinc-200 dark:border-zinc-800 sm:gap-4',
                    compact ? 'py-2' : 'py-3',
                    SKIP_OFFSCREEN_LIST,
                    className
                )}
            >
                {stage}
                <div className="grid min-w-0 flex-1 content-start gap-y-2 md:grid-cols-2 md:gap-x-8 2xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
                    <div className="min-w-0 space-y-1 md:col-span-2">
                        {brand ? <p className="truncate text-base font-bold leading-6 text-zinc-900 dark:text-zinc-100">{brand}</p> : null}
                        {titleEl}
                        {ratingEl}
                        {socialEl}
                    </div>
                    <div className="min-w-0 space-y-1 md:col-start-1">
                        {priceEl}
                        {progressBar}
                        {countdownEl}
                    </div>
                    {specsEl ? <div className="min-w-0 md:col-start-2 md:row-span-2 md:row-start-2">{specsEl}</div> : null}
                    <div className="min-w-0 space-y-2 md:col-start-1">
                        {deliveryEl}
                        {ctaEl}
                        {swatchesEl}
                    </div>
                </div>
            </article>
        )
    }

    const gridBits: ReactNode[] = [ratingEl, socialEl, priceEl, progressBar, deliveryEl, countdownEl, swatchesEl].filter(Boolean)

    return (
        <article className={cx('relative min-w-0 self-start pb-2', SKIP_OFFSCREEN_GRID, className)}>
            {stage}
            <div className="mt-2 space-y-1">
                {titleEl}
                {gridBits.map((node, i) => (
                    <div key={i}>{node}</div>
                ))}
            </div>
        </article>
    )
}

/**
 * Memoised: cards re-render only when their own props change. Parents must pass a stable `product` object
 * (useMemo the converted list) and stable callbacks; see CommerceProductCard for the connected version.
 */
export default memo(ProductCard)
