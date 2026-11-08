import { attributeKey, cleanAttributeName, cleanVariantValue, compareAttributeLabels } from '@/lib/variantLabel'
import type { PdpAttributeValue, PdpVariant } from './types'
import { isVariantInStock, swatchFromAttrValue, type VariantSwatch } from './variantUtils'

/** Option label for variants that have no real value on an axis other variants do have. Always listed last. */
export const OTHER_OPTION = 'Other'

export interface AxisOption {
  value: string
  /** The lead picture of the first (preferably in-stock) variant that has this option. */
  image: string | null
  /** Attribute-value swatch (picture or hex), when the catalogue has one. */
  swatch: VariantSwatch | null
}

export interface VariantAxis {
  /** Canonical lower-case key ('colour' covers Color/Colour). */
  key: string
  /** Name as the seller stored it. */
  name: string
  /** Render options as square picture tiles instead of text buttons. */
  tiles: boolean
  options: AxisOption[]
}

export interface AxisModel {
  axes: VariantAxis[]
  /** variant id -> axis key -> option value (real value, or OTHER_OPTION). */
  valuesById: Record<string, Record<string, string>>
}

export const EMPTY_AXIS_MODEL: AxisModel = { axes: [], valuesById: {} }

export function variantLeadImage(v: PdpVariant): string | null {
  const own = Array.isArray(v.images) ? v.images.find((i): i is string => typeof i === 'string' && i !== '') : undefined
  return own ?? v.primary_image ?? null
}

const SIZE_RANK: Record<string, number> = {
  xxs: 0, '2xs': 0, xs: 1, s: 2, small: 2, m: 3, medium: 3, l: 4, large: 4, xl: 5, 'x-large': 5,
  xxl: 6, '2xl': 6, xxxl: 7, '3xl': 7, '4xl': 8,
}

function compareOptions(axisKey: string, values: string[]): (a: string, b: string) => number {
  const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  const ranked = axisKey === 'size' && values.every(v => SIZE_RANK[v.trim().toLowerCase()] !== undefined)
  return (a, b) => {
    if (a === OTHER_OPTION) return 1
    if (b === OTHER_OPTION) return -1
    return ranked ? SIZE_RANK[a.trim().toLowerCase()] - SIZE_RANK[b.trim().toLowerCase()] : natural(a, b)
  }
}

function findAttr(variants: PdpVariant[], key: string, value: string): PdpAttributeValue | undefined {
  for (const v of variants)
    for (const a of v.attribute_values)
      if (attributeKey(a.attribute_name) === key && cleanVariantValue(a.value_name) === value) return a
  return undefined
}

/** Real (non-placeholder) value per axis key for one variant; the first value wins when an attribute repeats. */
function realValues(v: PdpVariant): Record<string, { name: string; value: string }> {
  const out: Record<string, { name: string; value: string }> = {}
  for (const a of v.attribute_values) {
    const value = cleanVariantValue(a.value_name)
    if (!value) continue
    const name = cleanAttributeName(a.attribute_name)
    const key = attributeKey(name)
    if (!out[key]) out[key] = { name, value }
  }
  return out
}

/**
 * Axes come from the variants' real attribute values (never from `variation_theme`, which is only an
 * ordering hint for axes other than Colour/Size). Order: Colour, Size, then theme order, then alphabetical.
 */
