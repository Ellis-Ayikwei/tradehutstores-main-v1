'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { getWishlist, removeFromWishlist } from '@/store/wishListSlice'
import { addToCart } from '@/store/cartSlice'
import { AccountMobileHeader } from '@/components/account/AccountShell'
import {
    Heart,
    ShoppingCart,
    X,
    Home,
    ChevronRight,
    Package,
    SlidersHorizontal,
    Share2,
    Eye,
    Sparkles,
    ArrowRight,
    TrendingDown,
    Zap,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { normalizeWishlistProduct } from '@/lib/wishlistUtils'

// ─────────────────────────────────────────────────────────
// Sub-components (no antd, no framer-motion — pure Tailwind)
// ─────────────────────────────────────────────────────────

function Breadcrumb() {
    return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 mb-8">
            <Link href="/" className="flex items-center gap-1 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                <Home className="h-3.5 w-3.5" />
                <span>Home</span>
            </Link>
            <ChevronRight className="h-3 w-3 opacity-40" />
            <span className="text-neutral-900 dark:text-neutral-100 font-medium">Wishlist</span>
        </nav>
    )
}

interface BadgePillProps {
    variant: 'price-drop' | 'low-stock' | 'new'
    label: string
}
function BadgePill({ variant, label }: BadgePillProps) {
    const base = 'absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-md z-[1]'
    if (variant === 'price-drop')
        return (
            <span className={`${base} bg-red-600 text-white`}>
                <TrendingDown className="h-3 w-3" />
                {label}
            </span>
        )
    if (variant === 'low-stock')
        return (
            <span className={`${base} bg-amber-500 text-neutral-900 dark:bg-amber-600 dark:text-neutral-950`}>
                <Zap className="h-3 w-3" />
                {label}
            </span>
        )
    return (
        <span className={`${base} bg-blue-600 text-white dark:bg-blue-500`}>
            <Sparkles className="h-3 w-3" />
            {label}
        </span>
    )
}

interface WishlistCardProps {
    item: any
    wide?: boolean
    onMoveToCart: (item: any) => void
    onRemove: (id: string) => void
    formatCurrency: (amount: number) => string
}

