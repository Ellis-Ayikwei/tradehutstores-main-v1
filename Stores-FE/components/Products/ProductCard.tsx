'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star, Eye } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { addToCart } from '@/store/cartSlice'
import { addToWishlist } from '@/store/wishListSlice'
import { motion } from 'framer-motion'
import { useState } from 'react'

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
    const { formatCurrency } = useCurrency()
    const dispatch = useDispatch<AppDispatch>()
    const { cart } = useSelector((state: RootState) => state.cart)
    const [wishlistActive, setWishlistActive] = useState(false)
    const [addingToCart, setAddingToCart] = useState(false)

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

    const handleAddToWishlist = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setWishlistActive((prev) => !prev)
        dispatch(addToWishlist({ product_id: product.id.toString() }))
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

    return (
        <motion.article
            className={`group relative bg-surface-container-lowest rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden ${
                isListView ? 'flex flex-col sm:flex-row' : 'flex flex-col'
            }`}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
        >
            {/* ── Image area ── */}
            <Link
                href={`/products/${product.id}`}
                className={`block relative overflow-hidden bg-surface-container-low ${
                    isListView ? 'w-full sm:w-56 lg:w-72 shrink-0 aspect-[4/3] sm:aspect-auto' : 'aspect-square'
                }`}
            >
                {product.main_product_image || product.image ? (
                    <Image
                        src={(product.main_product_image || product.image) as string}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-110"
                        sizes={isListView ? '(max-width: 640px) 100vw, 288px' : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'}
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full bg-surface-container">
                        <span className="text-on-surface-variant text-xs font-body">No image</span>
                    </div>
                )}

                {/* Discount badge — top-left */}
                {hasDiscount && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-1 bg-error text-on-error text-[10px] font-bold rounded uppercase tracking-tight">
                        -{discountPercentage}%
                    </span>
                )}

                {/* Wishlist button — top-right */}
                <button
                    aria-label={wishlistActive ? 'Remove from wishlist' : 'Add to wishlist'}
                    onClick={handleAddToWishlist}
                    className="absolute top-2 right-2 z-10 p-2 rounded-full bg-surface-container-lowest/60 backdrop-blur-sm hover:bg-surface-container-lowest text-on-surface transition-all duration-200 active:scale-90"
                >
                    <Heart
                        className="w-4 h-4 transition-colors duration-200"
                        fill={wishlistActive ? 'currentColor' : 'none'}
                        style={{ color: wishlistActive ? '#a43d00' : undefined }}
                    />
                </button>

                {/* Quick-view overlay (hover) */}
                <div className={`absolute inset-0 z-10 flex items-center justify-center bg-on-surface/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isListView ? 'sm:hidden' : ''}`}>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-lowest/90 backdrop-blur-sm rounded-full text-on-surface text-xs font-bold shadow-card">
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
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant truncate">
                            {product.category}
                        </span>
                    )}
                    {product.brand && (
                        <span className="text-[10px] font-bold text-primary truncate shrink-0">
                            {product.brand}
                        </span>
                    )}
                </div>

                {/* Product name */}
                <Link href={`/products/${product.id}`}>
                    <h3 className={`font-headline font-bold leading-snug line-clamp-2 text-on-surface hover:text-primary transition-colors duration-200 ${
                        isListView ? 'text-lg min-h-0' : 'text-base min-h-[2.5rem]'
                    }`}>
                        {product.name}
                    </h3>
                </Link>

                {/* Rating row */}
                <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                        {Array.from({ length: fullStars }).map((_, i) => (
                            <Star key={`full-${i}`} className="w-3.5 h-3.5 text-primary fill-primary" />
                        ))}
                        {hasHalfStar && (
                            <Star key="half" className="w-3.5 h-3.5 text-primary fill-primary opacity-50" />
                        )}
                        {Array.from({ length: emptyStars }).map((_, i) => (
                            <Star key={`empty-${i}`} className="w-3.5 h-3.5 text-outline-variant" />
                        ))}
                    </div>
                    <span className="font-mono text-xs font-bold text-on-surface tabular-nums">
                        {ratingValue > 0 ? ratingValue.toFixed(1) : '—'}
                    </span>
                    {product.total_reviews != null && product.total_reviews > 0 && (
                        <span className="text-[10px] text-on-surface-variant">
                            ({product.total_reviews.toLocaleString()})
                        </span>
                    )}
                </div>

                {/* Price row */}
                <div className={`mt-auto border-outline-variant/15 ${isListView ? 'pt-4 mt-2 border-t' : 'pt-3 border-t'}`}>
                    {hasDiscount ? (
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className={`font-mono font-bold text-primary tabular-nums ${isListView ? 'text-xl' : 'text-lg'}`}>
                                {formatCurrency(finalPrice)}
                            </span>
                            <span className="font-mono text-xs text-on-surface-variant line-through tabular-nums">
                                {formatCurrency(originalPrice)}
                            </span>
                        </div>
                    ) : (
                        <span className="font-mono text-lg font-bold text-on-surface tabular-nums">
                            {formatCurrency(price)}
                        </span>
                    )}
                </div>

                {/* Add to cart CTA */}
                <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className={`mt-2 flex items-center justify-center gap-2 bg-primary text-on-primary py-2.5 rounded-xl font-bold text-sm hover:bg-primary-container active:scale-95 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
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
