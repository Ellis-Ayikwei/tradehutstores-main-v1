import { z } from 'zod';
import { CONDITIONS, type ImageDetail, type ProductDetail, type VariantDetail } from '@/services/sellerListingsService';
import { countCombos, inferOptionTypes, MAX_MATRIX, MAX_OPTION_TYPES, pictureValueOfVariant, syncMatrix } from './components/optionUtils';

/** Overall image cap (the gallery is shared by every colour). */
export const MAX_IMAGES = 40;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] } as const;

const optionValueSchema = z.object({ id: z.string(), label: z.string(), colorCode: z.string().optional(), image: z.string().nullable().optional() });
const optionTypeSchema = z.object({ attributeId: z.string(), name: z.string(), displayType: z.string(), values: z.array(optionValueSchema) });

/**
 * Field-level rules live in `superRefine` because rows the seller switched off ("Offer this option" off) are not saved,
 * so they must not block the form.
 */
const variantSchema = z.object({
    /** Server id once the variant has been saved. */
    serverId: z.string().optional(),
    name: z.string().trim().max(255, 'Keep this under 255 characters'),
    sku: z.string().trim().max(100, 'Keep the SKU under 100 characters'),
    price: z.string().trim(),
    quantity: z.string().trim(),
    /** False = this combination is not sold and is not saved. Simple and named rows are always enabled. */
    enabled: z.boolean(),
    /** AttributeValue ids, one per option type in order. Undefined for simple and named-option rows. */
    valueIds: z.array(z.string()).optional(),
    /** True while the SKU is the auto suggestion (it follows the base SKU until the seller types over it). */
    skuAuto: z.boolean().optional(),
});

/** Placeholder names that tell a buyer nothing about what they are choosing. */
const GENERIC_VARIANT_NAMES = new Set(['default', 'default title', 'defaulttitle', 'standard', 'single', 'n/a', 'na', 'none', 'untitled']);

export const isGenericVariantName = (name: string): boolean => GENERIC_VARIANT_NAMES.has(name.trim().toLowerCase().replace(/\s+/g, ' '));

const MAX_NAMED_VARIANTS = 50;

export const listingSchema = z
    .object({
        /** True when buyers choose between several variants (size, colour...). False = one simple item. */
        hasOptions: z.boolean(),
        /** `attributes` = structured option types and values (Colour, Size...). `names` = legacy free-text option names. */
        optionsMode: z.enum(['attributes', 'names']),
        optionTypes: z.array(optionTypeSchema).max(MAX_OPTION_TYPES),
        /** Prefill helpers for the option matrix. Not saved. */
        baseSku: z.string().trim().max(80, 'Keep this under 80 characters'),
        basePrice: z.string().trim(),
        name: z.string().trim().min(3, 'Enter a title of at least 3 characters').max(255, 'Keep the title under 255 characters'),
        description: z.string().trim().max(5000, 'Keep the description under 5000 characters'),
        keywords: z.string().trim().max(255, 'Keep keywords under 255 characters'),
        category: z.string().min(1, 'Choose a category'),
        sub_category: z.string().min(1, 'Choose a subcategory'),
        brand: z.string().min(1, 'Choose a brand'),
        condition: z.enum(CONDITIONS),
        variants: z.array(variantSchema).max(MAX_MATRIX, `A listing can have up to ${MAX_MATRIX} variants`),
        discount_percentage: z
            .string()
            .trim()
            .regex(/^\d{1,2}$/, 'Enter a whole percentage from 0 to 99'),
        free_shipping: z.boolean(),
    })
    .superRefine((value, ctx) => {
        const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
        const structured = value.hasOptions && value.optionsMode === 'attributes';
        const rows = value.variants.map((variant, index) => ({ variant, index })).filter(({ variant }) => variant.enabled);

        const seenSkus = new Set<string>();
        const seenNames = new Set<string>();
        const seenCombos = new Set<string>();
        rows.forEach(({ variant, index }) => {
            const sku = variant.sku.trim().toLowerCase();
            if (!sku) issue(['variants', index, 'sku'], 'Enter a SKU');
            else if (seenSkus.has(sku)) issue(['variants', index, 'sku'], 'This SKU is used by another variant');
            seenSkus.add(sku);

            const price = variant.price.trim();
            if (!price) issue(['variants', index, 'price'], 'Enter a price');
            else if (!/^\d{1,8}(\.\d{1,2})?$/.test(price)) issue(['variants', index, 'price'], 'Enter an amount up to 2 decimals');
            else if (!structured && Number(price) <= 0) issue(['variants', index, 'price'], 'Enter an amount above 0');

            if (!/^\d{1,7}$/.test(variant.quantity.trim())) issue(['variants', index, 'quantity'], 'Enter a whole number, 0 or more');

            if (structured) {
                const key = (variant.valueIds ?? []).join('|');
                if (seenCombos.has(key)) issue(['variants', index, 'sku'], 'Another row has the same options');
                seenCombos.add(key);
            } else if (value.hasOptions) {
                const name = variant.name.trim().toLowerCase();
                if (!name) issue(['variants', index, 'name'], 'Name this option, e.g. Red / Large');
                else if (isGenericVariantName(name)) issue(['variants', index, 'name'], 'Use a name that tells buyers what they are choosing, e.g. Red / Large (not "Default" or "Standard")');
                else if (seenNames.has(name)) issue(['variants', index, 'name'], 'Another variant already has this name');
                seenNames.add(name);
            }
        });

        if (structured) {
            if (value.optionTypes.length === 0) issue(['optionTypes'], 'Choose at least one option type, e.g. Colour or Size');
            value.optionTypes.forEach((t, i) => {
                if (t.values.length === 0) issue(['optionTypes', i], `Choose at least one ${t.name.toLowerCase()} value`);
            });
            if (countCombos(value.optionTypes) > MAX_MATRIX) issue(['optionTypes'], `That makes more than ${MAX_MATRIX} combinations. Remove some values.`);
            else if (value.optionTypes.length > 0 && rows.length === 0) issue(['variants'], 'Offer at least one option');
        } else {
            if (value.hasOptions && rows.length < 2) issue(['variants'], 'Add at least two options or turn this off');
            if (value.hasOptions && value.variants.length > MAX_NAMED_VARIANTS) issue(['variants'], `A listing can have up to ${MAX_NAMED_VARIANTS} variants`);
            if (!value.hasOptions && value.variants.length > 1) issue(['variants'], 'Turn on "This product has options" to sell more than one variant');
            if (!value.hasOptions && value.variants.length < 1) issue(['variants'], 'Add a price and stock');
        }
    });