function WishlistCard({ item, wide = false, onMoveToCart, onRemove, formatCurrency }: WishlistCardProps) {
    const product = normalizeWishlistProduct(item)
    const hasDiscount = (product.discount_percentage ?? 0) > 0
    const inStock = (product.inventory_level ?? 1) > 0
    const imgRaw = product.main_product_image
    const imgSrc = imgRaw ? resolveMediaSrc(imgRaw) : ''

    return (
        <article
            className={`group relative flex ${wide ? 'flex-col md:flex-row' : 'flex-col'} bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-md dark:shadow-none hover:shadow-lg dark:hover:ring-1 dark:hover:ring-neutral-600 transition-all duration-500 overflow-hidden`}
        >
            {/* Image */}
            <div className={`relative ${wide ? 'w-full md:w-2/5 h-72 md:h-auto' : 'h-72'} overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex-shrink-0`}>
                {imgSrc ? (
                    <Link href={`/products/${product.id}`} className="block w-full h-full">
                        <Image
                            src={imgSrc}
                            alt={product.name ?? 'Product'}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                            sizes={wide ? '(max-width: 768px) 100vw, 40vw' : '(max-width: 768px) 100vw, 33vw'}
                        />
                    </Link>
                ) : (
                    <Link href={`/products/${product.id}`} className="flex items-center justify-center w-full h-full">
                        <Package className="h-16 w-16 text-neutral-400 dark:text-neutral-500 opacity-50" />
                    </Link>
                )}

                {/* Discount badge */}
                {hasDiscount && <BadgePill variant="price-drop" label={`-${product.discount_percentage}%`} />}

                {/* Low stock badge */}
                {inStock && (product.inventory_level ?? 99) < 5 && !hasDiscount && (
                    <BadgePill variant="low-stock" label="Low Stock" />
                )}

                {/* Remove / heart button */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onRemove(item.id)
                    }}
                    aria-label="Remove from wishlist"
                    className="absolute top-4 right-4 w-10 h-10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-full flex items-center justify-center text-red-600 dark:text-red-400 shadow-sm border border-neutral-200 dark:border-neutral-600 hover:scale-110 active:scale-95 transition-transform"
                >
                    <Heart className="h-5 w-5 fill-current" />
                </button>
            </div>

            {/* Info */}
            <div className={`${wide ? 'p-8 flex-1 flex flex-col justify-between' : 'p-6'} space-y-4`}>
                <div className={`flex justify-between items-start ${wide ? '' : ''}`}>
                    <div className={wide ? 'max-w-md' : ''}>
                        <Link href={`/products/${product.id}`}>
                            <h3
                                className={`font-headline font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors ${wide ? 'text-2xl md:text-3xl' : 'text-xl'}`}
                            >
                                {product.name}
                            </h3>
                        </Link>
                        <p className="text-neutral-600 dark:text-neutral-400 text-sm font-body mt-1">
                            {product.category}
                            {product.brand ? ` / ${product.brand}` : ''}
                        </p>
                        {wide && product.description && (
                            <p className="text-neutral-600 dark:text-neutral-400 text-base font-body mt-2 line-clamp-2">
                                {product.description}
                            </p>
                        )}
                    </div>

                    <div className="text-right flex-shrink-0 ml-4">
                        <span className={`block font-mono font-bold text-neutral-900 dark:text-neutral-100 ${wide ? 'text-3xl' : 'text-2xl'}`}>
                            {formatCurrency(product.final_price ?? parseFloat(product.price ?? '0'))}
                        </span>
                        {hasDiscount && (
                            <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400 line-through">
                                {formatCurrency(parseFloat(product.price ?? '0'))}
                            </span>
                        )}
                    </div>
                </div>

                {/* Stock */}
                {!inStock && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-950/60 px-3 py-1 rounded-full self-start">
                        Out of Stock
                    </span>
                )}

                {/* Actions */}
                <div className={`${wide ? '' : 'pt-2'} flex gap-3`}>
                    <button
                        type="button"
                        onClick={() => onMoveToCart(item)}
                        disabled={!inStock}
                        className="flex-1 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 text-white py-3 rounded-lg font-bold text-sm tracking-wide shadow-lg hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <ShoppingCart className="h-4 w-4" />
                        Move to Cart
                    </button>
                    <Link
                        href={`/products/${product.id}`}
                        className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border border-neutral-200 dark:border-neutral-600"
                        aria-label="View product"
                    >
                        <Eye className="h-5 w-5" />
                    </Link>
                    <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        aria-label="Remove from wishlist"
                        className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors border border-neutral-200 dark:border-neutral-600"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </article>
    )
}

// ─────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────

function EmptyWishlist() {
    return (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
            <div className="w-24 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6 border border-neutral-200 dark:border-neutral-700">
                <Heart className="h-12 w-12 text-neutral-400 dark:text-neutral-500 opacity-60" />
            </div>
            <h2 className="font-syne text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Your wishlist is empty</h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm font-body mb-8 max-w-sm">
                Save items you love and come back to them anytime.
            </p>
            <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 text-white px-8 py-3 rounded-lg font-bold text-sm active:scale-95 transition-all"
            >
                Browse Products
                <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    )
}

// ─────────────────────────────────────────────────────────
// Sort / Filter Row
// ─────────────────────────────────────────────────────────

type SortKey = 'recent' | 'price-asc' | 'price-desc' | 'name'

const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'recent', label: 'Recently Added' },
    { key: 'price-asc', label: 'Price: Low → High' },
    { key: 'price-desc', label: 'Price: High → Low' },
    { key: 'name', label: 'Name A–Z' },
]

interface SortFilterRowProps {
    sort: SortKey
    onSortChange: (key: SortKey) => void
    onShareList: () => void
}

