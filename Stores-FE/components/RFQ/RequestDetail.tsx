'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import {
    AlertCircle,
    ArrowLeft,
    CalendarClock,
    CheckCircle2,
    FileSearch,
    Info,
    Loader2,
    LogIn,
} from 'lucide-react'
import { AccountMobileHeader } from '@/components/account/AccountShell'
import { AttachmentManager } from '@/components/RFQ/AttachmentUploader'
import ConfirmDialog from '@/components/RFQ/ConfirmDialog'
import QuoteCard, { computeHighlights } from '@/components/RFQ/QuoteCard'
import QuoteCompareTable from '@/components/RFQ/QuoteCompareTable'
import RFQStatusBadge from '@/components/RFQ/RFQStatusBadge'
import { tryOpenAuthModalFromBridge } from '@/lib/authModalBridge'
import { COUNTRY_META } from '@/lib/storeCurrency'
import {
    RFQ_LIMITS,
    awardQuote,
    cancelRequest,
    formatDate,
    formatMoney,
    getRequest,
    newIdempotencyKey,
    parseRfqError,
    patchRequest,
    publishRequest,
    timeLeft,
    type BuyerQuote,
    type RFQDetail,
} from '@/lib/rfqApi'

const DEADLINE_DAYS = [2, 3, 7, 14, 30, 45]
/** Error codes after which the displayed state is stale and must be refetched. */
const STALE_CODES = ['already_awarded', 'rfq_not_awardable', 'award_window_closed', 'quote_not_available', 'quote_expired', 'invalid_state', 'not_editable']

const BTN_BASE =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500'
const BTN_PRIMARY = `${BTN_BASE} bg-primary-700 text-white hover:bg-primary-800`
const BTN_SECONDARY = `${BTN_BASE} border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800`
const BTN_DANGER = `${BTN_BASE} border border-red-300 dark:border-red-700 bg-white dark:bg-zinc-900 text-red-800 dark:text-red-100 hover:bg-red-50 dark:hover:bg-red-950`

