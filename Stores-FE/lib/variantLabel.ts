/**
 * Buyer-facing variant labels.
 *
 * Every simple product has exactly one variant and sellers (or legacy imports) often leave it named
 * "Default" / "Standard". Buyers must never see those placeholders. Use `variantDisplayLabel` for any
 * buyer-visible variant text (PDP, cart, checkout, orders, auctions) and render nothing when it returns null.
 */

export interface LabelAttributeValue {
  attribute_name?: string | null
  value_name?: string | null
}

export interface LabelableVariant {
  name?: string | null
  sku?: string | null
  price?: string | number | null
  attribute_values?: LabelAttributeValue[] | null
}

const GENERIC_NAMES = new Set([
  '',
  'default',
  'default variant',
  'default title',
  'defaulttitle',
  'standard',
  'single',
  'n/a',
  'na',
  'none',
  'untitled',
  '-',
  'regular',
  'base',
])

function normalizeName(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .trim()
}

/**
 * True for placeholder names that tell a buyer nothing ("Default", "Standard", "N/A", blank, and any
 * "Default <thing>" such as "Default Color" / "Default Size"). "One size" is real.
 */
export function isGenericVariantName(name: string | null | undefined): boolean {
  const n = normalizeName(name)
  return GENERIC_NAMES.has(n) || /^default/.test(n) || /default$/.test(n)
}

/** Canonical key for an attribute name: 'Color' and 'Colour' are the same axis. */
export function attributeKey(name: string | null | undefined): string {
  const k = (name ?? '').trim().toLowerCase()
  return k === 'color' || k === 'colors' || k === 'colours' ? 'colour' : k
}

/** Display order of attributes everywhere: Colour first, then Size, then the rest alphabetically. */
export function compareAttributeLabels(a: string, b: string): number {
  const rank = (l: string) => {
    const k = attributeKey(l)
    return k === 'colour' ? 0 : k === 'size' ? 1 : 2
  }
  return rank(a) - rank(b) || a.localeCompare(b)
}

/** A variant's real (non-placeholder) attributes in display order (Colour, Size, then alphabetical). */
export function variantRealAttributes(variant: LabelableVariant): Array<{ label: string; value: string }> {
  return sortedRealAttributes(variant)
}

function sortedRealAttributes(variant: LabelableVariant): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = []
  for (const a of variant.attribute_values ?? []) {
    const value = (a.value_name ?? '').trim()
    if (!value || isGenericVariantName(value)) continue
    out.push({ label: (a.attribute_name ?? '').trim() || 'Option', value })
  }
  return out.sort((a, b) => compareAttributeLabels(a.label, b.label))
}

/** 'Colour: Red · Size: M' from the variant's real (non-generic) attribute values; '' when there are none. */
export function variantAttributeLabel(variant: LabelableVariant | null | undefined): string {
  if (!variant) return ''
  return sortedRealAttributes(variant)
    .map(a => `${a.label}: ${a.value}`)
    .join(' · ')
}

/** Distinct attribute names (real values only) across variants, e.g. ['Colour', 'Size']. */
export function variantAxisNames(variants: LabelableVariant[]): string[] {
  const names = new Set<string>()
  for (const v of variants) for (const a of sortedRealAttributes(v)) names.add(a.label)
  return [...names].sort(compareAttributeLabels)
}

export interface VariantLabelOptions {
  /** Pre-computed attribute summary; defaults to `variantAttributeLabel(variant)`. */
  attributeSummary?: string
  /** The product has more than one variant. Only then may the SKU stand in as the very last resort. */
  multipleVariants?: boolean
}

/**
 * What a buyer should read for this variant, or null when there is nothing worth showing:
 * attribute summary -> non-generic name -> SKU (only when `multipleVariants`) -> null.
 */
export function variantDisplayLabel(
  variant: LabelableVariant | null | undefined,
  options: VariantLabelOptions = {}
): string | null {
  if (!variant) return null
  const summary = (options.attributeSummary ?? variantAttributeLabel(variant)).trim()
  if (summary) return summary
  const name = (variant.name ?? '').trim()
  if (name && !isGenericVariantName(name)) return name
  const sku = (variant.sku ?? '').trim()
  if (options.multipleVariants && sku) return sku
  return null
}

/** True when a buyer genuinely has something to choose: more than one variant, and they are not identical. */
export function variantHasChoice(variants: LabelableVariant[] | null | undefined): boolean {
  if (!variants || variants.length < 2) return false
  const keys = new Set(
    variants.map(v =>
      [
        variantAttributeLabel(v),
        isGenericVariantName(v.name) ? '' : normalizeName(v.name),
        (v.sku ?? '').trim().toLowerCase(),
        String(v.price ?? ''),
      ].join('|')
    )
  )
  return keys.size > 1
}
