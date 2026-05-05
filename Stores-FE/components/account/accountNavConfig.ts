import type { LucideIcon } from 'lucide-react'
import {
    LayoutDashboard,
    ShoppingBag,
    Gavel,
    FileText,
    Scale,
    Heart,
    MapPin,
    CreditCard,
    MessageCircle,
    Bell,
    User,
    Shield,
    Store,
} from 'lucide-react'

export type AccountNavItem = {
    href: string
    label: string
    Icon: LucideIcon
    /** If true, show a divider above this item */
    sectionBreak?: boolean
}

/**
 * Primary account sidebar — single source for /account/* navigation.
 */
export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
    { href: '/account', label: 'Overview', Icon: LayoutDashboard },
    { href: '/account/orders', label: 'Orders', Icon: ShoppingBag },
    { href: '/account/bids', label: 'Bids & Auctions', Icon: Gavel },
    { href: '/account/requests', label: 'My Requests', Icon: FileText },
    { href: '/account/disputes', label: 'Disputes', Icon: Scale },
    { href: '/account/wishlist', label: 'Wishlist', Icon: Heart },
    { href: '/account/addresses', label: 'Addresses', Icon: MapPin },
    { href: '/account/payment-methods', label: 'Payment Methods', Icon: CreditCard },
    {
        href: '/account/messages',
        label: 'Messages',
        Icon: MessageCircle,
        sectionBreak: true,
    },
    { href: '/account/notifications', label: 'Notifications', Icon: Bell },
    { href: '/account/profile', label: 'Profile', Icon: User },
    { href: '/account/security', label: 'Security', Icon: Shield },
]

export function isAccountNavActive(pathname: string, href: string): boolean {
    if (href === '/account') return pathname === '/account'
    return pathname === href || pathname.startsWith(`${href}/`)
}

/** Compact mobile bottom bar (subset of account nav). */
export const ACCOUNT_BOTTOM_NAV: { href: string; label: string; Icon: LucideIcon }[] = [
    { href: '/', label: 'Home', Icon: Store },
    { href: '/account/bids', label: 'Bids', Icon: Gavel },
    { href: '/account/orders', label: 'Orders', Icon: ShoppingBag },
    { href: '/account/requests', label: 'RFQs', Icon: FileText },
    { href: '/account', label: 'Profile', Icon: User },
]
