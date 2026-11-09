'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Banknote, ExternalLink, Printer, Truck, X, XCircle } from 'lucide-react'
import { useDialogA11y } from '@/hooks/useDialogA11y'
import {
    ORDER_LIST_KEY,
    cancelSellerOrder,
    confirmSellerCodDelivery,
    fetchSellerOrder,
    orderDetailKey,
    shipSellerOrder,
    type OrderApiError,
    type OrderTimelineEntry,
    type SellerOrderDetail,
    type ShipOrderInput,
} from '@/lib/seller/orders'
import { CancelDialog, ConfirmCodDialog, ShipDialog, type ActionResult } from './OrderActionDialogs'
import { PackingSlip } from './PackingSlip'
import {
    BTN_DANGER_OUTLINE,
    BTN_PRIMARY,
    BTN_SECONDARY,
    FulfilmentBadge,
    Notice,
    OrderThumb,
    PaymentBadge,
    PaymentDue,
    addressLines,
    amount,
    buyerName,
    formatDate,
    formatMoney,
    humanize,
    isCod,
    shortId,
} from './orderUi'

const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false } as const

const CANCEL_REASON_LABEL: Record<string, string> = {
    payment_timeout: 'Payment timed out',
    payment_overdue: 'Payment overdue',
    buyer: 'Cancelled by the buyer',
    seller: 'Cancelled by you',
    admin: 'Cancelled by TradeHut',
}

interface TimelineStep {
    key: string
    label: string
    at: string
}

/** Real timestamps only: the API `timeline` when provided, otherwise the dated fields on the order. */
function buildTimeline(order: SellerOrderDetail): TimelineStep[] {
    if (order.timeline && order.timeline.length > 0) {
        return order.timeline.map((entry: OrderTimelineEntry, i) => ({ key: `${entry.status}-${i}`, label: humanize(entry.status), at: entry.at }))
    }
    const steps: TimelineStep[] = []
    const push = (key: string, label: string, at?: string | null) => {
        if (at) steps.push({ key, label, at })
    }
    push('placed', 'Order placed', order.placed_at)
    push('paid', 'Payment received', order.paid_at)
    push('shipped', 'Shipped', order.shipped_at)
    push('delivered', 'Delivered', order.delivered_at)
    push('cancelled', 'Cancelled', order.cancelled_at)
    return steps.sort((a, b) => a.at.localeCompare(b.at))
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</h3>
            {children}
        </section>
    )
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
    return (
        <div
            className={
                strong
                    ? 'flex items-center justify-between gap-3 text-base font-bold text-zinc-900 dark:text-zinc-100'
                    : `flex items-center justify-between gap-3 text-sm ${muted ? 'text-zinc-500 dark:text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`
            }
        >
            <dt>{label}</dt>
            <dd className="tabular-nums">{value}</dd>
        </div>
    )
}

function DetailSkeleton() {
    return (
        <div className="space-y-4" aria-busy="true" aria-label="Loading order">
            <div className="h-5 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-4 w-3/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-3 w-2/5 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                </div>
            ))}
            <div className="h-24 w-full animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>
    )
}

interface OrderDetailPanelProps {
    orderId: string | null
    onClose: () => void
}

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-zinc-500 dark:text-zinc-500">{label}</dt>
            <dd className="break-words text-zinc-900 dark:text-zinc-100">{value}</dd>
        </div>
    )
}