function SortFilterRow({ sort, onSortChange, onShareList }: SortFilterRowProps) {
    const [open, setOpen] = useState(false)
    const current = sortOptions.find((o) => o.key === sort)!

    return (
        <div className="flex gap-3 flex-wrap">
            {/* Sort dropdown */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="bg-neutral-100 dark:bg-neutral-800 px-5 py-3 rounded-lg text-neutral-900 dark:text-neutral-100 font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2 min-h-[44px] border border-neutral-200 dark:border-neutral-600"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    {current.label}
                </button>
                {open && (
                    <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-600 min-w-[180px] py-1 overflow-hidden">
                        {sortOptions.map((opt) => (
                            <button
                                type="button"
                                key={opt.key}
                                onClick={() => {
                                    onSortChange(opt.key)
                                    setOpen(false)
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                                    sort === opt.key ? 'text-orange-600 dark:text-orange-400 font-bold' : 'text-neutral-800 dark:text-neutral-200'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Share */}
            <button
                type="button"
                onClick={onShareList}
                className="bg-neutral-100 dark:bg-neutral-800 px-5 py-3 rounded-lg text-neutral-900 dark:text-neutral-100 font-bold text-sm hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2 min-h-[44px] border border-neutral-200 dark:border-neutral-600"
            >
                <Share2 className="h-4 w-4" />
                Share List
            </button>
        </div>
    )
}

// ─────────────────────────────────────────────────────────
// Recommendation Island
// ─────────────────────────────────────────────────────────

function RecommendationIsland() {
    return (
        <div className="bg-neutral-100 dark:bg-neutral-900/90 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-10 md:p-12 text-center space-y-4">
            <div className="w-20 h-20 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto border border-neutral-200 dark:border-neutral-600">
                <Sparkles className="h-8 w-8 text-orange-500" />
            </div>
            <h2 className="text-2xl font-headline font-bold text-neutral-900 dark:text-neutral-100">Discover More Like These</h2>
            <p className="text-neutral-600 dark:text-neutral-400 font-body max-w-md mx-auto text-sm leading-relaxed">
                Based on your wishlist, we've curated a selection of items you might love.
            </p>
            <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 text-white px-8 py-3 rounded-lg font-bold text-sm active:scale-95 transition-all mt-4"
            >
                Explore Recommendations
                <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    )
}

// ─────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────

function WishlistSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                    <div className="h-72 bg-neutral-200 dark:bg-neutral-800" />
                    <div className="p-6 space-y-3">
                        <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded-full w-3/4" />
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded-full w-1/2" />
                        <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded-md w-full mt-4" />
                    </div>
                </div>
            ))}
        </div>
    )
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function sortItems(items: any[], sort: SortKey): any[] {
    const arr = [...items]
    const priceOf = (row: any) => {
        const p = normalizeWishlistProduct(row)
        return p.final_price ?? parseFloat(p.price ?? '0')
    }
    const nameOf = (row: any) => normalizeWishlistProduct(row).name ?? ''
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

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function WishlistPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { wishlist, isUpdating } = useSelector((state: RootState) => state.wishlist)
    const { cart } = useSelector((state: RootState) => state.cart)
    const { formatDisplayPrice } = useCurrency()

    const [sort, setSort] = useState<SortKey>('recent')
    const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    const flash = (type: 'ok' | 'err', text: string) => {
        setToast({ type, text })
        window.setTimeout(() => setToast(null), 2800)
    }

    useEffect(() => {
        dispatch(getWishlist())
    }, [dispatch])

    const handleRemoveFromWishlist = (itemId: string) => {
        dispatch(removeFromWishlist({ wishlistItemId: itemId }))
            .unwrap()
            .then(() => flash('ok', 'Removed from wishlist'))
            .catch(() => flash('err', 'Failed to remove from wishlist'))
    }

    const handleMoveToCart = (item: any) => {
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
                flash('ok', 'Added to cart!')
                handleRemoveFromWishlist(item.id)
            })
            .catch(() => flash('err', 'Failed to add to cart'))
    }

    const handleMoveAllToCart = () => {
        if (!wishlist.items?.length) return
        wishlist.items.forEach((item: any) => {
            const p = normalizeWishlistProduct(item)
            const inStock = (p.inventory_level ?? 1) > 0
            if (inStock) handleMoveToCart(item)
        })
    }

    const handleShareList = () => {
        if (navigator?.share) {
            navigator.share({ title: 'My TradeHut Wishlist', url: window.location.href })
        } else {
            navigator.clipboard?.writeText(window.location.href)
            flash('ok', 'Wishlist link copied!')
        }
    }

    const hasItems = wishlist.items && wishlist.items.length > 0
    const sorted = hasItems ? sortItems(wishlist.items, sort) : []

    return (
        <>
            {toast && (
                <div
                    className={`fixed top-20 right-4 z-toast px-4 py-3 rounded-xl text-sm font-medium shadow-lg max-w-sm ${
                        toast.type === 'ok'
                            ? 'bg-emerald-600 text-white dark:bg-emerald-700'
                            : 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200 border border-red-200 dark:border-red-800'
                    }`}
                    role="status"
                >
                    {toast.text}
                </div>
            )}
            <AccountMobileHeader title="My Wishlist" />
            <div className="bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10">
                    <Breadcrumb />

                    <section className="space-y-10 min-w-0">
                            {/* ── Page Header ── */}
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                                <div>
                                    <h1 className="font-syne text-4xl sm:text-5xl font-black tracking-tighter text-neutral-900 dark:text-neutral-100 leading-tight">
                                        My Wishlist
                                    </h1>
                                    {hasItems ? (
                                        <p className="text-neutral-600 dark:text-neutral-400 font-body mt-2 text-base">
                                            You have{' '}
                                            <span className="font-bold text-neutral-900 dark:text-neutral-100">
                                                {wishlist.item_count ?? wishlist.items.length}
                                            </span>{' '}
                                            {wishlist.item_count === 1 ? 'item' : 'items'} saved for later.
                                        </p>
                                    ) : (
                                        <p className="text-neutral-600 dark:text-neutral-400 font-body mt-2 text-base">
                                            Save your favourite items for later.
                                        </p>
                                    )}
                                </div>

                                {hasItems && (
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            type="button"
                                            onClick={handleMoveAllToCart}
                                            className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 text-white px-6 py-3 rounded-lg font-bold text-sm active:scale-95 transition-all flex items-center gap-2 min-h-[44px] shadow-lg"
                                        >
                                            <ShoppingCart className="h-4 w-4" />
                                            Move all to cart
                                        </button>

                                        <SortFilterRow
                                            sort={sort}
                                            onSortChange={setSort}
                                            onShareList={handleShareList}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* ── Loading ── */}
                            {isUpdating && !hasItems && <WishlistSkeleton />}

                            {/* ── Empty state ── */}
                            {!isUpdating && !hasItems && <EmptyWishlist />}

                            {/* ── Wishlist Grid ── */}
                            {hasItems && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                                    {sorted.map((item: any, index: number) => {
                                        // Every 4th card (0-indexed: index 3) spans 2 cols as the wide bento card
                                        const isWide = index % 7 === 3
                                        return (
                                            <div
                                                key={item.id}
                                                className={`animate-fade-up ${isWide ? 'md:col-span-2' : ''}`}
                                                style={{ animationDelay: `${Math.min(index * 60, 300)}ms`, animationFillMode: 'both' }}
                                            >
                                                <WishlistCard
                                                    item={item}
                                                    wide={isWide}
                                                    onMoveToCart={handleMoveToCart}
                                                    onRemove={handleRemoveFromWishlist}
                                                    formatCurrency={formatDisplayPrice}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            {/* ── Recommendation Island (always shown) ── */}
                            {!isUpdating && <RecommendationIsland />}

                            {/* ── Continue shopping (when items exist) ── */}
                            {hasItems && (
                                <div className="flex justify-center pt-4">
                                    <Link
                                        href="/products"
                                        className="inline-flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-orange-600 dark:hover:text-orange-400 font-medium text-sm transition-colors"
                                    >
                                        Continue Shopping
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            )}
                    </section>
                </div>
            </div>
        </>
    )
}
