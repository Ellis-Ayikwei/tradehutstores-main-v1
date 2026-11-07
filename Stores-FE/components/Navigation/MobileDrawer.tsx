'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { X, ChevronDown, Store, LogOut, Sun, Moon } from 'lucide-react'
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
    'flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800'

const sectionLabel = 'px-3 pb-1 pt-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400'

const MARKET_LINKS = [
    { href: '/deals', label: "Today's Deals" },
    { href: '/auctions', label: 'Bid Central' },
    { href: '/rfq', label: 'Request a Quote (RFQ)' },
] as const

const ACCOUNT_LINKS = [
    { href: '/account/orders', label: 'Orders' },
    { href: '/account/bids', label: 'My bids' },
    { href: '/account/requests', label: 'My requests' },
    { href: '/account/disputes', label: 'Disputes' },
    { href: '/account/wishlist', label: 'Wishlist' },
] as const

const HELP_LINKS = [
    { href: '/buyer-protection', label: 'Buyer protection' },
    { href: '/buyer-central', label: 'Buyer Central' },
    { href: '/help', label: 'Help' },
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
            // A picker sheet opened from the drawer handles (and marks) its own Escape first.
            if (e.key === 'Escape' && !e.defaultPrevented) onClose()
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
            aria-hidden={!open}
        >
            {/* Backdrop */}
            <button
                type="button"
                tabIndex={open ? 0 : -1}
                aria-label="Close menu"
                onClick={onClose}
                className={`absolute inset-0 bg-black/50 ${open ? '' : 'hidden'}`}
            />

            {/* Panel */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Main menu"
                className={`absolute inset-y-0 left-0 flex w-[88%] max-w-[360px] flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 ${
                    open ? '' : 'hidden'
                }`}
            >
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between gap-2 bg-primary-700 px-3 py-2 text-white">
                    {isAuthenticated ? (
                        <Link href="/account" onClick={onClose} className="flex min-h-[44px] min-w-0 flex-col justify-center">
                            <span className="block truncate text-sm font-bold">Hello, {displayName}</span>
                            {displayEmail && <span className="block truncate text-xs text-white">{displayEmail}</span>}
                        </Link>
                    ) : (
                        <Link href="/auth/login" onClick={onClose} className="flex min-h-[44px] items-center text-sm font-bold">
                            Sign in or create account
                        </Link>
                    )}
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close menu"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-primary-800"
                    >
                        <X className="h-6 w-6" aria-hidden />
                    </button>
                </div>

                {/* Scroll body */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-6">
                    <SellerNavLink
                        item={sellerNav}
                        onClick={onClose}
                        className="mt-2 flex min-h-[48px] items-center gap-3 rounded-md bg-primary-700 px-3 text-sm font-bold text-white hover:bg-primary-800"
                    >
                        <Store className="h-5 w-5 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1 truncate">{sellerNav.label}</span>
                        {sellerNav.badge ? <SellerNavBadge text={sellerNav.badge} /> : null}
                    </SellerNavLink>

                    <p className={sectionLabel}>Marketplace</p>
                    {MARKET_LINKS.map(({ href, label }) => (
                        <Link key={href} href={href} onClick={onClose} className={row}>
                            {label}
                        </Link>
                    ))}

                    <p className={sectionLabel}>Shop by category</p>
                    {categories.length === 0 && (
                        <p className="px-3 py-3 text-sm text-zinc-600 dark:text-zinc-400">
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
                                    className={`${row} w-full justify-between text-left`}
                                >
                                    <span className="min-w-0 truncate">{cat.name}</span>
                                    <ChevronDown
                                        className={`h-4 w-4 shrink-0 text-zinc-600 dark:text-zinc-400 ${isOpen ? 'rotate-180' : ''}`}
                                        aria-hidden
                                    />
                                </button>
                                {isOpen && (
                                    <div className="mb-1 ml-3 border-l border-zinc-200 pl-2 dark:border-zinc-800">
                                        <Link
                                            href={categoryHref(cat.name)}
                                            onClick={onClose}
                                            className="flex min-h-[44px] items-center rounded-md px-3 text-sm font-semibold text-primary-700 hover:bg-zinc-100 dark:text-primary-400 dark:hover:bg-zinc-800"
                                        >
                                            All {cat.name}
                                        </Link>
                                        {cat.subcategories.map((sub) => (
                                            <Link
                                                key={sub.name}
                                                href={categoryHref(cat.name, sub.name)}
                                                onClick={onClose}
                                                className="flex min-h-[44px] items-center justify-between gap-2 rounded-md px-3 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                            >
                                                <span className="min-w-0 truncate">{sub.name}</span>
                                                <span className="shrink-0 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                                                    {sub.count.toLocaleString()}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    <Link href="/categories" onClick={onClose} className={`${row} font-semibold text-primary-700 dark:text-primary-400`}>
                        Browse all categories
                    </Link>

                    {isAuthenticated && (
                        <>
                            <p className={sectionLabel}>Your account</p>
                            {ACCOUNT_LINKS.map(({ href, label }) => (
                                <Link key={href} href={href} onClick={onClose} className={row}>
                                    {label}
                                </Link>
                            ))}
                        </>
                    )}

                    <p className={sectionLabel}>Help &amp; trust</p>
                    {HELP_LINKS.map(({ href, label }) => (
                        <Link key={href} href={href} onClick={onClose} className={row}>
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
                            <Sun className="h-5 w-5 shrink-0" aria-hidden />
                        ) : (
                            <Moon className="h-5 w-5 shrink-0" aria-hidden />
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
                            className={`${row} mt-1 w-full text-red-700 dark:text-red-400`}
                        >
                            <LogOut className="h-5 w-5 shrink-0" aria-hidden />
                            Sign out
                        </button>
                    )}
                </div>
            </aside>
        </div>
    )
}
