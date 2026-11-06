/**
 * Seller listings API. Built against the frozen contract in
 * `.claude/plans/20-seller-and-checkout-gaps.md` (section 6, BE-PRD-1):
 *   GET    products/seller/                     IsSeller, paginated: ?status= &q= &low_stock=true &page= &page_size=
 *   POST   products/                            seller_profile is forced to the caller by the server
 *   GET    products/<id>/  ·  PATCH products/<id>/
 *   GET    products/<id>/variants/  ·  GET products/<id>/images/
 *   POST/PATCH/DELETE products/variants/[<id>/]
 *   POST/PATCH/DELETE products/images/[<id>/]    multipart for uploads
 *   GET    sellers/me/                          used only to confirm product ownership in the editor
 * Catalog reads (public): catalog/categories/, catalog/subcategories/?category=, catalog/brands/?category=
 *
 * Assumptions beyond the contract (flagged in the hand-off report): `ordering=` on the seller list,
 * and `updated_at` / `free_shipping` on list rows.
 */
import axios from 'axios';
import axiosInstance from './axiosInstance';
import { toSellerApiError, type Paginated, type SellerApiError } from './sellerStatsService';

export type { Paginated, SellerApiError };
export { formatMoney } from './sellerStatsService';

/** Variants at or below this quantity are "low stock" (matches SE4 `low_stock_variants`). */
export const LOW_STOCK_THRESHOLD = 5;

export const CONDITIONS = ['New', 'Used - Like New', 'Used - Good', 'Used - Fair', 'Refurbished'] as const;
export type ProductCondition = (typeof CONDITIONS)[number];

export type ListingStatus = 'Active' | 'Published' | 'Draft' | 'Archived' | 'Pending' | 'Suspended' | 'Deactivated' | 'Deleted';

export interface ListingVariantSummary {
    id: string;
    sku: string;
    price: string;
    quantity: number | null;
    name?: string | null;
}

/** One row of `GET products/seller/` (ProductSerializer output plus `variants`). */
export interface ListingRow {
    id: string;
    name: string;
    status: ListingStatus | string | null;
    main_product_image: string | null;
    primary_sku: string | null;
    primary_variant_price: string | null;
    variant_stock_total: number;
    pricing_currency?: string;
    category_name?: string | null;
    variants?: ListingVariantSummary[];
    free_shipping?: boolean;
    updated_at: string;
}

export interface ListingQuery {
    page: number;
    pageSize: number;
    search: string;
    /** '' means all statuses. */
    status: string;
    lowStock: boolean;
    /** DRF `ordering` value, e.g. `-updated_at`. */
    ordering?: string;
}

export interface ProductDetail {
    id: string;
    name: string;
    description: string | null;
    keywords: string | null;
    category: string;
    sub_category: string;
    brand: string;
    condition: string | null;
    status: string | null;
    discount_percentage: number | null;
    free_shipping?: boolean;
    seller_profile: string | null;
    default_variant: string | null;
    pricing_currency?: string;
}

export interface VariantDetail {
    id: string;
    sku: string;
    price: string;
    quantity: number | null;
    name: string | null;
}

export interface ImageDetail {
    id: string;
    image: string | null;
    is_main: boolean;
    image_type: string;
    product_variant: string;
}

export interface SellerSelf {
    id: string;
    business_name?: string;
}

export interface CatalogOption {
    id: string;
    label: string;
}

/* ------------------------------------------------------------------ errors */

export interface FieldIssue {
    /** react-hook-form field path, e.g. `name` or `variants.0.sku`. */
    name: string;
    message: string;
}

/** A write failure with enough structure for the wizard to show inline field errors. */
export class ListingSaveError extends Error {
    kind: SellerApiError['kind'] | 'validation';
    status?: number;
    fields: FieldIssue[];

    constructor(message: string, kind: ListingSaveError['kind'], fields: FieldIssue[] = [], status?: number) {
        super(message);
        this.name = 'ListingSaveError';
        this.kind = kind;
        this.fields = fields;
        this.status = status;
    }
}

