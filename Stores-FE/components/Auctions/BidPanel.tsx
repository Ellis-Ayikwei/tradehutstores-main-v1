'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, Gavel, Loader2, ShieldCheck, X } from 'lucide-react'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { PriceTag } from '@/components/common/marketplace'
import { parseIso } from '@/hooks/useServerClock'
import { tryOpenAuthModalFromBridge } from '@/lib/authModalBridge'
import {
    bidCountLabel,
    buyNow,
    centsToAmount,
    describeSeconds,
    formatMoney,
    isBiddable,
    numberOf,
    parseAmountInput,
    placeBid,
    toApiError,
    toCents,
    type AuctionState,
} from '@/lib/auctionsApi'
import Countdown from './Countdown'
import { useDialogA11y } from './useDialogA11y'
import WatchButton from './WatchButton'

/** What the bid UI needs: the polled state plus two static fields from the detail response. */
export type BidAuction = AuctionState & { title: string; soft_close_seconds: number }

const FOCUS =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-zinc-900'

function newKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    // crypto.randomUUID needs a secure context; fall back for plain-http dev hosts.
    const b = new Uint8Array(16)
    crypto.getRandomValues(b)
    b[6] = (b[6] & 0x0f) | 0x40
    b[8] = (b[8] & 0x3f) | 0x80
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function currencySymbol(currency: string): string {
    try {
        const part = new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
            .formatToParts(0)
            .find(p => p.type === 'currency')
        return part?.value ?? currency
    } catch {
        return currency
    }
}

