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
} from '@/services/sellerListingsService';
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
    variation_theme: v.variants.length > 1 ? 'custom' : 'single',
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

    const variantIds: string[] = [];
    for (let i = 0; i < values.variants.length; i += 1) {
        const v = values.variants[i];
        const body = { sku: v.sku.trim(), price: v.price.trim(), quantity: Number(v.quantity), name: v.name.trim() };
        try {
            if (v.serverId) {
                await updateVariant(v.serverId, body);
                variantIds.push(v.serverId);
            } else {
                const created = await createVariant({ product: productId, ...body, min_buy_amount: 1 });
                variantIds.push(String(created.id));
                progress.onVariant(i, String(created.id));
            }
        } catch (err) {
            throw toListingSaveError(err, `variants.${i}.`, `Could not save variant ${i + 1}`);
        }
    }
    const anchorVariantId = variantIds[0];
    const keptVariantIds = new Set(variantIds);

    // Images belong to a variant and are deleted with it, so move them to the first variant before pruning.
    const staleVariantIds = input.serverVariantIds.filter((id) => !keptVariantIds.has(id));
    let images = input.images;
    try {
        for (const img of images) {
            if (img.id && img.variantId && staleVariantIds.includes(img.variantId)) {
                await updateImage(img.id, { product_variant: anchorVariantId });
                images = images.map((x) => (x.key === img.key ? { ...x, variantId: anchorVariantId } : x));
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
                const saved = await uploadImage({ productId, variantId: anchorVariantId, file: img.file, isMain: i === 0 });
                images = images.map((x) => (x.key === img.key ? { key: x.key, id: String(saved.id), url: saved.image || x.url, variantId: anchorVariantId, savedMain: i === 0 } : x));
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
