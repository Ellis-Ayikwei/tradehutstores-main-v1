import type { Metadata } from 'next'
import MainLayout from '@/components/Layouts/MainLayout'
import SellerCentralShell from '@/components/seller-central/shell/SellerCentralShell'

export const metadata: Metadata = {
    title: 'Seller Central | TradeHut',
    description: 'Manage your TradeHut store: listings, orders and store settings.',
    robots: { index: false, follow: false },
}

export default function SellerCentralLayout({ children }: { children: React.ReactNode }) {
    return (
        <MainLayout>
            <SellerCentralShell>{children}</SellerCentralShell>
        </MainLayout>
    )
}
