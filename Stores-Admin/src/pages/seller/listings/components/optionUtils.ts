import type { AttributeValueOption, VariantDetail } from '@/services/sellerListingsService';
import type { ImageItem, OptionType, OptionValue, VariantFormValues } from '../schema';

/** Largest number of combinations the matrix will generate. */
export const MAX_MATRIX = 60;
export const MAX_OPTION_TYPES = 3;
/** Pictures per colour. */
export const MAX_GROUP_IMAGES = 8;

/** Colour-like option types carry pictures (Amazon shows one picture set per colour). */
export const isPictureAttribute = (name: string, displayType?: string | null): boolean => displayType === 'swatch' || displayType === 'image' || /^colou?rs?$/i.test(name.trim());

export const isPictureType = (t: OptionType): boolean => isPictureAttribute(t.name, t.displayType);

export const toOptionValue = (v: AttributeValueOption): OptionValue => ({ id: v.id, label: v.label, colorCode: v.colorCode || undefined, image: v.image });

export const slugPart = (s: string): string =>
    s
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

export const comboKey = (ids: string[]): string => ids.join('|');

/** Number of combinations the chosen types would generate (0 until every type has a value). */
export function countCombos(types: OptionType[]): number {
    if (types.length === 0 || types.some((t) => t.values.length === 0)) return 0;
    return types.reduce((n, t) => n * t.values.length, 1);
}

/** Cartesian product of the types' values, in type order, capped at MAX_MATRIX (the first combinations are kept). */
export function combinations(types: OptionType[]): string[][] {
    if (countCombos(types) === 0) return [];
    let acc: string[][] = [[]];
    for (const t of types) {
        const next: string[][] = [];
        for (const prefix of acc) {
            for (const v of t.values) next.push([...prefix, v.id]);
        }
        acc = next.slice(0, MAX_MATRIX);
    }
    return acc;
}

export const valueLabels = (types: OptionType[], ids: string[]): string[] => ids.map((id, i) => types[i]?.values.find((v) => v.id === id)?.label ?? '');

export function suggestSku(prefix: string, types: OptionType[], ids: string[], used: Set<string>): string {
    const base = slugPart(prefix);
    if (!base) return '';
    const tail = valueLabels(types, ids).map(slugPart).filter(Boolean).join('-');
    const root = (tail ? `${base}-${tail}` : base).slice(0, 94);
    let sku = root;
    for (let n = 2; used.has(sku.toLowerCase()); n += 1) sku = `${root}-${n}`;
    return sku;
}

interface SyncOptions {
    baseSku: string;
    basePrice: string;
}

/**
 * Rebuilds the variant matrix for the chosen types. Rows for combinations that still exist keep everything the seller typed
 * (and their server id); new combinations get the base price and an auto-suggested SKU.
 */
export function syncMatrix(types: OptionType[], existing: VariantFormValues[], { baseSku, basePrice }: SyncOptions): VariantFormValues[] {
    const combos = combinations(types);
    const byKey = new Map<string, VariantFormValues>();
    existing.forEach((row) => {
        if (row.valueIds && row.valueIds.length === types.length) byKey.set(comboKey(row.valueIds), row);
    });
    const used = new Set<string>();
    combos.forEach((ids) => {
        const kept = byKey.get(comboKey(ids));
        if (kept?.sku.trim()) used.add(kept.sku.trim().toLowerCase());
    });
    return combos.map((ids) => {
        const kept = byKey.get(comboKey(ids));
        if (kept) return kept;
        const sku = suggestSku(baseSku, types, ids, used);
        if (sku) used.add(sku.toLowerCase());
        return { name: '', sku, skuAuto: true, price: basePrice, quantity: '0', enabled: true, valueIds: ids };
    });
}

/** Re-suggests the SKU of every row the seller has not typed over. */
export function resuggestSkus(types: OptionType[], rows: VariantFormValues[], baseSku: string): VariantFormValues[] {
    const used = new Set<string>();
    rows.forEach((r) => {
        if (!r.skuAuto && r.sku.trim()) used.add(r.sku.trim().toLowerCase());
    });
    return rows.map((r) => {
        if (!r.skuAuto || !r.valueIds) return r;
        const sku = suggestSku(baseSku, types, r.valueIds, used);
        if (sku) used.add(sku.toLowerCase());
        return { ...r, sku };
    });
}

const THEME_ORDER = ['size', 'color', 'material', 'pattern', 'style'];
const SINGLE_THEMES = new Set(['size', 'color', 'material', 'pattern', 'style', 'capacity', 'memory']);
/** Combined themes the API accepts (Stores-BE apps/products/models.py VARIATION_THEMES). */
const COMBINED_THEMES = new Set(['size-color', 'size-material', 'color-style', 'size-pattern', 'size-style', 'size-color-style']);

