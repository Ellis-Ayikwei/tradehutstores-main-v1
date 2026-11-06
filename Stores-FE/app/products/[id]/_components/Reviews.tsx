'use client'

import { useMemo, useState } from 'react'
import { BadgeCheck, MessageSquareText } from 'lucide-react'
import { RatingStars } from '@/components/common/marketplace'
import { formatReviewDate } from './pdpUtils'
import type { PdpProduct } from './types'

type SortKey = 'recent' | 'highest' | 'lowest'

interface ReviewsProps {
  product: PdpProduct
  onWrite: () => void
}

export default function Reviews({ product, onWrite }: ReviewsProps) {
  const [sort, setSort] = useState<SortKey>('recent')
  const [star, setStar] = useState<number | null>(null)

  const reviews = product.reviews
  const total = product.total_reviews
  const average = product.average_rating

  const histogram = useMemo(() => {
    const counts = [0, 0, 0, 0, 0]
    for (const r of reviews) {
      const s = Math.min(5, Math.max(1, Math.round(r.rating)))
      counts[s - 1] += 1
    }
    return counts
  }, [reviews])

  const visible = useMemo(() => {
    const list = star ? reviews.filter(r => Math.round(r.rating) === star) : [...reviews]
    list.sort((a, b) => {
      if (sort === 'highest') return b.rating - a.rating
      if (sort === 'lowest') return a.rating - b.rating
      return String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
    })
    return list
  }, [reviews, sort, star])

  const writeButton = (
    <button
      type="button"
      onClick={onWrite}
      className="h-10 w-full rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-gray-950 focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 lg:h-9"
    >
      Write a review
    </button>
  )

  if (reviews.length === 0 && total === 0) {
    return (
      <div className="flex flex-col items-start gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <MessageSquareText className="h-6 w-6 text-zinc-500 dark:text-zinc-400" aria-hidden />
        <p className="text-sm text-zinc-700 dark:text-zinc-300">There are no reviews yet. Be the first to share your experience.</p>
        <div className="w-full max-w-xs">{writeButton}</div>
      </div>
    )
  }

  return (
    <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8">
      <div className="space-y-3 pb-3 lg:pb-0">
        <div className="flex items-center gap-2">
          <RatingStars rating={average} size="md" />
          <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">{average.toFixed(1)} out of 5</span>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {total.toLocaleString()} {total === 1 ? 'rating' : 'ratings'}
          {reviews.length > 0 && reviews.length < total ? ` (breakdown from ${reviews.length} loaded)` : ''}
        </p>
        {reviews.length > 0 ? (
          <ul className="space-y-1" aria-label="Filter reviews by rating">
            {[5, 4, 3, 2, 1].map(s => {
              const count = histogram[s - 1]
              const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
              return (
                <li key={s}>
                  <button
                    type="button"
                    disabled={count === 0}
                    aria-pressed={star === s}
                    onClick={() => setStar(star === s ? null : s)}
                    className="flex w-full items-center gap-2 text-sm text-primary-700 dark:text-primary-400 hover:underline disabled:cursor-default disabled:text-zinc-500 dark:disabled:text-zinc-400 disabled:no-underline"
                  >
                    <span className="w-10 shrink-0 text-left">{s} star</span>
                    <span className="h-4 flex-1 overflow-hidden rounded-sm border border-zinc-300 bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-700">
                      <span className="block h-full bg-amber-500 dark:bg-amber-400" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="w-9 shrink-0 text-right text-zinc-700 dark:text-zinc-300">{pct}%</span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : null}
        <hr className="border-zinc-200 dark:border-zinc-800" />
        <div>
          <p className="mb-2 text-sm text-zinc-700 dark:text-zinc-300">Share your thoughts with other buyers.</p>
          {writeButton}
        </div>
      </div>

      <div className="min-w-0 border-t border-zinc-200 dark:border-zinc-800 pt-3 lg:border-t-0 lg:pt-0">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {star ? (
              <>
                {visible.length} review{visible.length === 1 ? '' : 's'} with {star} star{star === 1 ? '' : 's'}{' '}
                <button type="button" onClick={() => setStar(null)} className="text-primary-700 dark:text-primary-400 hover:underline">
                  Clear filter
                </button>
              </>
            ) : (
              'Top reviews'
            )}
          </p>
          <label className="flex items-center gap-1.5 text-sm text-zinc-700 dark:text-zinc-300">
            Sort by
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortKey)}
              className="h-9 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 [color-scheme:light] dark:[color-scheme:dark] px-2 text-base text-zinc-900 dark:text-zinc-100 lg:text-sm"
            >
              <option value="recent">Most recent</option>
              <option value="highest">Highest rating</option>
              <option value="lowest">Lowest rating</option>
            </select>
          </label>
        </div>

        {visible.length === 0 ? (
          <p className="py-3 text-sm text-zinc-600 dark:text-zinc-400">No reviews to show.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {visible.map(r => (
              <li key={r.id} className="space-y-1 py-3 first:pt-0">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                    aria-hidden
                  >
                    {(r.user.username || 'A').charAt(0).toUpperCase()}
                  </span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{r.user.username}</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <RatingStars rating={r.rating} />
                  {r.verified === true ? (
                    <span className="inline-flex items-center gap-0.5 rounded-sm bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                      <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                      Verified purchase
                    </span>
                  ) : null}
                </div>
                {formatReviewDate(r.created_at) ? (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Reviewed on {formatReviewDate(r.created_at)}</p>
                ) : null}
                {r.comment ? <p className="text-sm leading-snug text-zinc-800 dark:text-zinc-200">{r.comment}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
