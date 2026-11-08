/**
 * Seller listings API (storefront Seller Central). Port of Stores-Admin `sellerListingsService`.
 * Contract: .claude/plans/20-seller-and-checkout-gaps.md (BE-PRD-1 + "what the seller Listings UI needs" addendum):
 *   GET    products/seller/                     IsSeller, paginated: ?status= &q= &low_stock=true &ordering= &page= &page_size=
 *   POST   products/                            seller_profile is forced to the caller by the server
 *   GET    products/<id>/  and  PATCH products/<id>/
 *   GET    products/<id>/variants/  and  GET products/<id>/images/
 *   POST/PATCH/DELETE products/variants/[<id>/]
 *   POST/PATCH/DELETE products/images/[<id>/]    multipart for uploads
 *   GET    sellers/me/                          used only to confirm product ownership in the editor
 * Catalog reads (public): catalog/categories/, catalog/subcategories/?category=, catalog/brands/?category=,
 *   catalog/attributes/, catalog/attribute-values/?attribute=
 *
 * Assumptions beyond the contract: `ordering=` on the seller list, and `updated_at` / `free_shipping` on list rows.
 */
import axios from 'axios'
import { sellerDelete, sellerGet, sellerPatch, sellerPost, sellerUpload } from '@/lib/seller/client'

export interface Paginated<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

/** Variants at or below this quantity are "low stock" (matches the seller stats `low_stock_variants`). */
export const LOW_STOCK_THRESHOLD = 5

export const CONDITIONS = ['New', 'Used - Like New', 'Used - Good', 'Used - Fair', 'Refurbished'] as const
export type ProductCondition = (typeof CONDITIONS)[number]

export interface ListingVariantSummary {
    id: string
    sku: string
    price: string
    quantity: number | null
    name?: string | null
}

/** One row of `GET products/seller/` (ProductSerializer output plus `variants`). */
export interface ListingRow {
    id: string
    name: string
    status: string | null
    main_product_image: string | null
    primary_sku: string | null
    primary_variant_price: string | null
    variant_stock_total: number
    pricing_currency?: string
    category_name?: string | null
    variants?: ListingVariantSummary[]
    free_shipping?: boolean
    updated_at: string
}

export interface ListingQuery {
    page: number
    pageSize: number
    search: string
    /** '' means all statuses. */
    status: string
    lowStock: boolean
    /** DRF `ordering` value, e.g. `-updated_at`. */
    ordering?: string
}

export interface ProductDetail {
    id: string
    name: string
    description: string | null
    keywords: string | null
    category: string
    sub_category: string
    brand: string
    condition: string | null
    status: string | null
    discount_percentage: number | null
    free_shipping?: boolean
    seller_profile: string | null
    default_variant: string | null
    pricing_currency?: string
}

/** One structured option on a variant (Colour: Red). From `ProductVariantAttributeValueSerializer`. */
export interface VariantAttributeValue {
    id: string
    attribute: string
    attribute_name?: string
    attribute_display_type?: string
    value_name: string | null
    color_code?: string | null
    image?: string | null
}

export interface VariantDetail {
    id: string
    sku: string
    price: string
    quantity: number | null
    name: string | null
    attribute_values?: VariantAttributeValue[]
}

export interface ImageDetail {
    id: string
    image: string | null
    is_main: boolean
    image_type: string
    product_variant: string
}

export interface SellerSelf {
    id: string
    business_name?: string
}

export interface CatalogOption {
    id: string
    label: string
}

/** An option type such as Colour or Size (`GET catalog/attributes/`). `display_type` is dropdown | swatch | image | text. */
export interface AttributeOption {
    id: string
    name: string
    displayType: string
}

/** A pickable value such as Red (`GET catalog/attribute-values/`). */
export interface AttributeValueOption {
    id: string
    attributeId: string
    attributeName: string
    label: string
    colorCode: string
    image: string | null
}

/* ------------------------------------------------------------------ errors */

