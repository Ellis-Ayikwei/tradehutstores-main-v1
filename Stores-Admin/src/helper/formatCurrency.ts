import { STORE_BASE_CURRENCY } from '../utilities/storeCurrency';

/**
 * Static, context-free formatter. Uses the configured store base currency
 * (defaults to GHS) so static helpers stay in sync with the dashboard's
 * "base currency" without requiring React context. For full conversion to the
 * admin's selected display currency, use `useCurrency().formatDisplayPrice()`
 * from `contexts/CurrencyContext`.
 */
export const formatCurrency = (amount: number, currency: string = STORE_BASE_CURRENCY) => {
    if (!Number.isFinite(amount)) return '—';
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
        }).format(amount);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
};
