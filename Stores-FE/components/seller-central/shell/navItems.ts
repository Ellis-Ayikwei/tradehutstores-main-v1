import {
    Gavel,
    LayoutDashboard,
    MessageSquareQuote,
    Package,
    Settings,
    ShieldAlert,
    Truck,
    Wallet,
    type LucideIcon,
} from 'lucide-react'

export const SELLER_CENTRAL_HOME = '/seller-central'

export interface SellerNavItem {
    href: string
    label: string
    icon: LucideIcon
    /** Match only the exact path (Overview), otherwise the path and everything under it. */
    exact?: boolean
}

export const SELLER_NAV: SellerNavItem[] = [
    { href: SELLER_CENTRAL_HOME, label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: `${SELLER_CENTRAL_HOME}/listings`, label: 'Listings', icon: Package },
    { href: `${SELLER_CENTRAL_HOME}/orders`, label: 'Orders', icon: Truck },
    { href: `${SELLER_CENTRAL_HOME}/auctions`, label: 'Auctions', icon: Gavel },
    { href: `${SELLER_CENTRAL_HOME}/rfq`, label: 'RFQ', icon: MessageSquareQuote },
    { href: `${SELLER_CENTRAL_HOME}/payouts`, label: 'Payouts', icon: Wallet },
    { href: `${SELLER_CENTRAL_HOME}/disputes`, label: 'Disputes', icon: ShieldAlert },
    { href: `${SELLER_CENTRAL_HOME}/settings`, label: 'Settings', icon: Settings },
]

export function isNavActive(pathname: string, item: SellerNavItem): boolean {
    if (item.exact) return pathname === item.href
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
}