function Banner({ tone, icon, children }: { tone: 'info' | 'success' | 'warn' | 'error'; icon: ReactNode; children: ReactNode }) {
    const cls = {
        info: 'border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950 text-sky-950 dark:text-sky-100',
        success: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 text-green-950 dark:text-green-100',
        warn: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 text-amber-950 dark:text-amber-100',
        error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100',
    }[tone]
    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${cls}`}>
            <span className="mt-0.5 shrink-0">{icon}</span>
            <div className="min-w-0 flex-1 space-y-2">{children}</div>
        </div>
    )
}

function Skeleton() {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="Loading request">
            <div className="h-6 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-40 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-32 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        </div>
    )
}

function DlRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">{children}</dd>
        </div>
    )
}

export default function RequestDetail() {
    const { id } = useParams<{ id: string }>()
    const searchParams = useSearchParams()
    const attachFailed = Number(searchParams.get('attach_failed') ?? '0')
    const isAuthenticated = useIsAuthenticated()
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    const signedIn = mounted && isAuthenticated

    const [now, setNow] = useState(() => Date.now())
    const [view, setView] = useState<'cards' | 'compare' | null>(null)
    const [isWide, setIsWide] = useState(false)

    const { data: rfq, error, isLoading, mutate } = useSWR<RFQDetail>(
        signedIn && id ? ['rfq', id] : null,
        () => getRequest(id),
        {
            refreshInterval: (latest) => (latest && (latest.status === 'open' || latest.status === 'quoting') ? 30_000 : 0),
        }
    )

    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1024px)')
        const update = () => setIsWide(mq.matches)
        update()
        mq.addEventListener('change', update)
        return () => mq.removeEventListener('change', update)
    }, [])
    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 60_000)
        return () => clearInterval(t)
    }, [])

    // ── actions ──────────────────────────────────────────────────────────────
    const [actionError, setActionError] = useState<string | null>(null)
    const [busy, setBusy] = useState<'publish' | null>(null)

    const [awardTarget, setAwardTarget] = useState<BuyerQuote | null>(null)
    const [awardBusy, setAwardBusy] = useState(false)
    const [awardError, setAwardError] = useState<string | null>(null)
    const awardKey = useRef<string>('')
    const [awardedOrderId, setAwardedOrderId] = useState<string | null>(null)

    const [cancelOpen, setCancelOpen] = useState(false)
    const [cancelReason, setCancelReason] = useState('')
    const [cancelBusy, setCancelBusy] = useState(false)
    const [cancelError, setCancelError] = useState<string | null>(null)

    const [deadlineOpen, setDeadlineOpen] = useState(false)
    const [deadlineDays, setDeadlineDays] = useState('')
    const [deadlineBusy, setDeadlineBusy] = useState(false)
    const [deadlineError, setDeadlineError] = useState<string | null>(null)

    const openSignIn = () => tryOpenAuthModalFromBridge('login')

    if (mounted && !isAuthenticated) {
        return (
            <div className="space-y-3">
                <AccountMobileHeader title="Request" />
                <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-10 text-center">
                    <LogIn className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Sign in to view this request.</p>
                    <button type="button" onClick={openSignIn} className={BTN_PRIMARY}>
                        Sign in
                    </button>
                </div>
            </div>
        )
    }

    if (!mounted || (isLoading && !rfq)) {
        return (
            <div className="space-y-3">
                <AccountMobileHeader title="Request" />
                <Skeleton />
            </div>
        )
    }

    if (error && !rfq) {
        const parsed = parseRfqError(error)
        // A contract 404 (carries a `code`) means the request is gone; a bare 404 means the RFQ backend isn't live yet.
        const notFound = parsed.status === 404 && parsed.code !== null
        return (
            <div className="space-y-3">
                <AccountMobileHeader title="Request" />
                <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-10 text-center">
                    {notFound ? (
                        <FileSearch className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                    ) : (
                        <AlertCircle className="h-8 w-8 text-red-700 dark:text-red-400" aria-hidden="true" />
                    )}
                    <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{parsed.message}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {!notFound ? (
                            <button type="button" onClick={() => mutate()} className={BTN_SECONDARY}>
                                Try again
                            </button>
                        ) : null}
                        <Link href="/account/requests" className={BTN_PRIMARY}>
                            Back to my requests
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    if (!rfq) return null

    // ── derived ──────────────────────────────────────────────────────────────
    const editable = rfq.status === 'draft' || rfq.status === 'open' || rfq.status === 'quoting'
    const closesMs = new Date(rfq.closes_at).getTime()
    const deadlineStale = rfq.status === 'draft' && closesMs < now + RFQ_LIMITS.minOpenHours * 3_600_000
    const quotes = rfq.quotes.filter((q) => q.status !== 'withdrawn')
    const highlights = computeHighlights(quotes)
    const awardable = rfq.status === 'quoting'
    const effectiveView = view ?? (isWide && quotes.length >= 2 ? 'compare' : 'cards')
    const orderId = rfq.order_id ?? awardedOrderId
    const country = COUNTRY_META[rfq.delivery_country]?.name ?? rfq.delivery_country
    const location = [rfq.delivery_city, country].filter(Boolean).join(', ')
    const budget =
        rfq.budget_min || rfq.budget_max
            ? rfq.budget_min && rfq.budget_max
                ? `${formatMoney(rfq.budget_min, rfq.currency)} – ${formatMoney(rfq.budget_max, rfq.currency)}`
                : rfq.budget_max
                  ? `Up to ${formatMoney(rfq.budget_max, rfq.currency)}`
                  : `From ${formatMoney(rfq.budget_min, rfq.currency)}`
            : null

    const deadlineChoices = DEADLINE_DAYS.filter((d) => rfq.status !== 'quoting' || now + d * 86_400_000 > closesMs)

    // ── handlers ─────────────────────────────────────────────────────────────
    const refreshIfStale = (code: string | null) => {
        if (code && STALE_CODES.includes(code)) mutate()
    }

    const doPublish = async () => {
        setActionError(null)
        setBusy('publish')
        try {
            const updated = await publishRequest(rfq.id)
            await mutate(updated, { revalidate: false })
        } catch (err) {
            const p = parseRfqError(err)
            setActionError(p.fields.closes_at ?? p.message)
            refreshIfStale(p.code)
        }
        setBusy(null)
    }

    const startAward = (q: BuyerQuote) => {
        awardKey.current = newIdempotencyKey()
        setAwardError(null)
        setAwardTarget(q)
    }

    const confirmAward = async () => {
        if (!awardTarget) return
        setAwardBusy(true)
        setAwardError(null)
        try {
            const result = await awardQuote(rfq.id, awardTarget.id, awardKey.current)
            setAwardedOrderId(result.order_id)
            await mutate(result.rfq, { revalidate: false })
            setAwardTarget(null)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (err) {
            const p = parseRfqError(err)
            setAwardError(p.message)
            refreshIfStale(p.code)
        }
        setAwardBusy(false)
    }

    const confirmCancel = async () => {
        setCancelBusy(true)
        setCancelError(null)
        try {
            await cancelRequest(rfq.id, cancelReason.trim() || undefined)
            await mutate()
            setCancelOpen(false)
            setCancelReason('')
        } catch (err) {
            const p = parseRfqError(err)
            setCancelError(p.message)
            refreshIfStale(p.code)
        }
        setCancelBusy(false)
    }

    const openDeadline = () => {
        setDeadlineError(null)
        setDeadlineDays(String(deadlineChoices.find((d) => d >= 7) ?? deadlineChoices[0] ?? ''))
        setDeadlineOpen(true)
    }

    const confirmDeadline = async () => {
        if (!deadlineDays) return
        setDeadlineBusy(true)
        setDeadlineError(null)
        try {
            const updated = await patchRequest(rfq.id, {
                closes_at: new Date(Date.now() + Number(deadlineDays) * 86_400_000).toISOString(),
            })
            await mutate(updated, { revalidate: false })
            setDeadlineOpen(false)
        } catch (err) {
            const p = parseRfqError(err)
            setDeadlineError(p.fields.closes_at ?? p.message)
            refreshIfStale(p.code)
        }
        setDeadlineBusy(false)
    }

    const cancelCopy =
        rfq.status === 'draft'
            ? 'This draft will be cancelled. Suppliers never saw it.'
            : 'Suppliers who already quoted are notified and their quotes are marked as not selected. This can’t be undone.'

    return (
        <div className="space-y-3 lg:space-y-4">
            <AccountMobileHeader title="Request" />

            <Link
                href="/account/requests"
                className="hidden items-center gap-1 text-sm font-semibold text-primary-700 dark:text-primary-400 hover:underline lg:inline-flex"
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                My requests
            </Link>

            {/* Title + actions */}
            <header className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <RFQStatusBadge status={rfq.status} />
                            <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{rfq.reference}</span>
                        </div>
                        <h1 className="mt-1 break-words font-syne text-lg font-bold leading-snug text-zinc-900 dark:text-zinc-100 sm:text-xl">{rfq.title}</h1>
                        <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                            {rfq.category ? `${rfq.category.name} · ` : ''}
                            Posted {formatDate(rfq.created_on)}
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end">
                        {rfq.status === 'awarded' && orderId ? (
                            <>
                                <Link href={`/checkout?order=${encodeURIComponent(orderId)}`} className={BTN_PRIMARY}>
                                    Pay now
                                </Link>
                                <Link href={`/account/orders/${encodeURIComponent(orderId)}`} className={BTN_SECONDARY}>
                                    View order
                                </Link>
                            </>
                        ) : null}
                        {rfq.status === 'draft' ? (
                            <button type="button" onClick={doPublish} disabled={busy !== null || deadlineStale} className={BTN_PRIMARY}>
                                {busy === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                Post request
                            </button>
                        ) : null}
                        {editable ? (
                            <button type="button" onClick={openDeadline} className={BTN_SECONDARY}>
                                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                                {rfq.status === 'quoting' ? 'Extend deadline' : 'Change deadline'}
                            </button>
                        ) : null}
                        {editable ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setCancelError(null)
                                    setCancelOpen(true)
                                }}
                                className={BTN_DANGER}
                            >
                                Cancel request
                            </button>
                        ) : null}
                    </div>
                </div>
            </header>

            {/* State banners */}
            {actionError ? (
                <Banner tone="error" icon={<AlertCircle className="h-4 w-4" aria-hidden="true" />}>
                    <p className="font-medium">{actionError}</p>
                </Banner>
            ) : null}
            {attachFailed > 0 ? (
                <Banner tone="warn" icon={<AlertCircle className="h-4 w-4" aria-hidden="true" />}>
                    <p className="font-medium">
                        Your request was saved, but {attachFailed} attachment{attachFailed === 1 ? '' : 's'} couldn&apos;t be uploaded. You can add
                        {attachFailed === 1 ? ' it' : ' them'} again under Attachments below.
                    </p>
                </Banner>
            ) : null}
            {rfq.status === 'draft' ? (
                <Banner tone={deadlineStale ? 'warn' : 'info'} icon={<Info className="h-4 w-4" aria-hidden="true" />}>
                    <p className="font-medium">This is a draft. Suppliers can&apos;t see it until you post it.</p>
                    {deadlineStale ? (
                        <p>
                            The quote deadline has passed or is less than {RFQ_LIMITS.minOpenHours} hours away. Change the deadline, then post.
                        </p>
                    ) : null}
                </Banner>
            ) : null}
            {rfq.status === 'awarded' ? (
                <Banner tone="success" icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />}>
                    <p className="font-medium">
                        {awardedOrderId ? 'Quote awarded and your order was created. ' : 'You awarded this request. '}
                        The other suppliers have been notified.
                    </p>
                    <p>Pay for the order before its payment deadline, or it will be cancelled and this request will expire.</p>
                </Banner>
            ) : null}
            {rfq.status === 'closed' ? (
                <Banner tone="info" icon={<Info className="h-4 w-4" aria-hidden="true" />}>
                    <p className="font-medium">This request is closed. The awarded order has been paid.</p>
                </Banner>
            ) : null}
            {rfq.status === 'cancelled' ? (
                <Banner tone="info" icon={<Info className="h-4 w-4" aria-hidden="true" />}>
                    <p className="font-medium">This request was cancelled. No quote was awarded.</p>
                </Banner>
            ) : null}
            {rfq.status === 'expired' ? (
                <Banner tone="warn" icon={<Info className="h-4 w-4" aria-hidden="true" />}>
                    <p className="font-medium">
                        {rfq.awarded_quote_id
                            ? 'This request expired because the awarded order was not paid in time.'
                            : 'This request expired before a quote was awarded.'}
                    </p>
                    <p>
                        <Link href="/rfq" className="font-bold underline">
                            Post a new request
                        </Link>
                    </p>
                </Banner>
            ) : null}

            {/* Summary */}
            <section aria-label="Request details" className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 sm:p-4">
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                    <DlRow label="Quantity">
                        {rfq.quantity.toLocaleString('en-GB')} {rfq.unit}
                    </DlRow>
                    <DlRow label="Budget">{budget ?? 'Not specified'}</DlRow>
                    <DlRow label="Deliver to">{location}</DlRow>
                    <DlRow label="Needed by">{rfq.needed_by ? formatDate(rfq.needed_by) : 'Not specified'}</DlRow>
                    <DlRow label="Quotes close">
                        {formatDate(rfq.closes_at, true)}
                        {rfq.status === 'open' || rfq.status === 'quoting' ? (
                            <span className="block text-xs font-normal text-zinc-600 dark:text-zinc-400">{timeLeft(rfq.closes_at, now)}</span>
                        ) : null}
                    </DlRow>
                    <DlRow label="Quotes received">{rfq.status === 'draft' ? 'Not posted yet' : rfq.quote_count}</DlRow>
                </dl>

                <div className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                    <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Description</h2>
                    <p className="mt-1 whitespace-pre-line break-words text-sm text-zinc-800 dark:text-zinc-200">{rfq.description}</p>
                </div>

                {rfq.specs.length > 0 ? (
                    <div className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                        <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Specifications</h2>
                        <dl className="mt-1 grid gap-x-4 sm:grid-cols-2">
                            {rfq.specs.map((s, i) => (
                                <div key={`${s.label}-${i}`} className="flex justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 py-1.5 text-sm">
                                    <dt className="text-zinc-600 dark:text-zinc-400">{s.label}</dt>
                                    <dd className="text-right font-medium text-zinc-900 dark:text-zinc-100">{s.value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                ) : null}

                {rfq.attachments.length > 0 || editable ? (
                    <div className="mt-3 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                        <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Attachments</h2>
                        <AttachmentManager rfqId={rfq.id} attachments={rfq.attachments} editable={editable} onChanged={() => mutate()} />
                    </div>
                ) : null}
            </section>

            {/* Quotes */}
            {rfq.status !== 'draft' ? (
                <section aria-label="Quotes" className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="font-syne text-base font-bold text-zinc-900 dark:text-zinc-100">
                            Quotes <span className="font-sans text-sm font-medium text-zinc-600 dark:text-zinc-400">({quotes.length})</span>
                        </h2>
                        {quotes.length >= 2 ? (
                            <div role="group" aria-label="Quote view" className="inline-flex overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                                {(['cards', 'compare'] as const).map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        aria-pressed={effectiveView === v}
                                        onClick={() => setView(v)}
                                        className={`min-h-[44px] px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 ${
                                            effectiveView === v ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                        }`}
                                    >
                                        {v === 'cards' ? 'Cards' : 'Compare'}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {quotes.length === 0 ? (
                        <div className="flex flex-col items-center gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-8 text-center">
                            <FileSearch className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                            {rfq.status === 'open' ? (
                                <>
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No quotes yet</p>
                                    <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
                                        Suppliers in this category can send quotes until {formatDate(rfq.closes_at, true)}. This page checks for new quotes
                                        automatically.
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No quotes were received for this request.</p>
                            )}
                        </div>
                    ) : effectiveView === 'compare' && quotes.length >= 2 ? (
                        <QuoteCompareTable quotes={quotes} highlights={highlights} awardable={awardable} onAward={startAward} />
                    ) : (
                        <div className="grid gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {quotes.map((q) => (
                                <QuoteCard key={q.id} quote={q} highlight={highlights.get(q.id)} awardable={awardable} onAward={startAward} />
                            ))}
                        </div>
                    )}
                </section>
            ) : null}

            {/* Award dialog */}
            <ConfirmDialog
                open={awardTarget !== null}
                title="Award this quote?"
                confirmLabel="Confirm award"
                cancelLabel="Go back"
                busy={awardBusy}
                error={awardError}
                onConfirm={confirmAward}
                onClose={() => setAwardTarget(null)}
            >
                {awardTarget ? (
                    <>
                        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800 p-2.5">
                            <p className="font-bold text-zinc-900 dark:text-zinc-100">{awardTarget.supplier.business_name}</p>
                            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                {awardTarget.quantity} × {formatMoney(awardTarget.unit_price, awardTarget.currency)} + shipping{' '}
                                {Number(awardTarget.shipping_cost) === 0 ? 'included' : formatMoney(awardTarget.shipping_cost, awardTarget.currency)}
                            </p>
                            <p className="mt-1 text-base font-bold text-zinc-900 dark:text-zinc-100">
                                Total {formatMoney(awardTarget.grand_total, awardTarget.currency)}
                            </p>
                        </div>
                        <ul className="list-disc space-y-1 pl-5">
                            <li>An order is created for this supplier. You then pay for it before its payment deadline, or it is cancelled.</li>
                            <li>All other suppliers who quoted are notified that their quotes were not selected.</li>
                            <li>A request can only be awarded once, so you can&apos;t pick a different quote afterwards.</li>
                        </ul>
                    </>
                ) : null}
            </ConfirmDialog>

            {/* Cancel dialog */}
            <ConfirmDialog
                open={cancelOpen}
                title="Cancel this request?"
                confirmLabel="Cancel request"
                tone="danger"
                busy={cancelBusy}
                error={cancelError}
                onConfirm={confirmCancel}
                onClose={() => setCancelOpen(false)}
            >
                <p>{cancelCopy}</p>
                <div>
                    <label htmlFor="cancel-reason" className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Reason <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
                    </label>
                    <textarea
                        id="cancel-reason"
                        rows={2}
                        maxLength={500}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="block w-full [color-scheme:light] dark:[color-scheme:dark] rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-base text-zinc-900 dark:text-zinc-100 focus:border-primary-700 dark:focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-700 dark:focus:ring-primary-400"
                    />
                </div>
            </ConfirmDialog>

            {/* Deadline dialog */}
            <ConfirmDialog
                open={deadlineOpen}
                title={rfq.status === 'quoting' ? 'Extend quote deadline' : 'Change quote deadline'}
                confirmLabel="Save deadline"
                cancelLabel="Go back"
                busy={deadlineBusy}
                error={deadlineError}
                onConfirm={confirmDeadline}
                onClose={() => setDeadlineOpen(false)}
            >
                <p>
                    Currently closes {formatDate(rfq.closes_at, true)}.
                    {rfq.status === 'quoting' ? ' You can only move the deadline later.' : ''}
                </p>
                {deadlineChoices.length === 0 ? (
                    <p className="font-medium">The deadline is already as far out as it can go.</p>
                ) : (
                    <div>
                        <label htmlFor="deadline-days" className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            Accept quotes for
                        </label>
                        <select
                            id="deadline-days"
                            value={deadlineDays}
                            onChange={(e) => setDeadlineDays(e.target.value)}
                            className="block min-h-[44px] w-full [color-scheme:light] dark:[color-scheme:dark] rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-base text-zinc-900 dark:text-zinc-100 focus:border-primary-700 dark:focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-700 dark:focus:ring-primary-400"
                        >
                            {deadlineChoices.map((d) => (
                                <option key={d} value={d}>
                                    {d} days from now
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </ConfirmDialog>
        </div>
    )
}
