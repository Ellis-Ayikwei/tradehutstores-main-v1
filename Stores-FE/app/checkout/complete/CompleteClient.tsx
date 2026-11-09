'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useDispatch } from 'react-redux'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import {
    AlertTriangle,
    Banknote,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock,
    CreditCard,
    Headphones,
    PackageCheck,
    SearchX,
    Truck,
    XCircle,
} from 'lucide-react'
import type { AppDispatch } from '@/store'
import { removeFromCart } from '@/store/cartSlice'
import MainLayout from '@/components/Layouts/MainLayout'
import WhatsAppAssist from '@/components/common/WhatsAppAssist'
import { useCurrency } from '@/contexts/CurrencyContext'
import { tryOpenAuthModalFromBridge } from '@/lib/authModalBridge'
import {
    clearIdempotencyKey,
    fetchOrder,
    forgetCheckout,
    isBackendUnavailable,
    moneyToNumber,
    recallCheckout,
    savePromoCode,
    takeCartLinesToClear,
    toCheckoutError,
    verifyPayment,
} from '@/lib/checkoutApi'
import { BTN_PRIMARY, BTN_SECONDARY, CARD, FOCUS, OrderingUnavailable, Spinner } from '../_components/ui'

type Outcome = 'paid' | 'pending' | 'cod' | 'failed' | 'review'

interface OrderRef {
    id: string
    number: string
    orderStatus?: string
    paymentStatus?: string
    total?: string
}

interface Summary {
    provider: 'cod' | 'paystack' | string
    currency?: string
    amount?: string
}

type View =
    | { kind: 'loading' }
    | { kind: Outcome; orders: OrderRef[]; summary: Summary }
    | { kind: 'error'; message: string; unavailable: boolean }
    | { kind: 'missing' }

const MAX_POLLS = 6
const POLL_MS = 3000

/** `#04453BC8`: the number buyers and staff see everywhere (the first 8 characters of the order id). */
const orderNumber = (id: string, given?: string) => given || `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`

