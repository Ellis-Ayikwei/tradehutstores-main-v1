'use client'

import { useCallback, useEffect, useRef } from 'react'
import { PriceTag } from '@/components/common/marketplace'
import { useCurrency } from '@/contexts/CurrencyContext'
import PdpImage from './PdpImage'
import { PRICE_TAG_DARK } from './pdpUtils'
import type { PdpProduct, PdpVariant } from './types'
import { isOptionAvailable, type AxisModel, type AxisOption, type VariantAxis } from './variantAxes'
import { flatVariantHeading, flatVariantLabels, isVariantInStock, variantSwatch, type VariantSwatch } from './variantUtils'

interface VariantSelectorProps {
  product: PdpProduct
  mode: 'axes' | 'flat' | 'none'
  axisModel: AxisModel
  /** More than one variant that really differs. */
  hasChoice: boolean
  selections: Record<string, string>
  selectedVariant: PdpVariant | null
  onSelectAxis: (axisKey: string, value: string) => void
  onSelectVariant: (variant: PdpVariant) => void
  /** Desktop hover preview of a tile's picture in the main stage (null = restore). */
  onPreviewImage?: (src: string | null) => void
  discountPct: number
}

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-1 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-zinc-900'

const CHIP_BASE = `inline-flex min-h-[44px] sm:min-h-[40px] items-center gap-2 rounded-md px-3 py-1.5 text-sm ${FOCUS}`

/** Solid 1px diagonal bar (no gradient) marking an unavailable option. */
const STRIKE =
  'overflow-hidden after:pointer-events-none after:absolute after:left-1/2 after:top-1/2 after:h-px after:w-[145%] after:-translate-x-1/2 after:-translate-y-1/2 after:-rotate-45 after:bg-zinc-600 dark:after:bg-zinc-300'

function chipState(selected: boolean, available: boolean): string {
  if (!available) return 'border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 cursor-not-allowed dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400'
  if (selected) return 'border-2 border-primary-700 bg-primary-50 font-medium text-zinc-900 dark:border-primary-400 dark:bg-zinc-800 dark:text-zinc-100'
  return 'border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-400'
}

