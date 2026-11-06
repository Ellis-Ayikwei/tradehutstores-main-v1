'use client'

import Link from 'next/link'
import { ProductCard, ProductGrid } from '@/components/common/marketplace'
import { useCurrency } from '@/contexts/CurrencyContext'
import { toMarketplaceProduct } from './pdpUtils'
import type { PdpProduct } from './types'

export default function RelatedProducts({ items, category }: { items: PdpProduct[]; category: string | null }) {
  const { formatDisplayPrice } = useCurrency()
  if (items.length === 0) return null
  return (
    <section aria-labelledby="pdp-related" className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 id="pdp-related" className="text-lg font-bold text-zinc-900 dark:text-zinc-100 lg:text-xl">
          Related products
        </h2>
        {category ? (
          <Link
            href={`/products?category=${encodeURIComponent(category)}`}
            className="text-sm text-primary-700 dark:text-primary-400 hover:underline"
          >
            See more in {category}
          </Link>
        ) : null}
      </div>
      <ProductGrid layout="dense">
        {items.slice(0, 12).map(p => (
          <ProductCard key={p.id} product={toMarketplaceProduct(p)} formatPrice={formatDisplayPrice} compact />
        ))}
      </ProductGrid>
    </section>
  )
}
