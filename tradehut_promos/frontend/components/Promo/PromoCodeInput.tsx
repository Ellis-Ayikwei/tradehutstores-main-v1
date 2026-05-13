'use client'

import { useState } from 'react'
import { Tag, X, Check, Loader2, ChevronDown } from 'lucide-react'
import { usePromo, type PromoResult } from '@/hooks/usePromo'
import { useCurrency } from '@/contexts/CurrencyContext'

interface Props {
    cart: {
        subtotal:     number
        item_count:   number
        item_ids?:    number[]
        category_ids?: number[]
    }
    /** Called when a valid code is applied or removed */
    onChange?: (result: PromoResult | null) => void
    /** Initially collapsed on mobile */
    collapsible?: boolean
}

/**
 * Drop-in promo code input for cart and checkout pages.
 *
 * Usage:
 *   <PromoCodeInput
 *     cart={{ subtotal: 500, item_count: 3 }}
 *     onChange={(result) => setAppliedPromo(result)}
 *   />
 */
export default function PromoCodeInput({ cart, onChange, collapsible = false }: Props) {
    const [input,    setInput]    = useState('')
    const [expanded, setExpanded] = useState(!collapsible)
    const { result, loading, apply, remove } = usePromo()
    const { formatCurrency } = useCurrency()

    const handleApply = async () => {
        if (!input.trim()) return
        const success = await apply(input, cart)
        if (success) {
            onChange?.(result)
            setInput('')
        }
    }

    const handleRemove = () => {
        remove()
        onChange?.(null)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleApply()
    }

    // Applied state
    if (result?.valid) {
        return (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950 p-4">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                            <Check size={15} strokeWidth={2.5} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-black text-sm text-zinc-900 dark:text-white">
                                    {result.code}
                                </span>
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                    — {formatCurrency(parseFloat(result.discount_amount))} off
                                    {result.free_shipping && ' + Free Shipping'}
                                </span>
                            </div>
                            {result.description && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">
                                    {result.description}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleRemove}
                        aria-label="Remove promo code"
                        className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X size={14} strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div>
            {/* Collapsible trigger */}
            {collapsible && (
                <button
                    onClick={() => setExpanded(v => !v)}
                    className="flex items-center gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors mb-2"
                >
                    <Tag size={14} />
                    Have a promo code?
                    <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    />
                </button>
            )}

            {expanded && (
                <div className="space-y-2">
                    {!collapsible && (
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
                            Promo Code
                        </label>
                    )}

                    <div className="flex gap-2">
                        <div className="flex-grow relative">
                            <Tag
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                            />
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value.toUpperCase())}
                                onKeyDown={handleKeyDown}
                                placeholder="ENTER CODE"
                                disabled={loading}
                                className="
                                    w-full pl-9 pr-4 py-3
                                    bg-zinc-50 dark:bg-zinc-900
                                    border border-zinc-200 dark:border-zinc-700
                                    rounded-xl
                                    text-xs font-bold text-zinc-900 dark:text-white uppercase
                                    placeholder:text-zinc-400 placeholder:normal-case
                                    focus:border-zinc-900 dark:focus:border-zinc-400
                                    focus:outline-none transition-colors
                                    disabled:opacity-50
                                "
                            />
                        </div>
                        <button
                            onClick={handleApply}
                            disabled={loading || !input.trim()}
                            className="
                                px-5 py-3 rounded-xl
                                bg-zinc-900 dark:bg-white
                                text-white dark:text-zinc-900
                                text-xs font-black uppercase tracking-widest
                                hover:bg-zinc-700 dark:hover:bg-zinc-100
                                disabled:opacity-40 disabled:pointer-events-none
                                transition-all flex items-center gap-2 flex-shrink-0
                            "
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Apply'}
                        </button>
                    </div>

                    {/* Error state */}
                    {result && !result.valid && result.error_message && (
                        <p className="text-xs text-red-500 dark:text-red-400 font-medium flex items-center gap-1.5 mt-1">
                            <X size={12} strokeWidth={2.5} className="flex-shrink-0" />
                            {result.error_message}
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}