const TONE: Record<Outcome | 'error' | 'missing', { Icon: typeof CheckCircle2; band: string; ring: string }> = {
    paid: { Icon: CheckCircle2, band: 'bg-emerald-700 text-white dark:bg-emerald-800', ring: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
    cod: { Icon: PackageCheck, band: 'bg-emerald-700 text-white dark:bg-emerald-800', ring: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
    pending: { Icon: Clock, band: 'bg-amber-500 text-zinc-950 dark:bg-amber-600', ring: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
    review: { Icon: AlertTriangle, band: 'bg-amber-500 text-zinc-950 dark:bg-amber-600', ring: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
    failed: { Icon: XCircle, band: 'bg-red-700 text-white dark:bg-red-800', ring: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' },
    error: { Icon: AlertTriangle, band: 'bg-red-700 text-white dark:bg-red-800', ring: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' },
    missing: { Icon: SearchX, band: 'bg-zinc-800 text-white dark:bg-zinc-700', ring: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200' },
}

const COPY: Record<Outcome, { title: string; body: string }> = {
    paid: {
        title: 'Payment received',
        body: 'Thank you. Your payment went through and the seller is getting your order ready.',
    },
    cod: {
        title: 'Order placed',
        body: 'You will pay in cash when your order arrives. Please have the exact amount ready for the rider.',
    },
    pending: {
        title: 'Confirming your payment',
        body: 'We have not had confirmation of your payment yet. This can take a minute. This page updates by itself, and you can also check My orders.',
    },
    failed: {
        title: 'Payment did not go through',
        body: 'Your order was not paid. If you were charged, call or message us and we will sort it out. Otherwise you can place the order again.',
    },
    review: {
        title: 'We are reviewing your payment',
        body: 'Your payment needs a quick manual check before the order can continue. Please call or message us so we can help right away.',
    },
}

function mapStatus(status: string, orders: OrderRef[]): Outcome {
    switch (status) {
        case 'paid':
            return 'paid'
        case 'cod':
            return 'cod'
        case 'failed':
        case 'expired':
            return 'failed'
        case 'needs_review':
            return 'review'
        default:
            return orders.length > 0 && orders.every((o) => o.paymentStatus === 'paid') ? 'paid' : 'pending'
    }
}

export default function CompleteClient() {
    const params = useSearchParams()
    const dispatch = useDispatch<AppDispatch>()
    const isAuthenticated = useIsAuthenticated()
    const [hydrated, setHydrated] = useState(false)
    useEffect(() => setHydrated(true), [])

    const orderParam = params.get('order')
    const sessionParam = params.get('session')
    const referenceParam = params.get('reference') ?? params.get('trxref')
    const hasTarget = Boolean(orderParam || sessionParam || referenceParam)

    const [view, setView] = useState<View>({ kind: 'loading' })
    const [checking, setChecking] = useState(false)
    const [tick, setTick] = useState(0)
    const pollsRef = useRef(0)
    const cleanedRef = useRef(false)

    // Confirmed orders: drop the purchased cart lines, the promo code and the retry key (best effort).
    const cleanUp = useCallback(async () => {
        if (cleanedRef.current) return
        cleanedRef.current = true
        clearIdempotencyKey()
        savePromoCode(null)
        forgetCheckout()
        for (const id of takeCartLinesToClear()) {
            await dispatch(removeFromCart({ cartItemId: id }))
        }
    }, [dispatch])

    useEffect(() => {
        if (!hydrated || !isAuthenticated || !hasTarget) return
        let cancelled = false

        const run = async () => {
            setChecking(true)
            try {
                if (orderParam) {
                    const order = await fetchOrder(orderParam)
                    if (cancelled) return
                    const refs: OrderRef[] = [
                        { id: order.id, number: orderNumber(order.id), orderStatus: order.order_status, paymentStatus: order.payment_status, total: String(order.total_amount) },
                    ]
                    const kind: Outcome =
                        order.payment_status === 'paid' || order.payment_status === 'partially_refunded'
                            ? 'paid'
                            : order.order_status === 'Cancelled'
                              ? 'failed'
                              : 'pending'
                    setView({ kind, orders: refs, summary: { provider: 'paystack', currency: order.currency, amount: String(order.total_amount) } })
                    return
                }

                const stored = recallCheckout()
                const known = stored && (stored.checkout_id === sessionParam || stored.reference === referenceParam) ? stored : null
                if (known && known.status === 'cod') {
                    setView({
                        kind: 'cod',
                        orders: known.orders
                            .filter((o) => o.id)
                            .map((o) => ({ id: String(o.id), number: orderNumber(String(o.id), o.order_number), total: o.total_amount != null ? String(o.total_amount) : undefined })),
                        summary: { provider: 'cod', currency: known.currency, amount: known.amount },
                    })
                    return
                }
                const reference = referenceParam ?? known?.reference ?? sessionParam
                if (!reference) {
                    setView({ kind: 'missing' })
                    return
                }
                const verified = await verifyPayment(reference)
                if (cancelled) return
                const refs: OrderRef[] = (verified.orders ?? []).map((o) => ({
                    id: o.id,
                    number: orderNumber(o.id, o.order_number),
                    orderStatus: o.order_status,
                    paymentStatus: o.payment_status,
                    total: o.total_amount,
                }))
                setView({
                    kind: mapStatus(verified.status, refs),
                    orders: refs,
                    summary: { provider: verified.provider ?? 'paystack', currency: verified.currency, amount: verified.amount },
                })
            } catch (err) {
                if (cancelled) return
                const e = toCheckoutError(err)
                if (e.status === 401) {
                    tryOpenAuthModalFromBridge('login')
                    setView({ kind: 'error', message: 'Please sign in to see this order.', unavailable: false })
                } else if (e.status === 404 && e.code) {
                    setView({ kind: 'error', message: 'We could not find that payment. Check My orders for its status.', unavailable: false })
                } else {
                    setView({
                        kind: 'error',
                        message: 'We could not check the status of your order right now.',
                        unavailable: isBackendUnavailable(e),
                    })
                }
            } finally {
                if (!cancelled) setChecking(false)
            }
        }
        void run()
        return () => {
            cancelled = true
        }
    }, [hydrated, isAuthenticated, hasTarget, orderParam, sessionParam, referenceParam, tick])

    // Poll a few times while the payment is pending, and clean up once the outcome is final.
    useEffect(() => {
        if (view.kind === 'paid' || view.kind === 'cod') void cleanUp()
        if (view.kind !== 'pending') return
        if (pollsRef.current >= MAX_POLLS) return
        const timer = window.setTimeout(() => {
            pollsRef.current += 1
            setTick((t) => t + 1)
        }, POLL_MS)
        return () => window.clearTimeout(timer)
    }, [view, cleanUp])

    const pollingExhausted = view.kind === 'pending' && pollsRef.current >= MAX_POLLS

    let content: React.ReactNode
    if (!hydrated || (hasTarget && isAuthenticated && view.kind === 'loading')) {
        content = (
            <div role="status" aria-label="Checking your order" className={`${CARD} flex flex-col items-center gap-3 px-4 py-14 text-center`}>
                <Spinner className="h-8 w-8 text-primary-700 dark:text-primary-400" />
                <p className="text-sm text-zinc-700 dark:text-zinc-300">Checking your order…</p>
            </div>
        )
    } else if (!hasTarget || view.kind === 'missing') {
        content = (
            <Simple tone="missing" title="Nothing to show here">
                <p>This page confirms an order after checkout. Open My orders to see your orders.</p>
                <Actions>
                    <Link href="/account/orders" className={BTN_PRIMARY}>View my orders</Link>
                    <Link href="/products" className={BTN_SECONDARY}>Continue shopping</Link>
                </Actions>
            </Simple>
        )
    } else if (!isAuthenticated) {
        content = (
            <Simple tone="missing" title="Sign in to see your order">
                <p>Sign in with the account you used at checkout to see its status.</p>
                <Actions>
                    <button type="button" onClick={() => tryOpenAuthModalFromBridge('login')} className={BTN_PRIMARY}>
                        Sign in to continue
                    </button>
                    <Link href="/products" className={BTN_SECONDARY}>Continue shopping</Link>
                </Actions>
            </Simple>
        )
    } else if (view.kind === 'error') {
        content = (
            <Simple tone="error" title="We couldn’t check your order">
                <p role="alert">{view.message}</p>
                {view.unavailable ? <OrderingUnavailable className="mt-3 text-left" /> : null}
                <Actions>
                    <button type="button" onClick={() => setTick((t) => t + 1)} disabled={checking} className={BTN_PRIMARY}>
                        {checking ? <Spinner /> : null}
                        Try again
                    </button>
                    <Link href="/account/orders" className={BTN_SECONDARY}>View my orders</Link>
                </Actions>
            </Simple>
        )
    } else if (view.kind !== 'loading') {
        content = (
            <Receipt
                outcome={view.kind}
                orders={view.orders}
                summary={view.summary}
                polling={view.kind === 'pending' && !pollingExhausted}
                checking={checking}
                onCheckAgain={() => {
                    pollsRef.current = 0
                    setTick((t) => t + 1)
                }}
            />
        )
    }

    return (
        <MainLayout>
            <div className="min-h-[60vh] bg-zinc-100 dark:bg-zinc-950">
                {/* Extra bottom room on small screens so the floating WhatsApp button never covers the last buttons. */}
                <div className="mx-auto max-w-4xl px-3 pb-24 pt-5 sm:px-4 sm:pb-10 lg:py-10">{content}</div>
            </div>
        </MainLayout>
    )
}

/* ------------------------------------------------------------------ the receipt */

function Receipt({
    outcome,
    orders,
    summary,
    polling,
    checking,
    onCheckAgain,
}: {
    outcome: Outcome
    orders: OrderRef[]
    summary: Summary
    polling: boolean
    checking: boolean
    onCheckAgain: () => void
}) {
    const { formatDisplayPrice } = useCurrency()
    const copy = COPY[outcome]
    const { Icon, band } = TONE[outcome]
    const amount = moneyToNumber(summary.amount)
    const isCod = summary.provider === 'cod'
    const money = (value?: string | null) => {
        const n = moneyToNumber(value)
        return n === null ? null : formatDisplayPrice(n, summary.currency)
    }
    const needsHelp = outcome === 'failed' || outcome === 'review' || (outcome === 'pending' && !polling)

    return (
        <div className="space-y-4" aria-live="polite">
            {/* Status banner */}
            <section className={`${band} overflow-hidden rounded-lg px-4 py-6 sm:px-8 sm:py-8`}>
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
                            <Icon className="h-7 w-7" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <h1 className="font-syne text-2xl font-bold sm:text-3xl">{copy.title}</h1>
                            <p className="mt-1 max-w-xl text-sm sm:text-base">{copy.body}</p>
                            {polling ? (
                                <p className="mt-2 flex items-center gap-2 text-sm font-semibold">
                                    <Spinner /> Checking again…
                                </p>
                            ) : null}
                        </div>
                    </div>
                    {amount !== null ? (
                        <div className="shrink-0 rounded-md bg-white px-4 py-3 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 sm:text-right">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{isCod ? 'Pay on delivery' : 'Total'}</p>
                            <p className="font-mono text-2xl font-bold">{formatDisplayPrice(amount, summary.currency)}</p>
                        </div>
                    ) : null}
                </div>
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                    {/* Orders */}
                    {orders.length > 0 ? (
                        <section className={`${CARD} p-4 sm:p-5`} aria-labelledby="orders-heading">
                            <h2 id="orders-heading" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                                {orders.length === 1 ? 'Your order' : `Your ${orders.length} orders`}
                            </h2>
                            <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                                {orders.length === 1 ? 'Quote this number if you contact us.' : 'Items from different sellers are sent as separate orders.'}
                            </p>
                            <ul className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
                                {orders.map((o) => (
                                    <li key={o.id}>
                                        <Link
                                            href={`/account/orders/${encodeURIComponent(o.id)}`}
                                            className={`flex min-h-[56px] items-center justify-between gap-3 py-3 ${FOCUS}`}
                                        >
                                            <span className="min-w-0">
                                                <span className="block font-mono text-lg font-bold text-primary-700 dark:text-primary-400">{o.number}</span>
                                                {o.orderStatus || o.paymentStatus ? (
                                                    <span className="mt-0.5 block text-xs text-zinc-600 dark:text-zinc-400">
                                                        {[o.orderStatus, o.paymentStatus].filter(Boolean).join(' · ')}
                                                    </span>
                                                ) : null}
                                            </span>
                                            <span className="flex shrink-0 items-center gap-2">
                                                {money(o.total) ? <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{money(o.total)}</span> : null}
                                                <ChevronRight className="h-4 w-4 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}

                    {/* Payment */}
                    <section className={`${CARD} p-4 sm:p-5`} aria-labelledby="payment-heading">
                        <h2 id="payment-heading" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                            Payment
                        </h2>
                        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Method</dt>
                                <dd className="mt-1 flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100">
                                    {isCod ? <Banknote className="h-4 w-4" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
                                    {isCod ? 'Cash on delivery' : 'Card or mobile money'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Status</dt>
                                <dd className="mt-1 font-semibold text-zinc-900 dark:text-zinc-100">
                                    {outcome === 'paid' ? 'Paid' : outcome === 'cod' ? 'Pay on delivery' : outcome === 'pending' ? 'Waiting for confirmation' : outcome === 'review' ? 'Under review' : 'Not paid'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Amount</dt>
                                <dd className="mt-1 font-mono font-semibold text-zinc-900 dark:text-zinc-100">{amount !== null ? formatDisplayPrice(amount, summary.currency) : '-'}</dd>
                            </div>
                        </dl>
                    </section>

                    {needsHelp ? <HelpCard /> : null}
                </div>

                {/* What happens next */}
                {outcome === 'paid' || outcome === 'cod' ? (
                    <aside className={`${CARD} h-fit p-4 sm:p-5`} aria-labelledby="next-heading">
                        <h2 id="next-heading" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                            What happens next
                        </h2>
                        <ol className="mt-3 space-y-4">
                            <Step done icon={<Check className="h-4 w-4" aria-hidden="true" />} title="Order placed" text={isCod ? 'Your order is confirmed.' : 'Your payment is confirmed.'} />
                            <Step icon={<PackageCheck className="h-4 w-4" aria-hidden="true" />} title="Seller prepares it" text="They pack your items and hand them to a courier." />
                            <Step icon={<Truck className="h-4 w-4" aria-hidden="true" />} title="On its way" text="You get a tracking number once it ships." />
                            <Step last icon={isCod ? <Banknote className="h-4 w-4" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />} title="Delivered" text={isCod ? 'Pay the rider in cash.' : 'Enjoy your purchase.'} />
                        </ol>
                    </aside>
                ) : null}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                {outcome === 'pending' ? (
                    <button type="button" onClick={onCheckAgain} disabled={checking} className={BTN_PRIMARY}>
                        {checking ? <Spinner /> : null}
                        Check again
                    </button>
                ) : null}
                <Link href="/account/orders" className={outcome === 'pending' ? BTN_SECONDARY : BTN_PRIMARY}>
                    View my orders
                </Link>
                <Link href="/products" className={BTN_SECONDARY}>
                    Continue shopping
                </Link>
            </div>

            {/* "Get assistance with this order on WhatsApp": a floating button with a pop-up that opens a chat naming the order. */}
            <WhatsAppAssist orderNumbers={orders.map((o) => o.number)} />
        </div>
    )
}

function Step({ icon, title, text, done = false, last = false }: { icon: React.ReactNode; title: string; text: string; done?: boolean; last?: boolean }) {
    return (
        <li className="relative flex gap-3">
            {!last ? <span className="absolute left-4 top-8 h-[calc(100%-0.5rem)] w-px bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" /> : null}
            <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    done ? 'bg-emerald-700 text-white dark:bg-emerald-600' : 'border border-zinc-300 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300'
                }`}
            >
                {icon}
            </span>
            <span className="min-w-0 pb-1">
                <span className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</span>
                <span className="block text-sm text-zinc-600 dark:text-zinc-400">{text}</span>
            </span>
        </li>
    )
}

function HelpCard() {
    return (
        <section className={`${CARD} flex items-start gap-3 p-4 sm:p-5`}>
            <Headphones className="mt-0.5 h-5 w-5 shrink-0 text-primary-700 dark:text-primary-400" aria-hidden="true" />
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
                <p className="font-semibold text-zinc-900 dark:text-zinc-100">Need a hand?</p>
                <p className="mt-1">
                    Call{' '}
                    <a href="tel:+233248138722" className="font-semibold text-primary-700 underline hover:no-underline dark:text-primary-400">
                        024 813 8722
                    </a>{' '}
                    or message us on{' '}
                    <a
                        href="https://wa.me/233248138722"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary-700 underline hover:no-underline dark:text-primary-400"
                    >
                        WhatsApp
                    </a>
                    . Have your order number ready.
                </p>
            </div>
        </section>
    )
}

function Simple({ tone, title, children }: { tone: 'missing' | 'error'; title: string; children: React.ReactNode }) {
    const { Icon, ring } = TONE[tone]
    return (
        <div className={`${CARD} mx-auto max-w-xl px-4 py-8 text-center text-sm text-zinc-700 dark:text-zinc-300 sm:px-6 sm:py-10`} aria-live="polite">
            <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${ring}`}>
                <Icon className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-3 font-syne text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">{title}</h1>
            <div className="mx-auto mt-2 max-w-md">{children}</div>
        </div>
    )
}

function Actions({ children }: { children: React.ReactNode }) {
    return <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">{children}</div>
}
