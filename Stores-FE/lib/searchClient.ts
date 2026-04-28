/**
 * Typed client for the search API exposed by Stores-BE under
 * `/tradehut/api/v1/search/`.
 *
 * Every helper here intentionally swallows network/HTTP failures and returns
 * an empty result (or `null`) so the FE never crashes when:
 *   • The dev backend isn't running.
 *   • Elasticsearch is down but the rest of Django is up.
 *   • The visual-search subsystem is disabled (returns 503).
 *
 * Components should treat the absence of a result as "fall back to local
 * mock data" rather than "show an error" — see `SearchBar.tsx` and
 * `ImageSearchModal.tsx`.
 */

import axiosInstance from './axiosInstance'

// ─── Types (mirror Stores-BE/apps/search/serializers.py) ─────────────────────

export interface SearchProduct {
    id: string
    slug?: string | null
    name: string
    description?: string | null
    image?: string | null
    main_product_image?: string | null
    price?: number | null
    final_price?: number | null
    discount_percentage?: number | null
    rating?: number | null
    total_reviews?: number | null
    category?: string | null
    sub_category?: string | null
    brand?: string | null
    condition?: string | null
    in_stock?: boolean
    created_at?: string
    similarity?: number
    score?: number
}

export interface SearchFacetBucket {
    label: string
    count: number | null
}

export interface SearchFacets {
    categories: SearchFacetBucket[]
    brands: SearchFacetBucket[]
    price_stats?: {
        min: number | null
        max: number | null
        avg: number | null
    }
}

export interface SearchResponse {
    total: number
    page: number
    page_size: number
    results: SearchProduct[]
    facets: SearchFacets
    engine: 'elasticsearch' | 'orm'
}

export interface AutocompleteHit {
    id: string
    name: string
    price?: number | null
    image?: string | null
    category?: string | null
    score?: number
}

export interface AutocompleteResponse {
    suggestions: string[]
    products: AutocompleteHit[]
    engine: 'elasticsearch' | 'orm'
}

export interface SearchHealth {
    elasticsearch: { enabled: boolean; library_installed: boolean; url?: string | null }
    embeddings: { enabled: boolean; library_installed: boolean; service_url?: string | null }
}

export interface SearchFilters {
    q?: string
    category?: string
    sub_category?: string
    brand?: string
    condition?: string
    min_price?: number
    max_price?: number
    in_stock?: boolean
    page?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEARCH_BASE = '/search/'

function toParams(filters: SearchFilters): Record<string, string> {
    const params: Record<string, string> = {}
    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        params[key] = String(value)
    })
    return params
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Full search with filters + facets. Returns `null` on network failure so the
 * caller can fall back to whatever local data they have.
 */
export async function searchProducts(filters: SearchFilters): Promise<SearchResponse | null> {
    try {
        const { data } = await axiosInstance.get<SearchResponse>(SEARCH_BASE, {
            params: toParams(filters),
        })
        return data
    } catch (err) {
        console.warn('[searchClient] searchProducts failed', err)
        return null
    }
}

/**
 * Dropdown autocomplete. Returns empty arrays on failure so the UI shows
 * "no suggestions" rather than blowing up.
 */
export async function autocomplete(q: string): Promise<AutocompleteResponse> {
    if (!q || q.trim().length < 2) {
        return { suggestions: [], products: [], engine: 'orm' }
    }
    try {
        const { data } = await axiosInstance.get<AutocompleteResponse>(
            `${SEARCH_BASE}autocomplete/`,
            { params: { q: q.trim() } },
        )
        return data
    } catch (err) {
        console.warn('[searchClient] autocomplete failed', err)
        return { suggestions: [], products: [], engine: 'orm' }
    }
}

/**
 * Reverse-image search. Returns `null` (not a thrown error) when visual
 * search is disabled, so the modal can degrade gracefully.
 */
export async function imageSearch(file: File): Promise<{ results: SearchProduct[]; total: number } | null> {
    const form = new FormData()
    form.append('image', file)
    try {
        const { data } = await axiosInstance.post(`${SEARCH_BASE}image/`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return { results: data.results ?? [], total: data.total ?? 0 }
    } catch (err) {
        console.warn('[searchClient] imageSearch failed', err)
        return null
    }
}

/** Text → visual search (CLIP multimodal). */
export async function visualSearch(q: string): Promise<{ results: SearchProduct[]; total: number } | null> {
    if (!q.trim()) return null
    try {
        const { data } = await axiosInstance.get(`${SEARCH_BASE}visual/`, {
            params: { q: q.trim() },
        })
        return { results: data.results ?? [], total: data.total ?? 0 }
    } catch (err) {
        console.warn('[searchClient] visualSearch failed', err)
        return null
    }
}

/** "Customers also viewed" / visually similar widget for the PDP. */
export async function similarProducts(productId: string): Promise<SearchProduct[]> {
    if (!productId) return []
    try {
        const { data } = await axiosInstance.get(
            `${SEARCH_BASE}products/${productId}/similar/`,
        )
        return data.results ?? []
    } catch (err) {
        console.warn('[searchClient] similarProducts failed', err)
        return []
    }
}

/** Subsystem availability — used by the Admin search dashboard. */
export async function fetchSearchHealth(): Promise<SearchHealth | null> {
    try {
        const { data } = await axiosInstance.get<SearchHealth>(`${SEARCH_BASE}health/`)
        return data
    } catch (err) {
        console.warn('[searchClient] health failed', err)
        return null
    }
}

// ─── Recent searches (localStorage) ───────────────────────────────────────────
// Co-locating this helper with the API client means there's only one source
// of truth for recents — the SearchBar UI used to do this inline.

const RECENT_KEY = 'ths_recent_searches'

export function getRecentSearches(): string[] {
    if (typeof globalThis.window === 'undefined') return []
    try {
        return (JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') as string[]).slice(0, 8)
    } catch {
        return []
    }
}

export function saveRecentSearch(q: string): void {
    if (typeof globalThis.window === 'undefined') return
    const trimmed = q.trim()
    if (!trimmed) return
    try {
        const existing = getRecentSearches().filter(
            (r) => r.toLowerCase() !== trimmed.toLowerCase(),
        )
        localStorage.setItem(RECENT_KEY, JSON.stringify([trimmed, ...existing].slice(0, 8)))
    } catch {
        /* ignore */
    }
}

export function removeRecentSearch(q: string): void {
    if (typeof globalThis.window === 'undefined') return
    try {
        const filtered = getRecentSearches().filter(
            (r) => r.toLowerCase() !== q.toLowerCase(),
        )
        localStorage.setItem(RECENT_KEY, JSON.stringify(filtered))
    } catch {
        /* ignore */
    }
}
