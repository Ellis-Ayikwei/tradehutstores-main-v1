import type { PopulationRulePayload } from '@/services/merchandisingAdminService';

export const SECTION_TYPES = [
    { value: 'horizontal_scroll', label: 'Horizontal scroll' },
    { value: 'grid', label: 'Product grid' },
    { value: 'flash_sale', label: 'Flash sale' },
    { value: 'banner', label: 'Banner' },
    { value: 'category_spotlight', label: 'Category spotlight' },
];

export const STRATEGIES = [
    { value: 'manual', label: 'Manual' },
    { value: 'auto', label: 'Automatic' },
    { value: 'mixed', label: 'Mixed' },
];

export const RULE_TYPES = [
    { value: 'top_sellers', label: 'Top sellers' },
    { value: 'new_arrivals', label: 'New arrivals' },
    { value: 'high_rated', label: 'Highest rated' },
    { value: 'flash_sale', label: 'Flash sale products' },
    { value: 'tag_filter', label: 'Tag / keywords' },
    { value: 'category_best', label: 'Best in category' },
    { value: 'low_stock', label: 'Low stock' },
    { value: 'trending', label: 'Trending (views)' },
    { value: 'manual_override', label: 'Manual only (rule off)' },
];

export const SECTION_TYPE_LABEL: Record<string, string> = Object.fromEntries(SECTION_TYPES.map((o) => [o.value, o.label]));
export const STRATEGY_LABEL: Record<string, string> = Object.fromEntries(STRATEGIES.map((o) => [o.value, o.label]));

export function slugify(s: string): string {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export function emptyRule(): PopulationRulePayload {
    return {
        rule_type: 'new_arrivals',
        lookback_days: 7,
        min_rating: 4.0,
        tag: '',
        category: null,
        low_stock_threshold: 10,
        only_in_stock: true,
        only_available: true,
        min_price: null,
        max_price: null,
        cache_minutes: 30,
    };
}

export function toDatetimeLocal(iso: string | null): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return '';
    }
}

export function fromDatetimeLocal(v: string): string | null {
    if (!v || !v.trim()) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type ColorPreset = { name: string; value: string };

// These are data values saved on the section and rendered by the storefront, not UI styling.
export const BACKGROUND_PRESETS: ColorPreset[] = [
    { name: 'None', value: '' },
    { name: 'Cream', value: '#fff8f6' },
    { name: 'Peach', value: '#fff1ec' },
    { name: 'Blush', value: '#ffe9e2' },
    { name: 'Soft rose', value: '#fef2f2' },
    { name: 'Honey', value: '#fff7ed' },
    { name: 'Butter', value: '#fefce8' },
    { name: 'Mint', value: '#ecfdf5' },
    { name: 'Sky', value: '#eff6ff' },
    { name: 'Lavender', value: '#f5f3ff' },
    { name: 'Slate', value: '#f1f5f9' },
    { name: 'Charcoal', value: '#1f2937' },
];

export const ACCENT_PRESETS: ColorPreset[] = [
    { name: 'None', value: '' },
    { name: 'TradeHut orange', value: '#a43d00' },
    { name: 'Flame', value: '#f5620f' },
    { name: 'Sunset', value: '#f97316' },
    { name: 'Crimson', value: '#dc2626' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Bid green', value: '#006c4b' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'RFQ blue', value: '#0058ca' },
    { name: 'Cyan', value: '#0891b2' },
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Violet', value: '#7c3aed' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Slate', value: '#475569' },
];
