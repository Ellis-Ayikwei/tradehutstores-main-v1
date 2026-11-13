import type { Metadata } from 'next'
import NewAuctionView from '@/components/seller-central/auctions/NewAuctionView'

export const metadata: Metadata = {
    title: 'Create auction | Seller Central',
}

export default function NewAuctionPage() {
    return <NewAuctionView />
}
