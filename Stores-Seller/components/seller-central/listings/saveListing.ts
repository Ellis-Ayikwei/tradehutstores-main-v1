import {
    createProduct,
    createVariant,
    deleteImage,
    deleteVariant,
    toListingSaveError,
    updateImage,
    updateProduct,
    updateVariant,
    uploadImage,
    type ProductWrite,
    type VariantWrite,
} from '@/lib/seller/listings';
import { themeForTypes } from './optionUtils';
import type { ImageItem, ListingFormValues } from './schema';

export type SaveAction = 'draft' | 'publish' | 'save';

export interface SaveInput {
    values: ListingFormValues;
    images: ImageItem[];
    action: SaveAction;
    /** Set when editing, or after an earlier attempt already created the product. */
    productId?: string;
    /** Variant ids that exist on the server right now (to find ones the seller removed). */
    serverVariantIds: string[];
    /** Image ids that exist on the server right now. */
    serverImageIds: string[];
}

/** Reports progress as it happens so a failed save can be retried without creating duplicates. */
export interface SaveProgress {
    onProduct: (productId: string) => void;
    onVariant: (index: number, variantId: string) => void;
    onImages: (images: ImageItem[]) => void;
    onVariantsPruned: (ids: string[]) => void;
}

export interface SaveResult {
    productId: string;
}

const isStructured = (v: ListingFormValues) => v.hasOptions && v.optionsMode === 'attributes';

/** `single` for a simple item, a known theme (e.g. size-color) for structured options, `custom` for named options. */
const themeFor = (v: ListingFormValues): string => {
    if (!v.hasOptions) return 'single';
    return isStructured(v) ? themeForTypes(v.optionTypes) : 'custom';
};

const toWrite = (v: ListingFormValues): ProductWrite => ({
    name: v.name.trim(),
    description: v.description.trim(),
    keywords: v.keywords.trim() || v.name.trim().slice(0, 255),
    category: v.category,
    sub_category: v.sub_category,
    brand: v.brand,
    condition: v.condition,
    discount_percentage: Number(v.discount_percentage) || 0,
    free_shipping: v.free_shipping,
    variation_theme: themeFor(v),
    available: true,
});

/**
 * Saves a listing as: product -> variants -> images -> (default variant + status).
 * Status is applied last so a half-finished save can never leave a broken product public:
 * new products are created as Draft; `publish` flips to Active only after everything else succeeded.
 * Every step is safe to repeat (ids are reported through `progress` and reused on retry).
 */
