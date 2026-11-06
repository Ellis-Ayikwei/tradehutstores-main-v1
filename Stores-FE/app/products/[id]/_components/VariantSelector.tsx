'use client'

import { Package } from 'lucide-react'
import { PriceTag } from '@/components/common/marketplace'
import { useCurrency } from '@/contexts/CurrencyContext'
import PdpImage from './PdpImage'
import { PRICE_TAG_DARK } from './pdpUtils'
import type { PdpProduct, PdpVariant } from './types'
import {
  findAttrValueForOption,
  findVariantsMatching,
  humanizeAxisName,
  isVariantInStock,
  optionsForAxis,
  swatchFromAttrValue,
  variantAttributeSummary,
  variantSwatch,
  type VariantSwatch,
} from './variantUtils'

interface VariantSelectorProps {
  product: PdpProduct
  useAxisPicker: boolean
  themeAxes: string[] | null
  selections: Record<string, string>
  selectedVariant: PdpVariant | null
  onSelectAxis: (axis: string, value: string) => void
  onSelectVariant: (variant: PdpVariant | null) => void
  discountPct: number
}

const CHIP_BASE =
  'inline-flex min-h-[40px] items-center gap-2 rounded-md px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-1 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950'

function chipState(selected: boolean, available: boolean): string {
  if (!available) return 'border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400'
  if (selected) return 'border-2 border-primary-700 bg-primary-50 font-medium text-zinc-900 dark:border-primary-400 dark:bg-zinc-800 dark:text-zinc-100'
  return 'border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-400'
}

function SwatchDot({ swatch, size = 24 }: { swatch: VariantSwatch | null; size?: number }) {
  if (!swatch) return null
  const style = { width: size, height: size }
  if (swatch.kind === 'color') {
    return (
      <span
        className="shrink-0 rounded-full border border-zinc-300 dark:border-zinc-500"
        style={{ ...style, backgroundColor: swatch.value }}
        aria-hidden
      />
    )
  }
  return (
    <span className="relative shrink-0 overflow-hidden rounded-full border border-zinc-300 dark:border-zinc-500" style={style} aria-hidden>
      <PdpImage src={swatch.src} alt="" sizes={`${size}px`} className="object-cover" />
    </span>
  )
}

export default function VariantSelector({
  product,
  useAxisPicker,
  themeAxes,
  selections,
  selectedVariant,
  onSelectAxis,
  onSelectVariant,
  discountPct,
}: VariantSelectorProps) {
  const { formatDisplayPrice } = useCurrency()
  const variants = product.variants
  if (variants.length === 0) return null

  if (useAxisPicker && themeAxes) {
    return (
      <div id="pdp-variants" className="scroll-mt-40 space-y-3">
        {themeAxes.map(axis => {
          const options = optionsForAxis(variants, axis)
          const others = { ...selections }
          delete others[axis]
          return (
            <div key={axis}>
              <p className="mb-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{humanizeAxisName(axis)}:</span>{' '}
                {selections[axis] ?? <span className="text-zinc-500 dark:text-zinc-400">Select</span>}
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={humanizeAxisName(axis)}>
                {options.map(opt => {
                  const selected = selections[axis] === opt
                  const matches = findVariantsMatching(variants, { ...others, [axis]: opt })
                  const available = selected || matches.some(isVariantInStock)
                  const swatch = (() => {
                    const av = findAttrValueForOption(variants, axis, opt)
                    return av ? swatchFromAttrValue(av) : null
                  })()
                  return (
                    <button
                      key={opt}
                      type="button"
                      disabled={!available}
                      aria-pressed={selected}
                      onClick={() => onSelectAxis(axis, opt)}
                      className={`${CHIP_BASE} ${chipState(selected, available)}`}
                    >
                      <SwatchDot swatch={swatch} />
                      <span>{opt}</span>
                      {!available ? <span className="sr-only"> (unavailable)</span> : null}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div id="pdp-variants" className="scroll-mt-40">
      <p className="mb-1.5 text-sm text-zinc-700 dark:text-zinc-300">
        <span className="font-semibold text-zinc-900 dark:text-zinc-100">Option:</span>{' '}
        {selectedVariant ? selectedVariant.name : <span className="text-zinc-500 dark:text-zinc-400">Select</span>}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Options">
        {variants.map(v => {
          const selected = selectedVariant?.id === v.id
          const available = isVariantInStock(v)
          const swatch = variantSwatch(v)
          const attrLine = variantAttributeSummary(v)
          const base = Number(v.price) || 0
          const current = discountPct > 0 ? Math.round(base * (1 - discountPct / 100) * 100) / 100 : base
          return (
            <button
              key={v.id}
              type="button"
              disabled={!available}
              aria-pressed={selected}
              onClick={() => onSelectVariant(selected ? null : v)}
              className={`${CHIP_BASE} max-w-full text-left ${chipState(selected, available)}`}
              title={attrLine || v.name}
            >
              {v.primary_image ? (
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-zinc-50 dark:bg-zinc-800">
                  <PdpImage src={v.primary_image} alt="" sizes="32px" className="object-contain" />
                </span>
              ) : swatch ? (
                <SwatchDot swatch={swatch} />
              ) : (
                <Package className="h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" aria-hidden />
              )}
              <span className="min-w-0">
                <span className="block truncate">{v.name}</span>
                <span className="block text-xs text-zinc-600 dark:text-zinc-400">
                  <PriceTag price={current} formatPrice={formatDisplayPrice} size="sm" className={PRICE_TAG_DARK} />
                </span>
              </span>
              {!available ? <span className="sr-only"> (out of stock)</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
