'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useDispatch } from 'react-redux'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { AlertTriangle, CheckCircle2, Clock, PackageCheck, SearchX, XCircle } from 'lucide-react'
import type { AppDispatch } from '@/store'
import { removeFromCart } from '@/store/cartSlice'
import MainLayout from '@/components/Layouts/MainLayout'
import { tryOpenAuthModalFromBridge } from '@/lib/authModalBridge'
import {
    clearIdempotencyKey,
    fetchOrder,
    forgetCheckout,
    isBackendUnavailable,
    recallCheckout,
    savePromoCode,
    takeCartLinesToClear,
    toCheckoutError,
    verifyPayment,
} from '@/lib/checkoutApi'
import { BTN_PRIMARY, BTN_SECONDARY, CARD, FOCUS, OrderingUnavailable, Spinner } from '../_components/ui'

type View =
    | { kind: 'loading' }
    | { kind: 'paid' | 'pending' | 'cod' | 'failed' | 'review'; orders: OrderRef[] }
    | { kind: 'error'; message: string; unavailable: boolean }
    | { kind: 'missing' }

interface OrderRef {
    id: string
    orderStatus?: string
    paymentStatus?: string
}

const MAX_POLLS = 6
const POLL_MS = 3000

const TONE = {
    paid: { Icon: CheckCircle2, chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
    cod: { Icon: PackageCheck, chip: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' },
    pending: { Icon: Clock, chip: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
    review: { Icon: AlertTriangle, chip: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200' },
    failed: { Icon: XCircle, chip: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' },
    error: { Icon: AlertTriangle, chip: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' },
    missing: { Icon: SearchX, chip: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200' },
} as const

const COPY: Record<'paid' | 'pending' | 'cod' | 'failed' | 'review', { title: string; body: string }> = {
    paid: {
        title: 'Payment received',
        body: 'Your payment was successful and your order is being processed. You can follow it from My orders.',
    },
    cod: {
        title: 'Order placed',
        body: 'You chose cash on delivery, so you will pay when your order arrives. You can follow it from My orders.',
    },
    pending: {
        title: 'Confirming your payment',
        body: 'We have not received confirmation of your payment yet. This can take a minute. Your order will update on its own, and you can also check My orders.',
    },
    failed: {
        title: 'Payment did not go through',
        body: 'Your order was not paid. If you were charged, call or message us and we will sort it out. Otherwise you can try again from My orders while the order is still open.',
    },
    review: {
        title: 'We are reviewing your payment',
        body: 'Your payment needs a manual check before the order can continue. Please call or message us so we can help.',
    },
}

function mapStatus(status: string, orders: OrderRef[]): 'paid' | 'pending' | 'cod' | 'failed' | 'review' {
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
                    const refs: OrderRef[] = [{ id: order.id, orderStatus: order.order_status, paymentStatus: order.payment_status }]
                    const kind =
                        order.payment_status === 'paid' || order.payment_status === 'partially_refunded'
                            ? 'paid'
                            : order.order_status === 'Cancelled'
                              ? 'failed'
                              : 'pending'
                    setView({ kind, orders: refs })
                    return
                }

                const stored = recallCheckout()
                const known = stored && (stored.checkout_id === sessionParam || stored.reference === referenceParam) ? stored : null
                if (known && known.status === 'cod') {
                    setView({ kind: 'cod', orders: known.orders.filter((o) => o.id).map((o) => ({ id: String(o.id) })) })
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
                    orderStatus: o.order_status,
                    paymentStatus: o.payment_status,
                }))
                setView({ kind: mapStatus(verified.status, refs), orders: refs })
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
            <div role="status" aria-label="Checking your order" className={`${CARD} flex flex-col items-center gap-3 px-4 py-10 text-center`}>
                <Spinner className="h-8 w-8 text-primary-700 dark:text-primary-400" />
                <p className="text-sm text-zinc-700 dark:text-zinc-300">Checking your order…</p>
            </div>
        )
    } else if (!hasTarget || view.kind === 'missing') {
        const { Icon, chip } = TONE.missing
        content = (
            <Panel icon={<Icon className="h-7 w-7" aria-hidden="true" />} chip={chip} title="Nothing to show here">
                <p>This page confirms an order after checkout. Open My orders to see your orders.</p>
                <Actions>
                    <Link href="/account/orders" className={BTN_PRIMARY}>View my orders</Link>
                    <Link href="/products" className={BTN_SECONDARY}>Continue shopping</Link>
                </Actions>
            </Panel>
        )
    } else if (!isAuthenticated) {
        const { Icon, chip } = TONE.missing
        content = (
            <Panel icon={<Icon className="h-7 w-7" aria-hidden="true" />} chip={chip} title="Sign in to see your order">
                <p>Sign in with the account you used at checkout to see its status.</p>
                <Actions>
                    <button type="button" onClick={() => tryOpenAuthModalFromBridge('login')} className={BTN_PRIMARY}>
                        Sign in to continue
                    </button>
                    <Link href="/products" className={BTN_SECONDARY}>Continue shopping</Link>
                </Actions>
            </Panel>
        )
    } else if (view.kind === 'error') {
        const { Icon, chip } = TONE.error
        content = (
            <Panel icon={<Icon className="h-7 w-7" aria-hidden="true" />} chip={chip} title="We couldn’t check your order">
                <p role="alert">{view.message}</p>
                {view.unavailable ? <OrderingUnavailable className="mt-3 text-left" /> : null}
                <Actions>
                    <button type="button" onClick={() => setTick((t) => t + 1)} disabled={checking} className={BTN_PRIMARY}>
                        {checking ? <Spinner /> : null}
                        Try again
                    </button>
                    <Link href="/account/orders" className={BTN_SECONDARY}>View my orders</Link>
                </Actions>
            </Panel>
        )
    } else if (view.kind !== 'loading') {
        const copy = COPY[view.kind]
        const { Icon, chip } = TONE[view.kind]
        content = (
            <Panel icon={<Icon className="h-7 w-7" aria-hidden="true" />} chip={chip} title={copy.title}>
                <p>{copy.body}</p>
                {view.kind === 'pending' && !pollingExhausted ? (
                    <p className="mt-2 flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <Spinner /> Checking again…
                    </p>
                ) : null}
                {view.orders.length > 0 ? (
                    <div className="mt-4 text-left">
                        <h2 className="mb-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {view.orders.length === 1 ? 'Order' : 'Orders'}
                        </h2>
                        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                            {view.orders.map((o) => (
                                <li key={o.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm">
                                    <Link
                                        href={`/account/orders/${encodeURIComponent(o.id)}`}
                                        className={`break-all font-mono text-xs text-primary-700 hover:underline dark:text-primary-400 ${FOCUS}`}
                                    >
                                        {o.id}
                                    </Link>
                                    {o.orderStatus || o.paymentStatus ? (
                                        <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                            {[o.orderStatus, o.paymentStatus].filter(Boolean).join(' · ')}
                                        </span>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
                {view.kind === 'failed' || view.kind === 'review' ? (
                    <p className="mt-3 text-sm">
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
                        .
                    </p>
                ) : null}
                <Actions>
                    {view.kind === 'pending' ? (
                        <button
                            type="button"
                            onClick={() => {
                                pollsRef.current = 0
                                setTick((t) => t + 1)
                            }}
                            disabled={checking}
                            className={BTN_PRIMARY}
                        >
                            {checking ? <Spinner /> : null}
                            Check again
                        </button>
                    ) : null}
                    <Link href="/account/orders" className={view.kind === 'pending' ? BTN_SECONDARY : BTN_PRIMARY}>
                        View my orders
                    </Link>
                    <Link href="/products" className={BTN_SECONDARY}>
                        Continue shopping
                    </Link>
                </Actions>
            </Panel>
        )
    }

    return (
        <MainLayout>
            <div className="min-h-[60vh] bg-zinc-100 dark:bg-zinc-950">
                <div className="mx-auto max-w-2xl px-3 py-6 sm:px-4 lg:py-10">{content}</div>
            </div>
        </MainLayout>
    )
}

function Panel({ icon, chip, title, children }: { icon: React.ReactNode; chip: string; title: string; children: React.ReactNode }) {
    return (
        <div className={`${CARD} px-4 py-6 text-center text-sm text-zinc-700 dark:text-zinc-300 sm:px-6 sm:py-8`} aria-live="polite">
            <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${chip}`}>{icon}</span>
            <h1 className="mt-3 font-syne text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">{title}</h1>
            <div className="mx-auto mt-2 max-w-md">{children}</div>
        </div>
    )
}

function Actions({ children }: { children: React.ReactNode }) {
    return <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">{children}</div>
}
