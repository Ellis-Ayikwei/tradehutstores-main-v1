import type { Metadata } from 'next'
import PlaceholderSection from '@/components/seller-central/ui/PlaceholderSection'

export const metadata: Metadata = {
    title: 'Disputes | Seller Central',
}

export default function SellerDisputesPage() {
    return (
        <PlaceholderSection
            title="Disputes"
            description="Return and refund cases on your orders"
            emptyTitle="Your disputes will appear here"
            emptyDescription="Cases opened by buyers on your orders show up here, with the conversation."
        />
    )
}
