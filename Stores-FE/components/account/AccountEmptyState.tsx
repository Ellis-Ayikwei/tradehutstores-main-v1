import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/** Centred empty / info panel used by account pages that have no data to show. */
export default function AccountEmptyState({
    Icon,
    title,
    children,
    actions,
}: {
    Icon: LucideIcon
    title: string
    children?: ReactNode
    actions?: ReactNode
}) {
    return (
        <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white px-4 py-12 text-center dark:border-gray-800 dark:bg-gray-900 sm:py-16">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                <Icon className="h-7 w-7" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-syne text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            {children ? (
                <div className="mt-1 max-w-md text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    {children}
                </div>
            ) : null}
            {actions ? <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{actions}</div> : null}
        </div>
    )
}
