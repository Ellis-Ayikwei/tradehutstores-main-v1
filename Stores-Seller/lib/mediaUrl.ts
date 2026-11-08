/**
 * Django serves uploads under MEDIA_URL (default `/media/...`) on the API origin.
 * Next/Image treats relative URLs as same-origin to the Next dev server, which breaks
 * when the browser hits `localhost:3000/media/...` instead of `api:8000/media/...`.
 */

export function getApiPublicOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_ORIGIN?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv

  const api = (
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/tradehut/api/v1/'
  ).trim()
  try {
    return new URL(api, 'http://localhost').origin
  } catch {
    return 'http://localhost:8000'
  }
}

/**
 * Turn backend-relative media/static paths into absolute URLs for next/image.
 * Leaves `http(s)://`, protocol-relative `//`, and other `/` paths (e.g. `/placeholder.png`) unchanged.
 */
export function resolveMediaSrc(src: string | undefined | null): string {
  if (src == null) return ''
  const s = String(src).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('//')) return `https:${s}`
  if (s.startsWith('/media/') || s.startsWith('/static/')) {
    return `${getApiPublicOrigin()}${s}`
  }
  return s
}
