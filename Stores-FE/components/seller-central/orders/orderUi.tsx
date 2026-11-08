import type { ReactNode } from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'
import type { OrderAddress, SellerOrderDetail, SellerOrderListRow } from '@/lib/seller/orders'

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ')

export function isCod(order: { pay_mode?: string | null }): boolean {
    return String(order.pay_mode ?? '').toUpperCase() === 'COD'
}

export function shortId(id: string): string {
    return String(id).slice(0, 8).toUpperCase()
}

const DATE_TIME = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const DATE_ONLY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export function formatDate(value?: string | null, withTime = true): string {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '-'
    return (withTime ? DATE_TIME : DATE_ONLY).format(d)
}

export function formatMoney(value: string | number | null | undefined, currency: string | undefined): string {
    if (value === null || value === undefined || value === '') return '-'
    const n = Number(value)
    if (!Number.isFinite(n)) return '-'
    if (!currency) return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    try {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(n)
    } catch {
        return `${currency} ${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    }
}

export function humanize(value: string): string {
    const s = value.replace(/_/g, ' ').trim()
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Parses a decimal string; non-finite or empty values become 0. */
export function amount(value?: string | null): number {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
}

export function itemSummary(order: SellerOrderListRow): { title: string; extra: string } {
    const title = order.first_item?.title || 'Order'
    const extra = order.item_count > 1 ? `+${order.item_count - 1} more` : ''
    return { title, extra }
}

export function buyerName(order: Pick<SellerOrderDetail, 'buyer_name' | 'shipping_address'>): string {
    return (order.buyer_name || order.shipping_address?.full_name || '').trim()
}

/** Address lines exactly as provided, skipping empty parts. */
export function addressLines(address: OrderAddress | null | undefined): string[] {
    if (!address) return []
    const cityLine = [address.city, address.state, address.postal_code].filter(Boolean).join(', ')
    return [address.address, address.address_line2, cityLine, address.country].map((l) => (l ?? '').trim()).filter(Boolean)
}

/* ------------------------------------------------------------------ badges */

const BADGE_BASE = 'inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium'

const TONES = {
    warning: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
    info: 'bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100',
    success: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
    danger: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100',
    neutral: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100',
} as const

type Tone = keyof typeof TONES

function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
    return <span className={cx(BADGE_BASE, TONES[tone])}>{children}</span>
}

const STATUS_TONE: Record<string, Tone> = {
    Pending: 'warning',
    Processing: 'info',
    Shipped: 'info',
    Delivered: 'success',
    Cancelled: 'danger',
    Refunded: 'neutral',
}

const STATUS_LABEL: Record<string, string> = {
    Pending: 'Pending payment',
    Processing: 'To ship',
}

export function FulfilmentBadge({ status }: { status: string }) {
    return <Badge tone={STATUS_TONE[status] ?? 'neutral'}>{STATUS_LABEL[status] ?? humanize(status)}</Badge>
}

export function PaymentBadge({ order }: { order: SellerOrderListRow }) {
    switch (order.payment_status) {
        case 'paid':
            return <Badge tone="success">Paid</Badge>
        case 'refunded':
            return <Badge tone="neutral">Refunded</Badge>
        case 'partially_refunded':
            return <Badge tone="neutral">Partly refunded</Badge>
        default:
            if (isCod(order)) return <Badge tone="info">COD, pay on delivery</Badge>
            return <Badge tone="warning">Awaiting payment</Badge>
    }
}

/** Due-date line for unpaid online orders. Overdue dates are highlighted. */
export function PaymentDue({ order, className }: { order: SellerOrderListRow; className?: string }) {
    if (order.payment_status !== 'unpaid' || isCod(order) || !order.payment_due_at) return null
    const due = new Date(order.payment_due_at)
    const overdue = !Number.isNaN(due.getTime()) && due.getTime() < Date.now()
    return (
        <span className={cx('text-xs', overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400', className)}>
            {overdue ? 'Payment overdue ' : 'Payment due '}
            {formatDate(order.payment_due_at)}
        </span>
    )
}

export function OrderThumb({ image, className }: { image?: string | null; className?: string }) {
    return (
        <div className={cx('relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500', className)}>
            {image ? (
                <Image src={image} alt="" fill sizes="48px" loading="lazy" className="object-contain p-0.5 mix-blend-multiply dark:mix-blend-normal" />
            ) : (
                <Package className="h-5 w-5" aria-hidden="true" />
            )}
        </div>
    )
}

/** Shared control styles (44px targets, 16px input text so iOS does not zoom). */
export const BTN_BASE =
    'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-md px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500'
export const BTN_PRIMARY = `${BTN_BASE} bg-primary-700 text-white hover:bg-primary-800`
export const BTN_SECONDARY = `${BTN_BASE} border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800`
export const BTN_DANGER = `${BTN_BASE} bg-red-600 text-white hover:bg-red-700`
export const BTN_DANGER_OUTLINE = `${BTN_BASE} border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-zinc-800`
export const INPUT =
    'block min-h-[44px] w-full rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-900 placeholder:text-zinc-400 focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

/** Inline error / notice block. */
export function Notice({
    title,
    message,
    onRetry,
    retrying,
    tone = 'error',
}: {
    title: string
    message: string
    onRetry?: () => void
    retrying?: boolean
    tone?: 'error' | 'info'
}) {
    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={cx(
                'rounded-md border p-3 text-sm',
                tone === 'error'
                    ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100'
                    : 'border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100'
            )}
        >
            <p className="font-medium">{title}</p>
            <p className="mt-0.5">{message}</p>
            {onRetry ? (
                <button
                    type="button"
                    onClick={onRetry}
                    disabled={retrying}
                    className="mt-2 min-h-[44px] rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:text-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                    {retrying ? 'Retrying...' : 'Try again'}
                </button>
            ) : null}
        </div>
    )
}
