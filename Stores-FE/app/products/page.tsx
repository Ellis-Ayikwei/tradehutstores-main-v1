import { Suspense } from 'react'
import ProductsPageClient from './ProductsPageClient'

function ProductsListingFallback() {
    return (
        <div className="min-h-[40vh] flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-neutral-600 dark:text-neutral-400 text-sm">
            Loading products…
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
