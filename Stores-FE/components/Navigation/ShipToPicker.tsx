'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, ChevronDown, Check, Search } from 'lucide-react'
import { useShipTo } from '@/contexts/ShipToContext'
import { COUNTRY_META } from '@/lib/storeCurrency'

type Variant = 'compact' | 'panel'

interface ShipToPickerProps {
    /**
     * compact – pill button with flag + "Ship to <CC>" (top utility bar)
     * panel   – full-width touchable button (Navbar mobile menu)
     */
    variant?: Variant
    className?: string
}

export default function ShipToPicker({ variant = 'compact', className = '' }: ShipToPickerProps) {
    const { country, setCountry, shippableCountries, countryName, countryFlag } = useShipTo()

    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handler(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        if (open) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    // Reset the search field whenever the popover closes so reopening starts fresh.
    useEffect(() => {
        if (!open) setQuery('')
    }, [open])

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase()
        return shippableCountries
            .map((code) => ({ code, ...(COUNTRY_META[code] ?? { name: code, flag: '🌍' }) }))
            .filter(
                (c) =>
                    !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
            )
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [shippableCountries, query])

    const triggerClass =
        variant === 'compact'
            ? 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors text-xs font-medium text-gray-700 dark:text-white whitespace-nowrap'
            : 'w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'

    const panelClass =
        variant === 'panel'
            ? 'absolute left-0 right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[200] overflow-hidden'
            : 'absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[200] overflow-hidden'

    return (
        <div ref={ref} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={`Ship to ${countryName}`}
                className={triggerClass}
            >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-white" />
                {variant === 'compact' && (
                    <span className="hidden lg:inline text-gray-400 dark:text-white/70">
                        Ship to
                    </span>
                )}
                <span className="text-base leading-none">{countryFlag}</span>
                <span className="font-semibold text-gray-900 dark:text-white">{country}</span>
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
                    <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500 mb-2">
                            Deliver to
                        </p>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search country"
                                autoFocus
                                className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-orange-400"
                            />
                        </div>
                    </div>
                    <div className="max-h-72 overflow-y-auto py-1.5">
                        {rows.length === 0 && (
                            <p className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                                No countries match.
                            </p>
                        )}
                        {rows.map((c) => {
                            const isActive = c.code === country
                            return (
                                <button
                                    key={c.code}
                                    role="option"
                                    aria-selected={isActive}
                                    onClick={() => {
                                        setCountry(c.code)
                                        setOpen(false)
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                                        isActive
                                            ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-semibold'
                                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <span className="text-xl leading-none">{c.flag}</span>
                                    <span className="flex-1 text-left truncate">{c.name}</span>
                                    <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500">
                                        {c.code}
                                    </span>
                                    {isActive && <Check className="h-3.5 w-3.5 text-orange-500" />}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
