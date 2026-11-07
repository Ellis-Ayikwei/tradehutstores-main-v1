'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { CURRENCY_META } from '@/lib/storeCurrency'
import PickerSheet from '@/components/Navigation/PickerSheet'

type Variant = 'strip' | 'header' | 'panel'

interface CurrencyPickerProps {
    /**
     * strip  - "<code> v" text button in the mobile/tablet strip; opens a bottom sheet
     * header - two-line block in the desktop header row; opens an anchored dropdown
     * panel  - full-width bordered button in the mobile drawer; opens a bottom sheet
     */
    variant?: Variant
    className?: string
}

const FALLBACK = ['GHS', 'USD', 'EUR', 'GBP', 'NGN', 'KES']

export default function CurrencyPicker({ variant = 'header', className = '' }: CurrencyPickerProps) {
    const { currency, setCurrency, enabledDisplayCurrencies, baseCurrency } = useCurrency()
    const options =
        enabledDisplayCurrencies && enabledDisplayCurrencies.length > 0 ? enabledDisplayCurrencies : FALLBACK

    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const close = useCallback(() => setOpen(false), [])

    // Dropdown only: close on outside click / Escape.
    useEffect(() => {
        if (!open || variant !== 'header') return
        function onDown(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        function onKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open, variant])

    const activeMeta = CURRENCY_META[currency] ?? { symbol: currency, label: currency }
    const label = `Currency: ${activeMeta.label}`

    const body = (
        <div role="listbox" aria-label="Display currency" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {options.map((code) => {
                const meta = CURRENCY_META[code] ?? { symbol: code, label: code }
                const isActive = code === currency
                return (
                    <button
                        key={code}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => {
                            setCurrency(code)
                            setOpen(false)
                        }}
                        className={`flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800 ${
                            isActive ? 'bg-zinc-100 font-semibold dark:bg-zinc-800' : ''
                        }`}
                    >
                        <span className="w-12 shrink-0 font-mono text-sm font-bold">{meta.symbol}</span>
                        <span className="shrink-0 font-semibold">{code}</span>
                        <span className="min-w-0 flex-1 truncate text-zinc-600 dark:text-zinc-400">{meta.label}</span>
                        {code === baseCurrency && (
                            <span className="shrink-0 text-xs text-zinc-600 dark:text-zinc-400">Store currency</span>
                        )}
                        {isActive && <Check className="h-4 w-4 shrink-0 text-primary-700 dark:text-primary-400" aria-hidden />}
                    </button>
                )
            })}
        </div>
    )

    return (
        <div ref={ref} className={`relative ${className}`}>
            {variant === 'strip' && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-haspopup="dialog"
                    aria-label={label}
                    className="flex h-11 items-center gap-1 pl-2 text-xs font-bold text-zinc-900 dark:text-white"
                >
                    {currency}
                    <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </button>
            )}

            {variant === 'header' && (
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    aria-label={label}
                    className="flex h-11 items-center gap-1 rounded-md px-2 text-left text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                    <span className="flex flex-col leading-tight">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">Currency</span>
                        <span className="text-sm font-bold">{currency}</span>
                    </span>
                    <ChevronDown className="mt-3 h-3.5 w-3.5 shrink-0" aria-hidden />
                </button>
            )}

            {variant === 'panel' && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-haspopup="dialog"
                    aria-label={label}
                    className="flex min-h-[44px] w-full items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-left text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                    <span className="min-w-0 flex-1 truncate">
                        Currency <span className="font-bold">{currency}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                </button>
            )}

            {variant === 'header' ? (
                open && (
                    <div className="absolute right-0 top-full z-[200] mt-1 flex max-h-96 w-64 flex-col overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                        <p className="shrink-0 border-b border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                            Display currency
                        </p>
                        {body}
                    </div>
                )
            ) : (
                <PickerSheet open={open} onClose={close} title="Display currency">
                    {body}
                </PickerSheet>
            )}
        </div>
    )
}
