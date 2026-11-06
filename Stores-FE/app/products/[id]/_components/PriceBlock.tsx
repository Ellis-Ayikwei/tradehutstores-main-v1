'use client'

import { PriceTag } from '@/components/common/marketplace'
import { useCurrency } from '@/contexts/CurrencyContext'
import { PRICE_TAG_DARK } from './pdpUtils'
import type { PriceInfo } from './types'

interface PriceBlockProps {
  info: PriceInfo
  size?: 'md' | 'lg'
}

/** Amazon-style price: red -NN%, large price (small symbol/decimals), "List price:" struck through. */
export default function PriceBlock({ info, size = 'lg' }: PriceBlockProps) {
  const { formatDisplayPrice } = useCurrency()
  if (info.price <= 0) return null
  const isRange = info.maxPrice !== null

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2">
        {info.discountPct > 0 ? (
          <span className={`font-medium text-red-600 dark:text-red-400 ${size === 'lg' ? 'text-2xl' : 'text-lg'}`}>
            -{info.discountPct}%
          </span>
        ) : null}
        <PriceTag price={info.price} formatPrice={formatDisplayPrice} size={size} className={PRICE_TAG_DARK} />
        {isRange ? (
          <>
            <span className="text-zinc-500 dark:text-zinc-400" aria-hidden>
              –
            </span>
            <PriceTag
              price={info.maxPrice as number}
              formatPrice={formatDisplayPrice}
              size={size}
              className={PRICE_TAG_DARK}
            />
          </>
        ) : null}
      </div>
      {info.listPrice !== null && !isRange ? (
        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
          List price: <s className="text-zinc-500 dark:text-zinc-400">{formatDisplayPrice(info.listPrice)}</s>
        </p>
      ) : null}
    </div>
  )
}