export async function saveListing(input: SaveInput, progress: SaveProgress): Promise<SaveResult> {
    const { values, action } = input;
    const structured = isStructured(values);
    let productId = input.productId;

    try {
        if (productId) {
            await updateProduct(productId, toWrite(values));
        } else {
            const created = await createProduct({ ...toWrite(values), status: 'Draft' });
            productId = String(created.id);
            progress.onProduct(productId);
        }
    } catch (err) {
        throw toListingSaveError(err, '', 'Could not save the listing details');
    }

    // Only switched-on rows are saved; `index` stays the row's position in the form so errors land on the right row.
    const rows = values.variants.map((variant, index) => ({ variant, index })).filter(({ variant }) => variant.enabled);
    const savedRows: { variantId: string; valueIds: string[] }[] = [];
    for (const { variant: v, index: i } of rows) {
        // A simple product has nothing for buyers to choose, so its single variant is saved with a blank name
        // (the API allows blank). Structured options are saved with a blank name too: buyers see the attribute values.
        // Never a placeholder such as "Default": the storefront would show it to buyers.
        const body: Omit<VariantWrite, 'product'> = {
            sku: v.sku.trim(),
            price: v.price.trim(),
            quantity: Number(v.quantity),
            name: values.hasOptions && !structured ? v.name.trim() : '',
        };
        // Structured rows send their value ids. Other rows leave attributes alone, except a row that used to be structured
        // (valueIds present) which is cleared so stale values do not linger.
        if (structured) body.attribute_values = v.valueIds ?? [];
        else if (v.valueIds !== undefined) body.attribute_values = [];
        try {
            if (v.serverId) {
                await updateVariant(v.serverId, body);
                savedRows.push({ variantId: v.serverId, valueIds: v.valueIds ?? [] });
            } else {
                const created = await createVariant({ product: productId, ...body, min_buy_amount: 1 });
                savedRows.push({ variantId: String(created.id), valueIds: v.valueIds ?? [] });
                progress.onVariant(i, String(created.id));
            }
        } catch (err) {
            throw toListingSaveError(err, `variants.${i}.`, `Could not save variant ${i + 1}`);
        }
    }
    const anchorVariantId = savedRows[0].variantId;
    const keptVariantIds = new Set(savedRows.map((r) => r.variantId));
    const valueIdsByVariant = new Map(savedRows.map((r) => [r.variantId, r.valueIds]));

    // The colour a picture belongs to decides which variant carries it; any variant of that colour will do.
    const pictureTypeIndex = structured ? values.optionTypes.findIndex((t) => t.displayType === 'swatch' || t.displayType === 'image' || /^colou?rs?$/i.test(t.name.trim())) : -1;
    const groupOf = (img: ImageItem) => (pictureTypeIndex >= 0 ? img.optionValueId : undefined);
    const variantForGroup = (groupId: string) => savedRows.find((r) => r.valueIds[pictureTypeIndex] === groupId)?.variantId;
    /** Where a picture should live, or null when its colour is no longer offered (the picture is then dropped). */
    const targetFor = (img: ImageItem): string | null => {
        const group = groupOf(img);
        if (group) {
            if (img.variantId && keptVariantIds.has(img.variantId) && valueIdsByVariant.get(img.variantId)?.[pictureTypeIndex] === group) return img.variantId;
            return variantForGroup(group) ?? null;
        }
        return img.variantId && keptVariantIds.has(img.variantId) ? img.variantId : anchorVariantId;
    };

    // Images belong to a variant and are deleted with it, so move them before pruning variants.
    const staleVariantIds = input.serverVariantIds.filter((id) => !keptVariantIds.has(id));
    let images = input.images.filter((img) => targetFor(img) !== null);
    try {
        for (const img of images) {
            const target = targetFor(img) as string;
            if (img.id && img.variantId !== target) {
                await updateImage(img.id, { product_variant: target });
                images = images.map((x) => (x.key === img.key ? { ...x, variantId: target } : x));
            }
        }
        for (const id of staleVariantIds) await deleteVariant(id);
        if (staleVariantIds.length) progress.onVariantsPruned(staleVariantIds);
    } catch (err) {
        throw toListingSaveError(err, '', 'Could not remove a deleted variant');
    }

    try {
        const keptImageIds = new Set(images.filter((i) => i.id).map((i) => i.id as string));
        for (const id of input.serverImageIds) {
            if (!keptImageIds.has(id)) await deleteImage(id);
        }

        // Demote first, then promote, so there is never a moment with two main images.
        for (let i = 0; i < images.length; i += 1) {
            const img = images[i];
            if (img.id && i !== 0 && img.savedMain) {
                await updateImage(img.id, { is_main: false, image_type: 'supplementary' });
                images = images.map((x) => (x.key === img.key ? { ...x, savedMain: false } : x));
            }
        }
        const first = images[0];
        if (first?.id && !first.savedMain) {
            await updateImage(first.id, { is_main: true, image_type: 'main' });
            images = images.map((x) => (x.key === first.key ? { ...x, savedMain: true } : x));
        }

        // Upload in gallery order so the stored order (by creation time) matches what the seller arranged.
        for (let i = 0; i < images.length; i += 1) {
            const img = images[i];
            if (img.file) {
                const target = targetFor(img) as string;
                const saved = await uploadImage({ productId, variantId: target, file: img.file, isMain: i === 0 });
                images = images.map((x) => (x.key === img.key ? { key: x.key, id: String(saved.id), url: saved.image || x.url, variantId: target, savedMain: i === 0, optionValueId: x.optionValueId } : x));
            }
        }
        progress.onImages(images);
    } catch (err) {
        progress.onImages(images);
        throw toListingSaveError(err, '', 'Could not save the images');
    }

    try {
        await updateProduct(productId, {
            default_variant: anchorVariantId,
            ...(action === 'publish' ? { status: 'Active' } : action === 'draft' ? { status: 'Draft' } : {}),
        });
    } catch (err) {
        throw toListingSaveError(err, '', action === 'publish' ? 'Everything was saved but publishing failed' : 'Could not finish saving');
    }

    return { productId };
}
