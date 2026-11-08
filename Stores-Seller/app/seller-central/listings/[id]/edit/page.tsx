import type { Metadata } from 'next'
import ListingWizard from '@/components/seller-central/listings/ListingWizard'

export const metadata: Metadata = {
    title: 'Edit listing | Seller Central',
}

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <ListingWizard productId={id} />
}
