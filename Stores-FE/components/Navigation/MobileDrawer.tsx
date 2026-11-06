'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
    X,
    ChevronDown,
    Flame,
    Gavel,
    FileText,
    Store,
    Package,
    Heart,
    LifeBuoy,
    ShieldCheck,
    Tag,
    LogOut,
    LogIn,
    User,
    Sun,
    Moon,
    AlertTriangle,
} from 'lucide-react'
import ShipToPicker from '@/components/Navigation/ShipToPicker'
import CurrencyPicker from '@/components/Navigation/CurrencyPicker'
import { categoryHref, useSellerNav, type NavCategory } from '@/components/Navigation/navData'
import SellerNavLink, { SellerNavBadge } from '@/components/seller-onboarding/SellerNavLink'

interface MobileDrawerProps {
    open: boolean
    onClose: () => void
    categories: NavCategory[]
    categoriesLoading: boolean
    categoriesError: boolean
    isAuthenticated: boolean
    displayName: string
    displayEmail: string
    onSignOut: () => void
    theme: 'light' | 'dark'
    onToggleTheme: () => void
}

const row =
    'flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-100 transition-colors'

const sectionLabel =
    'px-3 pb-1 pt-4 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500'

const MARKET_LINKS = [
    { href: '/deals', label: "Today's Deals", icon: Flame, accent: true },
    { href: '/auctions', label: 'Bid Central', icon: Gavel, accent: false },
    { href: '/rfq', label: 'Request a Quote (RFQ)', icon: FileText, accent: false },
] as const

const ACCOUNT_LINKS = [
    { href: '/account/orders', label: 'Orders', icon: Package },
    { href: '/account/bids', label: 'My bids', icon: Gavel },
    { href: '/account/requests', label: 'My requests', icon: FileText },
    { href: '/account/disputes', label: 'Disputes', icon: AlertTriangle },
    { href: '/account/wishlist', label: 'Wishlist', icon: Heart },
] as const

const HELP_LINKS = [
    { href: '/buyer-protection', label: 'Buyer protection', icon: ShieldCheck },
    { href: '/buyer-central', label: 'Buyer Central', icon: Tag },
    { href: '/help', label: 'Help', icon: LifeBuoy },
] as const

