import type { Metadata } from 'next'
import PlaceholderSection from '@/components/seller-central/ui/PlaceholderSection'

export const metadata: Metadata = {
    title: 'Payouts | Seller Central',
}

export default function SellerPayoutsPage() {
    return (
        <PlaceholderSection
            title="Payouts"
            description="Your balance and payout history"
            emptyTitle="Your payouts will appear here"
            emptyDescription="Your balance and payout history show up here."
            disabledAction="Request payout"
        />
    )
}
