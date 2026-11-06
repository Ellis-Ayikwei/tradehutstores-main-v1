import Link from 'next/link'
import { Store } from 'lucide-react'

export default function SellerStoreNotFound() {
    return (
        <div className="mx-auto max-w-screen-2xl px-3 py-6 sm:px-4 lg:px-6">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
                <Store className="h-8 w-8 text-gray-500" aria-hidden="true" />
                <h1 className="text-base font-bold text-gray-900 dark:text-white">Store not found</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">This store doesn&apos;t exist or is no longer available.</p>
                <Link
                    href="/products"
                    className="mt-1 inline-flex h-11 items-center rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 sm:h-10"
                >
                    Browse products
                </Link>
            </div>
        </div>
    )
}