export type ListingErrorKind = 'forbidden' | 'not_found' | 'network' | 'server' | 'validation' | 'unknown'

/** A failed read: a plain object so SWR can hold it. */
export interface ListingApiError {
    kind: ListingErrorKind
    message: string
    status?: number
}

const flattenMessages = (value: unknown): string => {
    if (typeof value === 'string') return value
    if (Array.isArray(value)) return value.map(flattenMessages).filter(Boolean).join(' ')
    if (value && typeof value === 'object') return Object.values(value as Record<string, unknown>).map(flattenMessages).filter(Boolean).join(' ')
    return ''
}

export function toListingApiError(err: unknown): ListingApiError {
    if (isListingApiError(err)) return err
    if (!axios.isAxiosError(err)) return { kind: 'unknown', message: 'Something went wrong. Please try again.' }
    if (!err.response) return { kind: 'network', message: "We can't reach the server. Check your connection and try again." }
    const status = err.response.status
    const data = (err.response.data ?? {}) as { detail?: unknown }
    const detail = typeof data.detail === 'string' ? data.detail : undefined
    if (status === 403) return { kind: 'forbidden', status, message: detail || "This account doesn't have an active seller profile." }
    if (status === 404) return { kind: 'not_found', status, message: detail || 'This listing was not found. It may have been removed.' }
    if (status >= 500) return { kind: 'server', status, message: 'Something went wrong on our side. Please try again.' }
    return { kind: status === 400 ? 'validation' : 'unknown', status, message: detail || 'We could not complete that. Please try again.' }
}

function isListingApiError(value: unknown): value is ListingApiError {
    return typeof value === 'object' && value !== null && 'kind' in value && 'message' in value && !axios.isAxiosError(value) && !(value instanceof Error)
}

export interface FieldIssue {
    /** Form field path, e.g. `name` or `variants.0.sku`. */
    name: string
    message: string
}

/** A write failure with enough structure for the wizard to show inline field errors. */
export class ListingSaveError extends Error {
    kind: ListingErrorKind
    status?: number
    fields: FieldIssue[]

    constructor(message: string, kind: ListingErrorKind, fields: FieldIssue[] = [], status?: number) {
        super(message)
        this.name = 'ListingSaveError'
        this.kind = kind
        this.fields = fields
        this.status = status
    }
}

/** Maps a DRF 400 body onto field issues. `prefix` rewrites field names (e.g. `variants.2.`). */
function fieldIssuesFrom(data: unknown, prefix = ''): FieldIssue[] {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return []
    const issues: FieldIssue[] = []
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        if (key === 'detail' || key === 'code' || key === 'non_field_errors') continue
        const message = flattenMessages(value)
        if (message) issues.push({ name: `${prefix}${key}`, message })
    }
    return issues
}

/**
 * Converts a thrown axios error from a product write into a ListingSaveError.
 * `fieldPrefix` is prepended to DRF field names so variant errors land on `variants.<i>.<field>`.
 */
export function toListingSaveError(err: unknown, fieldPrefix = '', context = 'Could not save this listing'): ListingSaveError {
    if (err instanceof ListingSaveError) return err
    if (axios.isAxiosError(err) && err.response?.status === 400) {
        const data = err.response.data as { detail?: unknown; non_field_errors?: unknown } | undefined
        const fields = fieldIssuesFrom(data, fieldPrefix)
        const general = typeof data?.detail === 'string' ? data.detail : flattenMessages(data?.non_field_errors)
        const message = general || (fields.length ? 'Please fix the highlighted fields.' : `${context}. Check the details and try again.`)
        return new ListingSaveError(message, 'validation', fields, 400)
    }
    const api = toListingApiError(err)
    if (api.kind === 'forbidden') return new ListingSaveError(api.message || "You don't have permission to change this listing.", 'forbidden', [], api.status)
    if (api.kind === 'not_found') return new ListingSaveError('This listing no longer exists or is not yours.', 'not_found', [], api.status)
    if (api.kind === 'network') return new ListingSaveError(api.message, 'network')
    return new ListingSaveError(`${context}. Please try again.`, api.kind, [], api.status)
}

