'use client'

import { useState, useEffect, useCallback } from 'react'
import { Star, X } from 'lucide-react'
import axiosInstance from '@/lib/axiosInstance'
import { useAuthModal } from '@/providers/AuthModalProvider'
import { mapReviewFromApi, parseReviewSubmitError, type MappedReview } from '@/lib/reviewUtils'

function StarRatingPicker({
  value,
  onChange,
  sizeClass = 'w-7 h-7',
  disabled = false,
}: {
  value: number
  onChange: (n: number) => void
  sizeClass?: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className="p-0.5 rounded-md hover:bg-neutral-200/80 dark:hover:bg-neutral-700/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-50"
        >
          <Star
            className={`${sizeClass} ${
              n <= value ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 dark:text-neutral-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export type WriteReviewModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  onSubmitted: (mappedReview: MappedReview, ratingSubmitted: number) => void
  onToast?: (message: string, type: 'success' | 'error') => void
}

export default function WriteReviewModal({
  open,
  onOpenChange,
  productId,
  onSubmitted,
  onToast,
}: WriteReviewModalProps) {
  const { openAuthModal } = useAuthModal()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setRating(5)
      setComment('')
      setError(null)
    }
  }, [open])

  const close = useCallback(() => {
    if (!submitting) onOpenChange(false)
  }, [submitting, onOpenChange])

  const handleSubmit = async () => {
    if (!productId || submitting) return
    setError(null)
    setSubmitting(true)
    try {
      const { data } = await axiosInstance.post('reviews/', {
        product: productId,
        rating,
        comment: comment.trim() || '',
      })
      const mapped = mapReviewFromApi(data)
      onOpenChange(false)
      onSubmitted(mapped, rating)
      onToast?.('Thanks for your review!', 'success')
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) {
        openAuthModal('login')
      } else {
        setError(parseReviewSubmitError(e))
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 bg-black/50"
      role="presentation"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 id="review-modal-title" className="font-syne text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Write a review
          </h3>
          <button
            type="button"
            disabled={submitting}
            onClick={close}
            className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400 mb-2">
            Rating
          </p>
          <StarRatingPicker value={rating} onChange={setRating} disabled={submitting} />
        </div>
        <div>
          <label
            htmlFor="review-comment"
            className="text-xs font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400 block mb-2"
          >
            Comment (optional)
          </label>
          <textarea
            id="review-comment"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={submitting}
            placeholder="What did you think of this product?"
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 px-4 py-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-y min-h-[100px] disabled:opacity-60"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
          <button
            type="button"
            disabled={submitting}
            onClick={close}
            className="px-5 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 font-semibold text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  )
}
