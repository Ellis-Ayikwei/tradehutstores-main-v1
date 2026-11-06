import { Suspense } from 'react'
import type { Metadata } from 'next'
import CompleteClient from './CompleteClient'

export const metadata: Metadata = {
    title: 'Order status',
    robots: { index: false, follow: false },
}

/**
 * /checkout/complete?session=<id> | ?reference=<paystack ref> | ?order=<id>
 * Paystack returns the buyer here with ?reference=; cash-on-delivery lands with ?session=.
 */
export default function CheckoutCompletePage() {
    return (
        <Suspense fallback={<div className="min-h-[60vh] bg-zinc-100 dark:bg-zinc-950" />}>
            <CompleteClient />
        </Suspense>
    )
}
