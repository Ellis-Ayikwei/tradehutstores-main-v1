'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Image from 'next/image'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Heart, Package, RefreshCw, ShoppingCart, Trash2 } from 'lucide-react'
import { AppDispatch, RootState } from '@/store'
import { getWishlist, removeFromWishlist } from '@/store/wishListSlice'
import { addToCart } from '@/store/cartSlice'
import { AccountMobileHeader } from '@/components/account/AccountShell'
import { SectionHeader } from '@/components/common/marketplace'
import { useCurrency } from '@/contexts/CurrencyContext'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { normalizeWishlistProduct } from '@/lib/wishlistUtils'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
const BTN_PRIMARY = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 ${FOCUS}`
const BTN_SECONDARY = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-bold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS}`

type SortKey = 'recent' | 'price-asc' | 'price-desc' | 'name'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'recent', label: 'Recently added' },
    { key: 'price-asc', label: 'Price: low to high' },
    { key: 'price-desc', label: 'Price: high to low' },
    { key: 'name', label: 'Name A to Z' },
]

type WishlistRow = {
    id: string
    product_variant?: { id?: string } | null
    [key: string]: unknown
}

function sortItems(items: WishlistRow[], sort: SortKey): WishlistRow[] {
    const arr = [...items]
    const priceOf = (row: WishlistRow) => {
        const p = normalizeWishlistProduct(row)
        return p.final_price ?? parseFloat(p.price ?? '0')
    }
    const nameOf = (row: WishlistRow) => normalizeWishlistProduct(row).name ?? ''
    switch (sort) {
        case 'price-asc':
            return arr.sort((a, b) => priceOf(a) - priceOf(b))
        case 'price-desc':
            return arr.sort((a, b) => priceOf(b) - priceOf(a))
        case 'name':
            return arr.sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
        default:
            return arr
    }
}

