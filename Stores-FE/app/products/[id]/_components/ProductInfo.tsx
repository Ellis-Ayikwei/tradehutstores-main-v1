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

export function detailRows(product: PdpProduct, variant: PdpVariant | null): Array<[string, string]> {
  const rows: Array<[string, string]> = []
  if (product.brand) rows.push(['Brand', product.brand])
  if (product.condition) rows.push(['Condition', titleCase(product.condition)])
  if (product.category) rows.push(['Category', product.category])
  if (product.sub_category) rows.push(['Sub-category', product.sub_category])
  if (variant) {
    for (const a of variantRealAttributes(variant)) rows.push([a.label, a.value])
  }
  const sku = variant?.sku ?? product.sku
  if (sku) rows.push(['SKU', sku])
  if (product.min_amount != null && product.min_amount > 1) rows.push(['Minimum order', String(product.min_amount)])
  return rows
}

export function DetailsTable({ rows }: { rows: Array<[string, string]> }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-600 dark:text-zinc-400">No additional details have been provided.</p>
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
