'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Link from 'next/link'
import Image from 'next/image'
import { ImageOff, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import { RootState, AppDispatch } from '@/store'
import MainLayout from '@/components/Layouts/MainLayout'
import { ProductCard } from '@/components/common/marketplace'
import type { MarketplaceProduct } from '@/components/common/marketplace'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useStoreConfig } from '@/contexts/StoreConfigContext'
import { removeFromCart, updateCart } from '@/store/cartSlice'
import { addToWishlist } from '@/store/wishListSlice'
import { wishlistItemProductId } from '@/lib/wishlistUtils'
import { validatePromo, type PromoResult } from '@/lib/promos'
import { savePromoCode } from '@/lib/checkoutApi'
import { Money, Price } from '@/app/checkout/_components/Money'
import PromoField from '@/app/checkout/_components/PromoField'
import { Banner, CARD, FOCUS, LINK_BTN } from '@/app/checkout/_components/ui'
import { normaliseCartLine, toNumber } from '@/app/checkout/_components/cartLines'
import type { CartLineView, RawCartLine } from '@/app/checkout/_components/cartLines'

const itemsLabel = (n: number) => `${n} ${n === 1 ? 'item' : 'items'}`

const MUTED = 'text-zinc-600 dark:text-zinc-400'

// ─── Line item ─────────────────────────────────────────────────────────────────

interface LineRowProps {
    line: CartLineView
    quantity: number
    busy: boolean
    formatPrice: (n: number) => string
    onQuantity: (line: CartLineView, next: number) => void
    onRemove: (line: CartLineView) => void
    onSave: (line: CartLineView) => void
}

const STEP_BTN = `flex h-full w-11 items-center justify-center rounded-full hover:bg-zinc-200 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:hover:bg-transparent dark:hover:bg-zinc-700 dark:disabled:text-zinc-500 sm:w-8 ${FOCUS}`

