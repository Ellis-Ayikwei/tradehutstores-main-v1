import { CONDITIONS, type ImageDetail, type ProductCondition, type ProductDetail, type VariantDetail } from '@/lib/seller/listings'
import { countCombos, inferOptionTypes, MAX_MATRIX, pictureValueOfVariant, syncMatrix } from './optionUtils'

/** Overall image cap (the gallery is shared by every colour). */
export const MAX_IMAGES = 40
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const ACCEPTED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp']
export const ACCEPTED_IMAGE_ATTR = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'

export interface OptionValue {
    id: string
    label: string
    colorCode?: string
    image?: string | null
}

export interface OptionType {
    attributeId: string
    name: string
    displayType: string
    values: OptionValue[]
}

export interface VariantFormValues {
    /** Server id once the variant has been saved. */
    serverId?: string
    name: string
    sku: string
    price: string
    quantity: string
    /** False = this combination is not sold and is not saved. Simple and named rows are always enabled. */
    enabled: boolean
    /** AttributeValue ids, one per option type in order. Undefined for simple and named-option rows. */
    valueIds?: string[]
    /** True while the SKU is the auto suggestion (it follows the base SKU until the seller types over it). */
    skuAuto?: boolean
}

export interface ListingFormValues {
    /** True when buyers choose between several variants (size, colour...). False = one simple item. */
    hasOptions: boolean
    /** `attributes` = structured option types and values (Colour, Size...). `names` = legacy free-text option names. */
    optionsMode: 'attributes' | 'names'
    optionTypes: OptionType[]
    /** Prefill helpers for the option matrix. Not saved. */
    baseSku: string
    basePrice: string
    name: string
    description: string
    keywords: string
    category: string
    sub_category: string
    brand: string
    condition: ProductCondition
    variants: VariantFormValues[]
    discount_percentage: string
    free_shipping: boolean
}

/** Placeholder names that tell a buyer nothing about what they are choosing. */
const GENERIC_VARIANT_NAMES = new Set(['default', 'default title', 'defaulttitle', 'standard', 'single', 'n/a', 'na', 'none', 'untitled'])

export const isGenericVariantName = (name: string): boolean => GENERIC_VARIANT_NAMES.has(name.trim().toLowerCase().replace(/\s+/g, ' '))

export const MAX_NAMED_VARIANTS = 50

export type FormErrors = Record<string, string>

/**
 * Validates the whole form and returns the first message per field path (`name`, `variants.2.sku`, `variants`, `optionTypes`, ...).
 * Rows the seller switched off ("Offer this option" off) are skipped because they are not saved.
 */
