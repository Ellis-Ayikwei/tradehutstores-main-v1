'use client'

import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { addToCart } from '@/store/cartSlice'
import { addToWishlist, removeFromWishlist } from '@/store/wishListSlice'
import axiosInstance from '@/lib/axiosInstance'
import MainLayout from '@/components/Layouts/MainLayout'
import ProductCard from '@/components/Products/ProductCard'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShoppingCart,
  Heart,
  Truck,
  ShieldCheck,
  RotateCcw,
  Star,
  Check,
  Home,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Share2,
  Package,
  BadgeCheck,
  Zap,
  Gavel,
  Tag,
  CreditCard,
  Eye,
  Camera,
  AlertCircle,
} from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { mapReviewFromApi } from '@/lib/reviewUtils'
import { AdSlot } from '@/components/Ads'
import { SellerPromosStrip } from '@/components/Promo'
import { wishlistItemProductId } from '@/lib/wishlistUtils'
import WriteReviewModal from '@/components/Products/WriteReviewModal'

// ─── helpers ───────────────────────────────────────────────────────────────

function normalizePrice(rawPrice: any) {
  const parsed = typeof rawPrice === 'string' ? parseFloat(rawPrice) : Number(rawPrice ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Accepts API image rows (`{ image }`), strings, or `{ url }` — returns usable src. */
function resolveGalleryImageUrl(entry: unknown): string | null {
  if (entry == null) return null
  if (typeof entry === 'string') {
    const s = entry.trim()
    return s ? resolveMediaSrc(s) : null
  }
  if (typeof entry === 'object') {
    const o = entry as Record<string, unknown>
    for (const key of ['image', 'url', 'src']) {
      const v = o[key]
      if (typeof v === 'string' && v.trim()) return resolveMediaSrc(v.trim())
    }
  }
  return null
}

function toGalleryUrlList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    const u = resolveGalleryImageUrl(item)
    if (u) out.push(u)
  }
  return [...new Set(out)]
}

const EMPTY_GALLERY: string[] = []

type VariantAttributeValue = {
  id: string
  attribute?: string
  attribute_name?: string
  attribute_display_type?: string
  value_name?: string | null
  color_code?: string
  image?: string | null
}

function normalizeHex(code: string): string | null {
  const t = code.trim()
  if (!t) return null
  const hex = t.startsWith('#') ? t : `#${t}`
  return /^#[0-9a-f]{3,8}$/i.test(hex) ? hex : null
}

const NAMED_COLOR_HEX: Record<string, string> = {
  black: '#171717',
  white: '#fafafa',
  red: '#dc2626',
  blue: '#2563eb',
  green: '#16a34a',
  yellow: '#ca8a04',
  orange: '#ea580c',
  purple: '#9333ea',
  pink: '#db2777',
  gray: '#6b7280',
  grey: '#6b7280',
  brown: '#78350f',
  navy: '#172554',
  teal: '#0d9488',
  beige: '#d6c4a8',
  gold: '#ca8a04',
  silver: '#9ca3af',
  ivory: '#fffff0',
  maroon: '#7f1d1d',
  charcoal: '#374151',
}

function namedColorToHex(name: string): string | null {
  return NAMED_COLOR_HEX[name.trim().toLowerCase()] ?? null
}

type VariantSwatch = { kind: 'color'; value: string } | { kind: 'image'; src: string }

function variantSwatch(variant: { attribute_values?: VariantAttributeValue[] }): VariantSwatch | null {
  const attrs = [...(variant.attribute_values ?? [])].sort((a, b) =>
    (a.attribute_name ?? '').localeCompare(b.attribute_name ?? '')
  )
  for (const a of attrs) {
    const s = swatchFromAttrValue(a)
    if (s) return s
  }
  return null
}

function variantAttributeSummary(variant: { attribute_values?: VariantAttributeValue[] }): string {
  const attrs = [...(variant.attribute_values ?? [])].sort((a, b) =>
    (a.attribute_name ?? '').localeCompare(b.attribute_name ?? '')
  )
  const parts: string[] = []
  for (const a of attrs) {
    const label = (a.attribute_name ?? 'Option').trim()
    const val = a.value_name?.trim()
    if (!val) continue
    parts.push(`${label}: ${val}`)
  }
  return parts.join(' · ')
}

function formatVariationThemeLabel(theme: string | undefined): string {
  if (!theme || theme === 'single' || theme === 'custom') return 'Select variant'
  const t = theme.trim().toLowerCase()
  if (t === 'all') return 'All variants'
  return theme
    .split('-')
    .filter(Boolean)
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' · ')
}

/** Axes in selection order; `null` → flat list mode (`all`, `single`, `custom`, or unknown). */
function parseVariationThemeAxes(theme: string | undefined): string[] | null {
  const t = (theme ?? '').trim().toLowerCase()
  if (!t || t === 'single' || t === 'custom' || t === 'all') return null
  const parts = t.split('-').map(s => s.trim()).filter(Boolean)
  return parts.length > 0 ? parts : null
}

function variantAttrMap(variant: { attribute_values?: VariantAttributeValue[] }): Record<string, string> {
  const m: Record<string, string> = {}
  for (const av of variant.attribute_values ?? []) {
    const key = (av.attribute_name ?? '').toLowerCase().trim()
    if (!key) continue
    const val = av.value_name?.trim()
    if (val) m[key] = val
  }
  return m
}

function variantsMatchThemeAxes(variants: any[], axes: string[]): boolean {
  if (!variants.length || !axes.length) return false
  for (const v of variants) {
    const m = variantAttrMap(v)
    for (const ax of axes) {
      if (!m[ax]) return false
    }
  }
  return true
}

