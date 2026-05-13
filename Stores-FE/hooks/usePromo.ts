'use client'

import { useCallback, useState } from 'react'
import {
    autoApplyPromo,
    validatePromo,
    type CartSnapshot,
    type PromoResult,
} from '@/lib/promos'

export type { PromoResult, CartSnapshot } from '@/lib/promos'

interface UsePromoReturn {
    result: PromoResult | null
    loading: boolean
    apply: (code: string, cart: CartSnapshot) => Promise<boolean>
    remove: () => void
    autoApply: (cart: CartSnapshot) => Promise<void>
    setResult: (r: PromoResult | null) => void
}

/**
 * Manages a single applied promo code in the cart / checkout.
 *
 * Usage:
 *   const { result, loading, apply, remove } = usePromo()
 *   const ok = await apply('SAVE50', { subtotal: 600, item_count: 3 })
 *
 *   // discount = result.valid ? parseFloat(result.discount_amount) : 0
 */
export function usePromo(): UsePromoReturn {
    const [result, setResult] = useState<PromoResult | null>(null)
    const [loading, setLoading] = useState(false)

    const apply = useCallback(async (code: string, cart: CartSnapshot): Promise<boolean> => {
        if (!code.trim()) return false
        setLoading(true)
        try {
            const data = await validatePromo(code, cart)
            setResult(data)
            return data.valid
        } finally {
            setLoading(false)
        }
    }, [])

    const remove = useCallback(() => setResult(null), [])

    const autoApply = useCallback(
        async (cart: CartSnapshot) => {
            // Don't auto-apply if user already has a code applied.
            if (result?.valid) return
            const data = await autoApplyPromo(cart)
            if (data) setResult(data)
        },
        [result?.valid]
    )

    return { result, loading, apply, remove, autoApply, setResult }
}
