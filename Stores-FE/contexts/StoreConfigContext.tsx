'use client'

import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { fetchPublicStoreConfig, PublicStoreConfig } from '@/lib/storeConfigClient'

interface StoreConfigContextType {
    config: PublicStoreConfig | null
    /** True until the first BE response arrives. */
    loading: boolean
    /** True when the BE returned a config (non-null). */
    ready: boolean
    /** Force a re-fetch — useful after the admin updates settings. */
    refresh: () => Promise<void>
}

const StoreConfigContext = createContext<StoreConfigContextType | undefined>(undefined)

export const StoreConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<PublicStoreConfig | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = async () => {
        setLoading(true)
        const data = await fetchPublicStoreConfig()
        setConfig(data)
        setLoading(false)
    }

    useEffect(() => {
        refresh()
    }, [])

    const value = useMemo<StoreConfigContextType>(
        () => ({ config, loading, ready: config !== null, refresh }),
        [config, loading]
    )

    return <StoreConfigContext.Provider value={value}>{children}</StoreConfigContext.Provider>
}

export const useStoreConfig = (): StoreConfigContextType => {
    const ctx = useContext(StoreConfigContext)
    if (!ctx) throw new Error('useStoreConfig must be used within a StoreConfigProvider')
    return ctx
}

/**
 * Convenience selector — narrows the optional `config` to the field with a
 * fallback default so consumers don't have to repeat null-checks everywhere.
 */
export function useStoreConfigField<K extends keyof PublicStoreConfig>(
    key: K,
    fallback: PublicStoreConfig[K]
): PublicStoreConfig[K] {
    const { config } = useStoreConfig()
    return config ? (config[key] as PublicStoreConfig[K]) : fallback
}