function LineRow({ line, quantity, busy, formatPrice, onQuantity, onRemove, onSave }: LineRowProps) {
    const atMax = line.stockLeft !== undefined && quantity >= line.stockLeft
    const price =
        line.unit !== undefined ? (
            <Price amount={line.unit} original={line.list} format={formatPrice} size="md" showDiscount />
        ) : (
            <span className={`text-sm ${MUTED}`}>Price at checkout</span>
        )

    return (
        <li className={`flex gap-3 py-3 sm:gap-4 sm:py-4 ${busy ? 'pointer-events-none' : ''}`} aria-busy={busy}>
            <Link
                href={line.href}
                aria-label={line.name}
                className={`relative aspect-square w-[88px] shrink-0 self-start overflow-hidden rounded-md bg-zinc-50 dark:bg-zinc-800 sm:w-[120px] ${FOCUS}`}
            >
                {line.imageSrc ? (
                    <Image
                        src={line.imageSrc}
                        alt={line.name}
                        fill
                        sizes="(min-width: 640px) 120px, 88px"
                        className={`object-contain p-1.5 ${line.outOfStock ? 'grayscale' : ''}`}
                    />
                ) : (
                    <span className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <ImageOff className="h-7 w-7" aria-hidden="true" />
                        <span className="sr-only">No image available</span>
                    </span>
                )}
            </Link>

            <div className="min-w-0 flex-1 sm:flex sm:gap-4">
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-normal leading-snug text-zinc-900 dark:text-zinc-100 sm:text-base">
                        <Link
                            href={line.href}
                            className={`line-clamp-2 hover:text-primary-700 hover:underline dark:hover:text-primary-400 ${FOCUS}`}
                        >
                            {line.name}
                        </Link>
                    </h2>

                    <div className="mt-1 sm:hidden">{price}</div>

                    <div className="mt-1 space-y-0.5 text-xs leading-4">
                        {line.outOfStock ? (
                            <p className="font-medium text-red-700 dark:text-red-400">Out of stock</p>
                        ) : line.stockLeft !== undefined && line.stockLeft <= 5 ? (
                            <p className="font-medium text-red-700 dark:text-red-400">Only {line.stockLeft} left</p>
                        ) : line.inStock ? (
                            <p className="font-medium text-emerald-700 dark:text-emerald-400">In stock</p>
                        ) : null}
                        {line.soldBy ? <p className={MUTED}>Sold by {line.soldBy}</p> : null}
                        {line.variantText ? <p className={MUTED}>{line.variantText}</p> : null}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <div
                            role="group"
                            aria-label={`Quantity for ${line.name}`}
                            className="inline-flex h-11 items-center rounded-full border border-zinc-300 bg-zinc-50 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 sm:h-8"
                        >
                            <span className={`pl-3 pr-1 ${MUTED}`}>Qty:</span>
                            <button
                                type="button"
                                onClick={() => onQuantity(line, quantity - 1)}
                                disabled={busy}
                                aria-label={quantity <= 1 ? `Remove ${line.name}` : 'Decrease quantity'}
                                className={STEP_BTN}
                            >
                                {quantity <= 1 ? (
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                ) : (
                                    <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                                )}
                            </button>
                            <span className="min-w-[1.5rem] text-center font-semibold tabular-nums" aria-live="polite">
                                {quantity}
                            </span>
                            <button
                                type="button"
                                onClick={() => onQuantity(line, quantity + 1)}
                                disabled={busy || atMax}
                                aria-label="Increase quantity"
                                className={STEP_BTN}
                            >
                                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                        </div>

                        <span className="hidden h-4 w-px bg-zinc-300 dark:bg-zinc-700 sm:block" aria-hidden="true" />
                        <button type="button" onClick={() => onRemove(line)} disabled={busy} className={LINK_BTN}>
                            Delete
                        </button>
                        {line.productId ? (
                            <>
                                <span className="hidden h-4 w-px bg-zinc-300 dark:bg-zinc-700 sm:block" aria-hidden="true" />
                                <button type="button" onClick={() => onSave(line)} disabled={busy} className={LINK_BTN}>
                                    Save for later
                                </button>
                            </>
                        ) : null}
                    </div>
                </div>

                <div className="hidden shrink-0 text-right sm:block sm:w-32">
                    <div className="flex justify-end">{price}</div>
                </div>
            </div>
        </li>
    )
}

// ─── Checkout card ─────────────────────────────────────────────────────────────

interface CheckoutCardProps {
    itemCount: number
    subtotal: number
    promoDiscount: number
    freeShippingThreshold: number | null
    qualifiesForFreeShipping: boolean
    taxLine: { label: string; amount: number } | null
    formatPrice: (n: number) => string
    appliedPromo: PromoResult | null
    onApplyPromo: (code: string) => Promise<string | null>
    onRemovePromo: () => void
    disabled: boolean
}

