'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import type { SellerNavItem } from '@/components/Navigation/navData'

/** Renders the seller slot link: plain anchor for the dashboard, next/link for /sell. */
export default function SellerNavLink({
    item,
    className,
    onClick,
    children,
}: {
    item: SellerNavItem
    className: string
    onClick?: () => void
    children: ReactNode
}) {
    if (item.external) {
        return (
            <a href={item.href} className={className} onClick={onClick} rel="noopener">
                {children}
            </a>
        )
    }
    return (
        <Link href={item.href} className={className} onClick={onClick}>
            {children}
        </Link>
    )
}

/** Small solid amber status pill used next to "My store". */
export function SellerNavBadge({ text, className = '' }: { text: string; className?: string }) {
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-800 dark:bg-amber-900 dark:text-amber-100 ${className}`}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
            {text}
        </span>
    )
}
