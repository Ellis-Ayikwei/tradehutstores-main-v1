export function mapReviewFromApi(review: any) {
  const u = review?.user
  const username =
    u?.username ||
    `${u?.first_name ?? ''} ${u?.last_name ?? ''}`.trim() ||
    'Anonymous'
  return {
    ...review,
    id: String(review.id),
    rating: Number(review.rating),
    comment: review.comment ?? '',
    user: { username },
    created_at: review.created_at,
  }
}

export type MappedReview = ReturnType<typeof mapReviewFromApi>

export function parseReviewSubmitError(e: unknown): string {
  const err = e as { response?: { data?: unknown } }
  const d = err?.response?.data as Record<string, unknown> | string | undefined
  let msg = 'Could not submit review.'
  if (typeof d === 'object' && d != null && typeof d.detail === 'string') msg = d.detail
  else if (d && typeof d === 'object') {
    const v = Object.values(d).flat()[0]
    if (typeof v === 'string') msg = v
    else if (Array.isArray(v) && typeof v[0] === 'string') msg = v[0]
  }
  return msg
}
