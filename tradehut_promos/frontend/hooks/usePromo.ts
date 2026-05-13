'use client'

import { useState, useCallback } from 'react'

export interface PromoResult {
    valid:           boolean
    code:            string
    discount_type:   string
    discount_amount: string   // string decimal e.g. "25.00"
    free_shipping:   boolean
    description:     string
    error_code:      string
    error_message:   string
}

interface CartSnapshot {
    subtotal:     number
    item_count:   number
    item_ids?:    number[]
    category_ids?: number[]
}

interface UsePromoReturn {
    result:    PromoResult | null
    loading:   boolean
    apply:     (code: string, cart: CartSnapshot) => Promise<boolean>
    remove:    () => void
    autoApply: (cart: CartSnapshot) => Promise<void>
}

/**
 * Manages promo code state in the cart / checkout.
 *
 * Usage:
 *   const { result, loading, apply, remove } = usePromo()
 *
 *   // On Apply button click:
 *   const success = await apply('SUMMER20', { subtotal: 500, item_count: 3 })
 *
 *   // On cart update (auto-apply check):
 *   useEffect(() => { autoApply({ subtotal, item_count }) }, [subtotal])
 */
export function usePromo(): UsePromoReturn {
    const [result,  setResult]  = useState<PromoResult | null>(null)
    const [loading, setLoading] = useState(false)

    const apply = useCallback(async (code: string, cart: CartSnapshot): Promise<boolean> => {
        if (!code.trim()) return false
        setLoading(true)

        try {
            const res = await fetch('/api/promos/validate/', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code:         code.trim().toUpperCase(),
                    subtotal:     cart.subtotal,
                    item_count:   cart.item_count,
                    item_ids:     cart.item_ids    ?? [],
                    category_ids: cart.category_ids ?? [],
                }),
            })

            const data: PromoResult = await res.json()
            setResult(data)

            if (res.status === 429) {
                setResult({
                    valid: false, code, discount_type: '', discount_amount: '0',
                    free_shipping: false, description: '',
                    error_code: 'rate_limited',
                    error_message: 'Too many attempts. Please try again later.',
                })
                return false
            }

            return data.valid
        } catch {
            setResult({
                valid: false, code, discount_type: '', discount_amount: '0',
                free_shipping: false, description: '',
                error_code: 'network_error',
                error_message: 'Could not validate code. Please try again.',
            })
            return false
        } finally {
            setLoading(false)
        }
    }, [])

    const remove = useCallback(() => setResult(null), [])

    const autoApply = useCallback(async (cart: CartSnapshot) => {
        // Don't auto-apply if user already has a code applied
        if (result?.valid) return

        try {
            const res = await fetch(
                `/api/promos/auto/?subtotal=${cart.subtotal}&item_count=${cart.item_count}`
            )
            const data = await res.json()
            if (data.promo) {
                setResult({
                    valid:           true,
                    code:            data.promo.code,
                    discount_type:   '',
                    discount_amount: data.promo.discount_amount,
                    free_shipping:   data.promo.free_shipping,
                    description:     data.promo.description,
                    error_code:      '',
                    error_message:   '',
                })
            }
        } catch {
            // Silent — auto-apply is best-effort
        }
    }, [result])

    return { result, loading, apply, remove, autoApply }
}
