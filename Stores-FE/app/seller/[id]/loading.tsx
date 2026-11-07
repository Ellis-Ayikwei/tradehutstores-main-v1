import { ProductCardSkeleton, ProductGrid } from '@/components/common/marketplace'

export default function SellerStoreLoading() {
    return (
        <div aria-busy="true" aria-label="Loading store">
            <div className="mx-auto max-w-screen-2xl animate-pulse px-3 pt-3 sm:px-4 lg:px-6">
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    <div className="h-16 bg-gray-200 dark:bg-gray-800 sm:h-24 lg:h-32" />
                    <div className="flex items-end gap-3 px-3 pb-3 sm:px-4">
                        <div className="-mt-7 h-16 w-16 shrink-0 rounded-xl border-4 border-white bg-gray-300 dark:border-gray-900 dark:bg-gray-700 sm:-mt-9 sm:h-20 sm:w-20" />
                        <div className="flex-1 space-y-2 pb-1">
                            <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
                            <div className="h-3.5 w-56 max-w-full rounded bg-gray-200 dark:bg-gray-800" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-3 h-11 border-y border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900" />
            <div className="mx-auto max-w-screen-2xl animate-pulse space-y-3 px-3 py-3 sm:px-4 lg:px-6">
                <div className="h-11 rounded-lg bg-gray-200 dark:bg-gray-800 sm:h-10" />
                <ProductGrid>
                    {Array.from({ length: 10 }, (_, i) => (
                        <ProductCardSkeleton key={i} showCta={false} />
                    ))}
                </ProductGrid>
            </div>
        </div>
    )
}
