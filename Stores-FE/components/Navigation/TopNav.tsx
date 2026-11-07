'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import {
    ShoppingCart,
    User,
    MapPin,
    ChevronDown,
    Sun,
    Moon,
    Heart,
    Package,
    Gavel,
    FileText,
    CreditCard,
    Bell,
    Shield,
    LogOut,
    Menu,
    AlertTriangle,
    Store,
} from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import type { AppDispatch, RootState } from '@/store'
import { logoutUser } from '@/store/authSlice'
import useAuthUser from 'react-auth-kit/hooks/useAuthUser'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import useSignOut from 'react-auth-kit/hooks/useSignOut'
import { useTheme } from '@/contexts/ThemeContext'
import Logo from '../common/logo'
import CurrencyPicker from '@/components/Navigation/CurrencyPicker'
import ShipToPicker from '@/components/Navigation/ShipToPicker'
import SearchBar from '@/components/common/SearchBar'
import MobileDrawer from '@/components/Navigation/MobileDrawer'
import { OPEN_NAV_DRAWER_EVENT, useNavCategories, useSellerNav } from '@/components/Navigation/navData'
import SellerNavLink, { SellerNavBadge } from '@/components/seller-onboarding/SellerNavLink'

// ─── Count badge (no antd) ───────────────────────────────────────────────────
// count=0 → hidden. count>99 → "99+".