/* ------------------------------------------------------------------- reads */

const unwrap = <T>(data: T[] | { results?: T[] } | null | undefined): T[] => (Array.isArray(data) ? data : (data?.results ?? []))

async function get<T>(url: string, params?: Record<string, string | number | boolean>): Promise<T> {
    try {
        return await sellerGet<T>(url, params)
    } catch (err) {
        throw toListingApiError(err)
    }
}

export const sellerListingsApi = {
    list: 'products/seller/',
    products: 'products/',
    product: (id: string) => `products/${encodeURIComponent(id)}/`,
    productVariants: (id: string) => `products/${encodeURIComponent(id)}/variants/`,
    productImages: (id: string) => `products/${encodeURIComponent(id)}/images/`,
    variants: 'products/variants/',
    variant: (id: string) => `products/variants/${encodeURIComponent(id)}/`,
    images: 'products/images/',
    image: (id: string) => `products/images/${encodeURIComponent(id)}/`,
    me: 'sellers/me/',
    categories: 'catalog/categories/',
    subcategories: 'catalog/subcategories/',
    brands: 'catalog/brands/',
    attributes: 'catalog/attributes/',
    attributeValues: 'catalog/attribute-values/',
}

export const fetchSellerListings = (q: ListingQuery) =>
    get<Paginated<ListingRow>>(sellerListingsApi.list, {
        page: q.page,
        page_size: q.pageSize,
        ...(q.search ? { q: q.search } : {}),
        ...(q.status ? { status: q.status } : {}),
        ...(q.lowStock ? { low_stock: 'true' } : {}),
        ...(q.ordering ? { ordering: q.ordering } : {}),
    })

export const fetchSellerSelf = () => get<SellerSelf>(sellerListingsApi.me)

export const fetchProductDetail = (id: string) => get<ProductDetail>(sellerListingsApi.product(id))

export const fetchProductVariants = async (id: string) => unwrap(await get<VariantDetail[] | { results: VariantDetail[] }>(sellerListingsApi.productVariants(id)))

export const fetchProductImages = async (id: string) => unwrap(await get<ImageDetail[] | { results: ImageDetail[] }>(sellerListingsApi.productImages(id)))

export async function fetchCategories(): Promise<CatalogOption[]> {
    const rows = unwrap(await get<{ id: string; name: string }[] | { results: { id: string; name: string }[] }>(sellerListingsApi.categories))
    return rows.map((r) => ({ id: String(r.id), label: r.name }))
}

export async function fetchSubcategories(categoryId: string): Promise<CatalogOption[]> {
    const rows = unwrap(await get<{ id: string; sub_category_name: string }[] | { results: { id: string; sub_category_name: string }[] }>(sellerListingsApi.subcategories, { category: categoryId }))
    return rows.map((r) => ({ id: String(r.id), label: r.sub_category_name }))
}

export async function fetchBrands(categoryId: string): Promise<CatalogOption[]> {
    const rows = unwrap(await get<{ id: string; name: string }[] | { results: { id: string; name: string }[] }>(sellerListingsApi.brands, { category: categoryId }))
    return rows.map((r) => ({ id: String(r.id), label: r.name }))
}

/** Option types. The API has no category link on attributes, so every type is returned. Read-only and public. */
export async function fetchAttributes(): Promise<AttributeOption[]> {
    const rows = unwrap(await get<{ id: string; name: string; display_type?: string }[] | { results: { id: string; name: string; display_type?: string }[] }>(sellerListingsApi.attributes))
    return rows.map((r) => ({ id: String(r.id), name: r.name, displayType: r.display_type ?? 'dropdown' }))
}

interface RawAttributeValue {
    id: string
    attribute: string | null
    attribute_name?: string | null
    value_name: string | null
    color_code?: string | null
    image?: string | null
}

