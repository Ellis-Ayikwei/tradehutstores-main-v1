import { memo, type ReactNode } from 'react'
import { cx } from './cx'

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'dark'
export type BadgeSize = 'sm' | 'md'

export interface BadgeProps {
    children: ReactNode
    variant?: BadgeVariant
    size?: BadgeSize
    /** Corner radius. `sm` gives the small flat rectangle used on product images. Default `md`. */
    radius?: 'sm' | 'md'
    /** Optional leading icon (lucide icon element; rendered aria-hidden). */
    icon?: ReactNode
    className?: string
}

const VARIANTS: Record<BadgeVariant, string> = {
    neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
    primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
    success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    danger: 'bg-red-600 text-white',
    warning: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-200',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    dark: 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900',
}

const SIZES: Record<BadgeSize, string> = {
    sm: 'px-1.5 py-0.5 text-[11px] leading-4 gap-1',
    md: 'px-2.5 py-1 text-xs leading-4 gap-1.5',
}

const RADIUS = { sm: 'rounded-sm', md: 'rounded-md' } as const

function Badge({ children, variant = 'neutral', size = 'sm', radius = 'md', icon, className }: BadgeProps) {
    return (
        <span
            className={cx(
                'inline-flex items-center font-semibold whitespace-nowrap',
                RADIUS[radius],
                VARIANTS[variant],
                SIZES[size],
                className
            )}
        >
            {icon ? (
                <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3" aria-hidden="true">
                    {icon}
                </span>
            ) : null}
            {children}
        </span>
    )
}

export default memo(Badge)