const flattenMessages = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(flattenMessages).filter(Boolean).join(' ');
    if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map(flattenMessages).filter(Boolean).join(' ');
    return '';
};

/** Maps a DRF 400 body onto field issues. `prefix` rewrites field names (e.g. `variants.2.`). */
function fieldIssuesFrom(data: unknown, prefix = ''): FieldIssue[] {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
    const issues: FieldIssue[] = [];
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (key === 'detail' || key === 'code' || key === 'non_field_errors') continue;
        const message = flattenMessages(value);
        if (message) issues.push({ name: `${prefix}${key}`, message });
    }
    return issues;
}

/**
 * Converts a thrown axios error from a product write into a ListingSaveError.
 * `fieldPrefix` is prepended to DRF field names so variant errors land on `variants.<i>.<field>`.
 */
export function toListingSaveError(err: unknown, fieldPrefix = '', context = 'Could not save this listing'): ListingSaveError {
    if (err instanceof ListingSaveError) return err;
    if (axios.isAxiosError(err) && err.response?.status === 400) {
        const data = err.response.data as { detail?: unknown; non_field_errors?: unknown } | undefined;
        const fields = fieldIssuesFrom(data, fieldPrefix);
        const general = typeof data?.detail === 'string' ? data.detail : flattenMessages(data?.non_field_errors);
        const message = general || (fields.length ? 'Please fix the highlighted fields.' : `${context}. Check the details and try again.`);
        return new ListingSaveError(message, 'validation', fields, 400);
    }
    const api = toSellerApiError(err);
    if (api.kind === 'forbidden') return new ListingSaveError(api.message || "You don't have permission to change this listing.", 'forbidden', [], api.status);
    if (api.kind === 'not_found') return new ListingSaveError('This listing no longer exists or is not yours.', 'not_found', [], api.status);
    if (api.kind === 'network') return new ListingSaveError(api.message, 'network');
    return new ListingSaveError(`${context}. Please try again.`, api.kind, [], api.status);
}

/* ------------------------------------------------------------------- reads */

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    try {
        const res = await axiosInstance.get<T>(url, { params });
        return res.data;
    } catch (err) {
        throw toSellerApiError(err);
    }
}

const unwrap = <T>(data: T[] | { results?: T[] } | null | undefined): T[] => (Array.isArray(data) ? data : (data?.results ?? []));

export const sellerListingsApi = {
    list: 'products/seller/',
    products: 'products/',
    product: (id: string) => `products/${id}/`,
    productVariants: (id: string) => `products/${id}/variants/`,
    productImages: (id: string) => `products/${id}/images/`,
    variants: 'products/variants/',
    variant: (id: string) => `products/variants/${id}/`,
    images: 'products/images/',
    image: (id: string) => `products/images/${id}/`,
    me: 'sellers/me/',
    categories: 'catalog/categories/',
    subcategories: 'catalog/subcategories/',
    brands: 'catalog/brands/',
};

export const fetchSellerListings = (q: ListingQuery) =>
    get<Paginated<ListingRow>>(sellerListingsApi.list, {
        page: q.page,
        page_size: q.pageSize,
        ...(q.search ? { q: q.search } : {}),
        ...(q.status ? { status: q.status } : {}),
        ...(q.lowStock ? { low_stock: 'true' } : {}),
        ...(q.ordering ? { ordering: q.ordering } : {}),
    });

export const fetchSellerSelf = () => get<SellerSelf>(sellerListingsApi.me);

export const fetchProductDetail = (id: string) => get<ProductDetail>(sellerListingsApi.product(id));

export const fetchProductVariants = async (id: string) => unwrap(await get<VariantDetail[] | { results: VariantDetail[] }>(sellerListingsApi.productVariants(id)));

export const fetchProductImages = async (id: string) => unwrap(await get<ImageDetail[] | { results: ImageDetail[] }>(sellerListingsApi.productImages(id)));

