'use client'

import { ProductCard, ProductCardSkeleton } from '@/components/common/marketplace'
import { toMarketplaceProduct } from '@/components/Home/HomeProductCard'
import type { HomeProduct } from '@/components/Home/homeProduct'
import { useCardCommerce } from '@/components/Products/ProductCard'

/**
 * Flash-deal tile: the shared card in deal mode (solid red discount badge, claimed progress bar).
 * The bar only renders when both sold and stock are known (no invented numbers).
 */
export function FlashSaleCard({ product }: { product: HomeProduct }) {
    const commerce = useCardCommerce()
    return (
        <ProductCard
            product={toMarketplaceProduct(product)}
            deal
            compact
            sizes="(min-width: 1024px) 192px, (min-width: 640px) 176px, 160px"
            formatPrice={commerce.formatPrice}
            wishlisted={commerce.isWishlisted(product.id)}
            onToggleWishlist={commerce.onToggleWishlist}
            onAddToCart={commerce.onAddToCart}
            addToCartLoading={commerce.isAdding(product.id)}
        />
    )
}

export function FlashSaleCardSkeleton() {
    return <ProductCardSkeleton compact />
}

export default FlashSaleCard
