'use client'

import { Tag, Copy, Check, Clock, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
    fetchSellerStorefrontPromos,
    type SellerStorefrontPromo,
} from '@/lib/promos'

interface Props {
    sellerId: string
    sellerName?: string
    /** Compact one-row variant for header areas; full grid otherwise. */
    variant?: 'compact' | 'grid'
    className?: string
    /** Called when the promo block has nothing to show — lets the parent hide a wrapper. */
    onEmpty?: () => void
}

/**
 * Renders a seller's currently-live promo codes on their public storefront.
 *
 *   <SellerPromosStrip sellerId={seller.id} sellerName={seller.business_name} />
 *
 * Returns null if the seller has no live codes (or the platform has hidden
 * storefront codes via PromoPolicy.public_storefront_codes_visible=false).
 */
export default function SellerPromosStrip({
    sellerId,
    sellerName,
    variant = 'grid',
    className = '',
    onEmpty,
}: Props) {
    const [promos, setPromos] = useState<SellerStorefrontPromo[] | null>(null)
    const [copied, setCopied] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        fetchSellerStorefrontPromos(sellerId).then((p) => {
            if (cancelled) return
            setPromos(p)
            if (p.length === 0) onEmpty?.()
        })
        return () => {
            cancelled = true
        }
    }, [sellerId, onEmpty])

    if (!promos || promos.length === 0) return null

    const onCopy = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code)
            setCopied(code)
            setTimeout(() => setCopied((c) => (c === code ? null : c)), 1800)
        } catch {
            /* ignore */
        }
    }

    if (variant === 'compact') {
        return (
            <div
                className={`flex items-center gap-2 overflow-x-auto no-scrollbar ${className}`}
            >
                {promos.map((p) => (
                    <CompactChip key={p.code} promo={p} copied={copied} onCopy={onCopy} />
                ))}
            </div>
        )
    }

    return (
        <section
            className={`rounded-2xl border border-orange-200 dark:border-orange-900 bg-gradient-to-br from-orange-50 via-white to-amber-50 dark:from-orange-950/40 dark:via-gray-950 dark:to-amber-950/40 p-5 md:p-6 ${className}`}
        >
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-orange-500 text-white shadow-md">
                    <Tag className="h-4 w-4" />
                </div>
                <div>
                    <h2 className="text-base md:text-lg font-bold text-zinc-900 dark:text-white">
                        {sellerName ? `${sellerName}'s deals` : 'Active promo codes'}
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Tap any code to copy it. Apply at checkout.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {promos.map((p) => (
                    <PromoCard key={p.code} promo={p} copied={copied} onCopy={onCopy} />
                ))}
            </div>
        </section>
    )
}

const CompactChip: React.FC<{
    promo: SellerStorefrontPromo
    copied: string | null
    onCopy: (code: string) => void
}> = ({ promo, copied, onCopy }) => {
    const isCopied = copied === promo.code
    return (
        <button
            type="button"
            onClick={() => onCopy(promo.code)}
            className="shrink-0 inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-xs font-bold border border-orange-200 dark:border-orange-900 bg-white dark:bg-gray-900 hover:border-orange-400 hover:shadow-sm transition-all"
            title={`Copy ${promo.code}`}
        >
            <Tag className="h-3 w-3 text-orange-500" />
            <code className="text-zinc-900 dark:text-white">{promo.code}</code>
            <span className="text-emerald-600 dark:text-emerald-400">{promo.discount_label}</span>
            <span
                className={`ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full ${
                    isCopied ? 'bg-emerald-500 text-white' : 'bg-zinc-100 dark:bg-gray-800 text-zinc-500'
                }`}
            >
                {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </span>
        </button>
    )
}

const PromoCard: React.FC<{
    promo: SellerStorefrontPromo
    copied: string | null
    onCopy: (code: string) => void
}> = ({ promo, copied, onCopy }) => {
    const isCopied = copied === promo.code
    const minOrder = parseFloat(promo.min_order_value || '0')
    const endsAt = promo.ends_at ? new Date(promo.ends_at) : null
    const daysLeft = endsAt
        ? Math.max(0, Math.ceil((endsAt.getTime() - Date.now()) / 86_400_000))
        : null

    return (
        <div className="relative group rounded-xl bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-800 p-4 hover:border-orange-400 hover:shadow-md transition-all overflow-hidden">
            {/* Discount label */}
            <div className="flex items-start justify-between gap-2 mb-3">
                <span className="text-lg md:text-xl font-black text-orange-600 dark:text-orange-400 leading-none">
                    {promo.discount_label}
                </span>
                {promo.first_order_only && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 whitespace-nowrap">
                        FIRST ORDER
                    </span>
                )}
            </div>

            {/* Description */}
            {promo.description && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-3 min-h-[2rem]">
                    {promo.description}
                </p>
            )}

            {/* Conditions */}
            <div className="space-y-1 text-[11px] text-zinc-500 dark:text-zinc-500 mb-4">
                {minOrder > 0 && (
                    <div className="flex items-center gap-1.5">
                        <AlertCircle className="h-3 w-3" />
                        Min order: GHS {minOrder.toFixed(2)}
                    </div>
                )}
                {daysLeft !== null && daysLeft <= 14 && (
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        {daysLeft === 0
                            ? 'Last day'
                            : daysLeft === 1
                              ? '1 day left'
                              : `${daysLeft} days left`}
                    </div>
                )}
                {promo.redemptions_remaining !== null && promo.redemptions_remaining <= 20 && (
                    <div className="text-rose-600 dark:text-rose-400 font-semibold">
                        Only {promo.redemptions_remaining} left
                    </div>
                )}
            </div>

            {/* Code + copy */}
            <button
                type="button"
                onClick={() => onCopy(promo.code)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed transition-all ${
                    isCopied
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950'
                        : 'border-zinc-300 dark:border-gray-700 hover:border-orange-400 group-hover:border-orange-400'
                }`}
            >
                <code className="font-mono font-black text-sm text-zinc-900 dark:text-white tracking-wide">
                    {promo.code}
                </code>
                <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${
                        isCopied
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-zinc-500 group-hover:text-orange-500'
                    }`}
                >
                    {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {isCopied ? 'Copied' : 'Copy'}
                </span>
            </button>
        </div>
    )
}