function WishlistCard({
    item,
    onMoveToCart,
    onRemove,
    formatCurrency,
}: {
    item: WishlistRow
    onMoveToCart: (item: WishlistRow) => void
    onRemove: (id: string) => void
    formatCurrency: (amount: number) => string
}) {
    const product = normalizeWishlistProduct(item)
    const hasDiscount = (product.discount_percentage ?? 0) > 0
    const inStock = (product.inventory_level ?? 1) > 0
    const lowStock = inStock && (product.inventory_level ?? 99) < 5
    const imgSrc = product.main_product_image ? resolveMediaSrc(product.main_product_image) : ''
    const href = `/products/${product.id}`
    const finalPrice = product.final_price ?? parseFloat(product.price ?? '0')

    return (
        <article className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <Link href={href} className={`relative block aspect-square bg-gray-100 dark:bg-gray-800 ${FOCUS}`}>
                {imgSrc ? (
                    <Image
                        src={imgSrc}
                        alt={product.name ?? 'Product'}
                        fill
                        sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 50vw"
                        className="object-cover"
                    />
                ) : (
                    <span className="flex h-full w-full items-center justify-center text-gray-400">
                        <Package className="h-10 w-10" aria-hidden="true" />
                    </span>
                )}
                {hasDiscount ? (
                    <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-4 text-white">
                        -{product.discount_percentage}%
                    </span>
                ) : null}
            </Link>

            <div className="flex flex-1 flex-col gap-1.5 p-3">
                <Link
                    href={href}
                    className={`line-clamp-2 text-sm font-semibold text-gray-900 hover:text-primary-700 dark:text-gray-100 dark:hover:text-primary-300 ${FOCUS}`}
                >
                    {product.name}
                </Link>
                {product.category || product.brand ? (
                    <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                        {[product.category, product.brand].filter(Boolean).join(' / ')}
                    </p>
                ) : null}

                <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-base font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(finalPrice)}
                    </span>
                    {hasDiscount ? (
                        <span className="font-mono text-xs text-gray-500 line-through dark:text-gray-400">
                            {formatCurrency(parseFloat(product.price ?? '0'))}
                        </span>
                    ) : null}
                </div>

                {!inStock ? (
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">Out of stock</p>
                ) : lowStock ? (
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        Only {product.inventory_level} left
                    </p>
                ) : null}

                <div className="mt-auto flex gap-2 pt-2">
                    <button
                        type="button"
                        onClick={() => onMoveToCart(item)}
                        disabled={!inStock}
                        className={`${BTN_PRIMARY} flex-1 px-3`}
                    >
                        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                        Move to cart
                    </button>
                    <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        aria-label={`Remove ${product.name} from wishlist`}
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-red-700 hover:bg-red-50 dark:border-gray-700 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-gray-800 ${FOCUS}`}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </article>
    )
}

function WishlistSkeleton() {
    return (
        <div
            className="grid animate-pulse grid-cols-2 gap-3 md:grid-cols-3 sm:gap-4 xl:grid-cols-4"
            aria-busy="true"
            aria-label="Loading wishlist"
        >
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                    <div className="aspect-square bg-gray-200 dark:bg-gray-800" />
                    <div className="space-y-2 p-3">
                        <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="h-11 rounded-lg bg-gray-200 dark:bg-gray-800" />
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function WishlistPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { wishlist, isUpdating } = useSelector((state: RootState) => state.wishlist)
    const { cart } = useSelector((state: RootState) => state.cart)
    const { formatDisplayPrice } = useCurrency()

    const [sort, setSort] = useState<SortKey>('recent')
    const [loadError, setLoadError] = useState(false)
    const [loaded, setLoaded] = useState(false)
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
    const toastTimer = useRef<number | null>(null)

    const flash = useCallback((type: 'ok' | 'err', text: string) => {
        setToast({ type, text })
        if (toastTimer.current) window.clearTimeout(toastTimer.current)
        toastTimer.current = window.setTimeout(() => setToast(null), 2800)
    }, [])

    useEffect(() => {
        return () => {
            if (toastTimer.current) window.clearTimeout(toastTimer.current)
        }
    }, [])

    const load = useCallback(() => {
        setLoadError(false)
        dispatch(getWishlist())
            .unwrap()
            .catch(() => setLoadError(true))
            .finally(() => setLoaded(true))
    }, [dispatch])

    useEffect(() => {
        load()
    }, [load])

    const handleRemoveFromWishlist = (itemId: string) => {
        dispatch(removeFromWishlist({ wishlistItemId: itemId }))
            .unwrap()
            .then(() => flash('ok', 'Removed from wishlist'))
            .catch(() => flash('err', 'Failed to remove from wishlist'))
    }

    const handleMoveToCart = (item: WishlistRow) => {
        const product = normalizeWishlistProduct(item)
        const mainImg = product.main_product_image
        dispatch(
            addToCart({
                cart_id: cart.id || undefined,
                product_id: product.id,
                quantity: 1,
                product_variant_id: item.product_variant?.id,
                product: {
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    final_price: product.final_price,
                    main_product_image: mainImg ? resolveMediaSrc(mainImg) : undefined,
                    image: mainImg ? resolveMediaSrc(mainImg) : undefined,
                    brand: product.brand,
                    category: product.category,
                },
            })
        )
            .unwrap()
            .then(() => {
                flash('ok', 'Added to cart')
                handleRemoveFromWishlist(item.id)
            })
            .catch(() => flash('err', 'Failed to add to cart'))
    }

    const items = (wishlist.items ?? []) as unknown as WishlistRow[]
    const hasItems = items.length > 0

    const handleMoveAllToCart = () => {
        items.forEach((item) => {
            const p = normalizeWishlistProduct(item)
            if ((p.inventory_level ?? 1) > 0) handleMoveToCart(item)
        })
    }

    const sorted = hasItems ? sortItems(items, sort) : []
    const count = wishlist.item_count ?? items.length
    const showSkeleton = !hasItems && !loadError && (isUpdating || !loaded)

    return (
        <>
            {toast ? (
                <div
                    role="status"
                    className={`fixed left-4 right-4 top-20 z-[80] max-w-sm rounded-lg px-4 py-3 text-sm font-semibold shadow-lg sm:left-auto ${
                        toast.type === 'ok'
                            ? 'bg-emerald-700 text-white'
                            : 'border border-red-200 bg-red-50 text-red-900'
                    }`}
                >
                    {toast.text}
                </div>
            ) : null}

            <AccountMobileHeader title="Wishlist" />

            <div className="space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <SectionHeader
                        as="h1"
                        title="My wishlist"
                        subtitle={
                            hasItems
                                ? `${count} ${count === 1 ? 'item' : 'items'} saved for later`
                                : 'Save items to come back to them later.'
                        }
                        className="mb-0 sm:mb-0"
                    />
                    {hasItems ? (
                        <div className="flex flex-wrap items-center gap-2">
                            <label className="sr-only" htmlFor="wishlist-sort">
                                Sort wishlist
                            </label>
                            <select
                                id="wishlist-sort"
                                value={sort}
                                onChange={(e) => setSort(e.target.value as SortKey)}
                                className={`min-h-[44px] rounded-lg border border-gray-300 bg-white px-3 text-base font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 sm:text-sm ${FOCUS}`}
                            >
                                {SORT_OPTIONS.map((o) => (
                                    <option key={o.key} value={o.key}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            <button type="button" onClick={handleMoveAllToCart} className={BTN_PRIMARY}>
                                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                                Move all to cart
                            </button>
                        </div>
                    ) : null}
                </div>

                {showSkeleton ? <WishlistSkeleton /> : null}

                {loadError && !hasItems ? (
                    <div
                        role="alert"
                        className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-4 py-10 text-center dark:border-red-900 dark:bg-gray-900"
                    >
                        <AlertCircle className="h-10 w-10 text-red-700 dark:text-red-400" aria-hidden="true" />
                        <h2 className="mt-3 font-syne text-lg font-bold text-gray-900 dark:text-gray-100">
                            We could not load your wishlist
                        </h2>
                        <p className="mt-1 max-w-sm text-sm text-gray-700 dark:text-gray-300">
                            Check your connection and try again.
                        </p>
                        <button type="button" onClick={load} className={`${BTN_SECONDARY} mt-4`}>
                            <RefreshCw className="h-4 w-4" aria-hidden="true" />
                            Try again
                        </button>
                    </div>
                ) : null}

                {!showSkeleton && !loadError && !hasItems ? (
                    <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-4 py-14 text-center dark:border-gray-800 dark:bg-gray-900">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                            <Heart className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <h2 className="mt-4 font-syne text-lg font-bold text-gray-900 dark:text-gray-100">
                            Your wishlist is empty
                        </h2>
                        <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
                            Tap the heart on any product to save it here.
                        </p>
                        <Link href="/products" className={`${BTN_PRIMARY} mt-5`}>
                            Browse products
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </div>
                ) : null}

                {hasItems ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                        {sorted.map((item) => (
                            <WishlistCard
                                key={item.id}
                                item={item}
                                onMoveToCart={handleMoveToCart}
                                onRemove={handleRemoveFromWishlist}
                                formatCurrency={formatDisplayPrice}
                            />
                        ))}
                    </div>
                ) : null}
            </div>
        </>
    )
}