export function buildAxisModel(variants: PdpVariant[], themeHint: string[] | null): AxisModel {
  const perVariant = variants.map(realValues)
  const names = new Map<string, string>()
  for (const m of perVariant) for (const [key, { name }] of Object.entries(m)) if (!names.has(key)) names.set(key, name)
  if (names.size === 0) return EMPTY_AXIS_MODEL

  const hint = (themeHint ?? []).map(attributeKey)
  const hintRank = (key: string) => {
    const i = hint.indexOf(key)
    return i === -1 ? 1000 : i
  }
  const keys = [...names.keys()].sort((a, b) => {
    const na = names.get(a) as string
    const nb = names.get(b) as string
    const base = compareAttributeLabels(na, nb)
    const bothOther = attributeKey(na) !== 'colour' && attributeKey(na) !== 'size' && attributeKey(nb) !== 'colour' && attributeKey(nb) !== 'size'
    return bothOther ? hintRank(a) - hintRank(b) || base : base
  })

  const valuesById: AxisModel['valuesById'] = {}
  variants.forEach((v, i) => {
    const row: Record<string, string> = {}
    for (const key of keys) row[key] = perVariant[i][key]?.value ?? OTHER_OPTION
    valuesById[v.id] = row
  })

  const axes: VariantAxis[] = keys.map(key => {
    const values = [...new Set(variants.map(v => valuesById[v.id][key]))]
    values.sort(compareOptions(key, values))
    const options: AxisOption[] = values.map(value => {
      const withOption = variants.filter(v => valuesById[v.id][key] === value)
      const lead = withOption.find(v => isVariantInStock(v) && variantLeadImage(v)) ?? withOption.find(v => variantLeadImage(v))
      const av = value === OTHER_OPTION ? undefined : findAttr(variants, key, value)
      return { value, image: lead ? variantLeadImage(lead) : null, swatch: av ? swatchFromAttrValue(av) : null }
    })
    const real = options.filter(o => o.value !== OTHER_OPTION)
    const anyPicture = real.some(o => o.image || o.swatch)
    const tiles =
      (key === 'colour' && anyPicture) ||
      (real.length > 0 && real.every(o => o.swatch?.kind === 'image')) ||
      // A sole axis whose every option has its own distinct picture reads best as picture tiles.
      (keys.length === 1 && real.length > 1 && real.every(o => o.image) && new Set(real.map(o => o.image)).size === real.length)
    return { key, name: names.get(key) as string, tiles, options }
  })
  return { axes, valuesById }
}

function matchesPrefix(model: AxisModel, v: PdpVariant, selections: Record<string, string>, upTo: number): boolean {
  const vals = model.valuesById[v.id]
  for (let i = 0; i <= upTo; i++) {
    const key = model.axes[i].key
    if (selections[key] && vals[key] !== selections[key]) return false
  }
  return true
}

/**
 * An option is selectable when an in-stock variant has it together with the selections of the axes
 * BEFORE it (later axes are re-chosen automatically), so every option stays reachable in sparse matrices.
 */
export function isOptionAvailable(
  model: AxisModel,
  variants: PdpVariant[],
  selections: Record<string, string>,
  axisIndex: number,
  value: string
): boolean {
  const key = model.axes[axisIndex].key
  if (selections[key] === value) return true
  const probe = { ...selections, [key]: value }
  return variants.some(v => isVariantInStock(v) && matchesPrefix(model, v, probe, axisIndex))
}

/** Exact variant for a full set of axis selections: in stock first, then lowest price. */
export function findVariantByAxes(
  model: AxisModel,
  variants: PdpVariant[],
  selections: Record<string, string>
): PdpVariant | null {
  if (model.axes.length === 0 || !model.axes.every(a => selections[a.key])) return null
  const matches = variants.filter(v => matchesPrefix(model, v, selections, model.axes.length - 1))
  if (matches.length === 0) return null
  return [...matches].sort(
    (a, b) =>
      Number(isVariantInStock(b)) - Number(isVariantInStock(a)) ||
      (Number(a.price) || 0) - (Number(b.price) || 0)
  )[0]
}

/** Apply a click: keep the later axes when that combination exists, otherwise move to the closest valid one. */
export function selectAxisOption(
  model: AxisModel,
  variants: PdpVariant[],
  prev: Record<string, string>,
  axisIndex: number,
  value: string
): Record<string, string> {
  const key = model.axes[axisIndex].key
  if (prev[key] === value) return prev
  const probe = { ...prev, [key]: value }
  const prefix = variants.filter(v => matchesPrefix(model, v, probe, axisIndex))
  const pool = prefix.some(isVariantInStock) ? prefix.filter(isVariantInStock) : prefix
  if (pool.length === 0) return prev
  const later = model.axes.slice(axisIndex + 1)
  let best = pool[0]
  let bestScore = -1
  for (const v of pool) {
    const score = later.filter(a => prev[a.key] === model.valuesById[v.id][a.key]).length
    if (score > bestScore) {
      best = v
      bestScore = score
    }
  }
  return { ...model.valuesById[best.id] }
}

/** The variant to start on: `default_variant` if in stock, else the first in-stock one, else default/first. */
export function pickInitialVariant(variants: PdpVariant[], defaultId: string | null): PdpVariant | null {
  if (variants.length === 0) return null
  const def = defaultId ? variants.find(v => v.id === defaultId) : undefined
  if (def && isVariantInStock(def)) return def
  return variants.find(isVariantInStock) ?? def ?? variants[0]
}

export function initialSelections(model: AxisModel, variants: PdpVariant[], defaultId: string | null): Record<string, string> {
  const v = pickInitialVariant(variants, defaultId)
  return v && model.axes.length > 0 ? { ...model.valuesById[v.id] } : {}
}