export function validateListing(value: ListingFormValues): FormErrors {
    const errors: FormErrors = {}
    const issue = (path: string, message: string) => {
        if (!(path in errors)) errors[path] = message
    }

    const name = value.name.trim()
    if (name.length < 3) issue('name', 'Enter a title of at least 3 characters')
    else if (name.length > 255) issue('name', 'Keep the title under 255 characters')
    if (value.description.trim().length > 5000) issue('description', 'Keep the description under 5000 characters')
    if (value.keywords.trim().length > 255) issue('keywords', 'Keep keywords under 255 characters')
    if (!value.category) issue('category', 'Choose a category')
    if (!value.sub_category) issue('sub_category', 'Choose a subcategory')
    if (!value.brand) issue('brand', 'Choose a brand')
    if (!CONDITIONS.some((c) => c === value.condition)) issue('condition', 'Choose a condition')
    if (value.baseSku.trim().length > 80) issue('baseSku', 'Keep this under 80 characters')
    if (!/^\d{1,2}$/.test(value.discount_percentage.trim())) issue('discount_percentage', 'Enter a whole percentage from 0 to 99')
    if (value.variants.length > MAX_MATRIX) issue('variants', `A listing can have up to ${MAX_MATRIX} variants`)

    const structured = value.hasOptions && value.optionsMode === 'attributes'
    const rows = value.variants.map((variant, index) => ({ variant, index })).filter(({ variant }) => variant.enabled)

    const seenSkus = new Set<string>()
    const seenNames = new Set<string>()
    const seenCombos = new Set<string>()
    rows.forEach(({ variant, index }) => {
        if (variant.name.trim().length > 255) issue(`variants.${index}.name`, 'Keep this under 255 characters')
        const sku = variant.sku.trim().toLowerCase()
        if (!sku) issue(`variants.${index}.sku`, 'Enter a SKU')
        else if (sku.length > 100) issue(`variants.${index}.sku`, 'Keep the SKU under 100 characters')
        else if (seenSkus.has(sku)) issue(`variants.${index}.sku`, 'This SKU is used by another variant')
        seenSkus.add(sku)

        const price = variant.price.trim()
        if (!price) issue(`variants.${index}.price`, 'Enter a price')
        else if (!/^\d{1,8}(\.\d{1,2})?$/.test(price)) issue(`variants.${index}.price`, 'Enter an amount up to 2 decimals')
        else if (!structured && Number(price) <= 0) issue(`variants.${index}.price`, 'Enter an amount above 0')

        if (!/^\d{1,7}$/.test(variant.quantity.trim())) issue(`variants.${index}.quantity`, 'Enter a whole number, 0 or more')

        if (structured) {
            const key = (variant.valueIds ?? []).join('|')
            if (seenCombos.has(key)) issue(`variants.${index}.sku`, 'Another row has the same options')
            seenCombos.add(key)
        } else if (value.hasOptions) {
            const label = variant.name.trim().toLowerCase()
            if (!label) issue(`variants.${index}.name`, 'Name this option, e.g. Red / Large')
            else if (isGenericVariantName(label)) issue(`variants.${index}.name`, 'Use a name that tells buyers what they are choosing, e.g. Red / Large (not "Default" or "Standard")')
            else if (seenNames.has(label)) issue(`variants.${index}.name`, 'Another variant already has this name')
            seenNames.add(label)
        }
    })

    if (structured) {
        if (value.optionTypes.length === 0) issue('optionTypes', 'Choose at least one option type, e.g. Colour or Size')
        value.optionTypes.forEach((t, i) => {
            if (t.values.length === 0) issue(`optionTypes.${i}`, `Choose at least one ${t.name.toLowerCase()} value`)
        })
        if (countCombos(value.optionTypes) > MAX_MATRIX) issue('optionTypes', `That makes more than ${MAX_MATRIX} combinations. Remove some values.`)
        else if (value.optionTypes.length > 0 && rows.length === 0) issue('variants', 'Offer at least one option')
    } else {
        if (value.hasOptions && rows.length < 2) issue('variants', 'Add at least two options or turn this off')
        if (value.hasOptions && value.variants.length > MAX_NAMED_VARIANTS) issue('variants', `A listing can have up to ${MAX_NAMED_VARIANTS} variants`)
        if (!value.hasOptions && value.variants.length > 1) issue('variants', 'Turn on "This product has options" to sell more than one variant')
        if (!value.hasOptions && value.variants.length < 1) issue('variants', 'Add a price and stock')
    }
    return errors
}

export const emptyVariant = (): VariantFormValues => ({ name: '', sku: '', price: '', quantity: '0', enabled: true })

export const defaultListingValues = (): ListingFormValues => ({
    hasOptions: false,
    optionsMode: 'attributes',
    optionTypes: [],
    baseSku: '',
    basePrice: '',
    name: '',
    description: '',
    keywords: '',
    category: '',
    sub_category: '',
    brand: '',
    condition: 'New',
    variants: [emptyVariant()],
    discount_percentage: '0',
    free_shipping: false,
})

const isCondition = (v: string | null): v is ProductCondition => CONDITIONS.some((c) => c === v)

