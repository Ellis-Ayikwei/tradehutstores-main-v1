import { Suspense } from 'react'
import type { Metadata } from 'next'
import AuctionsView from '@/components/seller-central/auctions/AuctionsView'

export const metadata: Metadata = {
    title: 'Auctions | Seller Central',
}

function AuctionsFallback() {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="Loading auctions">
            <div className="h-12 w-40 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-72 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>
    )
}

export default function SellerAuctionsPage() {
    return (
        <Suspense fallback={<AuctionsFallback />}>
            <AuctionsView />
        </Suspense>
    )
}
