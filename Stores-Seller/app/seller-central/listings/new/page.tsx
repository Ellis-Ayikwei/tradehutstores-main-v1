import type { Metadata } from 'next'
import ListingWizard from '@/components/seller-central/listings/ListingWizard'

export const metadata: Metadata = {
    title: 'New listing | Seller Central',
}

export default function NewListingPage() {
    return <ListingWizard />
}
