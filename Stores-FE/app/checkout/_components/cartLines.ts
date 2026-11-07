import { resolveMediaSrc } from '@/lib/mediaUrl'
import { variantDisplayLabel, type LabelAttributeValue } from '@/lib/variantLabel'

// Guest carts (redux + localStorage) store rows as `{ id, product: {...}, product_variant_id, quantity }`.
// The API cart serializer currently returns flat rows (`product` = id, `product_name`); BE-CART-1 will return
// the nested shape with `variant{id,...}`. Both are normalised here so the UI never reads a missing field.

interface RawProduct {
    id?: string | number
    name?: string
    brand?: string
    final_price?: number | string | null
    price?: number | string | null
    main_product_image?: string | { url?: string } | null
    image?: string | null
    inventory_level?: number | string | null
    available?: boolean
    store_name?: string | null
    seller_name?: string | null
}

export interface RawCartLine {
    id: string | number
    quantity: number | string
    product_id?: string | number
    product_variant_id?: string | number | null
    product?: RawProduct | string | number | null
    product_name?: string
    variant?: { id?: string | number; name?: string | null; attribute_values?: LabelAttributeValue[] | null } | null
}

export interface CartLineView {
    id: string
    productId: string
    /** Needed by POST checkout/ (`items[].variant_id`). Undefined when the row carries none. */
    variantId?: string
    name: string
    href: string
    imageSrc: string
    /** Unit price the buyer pays; undefined when the row carries no price. */
    unit?: number
    /** List price, only when higher than `unit`. */
    list?: number
    quantity: number
    /** Known remaining units (undefined = not provided by the data). */
    stockLeft?: number
    outOfStock: boolean
    inStock: boolean
    soldBy?: string
    variantText?: string
}

export function toNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
}

export function normaliseCartLine(raw: RawCartLine): CartLineView {
    const product: RawProduct = raw.product && typeof raw.product === 'object' ? raw.product : {}
    const productId = String(
        product.id ?? raw.product_id ?? (raw.product && typeof raw.product !== 'object' ? raw.product : '')
    )

    const unit = toNumber(product.final_price) ?? toNumber(product.price)
    const priceNum = toNumber(product.price)
    const list = unit !== undefined && priceNum !== undefined && priceNum > unit ? priceNum : undefined

    const imageRaw =
        typeof product.main_product_image === 'string'
            ? product.main_product_image
            : (product.main_product_image?.url ?? product.image ?? '')
    const inventory = toNumber(product.inventory_level)
    const outOfStock = product.available === false || inventory === 0
    const stockLeft = inventory !== undefined && inventory > 0 ? inventory : undefined

    const variantRaw = raw.product_variant_id ?? raw.variant?.id
    const variantId = variantRaw !== undefined && variantRaw !== null && variantRaw !== '' ? String(variantRaw) : undefined

    return {
        id: String(raw.id),
        productId,
        variantId,
        name: product.name || raw.product_name || 'Item',
        href: productId ? `/products/${productId}` : '/products',
        imageSrc: resolveMediaSrc(imageRaw),
        unit,
        list,
        quantity: Math.max(1, Math.floor(toNumber(raw.quantity) ?? 1)),
        stockLeft,
        outOfStock,
        inStock: !outOfStock && (product.available === true || inventory !== undefined),
        soldBy: product.store_name?.trim() || product.seller_name?.trim() || undefined,
        // Placeholder names ("Default", "Standard") are hidden; a SKU is never used as a fallback here.
        variantText: variantDisplayLabel(raw.variant) ?? undefined,
    }
}
