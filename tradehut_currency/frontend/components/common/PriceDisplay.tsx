'use client'

/**
 * components/common/PriceDisplay.tsx
 *
 * Renders a price with optional original/strike-through price and discount badge.
 * Handles conversion + formatting via useCurrency internally.
 *
 * Usage:
 *   // Simple
 *   <PriceDisplay amount={1200} />
 *
 *   // With original price (shows discount badge automatically)
 *   <PriceDisplay amount={890} originalAmount={1399} />
 *
 *   // Size variants
 *   <PriceDisplay amount={1200} size="lg" />
 */

import { useCurrency } from '@/contexts/CurrencyContext'

interface Props {
    /** Sale / current price in BASE_CURRENCY (GHS) */
    amount: number
    /** Original price for strike-through and discount badge */
    originalAmount?: number
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    /** Show the discount percentage badge */
    showBadge?: boolean
}

const SIZE_MAP = {
    sm: { price: 'text-sm',  original: 'text-xs',  badge: 'text-[10px]' },
    md: { price: 'text-base',original: 'text-xs',  badge: 'text-[10px]' },
    lg: { price: 'text-xl',  original: 'text-sm',  badge: 'text-xs'     },
    xl: { price: 'text-3xl', original: 'text-base',badge: 'text-xs'     },
}

export default function PriceDisplay({
    amount,
    originalAmount,
    size       = 'md',
    className  = '',
    showBadge  = true,
}: Props) {
    const { formatCurrency } = useCurrency()
    const sizes = SIZE_MAP[size]

    const hasDiscount = originalAmount != null && originalAmount > amount
    const discountPct = hasDiscount
        ? Math.round(((originalAmount! - amount) / originalAmount!) * 100)
        : 0

    return (
        <div className={`flex items-baseline gap-2 flex-wrap ${className}`}>
            {/* Current price */}
            <span className={`font-mono font-black text-zinc-900 dark:text-white ${sizes.price}`}>
                {formatCurrency(amount)}
            </span>

            {/* Original / strike-through price */}
            {hasDiscount && (
                <span className={`font-mono text-zinc-400 line-through ${sizes.original}`}>
                    {formatCurrency(originalAmount!)}
                </span>
            )}

            {/* Discount badge */}
            {hasDiscount && showBadge && discountPct > 0 && (
                <span className={`bg-red-500 text-white font-black px-1.5 py-0.5 rounded ${sizes.badge}`}>
                    -{discountPct}%
                </span>
            )}
        </div>
    )
}