export async function fetchCategories(): Promise<CatalogOption[]> {
    const rows = unwrap(await get<{ id: string; name: string }[] | { results: { id: string; name: string }[] }>(sellerListingsApi.categories));
    return rows.map((r) => ({ id: String(r.id), label: r.name }));
}

export async function fetchSubcategories(categoryId: string): Promise<CatalogOption[]> {
    const rows = unwrap(await get<{ id: string; sub_category_name: string }[] | { results: { id: string; sub_category_name: string }[] }>(sellerListingsApi.subcategories, { category: categoryId }));
    return rows.map((r) => ({ id: String(r.id), label: r.sub_category_name }));
}

export async function fetchBrands(categoryId: string): Promise<CatalogOption[]> {
    const rows = unwrap(await get<{ id: string; name: string }[] | { results: { id: string; name: string }[] }>(sellerListingsApi.brands, { category: categoryId }));
    return rows.map((r) => ({ id: String(r.id), label: r.name }));
}

/* ------------------------------------------------------------------ writes */

export interface ProductWrite {
    name?: string;
    description?: string;
    keywords?: string;
    category?: string;
    sub_category?: string;
    brand?: string;
    condition?: string;
    status?: string;
    discount_percentage?: number;
    free_shipping?: boolean;
    variation_theme?: string;
    available?: boolean;
    default_variant?: string | null;
}

export interface VariantWrite {
    product: string;
    sku: string;
    price: string;
    quantity: number;
    name: string;
    min_buy_amount?: number;
}

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export async function createProduct(body: ProductWrite): Promise<ProductDetail> {
    const res = await axiosInstance.post<ProductDetail>(sellerListingsApi.products, body);
    return res.data;
}

export async function updateProduct(id: string, body: ProductWrite): Promise<ProductDetail> {
    const res = await axiosInstance.patch<ProductDetail>(sellerListingsApi.product(id), body);
    return res.data;
}

export async function createVariant(body: VariantWrite): Promise<VariantDetail> {
    const res = await axiosInstance.post<VariantDetail>(sellerListingsApi.variants, body);
    return res.data;
}

export async function updateVariant(id: string, body: Partial<VariantWrite>): Promise<VariantDetail> {
    const res = await axiosInstance.patch<VariantDetail>(sellerListingsApi.variant(id), body);
    return res.data;
}

/** Deleting something that is already gone counts as done, so a retried save does not fail. */
const ignoreMissing = (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 404) return;
    throw err;
};

export async function deleteVariant(id: string): Promise<void> {
    await axiosInstance.delete(sellerListingsApi.variant(id)).catch(ignoreMissing);
}

export interface ImageUpload {
    productId: string;
    variantId: string;
    file: File;
    isMain: boolean;
}

export async function uploadImage({ productId, variantId, file, isMain }: ImageUpload): Promise<ImageDetail> {
    const fd = new FormData();
    fd.append('product', productId);
    fd.append('product_variant', variantId);
    fd.append('image', file);
    fd.append('is_main', isMain ? 'true' : 'false');
    fd.append('image_type', isMain ? 'main' : 'supplementary');
    const res = await axiosInstance.post<ImageDetail>(sellerListingsApi.images, fd, multipart);
    return res.data;
}

export async function updateImage(id: string, body: { is_main?: boolean; image_type?: string; product_variant?: string }): Promise<ImageDetail> {
    const res = await axiosInstance.patch<ImageDetail>(sellerListingsApi.image(id), body);
    return res.data;
}

export async function deleteImage(id: string): Promise<void> {
    await axiosInstance.delete(sellerListingsApi.image(id)).catch(ignoreMissing);
}

/** Archive / restore / any status change from the list. Restore goes back to Draft so the seller re-checks before it is public. */
export async function setListingStatus(id: string, status: 'Archived' | 'Draft' | 'Active'): Promise<void> {
    try {
        await axiosInstance.patch(sellerListingsApi.product(id), { status });
    } catch (err) {
        throw toListingSaveError(err, '', 'Could not update this listing');
    }
}
