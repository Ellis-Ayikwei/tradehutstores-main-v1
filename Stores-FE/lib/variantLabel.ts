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

/** Attribute words that, on their own, say nothing about the product ("Default Color" -> "Color"). */
const AXIS_WORD = 'colou?rs?|sizes?|styles?|materials?|capacity|capacities|options?|variants?|types?|titles?|models?|patterns?|finish(?:es)?|editions?|version'
const BARE_AXIS = new RegExp(`^(?:${AXIS_WORD})$`)
const STANDARD_AXIS = new RegExp(String.raw`^standard[\s\-_/:]+(?:${AXIS_WORD})$`)
// Written without \b on purpose: a literal backspace character once slipped into these patterns and made them match nothing.
const DEFAULT_PREFIX = /^default[\s\-_/:]+(.+)$/i
const DEFAULT_SUFFIX = /^(.+?)[\s\-_/:]+default$/i

function normalizeName(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/[\s_]+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .trim()
}

/**
 * True for placeholder names that tell a buyer nothing ("Default", "Standard", "N/A", blank, and anything that
 * starts or ends with "default" such as "Default Color", "Default-Black" or "Colour Default"). "One size" is real.
 * Strict on purpose: callers that cannot clean text hide the whole value. Use `cleanVariantValue` to salvage "Black".
 */
export function isGenericVariantName(name: string | null | undefined): boolean {
  const n = normalizeName(name)
  return GENERIC_NAMES.has(n) || STANDARD_AXIS.test(n) || n.startsWith('default') || n.endsWith('default')
}

/**
 * Buyer-safe option text for an attribute value, or null when nothing real remains.
 * 'Default Color' / 'default colour' / 'Default' / 'Standard' / 'Colour: Default' -> null;
 * 'Default-Black' -> 'Black'; 'Black' and 'One Size' unchanged.
 */
export function cleanVariantValue(value: string | null | undefined): string | null {
  let text = (value ?? '').trim()
  // 'Colour: Default' / 'Colour: Black': only the part after the label is the value.
  const colon = text.lastIndexOf(':')
  if (colon !== -1) text = text.slice(colon + 1).trim()
  for (let i = 0; i < 4 && text; i++) {
    const n = normalizeName(text)
    if (GENERIC_NAMES.has(n) || BARE_AXIS.test(n) || STANDARD_AXIS.test(n)) return null
    const prefix = DEFAULT_PREFIX.exec(text)
    const suffix = DEFAULT_SUFFIX.exec(text)
    if (prefix) text = prefix[1].trim()
    else if (suffix) text = suffix[1].trim()
    else if (n.startsWith('default') || n.endsWith('default')) return null
    else return text
  }
  return null
}

/** Attribute NAME for buyers: 'Default Color' -> 'Color'; a placeholder-only name becomes 'Option'. */
export function cleanAttributeName(name: string | null | undefined): string {
  const raw = (name ?? '').trim()
  const stripped = raw.replace(/^(?:default|standard)[\s\-_/:]+/i, '').replace(/[\s\-_/:]+default$/i, '').trim()
  if (!stripped || GENERIC_NAMES.has(normalizeName(stripped)) || normalizeName(stripped) === 'default') return 'Option'
  return stripped
}

/** Canonical key for an attribute name: 'Color' and 'Colour' are the same axis. */
export function attributeKey(name: string | null | undefined): string {
  const k = cleanAttributeName(name).toLowerCase()
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
    const value = cleanVariantValue(a.value_name)
    if (!value) continue
    out.push({ label: cleanAttributeName(a.attribute_name), value })
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
