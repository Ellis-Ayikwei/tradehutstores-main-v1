import { Suspense } from 'react'
import type { Metadata } from 'next'
import CheckoutClient from './_components/CheckoutClient'
import { CheckoutSkeleton } from './_components/Gates'

export const metadata: Metadata = {
    title: 'Checkout',
    robots: { index: false, follow: false },
}

/**
 * /checkout
 *   (no params)                          cart checkout
 *   ?buyNow=1&product=&variant=&qty=     single-item checkout (product page "Buy now")
 *   ?order=<id>                          pay an existing Pending order (auction win / RFQ award)
 */
export default function CheckoutPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-[60vh] bg-zinc-100 px-3 py-3 dark:bg-zinc-950 sm:px-4 lg:px-6 lg:py-4">
                    <div className="mx-auto max-w-[1440px]">
                        <CheckoutSkeleton />
                    </div>
                </div>
            }
        >
            <CheckoutClient />
        </Suspense>
    )
}
