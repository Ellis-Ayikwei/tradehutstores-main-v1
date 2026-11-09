'use client'

import { memo, useMemo } from 'react'
import { ProductCardSkeleton } from '@/components/common/marketplace'
import type { MarketplaceProduct } from '@/components/common/marketplace'
import { CommerceProductCard } from '@/components/Products/ProductCard'
import type { HomeProduct } from './homeProduct'

/** Maps the normalised home product into the shared card shape. Only real data is passed through. */
export function toMarketplaceProduct(p: HomeProduct): MarketplaceProduct {
    return {
        id: p.id,
        title: p.name,
        href: `/products/${p.id}`,
        imageUrl: p.image || null,
        price: p.price,
        originalPrice: p.discountPct > 0 && p.originalPrice > p.price ? p.originalPrice : undefined,
        rating: p.rating > 0 ? p.rating : undefined,
        reviewCount: p.reviews > 0 ? p.reviews : undefined,
        soldCount: p.sold !== null && p.sold > 0 ? p.sold : undefined,
        stockLeft: p.stock ?? undefined,
        freeShipping: p.freeShipping === true ? true : undefined,
        brand: p.brand || undefined,
        variants: p.variants,
        defaultVariantId: p.defaultVariantId,
    }
}

/** Homepage grid card: the shared marketplace card wired to cart and wishlist. Memoised on the product row. */
function HomeProductCard({
    product,
    sizes = '(min-width: 1024px) 17vw, (min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw',
    priority = false,
    showAddToCart = false,
}: {
    product: HomeProduct
    sizes?: string
    priority?: boolean
    /** Show the Add to cart button on this card. Off on the homepage by default; sections opt in. */
    showAddToCart?: boolean
}) {
    const card = useMemo(() => toMarketplaceProduct(product), [product])
    return <CommerceProductCard product={card} sizes={sizes} priority={priority} showAddToCart={showAddToCart} />
}

export default memo(HomeProductCard)

export function HomeProductCardSkeleton() {
    return <ProductCardSkeleton />
}
