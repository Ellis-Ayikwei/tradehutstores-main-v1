'use client'

import { Truck } from 'lucide-react'
import type { PublicShippingMethod } from '@/lib/storeConfigClient'
import { BTN_PRIMARY, OptionRow } from './ui'
import { safeAmount } from './Money'

interface DeliverySectionProps {
    methods: PublicShippingMethod[]
    configLoading: boolean
    selectedId: string | null
    onSelect: (id: string) => void
    onContinue: () => void
    formatPrice: (n: number) => string
}

/** Delivery methods exactly as configured in the store settings (enabled ones only). */
export default function DeliverySection({
    methods,
    configLoading,
    selectedId,
    onSelect,
    onContinue,
    formatPrice,
}: DeliverySectionProps) {
    if (configLoading && methods.length === 0) {
        return (
            <div role="status" aria-label="Loading delivery options" className="animate-pulse space-y-2">
                {[0, 1].map((i) => (
                    <div key={i} className="h-[60px] rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                ))}
            </div>
        )
    }

    if (methods.length === 0) {
        return (
            <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>Delivery options are confirmed at checkout.</p>
                </div>
                <div className="flex sm:justify-end">
                    <button type="button" onClick={onContinue} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
                        Continue
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div role="radiogroup" aria-label="Delivery method" className="space-y-2">
                {methods.map((m) => {
                    const rate = safeAmount(m.rate)
                    return (
                        <OptionRow
                            key={m.id}
                            name="delivery-method"
                            value={m.id}
                            selected={selectedId === m.id}
                            onSelect={() => onSelect(m.id)}
                        >
                            <div className="flex items-baseline justify-between gap-3">
                                <p className="font-semibold">{m.name}</p>
                                <p className="shrink-0 font-semibold tabular-nums">
                                    {rate > 0 ? formatPrice(rate) : 'Free'}
                                </p>
                            </div>
                            {m.transit ? <p className="text-zinc-600 dark:text-zinc-400">{m.transit}</p> : null}
                        </OptionRow>
                    )
                })}
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                The final delivery fee is confirmed in your order summary.
            </p>
            <div className="flex sm:justify-end">
                <button type="button" onClick={onContinue} disabled={!selectedId} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
                    Use this delivery method
                </button>
            </div>
        </div>
    )
}
