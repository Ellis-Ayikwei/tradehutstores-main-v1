import type { Metadata } from 'next'
import MainLayout from '@/components/Layouts/MainLayout'

export const runtime = 'edge'

export const metadata: Metadata = {
    title: 'Bid Central | TradeHut',
    description: 'Browse live auctions, watch items and place bids on TradeHut Bid Central.',
}

export default function AuctionsLayout({ children }: { children: React.ReactNode }) {
    return <MainLayout>{children}</MainLayout>
}
