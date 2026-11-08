import type { Metadata } from 'next'
import PlaceholderSection from '@/components/seller-central/ui/PlaceholderSection'

export const metadata: Metadata = {
    title: 'Auctions | Seller Central',
}

export default function SellerAuctionsPage() {
    return (
        <PlaceholderSection
            title="Auctions"
            description="Run auctions in Bid Central and follow live bids"
            emptyTitle="Your auctions will appear here"
            emptyDescription="Auctions you create and the bids placed on them show up here."
            disabledAction="Create auction"
        />
    )
}
