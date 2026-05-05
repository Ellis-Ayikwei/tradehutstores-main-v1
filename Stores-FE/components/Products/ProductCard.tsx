'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star, Eye } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { addToCart } from '@/store/cartSlice'
import { addToWishlist, removeFromWishlist } from '@/store/wishListSlice'
import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { wishlistItemProductId } from '@/lib/wishlistUtils'

interface ProductCardProps {
    product: {
        id: string | number
        name: string
        price: string | number
        original_price?: number
        final_price?: number
        image?: string
        main_product_image?: string
        average_rating?: string | number
        rating?: number
        total_reviews?: number
        reviews?: number
        discount_percentage?: number
        discount?: number
        category?: string
        brand?: string
        stock?: number
        flash_sale_end?: Date | string
    }
    viewMode?: 'grid' | 'list'
    variant?: 'default' | 'compact' | 'flash-sale'
    showTimer?: boolean
    showStock?: boolean
}

export default function ProductCard({
    product,
    viewMode = 'grid',
    variant = 'default',
    showTimer,
    showStock,
}: ProductCardProps) {
    const { formatDisplayPrice } = useCurrency()
    const dispatch = useDispatch<AppDispatch>()
    const { cart } = useSelector((state: RootState) => state.cart)
    const { wishlist } = useSelector((state: RootState) => state.wishlist)
    const [addingToCart, setAddingToCart] = useState(false)

    const productIdStr = String(product.id)
    const wishlistEntry = useMemo(
        () =>
            (wishlist.items ?? []).find(
                (row: { id?: string; product?: unknown }) =>
                    wishlistItemProductId(row) === productIdStr
            ),
        [wishlist.items, productIdStr]
    )
    const isInWishlist = Boolean(wishlistEntry)

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        setAddingToCart(true)
        dispatch(addToCart({
            cart_id: cart.id || undefined,
            product_id: product.id.toString(),
            quantity: 1,
            product: {
                id: product.id.toString(),
                name: product.name,
                price: price.toString(),
                final_price: finalPrice.toString(),
                main_product_image: product.main_product_image || product.image,
                image: product.image || product.main_product_image,
                brand: product.brand,
                category: product.category,
            }
        }))
        .unwrap()
        .then(() => {
            setAddingToCart(false)
        })
        .catch(() => {
            setAddingToCart(false)
        })
    }

    const handleWishlistToggle = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (wishlistEntry) {
            dispatch(removeFromWishlist({ wishlistItemId: String(wishlistEntry.id) })).catch(
                () => undefined
            )
            return
        }
        dispatch(addToWishlist({ product_id: productIdStr })).catch(() => undefined)
    }

    // ── Price calculations (unchanged logic) ──
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price
    const originalPrice = product.original_price || price
    const finalPrice = product.final_price || price

    let discountPercentage = product.discount_percentage || product.discount
    if (!discountPercentage && originalPrice > finalPrice) {
        discountPercentage = Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
    }

    const hasDiscount = discountPercentage && discountPercentage > 0 && originalPrice > finalPrice
    const rating = typeof product.average_rating === 'string'
        ? parseFloat(product.average_rating)
        : (product.average_rating ?? product.rating)

    // Render 5 star icons (filled up to rating value)
    const ratingValue = rating ?? 0
    const fullStars = Math.floor(ratingValue)
    const hasHalfStar = ratingValue - fullStars >= 0.25 && ratingValue - fullStars < 0.75
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)

    const isListView = viewMode === 'list'

    const rawCardImage = product.main_product_image || product.image
    const cardImageSrc = rawCardImage ? resolveMediaSrc(rawCardImage as string) : ''

    return (
        <motion.article
            className={`group relative bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-md dark:shadow-none hover:shadow-lg dark:hover:shadow-none dark:hover:ring-1 dark:hover:ring-neutral-600 transition-all duration-300 overflow-hidden ${
                isListView ? 'flex flex-col sm:flex-row' : 'flex flex-col'
            }`}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
        >
            {/* ── Image area ── */}
            <Link
                href={`/products/${product.id}`}
                className={`block relative overflow-hidden bg-neutral-100 dark:bg-neutral-800 ${
                    isListView ? 'w-full sm:w-56 lg:w-72 shrink-0 aspect-[4/3] sm:aspect-auto' : 'aspect-square'
                }`}
            >
                {cardImageSrc ? (
                    <Image
                        src={cardImageSrc}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes={isListView ? '(max-width: 640px) 100vw, 288px' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full bg-neutral-200/60 dark:bg-neutral-800">
                        <span className="text-neutral-500 dark:text-neutral-400 text-xs font-body">No image</span>
                    </div>
                )}

                {/* Discount badge — top-left */}
                {hasDiscount && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded uppercase tracking-tight">
                        -{discountPercentage}%
                    </span>
                )}

                {/* Wishlist button — top-right */}
                <button
                    type="button"
                    aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                    aria-pressed={isInWishlist}
                    onClick={handleWishlistToggle}
                    className="absolute top-2 right-2 z-10 p-2 rounded-full bg-white/85 dark:bg-neutral-900/90 backdrop-blur-sm border border-neutral-200/90 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-white dark:hover:bg-neutral-800 transition-all duration-200 active:scale-90"
                >
                    <Heart
                        className={`w-4 h-4 transition-colors duration-200 ${
                            isInWishlist
                                ? 'fill-orange-600 text-orange-600 dark:fill-orange-400 dark:text-orange-400'
                                : ''
                        }`}
                        fill={isInWishlist ? 'currentColor' : 'none'}
                    />
                </button>

                {/* Quick-view overlay (hover) */}
                <div className={`absolute inset-0 z-10 flex items-center justify-center bg-neutral-950/35 dark:bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isListView ? 'sm:hidden' : ''}`}>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-full text-neutral-900 dark:text-neutral-100 text-xs font-bold border border-neutral-200 dark:border-neutral-600 shadow-md">
                        <Eye className="w-3.5 h-3.5" />
                        Quick view
                    </span>
                </div>
            </Link>

            {/* ── Card body ── */}
            <div className={`flex flex-col flex-1 p-4 gap-2 ${isListView ? 'sm:p-5' : ''}`}>

                {/* Category / brand row */}
                <div className="flex items-center justify-between gap-2 min-h-[1.25rem]">
                    {product.category && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400 truncate">
                            {product.category}
                        </span>
                    )}
                    {product.brand && (
                        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 truncate shrink-0">
                            {product.brand}
                        </span>
                    )}
                </div>

                {/* Product name */}
                <Link href={`/products/${product.id}`}>
                    <h3 className={`font-headline font-bold leading-snug line-clamp-2 text-neutral-900 dark:text-neutral-100 hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-200 ${
                        isListView ? 'text-lg min-h-0' : 'text-base min-h-[2.5rem]'
                    }`}>
                        {product.name}
                    </h3>
                </Link>

                {/* Rating row */}
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                        {Array.from({ length: fullStars }).map((_, i) => (
                            <Star key={`full-${i}`} className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                        ))}
                        {hasHalfStar && (
                            <Star key="half" className="w-3.5 h-3.5 text-orange-500 fill-orange-500 opacity-50" />
                        )}
                        {Array.from({ length: emptyStars }).map((_, i) => (
                            <Star key={`empty-${i}`} className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600" />
                        ))}
                    </div>
                    <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                        {ratingValue > 0 ? ratingValue.toFixed(1) : '—'}
                    </span>
                    {product.total_reviews != null && product.total_reviews > 0 && (
                        <span className="text-[10px] text-neutral-600 dark:text-neutral-400">
                            ({product.total_reviews.toLocaleString()})
                        </span>
                    )}
                </div>

                {/* Price row */}
                <div className={`mt-auto border-neutral-200 dark:border-neutral-700 ${isListView ? 'pt-4 mt-2 border-t' : 'pt-3 border-t'}`}>
                    {hasDiscount ? (
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className={`font-mono font-bold text-orange-600 dark:text-orange-400 tabular-nums ${isListView ? 'text-xl' : 'text-lg'}`}>
                                {formatDisplayPrice(finalPrice)}
                            </span>
                            <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 line-through tabular-nums">
                                {formatDisplayPrice(originalPrice)}
                            </span>
                        </div>
                    ) : (
                        <span className="font-mono text-lg font-bold text-neutral-900 dark:text-neutral-100 tabular-nums">
                            {formatDisplayPrice(price)}
                        </span>
                    )}
                </div>

                {/* Add to cart CTA */}
                <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className={`mt-2 flex items-center justify-center gap-2 bg-orange-500 text-white dark:bg-orange-600 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 dark:hover:bg-orange-500 active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
                        isListView ? 'w-full sm:w-fit sm:px-6' : 'w-full'
                    }`}
                >
                    <ShoppingCart className="w-4 h-4 shrink-0" />
                    {addingToCart ? 'Adding…' : 'Add to Cart'}
                </button>
            </div>
        </motion.article>
    )
}
