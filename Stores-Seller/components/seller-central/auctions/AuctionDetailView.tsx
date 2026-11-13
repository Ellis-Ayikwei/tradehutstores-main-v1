'use client'

import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import useSWR, { useSWRConfig } from 'swr'
import { ArrowLeft, Loader2, Pencil } from 'lucide-react'
import { EmptyPanel, ErrorPanel, PageHeader, Panel, Skeleton, TextArea, btnDanger, btnPrimary, btnSecondary, linkClass } from '@/components/seller-central/ui'
import {
    AUCTION_LIST_KEY,
    auctionDetailKey,
    buildEditBody,
    cancelSellerAuction,
    fetchSellerAuction,
    formFromDetail,
    toAuctionError,
    updateSellerAuction,
    validateAuctionForm,
    type AuctionApiError,
    type AuctionFormErrors,
    type AuctionFormValues,
    type SellerAuctionDetail,
} from '@/lib/seller/auctions'
import { formatMoney } from '@/lib/seller/listings'
import { useSellerProfile } from '@/hooks/useSellerProfile'
import { Modal, ToastProvider, useToast } from '../listings/ui'
import AuctionForm from './AuctionForm'
import { AUCTIONS_HREF, AuctionStatusBadge, AuctionThumb, ResultBadge, SettlementBadges, VerificationNotice, formatDateTime, formatSpan, orderHref, useNow } from './auctionUi'

const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: true, keepPreviousData: true } as const
const FIELD_IDS: Record<string, string> = {
    title: 'auction-title',
    description: 'auction-description',
    starting_price: 'auction-starting-price',
    min_increment: 'auction-min-increment',
    reserve_price: 'auction-reserve-price',
    buy_now_price: 'auction-buy-now-price',
    starts_at: 'auction-starts-at',
    ends_at: 'auction-ends-at',
    soft_close_seconds: 'auction-soft-close',
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-zinc-600 dark:text-zinc-400">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">{children}</dd>
        </div>
    )
}

/** Ticks every second against the server clock (`offsetMs` = server time minus device time). */
function Countdown({ a, offsetMs }: { a: SellerAuctionDetail; offsetMs: number }) {
    const nowMs = useNow(1000) + offsetMs
    if (a.display_status === 'cancelled') return <>Cancelled</>
    if (a.display_status === 'scheduled') return <>Starts in {formatSpan(new Date(a.starts_at).getTime() - nowMs, true)}</>
    if (a.display_status === 'ended') return <>Ended {formatDateTime(a.ends_at)}</>
    return <>Ends in {formatSpan(new Date(a.ends_at).getTime() - nowMs, true)}</>
}

function reserveText(a: SellerAuctionDetail): string {
    if (a.reserve_price === null) return 'No reserve'
    const price = formatMoney(a.reserve_price, a.currency)
    if (a.reserve_met === null) return price
    return `${price} (${a.reserve_met ? 'met' : 'not met yet'})`
}

