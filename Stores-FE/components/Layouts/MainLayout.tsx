'use client'

import PromoBar from '@/components/Navigation/PromoBar'
import TopNav from '@/components/Navigation/TopNav'
import SubNav from '@/components/Navigation/SubNav'
import Footer from './Footer'

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
            <Footer />
        </div>
    )
}