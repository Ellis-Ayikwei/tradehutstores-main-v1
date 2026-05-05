/**
 * Staff merchandising API — requires Django user.is_staff + JWT.
 */
import axiosInstance from './axiosInstance';
import type { AxiosError } from 'axios';

const BASE = 'homepage/admin/sections/';
const ITEMS_BASE = 'homepage/admin/section-items/';

export interface PopulationRulePayload {
    rule_type: string;
    lookback_days: number;
    min_rating: string | number;
    tag: string;
    category: string | null;
    low_stock_threshold: number;
    only_in_stock: boolean;
    only_available: boolean;
    min_price: string | number | null;
    max_price: string | number | null;
    cache_minutes: number;
}

export interface HomepageSectionAdminList {
    id: number;
    title: string;
    subtitle: string;
    slug: string;
    section_type: string;
    strategy: string;
    max_products: number;
    position: number;
    is_active: boolean;
    is_live: boolean;
    starts_at: string | null;
    ends_at: string | null;
    show_countdown: boolean;
    background_color: string;
    accent_color: string;
    items_count: number;
    rule_type: string | null;
    created_at: string;
    updated_at: string;
}

export interface HomepageSectionItemRow {
    id: number;
    product: string;
    product_name: string;
    position: number;
    is_pinned: boolean;
    label_override: string;
}

export interface HomepageSectionAdminDetail extends HomepageSectionAdminList {
    rule: PopulationRulePayload | null;
    items: HomepageSectionItemRow[];
}

export interface SectionWritePayload {
    title: string;
    subtitle: string;
    slug: string;
    section_type: string;
    max_products: number;
    position: number;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    strategy: string;
    background_color: string;
    accent_color: string;
    show_countdown: boolean;
    rule: PopulationRulePayload | null;
}

export async function fetchMerchSections(): Promise<HomepageSectionAdminList[]> {
    const { data } = await axiosInstance.get<HomepageSectionAdminList[]>(BASE);
    return Array.isArray(data) ? data : [];
}

export async function fetchMerchSectionDetail(id: number): Promise<HomepageSectionAdminDetail> {
    const { data } = await axiosInstance.get<HomepageSectionAdminDetail>(`${BASE}${id}/`);
    return data;
}

export async function createMerchSection(body: SectionWritePayload): Promise<HomepageSectionAdminDetail> {
    const { data } = await axiosInstance.post<HomepageSectionAdminDetail>(BASE, body);
    return data;
}

export async function patchMerchSection(id: number, body: Partial<SectionWritePayload>): Promise<HomepageSectionAdminDetail> {
    const { data } = await axiosInstance.patch<HomepageSectionAdminDetail>(`${BASE}${id}/`, body);
    return data;
}

export async function deleteMerchSection(id: number): Promise<void> {
    await axiosInstance.delete(`${BASE}${id}/`);
}

export async function addSectionItem(sectionId: number, productId: string, position = 0): Promise<void> {
    await axiosInstance.post(ITEMS_BASE, {
        section: sectionId,
        product: productId,
        position,
        is_pinned: false,
        label_override: '',
    });
}

export async function deleteSectionItem(itemId: number): Promise<void> {
    await axiosInstance.delete(`${ITEMS_BASE}${itemId}/`);
}

export function merchAdminErrorMessage(err: unknown): string {
    const ax = err as AxiosError<{ detail?: string; [k: string]: unknown }>;
    if (ax.response?.data) {
        const d = ax.response.data as Record<string, unknown>;
        if (typeof d.detail === 'string') return d.detail;
        const first = Object.entries(d)[0];
        if (first && Array.isArray(first[1]) && typeof (first[1] as string[])[0] === 'string') {
            return `${first[0]}: ${(first[1] as string[])[0]}`;
        }
    }
    if (ax.response?.status === 403) {
        return 'Forbidden — ensure your Django user has is_staff and you are logged in with a valid admin token.';
    }
    return ax.message || 'Request failed';
}
