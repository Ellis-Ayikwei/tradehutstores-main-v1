import { z } from 'zod';
import { CONDITIONS, type ImageDetail, type ProductDetail, type VariantDetail } from '@/services/sellerListingsService';

export const MAX_IMAGES = 10;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] } as const;

const price = z
    .string()
    .trim()
    .min(1, 'Enter a price')
    .refine((v) => /^\d{1,8}(\.\d{1,2})?$/.test(v) && Number(v) > 0, 'Enter an amount above 0, up to 2 decimals');

const variantSchema = z.object({
    /** Server id once the variant has been saved. */
    serverId: z.string().optional(),
    name: z.string().trim().max(255, 'Keep this under 255 characters'),
    sku: z.string().trim().min(1, 'Enter a SKU').max(100, 'Keep the SKU under 100 characters'),
    price,
    quantity: z
        .string()
        .trim()
        .regex(/^\d{1,7}$/, 'Enter a whole number, 0 or more'),
});

export const listingSchema = z
    .object({
        name: z.string().trim().min(3, 'Enter a title of at least 3 characters').max(255, 'Keep the title under 255 characters'),
        description: z.string().trim().max(5000, 'Keep the description under 5000 characters'),
        keywords: z.string().trim().max(255, 'Keep keywords under 255 characters'),
        category: z.string().min(1, 'Choose a category'),
        sub_category: z.string().min(1, 'Choose a subcategory'),
        brand: z.string().min(1, 'Choose a brand'),
        condition: z.enum(CONDITIONS),
        variants: z.array(variantSchema).min(1, 'Add at least one variant').max(50, 'A listing can have up to 50 variants'),
        discount_percentage: z
            .string()
            .trim()
            .regex(/^\d{1,2}$/, 'Enter a whole percentage from 0 to 99'),
        free_shipping: z.boolean(),
    })
    .superRefine((value, ctx) => {
        const seenSkus = new Map<string, number>();
        const seenNames = new Map<string, number>();
        value.variants.forEach((variant, index) => {
            const sku = variant.sku.trim().toLowerCase();
            if (sku) {
                if (seenSkus.has(sku)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['variants', index, 'sku'], message: 'This SKU is used by another variant' });
                seenSkus.set(sku, index);
            }
            if (value.variants.length > 1) {
                const name = variant.name.trim().toLowerCase();
                if (!name) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['variants', index, 'name'], message: 'Name this option, e.g. Red / Large' });
                else if (seenNames.has(name)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['variants', index, 'name'], message: 'Another variant already has this name' });
                seenNames.set(name, index);
            }
        });
    });

export type ListingFormValues = z.infer<typeof listingSchema>;
export type VariantFormValues = ListingFormValues['variants'][number];

export const emptyVariant = (): VariantFormValues => ({ name: '', sku: '', price: '', quantity: '0' });

export const defaultListingValues = (): ListingFormValues => ({
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
    return {
        name: product.name ?? '',
        description: product.description ?? '',
        keywords: product.keywords ?? '',
        category: product.category ? String(product.category) : '',
        sub_category: product.sub_category ? String(product.sub_category) : '',
        brand: product.brand ? String(product.brand) : '',
        condition: isCondition(product.condition) ? product.condition : 'New',
        variants: variants.length
            ? variants.map((v) => ({ serverId: String(v.id), name: v.name ?? '', sku: v.sku ?? '', price: v.price ?? '', quantity: String(v.quantity ?? 0) }))
            : [emptyVariant()],
        discount_percentage: String(product.discount_percentage ?? 0),
        free_shipping: Boolean(product.free_shipping),
    };
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
}

export const imagesFromServer = (rows: ImageDetail[]): ImageItem[] =>
    rows
        .filter((r) => r.image)
        .map((r) => ({ key: `srv-${r.id}`, id: String(r.id), url: r.image as string, variantId: String(r.product_variant), savedMain: r.is_main }));

export type StepId = 'details' | 'variants' | 'images' | 'shipping' | 'review';

export const STEPS: { id: StepId; label: string; fields: (keyof ListingFormValues)[] }[] = [
    { id: 'details', label: 'Details', fields: ['name', 'description', 'keywords', 'category', 'sub_category', 'brand', 'condition'] },
    { id: 'variants', label: 'Variants & stock', fields: ['variants', 'discount_percentage'] },
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
