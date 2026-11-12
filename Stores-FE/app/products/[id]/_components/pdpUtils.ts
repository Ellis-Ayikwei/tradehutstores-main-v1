import { resolveMediaSrc } from '@/lib/mediaUrl'
import type { MappedReview } from '@/lib/reviewUtils'
import type { MarketplaceProduct } from '@/components/common/marketplace'
import type { PdpAttributeValue, PdpProduct, PdpVariant } from './types'

type Raw = Record<string, unknown>

/**
 * PriceTag (shared component) hard-codes text-zinc-900 on the amount; this overrides it in dark mode
 * without touching the shared file. Pass as PriceTag's className.
 */
export const PRICE_TAG_DARK = 'dark:[&>.font-bold]:text-zinc-50'

export function asRecord(v: unknown): Raw | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null
}

export function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function list(v: unknown): unknown[] {
  if (Array.isArray(v)) return v
  const r = asRecord(v)
  return r && Array.isArray(r.results) ? (r.results as unknown[]) : []
}

function normalizeVariant(raw: unknown): PdpVariant | null {
  const r = asRecord(raw)
  if (!r || r.id == null) return null
  const attrs: PdpAttributeValue[] = list(r.attribute_values)
    .map(a => asRecord(a))
    .filter((a): a is Raw => a !== null && a.id != null)
    .map(a => ({
      id: String(a.id),
      attribute: a.attribute != null ? String(a.attribute) : undefined,
      attribute_name: str(a.attribute_name) ?? undefined,
      attribute_display_type: str(a.attribute_display_type) ?? undefined,
      value_name: str(a.value_name),
      color_code: str(a.color_code),
      image: str(a.image),
    }))
  const primary = str(r.primary_image) ?? str(r.primaryImage)
  return {
    id: String(r.id),
    // Keep the seller's raw name (may be a placeholder such as "Default"); buyer text goes through variantDisplayLabel.
    name: str(r.name) ?? '',
    sku: str(r.sku),
    price: String(num(r.price) ?? 0),
    quantity: num(r.quantity),
    primary_image: primary ? resolveMediaSrc(primary) : null,
    images: Array.isArray(r.images) ? r.images : undefined,
    attribute_values: attrs,
  }
}

function imageEntryUrl(entry: unknown): string | null {
  if (typeof entry === 'string') return entry.trim() ? resolveMediaSrc(entry.trim()) : null
  const o = asRecord(entry)
  if (!o) return null
  for (const key of ['image', 'url', 'src']) {
    const v = str(o[key])
    if (v) return resolveMediaSrc(v)
  }
  return null
}

/** Accepts API image rows (`{ image }`), strings, or `{ url }`; returns de-duplicated usable srcs. */
export function toImageList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    const u = imageEntryUrl(item)
    if (u) out.push(u)
  }
  return [...new Set(out)]
}

/** Product image rows carry a `product_variant` FK; group them per variant (main image first). */
function variantImageMap(raw: unknown): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  if (!Array.isArray(raw)) return out
  const rows = raw
    .map(asRecord)
    .filter((r): r is Raw => r !== null && r.product_variant != null && r.product_variant !== '')
    .map((r, i) => ({ r, i }))
    .sort((a, b) => Number(b.r.is_main === true) - Number(a.r.is_main === true) || a.i - b.i)
  for (const { r } of rows) {
    const url = imageEntryUrl(r)
    if (!url) continue
    const key = String(r.product_variant)
    const list = out[key] ?? (out[key] = [])
    if (!list.includes(url)) list.push(url)
  }
  return out
}

function keyFeatures(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const item of v) {
    const s = str(item) ?? str(asRecord(item)?.feature) ?? str(asRecord(item)?.text) ?? str(asRecord(item)?.name)
    if (s) out.push(s)
  }
  return out
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

/**
 * Seller descriptions may arrive as HTML. Never inject it: block tags become line breaks, every other tag
 * (and script/style bodies) is dropped, common entities are decoded, and the result is rendered as plain text.
 */