function formatDateTime(iso: string): string {
    const t = parseIso(iso)
    if (!Number.isFinite(t)) return ''
    return new Date(t).toLocaleString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// ---------------------------------------------------------------------------
// Status banner (solid colours, clear text)
// ---------------------------------------------------------------------------

export function StatusBanner({ auction }: { auction: BidAuction }) {
    const { display_status: status, my_status: mine, currency } = auction
    const price = auction.current_price

    let tone = ''
    let icon: ReactNode = null
    let text: ReactNode = null
    let action: ReactNode = null

    if (status === 'cancelled') {
        tone = 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
        text = 'This auction was cancelled by the seller.'
    } else if (mine === 'won') {
        tone = 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        icon = <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        text = (
            <>
                You won this auction at <strong>{formatMoney(price, currency)}</strong>.
            </>
        )
        action = auction.order_id ? (
            <span className="flex flex-col items-start gap-1 sm:items-end">
                <Link
                    href={`/checkout?order=${encodeURIComponent(auction.order_id)}`}
                    className={`inline-flex h-11 items-center justify-center rounded-full bg-green-800 px-4 text-sm font-semibold text-white hover:bg-green-900 dark:bg-green-100 dark:text-green-900 dark:hover:bg-white ${FOCUS}`}
                >
                    Pay now
                </Link>
                {auction.payment_due_at ? (
                    <span className="text-xs">
                        <Countdown to={auction.payment_due_at} label="Pay within" endedLabel="Payment overdue" urgentColor={false} className="!text-green-800 dark:!text-green-100 [&>span:first-child]:!text-inherit" />
                    </span>
                ) : null}
            </span>
        ) : (
            <span className="text-sm">Your order is being prepared.</span>
        )
    } else if (mine === 'lost') {
        tone = 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
        text =
            auction.result === 'reserve_not_met'
                ? 'This auction ended without meeting the reserve price.'
                : 'This auction has ended. You did not win.'
    } else if (mine === 'winning') {
        tone = 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100'
        icon = <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
        text = (
            <>
                You are the highest bidder at <strong>{formatMoney(price, currency)}</strong>.
            </>
        )
    } else if (mine === 'outbid') {
        tone = 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-100'
        icon = <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
        text = (
            <>
                You have been outbid. Current bid is <strong>{formatMoney(price, currency)}</strong>.
            </>
        )
    } else if (status === 'ended') {
        tone = 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
        text =
            auction.result === 'no_bids'
                ? 'This auction ended with no bids.'
                : auction.result === 'reserve_not_met'
                  ? 'This auction ended without meeting the reserve price.'
                  : 'This auction has ended.'
    } else {
        return null
    }

    return (
        <div role="status" className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md px-3 py-2.5 text-sm leading-snug ${tone}`}>
            {icon}
            <p className="min-w-0 flex-1">{text}</p>
            {action}
        </div>
    )
}

// ---------------------------------------------------------------------------
// Price + time
// ---------------------------------------------------------------------------

export function PriceBlock({ auction, size = 'lg' }: { auction: BidAuction; size?: 'md' | 'lg' }) {
    const hasBids = auction.current_price !== null
    const finished = auction.display_status === 'ended'
    const sold = finished && (auction.result === 'sold' || auction.result === 'bought_now')
    const label = sold ? 'Winning bid' : hasBids ? 'Current bid' : 'Starting bid'
    const shown = numberOf(hasBids ? auction.current_price : auction.starting_price)

    return (
        <div>
            <p className="text-xs leading-4 text-zinc-600 dark:text-zinc-400">{label}</p>
            <PriceTag price={shown} currencyCode={auction.currency} size={size} />
            <p className="mt-1 text-xs leading-4 text-zinc-600 dark:text-zinc-400">
                {bidCountLabel(auction.bid_count)}
                {auction.reserve_met === true ? <span className="font-semibold text-emerald-700 dark:text-emerald-400"> &middot; Reserve met</span> : null}
                {auction.reserve_met === false ? <span> &middot; Reserve not met</span> : null}
            </p>
            {auction.my_highest_bid ? (
                <p className="mt-0.5 text-xs leading-4 text-zinc-700 dark:text-zinc-300">
                    Your highest bid: <strong className="text-zinc-900 dark:text-zinc-100">{formatMoney(auction.my_highest_bid, auction.currency)}</strong>
                </p>
            ) : null}
        </div>
    )
}

export function TimeBlock({ auction, onEnd }: { auction: BidAuction; onEnd: () => void }) {
    const status = auction.display_status
    const prevEnds = useRef(auction.ends_at)
    const [extended, setExtended] = useState(false)

    // Anti-snipe: ends_at moving later means a late bid extended the auction.
    useEffect(() => {
        const prev = parseIso(prevEnds.current)
        const cur = parseIso(auction.ends_at)
        prevEnds.current = auction.ends_at
        if (Number.isFinite(prev) && cur > prev) {
            setExtended(true)
            const t = setTimeout(() => setExtended(false), 10000)
            return () => clearTimeout(t)
        }
        setExtended(false)
    }, [auction.ends_at])

    const scheduled = status === 'scheduled'
    const soft = auction.soft_close_seconds
    const note = extended
        ? 'A late bid extended the closing time.'
        : isBiddable(status) && soft > 0
          ? `A bid in the last ${describeSeconds(soft)} extends the auction.`
          : ''

    return (
        <div
            className={`rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 ring-2 transition-shadow duration-500 dark:border-zinc-700 dark:bg-zinc-800 ${extended ? 'ring-amber-500' : 'ring-white dark:ring-zinc-900'}`}
        >
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{scheduled ? 'Starts in' : 'Time left'}</span>
                <Countdown
                    to={scheduled ? auction.starts_at : auction.ends_at}
                    onEnd={onEnd}
                    endedLabel={status === 'cancelled' ? 'Cancelled' : scheduled ? 'Starting' : 'Ended'}
                    className="text-lg"
                />
            </div>
            <p className="mt-0.5 min-h-[1rem] text-[11px] leading-4 text-zinc-600 dark:text-zinc-400" aria-live="polite">
                {isBiddable(status) || scheduled
                    ? `${scheduled ? 'Starts' : 'Ends'} ${formatDateTime(scheduled ? auction.starts_at : auction.ends_at)}`
                    : ''}
            </p>
            <p className={`min-h-[1rem] text-[11px] leading-4 ${extended ? 'font-semibold text-amber-800 dark:text-amber-300' : 'text-zinc-600 dark:text-zinc-400'}`} aria-live="polite">
                {note}
            </p>
        </div>
    )
}

// ---------------------------------------------------------------------------
// Bid form
// ---------------------------------------------------------------------------

interface FormMessage {
    text: string
    verify?: boolean
}

interface BidFormProps {
    auction: BidAuction
    onState: (state: AuctionState) => void
    onRefresh: () => void
    /** Called after an accepted bid (the sheet closes itself here). */
    onPlaced?: () => void
}

export function BidForm({ auction, onState, onRefresh, onPlaced }: BidFormProps) {
    const isAuthenticated = useIsAuthenticated()
    const { currency } = auction
    const minCents = toCents(auction.next_min_bid) ?? 0
    const incCents = Math.max(1, toCents(auction.min_increment) ?? 1)
    const symbol = currencySymbol(currency)

    const [amount, setAmount] = useState(() => centsToAmount(minCents))
    const dirty = useRef(false)
    const prevMin = useRef(minCents)
    const [submitting, setSubmitting] = useState(false)
    const [confirmBuy, setConfirmBuy] = useState(false)
    const [message, setMessage] = useState<FormMessage | null>(null)
    const [success, setSuccess] = useState<ReactNode>(null)
    const bidAttempt = useRef<{ amount: string; key: string } | null>(null)
    const buyAttempt = useRef<string | null>(null)

    // Someone else's bid raised the minimum: follow it unless the user already typed something higher.
    useEffect(() => {
        if (prevMin.current === minCents) return
        prevMin.current = minCents
        setAmount(cur => {
            const c = parseAmountInput(cur)
            return !dirty.current || c === null || c < minCents ? centsToAmount(minCents) : cur
        })
    }, [minCents])

    const handleError = useCallback(
        (err: unknown, kind: 'bid' | 'buy') => {
            const e = toApiError(err)
            const code = e.code ?? ''
            if (e.status === 401) {
                tryOpenAuthModalFromBridge('login')
                setMessage({ text: 'Sign in to place a bid.' })
                return
            }
            if (['bid_too_low', 'below_min', 'outbid'].includes(code)) {
                const raw = e.extra.min_next_bid
                const next = toCents(typeof raw === 'string' || typeof raw === 'number' ? raw : auction.next_min_bid) ?? minCents
                bidAttempt.current = null
                dirty.current = false
                setAmount(centsToAmount(next))
                setMessage({ text: `Your bid was too low or someone bid first. The minimum bid is now ${formatMoney(centsToAmount(next), currency)}.` })
                onRefresh()
                return
            }
            if (['auction_not_live', 'ended'].includes(code)) {
                setMessage({ text: 'This auction is no longer accepting bids.' })
                onRefresh()
                return
            }
            if (['seller_cannot_bid', 'own_auction'].includes(code)) {
                setMessage({ text: 'You cannot bid on your own auction.' })
                return
            }
            if (['bidder_not_verified', 'not_verified'].includes(code)) {
                setMessage({ text: 'Verify your account before you can bid.', verify: true })
                return
            }
            if (code === 'already_winning') {
                setMessage({ text: 'You are already the highest bidder.' })
                onRefresh()
                return
            }
            if (code === 'buy_now_unavailable') {
                setMessage({ text: 'Buy now is no longer available because a bid has been placed.' })
                onRefresh()
                return
            }
            if (code === 'idempotency_key_mismatch') {
                bidAttempt.current = null
                buyAttempt.current = null
                setMessage({ text: 'That attempt could not be matched. Please try again.' })
                return
            }
            if (code === 'invalid_amount') {
                setMessage({ text: 'Enter a valid amount with up to 2 decimal places.' })
                return
            }
            if (e.status === 404) {
                setMessage({ text: 'This auction is no longer available.' })
                return
            }
            if (e.status === 429) {
                setMessage({ text: 'Too many bids in a short time. Wait a few seconds and try again.' })
                return
            }
            // Network error or 5xx: the request may or may not have landed. The same key is reused on retry,
            // so pressing the button again is safe and cannot place a second bid.
            setMessage({
                text: e.isNetwork
                    ? 'No connection. Your bid was not confirmed. Check your connection and try again.'
                    : kind === 'bid'
                      ? 'We could not place your bid. Try again.'
                      : 'We could not complete the purchase. Try again.',
            })
            onRefresh()
        },
        [auction.next_min_bid, currency, minCents, onRefresh]
    )

    const submitBid = async () => {
        setMessage(null)
        setSuccess(null)
        if (!isAuthenticated) {
            tryOpenAuthModalFromBridge('login')
            setMessage({ text: 'Sign in to place a bid.' })
            return
        }
        const cents = parseAmountInput(amount)
        if (cents === null) {
            setMessage({ text: 'Enter a valid amount, for example 125.00.' })
            return
        }
        if (cents < minCents) {
            setMessage({ text: `Your bid must be at least ${formatMoney(centsToAmount(minCents), currency)}.` })
            return
        }
        const amountStr = centsToAmount(cents)
        if (!bidAttempt.current || bidAttempt.current.amount !== amountStr) {
            bidAttempt.current = { amount: amountStr, key: newKey() }
        }
        setSubmitting(true)
        try {
            const res = await placeBid(auction.id, amountStr, bidAttempt.current.key)
            bidAttempt.current = null
            dirty.current = false
            onState(res.state)
            setAmount(centsToAmount(toCents(res.state.next_min_bid) ?? minCents))
            setSuccess(`Bid placed: ${formatMoney(res.bid.amount, currency)}`)
            onPlaced?.()
        } catch (err) {
            handleError(err, 'bid')
        } finally {
            setSubmitting(false)
        }
    }

    const submitBuyNow = async () => {
        setMessage(null)
        setSuccess(null)
        if (!isAuthenticated) {
            tryOpenAuthModalFromBridge('login')
            setMessage({ text: 'Sign in to buy this item.' })
            setConfirmBuy(false)
            return
        }
        if (!buyAttempt.current) buyAttempt.current = newKey()
        setSubmitting(true)
        try {
            const res = await buyNow(auction.id, buyAttempt.current)
            buyAttempt.current = null
            setConfirmBuy(false)
            onState(res.state)
            setSuccess(
                <>
                    Purchase complete.{' '}
                    <Link href={`/checkout?order=${encodeURIComponent(res.order_id)}`} className="font-semibold underline">
                        Pay now
                    </Link>
                </>
            )
            onPlaced?.()
        } catch (err) {
            setConfirmBuy(false)
            handleError(err, 'buy')
        } finally {
            setSubmitting(false)
        }
    }

    const status = auction.display_status
    if (status === 'scheduled') {
        return <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">Bidding opens when the auction starts.</p>
    }
    if (!isBiddable(status)) {
        return null
    }

    const winning = auction.my_status === 'winning'
    const chips = [1, 2, 5].map(k => ({ k, cents: minCents + k * incCents }))
    const canBuyNow = auction.buy_now_available && auction.buy_now_price !== null

    return (
        <form
            noValidate
            onSubmit={e => {
                e.preventDefault()
                void submitBid()
            }}
            className="space-y-2.5"
        >
            <div>
                <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor={`bid-amount-${auction.id}`} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Your bid
                    </label>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        Minimum <strong className="text-zinc-900 dark:text-zinc-100">{formatMoney(centsToAmount(minCents), currency)}</strong>
                    </span>
                </div>
                <div className="relative mt-1">
                    <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base font-semibold text-zinc-700 dark:text-zinc-300">
                        {symbol}
                    </span>
                    <input
                        id={`bid-amount-${auction.id}`}
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={amount}
                        disabled={winning || submitting}
                        onChange={e => {
                            dirty.current = true
                            setAmount(e.target.value)
                            setMessage(null)
                        }}
                        aria-describedby={message ? `bid-msg-${auction.id}` : undefined}
                        aria-invalid={message ? true : undefined}
                        className="h-11 w-full rounded-md border border-zinc-300 bg-white pl-10 pr-3 text-base font-semibold tabular-nums text-zinc-900 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700 disabled:bg-zinc-100 disabled:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-primary-400 dark:focus:ring-primary-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400"
                    />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label="Quick bid amounts">
                    {chips.map(({ k, cents }) => (
                        <button
                            key={k}
                            type="button"
                            disabled={winning || submitting}
                            onClick={() => {
                                dirty.current = true
                                setAmount(centsToAmount(cents))
                                setMessage(null)
                            }}
                            aria-label={`Set bid to ${formatMoney(centsToAmount(cents), currency)}`}
                            className={`inline-flex h-11 min-w-[44px] items-center justify-center rounded-full border border-zinc-300 bg-white px-3 text-sm font-semibold tabular-nums text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400 sm:h-9 ${FOCUS}`}
                        >
                            +{formatMoney(centsToAmount(k * incCents), currency)}
                        </button>
                    ))}
                </div>
            </div>

            <div id={`bid-msg-${auction.id}`} aria-live="polite">
                {message ? (
                    <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-900 dark:text-red-100">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <p className="min-w-0 flex-1">
                            {message.text}
                            {message.verify ? (
                                <>
                                    {' '}
                                    <Link href="/account/verification" className="font-semibold underline">
                                        Verify now
                                    </Link>
                                </>
                            ) : null}
                        </p>
                    </div>
                ) : success ? (
                    <p className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900 dark:border-green-800 dark:bg-green-900 dark:text-green-100">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1">{success}</span>
                    </p>
                ) : null}
            </div>

            <button
                type="submit"
                disabled={winning || submitting}
                className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary-700 px-4 text-base font-semibold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-700 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-300 ${FOCUS}`}
            >
                {submitting && !confirmBuy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Gavel className="h-4 w-4" aria-hidden="true" />}
                {winning ? 'You are the highest bidder' : auction.my_status === 'outbid' ? 'Bid again' : 'Place bid'}
            </button>

            {canBuyNow ? (
                confirmBuy ? (
                    <div className="space-y-2 rounded-md border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                        <p className="text-sm text-zinc-900 dark:text-zinc-100">
                            Buy now for <strong>{formatMoney(auction.buy_now_price, currency)}</strong>? This ends the auction and creates your order.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => void submitBuyNow()}
                                className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-700 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-300 ${FOCUS}`}
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                Confirm purchase
                            </button>
                            <button
                                type="button"
                                disabled={submitting}
                                onClick={() => setConfirmBuy(false)}
                                className={`inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 ${FOCUS}`}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                            setMessage(null)
                            setConfirmBuy(true)
                        }}
                        className={`inline-flex h-11 w-full items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-700 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-300 ${FOCUS}`}
                    >
                        Buy now for {formatMoney(auction.buy_now_price, currency)}
                    </button>
                )
            ) : null}
        </form>
    )
}

// ---------------------------------------------------------------------------
// Desktop buy box
// ---------------------------------------------------------------------------

interface BidPanelProps {
    auction: BidAuction
    onState: (state: AuctionState) => void
    onRefresh: () => void
}

export default function BidPanel({ auction, onState, onRefresh }: BidPanelProps) {
    const live = isBiddable(auction.display_status)
    return (
        <section aria-label="Bidding" className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
            <StatusBanner auction={auction} />
            <PriceBlock auction={auction} />
            <TimeBlock auction={auction} onEnd={onRefresh} />
            <BidForm auction={auction} onState={onState} onRefresh={onRefresh} />
            <WatchButton auctionId={auction.id} title={auction.title} isWatching={auction.is_watching} variant="button" />
            {live ? (
                <p className="flex items-start gap-1.5 border-t border-zinc-200 pt-2 text-xs leading-4 text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                    Bids are binding and cannot be retracted. The winner pays through TradeHut checkout.
                </p>
            ) : null}
        </section>
    )
}

// ---------------------------------------------------------------------------
// Mobile: sticky bar + bottom sheet
// ---------------------------------------------------------------------------

export function MobileBidBar({ auction, onOpen }: { auction: BidAuction; onOpen: () => void }) {
    const status = auction.display_status
    const biddable = isBiddable(status)
    const wonUnpaid = auction.my_status === 'won' && auction.order_id
    if (!biddable && status !== 'scheduled' && !wonUnpaid) return null

    const hasBids = auction.current_price !== null
    const winning = auction.my_status === 'winning'

    return (
        <div className="sticky bottom-0 z-40 -mx-3 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-900 sm:-mx-4 lg:hidden">
            <div className="flex h-16 items-center gap-2 px-3 sm:px-4">
                <div className="min-w-0 flex-1">
                    <p className="text-[11px] leading-4 text-zinc-600 dark:text-zinc-400">{wonUnpaid ? 'Winning bid' : hasBids ? 'Current bid' : 'Starting bid'}</p>
                    <PriceTag price={numberOf(hasBids ? auction.current_price : auction.starting_price)} currencyCode={auction.currency} size="sm" />
                </div>
                {biddable ? <WatchButton auctionId={auction.id} title={auction.title} isWatching={auction.is_watching} /> : null}
                {wonUnpaid ? (
                    <Link
                        href={`/checkout?order=${encodeURIComponent(auction.order_id as string)}`}
                        className={`inline-flex h-11 items-center justify-center rounded-full bg-primary-700 px-6 text-sm font-semibold text-white hover:bg-primary-800 ${FOCUS}`}
                    >
                        Pay now
                    </Link>
                ) : (
                    <button
                        type="button"
                        onClick={onOpen}
                        disabled={status === 'scheduled' || winning}
                        className={`inline-flex h-11 min-w-[132px] items-center justify-center gap-2 rounded-full bg-primary-700 px-5 text-sm font-semibold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-700 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-300 ${FOCUS}`}
                    >
                        <Gavel className="h-4 w-4" aria-hidden="true" />
                        {status === 'scheduled' ? 'Not started' : winning ? 'Winning' : auction.my_status === 'outbid' ? 'Bid again' : 'Place bid'}
                    </button>
                )}
            </div>
        </div>
    )
}

export function BidSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
    const closeRef = useRef<HTMLButtonElement>(null)
    const dialogRef = useRef<HTMLDivElement>(null)

    // Focus trap, Escape to close, scroll lock and focus return to the trigger.
    useDialogA11y(open, dialogRef, onClose, closeRef)

    if (!open) return null
    return (
        <div className="lg:hidden">
            <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-[400] bg-black/50" />
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label="Place a bid"
                className="fixed inset-x-0 bottom-0 z-[401] flex max-h-[90vh] flex-col overflow-hidden rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl dark:bg-zinc-900"
            >
                <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-3 py-1 dark:border-zinc-800">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Place a bid</span>
                    <button
                        ref={closeRef}
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className={`flex h-11 w-11 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 ${FOCUS}`}
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="space-y-3 overflow-y-auto p-3">{children}</div>
            </div>
        </div>
    )
}
