/**
 * Store catalogue FX — keep the rate table and convertWithRates() formula in sync with
 * Stores-BE/apps/core/currency.py (same keys and numeric values).
 *
 * Convention — `rates[code]` = units of `code` per **1 unit of the store base currency**
 * (TRADEHUT_STORE_BASE_CURRENCY / NEXT_PUBLIC_TRADEHUT_STORE_BASE_CURRENCY, default USD).
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

export const STORE_BASE_CURRENCY: string =
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_TRADEHUT_STORE_BASE_CURRENCY) || 'USD'

/** Placeholder rates; replace via CurrencyProvider state from backend when ready. */
export const DEFAULT_FX_RATES: Record<string, number> = {
    USD: 1,
    EUR: 0.85,
    GBP: 0.73,
    JPY: 110.14,
    AUD: 1.35,
    CAD: 1.25,
    CHF: 0.91,
    CNY: 6.45,
    SEK: 8.51,
    NZD: 1.42,
    GHS: 15.2,
    NGN: 1550,
    KES: 130,
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
