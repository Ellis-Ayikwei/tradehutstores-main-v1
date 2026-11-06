'use client'

import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'
import { formatDate, formatMoney, type BuyerQuote } from '@/lib/rfqApi'
import RFQStatusBadge from '@/components/RFQ/RFQStatusBadge'
import { isQuoteExpired, type QuoteHighlight } from '@/components/RFQ/QuoteCard'

type Props = {
    quotes: BuyerQuote[]
    highlights: Map<string, QuoteHighlight>
    awardable: boolean
    onAward: (quote: BuyerQuote) => void
}

const TH = 'whitespace-nowrap border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400'
const TD = 'whitespace-nowrap border-b border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm text-zinc-800 dark:text-zinc-200'

/**
 * Side-by-side comparison, one row per supplier. Horizontal scroll inside the wrapper on narrow screens;
 * the supplier column stays pinned. Rows arrive sorted by total price (R3).
 */
export default function QuoteCompareTable({ quotes, highlights, awardable, onAward }: Props) {
    return (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <table className="w-full min-w-[720px] border-separate border-spacing-0">
                <caption className="sr-only">Compare supplier quotes</caption>
                <thead>
                    <tr>
                        <th scope="col" className={`${TH} sticky left-0 z-10 min-w-[160px] border-r`}>
                            Supplier
                        </th>
                        <th scope="col" className={`${TH} text-right`}>
                            Unit price
                        </th>
                        <th scope="col" className={`${TH} text-right`}>
                            Subtotal
                        </th>
                        <th scope="col" className={`${TH} text-right`}>
                            Shipping
                        </th>
                        <th scope="col" className={`${TH} text-right`}>
                            Total
                        </th>
                        <th scope="col" className={TH}>
                            Lead time
                        </th>
                        <th scope="col" className={TH}>
                            Valid until
                        </th>
                        <th scope="col" className={TH}>
                            <span className="sr-only">Action</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {quotes.map((q) => {
                        const h = highlights.get(q.id)
                        const expired = isQuoteExpired(q)
                        const inactive = q.status === 'withdrawn' || q.status === 'not_selected'
                        const canAward = awardable && q.status === 'submitted' && !expired
                        const cell = `${TD} ${inactive ? 'text-zinc-500 dark:text-zinc-400' : ''}`
                        return (
                            <tr key={q.id} className={q.status === 'accepted' ? 'bg-green-50 dark:bg-green-950' : ''}>
                                <th
                                    scope="row"
                                    className={`${cell} sticky left-0 z-10 border-r text-left font-semibold ${q.status === 'accepted' ? 'bg-green-50 dark:bg-green-950' : 'bg-white dark:bg-zinc-900'}`}
                                >
                                    <Link
                                        href={`/seller/${encodeURIComponent(q.supplier.id)}`}
                                        className="inline-flex max-w-[180px] items-center gap-1 text-primary-700 dark:text-primary-400 hover:underline"
                                    >
                                        <span className="truncate">{q.supplier.business_name}</span>
                                        {q.supplier.is_verified ? (
                                            <BadgeCheck className="h-4 w-4 shrink-0 text-green-700 dark:text-green-400" aria-label="Verified seller" />
                                        ) : null}
                                    </Link>
                                    {q.status !== 'submitted' ? (
                                        <div className="mt-0.5">
                                            <RFQStatusBadge kind="quote" status={q.status} />
                                        </div>
                                    ) : null}
                                </th>
                                <td className={`${cell} text-right`}>{formatMoney(q.unit_price, q.currency)}</td>
                                <td className={`${cell} text-right`}>{formatMoney(q.total_price, q.currency)}</td>
                                <td className={`${cell} text-right`}>
                                    {Number(q.shipping_cost) === 0 ? 'Included' : formatMoney(q.shipping_cost, q.currency)}
                                </td>
                                <td className={`${cell} text-right`}>
                                    <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatMoney(q.grand_total, q.currency)}</span>
                                    {h?.lowest ? (
                                        <span className="ml-1.5 inline-flex rounded bg-green-700 px-1.5 py-0.5 text-[11px] font-bold leading-4 text-white dark:bg-green-900 dark:text-green-100">
                                            Lowest
                                        </span>
                                    ) : null}
                                </td>
                                <td className={cell}>
                                    {q.lead_time_days} day{q.lead_time_days === 1 ? '' : 's'}
                                    {h?.fastest ? (
                                        <span className="ml-1.5 inline-flex rounded bg-sky-800 px-1.5 py-0.5 text-[11px] font-bold leading-4 text-white dark:bg-sky-900 dark:text-sky-100">
                                            Fastest
                                        </span>
                                    ) : null}
                                </td>
                                <td className={cell}>
                                    {q.valid_until ? formatDate(q.valid_until) : '—'}
                                    {q.status === 'submitted' && expired ? (
                                        <span className="ml-1.5 inline-flex rounded bg-red-100 dark:bg-red-900 px-1.5 py-0.5 text-[11px] font-bold leading-4 text-red-900 dark:text-red-100">
                                            Expired
                                        </span>
                                    ) : null}
                                </td>
                                <td className={`${cell} text-right`}>
                                    {canAward ? (
                                        <button
                                            type="button"
                                            onClick={() => onAward(q)}
                                            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-700 px-3 text-sm font-bold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400"
                                        >
                                            Award
                                        </button>
                                    ) : null}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
