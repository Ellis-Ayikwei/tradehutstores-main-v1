'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapPin, ChevronDown, Check } from 'lucide-react'
import { useShipTo } from '@/contexts/ShipToContext'
import { COUNTRY_META } from '@/lib/storeCurrency'
import PickerSheet from '@/components/Navigation/PickerSheet'

type Variant = 'strip' | 'header' | 'panel'

interface ShipToPickerProps {
    /**
     * strip  - "Deliver to <country>" text button in the mobile/tablet strip; opens a bottom sheet
     * header - two-line block in the desktop header row; opens an anchored dropdown
     * panel  - full-width bordered button in the mobile drawer; opens a bottom sheet
     */
    variant?: Variant
    className?: string
}

export default function ShipToPicker({ variant = 'header', className = '' }: ShipToPickerProps) {
    const { country, setCountry, shippableCountries, countryName } = useShipTo()

    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
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

    // Start fresh each time it reopens.
    useEffect(() => {
        if (!open) setQuery('')
    }, [open])

    const rows = useMemo(() => {
        const q = query.trim().toLowerCase()
        return shippableCountries
            .map((code) => ({ code, name: COUNTRY_META[code]?.name ?? code }))
            .filter((c) => !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [shippableCountries, query])

    const body = (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-zinc-200 p-3 dark:border-zinc-800">
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search country"
                    aria-label="Search country"
                    autoFocus={variant === 'header'}
                    className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 lg:h-10 lg:text-sm"
                />
            </div>
            <div role="listbox" aria-label="Delivery country" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                {rows.length === 0 && (
                    <p className="px-4 py-4 text-sm text-zinc-600 dark:text-zinc-400">No countries match.</p>
                )}
                {rows.map((c) => {
                    const isActive = c.code === country
                    return (
                        <button
                            key={c.code}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onClick={() => {
                                setCountry(c.code)
                                setOpen(false)
                            }}
                            className={`flex min-h-[44px] w-full items-center gap-3 px-4 text-left text-sm text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800 ${
                                isActive ? 'bg-zinc-100 font-semibold dark:bg-zinc-800' : ''
                            }`}
                        >
                            <span className="min-w-0 flex-1 truncate">{c.name}</span>
                            <span className="font-mono text-xs text-zinc-600 dark:text-zinc-400">{c.code}</span>
                            {isActive && <Check className="h-4 w-4 shrink-0 text-primary-700 dark:text-primary-400" aria-hidden />}
                        </button>
                    )
                })}
            </div>
        </div>
    )

    const label = `Deliver to ${countryName}`

    return (
        <div ref={ref} className={`relative ${className}`}>
            {variant === 'strip' && (
                <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-haspopup="dialog"
                    aria-label={label}
                    className="flex h-11 w-full min-w-0 items-center gap-1.5 text-left text-xs text-zinc-700 dark:text-zinc-200"
                >
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0 truncate">
                        Deliver to <span className="font-bold text-zinc-900 dark:text-white">{countryName}</span>
                    </span>
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
                    <MapPin className="h-5 w-5 shrink-0" aria-hidden />
                    <span className="flex flex-col leading-tight">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">Deliver to</span>
                        <span className="max-w-[110px] truncate text-sm font-bold">{countryName}</span>
                    </span>
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
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                        Deliver to <span className="font-bold">{countryName}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                </button>
            )}

            {variant === 'header' ? (
                open && (
                    <div className="absolute left-0 top-full z-[200] mt-1 flex max-h-96 w-72 flex-col overflow-hidden rounded-md border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
                        {body}
                    </div>
                )
            ) : (
                <PickerSheet open={open} onClose={close} title="Deliver to">
                    {body}
                </PickerSheet>
            )}
        </div>
    )
}
