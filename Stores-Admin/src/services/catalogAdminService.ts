/**
 * Staff catalog API. Requires Django is_staff + JWT (same as other admin APIs).
 */
import axiosInstance from './axiosInstance';

const P = (path: string) => `catalog/admin/${path}`;

export const catalogAdminApi = {
    categories: () => P('categories/'),
    category: (id: string) => P(`categories/${id}/`),
    subcategories: (categoryId?: string) => {
        const base = P('subcategories/');
        return categoryId ? `${base}?category=${encodeURIComponent(categoryId)}` : base;
    },
    subcategory: (id: string) => P(`subcategories/${id}/`),
    attributes: () => P('attributes/'),
    attribute: (id: string) => P(`attributes/${id}/`),
    attributeValues: (attributeId?: string) => {
        const base = P('attribute-values/');
        return attributeId ? `${base}?attribute=${encodeURIComponent(attributeId)}` : base;
    },
    attributeValue: (id: string) => P(`attribute-values/${id}/`),
    brands: (categoryId?: string) => {
        const base = P('brands/');
        return categoryId ? `${base}?category=${encodeURIComponent(categoryId)}` : base;
    },
    brand: (id: string) => P(`brands/${id}/`),
};

export interface AdminCategory {
    id: string;
    name: string;
    description?: string | null;
    created_at: string;
    updated_at: string;
}

export interface AdminSubcategory {
    id: string;
    sub_category_name: string;
    category: string;
    category_name?: string;
    created_at: string;
    updated_at: string;
}

export type AttributeDisplayType = 'dropdown' | 'swatch' | 'image' | 'text';

export interface AdminAttribute {
    id: string;
    name: string;
    display_type: AttributeDisplayType;
    created_at: string;
    updated_at: string;
}

export interface AdminAttributeValue {
    id: string;
    attribute: string;
    attribute_name?: string;
    value_name?: string | null;
    color_code?: string;
    image?: string | null;
    created_at: string;
    updated_at: string;
}

export interface AdminBrand {
    id: string;
    name: string;
    category?: string | null;
    category_name?: string;
    created_at: string;
    updated_at: string;
}

export async function fetchJson<T>(url: string): Promise<T> {
    const res = await axiosInstance.get(url);
    return res.data as T;
}

export async function listCategories(): Promise<AdminCategory[]> {
    return fetchJson<AdminCategory[]>(catalogAdminApi.categories());
}

export async function listSubcategories(categoryId?: string): Promise<AdminSubcategory[]> {
    return fetchJson<AdminSubcategory[]>(catalogAdminApi.subcategories(categoryId));
}

export async function listAttributes(): Promise<AdminAttribute[]> {
    return fetchJson<AdminAttribute[]>(catalogAdminApi.attributes());
}

export async function listAttributeValues(attributeId?: string): Promise<AdminAttributeValue[]> {
    return fetchJson<AdminAttributeValue[]>(catalogAdminApi.attributeValues(attributeId));
}

export async function listBrands(categoryId?: string): Promise<AdminBrand[]> {
    return fetchJson<AdminBrand[]>(catalogAdminApi.brands(categoryId));
}
