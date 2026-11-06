import type { LucideIcon } from 'lucide-react'
import {
    LayoutDashboard,
    ShoppingBag,
    Gavel,
    FileText,
    Scale,
    Heart,
    Star,
    MapPin,
    CreditCard,
    MessageCircle,
    Bell,
    User,
    BadgeCheck,
    Shield,
} from 'lucide-react'

export type AccountNavItem = {
    href: string
    label: string
    Icon: LucideIcon
    /** If true, show a divider above this item (sidebar / drawer only) */
    sectionBreak?: boolean
}

/**
 * Primary account navigation — single source for /account/* links
 * (sidebar, drawer and the section strip rendered by app/account/layout.tsx).
 * Every href must be an existing route under app/account.
 */
export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
    { href: '/account', label: 'Overview', Icon: LayoutDashboard },
    { href: '/account/orders', label: 'Orders', Icon: ShoppingBag },
    { href: '/account/bids', label: 'Bids & Auctions', Icon: Gavel },
    { href: '/account/requests', label: 'My Requests', Icon: FileText },
    { href: '/account/disputes', label: 'Disputes', Icon: Scale },
    { href: '/account/wishlist', label: 'Wishlist', Icon: Heart },
    { href: '/account/reviews', label: 'Reviews', Icon: Star },
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
    { href: '/account/verification', label: 'Verification', Icon: BadgeCheck },
    { href: '/account/security', label: 'Security', Icon: Shield },
]

export function isAccountNavActive(pathname: string, href: string): boolean {
    if (href === '/account') return pathname === '/account'
    return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * Mobile bottom bar: four destinations. AccountShell adds a fifth "More"
 * button that opens the full navigation drawer.
 */
export const ACCOUNT_BOTTOM_NAV: { href: string; label: string; Icon: LucideIcon }[] = [
    { href: '/account', label: 'Account', Icon: LayoutDashboard },
    { href: '/account/orders', label: 'Orders', Icon: ShoppingBag },
    { href: '/account/bids', label: 'Bids', Icon: Gavel },
    { href: '/account/wishlist', label: 'Wishlist', Icon: Heart },
]
