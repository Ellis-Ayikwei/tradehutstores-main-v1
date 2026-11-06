'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useDispatch } from 'react-redux'
import useSWR from 'swr'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { ArrowLeft } from 'lucide-react'
import type { AppDispatch } from '@/store'
import { setCheckoutId, setCheckoutStatus } from '@/store/checkoutSlice'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useStoreConfig } from '@/contexts/StoreConfigContext'
import { Countdown } from '@/components/common/marketplace'
import { useServerClock } from '@/hooks/useServerClock'
import { tryOpenAuthModalFromBridge } from '@/lib/authModalBridge'
import { addressOneLine, listAddresses } from '@/lib/addressesApi'
import type { Address } from '@/lib/addressesApi'
import {
    clearIdempotencyKey,
    fingerprintOf,
    idempotencyKeyFor,
    isSafeRedirect,
    loadPromoCode,
    markCartForClearing,
    moneyToNumber,
    payOrder,
    placeCheckout,
    quoteCheckout,
    rememberCheckout,
    savePromoCode,
    startPayment,
    toCheckoutError,
} from '@/lib/checkoutApi'
import type { CheckoutBody, CheckoutResult, PaymentMethodId, QuoteBody, QuoteSummary } from '@/lib/checkoutApi'
import MainLayout from '@/components/Layouts/MainLayout'
import AddressSection from './AddressSection'
import DeliverySection from './DeliverySection'
import PaymentSection, { PAYMENT_LABEL } from './PaymentSection'
import ReviewList from './ReviewList'
import StepSection from './StepSection'
import PromoField from './PromoField'
import { CheckoutSkeleton, EmptyCheckout, LoadError, SignInGate } from './Gates'
import { DesktopSummary, MobileStickyBar, MobileSummaryBar } from './SummaryParts'
import type { PlaceModel, SummaryModel } from './SummaryParts'
import { Banner, BTN_PRIMARY, FOCUS, OrderingUnavailable } from './ui'
import { describeCheckoutError, isClientRejection } from './checkoutErrors'
import type { DescribedError } from './checkoutErrors'
import { safeAmount } from './Money'
import { useCheckoutLines } from './useCheckoutLines'
import type { CheckoutMode } from './types'

type QuoteState = 'idle' | 'loading' | 'ready' | 'error'

interface Notice {
    tone: 'error' | 'warning'
    text: string
    source: 'quote' | 'place'
    retry?: () => void
}

const GATEWAY_COD_IDS = ['cod', 'cash_on_delivery', 'cash-on-delivery', 'cashondelivery']

/** A zero from an order that has not been priced yet is "unknown", not "free". */
const positive = (n: number | null) => (n !== null && n > 0 ? n : null)

