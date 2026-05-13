'use client'

import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { useStoreConfig } from '@/contexts/StoreConfigContext'
import { COUNTRY_META, getShippableCountries } from '@/lib/storeCurrency'

interface ShipToContextType {
    /** ISO-3166 alpha-2 of the visitor's chosen delivery destination. */
    country: string
    setCountry: (code: string) => void
    /** Set of countries the storefront actually ships to (from admin shipping zones). */
    shippableCountries: string[]
    /** Convenience: { name, flag } for the currently-selected country. */
    countryName: string
    countryFlag: string
}

const ShipToContext = createContext<ShipToContextType | undefined>(undefined)

const STORAGE_KEY = 'tradehut:shipTo'

export const ShipToProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { config } = useStoreConfig()

    // Default to the storefront's home country once config has loaded.
    const [country, setCountryState] = useState<string>('GH')

    useEffect(() => {
        const saved = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)
        if (saved && COUNTRY_META[saved]) {
            setCountryState(saved)
        } else if (config?.locale_country && COUNTRY_META[config.locale_country]) {
            setCountryState(config.locale_country)
        }
    }, [config?.locale_country])

    const shippableCountries = useMemo(
        () => getShippableCountries(config?.shipping_zones),
        [config?.shipping_zones]
    )

    // If the admin disables a zone the user was shipping to, fall back to the
    // first available shippable country so we never render an empty selector.
    useEffect(() => {
        if (shippableCountries.length === 0) return
        if (!shippableCountries.includes(country)) {
            setCountryState(shippableCountries[0])
        }
    }, [country, shippableCountries])

    const setCountry = (code: string) => {
        if (!COUNTRY_META[code]) return
        setCountryState(code)
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, code)
    }

    const meta = COUNTRY_META[country] ?? { name: country, flag: '🌍' }

    const value = useMemo<ShipToContextType>(
        () => ({
            country,
            setCountry,
            shippableCountries,
            countryName: meta.name,
            countryFlag: meta.flag,
        }),
        // setCountry's identity is stable enough — countries rarely flip.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [country, shippableCountries, meta.name, meta.flag]
    )

    return <ShipToContext.Provider value={value}>{children}</ShipToContext.Provider>
}

export const useShipTo = (): ShipToContextType => {
    const ctx = useContext(ShipToContext)
    if (!ctx) throw new Error('useShipTo must be used within a ShipToProvider')
    return ctx
}
