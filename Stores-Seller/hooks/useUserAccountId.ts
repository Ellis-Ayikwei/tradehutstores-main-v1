'use client'

import { useMemo } from 'react'
import useAuthUser from 'react-auth-kit/hooks/useAuthUser'

type AuthUser = { id: string }

/**
 * Canonical user id for `users/{id}/…` endpoints — react-auth-kit state, then localStorage.
 */
export function useUserAccountId(): string | null {
    const authUser = useAuthUser<AuthUser | null>()

    return useMemo(() => {
        if (typeof window === 'undefined') return null
        const fromKit = authUser?.id
        if (fromKit && fromKit !== 'undefined') return String(fromKit)
        const stored = localStorage.getItem('userId')
        if (stored && stored !== 'undefined') return stored
        return null
    }, [authUser?.id])
}
