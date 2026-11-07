'use client'

import Link from 'next/link'
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
    type RefObject,
} from 'react'
import { usePathname } from 'next/navigation'
import { ChevronLeft, LogOut, Menu, X } from 'lucide-react'
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

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Traps Tab inside `ref` while `active`, focuses the first control, and returns focus to the trigger on close. */
function useFocusTrap(active: boolean, ref: RefObject<HTMLElement>) {
    useEffect(() => {
        if (!active) return
        const trigger = document.activeElement as HTMLElement | null
        const container = ref.current
        const items = () => (container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)) : [])
        items()[0]?.focus()

        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return
            const list = items()
            if (list.length === 0) return
            const first = list[0]
            const last = list[list.length - 1]
            const current = document.activeElement
            if (e.shiftKey && (current === first || !container?.contains(current))) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && (current === last || !container?.contains(current))) {
                e.preventDefault()
                first.focus()
            }
        }
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('keydown', onKey)
            trigger?.focus?.()
        }
    }, [active, ref])
}

// ─── Mobile nav context (the "More" drawer) ─────────────────────────────────

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

/**
 * Compact mobile/tablet header placed at the top of each account page:
 * a back link to the account overview plus the page title. Navigation itself
 * lives in the section strip (app/account/layout.tsx), the bottom bar and the
 * "More" drawer, so this header carries no menu button.
 */
export function AccountMobileHeader({ title }: { title: string }) {
    const pathname = usePathname()
    const onOverview = pathname === '/account'
    return (
        <div className="mb-3 flex min-h-[44px] items-center gap-1 lg:hidden">
            {onOverview ? null : (
                <Link
                    href="/account"
                    aria-label="Back to account overview"
                    className={`-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800 ${FOCUS}`}
                >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </Link>
            )}
            <span className="truncate font-syne text-sm font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                {title}
            </span>
        </div>
    )
}

// ─── Shell ───────────────────────────────────────────────────────────────────

export default function AccountShell({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const dispatch = useDispatch<AppDispatch>()
    const signOut = useSignOut()
    const [mobileNavOpen, setMobileNavOpen] = useState(false)
    const drawerRef = useRef<HTMLDivElement>(null)
    useFocusTrap(mobileNavOpen, drawerRef)

    const openMobileNav = useCallback(() => setMobileNavOpen(true), [])
    const closeMobileNav = useCallback(() => setMobileNavOpen(false), [])
    const navContext = useMemo(
        () => ({ openMobileNav, closeMobileNav }),
        [openMobileNav, closeMobileNav]
    )

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

    const renderNavLinks = (onNavigate?: () => void) =>
        ACCOUNT_NAV_ITEMS.map(({ href, label, Icon, sectionBreak }) => {
            const active = isAccountNavActive(pathname, href)
            return (
                <li key={href}>
                    {sectionBreak ? (
                        <div className="my-2 border-t border-gray-200 dark:border-gray-800" />
                    ) : null}
                    <Link
                        href={href}
                        onClick={onNavigate}
                        aria-current={active ? 'page' : undefined}
                        className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-semibold transition-colors ${FOCUS} ${
                            active
                                ? 'bg-primary-700 text-white'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800'
                        }`}
                    >
                        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{label}</span>
                    </Link>
                </li>
            )
        })

    const signOutButton = (
        <button
            type="button"
            onClick={onSignOut}
            className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS}`}
        >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
        </button>
    )

    const moreActive =
        mobileNavOpen ||
        !ACCOUNT_BOTTOM_NAV.some(({ href }) => isAccountNavActive(pathname, href))

    return (
        <MainLayout>
            <AccountNavContext.Provider value={navContext}>
                <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
                    {mobileNavOpen && (
                        <div
                            className="fixed inset-0 z-[60] bg-black/50 lg:hidden"
                            onClick={closeMobileNav}
                            aria-hidden="true"
                        />
                    )}

                    <div
                        ref={drawerRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Account navigation"
                        aria-hidden={!mobileNavOpen}
                        className={`fixed left-0 top-0 z-[70] flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 dark:bg-gray-900 lg:hidden ${
                            mobileNavOpen ? 'translate-x-0' : '-translate-x-full invisible'
                        }`}
                    >
                        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                            <h2 className="font-syne text-lg font-bold text-gray-900 dark:text-white">
                                My account
                            </h2>
                            <button
                                type="button"
                                onClick={closeMobileNav}
                                aria-label="Close menu"
                                className={`flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 ${FOCUS}`}
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                        <nav aria-label="Account" className="flex-1 overflow-y-auto px-3 py-3">
                            <ul className="space-y-1">{renderNavLinks(closeMobileNav)}</ul>
                        </nav>
                        <div className="border-t border-gray-200 p-3 dark:border-gray-800">
                            {signOutButton}
                        </div>
                    </div>

                    <div className="mx-auto max-w-screen-2xl px-4 pb-24 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pb-12">
                        <div className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:gap-8">
                            <aside className="hidden w-64 shrink-0 lg:block">
                                <div className="sticky top-28 flex max-h-[calc(100vh-8rem)] flex-col rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
                                    <h2 className="px-3 pb-2 pt-1 font-syne text-lg font-bold text-gray-900 dark:text-white">
                                        My account
                                    </h2>
                                    <nav aria-label="Account" className="flex-1 overflow-y-auto">
                                        <ul className="space-y-1">{renderNavLinks()}</ul>
                                    </nav>
                                    <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-800">
                                        {signOutButton}
                                    </div>
                                </div>
                            </aside>

                            <section className="min-w-0 flex-1">{children}</section>
                        </div>
                    </div>

                    <nav
                        aria-label="Account quick links"
                        className="fixed bottom-0 left-0 z-40 grid w-full grid-cols-5 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-gray-800 dark:bg-gray-900 lg:hidden"
                    >
                        {ACCOUNT_BOTTOM_NAV.map(({ href, label, Icon }) => {
                            const active = isAccountNavActive(pathname, href) && !mobileNavOpen
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${FOCUS} ${
                                        active
                                            ? 'text-primary-700 dark:text-primary-300'
                                            : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                                    }`}
                                >
                                    <Icon className="h-6 w-6" aria-hidden="true" />
                                    {label}
                                </Link>
                            )
                        })}
                        <button
                            type="button"
                            onClick={openMobileNav}
                            aria-haspopup="dialog"
                            aria-expanded={mobileNavOpen}
                            className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${FOCUS} ${
                                moreActive
                                    ? 'text-primary-700 dark:text-primary-300'
                                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                            }`}
                        >
                            <Menu className="h-6 w-6" aria-hidden="true" />
                            More
                        </button>
                    </nav>
                </div>
            </AccountNavContext.Provider>
        </MainLayout>
    )
}
