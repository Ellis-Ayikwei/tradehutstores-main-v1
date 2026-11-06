import { resolveMediaSrc } from '@/lib/mediaUrl'

/**
 * Loose product shape returned by the various catalog endpoints
 * (featured / popular / new_arrivals / homepage sections).
 * Home components normalise it once so every card renders the same way.
 */
export type RawProduct = Record<string, unknown>

export interface HomeProduct {
    id: string
    name: string
    image: string
    price: number
    originalPrice: number
    discountPct: number
    rating: number
    reviews: number
    /** Units sold, or null when the API does not provide it. */
    sold: number | null
    /** Units in stock, or null when unknown. */
    stock: number | null
    /** true = free shipping, false = paid shipping, null = unknown. */
    freeShipping: boolean | null
    brand: string
}

function toNum(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() !== '') {
        const n = Number.parseFloat(value)
        return Number.isFinite(n) ? n : null
    }
    return null
}

function firstNum(raw: RawProduct, keys: string[]): number | null {
    for (const key of keys) {
        const n = toNum(raw[key])
        if (n !== null) return n
    }
    return null
}

export function normalizeProduct(raw: RawProduct | null | undefined): HomeProduct | null {
    if (!raw || raw.id === undefined || raw.id === null) return null
    const name = typeof raw.name === 'string' ? raw.name : ''
    if (!name) return null

    const price = toNum(raw.price) ?? 0
    const finalPrice = toNum(raw.final_price) || price
    const originalPrice = toNum(raw.original_price) || price

    const hasDrop = originalPrice > finalPrice && finalPrice > 0
    let discountPct = firstNum(raw, ['discount_percentage', 'discount']) ?? 0
    if (hasDrop && !discountPct) {
        discountPct = Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
    }
    if (!hasDrop) discountPct = 0

    const imageRaw =
        (typeof raw.main_product_image === 'string' && raw.main_product_image) ||
        (typeof raw.image === 'string' && raw.image) ||
        ''

    let freeShipping: boolean | null = null
    if (typeof raw.free_shipping === 'boolean') freeShipping = raw.free_shipping
    else {
        const ship = toNum(raw.shipping_cost)
        if (ship !== null) freeShipping = ship === 0
    }

    return {
        id: String(raw.id),
        name,
        image: resolveMediaSrc(imageRaw),
        price: finalPrice,
        originalPrice: hasDrop ? originalPrice : finalPrice,
        discountPct,
        rating: firstNum(raw, ['average_rating', 'rating']) ?? 0,
        reviews: firstNum(raw, ['total_reviews', 'reviews']) ?? 0,
        sold: firstNum(raw, ['sold_count', 'total_sold', 'units_sold', 'sales_count', 'sold']),
        stock: firstNum(raw, ['stock', 'stock_quantity', 'quantity']),
        freeShipping,
        brand: typeof raw.brand === 'string' ? raw.brand : '',
    }
}

export function normalizeProducts(list: unknown): HomeProduct[] {
    if (!Array.isArray(list)) return []
    const out: HomeProduct[] = []
    for (const item of list) {
        const p = normalizeProduct(item as RawProduct)
        if (p) out.push(p)
    }
    return out
}

/** 1200 -> "1.2k", 15300 -> "15k". */
export function compactCount(n: number): string {
    if (n >= 10_000) return `${Math.round(n / 1000)}k`
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`
    return String(n)
}

/** localStorage key the PDP should write to (array of RecentlyViewedItem, newest first, max 20). */
export const RECENTLY_VIEWED_KEY = 'th_recently_viewed'

export interface RecentlyViewedItem {
    id: string
    name: string
    image: string
    price: number
}

/** SSR-safe helper the product page can call to feed the "Recently viewed" row. */
export function recordRecentlyViewed(item: RecentlyViewedItem): void {
    if (typeof window === 'undefined') return
    try {
        const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY)
        const parsed: unknown = raw ? JSON.parse(raw) : []
        const list = Array.isArray(parsed) ? (parsed as RecentlyViewedItem[]) : []
        const next = [item, ...list.filter((p) => p && p.id !== item.id)].slice(0, 20)
        window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next))
    } catch {
        /* storage unavailable (private mode / quota) */
    }
}
