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
import HeaderSearch from '@/components/Navigation/HeaderSearch'
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
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-orange-500 text-white text-[10px] font-extrabold leading-none ring-2 ring-white dark:ring-gray-950 pointer-events-none">
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
    'flex h-11 w-11 items-center justify-center rounded-md text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'

// ─── Component ────────────────────────────────────────────────────────────────

export default function TopNav() {
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
                    className="flex h-11 items-center gap-1.5 rounded-md px-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[11px] font-extrabold text-white">
                        {initials}
                    </span>
                    <span className="hidden lg:flex flex-col items-start leading-tight">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">Hello,</span>
                        <span className="max-w-[88px] truncate text-xs font-bold text-gray-900 dark:text-white">{displayName}</span>
                    </span>
                    <ChevronDown
                        className={`hidden lg:block h-3 w-3 shrink-0 text-gray-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {profileOpen && (
                    <div
                        className="absolute top-full right-0 mt-2 w-64 max-w-[calc(100vw-1rem)] max-h-[min(70vh,520px)] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 z-[200]"
                        style={{ animation: 'dropIn 0.15s cubic-bezier(0.16,1,0.3,1) forwards' }}
                        role="menu"
                    >
                        <div className="px-3 pt-1 pb-2 border-b border-gray-100 dark:border-gray-700">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
                            {displayEmail ? (
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{displayEmail}</p>
                            ) : null}
                            <Link
                                href="/account"
                                onClick={() => setProfileOpen(false)}
                                className="mt-2 flex min-h-[44px] items-center justify-center text-xs font-semibold rounded-md bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900 transition-colors"
                            >
                                Account overview
                            </Link>
                        </div>
                        <SellerNavLink
                            item={sellerNav}
                            onClick={() => setProfileOpen(false)}
                            className="flex min-h-[44px] items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Store className="h-4 w-4 shrink-0 text-orange-500" />
                            <span>{sellerNav.label}</span>
                            {sellerNav.badge ? <SellerNavBadge text={sellerNav.badge} /> : null}
                        </SellerNavLink>
                        <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                            Your account
                        </p>
                        {PROFILE_MENU.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setProfileOpen(false)}
                                role="menuitem"
                                className={`flex min-h-[44px] items-center gap-3 px-3 py-2 text-sm transition-colors
                                    ${pathname === href || pathname.startsWith(`${href}/`)
                                        ? 'bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-semibold'
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <Icon className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400" />
                                <span>{label}</span>
                            </Link>
                        ))}
                        <div className="mt-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                            <button
                                type="button"
                                role="menuitem"
                                className="flex min-h-[44px] w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                                onClick={() => {
                                    setProfileOpen(false)
                                    handleSignOut()
                                }}
                            >
                                <LogOut className="h-4 w-4 shrink-0" />
                                Sign out
                            </button>
                        </div>
                    </div>
                )}
            </div>
        ) : (
            <Link
                href="/auth/login"
                aria-label="Sign in"
                className="flex h-11 items-center gap-1.5 rounded-md px-2.5 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
                <User className="h-5 w-5 shrink-0" />
                <span className="hidden lg:flex flex-col items-start leading-tight">
                    <span className="text-[10px] text-gray-500 dark:text-gray-400">Hello, guest</span>
                    <span className="text-xs font-bold">Sign in</span>
                </span>
            </Link>
        )

    const cartLink = (
        <Link
            href="/cart"
            className="flex h-11 items-center gap-1.5 rounded-md px-2.5 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={`Cart (${cartCount} items)`}
        >
            <NavBadge count={cartCount}>
                <ShoppingCart className="h-6 w-6" />
            </NavBadge>
            <span className="hidden lg:inline text-xs font-bold">Cart</span>
        </Link>
    )

    return (
        <div className="bg-white text-gray-800 border-b border-gray-200 dark:bg-gray-950 dark:text-white dark:border-gray-800">
            <div className="max-w-screen-2xl mx-auto px-2 sm:px-6">
                {/* ── Row 1: menu, logo, (desktop search), actions ── */}
                <div className="flex items-center gap-1 sm:gap-2 min-h-[56px] min-w-0">
                    <button
                        type="button"
                        onClick={() => setDrawerOpen(true)}
                        aria-label="Open menu"
                        aria-haspopup="dialog"
                        aria-expanded={drawerOpen}
                        className={`${iconBtn} lg:hidden shrink-0`}
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="shrink-0 w-[96px] sm:w-[110px] lg:w-auto">
                        <Logo />
                    </div>

                    {/* Desktop search with category select */}
                    <div className="hidden lg:block flex-1 min-w-0 mx-3 max-w-3xl">
                        <HeaderSearch categories={categoryNames} />
                    </div>

                    <div className="flex items-center gap-0.5 ml-auto min-w-0 shrink-0">
                        {/* Ship-to + currency (drawer on mobile/tablet) */}
                        <div className="hidden lg:flex items-center">
                            <ShipToPicker variant="compact" align="right" className="shrink-0" />
                            <CurrencyPicker variant="compact" align="right" className="shrink-0" />
                            <div className="h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1 shrink-0" />
                        </div>

                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            className={`${iconBtn} hidden lg:flex`}
                        >
                            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                        </button>

                        <Link
                            href="/account/wishlist"
                            className={`${iconBtn} hidden sm:flex`}
                            aria-label={`Wishlist (${wishlistCount} items)`}
                        >
                            <NavBadge count={wishlistCount}>
                                <Heart className="h-5 w-5" />
                            </NavBadge>
                        </Link>

                        {accountControl}
                        {cartLink}
                    </div>
                </div>

                {/* ── Row 2 (below lg): full-width search ── */}
                <div className="lg:hidden pb-2">
                    <HeaderSearch categories={[]} />
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

            {/* Keyframe shared by the account menu, pickers and search panel */}
            <style>{`
                @keyframes dropIn {
                    from { opacity: 0; transform: translateY(6px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    )
}
