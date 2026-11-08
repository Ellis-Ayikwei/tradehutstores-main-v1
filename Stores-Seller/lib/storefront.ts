/**
 * Origin of the buyer storefront (Stores-FE). Seller Central links back to it for the public site,
 * legal pages and listing previews. Falls back to '/' (this app) when NEXT_PUBLIC_STOREFRONT_URL is unset.
 */
const RAW = process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim()

export const STOREFRONT_URL: string = RAW ? RAW.replace(/\/+$/, '') : ''

/** Absolute storefront URL for a path (e.g. `/legal/terms`), or the path itself when no storefront is configured. */
export function storefrontHref(path = '/'): string {
    const p = path.startsWith('/') ? path : `/${path}`
    return STOREFRONT_URL ? `${STOREFRONT_URL}${p}` : p
}
