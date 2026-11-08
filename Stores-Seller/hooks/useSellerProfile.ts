'use client'

import { useCallback, useEffect, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { useUserAccountId } from '@/hooks/useUserAccountId'
import { toSellerError, type SellerError } from '@/lib/seller/errors'
import { getSellerProfile } from '@/lib/seller/profile'
import type { SellerProfile, VerificationStatus } from '@/lib/seller/types'

export interface UseSellerProfile {
    /** True once mounted on the client (auth state is only known after mount). */
    mounted: boolean
    isAuthenticated: boolean
    /** Signed in but the API says there is no seller profile (404 / 403 `not_a_seller`). */
    notSeller: boolean
    profile: SellerProfile | null
    status: VerificationStatus | null
    /** Suspended sellers can look but not change anything. */
    readOnly: boolean
    /** First load in flight. */
    isLoading: boolean
    isValidating: boolean
    /** Load failure that is not a "no seller profile" answer. */
    error: SellerError | null
    /** Re-fetch and update the cache (also refreshes the header "My store" badge). */
    refresh: () => Promise<SellerProfile | null | undefined>
    /** Put a fresh profile (for example a PATCH response) into the cache without refetching. */
    setProfile: (next: SellerProfile) => void
}

/**
 * The signed-in seller's store profile (SE2 `sellers/me/`) for Seller Central. One SWR key per user,
 * so the shell, the banner and every page share a single request.
 */
export function useSellerProfile(): UseSellerProfile {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const isAuthed = useIsAuthenticated()
    const userId = useUserAccountId()
    const enabled = mounted && Boolean(isAuthed)
    const key = enabled ? (['seller-central:profile', userId ?? 'me'] as const) : null

    const { mutate: globalMutate } = useSWRConfig()
    const { data, error, isLoading, isValidating, mutate } = useSWR<SellerProfile | null>(key, () => getSellerProfile(), {
        revalidateOnFocus: true,
        dedupingInterval: 15_000,
        shouldRetryOnError: false,
        keepPreviousData: true,
    })

    // The header "My store" badge reads `hooks/useSellerStatus` (a different cache key); keep it in step.
    const syncHeader = useCallback(
        () => globalMutate((k) => Array.isArray(k) && k[0] === 'sellers/me/'),
        [globalMutate]
    )

    const refresh = useCallback(async () => {
        const next = await mutate()
        void syncHeader()
        return next
    }, [mutate, syncHeader])

    const setProfile = useCallback(
        (next: SellerProfile) => {
            void mutate(next, { revalidate: false })
            void syncHeader()
        },
        [mutate, syncHeader]
    )

    const profile = data ?? null
    return {
        mounted,
        isAuthenticated: mounted && Boolean(isAuthed),
        notSeller: enabled && data === null,
        profile,
        status: profile?.verification_status ?? null,
        readOnly: profile?.verification_status === 'suspended',
        isLoading: enabled && isLoading,
        isValidating,
        error: error && data === undefined ? toSellerError(error) : null,
        refresh,
        setProfile,
    }
}
