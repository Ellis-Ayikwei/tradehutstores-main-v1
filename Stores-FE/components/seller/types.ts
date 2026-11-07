import type { CardVariant } from '@/components/common/marketplace/cardVariants'
/**
 * Shapes used by the public seller store page.
 *
 * `SellerPublic` mirrors `SellerProfilePublicSerializer` (Stores-BE/apps/users/serializers.py).
 * Every field is optional because no public seller endpoint is mounted yet; the page
 * only renders what the API actually returns.
 */
export interface SellerPublic {
    id: string
    business_name: string
    business_description: string | null
    store_logo: string | null
    store_banner: string | null
    store_slug: string | null
    rating: number | null
    total_reviews: number | null
    total_orders: number | null
    is_verified: boolean
    is_accepting_orders: boolean | null
    return_policy: string | null
    shipping_policy: string | null
    website_url: string | null
    facebook_url: string | null
    instagram_url: string | null
    twitter_url: string | null
}

/** Display-ready product row, mapped from `GET /products/`. */
export interface StoreProduct {
    id: string
    name: string
    imageUrl: string | null
    /** Selling price (after any percentage discount), in the store base currency. */
    price: number
    /** List price, only set when a real discount applies. */
    originalPrice?: number
    discountPct: number
    rating?: number
    reviewCount?: number
    category: string | null
    /** 0 renders "Sold out". Undefined when the API did not report stock. */
    stockLeft?: number
    createdAt: string | null
    /** Real variants when the row carries them (enables colour swatches on cards). */
    variants?: CardVariant[]
    defaultVariantId?: string
}

export interface StoreData {
    /** Public seller profile, or null when the API has none / is unreachable. */
    seller: SellerPublic | null
    products: StoreProduct[]
    /** True when the product list request failed (distinct from "no products"). */
    productsError: boolean
    /** True only when we are confident this store does not exist. */
    notFound: boolean
}

export type StoreTabKey = 'products' | 'about' | 'reviews' | 'policies'