function tileState(selected: boolean, available: boolean): string {
  if (!available) return 'border border-dashed border-zinc-400 dark:border-zinc-500 cursor-not-allowed'
  if (selected) return 'border-2 border-primary-700 dark:border-primary-400'
  return 'border border-zinc-300 hover:border-zinc-500 dark:border-zinc-600 dark:hover:border-zinc-400'
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

function optionPicture(option: AxisOption): string | null {
  return option.image ?? (option.swatch?.kind === 'image' ? option.swatch.src : null)
}

/** Tile face: the variant's own picture, else the attribute value's picture, else a colour dot, else the text. */
function TileFace({ option, unavailable }: { option: AxisOption; unavailable: boolean }) {
  const src = optionPicture(option)
  const gray = unavailable ? 'grayscale' : ''
  if (src) return <PdpImage src={src} alt="" sizes="(min-width: 640px) 56px, 48px" className={`object-cover ${gray}`} />
  if (option.swatch?.kind === 'color') {
    return (
      <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
        <span
          className={`h-7 w-7 rounded-full border border-zinc-300 dark:border-zinc-500 ${gray}`}
          style={{ backgroundColor: option.swatch.value }}
        />
      </span>
    )
  }
  return (
    <span
      className="absolute inset-0 flex items-center justify-center break-words px-0.5 text-center text-[11px] font-medium leading-tight text-zinc-800 dark:text-zinc-200"
      aria-hidden
    >
      {option.value}
    </span>
  )
}

const TILE_BASE = `relative block h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-50 dark:bg-zinc-800 sm:h-14 sm:w-14 ${FOCUS}`

/** Only a precise hover pointer previews; touch taps never do. */
function canHover(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

interface AxisRowProps {
  axis: VariantAxis
  index: number
  model: AxisModel
  variants: PdpVariant[]
  selections: Record<string, string>
  onSelectAxis: (axisKey: string, value: string) => void
  onPreviewImage?: (src: string | null) => void
}

function AxisRow({ axis, index, model, variants, selections, onSelectAxis, onPreviewImage }: AxisRowProps) {
  const selected = selections[axis.key]
  const single = axis.options.length === 1
  const preview = useCallback(
    (src: string | null) => {
      if (onPreviewImage && canHover()) onPreviewImage(src)
    },
    [onPreviewImage]
  )
  return (
    <div>
      <p className="mb-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        {selected ? (
          <>
            {axis.name}: <span className="font-bold text-zinc-900 dark:text-zinc-100">{selected}</span>
          </>
        ) : (
          <span className="font-medium text-red-600 dark:text-red-400">Select {axis.name}</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={axis.name}>
        {axis.options.map(opt => {
          const isSelected = selected === opt.value
          if (single) {
            // Amazon shows a lone option as the selected, non-clickable choice.
            return axis.tiles ? (
              <span
                key={opt.value}
                role="img"
                aria-label={`${axis.name}: ${opt.value}`}
                className={`${TILE_BASE} border-2 border-primary-700 dark:border-primary-400`}
              >
                <TileFace option={opt} unavailable={false} />
              </span>
            ) : (
              <span
                key={opt.value}
                className="inline-flex min-h-[40px] min-w-[44px] max-w-full items-center justify-center break-words rounded-md border-2 border-primary-700 bg-primary-50 px-3 py-1.5 text-center text-sm font-medium text-zinc-900 dark:border-primary-400 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {opt.value}
              </span>
            )
          }
          const available = isOptionAvailable(model, variants, selections, index, opt.value)
          const onClick = () => {
            if (!available || isSelected) return
            preview(null)
            onSelectAxis(axis.key, opt.value)
          }
          return axis.tiles ? (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isSelected}
              aria-disabled={!available}
              aria-label={`${axis.name}: ${opt.value}`}
              title={opt.value}
              onClick={onClick}
              onMouseEnter={() => {
                if (available) preview(optionPicture(opt))
              }}
              onMouseLeave={() => preview(null)}
              className={`${TILE_BASE} ${tileState(isSelected, available)} ${available ? '' : STRIKE}`}
            >
              <TileFace option={opt} unavailable={!available} />
              {!available ? <span className="sr-only"> (unavailable)</span> : null}
            </button>
          ) : (
            <button
              key={opt.value}
              type="button"
              aria-pressed={isSelected}
              aria-disabled={!available}
              title={opt.value}
              onClick={onClick}
              className={`relative min-w-[44px] max-w-full justify-center break-words text-center ${CHIP_BASE} ${chipState(isSelected, available)} ${available ? '' : STRIKE}`}
            >
              {opt.value}
              {!available ? <span className="sr-only"> (unavailable)</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function VariantSelector({
  product,
  mode,
  axisModel,
  hasChoice,
  selections,
  selectedVariant,
  onSelectAxis,
  onSelectVariant,
  onPreviewImage,
  discountPct,
}: VariantSelectorProps) {
  const { formatDisplayPrice } = useCurrency()
  const variants = product.variants

  // Never leave a hover preview behind when the selector unmounts.
  const previewRef = useRef(onPreviewImage)
  previewRef.current = onPreviewImage
  useEffect(() => () => previewRef.current?.(null), [])

  if (mode === 'none') return null

  if (mode === 'axes') {
    return (
      <div id="pdp-variants" className="scroll-mt-28 space-y-3">
        {axisModel.axes.map((axis, i) => (
          <AxisRow
            key={axis.key}
            axis={axis}
            index={i}
            model={axisModel}
            variants={variants}
            selections={selections}
            onSelectAxis={onSelectAxis}
            onPreviewImage={onPreviewImage}
          />
        ))}
      </div>
    )
  }

  if (!hasChoice) return null

  const labels = flatVariantLabels(variants)
  const heading = flatVariantHeading(variants)
  const finalPrice = (v: PdpVariant) => {
    const base = Number(v.price) || 0
    return discountPct > 0 ? Math.round(base * (1 - discountPct / 100) * 100) / 100 : base
  }
  const pricesDiffer = new Set(variants.map(finalPrice)).size > 1
  const quantitiesDiffer = new Set(variants.map(v => v.quantity)).size > 1
  const selectedLabel = selectedVariant ? labels[selectedVariant.id] : null

  return (
    <div id="pdp-variants" className="scroll-mt-28">
      <p className="mb-1.5 text-sm text-zinc-600 dark:text-zinc-400">
        {selectedLabel ? (
          <>
            {heading}: <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedLabel}</span>
          </>
        ) : (
          <span className="font-medium text-red-600 dark:text-red-400">Select {heading}</span>
        )}
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={heading}>
        {variants.map(v => {
          const selected = selectedVariant?.id === v.id
          const available = isVariantInStock(v)
          const swatch = variantSwatch(v)
          const label = labels[v.id]
          const hint = !available
            ? quantitiesDiffer
              ? 'Out of stock'
              : null
            : v.quantity != null && v.quantity <= 5 && quantitiesDiffer
              ? `Only ${v.quantity} left`
              : null
          const showHintRow = pricesDiffer || hint !== null
          return (
            <button
              key={v.id}
              type="button"
              aria-disabled={!available}
              aria-pressed={selected}
              onClick={() => {
                if (available && !selected) onSelectVariant(v)
              }}
              className={`${CHIP_BASE} max-w-full text-left ${chipState(selected, available)}`}
              title={label}
            >
              {v.primary_image ? (
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-zinc-50 dark:bg-zinc-800">
                  <PdpImage src={v.primary_image} alt="" sizes="32px" className="object-contain" />
                </span>
              ) : swatch ? (
                <SwatchDot swatch={swatch} />
              ) : null}
              <span className="min-w-0">
                <span className="block truncate">{label}</span>
                {showHintRow ? (
                  <span className="block text-xs text-zinc-600 dark:text-zinc-400">
                    {pricesDiffer ? (
                      <PriceTag price={finalPrice(v)} formatPrice={formatDisplayPrice} size="sm" className={PRICE_TAG_DARK} />
                    ) : null}
                    {pricesDiffer && hint ? ' · ' : null}
                    {hint}
                  </span>
                ) : null}
              </span>
              {!available && !hint ? <span className="sr-only"> (out of stock)</span> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
