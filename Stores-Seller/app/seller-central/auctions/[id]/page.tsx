import type { Metadata } from 'next'
import AuctionDetailView from '@/components/seller-central/auctions/AuctionDetailView'

export const metadata: Metadata = {
    title: 'Auction | Seller Central',
}

export default async function SellerAuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return <AuctionDetailView id={id} />
}
