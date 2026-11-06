import { cx } from './cx'

export interface ProductCardSkeletonProps {
    /** Match the variant of the cards being loaded. */
    variant?: 'grid' | 'list'
    compact?: boolean
    /** Grid only: omit the rating/meta row (use when the loaded cards will drop it too). */
    hideMeta?: boolean
    className?: string
}

const BONE = 'rounded bg-zinc-200 dark:bg-zinc-800'

/**
 * Mirrors ProductCard's fixed anatomy so nothing shifts on load:
 * square image, then price block h-10, title h-9 (sm:h-10), one rating+meta row h-4, gap-1.
 */
export default function ProductCardSkeleton({ variant = 'grid', compact = false, hideMeta = false, className }: ProductCardSkeletonProps) {
    const isList = variant === 'list'
    const shell = 'rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'

    if (isList) {
        return (
            <div aria-hidden="true" className={cx('flex animate-pulse', shell, className)}>
                <div className="min-h-28 w-28 shrink-0 self-stretch rounded-l-[7px] bg-zinc-200 dark:bg-zinc-800 sm:min-h-[140px] sm:w-[140px]" />
                <div className={cx('min-w-0 flex-1 space-y-2', compact ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3')}>
                    <div className={cx('h-4 w-11/12', BONE)} />
                    <div className={cx('h-4 w-2/3', BONE)} />
                    <div className={cx('h-3.5 w-28', BONE)} />
                    <div className={cx('h-6 w-32', BONE)} />
                    <div className={cx('h-3 w-40', BONE)} />
                </div>
            </div>
        )
    }

    return (
        <div aria-hidden="true" className={cx('flex h-full animate-pulse flex-col', shell, className)}>
            <div className="aspect-square w-full rounded-t-[7px] bg-zinc-200 dark:bg-zinc-800" />
            <div className={cx('flex flex-col gap-1', compact ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3')}>
                <div className="flex h-10 flex-col justify-center gap-1">
                    <div className={cx('h-5 w-24', BONE)} />
                    <div className={cx('h-3 w-16', BONE)} />
                </div>
                <div className={cx('flex h-9 flex-col justify-center gap-1.5', !compact && 'sm:h-10')}>
                    <div className={cx('h-3.5 w-11/12', BONE)} />
                    <div className={cx('h-3.5 w-2/3', BONE)} />
                </div>
                {hideMeta ? null : (
                    <div className="flex h-4 items-center">
                        <div className={cx('h-3 w-28', BONE)} />
                    </div>
                )}
            </div>
        </div>
    )
}
