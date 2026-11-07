'use client'

import { memo, useMemo } from 'react'
import { ProductCardSkeleton } from '@/components/common/marketplace'
import { toMarketplaceProduct } from '@/components/Home/HomeProductCard'
import type { HomeProduct } from '@/components/Home/homeProduct'
import { CommerceProductCard } from '@/components/Products/ProductCard'

const FLASH_SIZES = '(min-width: 1024px) 192px, (min-width: 640px) 176px, 160px'

/**
 * Flash-deal tile: the shared card in deal mode (solid red discount badge, claimed progress bar).
 * The bar only renders when both sold and stock are known (no invented numbers).
 */
export const FlashSaleCard = memo(function FlashSaleCard({ product }: { product: HomeProduct }) {
    const card = useMemo(() => toMarketplaceProduct(product), [product])
    return <CommerceProductCard product={card} deal compact sizes={FLASH_SIZES} />
})

export function FlashSaleCardSkeleton() {
    return <ProductCardSkeleton compact />
}

export default FlashSaleCard
