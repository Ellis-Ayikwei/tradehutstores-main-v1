'use client'

import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function SellerStoreError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="mx-auto max-w-screen-2xl px-3 py-6 sm:px-4 lg:px-6">
            <div role="alert" className="flex flex-col items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-10 text-center dark:border-red-900 dark:bg-gray-900">
                <AlertTriangle className="h-8 w-8 text-red-600" aria-hidden="true" />
                <h1 className="text-base font-bold text-gray-900 dark:text-white">We couldn&apos;t load this store</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Something went wrong on our side. Please try again.</p>
                <div className="mt-1 flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={reset}
                        className="inline-flex h-11 items-center gap-1.5 rounded-lg bg-primary-700 px-4 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 sm:h-10"
                    >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        Try again
                    </button>
                    <Link
                        href="/"
                        className="inline-flex h-11 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 sm:h-10"
                    >
                        Back to home
                    </Link>
                </div>
            </div>
        </div>
    )
}
