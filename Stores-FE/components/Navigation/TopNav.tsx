'use client'

import Link from 'next/link'
import { useState, useRef, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { useSelector, useDispatch } from 'react-redux'
import type { AppDispatch, RootState } from '@/store'
import { logoutUser } from '@/store/authSlice'
import useAuthUser from 'react-auth-kit/hooks/useAuthUser'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import useSignOut from 'react-auth-kit/hooks/useSignOut'
import { useTheme } from '@/contexts/ThemeContext'
import Logo from '../common/logo'
import SearchBar from '@/components/common/SearchBar'
import CurrencyPicker from '@/components/Navigation/CurrencyPicker'
import ShipToPicker from '@/components/Navigation/ShipToPicker'

// ─── Custom badge — no antd dependency ───────────────────────────────────────
// Renders a small pill over the top-right of any child element.
// count=0 → hidden. count>99 → shows "99+".

function NavBadge({ count, children }: { count: number; children: React.ReactNode }) {
    const label = count > 99 ? '99+' : String(count)
    return (
        <span className="relative inline-flex">
            {children}
            {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-orange-500 text-white text-[9px] font-extrabold leading-none ring-2 ring-white dark:ring-gray-950 pointer-events-none">
                    {label}
                </span>
            )}
        </span>
    )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

type AuthKitUser = { id: string; name: string; email: string; uuid?: string }

const PROFILE_MENU = [
    { href: '/account/orders',           label: 'Orders',            icon: Package },
    { href: '/account/bids',             label: 'Bids & Auctions',   icon: Gavel },
    { href: '/account/requests',        label: 'My Requests',       icon: FileText },
    { href: '/wishlist',                label: 'Wishlist',            icon: Heart },
    { href: '/account/addresses',        label: 'Addresses',         icon: MapPin },
    { href: '/account/payment-methods', label: 'Payment Methods',   icon: CreditCard },
    { href: '/account/notifications',   label: 'Notifications',     icon: Bell },
    { href: '/account/security',        label: 'Security',          icon: Shield },
] as const

// ─── Component ────────────────────────────────────────────────────────────────

export default function TopNav() {
    const [profileOpen, setProfileOpen] = useState(false)
    const profileRef = useRef<HTMLDivElement>(null)

    const dispatch = useDispatch<AppDispatch>()
    const signOut = useSignOut()
    const isAuthenticated = useIsAuthenticated()
    const authUser = useAuthUser<AuthKitUser>()

    console.log("the autUser", authUser)

    const cart     = useSelector((state: RootState) => state.cart.cart)
    const wishlist = useSelector((state: RootState) => state.wishlist.wishlist)

    const { theme, toggleTheme } = useTheme()
    const pathname = usePathname()

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

    const cartCount = cart?.item_count ?? 0
    const wishlistCount =
        wishlist?.item_count ?? wishlist?.items?.length ?? 0
    const showTopSearch = pathname !== '/'

    useEffect(() => {
        function handler(e: MouseEvent) {
            const t = e.target as Node
            if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div className="bg-white text-gray-800 border-b border-gray-200 dark:bg-gray-950 dark:text-white dark:border-gray-800">
            <div className="max-w-screen-2xl mx-auto px-2 sm:px-6 overflow-x-clip">
                <div className="flex items-center justify-between h-12 gap-2 min-w-0">

                    {/* ── Logo ── */}
                    <div className="shrink min-w-0 max-w-[128px] sm:max-w-none">
                        <Logo />
                    </div>

                    {/* ── Search (non-home pages) ── */}
                    {showTopSearch && (
                        <div className="hidden md:flex flex-1 max-w-2xl mx-2">
                            <SearchBar variant="navbar" className="w-full" />
                        </div>
                    )}

                    {/* ── Right cluster ── */}
                    <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">

                        {/* Ship-to picker (admin-driven shipping zones) */}
                        <ShipToPicker variant="compact" className="hidden md:block" />

                        {/* Divider */}
                        <div className="hidden md:block h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

                        {/* Currency picker (admin-driven enabled list) */}
                        <CurrencyPicker variant="compact" className="hidden sm:block" />

                        {/* Divider */}
                        <div className="hidden sm:block h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            className="hidden sm:inline-flex p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors text-gray-600 dark:text-white"
                        >
                            {theme === 'dark'
                                ? <Sun  className="h-4 w-4" />
                                : <Moon className="h-4 w-4" />
                            }
                        </button>

                        {/* Wishlist */}
                        <Link
                            href="/wishlist"
                            className="hidden sm:flex items-center gap-1.5 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors text-gray-600 dark:text-white"
                            aria-label={`Wishlist (${wishlistCount} items)`}
                        >
                            <NavBadge count={wishlistCount}>
                                <Heart className="h-4 w-4" />
                            </NavBadge>
                        </Link>

                        {/* Cart */}
                        <Link
                            href="/cart"
                            className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors text-gray-700 dark:text-white"
                            aria-label={`Cart (${cartCount} items)`}
                        >
                            <NavBadge count={cartCount}>
                                <ShoppingCart className="h-4 w-4" />
                            </NavBadge>
                            {/* <span className="hidden md:inline text-xs font-medium">
                                Cart
                                {cartCount > 0 && (
                                    <span className="ml-1 text-orange-500 font-bold">({cartCount})</span>
                                )}
                            </span> */}
                        </Link>

                        {/* Account — profile menu or Sign In */}
                        {isAuthenticated && authUser ? (
                            <div ref={profileRef} className="relative ml-0.5">
                                <button
                                    type="button"
                                    onClick={() => setProfileOpen(v => !v)}
                                    aria-expanded={profileOpen}
                                    aria-haspopup="menu"
                                    className="flex items-center gap-1.5 pl-1.5 pr-2 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition-colors font-semibold text-xs text-white shadow-sm whitespace-nowrap max-w-[min(200px,42vw)]"
                                >
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-extrabold">
                                        {initials}
                                    </span>
                                    {/* <span className="hidden sm:inline truncate">{displayName}</span> */}
                                    <ChevronDown
                                        className={`h-3 w-3 shrink-0 opacity-90 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {profileOpen && (
                                    <div
                                        className="absolute top-full right-0 mt-2 w-64 max-h-[min(70vh,520px)] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 z-[200]"
                                        style={{ animation: 'dropIn 0.15s cubic-bezier(0.16,1,0.3,1) forwards' }}
                                        role="menu"
                                    >
                                        <div className="px-3 pt-1 pb-2 border-b border-gray-100 dark:border-gray-700/80">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                {displayName}
                                            </p>
                                            {displayEmail ? (
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                    {displayEmail}
                                                </p>
                                            ) : null}
                                            <Link
                                                href="/account"
                                                onClick={() => setProfileOpen(false)}
                                                className="mt-2 block text-center text-xs font-semibold rounded-md py-1.5 bg-orange-50 dark:bg-orange-900/25 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
                                            >
                                                Account overview
                                            </Link>
                                        </div>
                                        <p className="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                                            Your account
                                        </p>
                                        {PROFILE_MENU.map(({ href, label, icon: Icon }) => (
                                            <Link
                                                key={href}
                                                href={href}
                                                onClick={() => setProfileOpen(false)}
                                                role="menuitem"
                                                className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors
                                                    ${pathname === href || pathname.startsWith(`${href}/`)
                                                        ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold'
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
                                                className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                                onClick={() => {
                                                    setProfileOpen(false)
                                                    void dispatch(logoutUser({ signOut }))
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
                                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 ml-0.5 rounded-md bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition-colors font-semibold text-xs text-white shadow-sm whitespace-nowrap"
                            >
                                <User className="h-3.5 w-3.5 shrink-0" />
                                <span className="hidden sm:inline">Sign In</span>
                            </Link>
                        )}
                    </div>
                </div>

                {/* ── Search (mobile / tablet) ── */}
                {showTopSearch && (
                    <div className="md:hidden pb-2">
                        <SearchBar variant="navbar" className="w-full" />
                    </div>
                )}
            </div>

            {/* Keyframe for country dropdown */}
            <style>{`
                @keyframes dropIn {
                    from { opacity: 0; transform: translateY(6px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    )
}