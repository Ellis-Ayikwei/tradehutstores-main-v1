'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { BadgeCheck, Clock, Star } from 'lucide-react'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { formatDate, formatMoney, type BuyerQuote } from '@/lib/rfqApi'
import RFQStatusBadge from '@/components/RFQ/RFQStatusBadge'

export type QuoteHighlight = { lowest: boolean; fastest: boolean }

/** Lowest grand total / fastest lead time among comparable (submitted) quotes. Ties are all highlighted. */
export function computeHighlights(quotes: BuyerQuote[]): Map<string, QuoteHighlight> {
    const live = quotes.filter((q) => q.status === 'submitted')
    const out = new Map<string, QuoteHighlight>()
    if (live.length < 2) return out
    const minTotal = Math.min(...live.map((q) => Number(q.grand_total)))
    const minLead = Math.min(...live.map((q) => q.lead_time_days))
    for (const q of live) {
        out.set(q.id, { lowest: Number(q.grand_total) === minTotal, fastest: q.lead_time_days === minLead })
    }
    return out
}

export function isQuoteExpired(q: BuyerQuote, nowMs: number = Date.now()): boolean {
    return !!q.valid_until && new Date(q.valid_until).getTime() < nowMs
}

export function HighlightChips({ highlight }: { highlight?: QuoteHighlight }) {
    if (!highlight || (!highlight.lowest && !highlight.fastest)) return null
    return (
        <>
            {highlight.lowest ? (
                <span className="inline-flex items-center rounded bg-green-700 px-1.5 py-0.5 text-[11px] font-bold leading-4 text-white dark:bg-green-900 dark:text-green-100">
                    Lowest price
                </span>
            ) : null}
            {highlight.fastest ? (
                <span className="inline-flex items-center rounded bg-sky-800 px-1.5 py-0.5 text-[11px] font-bold leading-4 text-white dark:bg-sky-900 dark:text-sky-100">
                    Fastest
                </span>
            ) : null}
        </>
    )
}

