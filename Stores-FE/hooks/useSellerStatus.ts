'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { useUserAccountId } from '@/hooks/useUserAccountId'
import {
    getSellerMe,
    type DocKind,
    type SellerDocument,
    type SellerMe,
    type SellerMeResult,
    type SellerStatus,
} from '@/lib/sellerOnboardingApi'

export type SellerStatusValue = SellerStatus | 'unknown'

export interface UseSellerStatus {
    /** 'unknown' while loading, signed out, or when the request failed (never guessed). */
    status: SellerStatusValue
    /** True once we are mounted, signed in, and the first answer (or error) arrived. */
    resolved: boolean
    loading: boolean
    /** Network/server failure that is not a "no seller profile" answer. */
    error: boolean
    isAuthenticated: boolean
    notes: string | null
    missingDocuments: DocKind[]
    /** Profile fields the backend still needs (for example `selling_categories`). */
    missingFields: string[]
    documents: SellerDocument[]
    canResubmit: boolean
    profile: SellerMe | null
    refresh: () => Promise<SellerMeResult | undefined>
}

/**
 * Seller verification state for the signed-in user (SE2 `GET sellers/me/`).
 * Only fetches when authenticated, and only after mount so server and first
 * client render match (same pattern as the cart badge).
 */
export function useSellerStatus(options: { revalidateOnFocus?: boolean } = {}): UseSellerStatus {
    const { revalidateOnFocus = false } = options
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const isAuthenticated = useIsAuthenticated()
    const userId = useUserAccountId()
    const enabled = mounted && isAuthenticated

    const { data, error, isLoading, mutate } = useSWR<SellerMeResult>(
        enabled ? ['sellers/me/', userId ?? 'me'] : null,
        () => getSellerMe(),
        {
            revalidateOnFocus,
            shouldRetryOnError: false,
            dedupingInterval: 30_000,
        }
    )

    let status: SellerStatusValue = 'unknown'
    if (enabled && data === null) status = 'none'
    else if (enabled && data) status = data.verification_status

    return {
        status,
        resolved: enabled && (data !== undefined || Boolean(error)),
        loading: enabled && isLoading,
        error: enabled && Boolean(error) && data === undefined,
        isAuthenticated: mounted && Boolean(isAuthenticated),
        notes: data?.verification_notes ?? null,
        missingDocuments: data?.missing_documents ?? [],
        missingFields: data?.missing_fields ?? [],
        documents: data?.documents ?? [],
        canResubmit: Boolean(data?.can_resubmit) || data?.verification_status === 'rejected',
        profile: data ?? null,
        refresh: () => mutate(),
    }
}
