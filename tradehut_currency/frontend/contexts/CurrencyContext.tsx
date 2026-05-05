'use client'

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
} from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────
/**
 * The currency your Django DB stores all prices in.
 * Every product.price / product.final_price is assumed to be in this currency.
 * Change this once here — nothing else needs to change.
 */
export const BASE_CURRENCY = 'GHS'

export const SUPPORTED_CURRENCIES = [
    { code: 'GHS', label: 'Ghana Cedi',        symbol: '₵'   },
    { code: 'USD', label: 'US Dollar',          symbol: '$'   },
    { code: 'EUR', label: 'Euro',               symbol: '€'   },
    { code: 'GBP', label: 'British Pound',      symbol: '£'   },
    { code: 'NGN', label: 'Nigerian Naira',     symbol: '₦'   },
    { code: 'KES', label: 'Kenyan Shilling',    symbol: 'KSh' },
    { code: 'ZAR', label: 'South African Rand', symbol: 'R'   },
    { code: 'AUD', label: 'Australian Dollar',  symbol: 'A$'  },
    { code: 'CAD', label: 'Canadian Dollar',    symbol: 'C$'  },
] as const

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]['code']

const STORAGE_KEY = 'th_currency'

// ─── Types ────────────────────────────────────────────────────────────────────
interface RatesPayload {
    base:   string
    rates:  Record<string, number>
    stale?: boolean
}

export interface CurrencyContextType {
    /** Currently selected display currency code e.g. "USD" */
    currency:     string
    /** Change the display currency — persisted to localStorage */
    setCurrency:  (code: string) => void
    /** Raw rates relative to BASE_CURRENCY from the backend */
    rates:        Record<string, number>
    /** True when serving stale/fallback rates (FX provider unreachable) */
    ratesStale:   boolean
    ratesLoading: boolean
    /**
     * Convert an amount from BASE_CURRENCY (default) to the selected
     * display currency. Override from/to for cross-currency conversion.
     */
    convert: (amount: number, from?: string, to?: string) => number
    /**
     * Convert + format in one call. Use this everywhere a price is rendered.
     * Always pass the raw DB amount — conversion is handled internally.
     *   formatCurrency(product.price) → "₵ 1,200.00" | "$75.60" | "€70.20"
     */
    formatCurrency: (amount: number) => string
}

// ─── Fallback rates ───────────────────────────────────────────────────────────
// Approximate — replaced immediately on mount by live rates from the backend.
// Keeps the UI functional before the first fetch completes.
const FALLBACK_RATES: Record<string, number> = {
    GHS: 1,     USD: 0.063, EUR: 0.058,
    GBP: 0.050, NGN: 103.0, KES: 8.5,
    ZAR: 1.17,  AUD: 0.097, CAD: 0.086,
}

// ─── Context ──────────────────────────────────────────────────────────────────
const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

// ─── Provider ─────────────────────────────────────────────────────────────────
export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Start with BASE_CURRENCY to match SSR — prevents hydration mismatch
    const [currency,     setCurrencyState] = useState<string>(BASE_CURRENCY)
    const [rates,        setRates]         = useState<Record<string, number>>(FALLBACK_RATES)
    const [ratesStale,   setRatesStale]    = useState(true)
    const [ratesLoading, setRatesLoading]  = useState(true)
    const [hydrated,     setHydrated]      = useState(false)

    // ── Fetch live rates from Django backend ──────────────────────────────────
    const fetchRates = useCallback(async () => {
        setRatesLoading(true)
        try {
            const res = await fetch('/api/fx/rates/')
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data: RatesPayload = await res.json()
            setRates(data.rates)
            setRatesStale(data.stale ?? false)
        } catch {
            // Keep current rates — don't crash the UI
            setRatesStale(true)
        } finally {
            setRatesLoading(false)
        }
    }, [])

    // ── Hydrate from localStorage + start polling ─────────────────────────────
    useEffect(() => {
        setHydrated(true)
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved && SUPPORTED_CURRENCIES.some((c) => c.code === saved)) {
            setCurrencyState(saved)
        }
        fetchRates()
        // Refresh rates every 4 hours while tab is open
        const id = setInterval(fetchRates, 1000 * 60 * 60 * 4)
        return () => clearInterval(id)
    }, [fetchRates])

    // ── Persist selection ─────────────────────────────────────────────────────
    const setCurrency = useCallback((code: string) => {
        setCurrencyState(code)
        if (hydrated) localStorage.setItem(STORAGE_KEY, code)
    }, [hydrated])

    // ── Conversion logic ──────────────────────────────────────────────────────
    const convert = useCallback((
        amount: number,
        from:   string = BASE_CURRENCY,
        to:     string = currency,
    ): number => {
        if (!Number.isFinite(amount) || amount === 0) return amount
        if (from === to) return amount
        const rateFrom = rates[from]
        const rateTo   = rates[to]
        if (!rateFrom || !rateTo) {
            console.warn(`[CurrencyContext] No rate for "${from}" or "${to}"`)
            return amount
        }
        // All rates are: units of [code] per 1 GHS
        // Step 1 — convert to GHS:   amount / rateFrom
        // Step 2 — convert to target: × rateTo
        return (amount / rateFrom) * rateTo
    }, [rates, currency])

    // ── Format: convert THEN Intl.NumberFormat ────────────────────────────────
    const formatCurrency = useCallback((amount: number): string => {
        if (!Number.isFinite(amount)) return '—'
        const converted = convert(amount, BASE_CURRENCY, currency)
        return new Intl.NumberFormat('en-US', {
            style:                 'currency',
            currency:              currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(converted)
    }, [convert, currency])

    return (
        <CurrencyContext.Provider value={{
            currency, setCurrency,
            rates, ratesStale, ratesLoading,
            convert, formatCurrency,
        }}>
            {children}
        </CurrencyContext.Provider>
    )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useCurrency = (): CurrencyContextType => {
    const ctx = useContext(CurrencyContext)
    if (!ctx) throw new Error('useCurrency must be used within <CurrencyProvider>')
    return ctx
}
