/**
 * Store catalogue FX — keep the rate table and convertWithRates() formula in sync with
 * Stores-BE/apps/core/currency.py (same keys and numeric values).
 *
 * Convention — `rates[code]` = units of `code` per **1 unit of the store base currency**
 * (TRADEHUT_STORE_BASE_CURRENCY / NEXT_PUBLIC_TRADEHUT_STORE_BASE_CURRENCY, default GHS).
 *
 * Example (base USD): rates.JPY = 110 → 110 JPY equals 1 USD. To convert 220 JPY → EUR:
 *   (220 / rates.JPY) * rates.EUR
 *
 * Catalog amounts from the API are treated as **store base** unless a field explicitly
 * gives another ISO code (then pass that code as `from` to convertWithRates / useCurrency().convert).
 * Product catalog JSON includes `pricing_currency` for API consumers; live rates are merged from
 * Frankfurter on the backend (GET …/core/fx/snapshot/) when TRADEHUT_FX_FETCH_FRANKFURTER is true.
 *
 * If you change the base away from USD, replace the default rate table with one expressed
 * against your new base (or load rates from GET …/core/fx/snapshot/).
 */

export const STORE_BASE_CURRENCY: string = (
    typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TRADEHUT_STORE_BASE_CURRENCY
        ? process.env.NEXT_PUBLIC_TRADEHUT_STORE_BASE_CURRENCY
        : 'GHS'
).toUpperCase()

/** Fallback until GET …/core/fx/snapshot/ loads; GHS-centered (same cross-rates as legacy USD table / 15.2). */
const _G = 15.2
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
}

export function convertWithRates(
    amount: number,
    from: string,
    to: string,
    rates: Record<string, number>
): number {
    if (!Number.isFinite(amount)) return amount
    if (from === to) return amount
    const rateFrom = rates[from]
    const rateTo = rates[to]
    if (rateFrom == null || rateTo == null || rateFrom === 0) return amount
    const amountInBase = amount / rateFrom
    return amountInBase * rateTo
}