function DetailBody({ id }: { id: string }) {
    const toast = useToast()
    const { mutate: globalMutate } = useSWRConfig()
    const { profile } = useSellerProfile()
    const unverified = profile !== null && profile.verification_status !== 'verified'

    const { data, error, isLoading, isValidating, mutate } = useSWR<SellerAuctionDetail, AuctionApiError>(auctionDetailKey(id), () => fetchSellerAuction(id), {
        ...SWR_OPTIONS,
        refreshInterval: (latest) => (latest && (latest.display_status === 'live' || latest.display_status === 'ending_soon' || latest.display_status === 'scheduled') ? 5000 : 0),
        refreshWhenHidden: false,
    })
    // Offset between the server clock and this device, taken from each response.
    const offsetMs = useMemo(() => (data ? new Date(data.server_time).getTime() - Date.now() : 0), [data])

    const [editing, setEditing] = useState(false)
    const [values, setValues] = useState<AuctionFormValues | null>(null)
    const [errors, setErrors] = useState<AuctionFormErrors>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const [cancelOpen, setCancelOpen] = useState(false)
    const [reason, setReason] = useState('')
    const [cancelError, setCancelError] = useState<string | null>(null)
    const [cancelling, setCancelling] = useState(false)

    if (error && !data) {
        if (error.kind === 'not_found') {
            return (
                <EmptyPanel
                    title="Auction not found"
                    description="It may have been removed, or it belongs to another seller."
                    action={
                        <Link href={AUCTIONS_HREF} className={btnSecondary}>
                            Back to auctions
                        </Link>
                    }
                />
            )
        }
        return <ErrorPanel title="Couldn't load this auction" message={error.message} onRetry={() => void mutate()} retrying={isValidating} />
    }
    if (isLoading || !data) {
        return (
            <div className="space-y-3" aria-busy="true" aria-label="Loading auction">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-40" />
                <Skeleton className="h-48" />
            </div>
        )
    }

    const a = data
    const serverNow = Date.now() + offsetMs
    const editable = a.status === 'scheduled' && serverNow < new Date(a.starts_at).getTime() && a.bid_count === 0
    const open = a.status === 'scheduled' || a.status === 'live'
    const ended = a.status === 'ended' || a.display_status === 'ended'
    const cancellable = open && a.bid_count === 0 && !ended
    const cancelNote = a.status === 'cancelled' ? null : ended ? 'An ended auction cannot be cancelled.' : a.bid_count > 0 ? 'An auction with bids cannot be cancelled.' : null

    const refreshLists = () => void globalMutate((k) => Array.isArray(k) && k[0] === AUCTION_LIST_KEY)

    const startEdit = () => {
        setValues(formFromDetail(a))
        setErrors({})
        setFormError(null)
        setEditing(true)
    }

    const onChange = (field: keyof AuctionFormValues, value: string) => {
        setValues((v) => (v ? { ...v, [field]: value } : v))
        setErrors((e) => ({ ...e, [field]: undefined }))
        setFormError(null)
    }

    const save = async (e: FormEvent) => {
        e.preventDefault()
        if (!values || saving) return
        const found = validateAuctionForm(values, { mode: 'edit', startNow: false, stock: null, now: new Date() })
        setErrors(found)
        setFormError(null)
        const first = Object.keys(found)[0]
        if (first) {
            document.getElementById(FIELD_IDS[first])?.focus()
            return
        }
        setSaving(true)
        try {
            const updated = await updateSellerAuction(a.id, buildEditBody(values))
            await mutate(updated, { revalidate: false })
            refreshLists()
            setEditing(false)
            toast.success('Auction updated.')
        } catch (err) {
            const apiError = toAuctionError(err, 'edit')
            setErrors(apiError.fieldErrors as AuctionFormErrors)
            const mapped = Object.keys(apiError.fieldErrors).some((k) => k in FIELD_IDS)
            setFormError(apiError.kind === 'validation' && mapped ? 'Please fix the highlighted fields.' : apiError.message)
            if (apiError.code === 'not_editable') {
                setEditing(false)
                void mutate()
            }
            const firstServer = Object.keys(apiError.fieldErrors).find((k) => FIELD_IDS[k])
            if (firstServer) document.getElementById(FIELD_IDS[firstServer])?.focus()
        } finally {
            setSaving(false)
        }
    }

    const confirmCancel = async () => {
        setCancelling(true)
        setCancelError(null)
        try {
            const updated = await cancelSellerAuction(a.id, reason)
            await mutate(updated, { revalidate: false })
            refreshLists()
            setCancelOpen(false)
            setReason('')
            toast.success('Auction cancelled. The stock was returned to your listing.')
        } catch (err) {
            const apiError = toAuctionError(err, 'cancel')
            setCancelError(apiError.message)
            if (apiError.code === 'not_cancellable') void mutate()
        } finally {
            setCancelling(false)
        }
    }

    const hasBids = a.bid_count > 0 && a.current_price !== null
    const showSettlement = a.status === 'ended' || a.result !== null

    return (
        <div className="space-y-3">
            <PageHeader
                title={a.title}
                description={a.product?.name ? `${a.product.name}${a.variant?.name ? ` - ${a.variant.name}` : ''}` : undefined}
                actions={
                    <>
                        {editable && !editing && !unverified ? (
                            <button type="button" className={btnSecondary} onClick={startEdit}>
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                                Edit
                            </button>
                        ) : null}
                        {a.status !== 'cancelled' ? (
                            <button
                                type="button"
                                className={btnDanger}
                                disabled={!cancellable || unverified}
                                onClick={() => {
                                    setCancelError(null)
                                    setCancelOpen(true)
                                }}
                            >
                                Cancel auction
                            </button>
                        ) : null}
                    </>
                }
            />

            {unverified ? <VerificationNotice /> : null}
            {cancelNote ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{cancelNote}</p> : null}
            {error ? <ErrorPanel title="Couldn't refresh this auction" message={error.message} onRetry={() => void mutate()} retrying={isValidating} /> : null}

            <Panel>
                <div className="flex gap-3 sm:gap-4">
                    <AuctionThumb image={a.images?.[0]} className="h-20 w-20 sm:h-28 sm:w-28" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <AuctionStatusBadge displayStatus={a.display_status} status={a.status} />
                            <ResultBadge result={a.result} />
                        </div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            <Countdown a={a} offsetMs={offsetMs} />
                        </p>
                        {a.original_ends_at && a.original_ends_at !== a.ends_at ? <p className="text-xs text-zinc-600 dark:text-zinc-400">Extended by late bids. Planned end: {formatDateTime(a.original_ends_at)}.</p> : null}
                    </div>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800 sm:grid-cols-3 lg:grid-cols-4">
                    <Stat label={hasBids ? 'Current price' : 'Starting price'}>{formatMoney(hasBids ? a.current_price : a.starting_price, a.currency)}</Stat>
                    <Stat label="Bids">{a.bid_count}</Stat>
                    <Stat label="Watching">{a.watch_count}</Stat>
                    <Stat label="Reserve">{reserveText(a)}</Stat>
                    <Stat label="Minimum bid increase">{formatMoney(a.min_increment, a.currency)}</Stat>
                    <Stat label="Quantity">{a.quantity}</Stat>
                    {a.buy_now_price ? <Stat label="Buy now price">{formatMoney(a.buy_now_price, a.currency)}</Stat> : null}
                    <Stat label="Starts">{formatDateTime(a.starts_at)}</Stat>
                    <Stat label="Ends">{formatDateTime(a.ends_at)}</Stat>
                    <Stat label="Variant">
                        {a.variant?.name || a.variant?.sku || '-'}
                        {a.variant?.sku && a.variant?.name ? <span className="block text-xs font-normal text-zinc-600 dark:text-zinc-400">SKU {a.variant.sku}</span> : null}
                    </Stat>
                </dl>
                {a.description ? <p className="mt-3 whitespace-pre-line break-words border-t border-zinc-200 pt-3 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">{a.description}</p> : null}
            </Panel>

            {a.status === 'cancelled' ? (
                <Panel title="Cancelled">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{a.cancel_reason ? `Reason: ${a.cancel_reason}` : 'This auction was cancelled with no bids placed.'}</p>
                </Panel>
            ) : null}

            {showSettlement && a.status !== 'cancelled' ? (
                <Panel title="Result">
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        <Stat label="Outcome">{a.result ? <ResultBadge result={a.result} /> : 'Closing'}</Stat>
                        <Stat label="Winner">{a.winner_display ?? '-'}</Stat>
                        <Stat label="Order and payment">
                            <SettlementBadges orderId={a.order_id} orderStatus={a.order_status} paymentStatus={a.payment_status} settlement={a.settlement_status} />
                            {!a.order_id && a.settlement_status !== 'pending_order' ? '-' : null}
                        </Stat>
                        {a.payment_due_at ? <Stat label="Payment due">{formatDateTime(a.payment_due_at)}</Stat> : null}
                    </dl>
                    {a.order_id ? (
                        <p className="mt-3 text-sm">
                            <Link href={orderHref(a.order_id)} className={linkClass}>
                                View the order
                            </Link>
                        </p>
                    ) : null}
                </Panel>
            ) : null}

            {editing && editable && values ? (
                <form onSubmit={save} noValidate>
                    <Panel title="Edit auction" description="Available until the auction starts, while it has no bids.">
                        <AuctionForm values={values} errors={errors} onChange={onChange} mode="edit" startNow={false} onStartNowChange={() => undefined} stock={null} disabled={saving} />
                        {formError ? <ErrorPanel className="mt-3" title="Couldn't save the changes" message={formError} /> : null}
                        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button type="button" className={btnSecondary} onClick={() => setEditing(false)} disabled={saving}>
                                Discard changes
                            </button>
                            <button type="submit" className={btnPrimary} disabled={saving}>
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                {saving ? 'Saving...' : 'Save changes'}
                            </button>
                        </div>
                    </Panel>
                </form>
            ) : null}

            <Panel title="Bids" description={a.bids.length > 0 && a.bid_count > a.bids.length ? `Top ${a.bids.length} of ${a.bid_count} bids` : undefined} bodyClassName="p-0">
                {a.bids.length === 0 ? (
                    <div className="p-3 sm:p-4">
                        <EmptyPanel title="No bids yet" description="Bids appear here as soon as buyers place them." />
                    </div>
                ) : (
                    <table className="w-full table-fixed border-collapse text-left text-sm">
                        <thead>
                            <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                                <th scope="col" className="px-3 py-2 font-medium">
                                    Bidder
                                </th>
                                <th scope="col" className="w-28 px-3 py-2 text-right font-medium sm:w-36">
                                    Amount
                                </th>
                                <th scope="col" className="w-24 px-3 py-2 font-medium sm:w-44">
                                    Time
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {a.bids.map((b, i) => (
                                <tr key={`${b.placed_at}-${i}`}>
                                    <td className="break-words px-3 py-2 text-zinc-900 dark:text-zinc-100">
                                        {b.bidder_display}
                                        {b.is_buy_now ? <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs font-semibold text-sky-900 dark:bg-sky-900 dark:text-sky-100">Buy now</span> : null}
                                    </td>
                                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatMoney(b.amount, a.currency)}</td>
                                    <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">{formatDateTime(b.placed_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Panel>

            <Modal
                open={cancelOpen}
                onClose={() => setCancelOpen(false)}
                locked={cancelling}
                title="Cancel this auction?"
                description="Buyers will no longer see it and the reserved stock goes back to your listing. This cannot be undone."
                footer={
                    <>
                        <button type="button" className={btnSecondary} onClick={() => setCancelOpen(false)} disabled={cancelling}>
                            Keep auction
                        </button>
                        <button type="button" className={btnDanger} onClick={() => void confirmCancel()} disabled={cancelling}>
                            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                            {cancelling ? 'Cancelling...' : 'Cancel auction'}
                        </button>
                    </>
                }
            >
                <TextArea id="auction-cancel-reason" label="Reason" optional rows={3} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} disabled={cancelling} />
                {cancelError ? <ErrorPanel className="mt-3" title="Couldn't cancel" message={cancelError} /> : null}
            </Modal>
        </div>
    )
}

export default function AuctionDetailView({ id }: { id: string }) {
    return (
        <ToastProvider>
            <div className="space-y-3">
                <Link href={AUCTIONS_HREF} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400">
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Auctions
                </Link>
                <DetailBody id={id} />
            </div>
        </ToastProvider>
    )
}