function optionsForAxis(
  variants: any[],
  axisKey: string,
  priorSelections: Record<string, string>
): string[] {
  const key = axisKey.toLowerCase()
  const filtered = variants.filter(v => {
    const m = variantAttrMap(v)
    for (const [k, val] of Object.entries(priorSelections)) {
      if ((m[k.toLowerCase()] ?? '') !== val) return false
    }
    return true
  })
  const set = new Set<string>()
  for (const v of filtered) {
    const val = variantAttrMap(v)[key]
    if (val) set.add(val)
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

function findVariantForAxisSelections(
  variants: any[],
  axes: string[],
  selections: Record<string, string>
): any | null {
  for (const v of variants) {
    const m = variantAttrMap(v)
    let ok = true
    for (const ax of axes) {
      if ((m[ax] ?? '') !== (selections[ax] ?? '')) {
        ok = false
        break
      }
    }
    if (ok) return v
  }
  return null
}

/** Variants whose attributes contain every key in *partial* (e.g. size+color, or full theme). */
function findVariantsMatchingPartial(variants: any[], partial: Record<string, string>): any[] {
  const entries = Object.entries(partial).filter(([, v]) => v != null && String(v).trim() !== '')
  if (entries.length === 0) return []
  return variants.filter(v => {
    const m = variantAttrMap(v)
    for (const [k, val] of entries) {
      const kk = k.toLowerCase()
      if ((m[kk] ?? '') !== val) return false
    }
    return true
  })
}

function findAttrValueForOption(
  variants: any[],
  axisKey: string,
  optionValue: string,
  priorSelections: Record<string, string>
): VariantAttributeValue | undefined {
  const key = axisKey.toLowerCase()
  for (const v of variants) {
    const m = variantAttrMap(v)
    let priorOk = true
    for (const [pk, val] of Object.entries(priorSelections)) {
      if ((m[pk.toLowerCase()] ?? '') !== val) {
        priorOk = false
        break
      }
    }
    if (!priorOk) continue
    if ((m[key] ?? '') !== optionValue) continue
    const attrs = (v.attribute_values ?? []) as VariantAttributeValue[]
    return attrs.find(
      a =>
        (a.attribute_name ?? '').toLowerCase().trim() === key &&
        (a.value_name ?? '').trim() === optionValue
    )
  }
  return undefined
}

function humanizeAxisName(axis: string): string {
  if (!axis) return ''
  return axis.charAt(0).toUpperCase() + axis.slice(1)
}

function swatchFromAttrValue(a: VariantAttributeValue): VariantSwatch | null {
  if (a.color_code) {
    const hex = normalizeHex(String(a.color_code))
    if (hex) return { kind: 'color', value: hex }
  }
  if (a.attribute_display_type === 'swatch' && a.value_name) {
    const hex = namedColorToHex(String(a.value_name))
    if (hex) return { kind: 'color', value: hex }
  }
  if (a.image) {
    const src = resolveMediaSrc(String(a.image))
    if (src) return { kind: 'image', src }
  }
  if (/color/i.test(String(a.attribute_name ?? '')) && a.value_name) {
    const hex = namedColorToHex(String(a.value_name))
    if (hex) return { kind: 'color', value: hex }
  }
  return null
}

function normalizeProduct(product: any, catalogMap: Record<string, any>, variants: any[] = [], images: any[] = []) {
  const catalogItem = catalogMap[String(product.id)] ?? {}
  const normalizedVariants = (variants ?? []).map((variant: any) => ({
    ...variant,
    id: String(variant.id),
    name: variant.name || variant.sku || `Variant ${variant.id}`,
    price: String(variant.price ?? '0'),
    attribute_values: Array.isArray(variant.attribute_values)
      ? variant.attribute_values.map((av: any) => ({
          ...av,
          id: String(av.id),
        }))
      : [],
  }))

  const imageUrls = (images ?? [])
    .map((image: any) => (image?.image != null ? resolveMediaSrc(String(image.image)) : ''))
    .filter(Boolean)

  const fallbackRaw = product.main_product_image || catalogItem.main_product_image
  const fallbackImage = fallbackRaw ? resolveMediaSrc(String(fallbackRaw)) : ''
  const mergedImages = imageUrls.length > 0 ? imageUrls : [fallbackImage].filter(Boolean)
  const resolvedPrice = normalizePrice(catalogItem.price ?? product.price ?? normalizedVariants[0]?.price)
  const resolvedFinalPrice = normalizePrice(
    catalogItem.final_price ??
      (product.discount_percentage > 0
        ? resolvedPrice * (1 - Number(product.discount_percentage) / 100)
        : resolvedPrice)
  )

  return {
    ...product,
    id: String(product.id),
    name: product.name || catalogItem.name || 'Unnamed Product',
    category: catalogItem.category ?? 'Uncategorized',
    sub_category: catalogItem.sub_category ?? '',
    brand: catalogItem.brand ?? 'Unknown',
    price: String(resolvedPrice),
    final_price: resolvedFinalPrice,
    discount_percentage: Number(product.discount_percentage ?? catalogItem.discount_percentage ?? 0),
    main_product_image: fallbackImage,
    images: mergedImages,
    variants: normalizedVariants,
    average_rating: product.average_rating ?? catalogItem.rating ?? 0,
    rating: Number(product.average_rating ?? catalogItem.rating ?? 0),
    total_reviews: Number(product.total_reviews ?? catalogItem.total_reviews ?? 0),
    inventory_level: Number(product.inventory_level ?? 0),
    key_features: product.key_features ?? [],
    reviews: product.reviews ?? [],
  }
}

// ─── Star rating display ────────────────────────────────────────────────────
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < Math.round(value)
              ? 'fill-amber-400 text-amber-400'
              : 'text-neutral-300 dark:text-neutral-600'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Tab definitions ─────────────────────────────────────────────────────────
const TAB_KEYS = ['description', 'specs', 'reviews', 'shipping'] as const
type TabKey = typeof TAB_KEYS[number]

const TAB_LABELS: Record<TabKey, string> = {
  description: 'Description',
  specs: 'Specifications',
  reviews: 'Reviews',
  shipping: 'Shipping & Returns',
}

/** Many pills: single row + horizontal scroll instead of wrapping. */
const OPTION_ROW_SCROLL =
  'overflow-x-auto overflow-y-visible -mx-1 px-1 pb-1.5 [scrollbar-width:thin]'
const OPTION_ROW_FLEX = 'flex flex-nowrap gap-2 w-max min-w-0'

/** Bordered variant cards in one horizontal strip (PDP picker). */
const VARIANT_CARD_SCROLL = `${OPTION_ROW_SCROLL} snap-x snap-mandatory scroll-pl-1`
const VARIANT_CARD_ROW = 'flex flex-nowrap items-stretch gap-3 md:gap-4 w-max min-w-0 pb-1'
const VARIANT_CARD_WIDTH = 'shrink-0 w-[232px] sm:w-[248px] snap-start snap-always'

/** Large screens: clickable chevrons to scroll horizontal option strips (thin scrollbars easy to miss). */
function HorizontalScrollLane({
  scrollClassName,
  trackClassName,
  children,
}: {
  scrollClassName: string
  trackClassName: string
  children: ReactNode
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const refreshEnds = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const maxScroll = Math.max(0, scrollWidth - clientWidth)
    if (maxScroll <= 6) {
      setCanLeft(false)
      setCanRight(false)
      return
    }
    setCanLeft(scrollLeft > 6)
    setCanRight(scrollLeft < maxScroll - 6)
  }, [])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    refreshEnds()
    const ro = new ResizeObserver(() => {
      refreshEnds()
    })
    ro.observe(el)
    const inner = el.firstElementChild instanceof HTMLElement ? el.firstElementChild : null
    if (inner) ro.observe(inner)
    const id = requestAnimationFrame(refreshEnds)
    return () => {
      cancelAnimationFrame(id)
      ro.disconnect()
    }
  }, [refreshEnds])

  const nudge = (dir: number) => {
    const el = scrollRef.current
    if (!el) return
    const step = Math.max(140, Math.floor(el.clientWidth * 0.72))
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const chevronBtn =
    'pointer-events-auto hidden lg:flex absolute top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full border border-neutral-200/90 bg-white/95 text-neutral-700 shadow-md backdrop-blur-sm transition-colors hover:bg-white hover:text-orange-600 dark:border-neutral-600 dark:bg-neutral-900/95 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:hover:text-orange-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500'

  return (
    <div className="relative">
      <div ref={scrollRef} className={scrollClassName} onScroll={refreshEnds}>
        <div className={trackClassName}>{children}</div>
      </div>
      {canLeft ? (
        <button type="button" className={`${chevronBtn} left-1`} aria-label="Scroll left" onClick={() => nudge(-1)}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
      {canRight ? (
        <button type="button" className={`${chevronBtn} right-1`} aria-label="Scroll right" onClick={() => nudge(1)}>
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

/** ─── Grouped tail pills ─── */
function GroupedTailAxisPills({
  variants,
  themeAxes,
  axis0,
  axis1,
  groupAxis1Value,
  sel0,
  selections,
  fromIndex,
  onTailSelect,
}: {
  variants: any[]
  themeAxes: string[]
  axis0: string
  axis1: string
  groupAxis1Value: string
  sel0: string
  selections: Record<string, string>
  fromIndex: number
  onTailSelect: (groupAxis1Value: string, axisKey: string, value: string, axisIndex: number) => void
}) {
  const tail = themeAxes.slice(fromIndex)
  if (tail.length === 0) return null

  return (
    <div className="space-y-4 mt-3 pl-3 border-l-2 border-orange-200/80 dark:border-orange-800/80">
      {tail.map((axis, idx) => {
        const axisIndex = fromIndex + idx
        const prior: Record<string, string> = { [axis0]: sel0, [axis1]: groupAxis1Value }
        for (let j = fromIndex; j < axisIndex; j++) {
          const k = themeAxes[j]
          if (selections[axis1] === groupAxis1Value && selections[k]) {
            prior[k] = selections[k]
          }
        }
        const prevTailComplete =
          axisIndex === fromIndex ||
          themeAxes.slice(fromIndex, axisIndex).every(ax => {
            if (selections[axis1] !== groupAxis1Value) return false
            return Boolean(selections[ax])
          })
        if (!prevTailComplete) {
          return (
            <div key={axis}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-500 mb-2">
                {humanizeAxisName(axis)}
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Select {humanizeAxisName(themeAxes[axisIndex - 1])} above first.
              </p>
            </div>
          )
        }
        const opts = optionsForAxis(variants, axis, prior)
        return (
          <div key={axis} className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
              {humanizeAxisName(axis)}
            </p>
            {opts.length === 0 ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">No options.</p>
            ) : (
              <HorizontalScrollLane scrollClassName={OPTION_ROW_SCROLL} trackClassName={OPTION_ROW_FLEX}>
                  {opts.map(opt => {
                    const selected =
                      selections[axis1] === groupAxis1Value && selections[axis] === opt
                    const av = findAttrValueForOption(variants, axis, opt, prior)
                    const sw = av ? swatchFromAttrValue(av) : null
                    return (
                      <button
                        key={`${groupAxis1Value}-${axis}-${opt}`}
                        type="button"
                        onClick={() => onTailSelect(groupAxis1Value, axis, opt, axisIndex)}
                        className={`inline-flex shrink-0 items-center gap-2 min-h-[40px] px-3 py-2 rounded-full border-2 text-left text-sm font-bold transition-all active:scale-[0.98] ${
                        selected
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-neutral-900 dark:text-neutral-100 ring-2 ring-orange-500/20'
                          : 'border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-orange-300 dark:hover:border-orange-600'
                      }`}
                    >
                      {sw?.kind === 'color' ? (
                        <span
                          className="w-6 h-6 rounded-full border border-neutral-300 dark:border-neutral-500 shrink-0 shadow-inner"
                          style={{ backgroundColor: sw.value }}
                          aria-hidden
                        />
                      ) : sw?.kind === 'image' ? (
                        <img
                          src={sw.src}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover border border-neutral-200 dark:border-neutral-600 shrink-0"
                        />
                      ) : null}
                      {opt}
                    </button>
                  )
                })}
              </HorizontalScrollLane>
            )}
          </div>
        )
      })}
    </div>
  )
}

function VariantBranchSummary({
  variant,
  formatDisplayPrice,
}: {
  variant: any
  formatDisplayPrice: (n: number) => string
}) {
  const price = parseFloat(String(variant.price ?? 0))
  const qty = variant.quantity
  const inStock = qty == null || Number(qty) > 0
  const imgRaw = variant.primary_image ?? variant.primaryImage
  const imgSrc =
    typeof imgRaw === 'string' && imgRaw.trim() ? resolveMediaSrc(imgRaw.trim()) : null

  return (
    <div className="mt-3 pt-3 border-t border-neutral-200/90 dark:border-neutral-600/90 space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
        This variant
      </p>
      <div className={`flex gap-3 ${imgSrc ? 'items-start' : ''}`}>
        {imgSrc ? (
          <div className="relative w-[4.5rem] h-[4.5rem] sm:w-24 sm:h-24 shrink-0 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800 shadow-inner">
            <img
              src={imgSrc}
              alt={variant.name ? String(variant.name) : 'Variant'}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="font-mono text-base font-bold text-primary">{formatDisplayPrice(price)}</p>
          {variant.name ? (
            <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 font-medium">
              {variant.name}
            </p>
          ) : null}
          {variant.sku ? (
            <p className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">SKU: {variant.sku}</p>
          ) : null}
          {qty != null && String(qty).trim() !== '' && (
            <p
              className={`text-[11px] font-semibold ${inStock ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
            >
              {inStock ? `${qty} in stock` : 'Out of stock'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/** Multiple SKUs can share the same visible facet slice; pin one concrete row for PDP price/stock/SKU display (deterministic). */
function primaryVariantForFacetMatches(matches: any[]): any | null {
  if (!matches?.length) return null
  if (matches.length === 1) return matches[0]
  const sorted = [...matches].sort((a, b) => {
    const pa = normalizePrice(a.price)
    const pb = normalizePrice(b.price)
    if (pa !== pb) return pa - pb
    const sa = String(a.sku ?? a.id ?? '')
    const sb = String(b.sku ?? b.id ?? '')
    return sa.localeCompare(sb, undefined, { sensitivity: 'base' })
  })
  return sorted[0] ?? null
}

/** Always show one exact variant summary; when several match, lowest-priced SKU is shown with a brief note — no synthesized price bands. */
function VariantMatchSummary({
  matches,
  formatDisplayPrice,
}: {
  matches: any[]
  formatDisplayPrice: (n: number) => string
}) {
  const display = primaryVariantForFacetMatches(matches)
  if (!display) return null
  return (
    <>
      <VariantBranchSummary variant={display} formatDisplayPrice={formatDisplayPrice} />
      {matches.length > 1 ? (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 leading-snug">
          Preview uses one ranked match (same facets: lowest price, then SKU) when rows overlap — tighten options above where available so checkout resolves to a single variant.
        </p>
      ) : null}
    </>
  )
}

/**
 * Structured variant UI from `variation_theme`:
 * – 1 axis: bordered option cards + Select + VariantBranchSummary (same pattern as secondary axis rows).
 * – 2+ axes: scrolling pills for axis 0; axis 1+ as cards / tail pills under each branch.
 */
function StructuredVariantPicker({
  variants,
  themeAxes,
  selections,
  onAxisSelect,
  onTailSelect,
  formatDisplayPrice,
}: {
  variants: any[]
  themeAxes: string[]
  selections: Record<string, string>
  onAxisSelect: (axisKey: string, value: string, axisIndex: number) => void
  onTailSelect: (groupAxis1Value: string, axisKey: string, value: string, axisIndex: number) => void
  formatDisplayPrice: (n: number) => string
}) {
  /** One variation axis → same card + summary pattern as axis1 in multi-axis mode (not pill strip only). */
  if (themeAxes.length === 1) {
    const axis0 = themeAxes[0]
    const opts0 = optionsForAxis(variants, axis0, {})
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
            {humanizeAxisName(axis0)}
          </h4>
          {opts0.length === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">No options for this combination.</p>
          ) : (
            <HorizontalScrollLane scrollClassName={VARIANT_CARD_SCROLL} trackClassName={VARIANT_CARD_ROW}>
                {opts0.map(opt => {
                const av = findAttrValueForOption(variants, axis0, opt, {})
                const sw = av ? swatchFromAttrValue(av) : null
                const groupComplete = selections[axis0] === opt
                const partialSel: Record<string, string> = { [axis0]: opt }
                const branchMatches = findVariantsMatchingPartial(variants, partialSel)

                return (
                  <div
                    key={`${axis0}-${opt}`}
                    className={`rounded-xl border-2 p-4 transition-colors h-full flex flex-col ${VARIANT_CARD_WIDTH} ${
                      groupComplete
                        ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {sw?.kind === 'color' ? (
                        <span
                          className="w-9 h-9 rounded-full border-2 border-neutral-300 dark:border-neutral-500 shrink-0 shadow-inner"
                          style={{ backgroundColor: sw.value }}
                          aria-hidden
                        />
                      ) : sw?.kind === 'image' ? (
                        <img
                          src={sw.src}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border-2 border-neutral-200 dark:border-neutral-600 shrink-0"
                        />
                      ) : (
                        <span className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{opt}</p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {groupComplete
                            ? 'Selected'
                            : `Choose this ${humanizeAxisName(axis0).toLowerCase()}`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAxisSelect(axis0, opt, 0)}
                        className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border-2 transition-all active:scale-[0.98] ${
                          groupComplete
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-neutral-300 dark:border-neutral-600 hover:border-orange-400'
                        }`}
                      >
                        {groupComplete ? '✓' : 'Select'}
                      </button>
                    </div>

                    {branchMatches.length > 0 ? (
                      <VariantMatchSummary matches={branchMatches} formatDisplayPrice={formatDisplayPrice} />
                    ) : null}
                  </div>
                )
              })}
            </HorizontalScrollLane>
          )}
        </div>
      </div>
    )
  }

  if (themeAxes.length < 2) {
    return null
  }

  const axis0 = themeAxes[0]
  const axis1 = themeAxes[1]
  const tailAxes = themeAxes.slice(2)
  const sel0 = selections[axis0] ?? ''

  const opts0 = optionsForAxis(variants, axis0, {})
  const opts1 = sel0 ? optionsForAxis(variants, axis1, { [axis0]: sel0 }) : []

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
          {humanizeAxisName(axis0)}
        </h4>
        <HorizontalScrollLane scrollClassName={OPTION_ROW_SCROLL} trackClassName={OPTION_ROW_FLEX}>
            {opts0.map(opt => {
              const selected = selections[axis0] === opt
              const av = findAttrValueForOption(variants, axis0, opt, {})
              const sw = av ? swatchFromAttrValue(av) : null
              return (
                <button
                  key={`${axis0}-${opt}`}
                  type="button"
                  onClick={() => onAxisSelect(axis0, opt, 0)}
                  className={`inline-flex shrink-0 items-center gap-2 min-h-[44px] px-3 py-2 rounded-full border-2 text-sm font-bold transition-all active:scale-[0.98] ${
                    selected
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-2 ring-orange-500/25'
                      : 'border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 hover:border-orange-300 dark:hover:border-orange-600'
                  }`}
                >
                  {sw?.kind === 'color' ? (
                    <span
                      className="w-7 h-7 rounded-full border border-neutral-300 dark:border-neutral-500 shrink-0 shadow-inner"
                      style={{ backgroundColor: sw.value }}
                      aria-hidden
                    />
                  ) : sw?.kind === 'image' ? (
                    <img
                      src={sw.src}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border shrink-0"
                    />
                  ) : null}
                  {opt}
                </button>
              )
            })}
        </HorizontalScrollLane>
      </div>

      {!sel0 ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Select {humanizeAxisName(axis0)} to see {humanizeAxisName(axis1)} options.
        </p>
      ) : (
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
            {humanizeAxisName(axis1)}
          </h4>
          {opts1.length === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">No options for this combination.</p>
          ) : (
            <HorizontalScrollLane scrollClassName={VARIANT_CARD_SCROLL} trackClassName={VARIANT_CARD_ROW}>
              {opts1.map(opt1 => {
                const av1 = findAttrValueForOption(variants, axis1, opt1, { [axis0]: sel0 })
                const sw1 = av1 ? swatchFromAttrValue(av1) : null
                const twoAxisOnly = tailAxes.length === 0
                const groupComplete =
                  twoAxisOnly && selections[axis0] === sel0 && selections[axis1] === opt1

                const partialSel: Record<string, string> = { [axis0]: sel0, [axis1]: opt1 }
                for (const ax of tailAxes) {
                  if (selections[axis1] === opt1 && selections[ax]) {
                    partialSel[ax] = selections[ax]
                  }
                }
                const branchMatches = findVariantsMatchingPartial(variants, partialSel)

                return (
                  <div
                    key={opt1}
                    className={`rounded-xl border-2 p-4 transition-colors h-full flex flex-col ${VARIANT_CARD_WIDTH} ${
                      groupComplete
                        ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {sw1?.kind === 'color' ? (
                        <span
                          className="w-9 h-9 rounded-full border-2 border-neutral-300 dark:border-neutral-500 shrink-0 shadow-inner"
                          style={{ backgroundColor: sw1.value }}
                          aria-hidden
                        />
                      ) : sw1?.kind === 'image' ? (
                        <img
                          src={sw1.src}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border-2 border-neutral-200 dark:border-neutral-600 shrink-0"
                        />
                      ) : (
                        <span className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{opt1}</p>
                        {twoAxisOnly && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {groupComplete ? 'Selected' : `Choose this ${humanizeAxisName(axis1).toLowerCase()}`}
                          </p>
                        )}
                      </div>
                      {twoAxisOnly && (
                        <button
                          type="button"
                          onClick={() => onAxisSelect(axis1, opt1, 1)}
                          className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border-2 transition-all active:scale-[0.98] ${
                            groupComplete
                              ? 'border-orange-500 bg-orange-500 text-white'
                              : 'border-neutral-300 dark:border-neutral-600 hover:border-orange-400'
                          }`}
                        >
                          {groupComplete ? '✓' : 'Select'}
                        </button>
                      )}
                    </div>

                    {tailAxes.length > 0 && (
                      <GroupedTailAxisPills
                        variants={variants}
                        themeAxes={themeAxes}
                        axis0={axis0}
                        axis1={axis1}
                        groupAxis1Value={opt1}
                        sel0={sel0}
                        selections={selections}
                        fromIndex={2}
                        onTailSelect={onTailSelect}
                      />
                    )}

                    {branchMatches.length > 0 ? (
                      <VariantMatchSummary matches={branchMatches} formatDisplayPrice={formatDisplayPrice} />
                    ) : null}
                  </div>
                )
              })}
            </HorizontalScrollLane>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page component ──────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const dispatch = useDispatch<AppDispatch>()
  const { formatDisplayPrice } = useCurrency()
  const { cart } = useSelector((state: RootState) => state.cart)
  const { wishlist } = useSelector((state: RootState) => state.wishlist)

  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('description')
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [productDetail, setProductDetail] = useState<any>(null)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)

  const themeAxes = useMemo(
    () => parseVariationThemeAxes(productDetail?.variation_theme),
    [productDetail?.variation_theme]
  )

  const useAxisPicker = useMemo(() => {
    const list = productDetail?.variants
    if (!themeAxes || !list?.length) return false
    return variantsMatchThemeAxes(list, themeAxes)
  }, [themeAxes, productDetail?.variants])

  const [axisSelections, setAxisSelections] = useState<Record<string, string>>({})

  const handleAxisSelect = useCallback(
    (axisKey: string, value: string, axisIndex: number) => {
      if (!themeAxes) return
      setAxisSelections(prev => {
        const next = { ...prev }
        for (let j = axisIndex + 1; j < themeAxes.length; j++) {
          delete next[themeAxes[j]]
        }
        next[axisKey] = value
        return next
      })
    },
    [themeAxes]
  )

  const handleGroupedTailSelect = useCallback(
    (groupAxis1Value: string, axisKey: string, value: string, axisIndex: number) => {
      if (!themeAxes || themeAxes.length < 2) return
      const axis0 = themeAxes[0]
      const axis1 = themeAxes[1]
      setAxisSelections(prev => {
        const sel0 = prev[axis0]
        if (!sel0) return prev
        const next = { ...prev }
        for (let j = axisIndex + 1; j < themeAxes.length; j++) {
          delete next[themeAxes[j]]
        }
        next[axis0] = sel0
        next[axis1] = groupAxis1Value
        next[axisKey] = value
        return next
      })
    },
    [themeAxes]
  )

  useEffect(() => {
    const fetchProductData = async () => {
      if (!id) {
        setIsLoading(false)
        setProductDetail(null)
        setRelatedProducts([])
        return
      }

      setIsLoading(true)
      setLoadError(null)

      try {
        const [productRes, variantsRes, imagesRes, relatedRes, catalogRes, reviewsRes] = await Promise.all([
          axiosInstance.get(`/products/${id}/`),
          axiosInstance.get(`/products/${id}/variants/`),
          axiosInstance.get(`/products/${id}/images/`),
          axiosInstance.get(`/products/${id}/related/`),
          axiosInstance.get('/products/catalog/'),
          axiosInstance.get(`reviews/?product=${id}`).catch(() => ({ data: [] })),
        ])

        const catalogItems = Array.isArray(catalogRes.data)
          ? catalogRes.data
          : (catalogRes.data?.results ?? [])
        const catalogMap = (catalogItems as any[]).reduce<Record<string, any>>((acc, item) => {
          if (item?.id != null) acc[String(item.id)] = item
          return acc
        }, {})

        const rawReviews = Array.isArray(reviewsRes.data)
          ? reviewsRes.data
          : (reviewsRes.data as any)?.results ?? []
        const mappedReviews = rawReviews.map(mapReviewFromApi)

        const normalizedProduct = {
          ...normalizeProduct(productRes.data, catalogMap, variantsRes.data, imagesRes.data),
          reviews: mappedReviews,
        }

        const normalizedRelated = (Array.isArray(relatedRes.data) ? relatedRes.data : [])
          .map((item: any) => normalizeProduct(item, catalogMap))
          .filter((item: any) => item?.id !== normalizedProduct.id)

        setProductDetail(normalizedProduct)
        setRelatedProducts(normalizedRelated)
      } catch {
        setProductDetail(null)
        setRelatedProducts([])
        setLoadError('Unable to load product details right now.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProductData()
  }, [id])

  useEffect(() => {
    setAxisSelections({})
    setSelectedVariant(null)
  }, [productDetail?.id])

  useEffect(() => {
    if (!productDetail || !useAxisPicker || !themeAxes?.length) return
    const complete = themeAxes.every(ax => Boolean(axisSelections[ax]))
    if (!complete) {
      setSelectedVariant(null)
      return
    }
    const v = findVariantForAxisSelections(productDetail.variants, themeAxes, axisSelections)
    setSelectedVariant(v)
  }, [productDetail, useAxisPicker, themeAxes, axisSelections])

  // ── wishlist sync (API returns `product` as PK or nested object) ──────────
  useEffect(() => {
    if (!productDetail?.id) return
    const pid = String(productDetail.id)
    setIsWishlisted(
      (wishlist.items ?? []).some((item: { product?: unknown }) => wishlistItemProductId(item) === pid)
    )
  }, [wishlist.items, productDetail?.id])

  // ── reset gallery selection when switching variant ─────────────────────────
  useEffect(() => {
    setSelectedImage(0)
  }, [selectedVariant?.id])

  const galleryImages = useMemo(() => {
    if (!productDetail) return EMPTY_GALLERY
    const raw =
      selectedVariant?.images?.length > 0
        ? selectedVariant.images
        : productDetail.images ||
          (productDetail.variants?.length > 0
            ? productDetail.variants[0]?.images
            : null) ||
          []
    const list = toGalleryUrlList(raw)
    const main = resolveGalleryImageUrl(productDetail.main_product_image)
    if (list.length > 0) return list
    return main ? [main] : []
  }, [productDetail, selectedVariant])

  useEffect(() => {
    setSelectedImage((i) => {
      const n = galleryImages.length
      if (n === 0) return 0
      return Math.min(i, n - 1)
    })
  }, [galleryImages])

  // ── toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
          <div className="text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-neutral-300 dark:border-neutral-600 border-t-orange-500 animate-spin" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading product details...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  // ── empty state ────────────────────────────────────────────────────────────
  if (!productDetail) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4">
          <div className="text-center space-y-6 max-w-sm">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
              <Package className="w-10 h-10 text-neutral-400 dark:text-neutral-500" />
            </div>
            <h2 className="font-syne text-2xl font-bold text-neutral-900 dark:text-neutral-100">Product Not Found</h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
              {loadError || "The product you're looking for doesn't exist or has been removed."}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg active:scale-95 transition-all"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  // ── derived values ─────────────────────────────────────────────────────────
  const price = normalizePrice(selectedVariant ? selectedVariant.price : productDetail.price)

  const discountPct = Number(productDetail.discount_percentage ?? 0)
  const finalPrice = selectedVariant
    ? normalizePrice(discountPct > 0 ? price * (1 - discountPct / 100) : price)
    : normalizePrice(
        productDetail.final_price != null && productDetail.final_price !== ''
          ? productDetail.final_price
          : price
      )

  const rating =
    typeof productDetail.average_rating === 'string'
      ? parseFloat(productDetail.average_rating)
      : productDetail.average_rating || 0

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (productDetail.variants?.length > 0 && !selectedVariant) {
      showToast('Please select a variant', 'error')
      return
    }
    dispatch(
      addToCart({
        cart_id: cart.id || undefined,
        product_id: productDetail.id,
        quantity,
        product_variant_id: selectedVariant?.id,
        product: productDetail,
        variant: selectedVariant,
      })
    )
      .unwrap()
      .then(() => showToast('Added to cart successfully!', 'success'))
      .catch(() => showToast('Failed to add to cart', 'error'))
  }

  const handleDirectCheckout = () => {
    if (productDetail.variants?.length > 0 && !selectedVariant) {
      showToast('Please select a variant', 'error')
      return
    }
    const q = new URLSearchParams({
      buyNow: '1',
      product: String(productDetail.id),
      qty: String(quantity),
    })
    if (selectedVariant?.id != null) q.set('variant', String(selectedVariant.id))
    router.push(`/checkout?${q.toString()}`)
  }

  const handleAddToWishlist = () => {
    if (!productDetail) return
    const pid = String(productDetail.id)
    const existing = (wishlist.items ?? []).find(
      (item: { id?: string; product?: unknown }) => wishlistItemProductId(item) === pid
    )
    if (existing) {
      dispatch(removeFromWishlist({ wishlistItemId: String(existing.id) }))
        .unwrap()
        .then(() => {
          showToast('Removed from wishlist', 'success')
          setIsWishlisted(false)
        })
        .catch(() => showToast('Could not update wishlist', 'error'))
      return
    }
    dispatch(addToWishlist({ product_id: pid }))
      .unwrap()
      .then(() => {
        showToast('Added to wishlist!', 'success')
        setIsWishlisted(true)
      })
      .catch(() => showToast('Failed to add to wishlist', 'error'))
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: productDetail.name, url: window.location.href })
    } else {
      navigator.clipboard?.writeText(window.location.href)
      showToast('Link copied to clipboard', 'success')
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-toast px-5 py-3 rounded-xl font-medium text-sm shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white dark:bg-emerald-700'
              : 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-4 md:py-8">

          {/* Product page ad placement — admin-managed; renders nothing if no live ad */}
          <div className="mb-4 md:mb-6">
            <AdSlot slug="product-page" aspectClass="aspect-[21/4] md:aspect-[21/3]" rounded="rounded-xl" />
          </div>

          {/* ── Breadcrumb ───────────────────────────────────────────────── */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 mb-6 md:mb-8 text-[10px] md:text-xs font-medium text-neutral-600 dark:text-neutral-400 uppercase tracking-widest overflow-x-auto whitespace-nowrap no-scrollbar"
          >
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <Home className="w-3 h-3" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <Link href="/products" className="hover:text-primary transition-colors">
              Products
            </Link>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <Link
              href={`/products?category=${productDetail.category}`}
              className="hover:text-primary transition-colors"
            >
              {productDetail.category}
            </Link>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <span className="text-neutral-900 dark:text-neutral-100 truncate max-w-[180px]">{productDetail.name}</span>
          </nav>

          {/* ── Hero: row on mobile/tablet (image | details), grid on lg+ ── */}
          <div className="flex flex-row gap-3 sm:gap-4 md:gap-6 items-start lg:grid lg:grid-cols-10 lg:gap-8 xl:gap-12">

            {/* ── LEFT: Gallery — mobile: main then thumb row; lg: thumb column | main (standard PDP) ── */}
            <div className="w-[38%] max-w-[240px] shrink-0 sticky top-[calc(env(safe-area-inset-top,0px)+5.5rem)] z-40 self-start lg:col-span-6 lg:w-auto lg:max-w-none bg-neutral-50/90 dark:bg-neutral-950/90 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none pb-1 lg:pb-0 rounded-lg lg:rounded-none">
              <div className="flex flex-col gap-3 sm:gap-4 md:gap-6 lg:flex-row lg:items-stretch lg:gap-4 w-full">
                {/* Thumbnails: second on mobile, left column on desktop */}
                <div
                  className="order-2 lg:order-1 flex flex-row lg:flex-col gap-2 sm:gap-3 flex-shrink-0 overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible lg:max-h-[min(75vh,36rem)] w-full lg:w-[4.75rem] pb-1 lg:pb-0 lg:pt-0.5 [scrollbar-width:thin]"
                  role="tablist"
                  aria-label="Product images"
                >
                  {galleryImages.map((imgUrl, index) => (
                    <button
                      type="button"
                      role="tab"
                      key={`${imgUrl}-${index}`}
                      aria-selected={selectedImage === index}
                      aria-label={`Show product image ${index + 1} of ${galleryImages.length}`}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 relative w-[4.25rem] h-[4.25rem] sm:w-20 sm:h-20 lg:w-[4.75rem] lg:h-[4.75rem] rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900/90 border border-neutral-200 dark:border-neutral-700 p-1.5 sm:p-2 hover:bg-neutral-200/80 dark:hover:bg-neutral-800 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 ${
                        selectedImage === index
                          ? 'ring-2 ring-orange-500 ring-offset-2 dark:ring-offset-neutral-950'
                          : 'ring-0'
                      }`}
                    >
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt=""
                          fill
                          className="object-contain"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-neutral-400 dark:text-neutral-500 m-auto" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Main image — first on mobile, right on desktop */}
                <div className="order-1 lg:order-2 flex-1 min-w-0 w-full">
                  <div className="relative aspect-square overflow-hidden rounded-lg sm:rounded-xl bg-white dark:bg-neutral-900 shadow-md dark:shadow-none dark:ring-1 dark:ring-neutral-800 group">
                    {galleryImages[selectedImage] ? (
                      <Image
                        src={galleryImages[selectedImage]}
                        alt={productDetail.name}
                        fill
                        className="object-contain p-2 sm:p-4 md:p-6 lg:p-8 transition-transform duration-700 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-900/90">
                        <Package className="w-20 h-20 text-neutral-400 dark:text-neutral-500" />
                      </div>
                    )}

                    {productDetail.discount_percentage > 0 && (
                      <span className="absolute top-4 left-4 px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded uppercase tracking-tight">
                        -{productDetail.discount_percentage}%
                      </span>
                    )}

                    {galleryImages.length > 0 && (
                      <span className="absolute bottom-4 right-4 px-2 py-1 bg-black/65 text-white text-[10px] font-bold rounded-full backdrop-blur-sm">
                        {selectedImage + 1} / {galleryImages.length}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleAddToWishlist}
                      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                      className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-full shadow-sm border border-neutral-200/80 dark:border-neutral-700 hover:text-primary active:scale-90 transition-all"
                    >
                      <Heart
                        className={`w-5 h-5 ${
                          isWishlisted ? 'fill-error text-error' : 'text-neutral-600 dark:text-neutral-400'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Buy box (fills remainder on small screens) ─────── */}
            <div className="min-w-0 flex-1 flex flex-col space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8 lg:col-span-4 lg:[position:-webkit-sticky] lg:sticky lg:top-[calc(env(safe-area-inset-top,0px)+5.5rem)] lg:self-start">

              {/* Title row */}
              <section>
                <div className="flex items-center gap-2 mb-4 flex-wrap min-w-0">
                  {productDetail.inventory_level > 0 ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/45 dark:text-emerald-300 text-[10px] font-bold rounded-full tracking-wider uppercase">
                      In Stock
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 text-[10px] font-bold rounded-full tracking-wider uppercase">
                      Out of Stock
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400 ml-auto min-w-0">
                    <StarRating value={rating} />
                    <span className="font-bold text-sm">{rating.toFixed(1)}</span>
                    <span className="text-xs opacity-60 truncate">({productDetail.total_reviews} Reviews)</span>
                  </div>
                </div>

                <h1 className="font-syne text-base sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100 mb-2 leading-tight break-words">
                  {productDetail.name}
                </h1>
                <p className="text-neutral-600 dark:text-neutral-400 font-medium leading-relaxed text-sm md:text-base">
                  {productDetail.description?.split('.')[0]}.
                </p>

                {/* Seller chip + share */}
                <div className="flex items-center gap-3 mt-4 flex-wrap min-w-0">
                  {productDetail.seller && (
                    <Link
                      href={`/seller/${productDetail.seller.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-200/70 dark:bg-neutral-800 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-primary transition-colors"
                    >
                      <BadgeCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      {productDetail.seller.username}
                    </Link>
                  )}
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 break-words">
                    Brand: <strong className="text-neutral-900 dark:text-neutral-100">{productDetail.brand}</strong>
                  </span>
                  <button
                    onClick={handleShare}
                    aria-label="Share product"
                    className="sm:ml-auto p-2 rounded-full bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-primary hover:bg-neutral-300/80 dark:hover:bg-neutral-700 transition-all active:scale-90"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Seller's live promo codes — chip strip; renders nothing if none. */}
                {productDetail.seller && (
                  <div className="mt-3">
                    <SellerPromosStrip
                      sellerId={String(productDetail.seller.id)}
                      sellerName={productDetail.seller.username}
                      variant="compact"
                    />
                  </div>
                )}
              </section>

              {/* Price block */}
              <section className="bg-neutral-100 dark:bg-neutral-900/90 p-3 sm:p-5 md:p-6 rounded-lg sm:rounded-xl space-y-2 sm:space-y-3">
                <div className="flex items-end gap-2 sm:gap-3 flex-wrap">
                  <span className="font-mono text-xl sm:text-3xl md:text-4xl font-bold text-primary tracking-tighter">
                    {formatDisplayPrice(finalPrice)}
                  </span>
                  {productDetail.discount_percentage > 0 && (
                    <>
                      <span className="font-mono text-lg md:text-xl text-neutral-600 dark:text-neutral-400 line-through opacity-50 mb-0.5">
                        {formatDisplayPrice(price)}
                      </span>
                      <span className="sm:ml-auto font-bold text-sm bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-1 rounded">
                        Save {productDetail.discount_percentage}%
                      </span>
                    </>
                  )}
                </div>
                {selectedVariant && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                    Selected: <span className="text-neutral-900 dark:text-neutral-100 font-bold">{selectedVariant.name}</span>
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Estimated financing available. See checkout for options.</span>
                </div>
              </section>

              {/* Variant pickers — theme-ordered (Amazon-style) or flat list */}
              {productDetail.variants && productDetail.variants.length > 0 && (
                <section className="space-y-4">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1 text-neutral-600 dark:text-neutral-400">
                      {useAxisPicker ? 'Choose options' : formatVariationThemeLabel(productDetail.variation_theme)}
                    </h3>
                    {useAxisPicker && themeAxes && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                        {formatVariationThemeLabel(productDetail.variation_theme)}
                      </p>
                    )}
                    {useAxisPicker && themeAxes ? (
                      <StructuredVariantPicker
                        variants={productDetail.variants}
                        themeAxes={themeAxes}
                        selections={axisSelections}
                        onAxisSelect={handleAxisSelect}
                        onTailSelect={handleGroupedTailSelect}
                        formatDisplayPrice={formatDisplayPrice}
                      />
                    ) : (
                      <HorizontalScrollLane
                        scrollClassName={`${VARIANT_CARD_SCROLL} px-1`}
                        trackClassName={`${VARIANT_CARD_ROW} pb-2`}
                      >
                        {productDetail.variants.map((variant: any) => {
                          const swatch = variantSwatch(variant)
                          const attrLine = variantAttributeSummary(variant)
                          const vImgRaw = variant.primary_image ?? variant.primaryImage
                          const vImg =
                            typeof vImgRaw === 'string' && vImgRaw.trim()
                              ? resolveMediaSrc(vImgRaw.trim())
                              : null
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              onClick={() => setSelectedVariant(variant)}
                              className={`${VARIANT_CARD_WIDTH} flex flex-col p-3 sm:p-4 rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-left transition-all active:scale-[0.98] ${
                                selectedVariant?.id === variant.id
                                  ? 'ring-2 ring-orange-500'
                                  : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
                              }`}
                            >
                              <div className="flex items-center gap-3 w-full min-w-0">
                                <div
                                  className={`shrink-0 w-12 h-12 border-2 border-neutral-200 dark:border-neutral-600 overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-inner ${
                                    vImg ? 'rounded-xl' : 'rounded-full'
                                  }`}
                                  title={attrLine || variant.name}
                                >
                                  {vImg ? (
                                    <img
                                      src={vImg}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : swatch?.kind === 'color' ? (
                                    <span
                                      className="block w-full h-full rounded-full"
                                      style={{ backgroundColor: swatch.value }}
                                    />
                                  ) : swatch?.kind === 'image' ? (
                                    <img
                                      src={swatch.src}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                                  <span
                                    className={`font-bold text-sm leading-snug ${
                                      selectedVariant?.id === variant.id
                                        ? 'text-neutral-900 dark:text-neutral-100'
                                        : 'text-neutral-700 dark:text-neutral-300'
                                    }`}
                                  >
                                    {variant.name}
                                  </span>
                                  {attrLine ? (
                                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug line-clamp-2">
                                      {attrLine}
                                    </span>
                                  ) : null}
                                  <span
                                    className={`font-mono text-xs mt-0.5 ${
                                      selectedVariant?.id === variant.id
                                        ? 'text-primary'
                                        : 'text-neutral-600 dark:text-neutral-400'
                                    }`}
                                  >
                                    {formatDisplayPrice(parseFloat(variant.price))}
                                  </span>
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </HorizontalScrollLane>
                    )}
                  </div>
                </section>
              )}

              {/* Quantity stepper */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-neutral-600 dark:text-neutral-400">
                  Quantity
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-0 bg-neutral-200/70 dark:bg-neutral-800 rounded-xl overflow-hidden border border-neutral-300 dark:border-neutral-600">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-11 h-11 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-primary disabled:opacity-30 transition-colors active:scale-90"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-mono font-bold text-neutral-900 dark:text-neutral-100 text-sm">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(productDetail.inventory_level, quantity + 1))}
                      disabled={quantity >= productDetail.inventory_level}
                      className="w-11 h-11 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-primary disabled:opacity-30 transition-colors active:scale-90"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">
                    {productDetail.inventory_level} available
                  </span>
                </div>
              </section>

              {/* CTA section */}
              <div className="space-y-4">
                {/* Mode switcher: Buy / Bid / Offer */}
                <div className="grid grid-cols-3 p-1 bg-neutral-200/70 dark:bg-neutral-800 rounded-xl overflow-hidden gap-1">
                  <button className="min-w-0 py-3 px-1 sm:px-2 rounded-lg bg-white dark:bg-neutral-900 shadow-sm font-bold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 text-neutral-900 dark:text-neutral-100 transition-all active:scale-95">
                    <Zap className="w-4 h-4" />
                    Buy Now
                  </button>
                  <button className="min-w-0 py-3 px-1 sm:px-2 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all active:scale-95">
                    <Gavel className="w-4 h-4" />
                    Place Bid
                  </button>
                  <button className="min-w-0 py-3 px-1 sm:px-2 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-all active:scale-95">
                    <Tag className="w-4 h-4" />
                    Offer
                  </button>
                </div>

                {/* Primary actions: side-by-side on small screens, stacked on xl */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-1 xl:gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={productDetail.inventory_level === 0}
                    className="w-full py-3 sm:py-4 px-2 sm:px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 sm:gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">Add to Cart</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDirectCheckout}
                    disabled={productDetail.inventory_level === 0}
                    className="w-full py-3 sm:py-4 px-2 sm:px-4 bg-emerald-600 text-white dark:bg-emerald-700 font-bold text-xs sm:text-sm rounded-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 sm:gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">Checkout</span>
                  </button>
                </div>
              </div>

              {/* Seller + delivery card */}
              <div className="bg-neutral-100 dark:bg-neutral-900/90 rounded-xl p-5 md:p-6 space-y-4">
                {productDetail.seller && (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-200/70 dark:bg-neutral-800">
                        <div className="w-full h-full flex items-center justify-center text-neutral-600 dark:text-neutral-400 font-bold text-lg">
                          {productDetail.seller.username.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/seller/${productDetail.seller.id}`}
                            className="font-bold text-neutral-900 dark:text-neutral-100 hover:text-primary transition-colors"
                          >
                            {productDetail.seller.username}
                          </Link>
                          <BadgeCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                          Verified Seller • TradeHut Partner
                        </p>
                      </div>
                    </div>
                    <div className="h-px bg-neutral-200 dark:bg-neutral-700" />
                  </>
                )}

                {/* Trust rows */}
                <div className="space-y-3 text-neutral-900 dark:text-neutral-100">
                  <div className="flex items-center gap-3 text-sm">
                    <Truck className="w-5 h-5 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">Free Express Delivery</span>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">On orders over $50 · Standard 3–5 days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <ShieldCheck className="w-5 h-5 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">TradeHut Buyer Protection</span>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Money-back guarantee &amp; 1 yr warranty</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <RotateCcw className="w-5 h-5 text-neutral-600 dark:text-neutral-400 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">Easy 30-Day Returns</span>
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">Item must be unused and in original packaging</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            {/* end buy box */}

          </div>
          {/* end two-col grid */}

          {/* ── Tab section ─────────────────────────────────────────────── */}
          <section className="mt-16 md:mt-24">
            {/* Tab bar */}
            <div className="flex gap-6 md:gap-12 border-b border-neutral-200 dark:border-neutral-800 mb-8 md:mb-12 overflow-x-auto no-scrollbar whitespace-nowrap">
              {TAB_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`pb-5 border-b-2 font-bold text-sm md:text-base transition-all whitespace-nowrap ${
                    activeTab === key
                      ? 'border-orange-500 text-neutral-900 dark:text-neutral-100'
                      : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  {key === 'reviews'
                    ? `Reviews (${productDetail.total_reviews})`
                    : TAB_LABELS[key]}
                </button>
              ))}
            </div>

            {/* Tab panels */}
            {activeTab === 'description' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                <div className="space-y-6">
                  <h2 className="font-syne text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                    About {productDetail.name}
                  </h2>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm md:text-base">
                    {productDetail.description}
                  </p>
                  {productDetail.key_features && productDetail.key_features.length > 0 && (
                    <div className="bg-neutral-100 dark:bg-neutral-900/90 p-6 md:p-8 rounded-2xl space-y-3">
                      <h4 className="font-bold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                        <Eye className="w-4 h-4 text-orange-500" />
                        Key Features
                      </h4>
                      <ul className="space-y-2">
                        {productDetail.key_features.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                            <Check className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="bg-neutral-100 dark:bg-neutral-900/90 p-6 md:p-8 rounded-2xl space-y-3">
                    <h4 className="font-bold flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                      <Camera className="w-4 h-4 text-orange-500" />
                      Premium Quality
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                      Every product on TradeHut is vetted for quality. Sellers are verified partners who uphold our standards for craftsmanship, authenticity, and customer satisfaction.
                    </p>
                  </div>
                </div>
                <div className="relative h-64 md:h-full min-h-[300px] md:min-h-[400px] rounded-3xl overflow-hidden shadow-md dark:shadow-none dark:ring-1 dark:ring-neutral-800 bg-neutral-100 dark:bg-neutral-900/90">
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/88 dark:from-black/92 to-transparent flex items-end p-8 md:p-12">
                    <div className="text-white space-y-2">
                      <p className="font-mono text-[10px] md:text-sm uppercase tracking-widest text-orange-300 dark:text-orange-400">
                        {productDetail.category}
                      </p>
                      <h3 className="font-syne text-xl md:text-3xl font-bold text-white">
                        {productDetail.name}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="max-w-2xl">
                <h2 className="font-syne text-2xl md:text-3xl font-bold text-neutral-900 dark:text-neutral-100 mb-8">
                  Specifications
                </h2>
                <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 divide-y divide-neutral-200 dark:divide-neutral-800">
                  {[
                    ['Brand', productDetail.brand],
                    ['Category', productDetail.category],
                    ['Condition', 'New'],
                    ['Stock', `${productDetail.inventory_level} units`],
                    ['Average Rating', `${rating.toFixed(1)} / 5`],
                    ['Total Reviews', productDetail.total_reviews.toString()],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center px-6 py-4 odd:bg-white dark:bg-neutral-900 even:bg-neutral-100 dark:bg-neutral-900/90">
                      <span className="w-40 text-xs font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400 flex-shrink-0">
                        {label}
                      </span>
                      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-8 max-w-3xl">
                {/* Summary */}
                <div className="bg-neutral-100 dark:bg-neutral-900/90 rounded-2xl p-6 flex items-center gap-8 flex-wrap">
                  <div className="text-center">
                    <div className="font-mono text-5xl font-bold text-neutral-900 dark:text-neutral-100">{rating.toFixed(1)}</div>
                    <StarRating value={rating} />
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                      {productDetail.total_reviews} reviews
                    </p>
                  </div>
                  <div className="flex-1 space-y-2 min-w-[160px]">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs text-neutral-600 dark:text-neutral-400 w-4">{star}</span>
                        <Star className="w-3 h-3 text-orange-500 fill-orange-500 flex-shrink-0" />
                        <div className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{ width: star === Math.round(rating) ? '60%' : `${(star / 5) * 40}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review list */}
                <div className="space-y-6">
                  {(!productDetail.reviews || productDetail.reviews.length === 0) && (
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      No reviews yet. Be the first to share your experience.
                    </p>
                  )}
                  {productDetail.reviews?.map((review: any) => {
                    const who = review.user?.username ?? 'Anonymous'
                    return (
                      <div
                        key={review.id}
                        className="bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-md dark:shadow-none border border-neutral-200 dark:border-neutral-700"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-neutral-200/70 dark:bg-neutral-800 flex items-center justify-center font-bold text-neutral-600 dark:text-neutral-400 flex-shrink-0">
                            {who.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h4 className="font-bold text-neutral-900 dark:text-neutral-100">{who}</h4>
                              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                                {review.created_at
                                  ? new Date(review.created_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : ''}
                              </span>
                            </div>
                            <StarRating value={review.rating} />
                            {review.comment ? (
                              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                {review.comment}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setReviewModalOpen(true)}
                  className="px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg shadow-lg active:scale-95 transition-all"
                >
                  Write a Review
                </button>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="max-w-2xl space-y-8">
                <div>
                  <h3 className="font-syne text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-6 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-orange-500" />
                    Shipping Information
                  </h3>
                  <div className="space-y-3">
                    {[
                      'Free shipping on orders over $50',
                      'Standard delivery: 3–5 business days',
                      'Express delivery: 1–2 business days',
                      'International shipping available to 60+ countries',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 bg-neutral-100 dark:bg-neutral-900/90 rounded-xl px-5 py-4">
                        <Check className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-syne text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-6 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-orange-500" />
                    Return Policy
                  </h3>
                  <div className="space-y-3">
                    {[
                      '30-day return policy from delivery date',
                      'Item must be unused and in original packaging',
                      'Free returns on defective or wrong items',
                      'Refund processed within 5–7 business days',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 bg-neutral-100 dark:bg-neutral-900/90 rounded-xl px-5 py-4">
                        <Check className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Related products ────────────────────────────────────────── */}
          {relatedProducts.length > 0 && (
            <section className="mt-20 md:mt-28">
              <div className="flex items-end justify-between gap-4 mb-8 md:mb-10 flex-wrap">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 dark:text-neutral-400">
                    You may also like
                  </p>
                  <h2 className="font-syne text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                    Related Products
                  </h2>
                </div>
                <Link
                  href={`/products?category=${productDetail.category}`}
                  className="text-sm font-bold text-orange-500 hover:text-orange-400 transition-colors flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Mobile: horizontal scroll rail; md+: grid */}
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:pb-0 snap-x snap-mandatory md:snap-none">
                {relatedProducts.slice(0, 4).map((product: any) => (
                  <div
                    key={product.id}
                    className="flex-shrink-0 w-[calc(85vw-2rem)] sm:w-[calc(50vw-2rem)] md:w-auto snap-start"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
        {/* end container */}
      </div>

      <WriteReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        productId={String(productDetail?.id ?? id)}
        onSubmitted={(mapped, ratingSubmitted) => {
          setProductDetail((prev: any) => {
            if (!prev) return prev
            const oldCount = Number(prev.total_reviews ?? 0)
            const oldAvg =
              typeof prev.average_rating === 'string'
                ? parseFloat(prev.average_rating)
                : Number(prev.average_rating || 0)
            const newCount = oldCount + 1
            const newAvg =
              oldCount === 0 ? ratingSubmitted : (oldAvg * oldCount + ratingSubmitted) / newCount
            return {
              ...prev,
              reviews: [mapped, ...(prev.reviews ?? [])],
              total_reviews: newCount,
              average_rating: newAvg,
              rating: newAvg,
            }
          })
        }}
        onToast={showToast}
      />
    </MainLayout>
  )
}
