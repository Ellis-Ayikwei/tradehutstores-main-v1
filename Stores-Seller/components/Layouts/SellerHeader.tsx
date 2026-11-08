'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, ExternalLink, LogOut, Moon, Store, Sun, User } from 'lucide-react'
import { useDispatch } from 'react-redux'
import useAuthUser from 'react-auth-kit/hooks/useAuthUser'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import useSignOut from 'react-auth-kit/hooks/useSignOut'
import type { AppDispatch } from '@/store'
import { logoutUser } from '@/store/authSlice'
import { useTheme } from '@/contexts/ThemeContext'
import { STOREFRONT_URL, storefrontHref } from '@/lib/storefront'

type AuthKitUser = { id: string; name: string; email: string; uuid?: string }

const iconBtn =
    'flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-800 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-primary-400'

const menuItem =
    'flex min-h-[44px] w-full items-center gap-3 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'

/**
 * Lean Seller Central header: logo (to /seller-central), link to the buyer storefront, theme toggle and
 * the account menu (sign in / sign out). No search, cart, categories or location pickers.
 */
export default function SellerHeader() {
    const dispatch = useDispatch<AppDispatch>()
    const signOut = useSignOut()
    const isAuthenticated = useIsAuthenticated()
    const authUser = useAuthUser<AuthKitUser>()
    const { theme, toggleTheme } = useTheme()

    // react-auth-kit reads cookies on the client only; wait for mount so server and first client markup match.
    const [mounted, setMounted] = useState(false)
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    useEffect(() => setMounted(true), [])

    useEffect(() => {
        if (!menuOpen) return
        const onPointer = (e: MouseEvent | TouchEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false)
        }
        document.addEventListener('mousedown', onPointer)
        document.addEventListener('touchstart', onPointer)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onPointer)
            document.removeEventListener('touchstart', onPointer)
            document.removeEventListener('keydown', onKey)
        }
    }, [menuOpen])

    const handleSignOut = useCallback(() => {
        setMenuOpen(false)
        void dispatch(logoutUser({ signOut }))
    }, [dispatch, signOut])

    const signedIn = mounted && Boolean(isAuthenticated)
    const displayName = authUser?.name?.trim() || authUser?.email?.split('@')[0] || 'Account'
    const displayEmail = authUser?.email?.trim() ?? ''
    const initials = (authUser?.name?.trim() || authUser?.email?.trim() || 'U').slice(0, 2).toUpperCase()
    const isDark = theme === 'dark'

    return (
        <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
            <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-2 px-3 sm:px-4 lg:h-16 lg:px-6">
                <Link
                    href="/seller-central"
                    aria-label="TradeHut Seller Central"
                    className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400"
                >
                    <Image
                        src="/assets/images/logos/ths-light.png"
                        alt="TradeHut"
                        width={100}
                        height={50}
                        priority
                        sizes="100px"
                        className="h-8 w-auto dark:hidden lg:h-9"
                    />
                    <Image
                        src="/assets/images/logos/ths.png"
                        alt=""
                        width={100}
                        height={50}
                        priority
                        sizes="100px"
                        className="hidden h-8 w-auto dark:block lg:h-9"
                    />
                    <span className="truncate border-l border-zinc-300 pl-2 font-syne text-sm font-bold text-zinc-900 dark:border-zinc-700 dark:text-zinc-100 sm:text-base">
                        Seller Central
                    </span>
                </Link>

                <div className="ml-auto flex items-center gap-1">
                    {STOREFRONT_URL ? (
                        <a
                            href={storefrontHref('/')}
                            className="hidden min-h-[44px] items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:text-primary-400 dark:focus-visible:ring-primary-400 md:inline-flex"
                        >
                            View storefront
                            <ExternalLink className="h-4 w-4" aria-hidden />
                        </a>
                    ) : null}

                    <button
                        type="button"
                        onClick={toggleTheme}
                        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                        className={iconBtn}
                    >
                        {isDark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
                    </button>

                    {signedIn ? (
                        <div ref={menuRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setMenuOpen((o) => !o)}
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                aria-label="Account menu"
                                className="flex h-11 items-center gap-1.5 rounded-md px-1.5 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:hover:bg-zinc-800 dark:focus-visible:ring-primary-400"
                            >
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-700 text-xs font-bold text-white">
                                    {initials}
                                </span>
                                <span className="hidden max-w-[10rem] truncate text-sm font-semibold lg:block">{displayName}</span>
                                <ChevronDown
                                    className={`hidden h-4 w-4 shrink-0 sm:block ${menuOpen ? 'rotate-180' : ''}`}
                                    aria-hidden
                                />
                            </button>

                            {menuOpen ? (
                                <div
                                    role="menu"
                                    className="absolute right-0 top-full z-[60] mt-1 w-64 max-w-[calc(100vw-1.5rem)] rounded-md border border-zinc-300 bg-white py-1 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                                >
                                    <div className="border-b border-zinc-200 px-3 pb-2 pt-1 dark:border-zinc-800">
                                        <p className="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">{displayName}</p>
                                        {displayEmail ? (
                                            <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">{displayEmail}</p>
                                        ) : null}
                                    </div>
                                    <Link href="/seller-central" role="menuitem" onClick={() => setMenuOpen(false)} className={menuItem}>
                                        <Store className="h-4 w-4 shrink-0 text-zinc-600 dark:text-zinc-400" aria-hidden />
                                        My store
                                    </Link>
                                    {STOREFRONT_URL ? (
                                        <a href={storefrontHref('/')} role="menuitem" className={`${menuItem} md:hidden`}>
                                            <ExternalLink className="h-4 w-4 shrink-0 text-zinc-600 dark:text-zinc-400" aria-hidden />
                                            View storefront
                                        </a>
                                    ) : null}
                                    <div className="mt-1 border-t border-zinc-200 pt-1 dark:border-zinc-800">
                                        <button
                                            type="button"
                                            role="menuitem"
                                            onClick={handleSignOut}
                                            className="flex min-h-[44px] w-full items-center gap-3 px-3 py-2 text-left text-sm text-red-700 hover:bg-zinc-100 dark:text-red-400 dark:hover:bg-zinc-800"
                                        >
                                            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                                            Sign out
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <Link
                            href="/auth/login"
                            className="flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-primary-400"
                        >
                            <User className="h-5 w-5 shrink-0" aria-hidden />
                            Sign in
                        </Link>
                    )}
                </div>
            </div>
        </header>
    )
}
