import type { ReactNode } from 'react'
import SellerFooter from './SellerFooter'
import SellerHeader from './SellerHeader'

/** Page frame for every Seller Central route: lean seller header, page content, lean footer. */
export default function MainLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-white dark:bg-zinc-950">
            <SellerHeader />
            <main className="flex-grow">{children}</main>
            <SellerFooter />
        </div>
    )
}
