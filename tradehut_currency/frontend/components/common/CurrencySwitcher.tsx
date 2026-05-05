'use client'

import { useCurrency, SUPPORTED_CURRENCIES } from '@/contexts/CurrencyContext'

/**
 * Drop-in currency selector.
 * Place in your header/navbar — useCurrency() propagates the change everywhere.
 *
 * Usage:
 *   import CurrencySwitcher from '@/components/common/CurrencySwitcher'
 *   <CurrencySwitcher />
 */
export default function CurrencySwitcher() {
    const { currency, setCurrency, ratesStale, ratesLoading } = useCurrency()

    return (
        <div className="flex items-center gap-1.5">
            <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={ratesLoading}
                aria-label="Select display currency"
                className="
                    text-xs font-bold bg-transparent
                    border border-zinc-200 dark:border-zinc-700
                    text-zinc-700 dark:text-zinc-300
                    rounded-lg px-2 py-1.5
                    focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400
                    cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                "
            >
                {SUPPORTED_CURRENCIES.map(({ code, label, symbol }) => (
                    <option key={code} value={code}>
                        {symbol} {code} — {label}
                    </option>
                ))}
            </select>

            {/* Stale indicator — shown when backend couldn't reach FX provider */}
            {ratesStale && !ratesLoading && (
                <span
                    title="Exchange rates may be slightly outdated"
                    className="text-[10px] font-black text-amber-500 leading-none"
                    aria-label="Exchange rates may be outdated"
                >
                    ~
                </span>
            )}

            {ratesLoading && (
                <span className="h-3 w-3 rounded-full border-2 border-zinc-300 border-t-zinc-700 animate-spin" />
            )}
        </div>
    )
}
