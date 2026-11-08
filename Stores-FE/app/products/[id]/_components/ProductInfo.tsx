import type { ReactNode } from 'react'
import Link from 'next/link'
import { variantRealAttributes } from '@/lib/variantLabel'
import { aboutBullets, titleCase } from './pdpUtils'
import type { PdpProduct, PdpVariant, SellerInfo } from './types'
import { SellerLine, DeliveryLine } from './BuyBox'

export function AboutList({ product }: { product: PdpProduct }) {
  const bullets = aboutBullets(product.description, product.key_features)
  if (bullets.length === 0) return null
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-snug text-zinc-800 dark:text-zinc-200 marker:text-zinc-500 dark:marker:text-zinc-400">
      {bullets.map((b, i) => (
        <li key={i}>{b}</li>
      ))}
    </ul>
  )
}

/**
 * "Top highlights": the selected variant's real attributes (Colour, Size, ...) plus brand and condition.
 * Placeholder values ("Default Color") are dropped by `variantRealAttributes`; nothing is invented.
 */
export function highlightRows(product: PdpProduct, variant: PdpVariant | null): Array<[string, string]> {
  const rows: Array<[string, string]> = []
  if (variant) for (const a of variantRealAttributes(variant)) rows.push([a.label, a.value])
  if (product.brand) rows.push(['Brand', product.brand])
  if (product.condition) rows.push(['Condition', titleCase(product.condition)])
  return rows
}

/** Kept for callers that want one flat key/value list (highlights + category, SKU, minimum order). */
export function detailRows(product: PdpProduct, variant: PdpVariant | null): Array<[string, string]> {
  const rows = highlightRows(product, variant)
  if (product.category) rows.push(['Category', product.category])
  if (product.sub_category) rows.push(['Sub-category', product.sub_category])
  const sku = variant?.sku ?? product.sku
  if (sku) rows.push(['SKU', sku])
  if (product.min_amount != null && product.min_amount > 1) rows.push(['Minimum order', String(product.min_amount)])
  return rows
}

export function DetailsTable({ rows, emptyText }: { rows: Array<[string, string]>; emptyText?: string }) {
  if (rows.length === 0) {
    return emptyText ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{emptyText}</p> : null
  }
  return (
    <table className="w-full max-w-2xl border-collapse text-sm">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-zinc-200 dark:border-zinc-800 last:border-b-0">
            <th scope="row" className="w-2/5 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-left align-top font-medium text-zinc-700 dark:text-zinc-300">
              {k}
            </th>
            <td className="break-words px-3 py-1.5 text-zinc-900 dark:text-zinc-100">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Rows of the "Product details" list. Date first available is omitted: the API only exposes last-modified. */
export function detailListRows(
  product: PdpProduct,
  variant: PdpVariant | null,
  seller: SellerInfo | null
): Array<[string, ReactNode]> {
  const rows: Array<[string, ReactNode]> = []
  const sku = variant?.sku ?? product.sku
  if (sku) rows.push(['SKU', sku])
  if (product.brand) rows.push(['Brand', product.brand])
  if (product.condition) rows.push(['Condition', titleCase(product.condition)])
  if (product.category) {
    rows.push([
      'Category',
      <Link
        key="cat"
        href={`/products?category=${encodeURIComponent(product.category)}`}
        className="text-primary-700 hover:underline dark:text-primary-400"
      >
        {product.category}
      </Link>,
    ])
  }
  if (product.sub_category) rows.push(['Sub-category', product.sub_category])
  if (variant) for (const a of variantRealAttributes(variant)) rows.push([a.label, a.value])
  if (product.min_amount != null && product.min_amount > 1) rows.push(['Minimum order', String(product.min_amount)])
  if (seller?.name) {
    rows.push([
      'Sold by',
      <Link
        key="seller"
        href={`/seller/${encodeURIComponent(seller.id)}`}
        className="text-primary-700 hover:underline dark:text-primary-400"
      >
        {seller.name}
      </Link>,
    ])
  }
  if (product.total_reviews > 0 && product.average_rating > 0) {
    rows.push([
      'Customer reviews',
      `${product.average_rating.toFixed(1)} out of 5 (${product.total_reviews.toLocaleString()} ${product.total_reviews === 1 ? 'rating' : 'ratings'})`,
    ])
  }
  return rows
}

/** Amazon-style "Product details" list: bold label, value, divider rows. */
export function DetailsList({ rows }: { rows: Array<[string, ReactNode]> }) {
  if (rows.length === 0) return null
  return (
    <dl className="max-w-3xl divide-y divide-zinc-200 border-y border-zinc-200 text-sm dark:divide-zinc-800 dark:border-zinc-800">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-3 py-1.5">
          <dt className="font-bold text-zinc-900 dark:text-zinc-100">{k}</dt>
          <dd className="break-words text-zinc-800 dark:text-zinc-200">{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The seller's description as safe text paragraphs (HTML already reduced to text in `normalizeProduct`). */
export function DescriptionBody({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
  if (paragraphs.length === 0) return null
  return (
    <div className="max-w-3xl space-y-2 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line break-words">
          {p}
        </p>
      ))}
    </div>
  )
}

export function SellerPolicies({ product, seller }: { product: PdpProduct; seller: SellerInfo | null }) {
  return (
    <div className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
      <SellerLine seller={seller} />
      <DeliveryLine freeShipping={product.free_shipping} />
      <p>
        Returns:{' '}
        <Link href="/returns" className="text-primary-700 dark:text-primary-400 hover:underline">
          see our returns policy
        </Link>
      </p>
      <p>
        Buyer protection:{' '}
        <Link href="/buyer-protection" className="text-primary-700 dark:text-primary-400 hover:underline">
          how your purchase is protected
        </Link>
      </p>
      <p className="text-xs text-zinc-600 dark:text-zinc-400">Secure checkout</p>
    </div>
  )
}
