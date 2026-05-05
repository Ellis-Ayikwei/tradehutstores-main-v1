'use client'

import Link from 'next/link'
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { useDispatch } from 'react-redux'
import type { AppDispatch } from '@/store'
import { logoutUser } from '@/store/authSlice'
import useSignOut from 'react-auth-kit/hooks/useSignOut'
import MainLayout from '@/components/Layouts/MainLayout'
import {
    ACCOUNT_BOTTOM_NAV,
    ACCOUNT_NAV_ITEMS,
    isAccountNavActive,
} from '@/components/account/accountNavConfig'

// ─── Mobile nav context (hamburger in page headers) ─────────────────────────

type AccountNavContextValue = {
    openMobileNav: () => void
    closeMobileNav: () => void
}

const AccountNavContext = createContext<AccountNavContextValue | null>(null)

export function useAccountMobileNav(): AccountNavContextValue {
    const ctx = useContext(AccountNavContext)
    if (!ctx) {
        throw new Error('useAccountMobileNav must be used within AccountShell')
    }
    return ctx
}

/** Mobile-only row: menu + page title (place at top of each account page). */
export function AccountMobileHeader({ title }: { title: string }) {
    const { openMobileNav } = useAccountMobileNav()
    return (
        <div className="lg:hidden flex items-center gap-3 mb-4">
            <button
                type="button"
                onClick={openMobileNav}
                aria-label="Open account menu"
                className="p-2 rounded-xl bg-surface-container-low dark:bg-gray-800 hover:bg-surface-container dark:hover:bg-gray-700 transition-colors text-on-surface dark:text-gray-100 h-10 w-10 flex items-center justify-center"
            >
                <Menu className="w-5 h-5" />
            </button>
            <span className="font-syne font-bold text-sm text-on-surface-variant dark:text-gray-400 uppercase tracking-widest">
                {title}
            </span>
        </div>
    )
}

