'use client'

import { ProductCard, ProductCardSkeleton } from '@/components/common/marketplace'
import type { MarketplaceProduct } from '@/components/common/marketplace'
import { useCardCommerce } from '@/components/Products/ProductCard'
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
    }
}

/** Homepage grid card: the shared marketplace card wired to cart and wishlist. */
export default function HomeProductCard({
    product,
    sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 17vw',
    priority = false,
}: {
    product: HomeProduct
    sizes?: string
    priority?: boolean
}) {
    const commerce = useCardCommerce()
    return (
        <ProductCard
            product={toMarketplaceProduct(product)}
            sizes={sizes}
            priority={priority}
            formatPrice={commerce.formatPrice}
            wishlisted={commerce.isWishlisted(product.id)}
            onToggleWishlist={commerce.onToggleWishlist}
            onAddToCart={commerce.onAddToCart}
            addToCartLoading={commerce.isAdding(product.id)}
        />
    )
}

export function HomeProductCardSkeleton() {
    return <ProductCardSkeleton />
}
