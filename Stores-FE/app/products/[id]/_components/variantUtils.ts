import { resolveMediaSrc } from '@/lib/mediaUrl'
import { cleanAttributeName, cleanVariantValue, isGenericVariantName, variantAxisNames, variantDisplayLabel } from '@/lib/variantLabel'
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

/** Axis names named by `variation_theme` (an ordering hint only; real axes come from attribute values); null for non-axis themes. */
export function parseVariationThemeAxes(theme: string | undefined): string[] | null {
  const t = (theme ?? '').trim().toLowerCase()
  if (!t || t === 'single' || t === 'custom' || t === 'all') return null
  const parts = t
    .split('-')
    .map(s => s.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : null
}

export function isVariantInStock(v: PdpVariant): boolean {
  return v.quantity == null || v.quantity > 0
}

/** 'Acme Phone — Variant 2' -> 'Variant 2': the product name is already the page title. */
function withoutProductName(label: string, productName: string | undefined): string {
  const p = (productName ?? '').trim().toLowerCase()
  if (!p || !label.toLowerCase().startsWith(p)) return label
  const rest = label.slice(p.length).replace(/^[\s—–\-:|,]+/, '').trim()
  return rest && !isGenericVariantName(rest) ? rest : label
}

/**
 * Chip label per variant id in flat mode: real label, else a numbered 'Option N' (never "Default").
 * When every variant differs by one attribute only, the chip is just the value ('Red') because the heading names the axis.
 */
export function flatVariantLabels(variants: PdpVariant[], productName?: string): Record<string, string> {
  const out: Record<string, string> = {}
  const axes = variantAxisNames(variants)
  variants.forEach((v, i) => {
    let label: string | null = null
    if (axes.length === 1) {
      const hit = v.attribute_values.find(a => cleanAttributeName(a.attribute_name) === axes[0] && cleanVariantValue(a.value_name))
      label = cleanVariantValue(hit?.value_name)
    }
    const named = variantDisplayLabel(v)
    out[v.id] = label ?? (named ? withoutProductName(named, productName) : null) ?? `Option ${i + 1}`
  })
  return out
}

/** Heading above flat chips: the attribute name(s) the variants differ by ('Colour', 'Colour / Size'), else 'Option'. */
export function flatVariantHeading(variants: PdpVariant[]): string {
  const names = variantAxisNames(variants)
  return names.length > 0 ? names.join(' / ') : 'Option'
}