export default function MobileDrawer({
    open,
    onClose,
    categories,
    categoriesLoading,
    categoriesError,
    isAuthenticated,
    displayName,
    displayEmail,
    onSignOut,
    theme,
    onToggleTheme,
}: MobileDrawerProps) {
    const [expanded, setExpanded] = useState<number | null>(null)
    const closeRef = useRef<HTMLButtonElement>(null)
    const sellerNav = useSellerNav()

    // Lock page scroll, close on Escape, move focus into the drawer.
    useEffect(() => {
        if (!open) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        closeRef.current?.focus()
        return () => {
            document.body.style.overflow = prev
            document.removeEventListener('keydown', onKey)
        }
    }, [open, onClose])

    // Drawer is a below-lg pattern; close if the viewport grows past it.
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)')
        const handler = () => {
            if (mq.matches) onClose()
        }
        mq.addEventListener('change', handler)
        return () => mq.removeEventListener('change', handler)
    }, [onClose])

    return (
        <div
            className={`fixed inset-0 z-[400] lg:hidden ${open ? '' : 'pointer-events-none invisible'}`}
            style={{ transition: open ? undefined : 'visibility 0s linear 0.25s' }}
            aria-hidden={!open}
        >
            {/* Backdrop */}
            <button
                type="button"
                tabIndex={open ? 0 : -1}
                aria-label="Close menu"
                onClick={onClose}
                className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Panel */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Main menu"
                className={`absolute inset-y-0 left-0 flex w-[88%] max-w-[360px] flex-col bg-white dark:bg-gray-950 shadow-2xl transition-transform duration-[250ms] ease-out ${
                    open ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between gap-2 bg-orange-500 px-3 py-2 text-white">
                    {isAuthenticated ? (
                        <Link href="/account" onClick={onClose} className="flex min-h-[44px] min-w-0 items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600">
                                <User className="h-5 w-5" />
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-bold">Hi, {displayName}</span>
                                {displayEmail && (
                                    <span className="block truncate text-[11px] text-orange-100">{displayEmail}</span>
                                )}
                            </span>
                        </Link>
                    ) : (
                        <Link href="/auth/login" onClick={onClose} className="flex min-h-[44px] items-center gap-2.5 text-sm font-bold">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-600">
                                <LogIn className="h-5 w-5" />
                            </span>
                            Sign in or create account
                        </Link>
                    )}
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close menu"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-orange-600"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Scroll body */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-6">
                    <SellerNavLink
                        item={sellerNav}
                        onClick={onClose}
                        className="mt-2 flex min-h-[48px] items-center gap-3 rounded-lg bg-orange-500 px-3 text-sm font-bold text-white hover:bg-orange-600 active:bg-orange-700 transition-colors"
                    >
                        <Store className="h-5 w-5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{sellerNav.label}</span>
                        {sellerNav.badge ? <SellerNavBadge text={sellerNav.badge} /> : null}
                    </SellerNavLink>

                    <p className={sectionLabel}>Marketplace</p>
                    {MARKET_LINKS.map(({ href, label, icon: Icon, accent }) => (
                        <Link key={href} href={href} onClick={onClose} className={row}>
                            <Icon className={`h-5 w-5 shrink-0 ${accent ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`} />
                            {label}
                        </Link>
                    ))}

                    <p className={sectionLabel}>Shop by category</p>
                    {categories.length === 0 && (
                        <p className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {categoriesLoading
                                ? 'Loading categories…'
                                : categoriesError
                                  ? 'Categories could not be loaded. Try again shortly.'
                                  : 'No categories yet.'}
                        </p>
                    )}
                    {categories.map((cat, i) => {
                        const isOpen = expanded === i
                        return (
                            <div key={cat.name}>
                                <button
                                    type="button"
                                    onClick={() => setExpanded(isOpen ? null : i)}
                                    aria-expanded={isOpen}
                                    className={`${row} w-full justify-between`}
                                >
                                    <span className="flex min-w-0 items-center gap-3">
                                        <span className="w-5 text-center text-base leading-none">{cat.icon}</span>
                                        <span className="truncate">{cat.name}</span>
                                    </span>
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-orange-500' : ''}`}
                                    />
                                </button>
                                {isOpen && (
                                    <div className="mb-1 ml-8 border-l border-gray-100 pl-2 dark:border-gray-800">
                                        <Link
                                            href={categoryHref(cat.name)}
                                            onClick={onClose}
                                            className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950"
                                        >
                                            All {cat.name}
                                        </Link>
                                        {cat.subcategories.map((sub) => (
                                            <Link
                                                key={sub.name}
                                                href={categoryHref(cat.name, sub.name)}
                                                onClick={onClose}
                                                className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg px-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                                            >
                                                <span className="min-w-0 truncate">{sub.name}</span>
                                                <span className="shrink-0 text-xs tabular-nums text-gray-400">
                                                    {sub.count.toLocaleString()}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    <Link href="/categories" onClick={onClose} className={`${row} text-orange-600 dark:text-orange-400`}>
                        Browse all categories
                    </Link>

                    {isAuthenticated && (
                        <>
                            <p className={sectionLabel}>Your account</p>
                            {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
                                <Link key={href} href={href} onClick={onClose} className={row}>
                                    <Icon className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
                                    {label}
                                </Link>
                            ))}
                        </>
                    )}

                    <p className={sectionLabel}>Help &amp; trust</p>
                    {HELP_LINKS.map(({ href, label, icon: Icon }) => (
                        <Link key={href} href={href} onClick={onClose} className={row}>
                            <Icon className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
                            {label}
                        </Link>
                    ))}

                    <p className={sectionLabel}>Settings</p>
                    <div className="space-y-2 px-1">
                        <ShipToPicker variant="panel" />
                        <CurrencyPicker variant="panel" />
                    </div>
                    <button type="button" onClick={onToggleTheme} className={`${row} mt-2 w-full`}>
                        {theme === 'dark' ? (
                            <Sun className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
                        ) : (
                            <Moon className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
                        )}
                        {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    </button>

                    {isAuthenticated && (
                        <button
                            type="button"
                            onClick={() => {
                                onClose()
                                onSignOut()
                            }}
                            className={`${row} mt-1 w-full text-red-600 dark:text-red-400`}
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            Sign out
                        </button>
                    )}
                </div>
            </aside>
        </div>
    )
}
