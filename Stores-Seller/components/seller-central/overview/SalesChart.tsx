'use client'

import { useMemo } from 'react'
import { formatMoney } from '@/lib/seller/stats'
import type { SellerDailySales } from '@/lib/seller/types'
import { EmptyPanel, Panel } from '@/components/seller-central/ui'

const VIEW_W = 300
const VIEW_H = 100

/** `YYYY-MM-DD` as a local date (new Date('YYYY-MM-DD') would be UTC and can show the previous day). */
function parseDay(value: string): Date {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
}

const shortDay = (value: string) => parseDay(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/**
 * Daily sales as an SVG bar chart (no chart library). Real data only: the parent renders this
 * only when the API sends `sales_by_day`. Accessible: the graphic has a text summary and a
 * visually hidden data table; bars also carry native hover titles.
 */
export default function SalesChart({ series, currency }: { series: SellerDailySales[]; currency: string }) {
    const model = useMemo(() => {
        const points = series.map((d) => ({ date: d.date, value: Number(d.total) || 0 }))
        const total = points.reduce((sum, p) => sum + p.value, 0)
        const peak = points.reduce((best, p) => (p.value > best.value ? p : best), points[0] ?? { date: '', value: 0 })
        return { points, total, peak }
    }, [series])

    const { points, total, peak } = model
    const first = points[0]
    const last = points[points.length - 1]

    if (points.length === 0 || total <= 0) {
        return (
            <Panel title="Sales, last 30 days" bodyClassName="p-3 sm:p-4">
                <EmptyPanel title="No sales in the last 30 days" description="Your daily sales will chart here once orders are paid." />
            </Panel>
        )
    }

    const slot = VIEW_W / points.length
    const barW = slot * 0.7
    const summary = `Bar chart of daily sales, ${shortDay(first.date)} to ${shortDay(last.date)}. Total ${formatMoney(total, currency)}. Best day ${shortDay(peak.date)} with ${formatMoney(peak.value, currency)}.`

    return (
        <Panel title="Sales, last 30 days" description={`Total ${formatMoney(total, currency)}`} bodyClassName="p-3 sm:p-4">
            <div className="flex items-baseline justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                <span>Best day {shortDay(peak.date)}</span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(peak.value, currency)}</span>
            </div>
            <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={summary}
                className="mt-1 h-40 w-full"
            >
                <line x1="0" y1="0.5" x2={VIEW_W} y2="0.5" className="stroke-zinc-200 dark:stroke-zinc-700 [vector-effect:non-scaling-stroke]" strokeWidth="1" />
                <line x1="0" y1={VIEW_H / 2} x2={VIEW_W} y2={VIEW_H / 2} className="stroke-zinc-200 dark:stroke-zinc-700 [vector-effect:non-scaling-stroke]" strokeWidth="1" strokeDasharray="3 3" />
                {points.map((p, i) => {
                    const h = p.value > 0 ? Math.max((p.value / peak.value) * (VIEW_H - 2), 1.5) : 0
                    return (
                        <rect
                            key={p.date}
                            x={i * slot + (slot - barW) / 2}
                            y={VIEW_H - h}
                            width={barW}
                            height={h}
                            className="fill-primary-700 dark:fill-primary-400"
                        >
                            <title>{`${shortDay(p.date)}: ${formatMoney(p.value, currency)}`}</title>
                        </rect>
                    )
                })}
                <line x1="0" y1={VIEW_H - 0.5} x2={VIEW_W} y2={VIEW_H - 0.5} className="stroke-zinc-400 dark:stroke-zinc-500 [vector-effect:non-scaling-stroke]" strokeWidth="1" />
            </svg>
            <div className="mt-1 flex justify-between text-xs text-zinc-600 dark:text-zinc-400" aria-hidden>
                <span>{shortDay(first.date)}</span>
                <span>{shortDay(last.date)}</span>
            </div>
            <table className="sr-only">
                <caption>Daily sales</caption>
                <thead>
                    <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Sales</th>
                    </tr>
                </thead>
                <tbody>
                    {points.map((p) => (
                        <tr key={p.date}>
                            <td>{shortDay(p.date)}</td>
                            <td>{formatMoney(p.value, currency)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Panel>
    )
}
