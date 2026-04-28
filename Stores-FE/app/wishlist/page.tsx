'use client'

import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { getWishlist, removeFromWishlist } from '@/store/wishListSlice'
import { addToCart } from '@/store/cartSlice'
import MainLayout from '@/components/Layouts/MainLayout'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import {
    Heart,
    ShoppingCart,
    X,
    Home,
    ChevronRight,
    Package,
    Gavel,
    FileText,
    MapPin,
    CreditCard,
    Bell,
    Shield,
    LogOut,
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
import { message } from 'antd'

// ─────────────────────────────────────────────────────────
// Sub-components (no antd, no framer-motion — pure Tailwind)
// ─────────────────────────────────────────────────────────

function Breadcrumb() {
    return (
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-on-surface-variant mb-8">
            <Link href="/" className="flex items-center gap-1 hover:text-primary transition-colors">
                <Home className="h-3.5 w-3.5" />
                <span>Home</span>
            </Link>
            <ChevronRight className="h-3 w-3 opacity-40" />
            <span className="text-on-surface font-medium">Wishlist</span>
        </nav>
    )
}

interface BadgePillProps {
    variant: 'price-drop' | 'low-stock' | 'new'
    label: string
}
function BadgePill({ variant, label }: BadgePillProps) {
    const base = 'absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg'
    if (variant === 'price-drop')
        return (
            <span className={`${base} bg-primary-container text-white`}>
                <TrendingDown className="h-3 w-3" />
                {label}
            </span>
        )
    if (variant === 'low-stock')
        return (
            <span className={`${base} bg-secondary-container text-on-secondary-container`}>
                <Zap className="h-3 w-3" />
                {label}
            </span>
        )
    return (
        <span className={`${base} bg-tertiary-container text-on-tertiary-container`}>
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
    const product = item.product ?? item
    const hasDiscount = (product.discount_percentage ?? 0) > 0
    const inStock = (product.inventory_level ?? 1) > 0

    return (
        <article
            className={`group relative flex ${wide ? 'flex-col md:flex-row' : 'flex-col'} bg-surface-container-lowest rounded-xl shadow-card hover:shadow-card-hover transition-all duration-500 overflow-hidden`}
        >
            {/* Image */}
            <div className={`relative ${wide ? 'w-full md:w-2/5 h-72 md:h-auto' : 'h-72'} overflow-hidden bg-surface-container-low flex-shrink-0`}>
                {product.main_product_image ? (
                    <Link href={`/products/${product.id}`} className="block w-full h-full">
                        <Image
                            src={
                                typeof product.main_product_image === 'string'
                                    ? product.main_product_image
                                    : product.main_product_image?.url ?? '/placeholder-product.png'
                            }
                            alt={product.name ?? 'Product'}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                    </Link>
                ) : (
                    <Link href={`/products/${product.id}`} className="flex items-center justify-center w-full h-full">
                        <Package className="h-16 w-16 text-outline opacity-30" />
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
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onRemove(item.id)
                    }}
                    aria-label="Remove from wishlist"
                    className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-error shadow-sm hover:scale-110 active:scale-95 transition-transform"
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
                                className={`font-headline font-bold text-on-surface group-hover:text-primary transition-colors ${wide ? 'text-2xl md:text-3xl' : 'text-xl'}`}
                            >
                                {product.name}
                            </h3>
                        </Link>
                        <p className="text-on-surface-variant text-sm font-body mt-1">
                            {product.category}
                            {product.brand ? ` / ${product.brand}` : ''}
                        </p>
                        {wide && product.description && (
                            <p className="text-on-surface-variant text-base font-body mt-2 line-clamp-2">
                                {product.description}
                            </p>
                        )}
                    </div>

                    <div className="text-right flex-shrink-0 ml-4">
                        <span className={`block font-mono font-bold text-on-surface ${wide ? 'text-3xl' : 'text-2xl'}`}>
                            {formatCurrency(product.final_price ?? parseFloat(product.price ?? '0'))}
                        </span>
                        {hasDiscount && (
                            <span className="text-xs font-mono text-outline line-through">
                                {formatCurrency(parseFloat(product.price ?? '0'))}
                            </span>
                        )}
                    </div>
                </div>

                {/* Stock */}
                {!inStock && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-error bg-error-container px-3 py-1 rounded-full self-start">
                        Out of Stock
                    </span>
                )}

                {/* Actions */}
                <div className={`${wide ? '' : 'pt-2'} flex gap-3`}>
                    <button
                        onClick={() => onMoveToCart(item)}
                        disabled={!inStock}
                        className="flex-1 bg-primary text-on-primary py-3 rounded-md font-bold text-sm tracking-wide shadow-lg shadow-primary-500/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <ShoppingCart className="h-4 w-4" />
                        Move to Cart
                    </button>
                    <Link
                        href={`/products/${product.id}`}
                        className="w-12 h-12 bg-surface-container-low rounded-md flex items-center justify-center text-on-surface hover:bg-surface-container-high transition-colors"
                        aria-label="View product"
                    >
                        <Eye className="h-5 w-5" />
                    </Link>
                    <button
                        onClick={() => onRemove(item.id)}
                        aria-label="Remove from wishlist"
                        className="w-12 h-12 bg-surface-container-low rounded-md flex items-center justify-center text-error hover:bg-error-container/30 transition-colors"
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
            <div className="w-24 h-24 bg-surface-container-low rounded-full flex items-center justify-center mb-6 shadow-card">
                <Heart className="h-12 w-12 text-outline opacity-40" />
            </div>
            <h2 className="font-syne text-2xl font-bold text-on-surface mb-2">Your wishlist is empty</h2>
            <p className="text-on-surface-variant text-sm font-body mb-8 max-w-sm">
                Save items you love and come back to them anytime.
            </p>
            <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-md font-bold text-sm hover:opacity-90 active:scale-95 transition-all"
            >
                Browse Products
                <ArrowRight className="h-4 w-4" />
            </Link>
        </div>
    )
}

// ─────────────────────────────────────────────────────────
// Account Side Nav (account-scoped — not a Navigation/ component)
// ─────────────────────────────────────────────────────────

const accountLinks = [
    { href: '/orders', icon: Package, label: 'Orders' },
    { href: '/auctions', icon: Gavel, label: 'Bids & Auctions' },
    { href: '/rfq', icon: FileText, label: 'My Requests' },
    { href: '/wishlist', icon: Heart, label: 'Wishlist', active: true },
    { href: '/account/addresses', icon: MapPin, label: 'Addresses' },
    { href: '/account/payment', icon: CreditCard, label: 'Payment Methods' },
    { href: '/account/notifications', icon: Bell, label: 'Notifications' },
    { href: '/account/security', icon: Shield, label: 'Security' },
]

function AccountSideNav() {
    return (
        <aside className="hidden md:flex flex-col gap-2 md:sticky md:top-24 md:h-[calc(100vh-6rem)] w-full rounded-2xl bg-surface-container-lowest shadow-card p-6 overflow-y-auto no-scrollbar">
            <div className="mb-6">
                <h2 className="text-on-surface-variant uppercase tracking-widest text-[10px] font-bold mb-1 font-body">
                    Account Settings
                </h2>
                <p className="text-[10px] text-outline font-medium">Manage your TradeHut profile</p>
            </div>

            <nav className="flex flex-col gap-1">
                {accountLinks.map(({ href, icon: Icon, label, active }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`px-4 py-3 flex items-center gap-3 rounded-xl text-[10px] font-bold uppercase tracking-widest font-body transition-all duration-200 hover:translate-x-1 ${
                            active
                                ? 'bg-surface-container-lowest text-primary-container shadow-card'
                                : 'text-on-surface-variant opacity-70 hover:opacity-100'
                        }`}
                    >
                        <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'fill-current opacity-90' : ''}`} />
                        {label}
                    </Link>
                ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-surface-container-high/30">
                <button className="w-full py-3 px-4 flex items-center gap-3 text-error font-body uppercase tracking-widest text-[10px] font-bold hover:bg-error-container/20 rounded-xl transition-all">
                    <LogOut className="h-5 w-5" />
                    Logout
                </button>
            </div>
        </aside>
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
                    onClick={() => setOpen((v) => !v)}
                    className="bg-surface-container-low px-5 py-3 rounded-md text-on-surface font-bold text-sm hover:bg-surface-container-high transition-colors flex items-center gap-2 min-h-[44px]"
                >
                    <SlidersHorizontal className="h-4 w-4" />
                    {current.label}
                </button>
                {open && (
                    <div className="absolute top-full left-0 mt-1 z-20 bg-surface-container-lowest rounded-xl shadow-card-hover border border-outline-variant/20 min-w-[180px] py-1 overflow-hidden">
                        {sortOptions.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => {
                                    onSortChange(opt.key)
                                    setOpen(false)
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-container-low ${
                                    sort === opt.key ? 'text-primary font-bold' : 'text-on-surface'
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
                onClick={onShareList}
                className="bg-surface-container-low px-5 py-3 rounded-md text-on-surface font-bold text-sm hover:bg-surface-container-high transition-colors flex items-center gap-2 min-h-[44px]"
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
        <div className="bg-surface-container-low rounded-2xl p-10 md:p-12 text-center space-y-4">
            <div className="w-20 h-20 bg-surface-container-lowest rounded-full flex items-center justify-center mx-auto shadow-card">
                <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-headline font-bold text-on-surface">Discover More Like These</h2>
            <p className="text-on-surface-variant font-body max-w-md mx-auto text-sm leading-relaxed">
                Based on your wishlist, we've curated a selection of items you might love.
            </p>
            <Link
                href="/products"
                className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-md font-bold text-sm hover:opacity-90 active:scale-95 transition-all mt-4"
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
                <div key={i} className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden">
                    <div className="h-72 bg-surface-container-high" />
                    <div className="p-6 space-y-3">
                        <div className="h-4 bg-surface-container-high rounded-full w-3/4" />
                        <div className="h-3 bg-surface-container-high rounded-full w-1/2" />
                        <div className="h-8 bg-surface-container-high rounded-md w-full mt-4" />
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
    switch (sort) {
        case 'price-asc':
            return arr.sort((a, b) => {
                const pa = a.product?.final_price ?? parseFloat(a.product?.price ?? '0')
                const pb = b.product?.final_price ?? parseFloat(b.product?.price ?? '0')
                return pa - pb
            })
        case 'price-desc':
            return arr.sort((a, b) => {
                const pa = a.product?.final_price ?? parseFloat(a.product?.price ?? '0')
                const pb = b.product?.final_price ?? parseFloat(b.product?.price ?? '0')
                return pb - pa
            })
        case 'name':
            return arr.sort((a, b) => (a.product?.name ?? '').localeCompare(b.product?.name ?? ''))
        default:
            return arr // API order = recently added
    }
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function WishlistPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { wishlist, isUpdating } = useSelector((state: RootState) => state.wishlist)
    const { cart } = useSelector((state: RootState) => state.cart)
    const { formatCurrency } = useCurrency()

    const [sort, setSort] = useState<SortKey>('recent')

    useEffect(() => {
        dispatch(getWishlist())
    }, [dispatch])

    const handleRemoveFromWishlist = (itemId: string) => {
        dispatch(removeFromWishlist({ wishlistItemId: itemId }))
            .unwrap()
            .then(() => message.success('Removed from wishlist'))
            .catch(() => message.error('Failed to remove from wishlist'))
    }

    const handleMoveToCart = (item: any) => {
        dispatch(
            addToCart({
                cart_id: cart.id,
                product_id: item.product?.id ?? item.id,
                quantity: 1,
                product_variant_id: item.product_variant?.id,
            })
        )
            .unwrap()
            .then(() => {
                message.success('Added to cart!')
                handleRemoveFromWishlist(item.id)
            })
            .catch(() => message.error('Failed to add to cart'))
    }

    const handleMoveAllToCart = () => {
        if (!wishlist.items?.length) return
        wishlist.items.forEach((item: any) => {
            const inStock = (item.product?.inventory_level ?? 1) > 0
            if (inStock) handleMoveToCart(item)
        })
    }

    const handleShareList = () => {
        if (navigator?.share) {
            navigator.share({ title: 'My TradeHut Wishlist', url: window.location.href })
        } else {
            navigator.clipboard?.writeText(window.location.href)
            message.success('Wishlist link copied!')
        }
    }

    const hasItems = wishlist.items && wishlist.items.length > 0
    const sorted = hasItems ? sortItems(wishlist.items, sort) : []

    return (
        <MainLayout>
            {/* Page container */}
            <div className="bg-surface min-h-screen pb-24 md:pb-12">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10">
                    <Breadcrumb />

                    {/* Two-column shell: account sidebar + content */}
                    <div className="grid grid-cols-1 md:grid-cols-[288px_1fr] gap-8 lg:gap-12 items-start">
                        {/* Account side nav */}
                        <AccountSideNav />

                        {/* Main content canvas */}
                        <section className="space-y-10 min-w-0">

                            {/* ── Page Header ── */}
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                                <div>
                                    <h1 className="font-syne text-4xl sm:text-5xl font-black tracking-tighter text-on-surface leading-tight">
                                        My Wishlist
                                    </h1>
                                    {hasItems ? (
                                        <p className="text-on-surface-variant font-body mt-2 text-base">
                                            You have{' '}
                                            <span className="font-bold text-on-surface">
                                                {wishlist.item_count ?? wishlist.items.length}
                                            </span>{' '}
                                            {wishlist.item_count === 1 ? 'item' : 'items'} saved for later.
                                        </p>
                                    ) : (
                                        <p className="text-on-surface-variant font-body mt-2 text-base">
                                            Save your favourite items for later.
                                        </p>
                                    )}
                                </div>

                                {hasItems && (
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={handleMoveAllToCart}
                                            className="bg-primary text-on-primary px-6 py-3 rounded-md font-bold text-sm hover:opacity-90 active:scale-95 transition-all flex items-center gap-2 min-h-[44px] shadow-lg shadow-primary-500/20"
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
                                                    formatCurrency={formatCurrency}
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
                                        className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary font-medium text-sm transition-colors"
                                    >
                                        Continue Shopping
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}
