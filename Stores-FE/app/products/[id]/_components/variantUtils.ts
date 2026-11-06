import { resolveMediaSrc } from '@/lib/mediaUrl'
import type { PdpAttributeValue, PdpVariant } from './types'

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

export type VariantSwatch = { kind: 'color'; value: string } | { kind: 'image'; src: string }

function normalizeHex(code: string): string | null {
  const t = code.trim()
  if (!t) return null
  const hex = t.startsWith('#') ? t : `#${t}`
  return /^#[0-9a-f]{3,8}$/i.test(hex) ? hex : null
}

function namedColorToHex(name: string): string | null {
  return NAMED_COLOR_HEX[name.trim().toLowerCase()] ?? null
}

export function swatchFromAttrValue(a: PdpAttributeValue): VariantSwatch | null {
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

function sortedAttrs(variant: PdpVariant): PdpAttributeValue[] {
  return [...variant.attribute_values].sort((a, b) =>
    (a.attribute_name ?? '').localeCompare(b.attribute_name ?? '')
  )
}

export function variantSwatch(variant: PdpVariant): VariantSwatch | null {
  for (const a of sortedAttrs(variant)) {
    const s = swatchFromAttrValue(a)
    if (s) return s
  }
  return null
}

export function variantAttributeSummary(variant: PdpVariant): string {
  const parts: string[] = []
  for (const a of sortedAttrs(variant)) {
    const label = (a.attribute_name ?? 'Option').trim()
    const val = a.value_name?.trim()
    if (val) parts.push(`${label}: ${val}`)
  }
  return parts.join(' · ')
}

/** Axes in selection order; `null` means flat list mode (`all`, `single`, `custom`, or unknown). */
export function parseVariationThemeAxes(theme: string | undefined): string[] | null {
  const t = (theme ?? '').trim().toLowerCase()
  if (!t || t === 'single' || t === 'custom' || t === 'all') return null
  const parts = t
    .split('-')
    .map(s => s.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : null
}

export function variantAttrMap(variant: PdpVariant): Record<string, string> {
  const m: Record<string, string> = {}
  for (const av of variant.attribute_values) {
    const key = (av.attribute_name ?? '').toLowerCase().trim()
    if (!key) continue
    const val = av.value_name?.trim()
    if (val) m[key] = val
  }
  return m
}

export function variantsMatchThemeAxes(variants: PdpVariant[], axes: string[]): boolean {
  if (!variants.length || !axes.length) return false
  return variants.every(v => {
    const m = variantAttrMap(v)
    return axes.every(ax => Boolean(m[ax]))
  })
}

export function humanizeAxisName(axis: string): string {
  return axis ? axis.charAt(0).toUpperCase() + axis.slice(1) : ''
}

export function isVariantInStock(v: PdpVariant): boolean {
  return v.quantity == null || v.quantity > 0
}

/** Variants whose attributes contain every key/value in `partial`. */
export function findVariantsMatching(variants: PdpVariant[], partial: Record<string, string>): PdpVariant[] {
  const entries = Object.entries(partial).filter(([, v]) => v.trim() !== '')
  if (entries.length === 0) return variants
  return variants.filter(v => {
    const m = variantAttrMap(v)
    return entries.every(([k, val]) => (m[k.toLowerCase()] ?? '') === val)
  })
}

/** Distinct option labels for one axis (sorted naturally). */
export function optionsForAxis(variants: PdpVariant[], axisKey: string): string[] {
  const set = new Set<string>()
  for (const v of variants) {
    const val = variantAttrMap(v)[axisKey.toLowerCase()]
    if (val) set.add(val)
  }
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
}

export function findAttrValueForOption(
  variants: PdpVariant[],
  axisKey: string,
  optionValue: string
): PdpAttributeValue | undefined {
  const key = axisKey.toLowerCase()
  for (const v of variants) {
    const found = v.attribute_values.find(
      a => (a.attribute_name ?? '').toLowerCase().trim() === key && (a.value_name ?? '').trim() === optionValue
    )
    if (found) return found
  }
  return undefined
}

/** Exact variant for a complete set of axis selections; lowest price, then SKU, when several overlap. */
export function findVariantForSelections(
  variants: PdpVariant[],
  axes: string[],
  selections: Record<string, string>
): PdpVariant | null {
  const partial: Record<string, string> = {}
  for (const ax of axes) partial[ax] = selections[ax] ?? ''
  const matches = findVariantsMatching(variants, partial)
  if (matches.length === 0) return null
  return [...matches].sort((a, b) => {
    const pa = Number(a.price)
    const pb = Number(b.price)
    if (pa !== pb) return pa - pb
    return String(a.sku ?? a.id).localeCompare(String(b.sku ?? b.id), undefined, { sensitivity: 'base' })
  })[0]
}

/**
 * Apply a click on an axis chip. Clicking the selected chip clears it. If the new
 * combination has no matching variant, the other axes are reset so the click never dead-ends.
 */
export function nextSelections(
  variants: PdpVariant[],
  prev: Record<string, string>,
  axis: string,
  value: string
): Record<string, string> {
  if (prev[axis] === value) {
    const cleared = { ...prev }
    delete cleared[axis]
    return cleared
  }
  const next = { ...prev, [axis]: value }
  if (findVariantsMatching(variants, next).length === 0) return { [axis]: value }
  return next
}
