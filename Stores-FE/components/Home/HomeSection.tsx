import Link from 'next/link'
import { AlertTriangle, ChevronRight, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'

export const HOME_CONTAINER = 'mx-auto w-full max-w-screen-2xl px-3 sm:px-4 lg:px-6'

export const HIDE_SCROLLBAR = '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export function SectionHeader({
    title,
    subtitle,
    href,
    linkLabel = 'See all',
    right,
}: {
    title: string
    subtitle?: string
    href?: string
    linkLabel?: string
    right?: ReactNode
}) {
    return (
        <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
                <h2 className="truncate font-syne text-lg font-bold text-neutral-900 dark:text-white sm:text-xl">
                    {title}
                </h2>
                {subtitle ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400 sm:text-sm">
                        {subtitle}
                    </p>
                ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-3">
                {right}
                {href ? (
                    <Link
                        href={href}
                        className="inline-flex min-h-[44px] items-center gap-0.5 text-sm font-semibold text-orange-600 hover:text-orange-700 dark:text-orange-400"
                    >
                        {linkLabel}
                        <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                ) : null}
            </div>
        </div>
    )
}

/** Inline error block with optional retry. */
export function SectionError({
    message,
    onRetry,
}: {
    message: string
    onRetry?: () => void
}) {
    return (
        <div
            role="alert"
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-8 text-center dark:border-neutral-700 dark:bg-neutral-900"
        >
            <AlertTriangle className="h-6 w-6 text-orange-500" aria-hidden />
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{message}</p>
            {onRetry ? (
                <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-neutral-900 px-5 text-sm font-semibold text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900"
                >
                    <RotateCw className="h-4 w-4" aria-hidden />
                    Try again
                </button>
            ) : null}
        </div>
    )
}

export function SectionEmpty({ message, href, cta }: { message: string; href?: string; cta?: string }) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white px-4 py-8 text-center dark:border-neutral-700 dark:bg-neutral-900">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">{message}</p>
            {href && cta ? (
                <Link
                    href={href}
                    className="inline-flex min-h-[44px] items-center rounded-full bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600"
                >
                    {cta}
                </Link>
            ) : null}
        </div>
    )
}
