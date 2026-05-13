'use client'

import PromoBar from '@/components/Navigation/PromoBar'
import TopNav from '@/components/Navigation/TopNav'
import SubNav from '@/components/Navigation/SubNav'
import Footer from './Footer'
import { AdModal, AdSlot } from '@/components/Ads'
import { useStoreConfig } from '@/contexts/StoreConfigContext'

interface MainLayoutProps {
    children: React.ReactNode
}

// Holding page rendered when admin sets storefront_status = "maintenance".
function MaintenancePage({ message, support }: { message: string; support?: string }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950 px-6 text-center">
            <div className="max-w-lg space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">We'll be right back</h1>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{message}</p>
                {support && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Need help in the meantime?{' '}
                        <a href={`mailto:${support}`} className="text-orange-600 hover:underline">
                            {support}
                        </a>
                    </p>
                )}
            </div>
        </div>
    )
}

export default function MainLayout({ children }: MainLayoutProps) {
    const { config } = useStoreConfig()

    // Render the holding page once the BE has confirmed maintenance mode.
    // Until the first response arrives we render the storefront optimistically
    // — admins can still bypass via direct admin URLs.
    if (config?.storefront_status === 'maintenance') {
        return (
            <MaintenancePage
                message={
                    config.storefront_description ||
                    "TradeHut Stores is undergoing scheduled maintenance. We'll be back shortly."
                }
                support={config.storefront_support_email}
            />
        )
    }

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
            <div className="sticky top-0 z-50">
                <PromoBar />
                <TopNav />
                <SubNav />
            </div>
            <main className="flex-grow">
                {children}
            </main>
            {/* Footer banner placement — admin-managed; renders nothing if no live ad. */}
            <div className="container mx-auto px-4 mb-6">
                <AdSlot slug="footer-banner" aspectClass="aspect-[21/4] md:aspect-[21/3]" rounded="rounded-2xl" />
            </div>
            <Footer />
            {/* Site-wide entry-intent modal (frequency-capped, dismissible). */}
            <AdModal slug="homepage-modal" />
        </div>
    )
}