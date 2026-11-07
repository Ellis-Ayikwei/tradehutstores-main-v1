'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { createSelector } from '@reduxjs/toolkit'
import { ProductCard as MarketplaceCard, cardVariantsFromRaw } from '@/components/common/marketplace'
import type { CardVariant, MarketplaceProduct, ProductCardProps } from '@/components/common/marketplace'
import { useCurrency } from '@/contexts/CurrencyContext'
import { AppDispatch, RootState } from '@/store'
import { addToCart } from '@/store/cartSlice'
import { addToWishlist, removeFromWishlist } from '@/store/wishListSlice'
import { wishlistItemProductId } from '@/lib/wishlistUtils'

/** productId -> wishlist row id. Rebuilt only when the wishlist items array itself changes. */
const selectWishlistByProduct = createSelector(
    [(state: RootState) => state.wishlist.wishlist.items],
    items => {
        const map = new Map<string, string>()
        for (const row of items ?? []) {
            const pid = wishlistItemProductId(row as { product?: unknown })
            if (pid) map.set(pid, String((row as { id?: unknown }).id))
        }
        return map
    }
)

/**
 * Redux-connected behaviour for one card. Cheap by design:
 * - `wishlisted` is a boolean selector, so a card re-renders only when ITS heart flips (not on any
 *   cart or wishlist change);
 * - handlers read the cart id / wishlist rows from `store.getState()` at click time, so they are
 *   stable and the card does not subscribe to the cart at all;
 * - `adding` is local state: starting an add re-renders only that card.
 */
export function useCardCommerce(productId: string | number) {
    const { formatDisplayPrice } = useCurrency()
    const dispatch = useDispatch<AppDispatch>()
    const store = useStore<RootState>()
    const id = String(productId)
    const wishlisted = useSelector((state: RootState) => selectWishlistByProduct(state).has(id))
    const [adding, setAdding] = useState(false)

    const onToggleWishlist = useCallback(
        (product: MarketplaceProduct) => {
            const pid = String(product.id)
            const entryId = selectWishlistByProduct(store.getState()).get(pid)
            if (entryId) {
                dispatch(removeFromWishlist({ wishlistItemId: entryId })).catch(() => undefined)
                return
            }
            dispatch(addToWishlist({ product_id: pid })).catch(() => undefined)
        },
        [dispatch, store]
    )

    const onAddToCart = useCallback(
        (product: MarketplaceProduct, variant?: CardVariant) => {
            const pid = String(product.id)
            const image = variant?.imageUrl || product.imageUrl || undefined
            const price = variant ? variant.price : product.price
            const list = variant ? (variant.originalPrice ?? variant.price) : (product.originalPrice ?? product.price)
            setAdding(true)
            dispatch(
                addToCart({
                    cart_id: store.getState().cart.cart.id || undefined,
                    product_id: pid,
                    quantity: 1,
                    product_variant_id: variant?.id,
                    variant: variant
                        ? {
                              id: variant.id,
                              name: variant.name ?? '',
                              price: String(variant.price),
                              attribute_values: (variant.attributes ?? []).map(a => ({
                                  attribute_name: a.label,
                                  value_name: a.value,
                              })),
                          }
                        : undefined,
                    product: {
                        id: pid,
                        name: product.title,
                        price: String(list),
                        final_price: String(price),
                        main_product_image: image,
                        image,
                        brand: product.brand,
                        category: product.category,
                    },
                })
            )
                .unwrap()
                .catch(() => undefined)
                .finally(() => setAdding(false))
        },
        [dispatch, store]
    )

    return { formatPrice: formatDisplayPrice, wishlisted, adding, onToggleWishlist, onAddToCart }
}

export type CommerceProductCardProps = Omit<
    ProductCardProps,
    'formatPrice' | 'wishlisted' | 'onToggleWishlist' | 'onAddToCart' | 'addToCartLoading'
>

/**
 * The shared marketplace card wired to cart + wishlist. Use this in every product listing that offers
 * add-to-cart / wishlist (home, flash deals, /products). Memoised: pass a stable `product` object.
 */
export const CommerceProductCard = memo(function CommerceProductCard(props: CommerceProductCardProps) {
    const commerce = useCardCommerce(props.product.id)
    return (
        <MarketplaceCard
            {...props}
            formatPrice={commerce.formatPrice}
            wishlisted={commerce.wishlisted}
            onToggleWishlist={commerce.onToggleWishlist}
            onAddToCart={commerce.onAddToCart}
            addToCartLoading={commerce.adding}
        />
    )
})

interface LegacyProductCardProps {
    product: {
        id: string | number
        name: string
        price: string | number
        original_price?: number
        final_price?: number
        image?: string
        main_product_image?: string
        /** Product variants (API shape with attribute_values); enables colour swatches on the card. */
        variants?: unknown
        default_variant?: string | { id?: string } | null
        condition?: string
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
function LegacyProductCard({
    product,
    viewMode = 'grid',
    variant = 'default',
    showTimer,
    showStock,
}: LegacyProductCardProps) {
    const card = useMemo<MarketplaceProduct>(() => {
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

        return {
            id: product.id,
            title: product.name,
            href: `/products/${product.id}`,
            imageUrl: image,
            price: final,
            originalPrice: original > final ? original : undefined,
            rating: rating > 0 ? rating : undefined,
            reviewCount: reviews > 0 ? reviews : undefined,
            stockLeft: showStock !== false && typeof product.stock === 'number' ? product.stock : undefined,
            endsAt,
            brand: product.brand,
            category: product.category,
            condition: product.condition,
            variants: cardVariantsFromRaw(product.variants, { discountPct: num(product.discount_percentage ?? product.discount) }),
            defaultVariantId:
                typeof product.default_variant === 'string'
                    ? product.default_variant
                    : (product.default_variant?.id ?? undefined),
        }
    }, [product, showTimer, showStock])

    return (
        <CommerceProductCard
            product={card}
            variant={viewMode === 'list' ? 'list' : 'grid'}
            compact={variant === 'compact'}
            deal={variant === 'flash-sale' ? true : undefined}
        />
    )
}

export default memo(LegacyProductCard)
