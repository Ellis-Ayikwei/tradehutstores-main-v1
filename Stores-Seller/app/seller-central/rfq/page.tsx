import type { Metadata } from 'next'
import PlaceholderSection from '@/components/seller-central/ui/PlaceholderSection'

export const metadata: Metadata = {
    title: 'RFQ | Seller Central',
}

export default function SellerRfqPage() {
    return (
        <PlaceholderSection
            title="RFQ"
            description="Buyer requests for quotes that match your categories"
            emptyTitle="Matching requests will appear here"
            emptyDescription="Requests from buyers that match your categories, and the quotes you send, show up here."
        />
    )
}
