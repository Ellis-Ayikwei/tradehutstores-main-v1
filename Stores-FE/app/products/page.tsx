import { Suspense } from 'react'
import { ProductCardSkeleton, ProductGrid } from '@/components/common/marketplace'
import ProductsPageClient from './ProductsPageClient'

function ProductsListingFallback() {
    return (
        <div className="mx-auto max-w-[1440px] px-3 py-3 sm:px-4 lg:px-6" role="status" aria-label="Loading products">
            <div className="mb-2 h-7 w-44 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            <ProductGrid layout="listing">
                {Array.from({ length: 10 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                ))}
            </ProductGrid>
        </div>
    )
}

export default function ProductsPage() {
    return (
        <Suspense fallback={<ProductsListingFallback />}>
            <ProductsPageClient />
        </Suspense>
    )
}