function NavBadge({ count, children }: { count: number; children: React.ReactNode }) {
    const label = count > 99 ? '99+' : String(count)
    return (
        <span className="relative inline-flex">
            {children}
            {count > 0 && (
                <span className="pointer-events-none absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-700 px-1 text-xs font-bold leading-none text-white ring-2 ring-white dark:ring-zinc-950">
                    {label}
                </span>
            )}
        </span>
    )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

type AuthKitUser = { id: string; name: string; email: string; uuid?: string }

// Every href below has a page under Stores-FE/app (verified).
const PROFILE_MENU = [
    { href: '/account/orders',           label: 'Orders',          icon: Package },
    { href: '/account/bids',             label: 'My bids',         icon: Gavel },
    { href: '/account/requests',         label: 'My requests',     icon: FileText },
    { href: '/account/disputes',         label: 'Disputes',        icon: AlertTriangle },
    { href: '/account/wishlist',         label: 'Wishlist',        icon: Heart },
    { href: '/account/addresses',        label: 'Addresses',       icon: MapPin },
    { href: '/account/payment-methods',  label: 'Payment methods', icon: CreditCard },
    { href: '/account/notifications',    label: 'Notifications',   icon: Bell },
    { href: '/account/security',         label: 'Security',        icon: Shield },
] as const

const iconBtn =
    'flex h-11 w-11 items-center justify-center rounded-md text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800'

const textBtn =
    'flex h-11 items-center gap-1.5 rounded-md px-2 text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800'

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Row 3 (below lg): deliver-to + currency, 44px tap targets inside a 32px strip.
 * Rendered by MainLayout in normal flow (it scrolls away with the page); hidden at lg+
 * where both pickers live in the header row.
 */
export function TopNavStrip() {
    return (
        <div className="bg-zinc-100 dark:bg-zinc-800 lg:hidden">
            <div className="mx-auto flex h-8 max-w-screen-2xl items-center justify-between gap-3 px-3 sm:px-4">
                <ShipToPicker variant="strip" className="min-w-0 flex-1" />
                <CurrencyPicker variant="strip" className="shrink-0" />
            </div>
        </div>
    )
}

/**
 * Rows 1-2 (logo / actions / search) plus the single mobile drawer.
 * The sticky wrapper in MainLayout supplies the solid background and bottom border.
 */
export function TopNavMain() {
    const [profileOpen, setProfileOpen] = useState(false)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const profileRef = useRef<HTMLDivElement>(null)

    const dispatch = useDispatch<AppDispatch>()
    const signOut = useSignOut()
    const isAuthenticated = useIsAuthenticated()
    const authUser = useAuthUser<AuthKitUser>()

    const cart     = useSelector((state: RootState) => state.cart.cart)
    const wishlist = useSelector((state: RootState) => state.wishlist.wishlist)

    const { theme, toggleTheme } = useTheme()
    const pathname = usePathname()
    const { categories, loading: categoriesLoading, error: categoriesError } = useNavCategories()
    const categoryNames = useMemo(() => categories.map((c) => c.name), [categories])
    const sellerNav = useSellerNav()

    const displayName = authUser?.name?.trim() || authUser?.email?.split('@')[0] || 'Account'
    const displayEmail = authUser?.email?.trim() ?? ''

    const initials = useMemo(() => {
        const n = authUser?.name?.trim()
        if (n) {
            const parts = n.split(/\s+/).filter(Boolean)
            if (parts.length >= 2) {
                return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
            }
            return (parts[0]?.slice(0, 2) ?? 'U').toUpperCase()
        }
        const e = authUser?.email?.trim()
        if (e) return e.slice(0, 2).toUpperCase()
        return 'U'
    }, [authUser?.name, authUser?.email])

    // Guest cart/wishlist hydrate from localStorage on the client, so only show
    // counts after mount to avoid a server/client markup mismatch.
    useEffect(() => setMounted(true), [])
    const cartCount = mounted ? cart?.item_count ?? 0 : 0
    const wishlistCount = mounted ? wishlist?.item_count ?? wishlist?.items?.length ?? 0 : 0

    const closeDrawer = useCallback(() => setDrawerOpen(false), [])
    const handleSignOut = useCallback(() => {
        void dispatch(logoutUser({ signOut }))
    }, [dispatch, signOut])

    // SubNav's mobile rail opens the drawer via a window event.
    useEffect(() => {
        const open = () => setDrawerOpen(true)
        window.addEventListener(OPEN_NAV_DRAWER_EVENT, open)
        return () => window.removeEventListener(OPEN_NAV_DRAWER_EVENT, open)
    }, [])

    // Close menus on navigation.
    useEffect(() => {
        setDrawerOpen(false)
        setProfileOpen(false)
    }, [pathname])

    useEffect(() => {
        function handler(e: MouseEvent) {
            const t = e.target as Node
            if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    // Esc closes the profile menu and returns focus to its trigger.
    useEffect(() => {
        if (!profileOpen) return
        function onKey(e: KeyboardEvent) {
            if (e.key !== 'Escape') return
            setProfileOpen(false)
            profileRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')?.focus()
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [profileOpen])

    const menuLink = 'flex min-h-[44px] items-center gap-3 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'

    // Auth state is client-only (cookie/redux), so gate on `mounted` to keep
    // server and first client render identical.
    const accountControl =
        mounted && isAuthenticated && authUser ? (
            <div ref={profileRef} className="relative">
                <button
                    type="button"
                    onClick={() => setProfileOpen((v) => !v)}
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                    aria-label="Account menu"
                    className={textBtn}
                >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white lg:hidden">
                        {initials}
                    </span>
                    <span className="hidden flex-col items-start leading-tight lg:flex">
                        <span className="max-w-[96px] truncate text-xs text-zinc-600 dark:text-zinc-400">Hello, {displayName}</span>
                        <span className="flex items-center gap-0.5 text-sm font-bold">
                            Account &amp; lists
                            <ChevronDown className={`h-3.5 w-3.5 shrink-0 ${profileOpen ? 'rotate-180' : ''}`} aria-hidden />
                        </span>
                    </span>
                </button>

                {profileOpen && (
                    <div
                        className="absolute right-0 top-full z-[200] mt-1 max-h-[min(70vh,520px)] w-64 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-md border border-zinc-300 bg-white py-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                        role="menu"
                    >
                        <div className="border-b border-zinc-200 px-3 pb-2 pt-1 dark:border-zinc-800">
                            <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{displayName}</p>
                            {displayEmail ? (
                                <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">{displayEmail}</p>
                            ) : null}
                            <Link
                                href="/account"
                                onClick={() => setProfileOpen(false)}
                                className="flex min-h-[44px] items-center text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400"
                            >
                                Account overview
                            </Link>
                        </div>
                        <SellerNavLink
                            item={sellerNav}
                            onClick={() => setProfileOpen(false)}
                            className={`${menuLink} font-semibold`}
                        >
                            <Store className="h-4 w-4 shrink-0" aria-hidden />
                            <span>{sellerNav.label}</span>
                            {sellerNav.badge ? <SellerNavBadge text={sellerNav.badge} /> : null}
                        </SellerNavLink>
                        <p className="border-t border-zinc-200 px-3 pb-1 pt-2 text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                            Your account
                        </p>
                        {PROFILE_MENU.map(({ href, label, icon: Icon }) => {
                            const current = pathname === href || pathname.startsWith(`${href}/`)
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setProfileOpen(false)}
                                    role="menuitem"
                                    className={`${menuLink} ${current ? 'bg-zinc-100 font-semibold dark:bg-zinc-800' : ''}`}
                                >
                                    <Icon className="h-4 w-4 shrink-0 text-zinc-600 dark:text-zinc-400" aria-hidden />
                                    <span>{label}</span>
                                </Link>
                            )
                        })}
                        <div className="mt-1 border-t border-zinc-200 pt-1 dark:border-zinc-800">
                            <button
                                type="button"
                                role="menuitem"
                                className="flex min-h-[44px] w-full items-center gap-3 px-3 py-2 text-sm text-red-700 hover:bg-zinc-100 dark:text-red-400 dark:hover:bg-zinc-800"
                                onClick={() => {
                                    setProfileOpen(false)
                                    handleSignOut()
                                }}
                            >
                                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                                Sign out
                            </button>
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <Link href="/auth/login" aria-label="Sign in" className={textBtn}>
                <User className="h-6 w-6 shrink-0 lg:hidden" aria-hidden />
                <span className="hidden flex-col items-start leading-tight lg:flex">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Hello, sign in</span>
                    <span className="text-sm font-bold">Account &amp; lists</span>
                </span>
            </Link>
        )

    return (
        <div className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
            {/*
              Rows 1-2 share one flex-wrap container so the single SearchBar moves with CSS only:
              below md  -> row 1: menu, logo, actions; row 2: search (full width)
              md        -> one row: menu, logo, search (flex-1), actions
              lg+       -> one row: logo, deliver to, search, currency, theme, account, orders, cart
            */}
            <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center gap-x-1 px-3 sm:px-4 md:gap-x-2 lg:h-16 lg:flex-nowrap lg:gap-x-3 lg:px-6">
                <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open menu"
                    aria-haspopup="dialog"
                    aria-expanded={drawerOpen}
                    className={`${iconBtn} order-1 -ml-2 my-0.5 shrink-0 lg:hidden`}
                >
                    <Menu className="h-6 w-6" aria-hidden />
                </button>

                <div className="order-2 my-0.5 flex h-11 w-[100px] shrink-0 items-center sm:w-[110px] [&_img]:h-8 [&_img]:w-auto lg:[&_img]:h-9">
                    <Logo />
                </div>

                <div className="order-3 hidden shrink-0 lg:block">
                    <ShipToPicker variant="header" />
                </div>

                <div className="order-6 mb-1.5 w-full md:order-4 md:my-0.5 md:w-auto md:min-w-0 md:flex-1 lg:my-0 lg:max-w-3xl">
                    <SearchBar categories={categoryNames} />
                </div>

                <div className="order-5 my-0.5 ml-auto flex shrink-0 items-center gap-0.5 lg:my-0">
                    <div className="hidden lg:block">
                        <CurrencyPicker variant="header" />
                    </div>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        className={`${iconBtn} hidden lg:flex`}
                    >
                        {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
                    </button>

                    <Link
                        href="/account/wishlist"
                        className={`${iconBtn} hidden sm:flex lg:hidden xl:flex`}
                        aria-label={`Wishlist (${wishlistCount} items)`}
                    >
                        <NavBadge count={wishlistCount}>
                            <Heart className="h-5 w-5" aria-hidden />
                        </NavBadge>
                    </Link>

                    {accountControl}

                    <Link href="/account/orders" className={`${textBtn} hidden text-sm font-bold xl:flex`}>
                        Orders
                    </Link>

                    <Link
                        href="/cart"
                        className={`${textBtn} px-2.5`}
                        aria-label={`Cart (${cartCount} items)`}
                    >
                        <NavBadge count={cartCount}>
                            <ShoppingCart className="h-6 w-6" aria-hidden />
                        </NavBadge>
                        <span className="hidden text-sm font-bold xl:inline">Cart</span>
                    </Link>
                </div>
            </div>

            <MobileDrawer
                open={drawerOpen}
                onClose={closeDrawer}
                categories={categories}
                categoriesLoading={categoriesLoading}
                categoriesError={categoriesError}
                isAuthenticated={Boolean(isAuthenticated && authUser)}
                displayName={displayName}
                displayEmail={displayEmail}
                onSignOut={handleSignOut}
                theme={theme}
                onToggleTheme={toggleTheme}
            />
        </div>
    )
}

/** Back-compat: the full header (rows 1-3) as one block with its own bottom border. */
export default function TopNav() {
    return (
        <div className="border-b border-zinc-200 dark:border-zinc-800">
            <TopNavMain />
            <TopNavStrip />
        </div>
    )
}