export function valuesFromServer(product: ProductDetail, variants: VariantDetail[]): ListingFormValues {
    // One variant is not a choice, so it opens as a simple product (legacy "Default" names are cleared and saved as blank).
    const hasOptions = variants.length > 1
    const inferred = hasOptions ? inferOptionTypes(variants) : null
    const base: ListingFormValues = {
        hasOptions,
        optionsMode: inferred ? 'attributes' : hasOptions ? 'names' : 'attributes',
        optionTypes: inferred?.types ?? [],
        baseSku: '',
        basePrice: '',
        name: product.name ?? '',
        description: product.description ?? '',
        keywords: product.keywords ?? '',
        category: product.category ? String(product.category) : '',
        sub_category: product.sub_category ? String(product.sub_category) : '',
        brand: product.brand ? String(product.brand) : '',
        condition: isCondition(product.condition) ? product.condition : 'New',
        variants: [emptyVariant()],
        discount_percentage: String(product.discount_percentage ?? 0),
        free_shipping: Boolean(product.free_shipping),
    }
    if (variants.length === 0) return base

    const rows: VariantFormValues[] = variants.map((v) => ({
        serverId: String(v.id),
        name: hasOptions && !inferred ? (v.name ?? '') : '',
        sku: v.sku ?? '',
        price: v.price ?? '',
        quantity: String(v.quantity ?? 0),
        enabled: true,
        ...(inferred ? { valueIds: inferred.idsByVariant.get(String(v.id)) } : {}),
    }))
    // Saved combinations stay on; combinations that were never created appear switched off so they can be offered later.
    base.variants = inferred ? syncMatrix(inferred.types, rows, { baseSku: '', basePrice: '' }).map((r) => (r.serverId ? r : { ...r, enabled: false, sku: '', skuAuto: false })) : rows
    return base
}

/** One gallery entry. `file` is set for images not yet uploaded; `id` for saved ones. The first entry is the main image. */
export interface ImageItem {
    key: string
    url: string
    file?: File
    id?: string
    /** Variant the saved image is attached to (the API requires one). */
    variantId?: string
    /** Server-side `is_main` when loaded, to decide whether a PATCH is needed. */
    savedMain?: boolean
    /** Colour (picture-type option value id) this picture belongs to. Buyers see it for every variant of that colour. */
    optionValueId?: string
}

export const imagesFromServer = (rows: ImageDetail[], variants: VariantDetail[] = []): ImageItem[] => {
    const groupByVariant = new Map(variants.map((v) => [String(v.id), pictureValueOfVariant(v)] as const))
    return rows
        .filter((r) => r.image)
        .map((r) => ({
            key: `srv-${r.id}`,
            id: String(r.id),
            url: r.image as string,
            variantId: String(r.product_variant),
            savedMain: r.is_main,
            optionValueId: groupByVariant.get(String(r.product_variant)),
        }))
}

export type StepId = 'details' | 'variants' | 'images' | 'shipping' | 'review'

export const STEPS: { id: StepId; label: string; fields: (keyof ListingFormValues)[] }[] = [
    { id: 'details', label: 'Details', fields: ['name', 'description', 'keywords', 'category', 'sub_category', 'brand', 'condition'] },
    { id: 'variants', label: 'Variants & stock', fields: ['hasOptions', 'optionsMode', 'optionTypes', 'baseSku', 'basePrice', 'variants', 'discount_percentage'] },
    { id: 'images', label: 'Images', fields: [] },
    { id: 'shipping', label: 'Shipping', fields: ['free_shipping'] },
    { id: 'review', label: 'Review', fields: [] },
]

/** Index of the step that owns a form field path such as `variants.0.sku`; unknown fields land on the last step. */
export function stepIndexForField(path: string): number {
    const root = path.split('.')[0] as keyof ListingFormValues
    const idx = STEPS.findIndex((s) => s.fields.includes(root))
    return idx === -1 ? STEPS.length - 1 : idx
}

/** Only the error entries that belong to one step. */
export function errorsForStep(errors: FormErrors, step: number): FormErrors {
    const out: FormErrors = {}
    for (const [path, message] of Object.entries(errors)) {
        if (stepIndexForField(path) === step) out[path] = message
    }
    return out
}
