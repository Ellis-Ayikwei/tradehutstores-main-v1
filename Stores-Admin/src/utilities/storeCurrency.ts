/**
 * Admin catalogue FX — keep the rate table and convertWithRates() formula in
 * sync with Stores-BE/apps/core/currency.py and Stores-FE/lib/storeCurrency.ts
 * (same keys and numeric values).
 *
 * Convention — `rates[code]` = units of `code` per **1 unit of the store base
 * currency** (TRADEHUT_STORE_BASE_CURRENCY / VITE_TRADEHUT_STORE_BASE_CURRENCY,
 * default GHS).
 *
 * Catalog amounts from the API are treated as **store base** unless a field
 * explicitly gives another ISO code (then pass that code as `from` to
 * convertWithRates / useCurrency().convert).
 */

export const STORE_BASE_CURRENCY: string = (
    (typeof import.meta !== 'undefined' &&
        (import.meta as any).env?.VITE_TRADEHUT_STORE_BASE_CURRENCY) ||
    'GHS'
).toUpperCase();

/** Fallback table until GET …/core/fx/snapshot/ loads; GHS-centered. */
const _G = 15.2;
export const DEFAULT_FX_RATES: Record<string, number> = {
    GHS: 1,
    USD: 1 / _G,
    EUR: 0.85 / _G,
    GBP: 0.73 / _G,
    JPY: 110.14 / _G,
    AUD: 1.35 / _G,
    CAD: 1.25 / _G,
    CHF: 0.91 / _G,
    CNY: 6.45 / _G,
    SEK: 8.51 / _G,
    NZD: 1.42 / _G,
    NGN: 1550 / _G,
    KES: 130 / _G,
};

export const SUPPORTED_CURRENCIES: { code: string; label: string; symbol: string }[] = [
    { code: 'GHS', label: 'Ghana Cedi', symbol: 'GH₵' },
    { code: 'USD', label: 'US Dollar', symbol: '$' },
    { code: 'EUR', label: 'Euro', symbol: '€' },
    { code: 'GBP', label: 'British Pound', symbol: '£' },
    { code: 'NGN', label: 'Nigerian Naira', symbol: '₦' },
    { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
    { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
    { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
    { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
    { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
    { code: 'SEK', label: 'Swedish Krona', symbol: 'kr' },
    { code: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$' },
];

// ─── Country list for shipping zone editor ──────────────────────────────────
// Mirrors Stores-FE/lib/storeCurrency.ts COUNTRY_META — keep them aligned so
// admin-picked countries render in the storefront ship-to picker.
export interface Country {
    code: string;
    name: string;
    flag: string;
    region: 'africa' | 'europe' | 'americas' | 'asia-pacific' | 'middle-east';
}

export const COUNTRIES: Country[] = [
    // ── Africa ──
    { code: 'GH', name: 'Ghana', flag: '🇬🇭', region: 'africa' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', region: 'africa' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', region: 'africa' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'africa' },
    { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', region: 'africa' },
    { code: 'SN', name: 'Senegal', flag: '🇸🇳', region: 'africa' },
    { code: 'BJ', name: 'Benin', flag: '🇧🇯', region: 'africa' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬', region: 'africa' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', region: 'africa' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱', region: 'africa' },
    { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', region: 'africa' },
    { code: 'EG', name: 'Egypt', flag: '🇪🇬', region: 'africa' },
    { code: 'MA', name: 'Morocco', flag: '🇲🇦', region: 'africa' },
    { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', region: 'africa' },
    { code: 'UG', name: 'Uganda', flag: '🇺🇬', region: 'africa' },
    { code: 'RW', name: 'Rwanda', flag: '🇷🇼', region: 'africa' },
    // ── Europe ──
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'europe' },
    { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'europe' },
    { code: 'FR', name: 'France', flag: '🇫🇷', region: 'europe' },
    { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'europe' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'europe' },
    { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'europe' },
    { code: 'CH', name: 'Switzerland', flag: '🇨🇭', region: 'europe' },
    { code: 'SE', name: 'Sweden', flag: '🇸🇪', region: 'europe' },
    // ── Americas ──
    { code: 'US', name: 'United States', flag: '🇺🇸', region: 'americas' },
    { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'americas' },
    { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'americas' },
    { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'americas' },
    // ── Asia-Pacific ──
    { code: 'CN', name: 'China', flag: '🇨🇳', region: 'asia-pacific' },
    { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'asia-pacific' },
    { code: 'IN', name: 'India', flag: '🇮🇳', region: 'asia-pacific' },
    { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'asia-pacific' },
    { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'asia-pacific' },
    // ── Middle East ──
    { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'middle-east' },
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', region: 'middle-east' },
    { code: 'TR', name: 'Turkey', flag: '🇹🇷', region: 'middle-east' },
];

export const REGION_LABELS: Record<Country['region'], string> = {
    africa: 'Africa',
    europe: 'Europe',
    americas: 'Americas',
    'asia-pacific': 'Asia · Pacific',
    'middle-east': 'Middle East',
};

/** A zone's `countries: ["*"]` is the wildcard meaning "every country". */
export const COUNTRY_WILDCARD = '*';

export function convertWithRates(
    amount: number,
    from: string,
    to: string,
    rates: Record<string, number>
): number {
    if (!Number.isFinite(amount)) return amount;
    if (from === to) return amount;
    const rateFrom = rates[from];
    const rateTo = rates[to];
    if (rateFrom == null || rateTo == null || rateFrom === 0) return amount;
    const amountInBase = amount / rateFrom;
    return amountInBase * rateTo;
}
