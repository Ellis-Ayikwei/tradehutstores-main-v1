import { memo } from 'react'
import { cx } from './cx'

export interface ProductCardSkeletonProps {
    /** Match the variant of the cards being loaded. */
    variant?: 'grid' | 'list'
    compact?: boolean
    /** @deprecated No longer used. */
    hideMeta?: boolean
    /** Reserve room for the Add to cart button (match the cards being loaded). Grid only; list rows always have one. */
    showAddToCart?: boolean
    /** @deprecated Use `showAddToCart`. */
    showCta?: boolean
    className?: string
}

const BONE = 'rounded-sm bg-zinc-200 dark:bg-zinc-800'

/**
 * Same geometry as ProductCard: grid = square grey stage, then title / rating / price lines (no box);
 * list = 160px (240px md) stage beside text lines, separated by a divider.
 */
function ProductCardSkeleton({ variant = 'grid', compact = false, showAddToCart, showCta, className }: ProductCardSkeletonProps) {
    if (variant === 'list') {
        return (
            <div
                aria-hidden="true"
                className={cx(
                    'flex gap-3 border-b border-zinc-200 motion-safe:animate-pulse dark:border-zinc-800 sm:gap-4',
                    compact ? 'py-2' : 'py-3',
                    className
                )}
            >
                <div className="h-40 w-40 shrink-0 bg-zinc-200 dark:bg-zinc-800 md:h-60 md:w-60" />
                <div className="min-w-0 flex-1 space-y-2">
                    <div className={cx('h-5 w-24', BONE)} />
                    <div className={cx('h-5 w-11/12', BONE)} />
                    <div className={cx('h-5 w-2/3', BONE)} />
                    <div className={cx('h-4 w-32', BONE)} />
                    <div className={cx('h-7 w-28', BONE)} />
                    <div className={cx('h-4 w-40', BONE)} />
                    <div className="h-11 w-full max-w-xs rounded-full bg-zinc-200 dark:bg-zinc-800 md:h-9" />
                </div>
            </div>
        )
    }

    return (
        <div aria-hidden="true" className={cx('self-start pb-2 motion-safe:animate-pulse', className)}>
            <div className="aspect-square w-full rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 space-y-1.5">
                <div className={cx('h-4 w-11/12', BONE)} />
                <div className={cx('h-4 w-3/4', BONE)} />
                <div className={cx('h-4 w-28', BONE)} />
                <div className={cx('h-6 w-24', BONE)} />
                {showAddToCart ?? showCta ? <div className="h-11 w-full max-w-xs rounded-full bg-zinc-200 dark:bg-zinc-800 md:h-9" /> : null}
            </div>
        </div>
    )
}

export default memo(ProductCardSkeleton)
