import { memo } from 'react'
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
    /** Wrap the count in brackets (default true). */
    bracketed?: boolean
    className?: string
}

const STAR_SIZE = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4' } as const
const TEXT_SIZE = { sm: 'text-xs', md: 'text-sm' } as const
const STARS = [0, 1, 2, 3, 4] as const

// One formatter for every card (Number#toLocaleString builds a new Intl object on each call).
const COUNT_FORMAT = new Intl.NumberFormat('en')

/**
 * Two stacked rows of five stars: grey underneath, amber on top clipped to the rating width.
 * 3 wrapper nodes + 10 icons, instead of one wrapper + two icons per star.
 */
function RatingStars({
    rating,
    count,
    size = 'sm',
    showValue = false,
    countTone = 'muted',
    bracketed = true,
    className,
}: RatingStarsProps) {
    const safe = Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 0
    const fillPct = (Math.round(safe * 2) / 2) * 20
    const countText = count !== undefined ? COUNT_FORMAT.format(count) : ''
    const label = `${safe.toFixed(1)} out of 5 stars${count !== undefined ? `, ${countText} reviews` : ''}`
    const starCls = cx('shrink-0', STAR_SIZE[size])

    return (
        <span role="img" aria-label={label} className={cx('inline-flex items-center gap-1', TEXT_SIZE[size], className)}>
            {showValue ? (
                <span className="font-semibold text-zinc-900 dark:text-zinc-100" aria-hidden="true">
                    {safe.toFixed(1)}
                </span>
            ) : null}
            <span className="relative inline-flex" aria-hidden="true">
                {STARS.map(i => (
                    <Star key={i} className={cx(starCls, 'text-zinc-300 dark:text-zinc-600')} fill="currentColor" strokeWidth={0} />
                ))}
                {fillPct > 0 ? (
                    <span className="absolute inset-y-0 left-0 flex overflow-hidden" style={{ width: `${fillPct}%` }}>
                        {STARS.map(i => (
                            <Star key={i} className={cx(starCls, 'text-amber-500 dark:text-amber-400')} fill="currentColor" strokeWidth={0} />
                        ))}
                    </span>
                ) : null}
            </span>
            {count !== undefined ? (
                <span
                    className={countTone === 'link' ? 'text-sky-800 dark:text-sky-400' : 'text-zinc-600 dark:text-zinc-400'}
                    aria-hidden="true"
                >
                    {bracketed ? `(${countText})` : countText}
                </span>
            ) : null}
        </span>
    )
}

export default memo(RatingStars)