function CheckoutCard({
    itemCount,
    subtotal,
    promoDiscount,
    freeShippingThreshold,
    qualifiesForFreeShipping,
    taxLine,
    formatPrice,
    appliedPromo,
    onApplyPromo,
    onRemovePromo,
    disabled,
}: CheckoutCardProps) {
    const afterPromo = Math.max(0, subtotal - promoDiscount)
    const remaining = freeShippingThreshold !== null ? Math.max(0, freeShippingThreshold - afterPromo) : 0
    const progress =
        freeShippingThreshold !== null && freeShippingThreshold > 0
            ? Math.min(100, Math.round((afterPromo / freeShippingThreshold) * 100))
            : 0

    return (
        <div className={`${CARD} p-3 sm:p-4 lg:sticky lg:top-28`}>
            {freeShippingThreshold !== null ? (
                <div className="mb-3">
                    {qualifiesForFreeShipping ? (
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                            Your order qualifies for FREE delivery.
                        </p>
                    ) : (
                        <>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                Add{' '}
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    {formatPrice(remaining)}
                                </span>{' '}
                                of eligible items for FREE delivery.
                            </p>
                            <div
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={progress}
                                aria-label="Progress towards free delivery"
                                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700"
                            >
                                <div
                                    className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </>
                    )}
                </div>
            ) : null}

            <p className="flex flex-wrap items-baseline gap-x-1.5 text-base text-zinc-900 dark:text-zinc-100 sm:text-lg">
                <span>Subtotal ({itemsLabel(itemCount)}):</span>
                <Price amount={subtotal} format={formatPrice} size="md" />
            </p>

            <dl className="mt-2 space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
                {promoDiscount > 0 ? (
                    <div className="flex justify-between gap-2">
                        <dt>Promo discount</dt>
                        <dd className="font-medium text-emerald-700 dark:text-emerald-400">
                            -<Money amount={promoDiscount} format={formatPrice} />
                        </dd>
                    </div>
                ) : null}
                <div className="flex justify-between gap-2">
                    <dt>{taxLine ? taxLine.label : 'Tax'}</dt>
                    <dd className={taxLine ? 'font-medium text-zinc-900 dark:text-zinc-100' : MUTED}>
                        {taxLine ? <Money amount={taxLine.amount} format={formatPrice} /> : 'Calculated at checkout'}
                    </dd>
                </div>
                <div className="flex justify-between gap-2">
                    <dt>Delivery</dt>
                    <dd className={qualifiesForFreeShipping ? 'font-medium text-emerald-700 dark:text-emerald-400' : MUTED}>
                        {qualifiesForFreeShipping ? 'FREE' : 'Calculated at checkout'}
                    </dd>
                </div>
            </dl>

            <div className="mt-3">
                <PromoField
                    applied={appliedPromo ? { code: appliedPromo.code, note: appliedPromo.description || undefined } : null}
                    onApply={onApplyPromo}
                    onRemove={onRemovePromo}
                    disabled={disabled}
                />
            </div>

            <Link
                href="/checkout"
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : undefined}
                className={`mt-3 flex h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold sm:text-base ${FOCUS} ${
                    disabled
                        ? 'pointer-events-none bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300'
                        : 'bg-primary-700 text-white hover:bg-primary-800'
                }`}
            >
                Proceed to checkout
            </Link>
            <Link
                href="/products"
                className={`mt-1 flex min-h-[44px] items-center justify-center text-sm text-primary-700 hover:text-primary-800 hover:underline dark:text-primary-400 dark:hover:text-primary-300 ${FOCUS}`}
            >
                Continue shopping
            </Link>
        </div>
    )
}

// ─── Skeleton / empty ──────────────────────────────────────────────────────────

const SK = 'bg-zinc-200 dark:bg-zinc-700'

function CartSkeleton() {
    return (
        <div
            role="status"
            aria-label="Loading your cart"
            className="flex animate-pulse flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"
        >
            <div className={`order-last ${CARD} p-3 sm:p-4 lg:order-none`}>
                <div className={`mb-3 h-6 w-40 rounded ${SK}`} />
                <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="flex gap-3 py-3 sm:gap-4 sm:py-4">
                            <div className="aspect-square w-[88px] shrink-0 rounded-md bg-zinc-100 dark:bg-zinc-800 sm:w-[120px]" />
                            <div className="flex-1 space-y-2">
                                <div className={`h-4 w-11/12 rounded ${SK}`} />
                                <div className={`h-4 w-2/3 rounded ${SK}`} />
                                <div className={`h-3 w-16 rounded ${SK}`} />
                                <div className={`h-8 w-40 rounded-full ${SK}`} />
                            </div>
                            <div className={`hidden h-6 w-24 rounded ${SK} sm:block`} />
                        </div>
                    ))}
                </div>
            </div>
            <div className={`${CARD} p-3 sm:p-4 lg:self-start`}>
                <div className={`h-6 w-3/4 rounded ${SK}`} />
                <div className={`mt-3 h-4 w-1/2 rounded ${SK}`} />
                <div className={`mt-2 h-4 w-2/3 rounded ${SK}`} />
                <div className={`mt-4 h-11 w-full rounded-full ${SK}`} />
            </div>
        </div>
    )
}

