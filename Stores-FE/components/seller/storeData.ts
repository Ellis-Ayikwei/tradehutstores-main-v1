import { cache } from 'react'
import { apiUrl } from '@/lib/config'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import type { SellerPublic, StoreData, StoreProduct } from './types'

/**
 * Server-side data loading for the public seller store page.
 *
 * Backend reality (see report):
 *  - `GET sellers/<id>/` is not implemented yet (apps/sellers only exposes a placeholder list),
 *    so `seller` is usually null today and the page degrades to a products-only store.
 *  - `GET products/` has no seller filter and is unpaginated, so we fetch it and keep the rows
 *    whose `seller_profile` (or legacy `seller`) equals the store id.
 */

interface ApiResult {
    ok: boolean
    status: number
    data: unknown
}

async function apiGet(path: string): Promise<ApiResult> {
    try {
        const res = await fetch(new URL(path, apiUrl).toString(), {
            headers: { Accept: 'application/json' },
            next: { revalidate: 60 },
        })
        const data: unknown = res.ok ? await res.json().catch(() => null) : null
        return { ok: res.ok, status: res.status, data }
    } catch {
        return { ok: false, status: 0, data: null }
    }
}

function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function str(v: unknown): string | null {
    return typeof v === 'string' && v.trim() ? v.trim() : null
}

function num(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
}

function mapSeller(raw: unknown, fallbackId: string): SellerPublic | null {
    const r = asRecord(raw)
    if (!r) return null
    const name = str(r.business_name)
    if (!name) return null
    return {
        id: str(r.id) ?? fallbackId,
        business_name: name,
        business_description: str(r.business_description),
        store_logo: str(r.store_logo),
        store_banner: str(r.store_banner),
        store_slug: str(r.store_slug),
        rating: num(r.rating),
        total_reviews: num(r.total_reviews),
        total_orders: num(r.total_orders),
        is_verified: r.is_verified === true,
        is_accepting_orders: typeof r.is_accepting_orders === 'boolean' ? r.is_accepting_orders : null,
        return_policy: str(r.return_policy),
        shipping_policy: str(r.shipping_policy),
        website_url: str(r.website_url),
        facebook_url: str(r.facebook_url),
        instagram_url: str(r.instagram_url),
        twitter_url: str(r.twitter_url),
    }
}

/** Product statuses that must never appear on a public storefront. */
const HIDDEN_STATUSES = new Set(['deactivated', 'archived', 'deleted', 'pending', 'draft', 'suspended'])

function round2(n: number): number {
    return Math.round(n * 100) / 100
}

function mapProduct(raw: Record<string, unknown>): StoreProduct | null {
    const id = raw.id != null ? String(raw.id) : ''
    const name = str(raw.name)
    const base = num(raw.primary_variant_price)
    if (!id || !name || base === null || base <= 0) return null

    const d = num(raw.discount_percentage) ?? 0
    const hasDiscount = d > 0 && d < 100
    const reviewCount = num(raw.total_reviews) ?? 0
    const avg = num(raw.average_rating)
    const stock = num(raw.variant_stock_total)

    return {
        id,
        name,
        imageUrl: resolveMediaSrc(str(raw.main_product_image)) || null,
        price: hasDiscount ? round2(base * (1 - d / 100)) : base,
        originalPrice: hasDiscount ? base : undefined,
        discountPct: hasDiscount ? Math.round(d) : 0,
        rating: reviewCount > 0 && avg !== null ? avg : undefined,
        reviewCount: reviewCount > 0 ? reviewCount : undefined,
        category: str(raw.category_name),
        stockLeft: raw.available === false ? 0 : stock !== null ? Math.max(0, stock) : undefined,
        createdAt: str(raw.created_at),
    }
}

/** Cached per request so generateMetadata and the page share one round trip. */
export const getStoreData = cache(async (id: string): Promise<StoreData> => {
    const safeId = encodeURIComponent(id)
    const [sellerRes, productsRes] = await Promise.all([
        apiGet(`sellers/${safeId}/`),
        apiGet('products/'),
    ])

    const seller = sellerRes.ok ? mapSeller(sellerRes.data, id) : null
    const productsError = !productsRes.ok

    const list: unknown[] = Array.isArray(productsRes.data)
        ? productsRes.data
        : Array.isArray(asRecord(productsRes.data)?.results)
          ? (asRecord(productsRes.data)?.results as unknown[])
          : []

    const storeIds = new Set<string>([id])
    if (seller) storeIds.add(seller.id)

    const products: StoreProduct[] = []
    for (const item of list) {
        const r = asRecord(item)
        if (!r) continue
        const owner = r.seller_profile != null ? String(r.seller_profile) : ''
        const legacyOwner = r.seller != null ? String(r.seller) : ''
        if (!storeIds.has(owner) && !storeIds.has(legacyOwner)) continue
        if (HIDDEN_STATUSES.has(String(r.status ?? '').toLowerCase())) continue
        const mapped = mapProduct(r)
        if (mapped) products.push(mapped)
    }

    return {
        seller,
        products,
        productsError,
        notFound: !seller && !productsError && products.length === 0,
    }
})

/** Weighted average of product ratings, using only products that have reviews. */
export function deriveRating(products: StoreProduct[]): { rating: number; count: number } | null {
    let weighted = 0
    let count = 0
    for (const p of products) {
        if (p.rating !== undefined && p.reviewCount) {
            weighted += p.rating * p.reviewCount
            count += p.reviewCount
        }
    }
    return count > 0 ? { rating: weighted / count, count } : null
}