function bottomNavItemActive(pathname: string, href: string): boolean {
    if (href === '/') return pathname === '/'
    return isAccountNavActive(pathname, href)
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export default function AccountShell({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const dispatch = useDispatch<AppDispatch>()
    const signOut = useSignOut()
    const [mobileNavOpen, setMobileNavOpen] = useState(false)

    const openMobileNav = useCallback(() => setMobileNavOpen(true), [])
    const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])

    useEffect(() => {
        if (!mobileNavOpen) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMobileNavOpen(false)
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [mobileNavOpen])

    useEffect(() => {
        setMobileNavOpen(false)
    }, [pathname])

    const onSignOut = () => {
        closeMobileNav()
        void dispatch(logoutUser({ signOut }))
    }

    const navLinkClass = (href: string, active: boolean) =>
        active
            ? 'bg-surface-container-lowest dark:bg-gray-800 text-primary-container dark:text-orange-400 shadow-card dark:shadow-none rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200'
            : 'text-on-surface dark:text-gray-200 px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl dark:hover:bg-gray-800/80'

    const renderNavLinks = (onNavigate?: () => void) =>
        ACCOUNT_NAV_ITEMS.map(({ href, label, Icon, sectionBreak }) => (
            <div key={href}>
                {sectionBreak ? (
                    <div className="my-2 border-t border-outline-variant/10 dark:border-gray-700" />
                ) : null}
                <Link
                    href={href}
                    onClick={onNavigate}
                    className={navLinkClass(href, isAccountNavActive(pathname, href))}
                >
                    <Icon
                        className={`w-5 h-5${isAccountNavActive(pathname, href) ? ' fill-current' : ''}`}
                    />
                    <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                        {label}
                    </span>
                </Link>
            </div>
        ))

    return (
        <MainLayout>
            <AccountNavContext.Provider value={{ openMobileNav, closeMobileNav }}>
                <div className="min-h-screen bg-surface dark:bg-gray-950 text-on-surface dark:text-gray-100 font-body">
                    {mobileNavOpen && (
                        <div
                            className="fixed inset-0 z-40 bg-inverse-surface/40 dark:bg-black/60 backdrop-blur-sm lg:hidden"
                            onClick={closeMobileNav}
                            aria-hidden="true"
                        />
                    )}

                    <div
                        className={`fixed left-0 top-0 h-full w-72 z-50 bg-surface-container-lowest dark:bg-gray-900 shadow-card dark:border-r dark:border-gray-800 flex flex-col gap-2 p-6 overflow-y-auto no-scrollbar transition-transform duration-300 lg:hidden ${
                            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                        aria-label="Account navigation drawer"
                    >
                        <div className="mb-8 flex items-center justify-between">
                            <div>
                                <h2 className="font-syne text-xl font-bold text-on-surface dark:text-white tracking-tight">
                                    Account Settings
                                </h2>
                                <p className="text-xs text-on-surface-variant dark:text-gray-400 font-medium mt-1 opacity-60">
                                    Manage your TradeHut profile
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={closeMobileNav}
                                aria-label="Close menu"
                                className="p-2 rounded-xl hover:bg-surface-container dark:hover:bg-gray-800 transition-colors text-on-surface-variant dark:text-gray-400"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <nav className="flex flex-col gap-1 flex-1">
                            {renderNavLinks(closeMobileNav)}
                        </nav>
                        <div className="mt-auto pt-6 border-t border-surface-container-highest/30 dark:border-gray-700">
                            <button
                                type="button"
                                onClick={onSignOut}
                                className="w-full bg-surface-container-low dark:bg-gray-800 text-on-surface-variant dark:text-gray-300 font-bold py-3 rounded-xl hover:bg-error-container dark:hover:bg-red-950/50 hover:text-error dark:hover:text-red-400 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign out
                            </button>
                        </div>
                    </div>

                    <div className="pt-20 pb-24 md:pb-12 px-4 md:px-6 lg:px-8 max-w-screen-2xl mx-auto">
                        <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8">
                            <aside className="hidden lg:flex md:sticky md:top-24 md:h-[calc(100vh-6rem)] w-72 flex-shrink-0 flex-col gap-2 p-6 bg-surface dark:bg-gray-900 rounded-2xl overflow-y-auto no-scrollbar border border-transparent dark:border-gray-800">
                                <div className="mb-8">
                                    <h2 className="font-syne text-xl font-bold text-on-surface dark:text-white tracking-tight">
                                        Account Settings
                                    </h2>
                                    <p className="text-xs text-on-surface-variant dark:text-gray-400 font-medium mt-1 opacity-60">
                                        Manage your TradeHut profile
                                    </p>
                                </div>
                                <nav className="flex flex-col gap-1 flex-1">{renderNavLinks()}</nav>
                                <div className="mt-auto pt-6 border-t border-surface-container-highest/30 dark:border-gray-700">
                                    <button
                                        type="button"
                                        onClick={onSignOut}
                                        className="w-full bg-surface-container-low dark:bg-gray-800 text-on-surface-variant dark:text-gray-300 font-bold py-3 rounded-xl hover:bg-error-container dark:hover:bg-red-950/50 hover:text-error dark:hover:text-red-400 transition-all flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign out
                                    </button>
                                </div>
                            </aside>

                            <section className="flex-1 min-w-0">{children}</section>
                        </div>
                    </div>

                    <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest dark:bg-gray-900 dark:border-t dark:border-gray-800 shadow-[0_-4px_20px_0_rgba(38,24,19,0.06)] dark:shadow-[0_-4px_20px_0_rgba(0,0,0,0.35)] px-4 py-3 flex justify-around items-center z-50">
                        {ACCOUNT_BOTTOM_NAV.map(({ href, label, Icon }) => {
                            const active = bottomNavItemActive(pathname, href)
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`flex flex-col items-center gap-1 min-w-[44px] py-1 transition-opacity ${
                                        active
                                            ? 'text-primary dark:text-orange-400'
                                            : 'text-on-surface-variant dark:text-gray-400 opacity-60 hover:opacity-100'
                                    }`}
                                >
                                    <Icon className={`w-6 h-6${active ? ' fill-current' : ''}`} />
                                    <span className="text-[10px] font-bold">{label}</span>
                                </Link>
                            )
                        })}
                    </nav>
                </div>
            </AccountNavContext.Provider>
        </MainLayout>
    )
}
