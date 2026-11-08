'use client'

import { useMemo } from 'react'
import { useUserAccountId } from '@/hooks/useUserAccountId'

/** SWR key heads shared by the Seller Central screens; the live keys also carry the user id (like `useSellerProfile`). */
export const SELLER_ME_KEY = 'seller:me'
export const SELLER_STATS_KEY = 'seller-central:stats'
const PRODUCT_KEY_HEADS: string[] = ['seller:product', 'seller:product-variants', 'seller:product-images']

/** Matches every user's stats entry, for global `mutate`. */
export const isSellerStatsKey = (key: unknown): boolean => Array.isArray(key) && key[0] === SELLER_STATS_KEY

/** Matches the cached product / variants / images of the listing editor, for global `mutate`. */
export const isSellerProductKey = (key: unknown): boolean => Array.isArray(key) && PRODUCT_KEY_HEADS.includes(key[0] as string)

/** Per-user SWR keys for the seller identity (`sellers/me`-style self lookup) and the dashboard stats. */
export function useSellerKeys() {
    const userId = useUserAccountId()
    return useMemo(
        () => ({
            meKey: [SELLER_ME_KEY, userId ?? 'me'] as const,
            statsKey: [SELLER_STATS_KEY, userId ?? 'me'] as const,
        }),
        [userId]
    )
}
