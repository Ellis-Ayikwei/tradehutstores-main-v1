import { Star } from 'lucide-react'
import { cx } from './cx'

export interface RatingStarsProps {
    /** 0 to 5, decimals allowed (rounded to the nearest half star). */
    rating: number
    /** Number of reviews, shown in brackets when provided. */
    count?: number
    size?: 'sm' | 'md'
    /** Show the numeric value (e.g. 4.6) before the stars. */
    showValue?: boolean
    /** muted: grey count. link: brand link colour (used on product cards). */
    countTone?: 'muted' | 'link'
    className?: string
}

const STAR_SIZE = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4' } as const
const TEXT_SIZE = { sm: 'text-xs', md: 'text-sm' } as const

export default function RatingStars({
    rating,
    count,
    size = 'sm',
    showValue = false,
    countTone = 'muted',
    className,
}: RatingStarsProps) {
    const safe = Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0
    const rounded = Math.round(safe * 2) / 2
    const label = `${safe.toFixed(1)} out of 5 stars${
        count !== undefined ? `, ${count.toLocaleString()} reviews` : ''
    }`

    return (
        <span role="img" aria-label={label} className={cx('inline-flex items-center gap-1', TEXT_SIZE[size], className)}>
            {showValue ? (
                <span className="font-semibold text-zinc-900 dark:text-zinc-100" aria-hidden="true">
                    {safe.toFixed(1)}
                </span>
            ) : null}
            <span className="inline-flex" aria-hidden="true">
                {[1, 2, 3, 4, 5].map(i => {
                    const full = rounded >= i
                    const half = !full && rounded === i - 0.5
                    return (
                        <span key={i} className={cx('relative inline-block', STAR_SIZE[size])}>
                            <Star
                                className={cx('absolute inset-0 text-zinc-300 dark:text-zinc-600', STAR_SIZE[size])}
                                fill="currentColor"
                                strokeWidth={0}
                            />
                            {full || half ? (
                                <span
                                    className="absolute inset-y-0 left-0 overflow-hidden"
                                    style={{ width: full ? '100%' : '50%' }}
                                >
                                    <Star className={cx('text-amber-400', STAR_SIZE[size])} fill="currentColor" strokeWidth={0} />
                                </span>
                            ) : null}
                        </span>
                    )
                })}
            </span>
            {count !== undefined ? (
                <span
                    className={countTone === 'link' ? 'text-primary-700 dark:text-primary-400' : 'text-zinc-600 dark:text-zinc-400'}
                    aria-hidden="true"
                >
                    ({count.toLocaleString()})
                </span>
            ) : null}
        </span>
    )
}
