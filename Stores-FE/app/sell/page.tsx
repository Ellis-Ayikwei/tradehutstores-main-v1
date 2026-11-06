import MainLayout from '@/components/Layouts/MainLayout'
import SellPageClient from '@/components/seller-onboarding/SellPageClient'

export const metadata = {
    title: 'Sell on TradeHut | TradeHut',
    description: 'Apply online to sell on TradeHut. Sign in, tell us about your business, verify your identity and prepare your store.',
}

export default function SellPage() {
    return (
        <MainLayout>
            <main className="mx-auto w-full max-w-2xl px-4 py-4 sm:px-6 sm:py-6">
                <SellPageClient />
            </main>
        </MainLayout>
    )
}
