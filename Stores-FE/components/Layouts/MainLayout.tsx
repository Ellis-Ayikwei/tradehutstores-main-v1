'use client'

import PromoBar from '@/components/Navigation/PromoBar'
import TopNav from '@/components/Navigation/TopNav'
import SubNav from '@/components/Navigation/SubNav'
import Footer from './Footer'
import { AdModal, AdSlot } from '@/components/Ads'

interface MainLayoutProps {
    children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
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