import { resolveMediaSrc } from './mediaUrl'

/**
 * Custom next/image loader (wired in next.config.js: images.loader = 'custom').
 *
 * The site runs on Cloudflare Pages (next-on-pages), where the built-in `/_next/image` optimiser is not
 * available/fast, so images never go through it:
 *  - NEXT_PUBLIC_IMAGE_TRANSFORM_BASE unset  -> the original absolute URL, straight from the API / R2 / CDN.
 *  - NEXT_PUBLIC_IMAGE_TRANSFORM_BASE set    -> Cloudflare Image Transformations:
 *      {base}/cdn-cgi/image/width={w},quality={q},format=auto/{absolute-src}
 *
 * Isomorphic and dependency-free (runs in the browser, on the server and in next-on-pages), no Node APIs.
 */
export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
    if (src.startsWith('data:') || src.startsWith('blob:')) return src

    // Backend-relative /media/ and /static/ paths become absolute API-origin URLs (same rule as the cards).
    const absolute = resolveMediaSrc(src)

    const base = process.env.NEXT_PUBLIC_IMAGE_TRANSFORM_BASE
    if (!base) {
        // Passthrough. A fragment is never sent to the server or used by the HTTP cache, but it makes the URL differ
        // from `src` so next dev does not warn that the loader "does not implement width" for every image.
        return process.env.NODE_ENV === 'production' ? absolute : `${absolute}#w${width}`
    }

    return `${base.replace(/\/$/, '')}/cdn-cgi/image/width=${width},quality=${quality || 75},format=auto/${absolute}`
}