export default function CheckoutClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const dispatch = useDispatch<AppDispatch>()
    const isAuthenticated = useIsAuthenticated()
    const { config, loading: configLoading, ready: configReady } = useStoreConfig()
    const { formatDisplayPrice, currency } = useCurrency()
    const { offsetMs } = useServerClock()

    const [hydrated, setHydrated] = useState(false)
    useEffect(() => setHydrated(true), [])
    const authed = hydrated && isAuthenticated

    // ── Mode from the URL ────────────────────────────────────────────────────
    const orderId = searchParams.get('order')
    const productId = searchParams.get('product')
    const variantParam = searchParams.get('variant')
    const qtyParam = searchParams.get('qty')
    const buyNowFlag = searchParams.get('buyNow') === '1' || searchParams.get('buyNow') === 'true'
    const mode: CheckoutMode = orderId ? 'order' : buyNowFlag && productId ? 'buynow' : 'cart'

    const {
        status: linesStatus,
        error: linesError,
        lines,
        order,
        reload: reloadLines,
    } = useCheckoutLines({ mode, productId, variantId: variantParam, qtyParam, orderId, authed, hydrated })

    // ── Saved addresses (real API) ───────────────────────────────────────────
    const {
        data: addresses,
        error: addressesError,
        isLoading: addressesLoading,
        mutate: mutateAddresses,
    } = useSWR<Address[]>(authed ? 'addresses' : null, listAddresses, { revalidateOnFocus: false })

    // ── Store config: delivery + payment ─────────────────────────────────────
    const methods = useMemo(() => (config?.shipping_methods ?? []).filter((m) => m.enabled), [config])
    const gatewayIds = useMemo(
        () => (config?.payments_enabled_gateways ?? []).map((g) => String(g.id).toLowerCase()),
        [config]
    )
    const paystackEnabled = gatewayIds.includes('paystack')
    const codEnabled = gatewayIds.some((id) => GATEWAY_COD_IDS.includes(id))
    const onlineOnly = mode === 'order'
    const availablePayments = useMemo<PaymentMethodId[]>(() => {
        const out: PaymentMethodId[] = []
        if (paystackEnabled) out.push('paystack')
        if (codEnabled && !onlineOnly) out.push('cod')
        return out
    }, [paystackEnabled, codEnabled, onlineOnly])

    // ── Selections ───────────────────────────────────────────────────────────
    const [addressId, setAddressId] = useState<string | null>(null)
    const [rejectedAddressId, setRejectedAddressId] = useState<string | null>(null)
    const [methodId, setMethodId] = useState<string | null>(null)
    const [rejectedMethodIds, setRejectedMethodIds] = useState<string[]>([])
    const [paymentId, setPaymentId] = useState<PaymentMethodId | null>(null)
    const [promoCode, setPromoCode] = useState<string | null>(null)
    const [openStep, setOpenStep] = useState<number | null>(null)

    useEffect(() => {
        if (mode !== 'order') setPromoCode(loadPromoCode())
    }, [mode])

    // Default address preselected; keep the selection valid when the list changes.
    useEffect(() => {
        if (!addresses || addresses.length === 0) return
        if (addressId && addresses.some((a) => a.id === addressId)) return
        if (addressId === null && rejectedAddressId) return
        setAddressId((addresses.find((a) => a.is_default) ?? addresses[0]).id)
    }, [addresses, addressId, rejectedAddressId])

    useEffect(() => {
        if (methods.length === 0) {
            if (methodId !== null) setMethodId(null)
            return
        }
        if (methodId && methods.some((m) => m.id === methodId)) return
        const next = methods.find((m) => !rejectedMethodIds.includes(m.id))
        setMethodId(next ? next.id : null)
    }, [methods, methodId, rejectedMethodIds])

    useEffect(() => {
        if (paymentId && availablePayments.includes(paymentId)) return
        setPaymentId(availablePayments.length === 1 ? availablePayments[0] : null)
    }, [availablePayments, paymentId])

    const address = addresses?.find((a) => a.id === addressId) ?? null
    const method = methods.find((m) => m.id === methodId) ?? null
    const deliveryMethodForApi = methods.length > 0 ? methodId : null

    // ── Step completion ──────────────────────────────────────────────────────
    const done1 = Boolean(address)
    const done2 = !configLoading && (methods.length === 0 || Boolean(method))
    const done3 = Boolean(paymentId)
    const done4 = lines.length > 0
    const firstIncomplete = !done1 ? 1 : !done2 ? 2 : !done3 ? 3 : 4
    const activeStep = openStep ?? firstIncomplete
    const advance = () => setOpenStep(null)

    // ── Quote (P2) ───────────────────────────────────────────────────────────
    const allHaveVariants = lines.length > 0 && lines.every((l) => Boolean(l.variantId))
    const quoteBody = useMemo<QuoteBody | null>(() => {
        if (mode === 'order' || !authed || !allHaveVariants || !addressId) return null
        return {
            items: lines.map((l) => ({ variant_id: l.variantId as string, quantity: l.quantity })),
            address_id: addressId,
            ...(deliveryMethodForApi ? { delivery_method: deliveryMethodForApi } : {}),
            ...(promoCode ? { promo_code: promoCode } : {}),
        }
    }, [mode, authed, allHaveVariants, addressId, lines, deliveryMethodForApi, promoCode])
    const quoteKey = quoteBody ? JSON.stringify(quoteBody) : ''
    const quoteBodyRef = useRef(quoteBody)
    quoteBodyRef.current = quoteBody

    const [quote, setQuote] = useState<QuoteSummary | null>(null)
    const [quoteState, setQuoteState] = useState<QuoteState>('idle')
    const [retryTick, setRetryTick] = useState(0)
    const [backendDown, setBackendDown] = useState(false)
    const [notice, setNotice] = useState<Notice | null>(null)
    const [lineIssues, setLineIssues] = useState<Record<string, string>>({})
    const [priceChange, setPriceChange] = useState<{ from: number | null; to: number | null } | null>(null)
    const [pendingPayment, setPendingPayment] = useState<{ checkoutId: string; message: string } | null>(null)
    const noticeRef = useRef<HTMLDivElement | null>(null)

    const openSignIn = useCallback(() => {
        if (!tryOpenAuthModalFromBridge('login')) {
            window.location.assign('/auth/login')
        }
    }, [])

    const applyDescribed = useCallback(
        (d: DescribedError, source: 'quote' | 'place') => {
            const show = (tone: Notice['tone'], text: string, retry?: () => void) =>
                setNotice({ tone, text, source, retry })
            switch (d.kind) {
                case 'unavailable':
                    setBackendDown(true)
                    break
                case 'auth':
                    show('warning', d.message)
                    openSignIn()
                    break
                case 'stock':
                case 'listing': {
                    const vid = d.variantId
                    if (vid) {
                        const text =
                            d.kind === 'stock'
                                ? d.available && d.available > 0
                                    ? `Only ${d.available} available. Update the quantity in your cart.`
                                    : 'Out of stock. Remove this item to continue.'
                                : 'No longer available. Remove this item to continue.'
                        setLineIssues((prev) => ({ ...prev, [vid]: text }))
                    }
                    show('error', d.message)
                    setOpenStep(4)
                    break
                }
                case 'promo':
                    setPromoCode(null)
                    savePromoCode(null)
                    show('warning', `Promo code removed: ${d.message}`)
                    break
                case 'delivery':
                    if (methodId) setRejectedMethodIds((prev) => [...prev, methodId])
                    setMethodId(null)
                    setOpenStep(2)
                    show('error', d.message)
                    break
                case 'payment_method':
                    setPaymentId(null)
                    setOpenStep(3)
                    show('error', d.message)
                    break
                case 'address':
                    setRejectedAddressId(addressId)
                    setAddressId(null)
                    setOpenStep(1)
                    show('error', d.message)
                    break
                case 'price_changed':
                    if (d.quote) {
                        setPriceChange({ from: quote?.total ?? null, to: d.quote.total })
                        setQuote(d.quote)
                        setQuoteState('ready')
                    }
                    show('warning', d.message)
                    break
                case 'server':
                case 'rate_limited':
                    show('error', d.message, source === 'quote' ? () => setRetryTick((t) => t + 1) : undefined)
                    break
                default:
                    show('error', d.message, source === 'quote' ? () => setRetryTick((t) => t + 1) : undefined)
            }
        },
        [openSignIn, methodId, addressId, quote]
    )
    const applyDescribedRef = useRef(applyDescribed)
    applyDescribedRef.current = applyDescribed

    useEffect(() => {
        const body = quoteBodyRef.current
        if (!quoteKey || !body) {
            setQuote(null)
            setQuoteState('idle')
            return
        }
        setQuoteState('loading')
        const controller = new AbortController()
        const timer = window.setTimeout(() => {
            quoteCheckout(body, controller.signal)
                .then((q) => {
                    setQuote(q)
                    setQuoteState('ready')
                    setBackendDown(false)
                    setLineIssues({})
                    setNotice((prev) => (prev?.source === 'quote' ? null : prev))
                })
                .catch((err: unknown) => {
                    const e = toCheckoutError(err)
                    if (e.isAborted) return
                    setQuote(null)
                    setQuoteState('error')
                    applyDescribedRef.current(describeCheckoutError(e), 'quote')
                })
        }, 400)
        return () => {
            window.clearTimeout(timer)
            controller.abort()
        }
    }, [quoteKey, retryTick])

    useEffect(() => {
        if (notice) noticeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }, [notice])

    // ── Place order ──────────────────────────────────────────────────────────
    const placingRef = useRef(false)
    const [placing, setPlacing] = useState(false)
    const [dueExpired, setDueExpired] = useState(false)

    const orderPayable = mode !== 'order' || (order?.order_status === 'Pending' && order?.payment_status === 'unpaid')

    const unlock = () => {
        placingRef.current = false
        setPlacing(false)
    }

    const goToPayment = async (result: CheckoutResult, method: PaymentMethodId) => {
        if (method === 'cod') {
            router.push(`/checkout/complete?session=${encodeURIComponent(result.checkout_id)}`)
            return
        }
        let url = result.payment?.authorization_url
        if (!isSafeRedirect(url)) {
            try {
                const started = await startPayment(result.checkout_id)
                url = started.payment?.authorization_url
            } catch (err) {
                const e = toCheckoutError(err)
                setPendingPayment({
                    checkoutId: result.checkout_id,
                    message: isClientRejection(e)
                        ? describeCheckoutError(e).message
                        : 'We could not open Paystack. Your order is saved and waiting for payment.',
                })
                dispatch(setCheckoutStatus('error'))
                unlock()
                return
            }
        }
        if (isSafeRedirect(url)) {
            window.location.assign(url)
            return
        }
        setPendingPayment({
            checkoutId: result.checkout_id,
            message: result.payment_error || 'We could not open Paystack. Your order is saved and waiting for payment.',
        })
        dispatch(setCheckoutStatus('error'))
        unlock()
    }

    const placeOrder = async () => {
        if (placingRef.current) return
        placingRef.current = true
        setPlacing(true)
        setNotice(null)
        setPriceChange(null)
        dispatch(setCheckoutStatus('processing'))
        const retrying = pendingPayment
        try {
            if (retrying) {
                setPendingPayment(null)
                const started = await startPayment(retrying.checkoutId)
                const url = started.payment?.authorization_url
                if (isSafeRedirect(url)) {
                    window.location.assign(url)
                    return
                }
                setPendingPayment({ checkoutId: retrying.checkoutId, message: 'We could not open Paystack. Please try again.' })
                dispatch(setCheckoutStatus('error'))
                unlock()
                return
            }

            let result: CheckoutResult
            let chosen: PaymentMethodId
            if (mode === 'order' && orderId) {
                if (!addressId) return unlock()
                chosen = 'paystack'
                const body = { address_id: addressId, ...(deliveryMethodForApi ? { delivery_method: deliveryMethodForApi } : {}) }
                const key = idempotencyKeyFor(fingerprintOf(`order:${orderId}`, body))
                result = await payOrder(orderId, body, key)
            } else {
                if (!quoteBody || !paymentId) return unlock()
                chosen = paymentId
                const body: CheckoutBody = {
                    ...quoteBody,
                    payment_method: paymentId,
                    ...(quote?.totalText ? { expected_total: quote.totalText } : {}),
                }
                const key = idempotencyKeyFor(fingerprintOf('cart', body as unknown as Record<string, unknown>))
                result = await placeCheckout(body, key)
            }

            rememberCheckout(result, chosen)
            dispatch(setCheckoutId(result.checkout_id))
            dispatch(setCheckoutStatus('success'))
            if (mode === 'cart') {
                markCartForClearing(lines.map((l) => l.cartLineId).filter((id): id is string => Boolean(id)))
            }
            await goToPayment(result, chosen)
        } catch (err) {
            const e = toCheckoutError(err)
            // A 4xx means the request was rejected: never replay its key.
            if (isClientRejection(e)) clearIdempotencyKey()
            dispatch(setCheckoutStatus('error'))
            if (retrying) {
                const d = describeCheckoutError(e)
                if (d.kind === 'unavailable') setBackendDown(true)
                setPendingPayment({ checkoutId: retrying.checkoutId, message: d.message })
            } else {
                applyDescribed(describeCheckoutError(e), 'place')
            }
            unlock()
        }
    }

    // ── Derived view models ──────────────────────────────────────────────────
    const lineSum = useMemo(() => {
        if (lines.length === 0 || lines.some((l) => l.unit === undefined)) return null
        return lines.reduce((acc, l) => acc + safeAmount(l.unit) * l.quantity, 0)
    }, [lines])
    const itemCount = lines.reduce((acc, l) => acc + l.quantity, 0)

    const summary: SummaryModel = useMemo(() => {
        if (mode === 'order' && order) {
            return {
                itemCount,
                subtotal: moneyToNumber(order.subtotal) ?? lineSum,
                shipping: positive(moneyToNumber(order.shipping_cost ?? order.shipping)),
                tax: positive(moneyToNumber(order.tax_amount ?? order.tax)),
                promo: moneyToNumber(order.promo_discount ?? order.promo),
                total: moneyToNumber(order.total_amount),
                loading: false,
                chargeCurrency: order.currency ?? null,
                displayCurrency: currency,
            }
        }
        return {
            itemCount,
            subtotal: quote?.subtotal ?? lineSum,
            shipping: quote?.shipping ?? null,
            tax: quote?.tax ?? null,
            promo: quote?.promo ?? null,
            total: quote?.total ?? null,
            loading: quoteState === 'loading',
            chargeCurrency: quote?.currency ?? null,
            displayCurrency: currency,
        }
    }, [mode, order, itemCount, lineSum, quote, quoteState, currency])

    let blocker: string | null = null
    if (!authed) blocker = null
    else if (backendDown) blocker = 'Online ordering is unavailable right now.'
    else if (!orderPayable) blocker = 'This order is not waiting for payment.'
    else if (dueExpired) blocker = 'The payment window for this order has passed.'
    else if (!allHaveVariants && mode !== 'order') blocker = 'Some items can’t be ordered online yet.'
    else if (!done1) blocker = 'Choose a delivery address to continue.'
    else if (!done2) blocker = 'Choose a delivery method to continue.'
    else if (!done3) blocker = 'Choose a payment method to continue.'
    else if (mode !== 'order' && quoteState === 'loading') blocker = 'Updating your total…'
    else if (mode !== 'order' && quoteState !== 'ready') blocker = 'We couldn’t price your order yet.'
    else if (Object.keys(lineIssues).length > 0) blocker = 'Fix the highlighted items to continue.'

    const canPlace = pendingPayment
        ? !placing
        : blocker === null && linesStatus === 'ready' && lines.length > 0
    const place: PlaceModel = authed
        ? {
              label: pendingPayment ? 'Retry payment' : mode === 'order' ? 'Pay for this order' : 'Place your order',
              placing,
              canPlace,
              blocker: pendingPayment ? null : blocker,
              onPlace: () => void placeOrder(),
          }
        : { label: 'Sign in to continue', placing: false, canPlace: true, blocker: null, onPlace: openSignIn }

    const hasPromoSlot = mode !== 'order'
    const applyPromo = async (code: string): Promise<string | null> => {
        const normalised = code.trim().toUpperCase()
        if (quoteBody) {
            try {
                await quoteCheckout({ ...quoteBody, promo_code: normalised })
            } catch (err) {
                const e = toCheckoutError(err)
                const d = describeCheckoutError(e)
                if (d.kind === 'unavailable') {
                    setBackendDown(true)
                    return 'Promo codes can’t be checked right now.'
                }
                return d.message
            }
        }
        setPromoCode(normalised)
        savePromoCode(normalised)
        return null
    }
    const promoNode = hasPromoSlot ? (
        <PromoField
            applied={promoCode ? { code: promoCode, note: quote?.promo ? `You save ${formatDisplayPrice(quote.promo)}` : undefined } : null}
            onApply={applyPromo}
            onRemove={() => {
                setPromoCode(null)
                savePromoCode(null)
            }}
            disabled={placing}
        />
    ) : null

    const backHref = mode === 'order' ? '/account/orders' : mode === 'buynow' && productId ? `/products/${productId}` : '/cart'
    const backLabel = mode === 'order' ? 'Back to my orders' : mode === 'buynow' ? 'Back to product' : 'Back to cart'
    const editHref = mode === 'buynow' && productId ? `/products/${productId}` : '/cart'

    const summaryNotices = (
        <>
            {mode === 'order' ? (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Shipping and tax, if any, are confirmed when you continue to payment.
                </p>
            ) : null}
        </>
    )

    // ── Render ───────────────────────────────────────────────────────────────
    const header = (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h1 className="font-syne text-xl font-bold leading-tight text-zinc-900 dark:text-zinc-100 lg:text-2xl">
                {mode === 'order' ? 'Pay for your order' : 'Checkout'}
                {lines.length > 0 ? (
                    <span className="ml-2 text-sm font-normal text-zinc-600 dark:text-zinc-400">
                        ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                    </span>
                ) : null}
            </h1>
            <Link
                href={backHref}
                className={`inline-flex min-h-[44px] items-center gap-1 text-sm text-primary-700 hover:underline dark:text-primary-400 sm:min-h-[32px] ${FOCUS}`}
            >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                {backLabel}
            </Link>
        </div>
    )

    let body: React.ReactNode
    if (!hydrated || (linesStatus === 'loading' && lines.length === 0)) {
        body = <CheckoutSkeleton />
    } else if (!authed && mode === 'order') {
        body = (
            <div className="mx-auto max-w-2xl">
                <SignInGate hasItems={false} />
            </div>
        )
    } else if (linesStatus === 'error') {
        body = (
            <LoadError
                message={linesError ?? 'Something went wrong.'}
                onRetry={mode === 'cart' ? undefined : reloadLines}
                backHref={backHref}
                backLabel={backLabel}
            />
        )
    } else if (lines.length === 0) {
        body = mode === 'cart' ? <EmptyCheckout /> : (
            <LoadError message="There is nothing to check out." backHref={backHref} backLabel={backLabel} />
        )
    } else if (!authed) {
        body = (
            <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4 lg:space-y-0 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-3 lg:space-y-4">
                    <SignInGate hasItems />
                    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:p-4">
                        <h2 className="mb-3 text-base font-bold text-zinc-900 dark:text-zinc-100">Items in your order</h2>
                        <ReviewList lines={lines} mode={mode} formatPrice={formatDisplayPrice} issues={{}} editHref={editHref} />
                    </div>
                </div>
                <DesktopSummary model={summary} place={place} formatPrice={formatDisplayPrice} promo={null} />
                <MobileStickyBar model={summary} place={place} formatPrice={formatDisplayPrice} />
            </div>
        )
    } else {
        body = (
            <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-4 lg:space-y-0 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0 space-y-3 lg:space-y-4">
                    <MobileSummaryBar
                        model={summary}
                        formatPrice={formatDisplayPrice}
                        promo={promoNode}
                        notices={summaryNotices}
                    />

                    <div ref={noticeRef} className="space-y-3 empty:hidden">
                        {backendDown ? <OrderingUnavailable /> : null}
                        {mode === 'order' && order?.payment_due_at && orderPayable ? (
                            <Banner tone={dueExpired ? 'error' : 'warning'}>
                                {dueExpired ? (
                                    <p className="font-semibold">The payment window for this order has passed.</p>
                                ) : (
                                    <p className="font-semibold">
                                        <Countdown
                                            endsAt={order.payment_due_at}
                                            variant="inline"
                                            serverOffsetMs={offsetMs}
                                            label="Payment due in"
                                            endedLabel="Payment window has passed"
                                            onEnd={() => setDueExpired(true)}
                                        />
                                    </p>
                                )}
                            </Banner>
                        ) : null}
                        {mode === 'order' && !orderPayable ? (
                            <Banner tone="warning">
                                <p className="font-semibold">This order is not waiting for payment.</p>
                                <p>
                                    It may already be paid, or it was cancelled.{' '}
                                    <Link href="/account/orders" className="font-semibold underline hover:no-underline">
                                        View my orders
                                    </Link>
                                </p>
                            </Banner>
                        ) : null}
                        {priceChange ? (
                            <Banner tone="warning">
                                <p className="font-semibold">The price changed.</p>
                                <p>
                                    {priceChange.from !== null && priceChange.to !== null
                                        ? `Your total changed from ${formatDisplayPrice(priceChange.from)} to ${formatDisplayPrice(priceChange.to)}. `
                                        : ''}
                                    Review the new total, then place your order again to confirm.
                                </p>
                            </Banner>
                        ) : null}
                        {notice && !priceChange ? (
                            <Banner
                                tone={notice.tone}
                                onDismiss={() => setNotice(null)}
                                action={
                                    notice.retry ? (
                                        <button
                                            type="button"
                                            onClick={notice.retry}
                                            className={`min-h-[44px] shrink-0 rounded-full border border-current px-3 font-semibold sm:min-h-0 sm:py-1 ${FOCUS}`}
                                        >
                                            Retry
                                        </button>
                                    ) : undefined
                                }
                            >
                                <p>{notice.text}</p>
                            </Banner>
                        ) : null}
                        {pendingPayment ? (
                            <Banner tone="warning">
                                <p className="font-semibold">Your order is saved but not paid yet.</p>
                                <p>{pendingPayment.message}</p>
                                <button type="button" onClick={() => void placeOrder()} disabled={placing} className={`${BTN_PRIMARY} mt-1 h-11`}>
                                    Retry payment
                                </button>
                            </Banner>
                        ) : null}
                    </div>

                    <StepSection
                        number={1}
                        title="Delivery address"
                        open={activeStep === 1}
                        complete={done1}
                        summary={address ? addressOneLine(address) : undefined}
                        onChange={() => setOpenStep(1)}
                    >
                        <AddressSection
                            addresses={addresses}
                            loading={addressesLoading}
                            error={Boolean(addressesError)}
                            onRetry={() => void mutateAddresses()}
                            selectedId={addressId}
                            onSelect={(id) => {
                                setAddressId(id)
                                setRejectedAddressId(null)
                            }}
                            rejectedId={rejectedAddressId}
                            onCreated={(created) => {
                                void mutateAddresses((current) => [created, ...(current ?? [])], { revalidate: true })
                                setAddressId(created.id)
                                setRejectedAddressId(null)
                                advance()
                            }}
                            onContinue={advance}
                        />
                    </StepSection>

                    <StepSection
                        number={2}
                        title="Delivery method"
                        open={activeStep === 2}
                        complete={done2}
                        summary={
                            method
                                ? [
                                      method.name,
                                      safeAmount(method.rate) > 0 ? formatDisplayPrice(safeAmount(method.rate)) : 'Free',
                                      method.transit,
                                  ]
                                      .filter(Boolean)
                                      .join(' · ')
                                : 'Delivery options are confirmed at checkout'
                        }
                        onChange={() => setOpenStep(2)}
                    >
                        <DeliverySection
                            methods={methods}
                            configLoading={configLoading}
                            selectedId={methodId}
                            onSelect={setMethodId}
                            onContinue={advance}
                            formatPrice={formatDisplayPrice}
                        />
                    </StepSection>

                    <StepSection
                        number={3}
                        title="Payment method"
                        open={activeStep === 3}
                        complete={done3}
                        summary={paymentId ? PAYMENT_LABEL[paymentId] : undefined}
                        onChange={() => setOpenStep(3)}
                    >
                        <PaymentSection
                            paystack={paystackEnabled}
                            cod={codEnabled}
                            configLoading={configLoading}
                            configReady={configReady}
                            onlineOnly={onlineOnly}
                            selected={paymentId}
                            onSelect={setPaymentId}
                            onContinue={advance}
                        />
                    </StepSection>

                    <StepSection
                        number={4}
                        title={mode === 'order' ? 'Review order' : 'Review items'}
                        open={activeStep === 4}
                        complete={done4}
                        summary={`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
                        changeLabel="View items"
                        onChange={() => setOpenStep(4)}
                    >
                        <ReviewList lines={lines} mode={mode} formatPrice={formatDisplayPrice} issues={lineIssues} editHref={editHref} />
                    </StepSection>
                </div>

                <DesktopSummary
                    model={summary}
                    place={place}
                    formatPrice={formatDisplayPrice}
                    promo={promoNode}
                    notices={summaryNotices}
                />
                <MobileStickyBar model={summary} place={place} formatPrice={formatDisplayPrice} />
            </div>
        )
    }

    return (
        <MainLayout>
            <div className="min-h-[60vh] bg-zinc-100 dark:bg-zinc-950">
                <div className="mx-auto max-w-[1440px] px-3 py-3 pb-32 sm:px-4 lg:px-6 lg:py-4 lg:pb-6">
                    {header}
                    {body}
                </div>
            </div>
        </MainLayout>
    )
}

