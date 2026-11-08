'use client'

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react'
import {
    THEME_STORAGE_KEY,
    applyResolvedTheme,
    readDomTheme,
    readStoredPreference,
    resolvePreference,
    type ResolvedTheme,
} from '@/lib/theme.config'

type Theme = ResolvedTheme

interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

/*
 * The inline boot script in app/layout.tsx has already put `dark`/`light` on <html> before first paint.
 * This provider only MIRRORS that state (the DOM class is the source of truth) and never re-applies a
 * default on mount, so there is no second repaint or flip after hydration.
 */
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
    listeners.add(cb)
    const onStorage = (e: StorageEvent) => {
        if (e.key === THEME_STORAGE_KEY || e.key === null) {
            applyResolvedTheme(resolvePreference(readStoredPreference()))
            cb()
        }
    }
    window.addEventListener('storage', onStorage)
    return () => {
        listeners.delete(cb)
        window.removeEventListener('storage', onStorage)
    }
}

const getSnapshot = (): Theme => readDomTheme()
const getServerSnapshot = (): Theme => 'light'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

    const toggleTheme = useCallback(() => {
        const next: Theme = readDomTheme() === 'dark' ? 'light' : 'dark'
        applyResolvedTheme(next)
        try {
            localStorage.setItem(THEME_STORAGE_KEY, next)
        } catch {
            /* storage unavailable: still toggles for this session */
        }
        listeners.forEach((l) => l())
    }, [])

    const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
