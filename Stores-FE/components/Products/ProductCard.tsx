'use client'

import { useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ProductCard as MarketplaceCard } from '@/components/common/marketplace'
import type { MarketplaceProduct } from '@/components/common/marketplace'
import { useCurrency } from '@/contexts/CurrencyContext'
import { AppDispatch, RootState } from '@/store'
import { addToCart } from '@/store/cartSlice'
import { addToWishlist, removeFromWishlist } from '@/store/wishListSlice'
import { wishlistItemProductId } from '@/lib/wishlistUtils'

/**
 * Redux-connected behaviour for the shared marketplace card: wishlist toggle and add-to-cart.
 * Other card wrappers (home grids, flash deals) reuse this so every card acts the same way.
 */
export function useCardCommerce() {
    const { formatDisplayPrice } = useCurrency()
    const dispatch = useDispatch<AppDispatch>()
    const cartId = useSelector((state: RootState) => state.cart.cart.id)
    const wishlistItems = useSelector((state: RootState) => state.wishlist.wishlist.items)
    const [addingId, setAddingId] = useState<string | null>(null)

    const wishlistByProduct = useMemo(() => {
        const map = new Map<string, string>()
        for (const row of wishlistItems ?? []) {
            const pid = wishlistItemProductId(row as { product?: unknown })
            if (pid) map.set(pid, String((row as { id?: unknown }).id))
        }
        return map
    }, [wishlistItems])

    const onToggleWishlist = useCallback(
        (product: MarketplaceProduct) => {
            const id = String(product.id)
            const entryId = wishlistByProduct.get(id)
            if (entryId) {
                dispatch(removeFromWishlist({ wishlistItemId: entryId })).catch(() => undefined)
                return
            }
            dispatch(addToWishlist({ product_id: id })).catch(() => undefined)
        },
        [dispatch, wishlistByProduct]
    )

    const onAddToCart = useCallback(
        (product: MarketplaceProduct) => {
            const id = String(product.id)
            const image = product.imageUrl ?? undefined
            setAddingId(id)
            dispatch(
                addToCart({
                    cart_id: cartId || undefined,
                    product_id: id,
                    quantity: 1,
                    product: {
                        id,
                        name: product.title,
                        price: String(product.originalPrice ?? product.price),
                        final_price: String(product.price),
                        main_product_image: image,
                        image,
                        brand: product.brand,
                        category: product.category,
                    },
                })
            )
                .unwrap()
                .catch(() => undefined)
                .finally(() => setAddingId(null))
        },
        [dispatch, cartId]
    )

    return {
        formatPrice: formatDisplayPrice,
        isWishlisted: (id: string | number) => wishlistByProduct.has(String(id)),
        isAdding: (id: string | number) => addingId === String(id),
        onToggleWishlist,
        onAddToCart,
    }
}

interface LegacyProductCardProps {
    product: {
        id: string | number
        name: string
        price: string | number
        original_price?: number
        final_price?: number
        image?: string
        main_product_image?: string
        /** Optional gallery; the first image that differs from the main one is used for the hover crossfade. */
        images?: Array<string | { image?: string; url?: string } | null>
        second_image?: string
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

function num(value: unknown): number {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number.parseFloat(value) : NaN
    return Number.isFinite(n) ? n : 0
}

/**
 * Thin wrapper kept for existing callers (product detail "related products").
 * Maps the raw API product into the shared marketplace card.
 */
export default function ProductCard({
    product,
    viewMode = 'grid',
    variant = 'default',
    showTimer,
    showStock,
}: LegacyProductCardProps) {
    const commerce = useCardCommerce()

    const list = num(product.price)
    const final = num(product.final_price) || list
    const original = num(product.original_price) || list
    const rating = num(product.average_rating ?? product.rating)
    const reviews = num(product.total_reviews ?? product.reviews)
    const image = product.main_product_image || product.image || null

    let endsAt: string | undefined
    if (product.flash_sale_end && showTimer !== false) {
        const d = new Date(product.flash_sale_end)
        if (!Number.isNaN(d.getTime())) endsAt = d.toISOString()
    }

    const gallery = [
        product.second_image,
        ...(product.images ?? []).map(i => (typeof i === 'string' ? i : (i?.image ?? i?.url))),
    ].filter((v): v is string => typeof v === 'string' && v.length > 0)

    const card: MarketplaceProduct = {
        id: product.id,
        title: product.name,
        href: `/products/${product.id}`,
        imageUrl: image,
        images: gallery.length > 0 ? gallery : undefined,
        price: final,
        originalPrice: original > final ? original : undefined,
        rating: rating > 0 ? rating : undefined,
        reviewCount: reviews > 0 ? reviews : undefined,
        stockLeft: showStock !== false && typeof product.stock === 'number' ? product.stock : undefined,
        endsAt,
        brand: product.brand,
        category: product.category,
    }

    return (
        <MarketplaceCard
            product={card}
            variant={viewMode === 'list' ? 'list' : 'grid'}
            compact={variant === 'compact'}
            deal={variant === 'flash-sale' ? true : undefined}
            formatPrice={commerce.formatPrice}
            wishlisted={commerce.isWishlisted(product.id)}
            onToggleWishlist={commerce.onToggleWishlist}
            onAddToCart={commerce.onAddToCart}
            addToCartLoading={commerce.isAdding(product.id)}
        />
    )
}
