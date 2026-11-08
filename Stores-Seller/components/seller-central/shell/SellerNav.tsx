'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useSellerProfile } from '@/hooks/useSellerProfile'
import { VERIFICATION_LABELS } from '@/lib/seller/profile'
import type { VerificationStatus } from '@/lib/seller/types'
import { StatusBadge, type Tone } from '@/components/seller-central/ui'
import { SELLER_NAV, isNavActive } from './navItems'

const STATUS_TONE: Record<VerificationStatus, Tone> = {
    verified: 'success',
    pending: 'warning',
    rejected: 'danger',
    suspended: 'danger',
}

export function VerificationBadge({ status }: { status: VerificationStatus }) {
    return <StatusBadge tone={STATUS_TONE[status]}>{VERIFICATION_LABELS[status]}</StatusBadge>
}

/** Left rail, lg and up: store name + badge on top, then the section links. */
export function SellerSidebar() {
    const pathname = usePathname()
    const { profile } = useSellerProfile()

    return (
        <nav aria-label="Seller Central" className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Seller Central</p>
                <p className="mt-0.5 break-words text-base font-bold leading-snug text-zinc-900 dark:text-zinc-100">
                    {profile?.business_name ?? 'Your store'}
                </p>
                {profile ? (
                    <div className="mt-1.5">
                        <VerificationBadge status={profile.verification_status} />
                    </div>
                ) : null}
            </div>
            <ul className="py-1">
                {SELLER_NAV.map((item) => {
                    const active = isNavActive(pathname, item)
                    const Icon = item.icon
                    return (
                        <li key={item.href}>
                            <Link
                                href={item.href}
                                aria-current={active ? 'page' : undefined}
                                className={`flex min-h-[44px] items-center gap-3 border-l-4 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 ${
                                    active
                                        ? 'border-primary-700 bg-zinc-100 font-bold text-zinc-900 dark:border-primary-400 dark:bg-zinc-800 dark:text-zinc-100'
                                        : 'border-transparent font-medium text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800'
                                }`}
                            >
                                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                                {item.label}
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}

/** Below lg: compact header ("Seller Central · store") and a horizontally scrollable section tab strip. */
export function SellerMobileNav() {
    const pathname = usePathname()
    const { profile } = useSellerProfile()
    const stripRef = useRef<HTMLUListElement>(null)

    useEffect(() => {
        const active = stripRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
        active?.scrollIntoView({ inline: 'center', block: 'nearest' })
    }, [pathname])

    return (
        <div className="mb-3 rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
            <div className="flex items-center justify-between gap-2 px-3 pt-2.5">
                <p className="min-w-0 truncate text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="font-semibold">Seller Central</span>
                    <span aria-hidden> · </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{profile?.business_name ?? 'Your store'}</span>
                </p>
                {profile ? <VerificationBadge status={profile.verification_status} /> : null}
            </div>
            <nav aria-label="Seller Central sections">
                <ul
                    ref={stripRef}
                    className="flex overflow-x-auto overscroll-x-contain px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {SELLER_NAV.map((item) => {
                        const active = isNavActive(pathname, item)
                        return (
                            <li key={item.href} className="shrink-0">
                                <Link
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={`flex min-h-[44px] items-center whitespace-nowrap border-b-2 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 ${
                                        active
                                            ? 'border-primary-700 font-bold text-primary-700 dark:border-primary-400 dark:text-primary-400'
                                            : 'border-transparent font-medium text-zinc-800 dark:text-zinc-200'
                                    }`}
                                >
                                    {item.label}
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        </div>
    )
}
