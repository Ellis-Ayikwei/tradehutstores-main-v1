'use client'

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback, useMemo } from 'react'
import {
    STORE_BASE_CURRENCY,
    DEFAULT_FX_RATES,
    convertWithRates,
} from '@/lib/storeCurrency'
import { fetchFxSnapshot } from '@/lib/fxClient'
import { useStoreConfig } from '@/contexts/StoreConfigContext'

interface CurrencyContextType {
    /** ISO code the shopper is viewing prices in (navbar selector). */
    currency: string
    setCurrency: (currency: string) => void
    /** ISO code catalog / API amounts are stored in until models expose per-row currency.
     *  Sourced from /store/config/public/ when available; otherwise the build-time env var. */
    baseCurrency: string
    /** ISO codes the navbar selector is allowed to show. Falls back to all
     *  rates when the BE has not (yet) sent an enabled list. */
    enabledDisplayCurrencies: string[] | null
    /** Last GET …/core/fx/snapshot/ metadata (for POST …/fx/quote/). */
    fxSnapshotId: string | null
    fxAsOf: string | null
    fxStale: boolean
    fxSource: string | null
    exchangeRates: { [key: string]: number }
    /** Merge rates (e.g. tests); normal flow uses full snapshot from backend. */
    mergeFxRates: (partial: Record<string, number>) => void
    /** `amount` is in `from` (default: store base); result is numeric value in `to` (default: selected `currency`). */
    convert: (amount: number, from?: string, to?: string) => number
    /** Format a value already in **selected** `currency` (no conversion). */
    formatCurrency: (amount: number) => string
    /** Convert from store/pricing currency (or `fromCurrency`) into selected currency, then format. */
    formatDisplayPrice: (amount: number, fromCurrency?: string) => string
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { config: storeConfig } = useStoreConfig()
    const [currency, setCurrency] = useState<string>('GHS')
    const [mounted, setMounted] = useState(false)
    // Prefer the BE-stored base currency once StoreConfig has loaded; fall back
    // to the env-baked default until then so server-rendered prices have a
    // value during the first paint.
    const baseCurrency = storeConfig?.currency_base ?? STORE_BASE_CURRENCY
    const enabledDisplayCurrencies =
        storeConfig?.currency_enabled_display && storeConfig.currency_enabled_display.length > 0
            ? storeConfig.currency_enabled_display
            : null

    const [fxSnapshotId, setFxSnapshotId] = useState<string | null>(null)
    const [fxAsOf, setFxAsOf] = useState<string | null>(null)
    const [fxStale, setFxStale] = useState(false)
    const [fxSource, setFxSource] = useState<string | null>(null)

    const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>(() => ({
        ...DEFAULT_FX_RATES,
    }))

    useEffect(() => {
        setMounted(true)
        const savedCurrency = localStorage.getItem('selectedCurrency')
        if (savedCurrency) {
            setCurrency(savedCurrency)
        }
    }, [])

    // If the BE limits display currencies and the user's saved choice is no
    // longer allowed, snap them to the base — otherwise the formatter would
    // try to display in a currency that's been disabled by the admin.
    useEffect(() => {
        if (!mounted || !enabledDisplayCurrencies) return
        if (!enabledDisplayCurrencies.includes(currency)) {
            setCurrency(baseCurrency)
        }
    }, [mounted, enabledDisplayCurrencies, currency, baseCurrency])

    const mergeFxRates = useCallback((partial: Record<string, number>) => {
        setExchangeRates((prev) => ({ ...prev, ...partial }))
    }, [])

    useEffect(() => {
        if (mounted) {
            localStorage.setItem('selectedCurrency', currency)
        }
    }, [currency, mounted])

    useEffect(() => {
        if (!mounted) return
        fetchFxSnapshot().then((data) => {
            if (!data?.rates || typeof data.rates !== 'object') return
            setExchangeRates({ ...data.rates })
            setFxSnapshotId(data.snapshot_id ?? null)
            setFxAsOf(data.as_of ?? null)
            setFxStale(Boolean(data.stale))
            setFxSource(data.source ?? null)
        })
    }, [mounted])

    const convert = useCallback(
        (amount: number, from: string = baseCurrency, to: string = currency): number => {
            return convertWithRates(amount, from, to, exchangeRates)
        },
        [baseCurrency, currency, exchangeRates]
    )

    const formatCurrency = useCallback((amount: number): string => {
        if (!Number.isFinite(amount)) return '—'
        const formatter = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
        return formatter.format(amount)
    }, [currency])

    const formatDisplayPrice = useCallback(
        (amount: number, fromCurrency?: string): string => {
            if (!Number.isFinite(amount)) return '—'
            const converted = convert(amount, fromCurrency ?? baseCurrency)
            return formatCurrency(converted)
        },
        [baseCurrency, convert, formatCurrency]
    )

    const value: CurrencyContextType = useMemo(
        () => ({
            currency,
            setCurrency,
            baseCurrency,
            enabledDisplayCurrencies,
            fxSnapshotId,
            fxAsOf,
            fxStale,
            fxSource,
            exchangeRates,
            mergeFxRates,
            convert,
            formatCurrency,
            formatDisplayPrice,
        }),
        [
            currency,
            baseCurrency,
            enabledDisplayCurrencies,
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
    )

    return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export const useCurrency = (): CurrencyContextType => {
    const context = useContext(CurrencyContext)
    if (!context) {
        throw new Error('useCurrency must be used within a CurrencyProvider')
    }
    return context
}