export function OrderDetailPanel({ orderId, onClose }: OrderDetailPanelProps) {
    const { mutate: globalMutate } = useSWRConfig()
    const { data: order, error, isLoading, isValidating, mutate } = useSWR<SellerOrderDetail, OrderApiError>(
        orderId ? orderDetailKey(orderId) : null,
        () => fetchSellerOrder(orderId as string),
        SWR_OPTIONS
    )

    const [shipOpen, setShipOpen] = useState(false)
    const [cancelOpen, setCancelOpen] = useState(false)
    const [codOpen, setCodOpen] = useState(false)
    const [actionError, setActionError] = useState<OrderApiError | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const panelRef = useRef<HTMLElement>(null)
    const open = Boolean(orderId)
    const handleClose = () => {
        setActionError(null)
        setSuccess(null)
        onClose()
    }
    useDialogA11y(open, panelRef, handleClose)

    const timeline = useMemo(() => (order ? buildTimeline(order) : []), [order])

    const refreshLists = () => {
        void globalMutate((key) => key === ORDER_LIST_KEY || (Array.isArray(key) && key[0] === ORDER_LIST_KEY))
    }

    /**
     * Runs a state-changing call with an optimistic update. On success the detail is refetched and the
     * lists are refreshed; on failure the optimistic data is rolled back and the error is surfaced.
     */
    const runAction = async (call: () => Promise<void>, optimistic: (current: SellerOrderDetail) => SellerOrderDetail, successMessage: string): Promise<ActionResult> => {
        if (!order) return null
        setActionError(null)
        setSuccess(null)
        const next = optimistic(order)
        try {
            await mutate(
                async () => {
                    await call()
                    return next
                },
                { optimisticData: next, rollbackOnError: true, populateCache: true, revalidate: true }
            )
            setSuccess(successMessage)
            refreshLists()
            return null
        } catch (e) {
            const err = e as OrderApiError
            if (err.kind === 'conflict' || err.kind === 'not_found' || err.kind === 'forbidden') {
                setActionError(err)
                setShipOpen(false)
                setCancelOpen(false)
                setCodOpen(false)
                void mutate()
                refreshLists()
            }
            return err
        }
    }

    const withTimeline = (d: SellerOrderDetail, status: string, at: string) => (d.timeline && d.timeline.length > 0 ? [...d.timeline, { status, at }] : d.timeline)

    const ship = async (values: ShipOrderInput): Promise<ActionResult> => {
        if (!orderId) return null
        const result = await runAction(
            () => shipSellerOrder(orderId, values),
            (d) => {
                // The tracking number is issued by the server, so it is not invented here: it arrives with the refetch.
                const at = new Date().toISOString()
                return { ...d, order_status: 'Shipped', shipped_at: at, timeline: withTimeline(d, 'Shipped', at) }
            },
            'Order shipped. Its tracking number is shown under Shipment.'
        )
        if (!result) setShipOpen(false)
        return result
    }

    const cancel = async (reason: string): Promise<ActionResult> => {
        if (!orderId) return null
        const result = await runAction(
            () => cancelSellerOrder(orderId, reason),
            (d) => {
                const at = new Date().toISOString()
                return { ...d, order_status: 'Cancelled', cancelled_at: at, cancel_reason: reason.trim(), timeline: withTimeline(d, 'Cancelled', at) }
            },
            order?.payment_status === 'paid' ? 'Order cancelled. The buyer is being refunded in full.' : 'Order cancelled.'
        )
        if (!result) setCancelOpen(false)
        return result
    }

    const confirmCod = async (): Promise<ActionResult> => {
        if (!orderId) return null
        const result = await runAction(
            () => confirmSellerCodDelivery(orderId),
            (d) => {
                const at = new Date().toISOString()
                return { ...d, order_status: 'Delivered', payment_status: 'paid', delivered_at: at, paid_at: at, timeline: withTimeline(d, 'Delivered', at) }
            },
            'Delivery confirmed.'
        )
        if (!result) setCodOpen(false)
        return result
    }

    if (!orderId) return null

    const status = order?.order_status
    const canShip = status === 'Processing'
    const canCancel = status === 'Processing'
    const canConfirmCod = Boolean(order && status === 'Shipped' && isCod(order))
    const canPrint = status === 'Processing' || status === 'Shipped' || status === 'Delivered'
    const hasActions = canShip || canCancel || canConfirmCod || canPrint
    const hint =
        order && !canShip && !canConfirmCod
            ? status === 'Pending'
                ? 'Waiting for the buyer to pay. You can ship once the order is paid.'
                : status === 'Shipped'
                  ? 'Waiting for the buyer to confirm delivery.'
                  : null
            : null

    const label = `#${shortId(order?.id ?? orderId)}`
    const name = order ? buyerName(order) : ''
    const address = order?.shipping_address ?? null
    const lines = addressLines(address)
    const phone = address?.phone?.trim()
    const cancelledNote = order?.order_status === 'Cancelled' && order.cancel_reason ? (CANCEL_REASON_LABEL[order.cancel_reason] ?? humanize(order.cancel_reason)) : null
    const hasDiscount = order ? amount(order.promo_discount) > 0 : false

    return (
        <div className="fixed inset-0 z-[70]">
            <div className="absolute inset-0 bg-black/50" onClick={handleClose} aria-hidden="true" />
            <aside
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="seller-order-title"
                className="absolute inset-y-0 right-0 flex w-full flex-col bg-white text-zinc-900 lg:max-w-xl lg:border-l lg:border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 lg:dark:border-zinc-800"
            >
                <header className="flex items-start justify-between gap-2 border-b border-zinc-200 px-3 py-2 sm:px-4 dark:border-zinc-800">
                    <div className="min-w-0 py-1">
                        <h2 id="seller-order-title" className="text-lg font-bold">
                            Order {label}
                        </h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{order ? `Placed ${formatDate(order.placed_at)}` : 'Order details'}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Close order"
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
                    {success ? (
                        <p role="status" className="rounded-md border border-green-300 bg-green-50 p-3 text-sm font-medium text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100">
                            {success}
                        </p>
                    ) : null}
                    {actionError ? <Notice title="That didn't go through" message={actionError.message} /> : null}

                    {isLoading && !order ? (
                        <DetailSkeleton />
                    ) : error && !order ? (
                        <Notice title="Couldn't load this order" message={error.message} onRetry={() => void mutate()} retrying={isValidating} />
                    ) : order ? (
                        <>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <FulfilmentBadge status={order.order_status} />
                                <PaymentBadge order={order} />
                                <PaymentDue order={order} />
                                {cancelledNote ? <span className="text-sm text-zinc-500 dark:text-zinc-400">{cancelledNote}</span> : null}
                            </div>

                            <Section title={`Items (${order.items.length})`}>
                                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {order.items.map((item, index) => (
                                        <li key={item.id ?? `${item.variant_id ?? item.product_id ?? 'item'}-${index}`} className="flex items-center gap-3 py-2">
                                            <OrderThumb image={item.image} />
                                            <div className="min-w-0 flex-1">
                                                <p className="line-clamp-2 text-sm leading-snug text-zinc-900 dark:text-zinc-100">{item.title}</p>
                                                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                    {item.sku ? `${item.sku} · ` : ''}
                                                    {item.quantity} × {formatMoney(item.unit_price, order.currency)}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-sm font-bold tabular-nums">{formatMoney(item.total_price, order.currency)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Section>

                            <Section title="Order totals">
                                <dl className="space-y-1">
                                    {order.subtotal != null ? <Row label="Subtotal" value={formatMoney(order.subtotal, order.currency)} /> : null}
                                    {hasDiscount ? <Row label="Discount" value={`-${formatMoney(order.promo_discount, order.currency)}`} /> : null}
                                    {order.shipping_cost != null ? <Row label="Shipping" value={formatMoney(order.shipping_cost, order.currency)} /> : null}
                                    {order.tax_amount != null ? <Row label="Tax" value={formatMoney(order.tax_amount, order.currency)} /> : null}
                                    <Row label="Total" value={formatMoney(order.total_amount, order.currency)} strong />
                                    {order.commission_amount != null ? <Row label="TradeHut commission" value={`-${formatMoney(order.commission_amount, order.currency)}`} muted /> : null}
                                    {order.net_amount != null ? <Row label="Your net" value={formatMoney(order.net_amount, order.currency)} muted /> : null}
                                </dl>
                            </Section>

                            <Section title="Ship to">
                                {name || lines.length > 0 || phone ? (
                                    <address className="space-y-0.5 text-sm not-italic">
                                        {name ? <p className="font-medium">{name}</p> : null}
                                        {lines.map((line) => (
                                            <p key={line}>{line}</p>
                                        ))}
                                        {phone ? <p className="text-zinc-500 dark:text-zinc-400">{phone}</p> : null}
                                    </address>
                                ) : (
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">No shipping address came with this order.</p>
                                )}
                            </Section>

                            {order.shipments && order.shipments.length > 0 ? (
                                <Section title="Shipment">
                                    <ul className="space-y-2">
                                        {order.shipments.map((s, i) => (
                                            <li key={`${s.tracking_number}-${i}`} className="rounded-md border border-zinc-200 p-3 text-sm dark:border-zinc-700">
                                                <p className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Tracking number</p>
                                                <p className="break-all font-mono text-base font-bold text-primary-700 dark:text-primary-400">{s.tracking_number}</p>
                                                <p className="mt-1 font-medium">
                                                    {s.carrier}
                                                    {s.service_level ? <span className="font-normal text-zinc-600 dark:text-zinc-400"> · {s.service_level}</span> : null}
                                                </p>
                                                <dl className="mt-2 grid gap-x-4 gap-y-1 text-zinc-600 sm:grid-cols-2 dark:text-zinc-400">
                                                    {s.courier_reference ? <Detail label="Courier reference" value={s.courier_reference} /> : null}
                                                    {s.parcels ? <Detail label="Parcels" value={String(s.parcels)} /> : null}
                                                    {s.weight_kg ? <Detail label="Weight" value={`${s.weight_kg} kg`} /> : null}
                                                    {s.length_cm && s.width_cm && s.height_cm ? <Detail label="Size" value={`${s.length_cm} × ${s.width_cm} × ${s.height_cm} cm`} /> : null}
                                                    {s.dispatch_date ? <Detail label="Dispatched" value={formatDate(s.dispatch_date, false)} /> : null}
                                                    {s.estimated_delivery_date ? <Detail label="Expected" value={formatDate(s.estimated_delivery_date, false)} /> : null}
                                                    {s.contact_name || s.contact_phone ? <Detail label="Rider" value={[s.contact_name, s.contact_phone].filter(Boolean).join(' · ')} /> : null}
                                                </dl>
                                                {s.buyer_note ? <p className="mt-2 text-zinc-700 dark:text-zinc-300">Buyer sees: “{s.buyer_note}”</p> : null}
                                                {s.internal_note ? <p className="mt-1 text-zinc-600 dark:text-zinc-400">Private note: {s.internal_note}</p> : null}
                                                {s.shipped_at ? <p className="mt-1 text-zinc-500 dark:text-zinc-400">Shipped {formatDate(s.shipped_at)}</p> : null}
                                                {s.tracking_url ? (
                                                    <a
                                                        href={s.tracking_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="mt-1 inline-flex min-h-[44px] items-center gap-1 text-primary-700 hover:underline dark:text-primary-400"
                                                    >
                                                        Track parcel
                                                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                                    </a>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                </Section>
                            ) : null}

                            {timeline.length > 0 ? (
                                <Section title="Timeline">
                                    <ol className="space-y-2">
                                        {timeline.map((step) => (
                                            <li key={step.key} className="flex items-center gap-2.5 text-sm">
                                                <span className="h-2 w-2 shrink-0 rounded-full bg-primary-700 dark:bg-primary-400" aria-hidden="true" />
                                                <span className="font-medium">{step.label}</span>
                                                <span className="ml-auto shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{formatDate(step.at)}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </Section>
                            ) : null}
                        </>
                    ) : null}
                </div>

                {order && (hasActions || hint) ? (
                    <div className="space-y-2 border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                        {hint ? <p className="text-sm text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
                        {hasActions ? (
                            <div className="flex flex-wrap gap-2">
                                {canShip ? (
                                    <button type="button" className={`${BTN_PRIMARY} flex-1 sm:flex-none`} onClick={() => setShipOpen(true)}>
                                        <Truck className="h-4 w-4" aria-hidden="true" />
                                        Ship order
                                    </button>
                                ) : null}
                                {canConfirmCod ? (
                                    <button type="button" className={`${BTN_PRIMARY} flex-1 sm:flex-none`} onClick={() => setCodOpen(true)}>
                                        <Banknote className="h-4 w-4" aria-hidden="true" />
                                        Cash collected
                                    </button>
                                ) : null}
                                {canPrint ? (
                                    <button type="button" className={`${BTN_SECONDARY} flex-1 sm:flex-none`} onClick={() => window.print()}>
                                        <Printer className="h-4 w-4" aria-hidden="true" />
                                        Packing slip
                                    </button>
                                ) : null}
                                {canCancel ? (
                                    <button type="button" className={`${BTN_DANGER_OUTLINE} flex-1 sm:flex-none`} onClick={() => setCancelOpen(true)}>
                                        <XCircle className="h-4 w-4" aria-hidden="true" />
                                        Cancel order
                                    </button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </aside>

            {order ? (
                <>
                    <ShipDialog open={shipOpen} onOpenChange={setShipOpen} orderLabel={label} order={order} onSubmit={ship} />
                    <CancelDialog open={cancelOpen} onOpenChange={setCancelOpen} orderLabel={label} isPaid={order.payment_status === 'paid'} onSubmit={cancel} />
                    <ConfirmCodDialog open={codOpen} onOpenChange={setCodOpen} orderLabel={label} totalLabel={formatMoney(order.total_amount, order.currency)} onConfirm={confirmCod} />
                    <PackingSlip order={order} />
                </>
            ) : null}
        </div>
    )
}