/** Values for one option type, or every value when `attributeId` is omitted. Sellers cannot create values (read-only endpoint); they ask staff via `attributeRequests`. */
export async function fetchAttributeValues(attributeId?: string): Promise<AttributeValueOption[]> {
    const rows = unwrap(await get<RawAttributeValue[] | { results: RawAttributeValue[] }>(sellerListingsApi.attributeValues, attributeId ? { attribute: attributeId } : undefined))
    return rows
        .filter((r) => r.attribute && r.value_name)
        .map((r) => ({
            id: String(r.id),
            attributeId: String(r.attribute),
            attributeName: r.attribute_name ?? '',
            label: String(r.value_name),
            colorCode: r.color_code ?? '',
            image: r.image ?? null,
        }))
}

/* ------------------------------------------------------------------ writes */

export interface ProductWrite {
    name?: string
    description?: string
    keywords?: string
    category?: string
    sub_category?: string
    brand?: string
    condition?: string
    status?: string
    discount_percentage?: number
    free_shipping?: boolean
    variation_theme?: string
    available?: boolean
    default_variant?: string | null
}

export interface VariantWrite {
    product: string
    sku: string
    price: string
    quantity: number
    name: string
    min_buy_amount?: number
    /** AttributeValue ids. Replaces the variant's set on PATCH; omit to leave it unchanged. */
    attribute_values?: string[]
}

export const createProduct = (body: ProductWrite) => sellerPost<ProductDetail>(sellerListingsApi.products, body)

export const updateProduct = (id: string, body: ProductWrite) => sellerPatch<ProductDetail>(sellerListingsApi.product(id), body)

export const createVariant = (body: VariantWrite) => sellerPost<VariantDetail>(sellerListingsApi.variants, body)

export const updateVariant = (id: string, body: Partial<VariantWrite>) => sellerPatch<VariantDetail>(sellerListingsApi.variant(id), body)

/** Deleting something that is already gone counts as done, so a retried save does not fail. */
const ignoreMissing = (err: unknown) => {
    if (axios.isAxiosError(err) && err.response?.status === 404) return
    throw err
}

export async function deleteVariant(id: string): Promise<void> {
    await sellerDelete<unknown>(sellerListingsApi.variant(id)).catch(ignoreMissing)
}

export interface ImageUpload {
    productId: string
    variantId: string
    file: File
    isMain: boolean
}

export async function uploadImage({ productId, variantId, file, isMain }: ImageUpload): Promise<ImageDetail> {
    const fd = new FormData()
    fd.append('product', productId)
    fd.append('product_variant', variantId)
    fd.append('image', file)
    fd.append('is_main', isMain ? 'true' : 'false')
    fd.append('image_type', isMain ? 'main' : 'supplementary')
    return sellerUpload<ImageDetail>(sellerListingsApi.images, fd)
}

export const updateImage = (id: string, body: { is_main?: boolean; image_type?: string; product_variant?: string }) => sellerPatch<ImageDetail>(sellerListingsApi.image(id), body)

export async function deleteImage(id: string): Promise<void> {
    await sellerDelete<unknown>(sellerListingsApi.image(id)).catch(ignoreMissing)
}

/** Archive / restore / any status change from the list. Restore goes back to Draft so the seller re-checks before it is public. */
export async function setListingStatus(id: string, status: 'Archived' | 'Draft' | 'Active'): Promise<void> {
    try {
        await sellerPatch<unknown>(sellerListingsApi.product(id), { status })
    } catch (err) {
        throw toListingSaveError(err, '', 'Could not update this listing')
    }
}

/* ----------------------------------------------------------------- display */

/** Formats a decimal string or number with the listing's currency; falls back to a plain number if the code is unknown. */
export function formatMoney(amount: string | number | null | undefined, currency?: string): string {
    const n = typeof amount === 'number' ? amount : Number(amount)
    if (amount === null || amount === undefined || amount === '' || !Number.isFinite(n)) return '-'
    if (!currency) return n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    try {
        return new Intl.NumberFormat('en-GH', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(n)
    } catch {
        return `${currency} ${n.toFixed(2)}`
    }
}
