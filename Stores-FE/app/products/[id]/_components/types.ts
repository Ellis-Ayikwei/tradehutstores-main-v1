import type { MappedReview } from '@/lib/reviewUtils'

export interface PdpAttributeValue {
  id: string
  attribute?: string
  attribute_name?: string
  attribute_display_type?: string
  value_name?: string | null
  color_code?: string | null
  image?: string | null
}

export interface PdpVariant {
  id: string
  name: string
  sku: string | null
  /** Decimal string in the store pricing currency. */
  price: string
  quantity: number | null
  primary_image: string | null
  /** Per-variant gallery (image URLs), built from the product image rows' `product_variant` FK; first = lead. */
  images?: unknown[]
  attribute_values: PdpAttributeValue[]
}

export interface PdpProduct {
  id: string
  name: string
  slug: string | null
  description: string
  category: string | null
  sub_category: string | null
  /** Category / brand row ids (the catalogue rows carry the same ids), used to find sibling products. */
  category_id: string | null
  brand_id: string | null
  brand: string | null
  condition: string | null
  /** Base (list) price in the store pricing currency. */
  price: number
  /** Price after `discount_percentage`. */
  final_price: number
  discount_percentage: number
  pricing_currency: string
  main_product_image: string
  images: string[]
  /** Large infographic / brand-story pictures shown full width under the product details. */
  wall_images: string[]
  /** Product-level pictures not tied to any variant (shared shots); shown for every variant. */
  shared_images: string[]
  variants: PdpVariant[]
  variation_theme: string
  /** `Product.default_variant` id, used to preselect the variant on load. */
  default_variant_id: string | null
  average_rating: number
  total_reviews: number
  inventory_level: number | null
  /** Sum of variant quantities when the API provides it. */
  variant_stock_total: number | null
  available: boolean
  min_amount: number | null
  sku: string | null
  seller_profile: string | null
  seller_name: string | null
  /** null = the API does not say. */
  seller_verified: boolean | null
  /** null = the API does not say. */
  free_shipping: boolean | null
  key_features: string[]
  reviews: MappedReview[]
}

export interface PriceInfo {
  /** Lowest current price (after discount). */
  price: number
  /** Highest current price when variants differ and none is selected. */
  maxPrice: number | null
  /** Struck-through list price, only when a real discount applies. */
  listPrice: number | null
  discountPct: number
}

export interface StockInfo {
  /** null = quantity unknown. */
  quantity: number | null
  inStock: boolean
  low: boolean
}

export interface SellerInfo {
  id: string
  name: string | null
  verified: boolean
}
