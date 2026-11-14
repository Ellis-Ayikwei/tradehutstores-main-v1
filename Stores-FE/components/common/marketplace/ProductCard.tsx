'use client'

import { memo, useMemo, useState } from 'react'
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
    /** e.g. "Mon, Nov 16". Shown after "FREE delivery", or alone. */
    arrivalText?: string
    verifiedSeller?: boolean
    /** Rendered as "by {sellerName}". */
    sellerName?: string
    /** Short promo label on the image, e.g. "Flash deal". */
    badge?: string
    /** ISO end time. Adds an "Ends in" countdown and makes the card a time-limited deal. */
    endsAt?: string
    brand?: string
    category?: string
    /** "new", "used" or "refurbished". Shown as a spec in list rows. */
    condition?: string
    /** From `cardVariantsFromRaw`. Two or more colours add swatches that swap the image, price and cart variant. */
    variants?: CardVariant[]
    /** Swatch preselected in list rows. Falls back to the first colour. */
    defaultVariantId?: string
}

export interface ProductCardProps {
    product: MarketplaceProduct
    /** Pass CurrencyContext `formatDisplayPrice`. */
    formatPrice?: (amount: number) => string
    wishlisted?: boolean
    onToggleWishlist?: (product: MarketplaceProduct) => void
    /** `variant` is passed when the card knows the exact variant. */
    onAddToCart?: (product: MarketplaceProduct, variant?: CardVariant) => void
    addToCartLoading?: boolean
    onCountdownEnd?: (product: MarketplaceProduct) => void
    /** Above-the-fold cards: load the image eagerly. */
    priority?: boolean
    /** List rows only: tighter vertical padding. */
    compact?: boolean
    /** grid: borderless vertical card (default). list: full-width row with a divider. */
    variant?: 'grid' | 'list'
    /** Red image badge and a claimed progress bar. Defaults to true when `product.endsAt` is set. */
    deal?: boolean
    /**
     * Show the cart button. Defaults to on for list rows and off for grid cards. Needs `onAddToCart`.
     * When the exact variant is unknown it becomes a "Select options" link to the product page.
     */
    showAddToCart?: boolean
    /** Image `sizes`. Pass the real column width when the layout differs from the standard grid or list. */
    sizes?: string
    className?: string
}

const GRID_SIZES = '(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'
const LIST_SIZES = '(min-width: 768px) 240px, 160px'

const BUTTON_FOCUS =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-primary-400 dark:focus-visible:ring-offset-zinc-900'

/** Skip rendering off-screen cards. The intrinsic size keeps the scrollbar stable. */
const SKIP_OFFSCREEN_GRID = '[content-visibility:auto] [contain-intrinsic-size:200px_340px]'
const SKIP_OFFSCREEN_LIST = '[content-visibility:auto] [contain-intrinsic-size:600px_200px]'

/**
 * Stretched link: the whole card is clickable. The focus ring is inset because content-visibility applies
 * paint containment, which clips anything drawn outside the card.
 */
const LINK_CLS =
    'outline-none after:absolute after:inset-0 after:content-[""] hover:text-primary-700 hover:underline dark:hover:text-primary-400 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-primary-700 dark:focus-visible:after:ring-primary-400'

const CTA_BASE = 'relative z-10 inline-flex items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium'
// Grid: full width only on phones (44px tap target); from sm up it is a compact pill so 40 cards are not a wall of buttons.
const CTA_GRID = 'h-11 w-full sm:h-8 sm:w-auto sm:text-[13px]'
const CTA_LIST = 'h-11 w-full max-w-xs md:h-9'
const CTA_PRIMARY =
    'bg-primary-700 text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-700 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-200'
// "Select options" only navigates to the product page, so it takes the secondary style.
const CTA_SECONDARY =
    'border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'

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

type ColourGroup = ReturnType<typeof colourGroups>[number]

interface ShownPrice {
    price: number
    maxPrice?: number
    originalPrice?: number
}

/** The picked colour's price or range, else the range across all variants, else the product price. */
function displayPrice(product: MarketplaceProduct, group: ColourGroup | null, hasGroups: boolean): ShownPrice {
    if (group) {
        const { min, max } = priceSpan(group.variants)
        return max > min ? { price: min, maxPrice: max } : { price: min, originalPrice: group.lead.originalPrice }
    }
    if (hasGroups && product.variants) {
        const { min, max } = priceSpan(product.variants)
        if (max > min) return { price: min, maxPrice: max }
    }
    return { price: product.price, originalPrice: product.originalPrice }
}

interface Spec {
    label: string
    value: string
}