export type ListingFormValues = z.infer<typeof listingSchema>;
export type VariantFormValues = ListingFormValues['variants'][number];
export type OptionType = ListingFormValues['optionTypes'][number];
export type OptionValue = OptionType['values'][number];

export const emptyVariant = (): VariantFormValues => ({ name: '', sku: '', price: '', quantity: '0', enabled: true });

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
});

const isCondition = (v: string | null): v is (typeof CONDITIONS)[number] => CONDITIONS.some((c) => c === v);

export function valuesFromServer(product: ProductDetail, variants: VariantDetail[]): ListingFormValues {
    // One variant is not a choice, so it opens as a simple product (legacy "Default" names are cleared and saved as blank).
    const hasOptions = variants.length > 1;
    const inferred = hasOptions ? inferOptionTypes(variants) : null;
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
    };
    if (variants.length === 0) return base;

    const rows: ListingFormValues['variants'] = variants.map((v) => ({
        serverId: String(v.id),
        name: hasOptions && !inferred ? (v.name ?? '') : '',
        sku: v.sku ?? '',
        price: v.price ?? '',
        quantity: String(v.quantity ?? 0),
        enabled: true,
        ...(inferred ? { valueIds: inferred.idsByVariant.get(String(v.id)) } : {}),
    }));
    // Saved combinations stay on; combinations that were never created appear switched off so they can be offered later.
    base.variants = inferred ? syncMatrix(inferred.types, rows, { baseSku: '', basePrice: '' }).map((r) => (r.serverId ? r : { ...r, enabled: false, sku: '', skuAuto: false })) : rows;
    return base;
}

/** One gallery entry. `file` is set for images not yet uploaded; `id` for saved ones. The first entry is the main image. */
export interface ImageItem {
    key: string;
    url: string;
    file?: File;
    id?: string;
    /** Variant the saved image is attached to (the API requires one). */
    variantId?: string;
    /** Server-side `is_main` when loaded, to decide whether a PATCH is needed. */
    savedMain?: boolean;
    /** Colour (picture-type option value id) this picture belongs to. Buyers see it for every variant of that colour. */
    optionValueId?: string;
}

export const imagesFromServer = (rows: ImageDetail[], variants: VariantDetail[] = []): ImageItem[] => {
    const groupByVariant = new Map(variants.map((v) => [String(v.id), pictureValueOfVariant(v)] as const));
    return rows
        .filter((r) => r.image)
        .map((r) => ({
            key: `srv-${r.id}`,
            id: String(r.id),
            url: r.image as string,
            variantId: String(r.product_variant),
            savedMain: r.is_main,
            optionValueId: groupByVariant.get(String(r.product_variant)),
        }));
};

export type StepId = 'details' | 'variants' | 'images' | 'shipping' | 'review';

export const STEPS: { id: StepId; label: string; fields: (keyof ListingFormValues)[] }[] = [
    { id: 'details', label: 'Details', fields: ['name', 'description', 'keywords', 'category', 'sub_category', 'brand', 'condition'] },
    { id: 'variants', label: 'Variants & stock', fields: ['hasOptions', 'optionsMode', 'optionTypes', 'baseSku', 'basePrice', 'variants', 'discount_percentage'] },
    { id: 'images', label: 'Images', fields: [] },
    { id: 'shipping', label: 'Shipping', fields: ['free_shipping'] },
    { id: 'review', label: 'Review', fields: [] },
];

/** Index of the step that owns a form field path such as `variants.0.sku`. */
export function stepIndexForField(path: string): number {
    const root = path.split('.')[0] as keyof ListingFormValues;
    const idx = STEPS.findIndex((s) => s.fields.includes(root));
    return idx === -1 ? STEPS.length - 1 : idx;
}