export function plainText(input: string): string {
  if (!/[<&]/.test(input)) return input
  return input
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<\s*br\s*\/?>|<\/(p|div|li|h[1-6]|tr|ul|ol|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e: string) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        return Number.isFinite(code) && code > 31 && code < 0x10ffff ? String.fromCodePoint(code) : ''
      }
      return ENTITIES[e.toLowerCase()] ?? m
    })
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function normalizeProduct(
  raw: Raw,
  variantsRaw: unknown = [],
  imagesRaw: unknown = [],
  reviews: MappedReview[] = []
): PdpProduct {
  // Infographic rows are the big "about this product" pictures: they go in the wall under the details,
  // never into the buy-box gallery.
  const allImageRows = Array.isArray(imagesRaw) ? imagesRaw : []
  const isWallRow = (r: unknown) => asRecord(r)?.image_type === 'infographic'
  const wallImages = toImageList(allImageRows.filter(isWallRow))
  imagesRaw = allImageRows.filter(r => !isWallRow(r))

  const variantImages = variantImageMap(imagesRaw)
  const variants = list(variantsRaw)
    .map(normalizeVariant)
    .filter((v): v is PdpVariant => v !== null)
    .map(v => (variantImages[v.id]?.length ? { ...v, images: variantImages[v.id] } : v))

  const price = num(raw.primary_variant_price) ?? num(variants[0]?.price) ?? num(raw.price) ?? 0
  const discount = Math.min(99, Math.max(0, num(raw.discount_percentage) ?? 0))
  const finalPrice = discount > 0 ? round2(price * (1 - discount / 100)) : price

  const mainRaw = str(raw.main_product_image)
  const main = mainRaw ? resolveMediaSrc(mainRaw) : ''
  const gallery = toImageList(imagesRaw)
  const images = gallery.length > 0 ? gallery : main ? [main] : []

  const verified =
    typeof raw.seller_verified === 'boolean'
      ? raw.seller_verified
      : typeof raw.seller_is_verified === 'boolean'
        ? raw.seller_is_verified
        : null

  return {
    id: String(raw.id),
    name: str(raw.name) ?? 'Unnamed product',
    slug: str(raw.slug),
    description: plainText(str(raw.description) ?? ''),
    category: str(raw.category_name),
    sub_category: str(raw.sub_category_name),
    category_id: raw.category != null && raw.category !== '' ? String(asRecord(raw.category)?.id ?? raw.category) : null,
    brand_id: raw.brand != null && raw.brand !== '' ? String(asRecord(raw.brand)?.id ?? raw.brand) : null,
    brand: str(raw.brand_name),
    condition: str(raw.condition),
    price,
    final_price: finalPrice,
    discount_percentage: discount,
    pricing_currency: str(raw.pricing_currency) ?? 'GHS',
    main_product_image: main,
    images,
    wall_images: wallImages,
    shared_images: toImageList(Array.isArray(imagesRaw) ? imagesRaw.filter(r => { const o = asRecord(r); return !o || o.product_variant == null || o.product_variant === '' }) : []),
    variants,
    variation_theme: str(raw.variation_theme) ?? 'single',
    default_variant_id: raw.default_variant != null && raw.default_variant !== '' ? String(asRecord(raw.default_variant)?.id ?? raw.default_variant) : null,
    average_rating: num(raw.average_rating) ?? 0,
    total_reviews: num(raw.total_reviews) ?? 0,
    inventory_level: num(raw.inventory_level),
    variant_stock_total: num(raw.variant_stock_total),
    available: raw.available !== false,
    min_amount: num(raw.min_amount),
    sku: str(raw.primary_sku),
    seller_profile: raw.seller_profile != null ? String(raw.seller_profile) : null,
    seller_name: str(raw.seller_name) ?? str(raw.store_name) ?? str(raw.seller_business_name),
    seller_verified: verified,
    free_shipping: typeof raw.free_shipping === 'boolean' ? raw.free_shipping : null,
    key_features: keyFeatures(raw.key_features),
    reviews,
  }
}

/** Map a related-products row to the shared marketplace card shape. */
export function toMarketplaceProduct(p: PdpProduct): MarketplaceProduct {
  const stock = p.variant_stock_total ?? p.inventory_level
  return {
    id: p.id,
    title: p.name,
    href: `/products/${p.id}`,
    imageUrl: p.main_product_image || p.images[0] || null,
    price: p.final_price,
    originalPrice: p.discount_percentage > 0 ? p.price : undefined,
    rating: p.total_reviews > 0 ? p.average_rating : undefined,
    reviewCount: p.total_reviews > 0 ? p.total_reviews : undefined,
    stockLeft: !p.available ? 0 : stock != null ? Math.max(0, stock) : undefined,
    freeShipping: p.free_shipping === true ? true : undefined,
    sellerName: p.seller_name ?? undefined,
    brand: p.brand ?? undefined,
    category: p.category ?? undefined,
  }
}

/** Description to bullet points: real key features first, else lines/paragraphs/sentences. */
export function aboutBullets(description: string, features: string[]): string[] {
  if (features.length > 0) return features
  const lines = description
    .split(/\r?\n+/)
    .map(l => l.replace(/^\s*[-*•·]+\s*/, '').trim())
    .filter(Boolean)
  if (lines.length === 1 && lines[0].length > 200) {
    const sentences = lines[0].match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)
    if (sentences && sentences.length > 1) return sentences.map(s => s.trim()).filter(Boolean)
  }
  return lines
}

export function titleCase(s: string): string {
  return s
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export function formatReviewDate(iso: unknown): string {
  if (typeof iso !== 'string' || !iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })
}
