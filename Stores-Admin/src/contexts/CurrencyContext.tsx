import React, {
    createContext,
    useState,
    useContext,
    useEffect,
    ReactNode,
    useCallback,
    useMemo,
} from 'react';
import {
    STORE_BASE_CURRENCY,
    DEFAULT_FX_RATES,
    SUPPORTED_CURRENCIES,
    convertWithRates,
} from '../utilities/storeCurrency';
import { fetchFxSnapshot } from '../services/fxClient';

interface CurrencyContextType {
    /** ISO code the admin is viewing prices in (header selector). Default: base. */
    currency: string;
    setCurrency: (currency: string) => void;
    /** Store-wide pricing currency. Switchable at the admin level. Default: GHS. */
    baseCurrency: string;
    setBaseCurrency: (currency: string) => void;
    /** Last GET …/core/fx/snapshot/ metadata. */
    fxSnapshotId: string | null;
    fxAsOf: string | null;
    fxStale: boolean;
    fxSource: string | null;
    exchangeRates: Record<string, number>;
    /** Merge rates (e.g. tests); normal flow uses full snapshot from backend. */
    mergeFxRates: (partial: Record<string, number>) => void;
    /** `amount` is in `from` (default: base); result is numeric value in `to` (default: selected display currency). */
    convert: (amount: number, from?: string, to?: string) => number;
    /** Format a value already in **selected** display currency (no conversion). */
    formatCurrency: (amount: number) => string;
    /** Convert from base (or `fromCurrency`) into selected display currency, then format. */
    formatDisplayPrice: (amount: number, fromCurrency?: string) => string;
    supportedCurrencies: typeof SUPPORTED_CURRENCIES;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const DISPLAY_KEY = 'admin:selectedCurrency';
const BASE_KEY = 'admin:baseCurrency';

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const initialBase = (() => {
        if (typeof window === 'undefined') return STORE_BASE_CURRENCY;
        return localStorage.getItem(BASE_KEY) || STORE_BASE_CURRENCY;
    })();

    const [baseCurrency, setBaseCurrencyState] = useState<string>(initialBase);
    const [currency, setCurrencyState] = useState<string>(initialBase);
    const [mounted, setMounted] = useState(false);

    const [fxSnapshotId, setFxSnapshotId] = useState<string | null>(null);
    const [fxAsOf, setFxAsOf] = useState<string | null>(null);
    const [fxStale, setFxStale] = useState(false);
    const [fxSource, setFxSource] = useState<string | null>(null);

    const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(() => ({
        ...DEFAULT_FX_RATES,
    }));

    useEffect(() => {
        setMounted(true);
        const savedDisplay = localStorage.getItem(DISPLAY_KEY);
        if (savedDisplay) setCurrencyState(savedDisplay);
    }, []);

    const setCurrency = useCallback((next: string) => {
        const code = (next || '').toUpperCase();
        setCurrencyState(code);
        if (typeof window !== 'undefined') localStorage.setItem(DISPLAY_KEY, code);
    }, []);

    const setBaseCurrency = useCallback((next: string) => {
        const code = (next || '').toUpperCase();
        setBaseCurrencyState(code);
        if (typeof window !== 'undefined') localStorage.setItem(BASE_KEY, code);
    }, []);

    const mergeFxRates = useCallback((partial: Record<string, number>) => {
        setExchangeRates((prev) => ({ ...prev, ...partial }));
    }, []);

    useEffect(() => {
        if (!mounted) return;
        fetchFxSnapshot().then((data) => {
            if (!data?.rates || typeof data.rates !== 'object') return;
            setExchangeRates({ ...data.rates });
            setFxSnapshotId(data.snapshot_id ?? null);
            setFxAsOf(data.as_of ?? null);
            setFxStale(Boolean(data.stale));
            setFxSource(data.source ?? null);
        });
    }, [mounted]);

    const convert = useCallback(
        (amount: number, from: string = baseCurrency, to: string = currency): number => {
            return convertWithRates(amount, from, to, exchangeRates);
        },
        [baseCurrency, currency, exchangeRates]
    );

    const formatCurrency = useCallback(
        (amount: number): string => {
            if (!Number.isFinite(amount)) return '—';
            try {
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency,
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }).format(amount);
            } catch {
                return `${currency} ${amount.toFixed(2)}`;
            }
        },
        [currency]
    );

    const formatDisplayPrice = useCallback(
        (amount: number, fromCurrency?: string): string => {
            if (!Number.isFinite(amount)) return '—';
            const converted = convert(amount, fromCurrency ?? baseCurrency);
            return formatCurrency(converted);
        },
        [baseCurrency, convert, formatCurrency]
    );

    const value: CurrencyContextType = useMemo(
        () => ({
            currency,
            setCurrency,
            baseCurrency,
            setBaseCurrency,
            fxSnapshotId,
            fxAsOf,
            fxStale,
            fxSource,
            exchangeRates,
            mergeFxRates,
            convert,
            formatCurrency,
            formatDisplayPrice,
            supportedCurrencies: SUPPORTED_CURRENCIES,
        }),
        [
            currency,
            setCurrency,
            baseCurrency,
            setBaseCurrency,
            fxSnapshotId,
            fxAsOf,
            fxStale,
            fxSource,
            exchangeRates,
            mergeFxRates,
            convert,
            formatCurrency,
            formatDisplayPrice,
        ]
    );

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = (): CurrencyContextType => {
    const ctx = useContext(CurrencyContext);
    if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
    return ctx;
};