type RecommendationRow = {
    id?: string | number
    name?: string
    main_product_image?: string | null
    price?: string | number | null
    final_price?: string | number | null
    rating?: string | number | null
    total_reviews?: number | null
    available?: boolean
}

function toRecommendation(row: RecommendationRow): MarketplaceProduct | null {
    if (row.id === undefined || row.id === null || !row.name) return null
    const pay = toNumber(row.final_price) ?? toNumber(row.price)
    if (pay === undefined) return null
    const list = toNumber(row.price)
    const rating = toNumber(row.rating)
    const reviews = toNumber(row.total_reviews)
    return {
        id: row.id,
        title: row.name,
        href: `/products/${row.id}`,
        imageUrl: row.main_product_image ?? null,
        price: pay,
        originalPrice: list !== undefined && list > pay ? list : undefined,
        rating: rating !== undefined && rating > 0 ? rating : undefined,
        reviewCount: reviews !== undefined && reviews > 0 ? reviews : undefined,
        stockLeft: row.available === false ? 0 : undefined,
    }
}

function EmptyCart({
    formatPrice,
    recommendations,
}: {
    formatPrice: (n: number) => string
    recommendations: MarketplaceProduct[]
}) {
    return (
        <div className="space-y-3 lg:space-y-4">
            <div className={`flex flex-col items-center ${CARD} px-4 py-6 text-center sm:py-8`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    <ShoppingCart className="h-6 w-6" aria-hidden="true" />
                </span>
                <h1 className="mt-2 font-syne text-xl font-bold text-zinc-900 dark:text-zinc-100">Your cart is empty</h1>
                <p className={`mt-1 max-w-xs text-sm ${MUTED}`}>Add items to your cart and they will show up here.</p>
                <Link
                    href="/products"
                    className={`mt-3 inline-flex h-11 items-center justify-center rounded-full bg-primary-700 px-6 text-sm font-semibold text-white hover:bg-primary-800 ${FOCUS}`}
                >
                    Continue shopping
                </Link>
            </div>

            {recommendations.length > 0 ? (
                <section aria-labelledby="cart-picks" className={`${CARD} p-3 sm:p-4`}>
                    <h2
                        id="cart-picks"
                        className="mb-2 font-syne text-base font-bold text-zinc-900 dark:text-zinc-100 sm:text-lg"
                    >
                        Picks for you
                    </h2>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
                        {recommendations.map((p) => (
                            <ProductCard key={p.id} product={p} compact formatPrice={formatPrice} />
                        ))}
                    </div>
                </section>
            ) : null}
        </div>
    )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CartPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { cart, isUpdating: cartLoading } = useSelector((state: RootState) => state.cart)
    const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlist.items)
    const productsState = useSelector((state: RootState) => state.products)
    const { formatDisplayPrice } = useCurrency()
    const { config: storeConfig } = useStoreConfig()

    const [hydrated, setHydrated] = useState(false)
    useEffect(() => setHydrated(true), [])

    const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null)
    // Optimistic quantities (line id -> desired qty). Controls stay disabled while a line has one.
    const [pendingQty, setPendingQty] = useState<Record<string, number>>({})
    // Lines mid-remove / mid-save.
    const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
    const [error, setError] = useState<{ message: string; retry: () => void } | null>(null)
    const [notice, setNotice] = useState<string | null>(null)

    // Store config: no invented numbers. Free-shipping and tax lines render only when the BE provides them.
    const freeShippingThreshold: number | null =
        typeof storeConfig?.shipping_free_threshold === 'number' && storeConfig.shipping_free_threshold > 0
            ? storeConfig.shipping_free_threshold
            : null
    const taxRate: number | null =
        typeof storeConfig?.tax_default_rate === 'number' ? storeConfig.tax_default_rate / 100 : null
    const taxInclusive = storeConfig?.tax_mode === 'inclusive'

    const lines = useMemo(() => (cart.items as unknown as RawCartLine[]).map(normaliseCartLine), [cart.items])

    // Drop optimistic values once the store has caught up (or the line is gone).
    useEffect(() => {
        setPendingQty((prev) => {
            const ids = Object.keys(prev)
            if (ids.length === 0) return prev
            let changed = false
            const next = { ...prev }
            for (const id of ids) {
                const line = lines.find((l) => l.id === id)
                if (!line || line.quantity === prev[id]) {
                    delete next[id]
                    changed = true
                }
            }
            return changed ? next : prev
        })
    }, [lines])

    const displayQty = useCallback((l: CartLineView) => pendingQty[l.id] ?? l.quantity, [pendingQty])
    const isBusy = useCallback((id: string) => id in pendingQty || busyIds.has(id), [pendingQty, busyIds])

    // ─── Derived totals (use the displayed quantity so totals never flicker) ─────
    const itemCount = lines.reduce((acc, l) => acc + displayQty(l), 0)
    const subtotal = lines.reduce((acc, l) => acc + (l.unit ?? 0) * displayQty(l), 0)
    const promoDiscount = appliedPromo?.valid ? Math.max(0, toNumber(appliedPromo.discount_amount) ?? 0) : 0
    const subtotalAfterPromo = Math.max(0, subtotal - promoDiscount)
    const qualifiesForFreeShipping =
        !!appliedPromo?.free_shipping ||
        (freeShippingThreshold !== null && subtotalAfterPromo >= freeShippingThreshold)

    const taxLine = useMemo(() => {
        if (taxRate === null) return null
        const pct = Number((taxRate * 100).toFixed(2))
        const amount = taxInclusive ? (subtotalAfterPromo * taxRate) / (1 + taxRate) : subtotalAfterPromo * taxRate
        return {
            label: taxInclusive ? `Includes tax (${pct}%)` : `Estimated tax (${pct}%)`,
            amount,
        }
    }, [taxRate, taxInclusive, subtotalAfterPromo])

    const promoCart = useMemo(
        () => ({
            subtotal,
            item_count: lines.length,
            item_ids: lines.map((l) => l.id).filter(Boolean),
        }),
        [subtotal, lines]
    )

    // Promo: validated here for a preview; checkout re-prices it server-side. The applied code is
    // handed to /checkout through sessionStorage.
    const validatedSubtotal = useRef<number | null>(null)
    const promoCartRef = useRef(promoCart)
    promoCartRef.current = promoCart

    const applyPromo = async (code: string): Promise<string | null> => {
        const result = await validatePromo(code, promoCart)
        if (!result.valid) return result.error_message || 'This promo code is not valid for your cart.'
        validatedSubtotal.current = promoCart.subtotal
        setAppliedPromo(result)
        savePromoCode(result.code)
        return null
    }
    const removePromo = () => {
        validatedSubtotal.current = null
        setAppliedPromo(null)
        savePromoCode(null)
    }

    // Re-check the applied code when the subtotal changes (minimum-spend rules etc.).
    const appliedCode = appliedPromo?.code
    const currentSubtotal = promoCart.subtotal
    useEffect(() => {
        if (!appliedCode || validatedSubtotal.current === currentSubtotal) return
        let cancelled = false
        const timer = window.setTimeout(async () => {
            const result = await validatePromo(appliedCode, promoCartRef.current)
            if (cancelled) return
            validatedSubtotal.current = currentSubtotal
            if (result.valid) {
                setAppliedPromo(result)
            } else {
                setAppliedPromo(null)
                savePromoCode(null)
                setNotice(`Promo code ${appliedCode} was removed: ${result.error_message || 'it no longer applies.'}`)
            }
        }, 500)
        return () => {
            cancelled = true
            window.clearTimeout(timer)
        }
    }, [appliedCode, currentSubtotal])

    const wishlistProductIds = useMemo(() => {
        const set = new Set<string>()
        ;((wishlistItems ?? []) as { product?: unknown }[]).forEach((row) => {
            const pid = wishlistItemProductId(row)
            if (pid) set.add(pid)
        })
        return set
    }, [wishlistItems])

    // ─── Handlers ────────────────────────────────────────────────────────────
    const clearPending = (id: string, only?: number) =>
        setPendingQty((prev) => {
            if (!(id in prev) || (only !== undefined && prev[id] !== only)) return prev
            const next = { ...prev }
            delete next[id]
            return next
        })

    const setBusy = (id: string, on: boolean) =>
        setBusyIds((prev) => {
            const next = new Set(prev)
            if (on) next.add(id)
            else next.delete(id)
            return next
        })

    const handleRemove = async (line: CartLineView) => {
        if (isBusy(line.id)) return
        setError(null)
        setBusy(line.id, true)
        const res = await dispatch(removeFromCart({ cartItemId: line.id }))
        setBusy(line.id, false)
        if (removeFromCart.rejected.match(res)) {
            setError({ message: `Couldn't remove "${line.name}". Please try again.`, retry: () => handleRemove(line) })
        }
    }

    const handleQuantity = async (line: CartLineView, next: number) => {
        if (isBusy(line.id)) return
        // Stepping below 1 removes the line (same as before).
        if (next < 1) return handleRemove(line)
        if (line.stockLeft !== undefined && next > line.stockLeft) return
        setError(null)
        setPendingQty((prev) => ({ ...prev, [line.id]: next }))
        const res = await dispatch(updateCart({ cartItemId: line.id, quantity: next }))
        if (updateCart.rejected.match(res)) {
            clearPending(line.id)
            setError({
                message: `Couldn't update the quantity for "${line.name}". Please try again.`,
                retry: () => handleQuantity(line, next),
            })
            return
        }
        // Safety net: if the refreshed cart never confirms the value, unlock the controls.
        window.setTimeout(() => clearPending(line.id, next), 4000)
    }

    const handleSaveForLater = async (line: CartLineView) => {
        if (!line.productId || isBusy(line.id)) return
        setError(null)
        setNotice(null)
        setBusy(line.id, true)
        if (!wishlistProductIds.has(line.productId)) {
            const added = await dispatch(addToWishlist({ product_id: line.productId }))
            if (!addToWishlist.fulfilled.match(added)) {
                setBusy(line.id, false)
                setError({
                    message: `Couldn't save "${line.name}" for later. Please try again.`,
                    retry: () => handleSaveForLater(line),
                })
                return
            }
        }
        const removed = await dispatch(removeFromCart({ cartItemId: line.id }))
        setBusy(line.id, false)
        if (removeFromCart.rejected.match(removed)) {
            setError({
                message: `"${line.name}" is saved to your wishlist but is still in your cart.`,
                retry: () => handleRemove(line),
            })
            return
        }
        setNotice(`"${line.name}" was moved to your wishlist.`)
    }

    // ─── Recommendations for the empty state (existing store data only) ──────────
    const recommendations = useMemo(() => {
        const source =
            [productsState.featuredProducts, productsState.popularProducts, productsState.allProducts].find(
                (list) => list.length > 0
            ) ?? []
        return (source as RecommendationRow[])
            .map(toRecommendation)
            .filter((p): p is MarketplaceProduct => p !== null)
            .slice(0, 6)
    }, [productsState.featuredProducts, productsState.popularProducts, productsState.allProducts])

    // ─── Render ──────────────────────────────────────────────────────────────
    const showSkeleton = !hydrated || (cartLoading && lines.length === 0)
    const anyBusy = Object.keys(pendingQty).length > 0 || busyIds.size > 0

    return (
        <MainLayout>
            <div className="min-h-[60vh] bg-zinc-100 dark:bg-zinc-950">
                <div className="mx-auto max-w-[1440px] px-3 py-3 sm:px-4 lg:px-6 lg:py-4">
                    {showSkeleton ? (
                        <CartSkeleton />
                    ) : lines.length === 0 ? (
                        <EmptyCart formatPrice={formatDisplayPrice} recommendations={recommendations} />
                    ) : (
                        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                            <section
                                aria-labelledby="cart-heading"
                                className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-1"
                            >
                                {error ? (
                                    <Banner
                                        tone="error"
                                        onDismiss={() => setError(null)}
                                        action={
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const retry = error.retry
                                                    setError(null)
                                                    retry()
                                                }}
                                                className={`min-h-[44px] shrink-0 rounded-full border border-red-300 bg-white px-3 py-1 font-semibold text-red-800 hover:bg-red-100 dark:border-red-700 dark:bg-zinc-900 dark:text-red-200 dark:hover:bg-zinc-800 sm:min-h-0 ${FOCUS}`}
                                            >
                                                Retry
                                            </button>
                                        }
                                    >
                                        <p>{error.message}</p>
                                    </Banner>
                                ) : null}
                                {notice ? (
                                    <Banner
                                        tone="success"
                                        onDismiss={() => setNotice(null)}
                                        action={
                                            <Link
                                                href="/account/wishlist"
                                                className="shrink-0 py-2 font-semibold underline hover:no-underline"
                                            >
                                                View wishlist
                                            </Link>
                                        }
                                    >
                                        <p>{notice}</p>
                                    </Banner>
                                ) : null}

                                <div className={`${CARD} p-3 sm:p-4`}>
                                    <div className="flex items-end justify-between gap-3 border-b border-zinc-200 pb-2 dark:border-zinc-800">
                                        <h1
                                            id="cart-heading"
                                            className="font-syne text-xl font-bold leading-tight text-zinc-900 dark:text-zinc-100 lg:text-2xl"
                                        >
                                            Shopping Cart
                                        </h1>
                                        <span className={`hidden w-32 text-right text-sm ${MUTED} sm:block`}>Price</span>
                                    </div>

                                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {lines.map((line) => (
                                            <LineRow
                                                key={line.id}
                                                line={line}
                                                quantity={displayQty(line)}
                                                busy={isBusy(line.id)}
                                                formatPrice={formatDisplayPrice}
                                                onQuantity={handleQuantity}
                                                onRemove={handleRemove}
                                                onSave={handleSaveForLater}
                                            />
                                        ))}
                                    </ul>

                                    <p className="flex flex-wrap items-baseline justify-end gap-x-1.5 border-t border-zinc-200 pt-3 text-base text-zinc-900 dark:border-zinc-800 dark:text-zinc-100 sm:text-lg">
                                        <span>Subtotal ({itemsLabel(itemCount)}):</span>
                                        <Price amount={subtotal} format={formatDisplayPrice} size="md" />
                                    </p>
                                </div>
                            </section>

                            {/* Mobile: subtotal + checkout first. Desktop: right column. */}
                            <aside
                                aria-label="Order summary"
                                className="order-first space-y-3 lg:order-none lg:col-start-2 lg:row-start-1"
                            >
                                <CheckoutCard
                                    itemCount={itemCount}
                                    subtotal={subtotal}
                                    promoDiscount={promoDiscount}
                                    freeShippingThreshold={freeShippingThreshold}
                                    qualifiesForFreeShipping={qualifiesForFreeShipping}
                                    taxLine={taxLine}
                                    formatPrice={formatDisplayPrice}
                                    appliedPromo={appliedPromo}
                                    onApplyPromo={applyPromo}
                                    onRemovePromo={removePromo}
                                    disabled={anyBusy}
                                />
                            </aside>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    )
}
