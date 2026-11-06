'use client'

import { useCallback } from 'react'
import useSWR from 'swr'
import { AuctionsApiError, fetchAuctionState, type AuctionState } from '@/lib/auctionsApi'

/**
 * Poll cadence (ms) for one auction. Returns 0 to stop polling.
 * - ending_soon: 2s. Other live states: 5s.
 * - Ended by the clock but not yet finalised by the server: 3s, so the result appears quickly.
 * - Finalised winner order not yet attached: 5s until `order_id` shows up.
 * - Scheduled: 15s (to notice it going live). Finalised / cancelled: stop.
 * SWR itself skips the network call while the document is hidden (`refreshWhenHidden: false`)
 * and revalidates on tab focus / visibilitychange, so a hidden tab makes no requests.
 */
export function pollIntervalFor(state: AuctionState | undefined): number {
    if (!state) return 5000
    switch (state.display_status) {
        case 'ending_soon':
            return 2000
        case 'live':
            return 5000
        case 'scheduled':
            return 15000
        case 'cancelled':
            return 0
        case 'ended':
            if (state.status !== 'ended') return 3000
            if ((state.result === 'sold' || state.result === 'bought_now') && !state.order_id) return 5000
            return 0
    }
}

export interface UseAuctionState {
    state: AuctionState | undefined
    error: AuctionsApiError | undefined
    notFound: boolean
    isLoading: boolean
    /** Re-fetch now. */
    refresh: () => void
    /** Apply a fresher state returned by a write (bid / buy-now) without refetching. */
    applyState: (next: AuctionState) => void
}

export function useAuctionState(id: string | undefined): UseAuctionState {
    const { data, error, isLoading, mutate } = useSWR<AuctionState, AuctionsApiError>(
        id ? ['auction-state', id] : null,
        ([, auctionId]: [string, string]) => fetchAuctionState(auctionId),
        {
            refreshInterval: latest => pollIntervalFor(latest),
            refreshWhenHidden: false,
            refreshWhenOffline: false,
            revalidateOnFocus: true,
            focusThrottleInterval: 2000,
            dedupingInterval: 1000,
            keepPreviousData: true,
            onErrorRetry: (err, _key, _config, revalidate, { retryCount }) => {
                if (err.status === 404 || retryCount >= 8) return
                setTimeout(() => {
                    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
                        void revalidate({ retryCount })
                    }
                }, Math.min(3000 * (retryCount + 1), 20000))
            },
        }
    )

    const refresh = useCallback(() => {
        void mutate()
    }, [mutate])

    const applyState = useCallback(
        (next: AuctionState) => {
            void mutate(next, { revalidate: false })
        },
        [mutate]
    )

    return { state: data, error, notFound: error?.status === 404, isLoading, refresh, applyState }
}
