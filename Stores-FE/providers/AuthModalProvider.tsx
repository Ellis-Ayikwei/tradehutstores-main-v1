'use client'

/**
 * AuthModalProvider
 *
 * Hangs an `AuthModal` off the React tree at the layout level, then exposes
 * `useAuthModal()` so any component (Navbar, "Buy now" button, gated link)
 * can fire `openAuthModal()` instead of navigating to /auth/login.
 *
 * The legacy `/auth/login` and `/auth/register` pages remain valid deep
 * links — this provider does not interfere with them.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import AuthModal from '../components/Auth/AuthModal'
import { registerAuthModalOpener } from '@/lib/authModalBridge'

type Mode = 'login' | 'signup' | 'auto'

interface AuthModalCtx {
    open: boolean
    mode: Mode
    openAuthModal: (mode?: Mode) => void
    closeAuthModal: () => void
}

const Ctx = createContext<AuthModalCtx | null>(null)

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState<Mode>('auto')

    const openAuthModal = useCallback((next: Mode = 'auto') => {
        setMode(next)
        setOpen(true)
    }, [])
    const closeAuthModal = useCallback(() => setOpen(false), [])

    useEffect(() => registerAuthModalOpener(openAuthModal), [openAuthModal])

    const value = useMemo(
        () => ({ open, mode, openAuthModal, closeAuthModal }),
        [open, mode, openAuthModal, closeAuthModal],
    )

    return (
        <Ctx.Provider value={value}>
            {children}
            <AuthModal open={open} initialMode={mode} onClose={closeAuthModal} />
        </Ctx.Provider>
    )
}

export function useAuthModal() {
    const ctx = useContext(Ctx)
    if (!ctx) {
        // SSR / outside-provider safety: return a no-op so callers don't
        // crash during prerender.
        return {
            open: false,
            mode: 'auto' as const,
            openAuthModal: () => {},
            closeAuthModal: () => {},
        }
    }
    return ctx
}
