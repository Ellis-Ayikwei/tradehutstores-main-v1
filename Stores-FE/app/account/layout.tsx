'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import AccountShell from '@/components/account/AccountShell'
import { ACCOUNT_NAV_ITEMS, isAccountNavActive } from '@/components/account/accountNavConfig'

/**
 * Mobile / tablet section tabs (hidden from lg, where AccountShell renders the sidebar).
 * Horizontally scrollable, 44px tap targets, active tab is centred on route change.
 */
function AccountSectionTabs() {
    const pathname = usePathname()
    const listRef = useRef<HTMLDivElement | null>(null)
    const activeRef = useRef<HTMLAnchorElement | null>(null)

    useEffect(() => {
        const list = listRef.current
        const active = activeRef.current
        if (!list || !active) return
        const target = active.offsetLeft - (list.clientWidth - active.clientWidth) / 2
        list.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    }, [pathname])

    return (
        <nav aria-label="Account sections" className="mb-4 lg:hidden">
            <div
                ref={listRef}
                className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {ACCOUNT_NAV_ITEMS.map(({ href, label, Icon }) => {
                    const active = isAccountNavActive(pathname, href)
                    return (
                        <Link
                            key={href}
                            href={href}
                            ref={active ? activeRef : undefined}
                            aria-current={active ? 'page' : undefined}
                            className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                active
                                    ? 'border-primary-700 bg-primary-700 text-white'
                                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
                            }`}
                        >
                            <Icon className="h-4 w-4" aria-hidden="true" />
                            {label}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
    return (
        <AccountShell>
            <AccountSectionTabs />
            {children}
        </AccountShell>
    )
}
