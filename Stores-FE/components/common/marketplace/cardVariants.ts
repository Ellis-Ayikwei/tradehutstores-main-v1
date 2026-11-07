import { resolveMediaSrc } from '@/lib/mediaUrl'
import { attributeKey, isGenericVariantName } from '@/lib/variantLabel'

/**
 * One purchasable variant as a product card needs it. Callers map API rows with `cardVariantsFromRaw`;
 * nothing here is invented: a card only shows swatches when the rows carry a Colour attribute.
 */
export interface CardVariant {
    id: string
    /** Price the buyer pays (after any product discount). */
    price: number
    /** List price, only when a real discount applies. */
    originalPrice?: number
    stock?: number
    /** Variant photo (swaps the card image when selected). */
    imageUrl?: string | null
    /** Colour attribute value, e.g. "Black". Present only for variants on a Colour axis. */
    colorName?: string
    /** Validated hex (#rgb / #rrggbb) from the attribute value's colour code. */
    colorHex?: string | null
    /** Colour value's own swatch image, used when there is no hex. */
    colorImageUrl?: string | null
    /** Real (non-placeholder) attributes: { label: 'Memory', value: '256 GB' }. */
    attributes?: Array<{ label: string; value: string }>
    name?: string
}

export interface ColourGroup {
    key: string
    name: string
    hex: string | null
    imageUrl: string | null
    /** Variants of this colour (more than one when another axis, e.g. size, also varies). */
    variants: CardVariant[]
    /** In-stock, cheapest variant: the one a swatch click selects. */
    lead: CardVariant
}

type Raw = Record<string, unknown>

function rec(v: unknown): Raw | null {
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null
}

function text(v: unknown): string | null {
    return typeof v === 'string' && v.trim() ? v.trim() : null
}

function numeric(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null
    const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
    return Number.isFinite(n) ? n : null
}

function hexOf(code: unknown): string | null {
    const t = text(code)
    if (!t) return null
    const hex = t.startsWith('#') ? t : `#${t}`
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex) ? hex : null
}

function listOf(v: unknown): unknown[] {
    if (Array.isArray(v)) return v
    const r = rec(v)
    return r && Array.isArray(r.results) ? (r.results as unknown[]) : []
}

/**
 * Maps `variants` from a product row (PDP/variant API shape: id, price, quantity, primary_image,
 * attribute_values[{attribute_name, value_name, color_code, image}]) into card variants.
 * Returns undefined when the row has no usable variants.
 */
export function cardVariantsFromRaw(raw: unknown, opts: { discountPct?: number } = {}): CardVariant[] | undefined {
    const discount = Math.min(99, Math.max(0, opts.discountPct ?? 0))
    const out: CardVariant[] = []
    for (const item of listOf(raw)) {
        const r = rec(item)
        if (!r || r.id == null) continue
        const list = numeric(r.price)
        if (list === null) continue
        const explicitFinal = numeric(r.final_price)
        const final = explicitFinal ?? (discount > 0 ? Math.round(list * (1 - discount / 100) * 100) / 100 : list)
        const attributes: Array<{ label: string; value: string }> = []
        let colorName: string | undefined
        let colorHex: string | null = null
        let colorImageUrl: string | null = null
        for (const a of listOf(r.attribute_values)) {
            const av = rec(a)
            if (!av) continue
            const value = text(av.value_name)
            if (!value || isGenericVariantName(value)) continue
            const label = text(av.attribute_name) ?? 'Option'
            attributes.push({ label, value })
            if (attributeKey(label) === 'colour' && !colorName) {
                colorName = value
                colorHex = hexOf(av.color_code)
                const img = text(av.image)
                colorImageUrl = img ? resolveMediaSrc(img) || null : null
            }
        }
        const image = text(r.primary_image) ?? text(r.image)
        const name = text(r.name)
        out.push({
            id: String(r.id),
            price: final,
            originalPrice: list > final ? list : undefined,
            stock: numeric(r.quantity ?? r.stock) ?? undefined,
            imageUrl: image ? resolveMediaSrc(image) || null : null,
            colorName,
            colorHex,
            colorImageUrl,
            attributes: attributes.length > 0 ? attributes : undefined,
            name: name && !isGenericVariantName(name) ? name : undefined,
        })
    }
    return out.length > 0 ? out : undefined
}

/** Groups variants by colour. Fewer than two colours means there is nothing to choose: returns []. */
export function colourGroups(variants: CardVariant[] | undefined): ColourGroup[] {
    if (!variants || variants.length < 2) return []
    const map = new Map<string, CardVariant[]>()
    for (const v of variants) {
        if (!v.colorName) continue
        const key = v.colorName.trim().toLowerCase()
        const bucket = map.get(key)
        if (bucket) bucket.push(v)
        else map.set(key, [v])
    }
    if (map.size < 2) return []
    const groups: ColourGroup[] = []
    for (const [key, list] of map) {
        const lead =
            [...list].sort(
                (a, b) => Number(a.stock === 0) - Number(b.stock === 0) || a.price - b.price
            )[0] ?? list[0]
        const withHex = list.find(v => v.colorHex)
        const withImg = list.find(v => v.colorImageUrl) ?? list.find(v => v.imageUrl)
        groups.push({
            key,
            name: list[0].colorName as string,
            hex: withHex?.colorHex ?? null,
            imageUrl: withImg?.colorImageUrl ?? withImg?.imageUrl ?? null,
            variants: list,
            lead,
        })
    }
    return groups
}

/** { min, max } of variant prices. */
export function priceSpan(variants: CardVariant[]): { min: number; max: number } {
    let min = Infinity
    let max = -Infinity
    for (const v of variants) {
        if (v.price < min) min = v.price
        if (v.price > max) max = v.price
    }
    return { min, max }
}