/** Amazon-style price: small currency symbol, large whole amount, small decimals. */
function BigPrice({ amount, currency }: { amount: string; currency: string }) {
    const n = Number(amount)
    if (!Number.isFinite(n)) return <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">—</span>
    let parts: Intl.NumberFormatPart[]
    try {
        parts = new Intl.NumberFormat('en-GH', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(n)
    } catch {
        return <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{formatMoney(amount, currency)}</span>
    }
    const symbol = parts.find((p) => p.type === 'currency')?.value ?? currency
    const whole = parts
        .filter((p) => p.type === 'integer' || p.type === 'group')
        .map((p) => p.value)
        .join('')
    const fraction = parts.find((p) => p.type === 'fraction')?.value
    return (
        <span className="inline-flex items-start text-zinc-900 dark:text-zinc-100">
            <span className="mt-1 text-xs font-medium">{symbol}</span>
            <span className="text-2xl font-bold leading-none">{whole}</span>
            {fraction ? <span className="mt-0.5 text-xs font-bold">{fraction}</span> : null}
        </span>
    )
}

type Props = {
    quote: BuyerQuote
    highlight?: QuoteHighlight
    /** True when the request is `quoting` so awarding is possible. */
    awardable: boolean
    onAward: (quote: BuyerQuote) => void
}

export default function QuoteCard({ quote: q, highlight, awardable, onAward }: Props) {
    const [expanded, setExpanded] = useState(false)
    const expired = isQuoteExpired(q)
    const inactive = q.status === 'withdrawn' || q.status === 'not_selected'
    const rating = q.supplier.rating != null && q.supplier.rating !== '' ? Number(q.supplier.rating) : null
    const canAward = awardable && q.status === 'submitted' && !expired
    const longNotes = q.notes.length > 140

    return (
        <article
            className={`rounded-xl border bg-white dark:bg-zinc-900 p-2.5 sm:p-3 ${q.status === 'accepted' ? 'border-green-700 dark:border-green-500' : 'border-zinc-200 dark:border-zinc-800'} ${inactive ? 'opacity-80' : ''}`}
        >
            <header className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <Link
                        href={`/seller/${encodeURIComponent(q.supplier.id)}`}
                        className="inline-flex max-w-full items-center gap-1 text-sm font-bold text-primary-700 dark:text-primary-400 hover:underline"
                    >
                        <span className="truncate">{q.supplier.business_name}</span>
                        {q.supplier.is_verified ? (
                            <BadgeCheck className="h-4 w-4 shrink-0 text-green-700 dark:text-green-400" aria-label="Verified seller" />
                        ) : null}
                    </Link>
                    {rating != null && Number.isFinite(rating) ? (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                            <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{rating.toFixed(1)}</span>
                            <span className="sr-only">seller rating</span>
                        </p>
                    ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    <HighlightChips highlight={highlight} />
                    {q.status !== 'submitted' ? <RFQStatusBadge kind="quote" status={q.status} /> : null}
                    {q.status === 'submitted' && expired ? (
                        <span className="inline-flex items-center rounded bg-red-100 dark:bg-red-900 px-2 py-0.5 text-xs font-bold leading-5 text-red-900 dark:text-red-100">Expired</span>
                    ) : null}
                </div>
            </header>

            <div className="mt-2 flex items-end justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-2">
                <div>
                    <BigPrice amount={q.unit_price} currency={q.currency} />
                    <span className="ml-1 text-xs text-zinc-600 dark:text-zinc-400">per unit</span>
                </div>
                <div className="text-right">
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">Total incl. shipping</p>
                    <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">{formatMoney(q.grand_total, q.currency)}</p>
                </div>
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
                <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">
                        {q.quantity} × {formatMoney(q.unit_price, q.currency)}
                    </dt>
                    <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(q.total_price, q.currency)}</dd>
                </div>
                <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Shipping</dt>
                    <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {Number(q.shipping_cost) === 0 ? 'Included' : formatMoney(q.shipping_cost, q.currency)}
                    </dd>
                </div>
                <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Lead time</dt>
                    <dd className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {q.lead_time_days} day{q.lead_time_days === 1 ? '' : 's'}
                    </dd>
                </div>
                <div>
                    <dt className="text-zinc-500 dark:text-zinc-400">Valid until</dt>
                    <dd className="font-semibold text-zinc-900 dark:text-zinc-100">{q.valid_until ? formatDate(q.valid_until) : 'No expiry set'}</dd>
                </div>
            </dl>

            {q.product ? (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 p-1.5">
                    {q.product.image ? (
                        <Image
                            src={resolveMediaSrc(q.product.image)}
                            alt=""
                            width={36}
                            height={36}
                            sizes="36px"
                            className="h-9 w-9 shrink-0 rounded bg-zinc-50 dark:bg-zinc-800 object-contain"
                        />
                    ) : null}
                    <Link
                        href={`/products/${encodeURIComponent(q.product.id)}`}
                        className="line-clamp-1 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:text-primary-700 dark:hover:text-primary-400 hover:underline"
                    >
                        {q.product.name}
                    </Link>
                </div>
            ) : null}

            {q.notes ? (
                <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <p className={`whitespace-pre-line break-words ${expanded ? '' : 'line-clamp-2'}`}>{q.notes}</p>
                    {longNotes ? (
                        <button
                            type="button"
                            onClick={() => setExpanded((v) => !v)}
                            className="mt-0.5 min-h-[44px] text-xs font-semibold text-primary-700 dark:text-primary-400 hover:underline sm:min-h-0"
                        >
                            {expanded ? 'Show less' : 'Read more'}
                        </button>
                    ) : null}
                </div>
            ) : null}

            {canAward ? (
                <button
                    type="button"
                    onClick={() => onAward(q)}
                    className="mt-2 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-primary-700 px-4 text-sm font-bold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 sm:w-auto"
                >
                    Award this quote
                </button>
            ) : q.status === 'submitted' && expired ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-800 dark:text-red-100">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    This quote has expired and can no longer be awarded.
                </p>
            ) : null}
        </article>
    )
}
