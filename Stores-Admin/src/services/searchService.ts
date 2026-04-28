/**
 * Stores-Admin search ops service.
 *
 * Mirrors `Stores-FE/lib/searchClient.ts` but typed for the admin dashboard.
 * Uses the existing `axiosInstance` so authentication + token refresh keep
 * working without a separate plumbing layer.
 *
 * Every method swallows network failures and returns a sane shape — the
 * Admin dashboard renders a "subsystem unreachable" banner instead of
 * blowing up when the backend is offline.
 */

import axiosInstance from './axiosInstance';

export interface AdminSearchHit {
    id: string;
    name: string;
    price?: number | null;
    image?: string | null;
    category?: string | null;
    brand?: string | null;
    final_price?: number | null;
    rating?: number | null;
    score?: number;
    similarity?: number;
}

export interface AdminSearchResponse {
    total: number;
    page: number;
    page_size: number;
    results: AdminSearchHit[];
    facets?: {
        categories: { label: string; count: number | null }[];
        brands: { label: string; count: number | null }[];
        price_stats?: { min?: number | null; max?: number | null; avg?: number | null };
    };
    engine: 'elasticsearch' | 'orm';
}

export interface SearchHealth {
    elasticsearch: { enabled: boolean; library_installed: boolean; url?: string | null };
    embeddings: { enabled: boolean; library_installed: boolean; service_url?: string | null };
}

export interface SearchAdminStats {
    products_total: number;
    embeddings_total: number;
    embedding_coverage_pct: number;
    elasticsearch_enabled: boolean;
    embeddings_enabled: boolean;
}

const SEARCH_BASE = '/search/';

export async function fetchSearchStats(): Promise<SearchAdminStats | null> {
    try {
        const { data } = await axiosInstance.get<SearchAdminStats>(`${SEARCH_BASE}admin/stats/`);
        return data;
    } catch (err) {
        console.warn('[searchService] fetchSearchStats failed', err);
        return null;
    }
}

export async function fetchSearchHealth(): Promise<SearchHealth | null> {
    try {
        const { data } = await axiosInstance.get<SearchHealth>(`${SEARCH_BASE}health/`);
        return data;
    } catch (err) {
        console.warn('[searchService] fetchSearchHealth failed', err);
        return null;
    }
}

export async function adminSearchProducts(query: string, opts?: {
    category?: string;
    brand?: string;
    page?: number;
}): Promise<AdminSearchResponse | null> {
    try {
        const { data } = await axiosInstance.get<AdminSearchResponse>(SEARCH_BASE, {
            params: {
                q: query.trim(),
                ...(opts?.category ? { category: opts.category } : {}),
                ...(opts?.brand ? { brand: opts.brand } : {}),
                page: opts?.page ?? 1,
            },
        });
        return data;
    } catch (err) {
        console.warn('[searchService] adminSearchProducts failed', err);
        return null;
    }
}

export async function adminImageSearch(file: File): Promise<{ total: number; results: AdminSearchHit[] } | null> {
    const form = new FormData();
    form.append('image', file);
    try {
        const { data } = await axiosInstance.post(`${SEARCH_BASE}image/`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return { total: data.total ?? 0, results: data.results ?? [] };
    } catch (err) {
        console.warn('[searchService] adminImageSearch failed', err);
        return null;
    }
}
