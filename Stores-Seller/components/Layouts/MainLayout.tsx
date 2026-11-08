import type { ReactNode } from 'react'
import SellerHeader from './SellerHeader'

/** Page frame for every Seller Central route: the lean seller header above the page content. */
export default function MainLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
            <SellerHeader />
            <main className="flex-grow">{children}</main>
        </div>
    )
}
