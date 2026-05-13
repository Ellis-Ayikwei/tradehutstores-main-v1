'use client'

import { useEffect, useRef, useState } from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { CURRENCY_META } from '@/lib/storeCurrency'

type Variant = 'compact' | 'inline' | 'panel'

interface CurrencyPickerProps {
    /**
     * compact – pill button with symbol + code (top utility bar)
     * inline  – outlined select-like row (Navbar desktop)
     * panel   – full-width touchable button (Navbar mobile menu)
     */
    variant?: Variant
    className?: string
}

const FALLBACK = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES']

export default function CurrencyPicker({ variant = 'compact', className = '' }: CurrencyPickerProps) {
    const { currency, setCurrency, enabledDisplayCurrencies, baseCurrency } = useCurrency()
    const options =
        enabledDisplayCurrencies && enabledDisplayCurrencies.length > 0
            ? enabledDisplayCurrencies
            : FALLBACK

    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        if (open) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const activeMeta = CURRENCY_META[currency] ?? { symbol: currency, label: currency }

    // ── Trigger styles per variant ───────────────────────────────────────────
    const triggerClass =
        variant === 'compact'
            ? 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors text-xs font-medium text-gray-700 dark:text-white whitespace-nowrap'
            : variant === 'inline'
            ? 'flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200'
            : 'w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'

    // ── Popover position per variant ─────────────────────────────────────────
    const panelClass =
        variant === 'panel'
            ? 'absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 z-[200] overflow-hidden'
            : 'absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 z-[200] overflow-hidden'

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`Currency: ${activeMeta.label}`}
                className={triggerClass}
            >
                <Globe className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-white" />
                <span className="font-mono text-[11px] font-bold tracking-wider text-gray-900 dark:text-white">
                    {activeMeta.symbol}
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">{currency}</span>
                <ChevronDown
                    className={`h-3 w-3 text-gray-400 dark:text-white/70 transition-transform duration-200 ${
                        open ? 'rotate-180' : ''
                    } ${variant === 'panel' ? 'ml-auto' : ''}`}
                />
            </button>

            {open && (
                <div
                    role="listbox"
                    className={panelClass}
                    style={{ animation: 'dropIn 0.15s cubic-bezier(0.16,1,0.3,1) forwards' }}
                >
                    <p className="px-3 pt-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                        Display currency
                    </p>
                    <div className="max-h-72 overflow-y-auto">
                        {options.map((code) => {
                            const meta = CURRENCY_META[code] ?? { symbol: code, label: code }
                            const isActive = code === currency
                            const isBase = code === baseCurrency
                            return (
                                <button
                                    key={code}
                                    role="option"
                                    aria-selected={isActive}
                                    onClick={() => {
                                        setCurrency(code)
                                        setOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                                        isActive
                                            ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span className="font-mono text-sm font-bold w-10 text-left">
                                        {meta.symbol}
                                    </span>
                                    <span className="font-semibold">{code}</span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                        {meta.label}
                                    </span>
                                    <span className="ml-auto flex items-center gap-1.5">
                                        {isBase && (
                                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300">
                                                Base
                                            </span>
                                        )}
                                        {isActive && (
                                            <Check className="h-3.5 w-3.5 text-orange-500" />
                                        )}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
