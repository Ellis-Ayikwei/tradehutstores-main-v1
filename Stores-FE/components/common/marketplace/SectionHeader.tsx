import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from './cx'

export interface SectionHeaderProps {
    title: string
    subtitle?: string
    /** When set, renders a "See all" link to this href. */
    href?: string
    actionLabel?: string
    /** Optional node rendered beside the title (e.g. a Countdown or Badge). */
    adornment?: ReactNode
    /** Heading level for the title. */
    as?: 'h1' | 'h2' | 'h3'
    className?: string
}

export default function SectionHeader({
    title,
    subtitle,
    href,
    actionLabel = 'See all',
    adornment,
    as: Heading = 'h2',
    className,
}: SectionHeaderProps) {
    return (
        <div className={cx('mb-3 flex items-end justify-between gap-3 sm:mb-4', className)}>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Heading className="font-syne text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-100 sm:text-xl lg:text-2xl">
                        {title}
                    </Heading>
                    {adornment}
                </div>
                {subtitle ? <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p> : null}
            </div>
            {href ? (
                <Link
                    href={href}
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-0.5 rounded-lg px-2 text-sm font-semibold text-primary-700 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:text-primary-400 dark:hover:text-primary-300 dark:focus-visible:ring-primary-400"
                >
                    {actionLabel}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
            ) : null}
        </div>
    )
}
