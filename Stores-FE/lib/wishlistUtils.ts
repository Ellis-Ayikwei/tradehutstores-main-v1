/** Normalize API wishlist rows (product may be a bare PK) for UI + cart. */

export function wishlistItemProductId(item: { product?: unknown }): string {
  const p = item?.product
  if (p != null && typeof p === 'object' && p !== null && 'id' in p) {
    return String((p as { id: unknown }).id)
  }
  if (p != null) return String(p)
  return ''
}

export function normalizeWishlistProduct(item: {
  id?: string
  product?: unknown
  product_name?: string
  product_slug?: string
  product_price?: string | number
  product_image?: string | null
}): {
  id: string
  name: string
  slug?: string
  price: string
  final_price: number
  main_product_image?: string
  discount_percentage: number
  inventory_level: number
  category: string
  brand: string
  description: string
} {
  const id = wishlistItemProductId(item)
  const p = item.product
  if (p != null && typeof p === 'object' && p !== null && 'name' in p) {
    const o = p as Record<string, unknown>
    return {
      id: String(o.id ?? id),
      name: String(o.name ?? 'Product'),
      slug: o.slug != null ? String(o.slug) : undefined,
      price: String(o.price ?? '0'),
      final_price: Number(o.final_price ?? o.price ?? 0) || 0,
      main_product_image:
        typeof o.main_product_image === 'string'
          ? o.main_product_image
          : undefined,
      discount_percentage: Number(o.discount_percentage ?? 0) || 0,
      inventory_level: Number(o.inventory_level ?? 1) || 0,
      category: String(o.category ?? ''),
      brand: String(o.brand ?? ''),
      description: String(o.description ?? ''),
    }
  }
  const priceNum =
    item.product_price != null ? Number(item.product_price) : 0
  return {
    id,
    name: item.product_name ?? 'Product',
    slug: item.product_slug,
    price: String(priceNum || '0'),
    final_price: priceNum,
    main_product_image: item.product_image ?? undefined,
    discount_percentage: 0,
    inventory_level: 1,
    category: '',
    brand: '',
    description: '',
  }
}