const themeName = (name: string): string => {
    const n = name.trim().toLowerCase();
    return n === 'colour' || n === 'colours' || n === 'colors' ? 'color' : n;
};

/** variation_theme for the chosen types: a known theme when the API has one, otherwise custom. */
export function themeForTypes(types: OptionType[]): string {
    const names = types.map((t) => themeName(t.name));
    if (names.length === 0) return 'custom';
    if (names.length === 1) return SINGLE_THEMES.has(names[0]) ? names[0] : 'custom';
    if (!names.every((n) => THEME_ORDER.includes(n))) return 'custom';
    const joined = [...names].sort((a, b) => THEME_ORDER.indexOf(a) - THEME_ORDER.indexOf(b)).join('-');
    return COMBINED_THEMES.has(joined) ? joined : 'custom';
}

/** Types and per-variant value ids inferred from variants that carry structured values; null when they are not uniformly structured. */
export function inferOptionTypes(variants: VariantDetail[]): { types: OptionType[]; idsByVariant: Map<string, string[]> } | null {
    if (variants.length === 0) return null;
    const attrs = new Map<string, OptionType>();
    for (const v of variants) {
        const values = v.attribute_values ?? [];
        if (values.length === 0) return null;
        for (const av of values) {
            const key = String(av.attribute);
            const type = attrs.get(key) ?? { attributeId: key, name: av.attribute_name ?? '', displayType: av.attribute_display_type ?? 'dropdown', values: [] };
            if (!type.values.some((x) => x.id === String(av.id))) type.values.push({ id: String(av.id), label: av.value_name ?? '', colorCode: av.color_code || undefined, image: av.image ?? null });
            attrs.set(key, type);
        }
    }
    const rank = (t: OptionType) => (isPictureType(t) ? 0 : themeName(t.name) === 'size' ? 1 : 2);
    const types = Array.from(attrs.values()).sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    if (types.length > MAX_OPTION_TYPES) return null;
    const idsByVariant = new Map<string, string[]>();
    for (const v of variants) {
        const ids: string[] = [];
        for (const t of types) {
            const mine = (v.attribute_values ?? []).filter((av) => String(av.attribute) === t.attributeId);
            if (mine.length !== 1) return null;
            ids.push(String(mine[0].id));
        }
        idsByVariant.set(String(v.id), ids);
    }
    const seen = new Set<string>();
    for (const ids of idsByVariant.values()) {
        const key = comboKey(ids);
        if (seen.has(key)) return null;
        seen.add(key);
    }
    return { types, idsByVariant };
}

/** The picture-type value id (e.g. the colour) a saved variant belongs to, if any. */
export function pictureValueOfVariant(v: VariantDetail): string | undefined {
    const found = (v.attribute_values ?? []).find((av) => isPictureAttribute(av.attribute_name ?? '', av.attribute_display_type));
    return found ? String(found.id) : undefined;
}

/** Index of the first picture-type option, or -1. */
export const pictureTypeIndex = (types: OptionType[]): number => types.findIndex(isPictureType);

/** Values of the picture type that at least one enabled variant uses, in display order. */
export function pictureGroups(types: OptionType[], rows: VariantFormValues[]): OptionValue[] {
    const idx = pictureTypeIndex(types);
    if (idx < 0) return [];
    const used = new Set(rows.filter((r) => r.enabled && r.valueIds?.length === types.length).map((r) => r.valueIds?.[idx]));
    return types[idx].values.filter((v) => used.has(v.id));
}

export const imagesForGroup = (images: ImageItem[], groupId: string): ImageItem[] => images.filter((i) => i.optionValueId === groupId);

/** Colours that have no picture yet (soft warning). */
export const groupsWithoutPictures = (types: OptionType[], rows: VariantFormValues[], images: ImageItem[]): OptionValue[] =>
    pictureGroups(types, rows).filter((g) => imagesForGroup(images, g.id).length === 0);

/** "Colour (Red, Blue) x Size (S, M)" over the options enabled rows actually use. */
export function summarizeOptions(types: OptionType[], rows: VariantFormValues[]): string {
    const enabled = rows.filter((r) => r.enabled && r.valueIds?.length === types.length);
    return types
        .map((t, i) => {
            const used = new Set(enabled.map((r) => r.valueIds?.[i]));
            const labels = t.values.filter((v) => used.has(v.id)).map((v) => v.label);
            return `${t.name} (${labels.join(', ')})`;
        })
        .join(' × ');
}