/** Up to four specs for list rows: the variant's attributes first, then brand, condition and category. */
function listSpecs(variant: CardVariant | undefined, { brand, condition, category }: MarketplaceProduct): Spec[] {
    const specs: Spec[] = []
    const seen = new Set<string>()
    const add = (label: string, value: string | null | undefined) => {
        const v = value?.trim()
        const key = label.trim().toLowerCase()
        if (!v || seen.has(key)) return
        seen.add(key)
        specs.push({ label, value: v })
    }
    const attributes = [...(variant?.attributes ?? [])].sort((a, b) => compareAttributeLabels(a.label, b.label))
    for (const a of attributes) add(a.label, a.value)
    add('Brand', brand)
    add('Condition', condition)
    add('Category', category)
    return specs.slice(0, 4)
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
    showAddToCart,
    sizes,
    className,
}: ProductCardProps) {
    const {
        title,
        href,
        imageUrl,
        imageAlt,
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
        variants,
        defaultVariantId,
    } = product
    const isList = variant === 'list'

    // Grid cards start with no colour picked (price range, main photo). List rows start on the default colour.
    const groups = useMemo(() => colourGroups(variants), [variants])
    const [picked, setPicked] = useState<string | null>(null)
    const defaultGroup =
        (defaultVariantId ? groups.find(g => g.variants.some(v => v.id === defaultVariantId)) : undefined) ?? groups[0]
    const selectedKey = picked ?? (isList ? (defaultGroup?.key ?? null) : null)
    const group = groups.find(g => g.key === selectedKey) ?? null
    const selected = group?.lead
    // Lead of the picked colour, else the product's only variant.
    const activeVariant = selected ?? (variants?.length === 1 ? variants[0] : undefined)
    // Several candidates (sizes within a colour, or no colour picked yet): the buyer chooses on the product page.
    const needsChoice = (group?.variants ?? variants ?? []).length > 1

    const shown = displayPrice(product, group, groups.length > 0)
    const pct = shown.maxPrice === undefined ? discountPercent(shown.price, shown.originalPrice) : 0

    const [failedSrc, setFailedSrc] = useState<string | null>(null)
    const src = resolveMediaSrc(selected?.imageUrl || imageUrl)
    const imgFailed = failedSrc === src

    const stock = selected?.stock ?? stockLeft
    const outOfStock = stock === 0
    const lowStockCount = stock !== undefined && stock > 0 && stock <= 5 ? stock : undefined
    const isDeal = deal ?? Boolean(endsAt)

    // The image badge is for a custom label or a real time-limited deal. Other discounts sit next to the price.
    const pctOnImage = !badge && pct > 0 && isDeal
    const imageBadgeText = badge ?? (pctOnImage ? `-${pct}%` : undefined)

    const progressPct =
        isDeal && soldCount !== undefined && stock !== undefined && stock > 0 && soldCount + stock > 0
            ? Math.min(100, Math.round((soldCount / (soldCount + stock)) * 100))
            : undefined

    const media = (
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
                    sizes={sizes ?? (isList ? LIST_SIZES : GRID_SIZES)}
                    priority={priority}
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
                    variant={isDeal ? 'danger' : 'dark'}
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
                        'absolute right-1.5 top-1.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-700 before:absolute before:-inset-1.5 before:content-[""] hover:text-zinc-900 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-white',
                        BUTTON_FOCUS
                    )}
                >
                    <Heart
                        className={cx(
                            'h-4 w-4',
                            wishlisted && 'fill-red-600 text-red-600 dark:fill-red-400 dark:text-red-400'
                        )}
                        aria-hidden="true"
                    />
                </button>
            ) : null}
        </div>
    )

    const titleEl = (
        <h3
            className={cx(
                'line-clamp-2 font-normal text-zinc-900 dark:text-zinc-100',
                isList ? 'text-base leading-6' : 'min-h-10 text-sm leading-5'
            )}
        >
            <Link href={href} className={LINK_CLS}>
                {title}
            </Link>
        </h3>
    )

    const ratingEl =
        rating !== undefined && rating > 0 ? (
            <div className="flex items-center">
                <RatingStars
                    rating={rating}
                    count={reviewCount}
                    countTone="link"
                    showValue={isList}
                    bracketed={isList}
                    className="shrink-0 text-sm"
                />
            </div>
        ) : null

    const soldEl =
        soldCount !== undefined && soldCount > 0 ? (
            <p className={cx('text-zinc-600 dark:text-zinc-400', isList ? 'text-sm leading-5' : 'text-xs leading-4')}>{compactCount(soldCount)} sold</p>
        ) : null

    const priceEl = (
        <PriceTag
            price={shown.price}
            maxPrice={shown.maxPrice}
            originalPrice={shown.originalPrice}
            formatPrice={formatPrice}
            layout="amazon"
            size={isList ? 'md' : 'sm'}
            showDiscount={pct > 0 && !pctOnImage}
        />
    )

    const progressEl =
        progressPct !== undefined ? (
            <div
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${progressPct}% claimed`}
                className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
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

    const hasDeliveryLines = freeShipping || arrivalText || lowStockCount !== undefined || sellerName || verifiedSeller
    const deliveryEl = hasDeliveryLines ? (
        <div
            className={cx(
                'space-y-0.5 text-zinc-700 dark:text-zinc-300',
                isList ? 'text-sm leading-5' : 'text-xs leading-4'
            )}
        >
            {freeShipping || arrivalText ? (
                <p>
                    {freeShipping ? 'FREE delivery' : null}
                    {freeShipping && arrivalText ? ' ' : null}
                    {arrivalText ? <span className="font-bold">{arrivalText}</span> : null}
                </p>
            ) : null}
            {lowStockCount !== undefined ? (
                <p
                    className={cx(
                        'font-medium',
                        lowStockCount <= 3 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'
                    )}
                >
                    Only {lowStockCount} left
                </p>
            ) : null}
            {sellerName || verifiedSeller ? (
                <p className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                    {sellerName ? <span className="truncate">by {sellerName}</span> : null}
                    {verifiedSeller ? (
                        <span className="inline-flex shrink-0 items-center gap-0.5 font-medium text-emerald-700 dark:text-emerald-400">
                            <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            {sellerName ? <span className="sr-only">Verified seller</span> : 'Verified seller'}
                        </span>
                    ) : null}
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

    const ctaEl =
        !onAddToCart || !(showAddToCart ?? isList) ? null : needsChoice ? (
            <Link href={href} className={cx(CTA_BASE, isList ? CTA_LIST : CTA_GRID, CTA_SECONDARY, BUTTON_FOCUS)}>
                Select options
            </Link>
        ) : (
            <button
                type="button"
                onClick={() => onAddToCart(product, activeVariant)}
                disabled={addToCartLoading || outOfStock}
                aria-label={`Add ${title} to cart`}
                className={cx(CTA_BASE, isList ? CTA_LIST : CTA_GRID, CTA_PRIMARY, BUTTON_FOCUS)}
            >
                {addToCartLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                {outOfStock ? 'Unavailable' : addToCartLoading ? 'Adding' : 'Add to cart'}
            </button>
        )

    if (isList) {
        const specs = listSpecs(activeVariant, product)
        return (
            <article
                className={cx(
                    'relative flex min-w-0 gap-3 border-b border-zinc-200 dark:border-zinc-800 sm:gap-4',
                    compact ? 'py-2' : 'py-3',
                    SKIP_OFFSCREEN_LIST,
                    className
                )}
            >
                {media}
                <div className="grid min-w-0 flex-1 content-start gap-y-2 md:grid-cols-2 md:gap-x-8 2xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
                    <div className="min-w-0 space-y-1 md:col-span-2">
                        {brand ? (
                            <p className="truncate text-base font-bold leading-6 text-zinc-900 dark:text-zinc-100">
                                {brand}
                            </p>
                        ) : null}
                        {titleEl}
                        {ratingEl}
                        {soldEl}
                    </div>
                    <div className="min-w-0 space-y-1 md:col-start-1">
                        {priceEl}
                        {progressEl}
                        {countdownEl}
                    </div>
                    {specs.length > 0 ? (
                        <div className="min-w-0 md:col-start-2 md:row-span-2 md:row-start-2">
                            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm leading-5 2xl:grid-cols-4">
                                {specs.map(s => (
                                    <div key={s.label} className="min-w-0">
                                        <dt className="truncate text-zinc-600 dark:text-zinc-400">{s.label}</dt>
                                        <dd className="break-words font-bold capitalize text-zinc-900 dark:text-zinc-100">
                                            {s.value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    ) : null}
                    <div className="min-w-0 space-y-2 md:col-start-1">
                        {deliveryEl}
                        {ctaEl}
                        {swatchesEl}
                    </div>
                </div>
            </article>
        )
    }

    return (
        <article className={cx('relative flex h-full min-w-0 flex-col pb-2', SKIP_OFFSCREEN_GRID, className)}>
            {media}
            <div className="mt-2 flex flex-1 flex-col gap-1">
                {titleEl}
                {ratingEl}
                {soldEl}
                {priceEl}
                {progressEl}
                {deliveryEl}
                {countdownEl}
                {swatchesEl}
                {ctaEl ? <div className="mt-auto pt-2">{ctaEl}</div> : null}
            </div>
        </article>
    )
}

/**
 * Memoised: a card re-renders only when its own props change, so pass a stable `product` (useMemo the mapped
 * list) and stable callbacks. CommerceProductCard is the connected version.
 */
export default memo(ProductCard)