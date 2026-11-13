'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Gavel } from 'lucide-react'
import { Notice, StatusBadge, linkClass, type Tone } from '@/components/seller-central/ui'
import type { AuctionDisplayStatus, AuctionResult, AuctionSettlement, AuctionStatus } from '@/lib/seller/auctions'

export const AUCTIONS_HREF = '/seller-central/auctions'
export const NEW_AUCTION_HREF = '/seller-central/auctions/new'
export const auctionHref = (id: string) => `${AUCTIONS_HREF}/${encodeURIComponent(id)}`
export const VERIFICATION_HREF = '/seller-central/settings?tab=verification'
export const orderHref = (id: string) => `/seller-central/orders?id=${encodeURIComponent(id)}`

const DATE_TIME = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function formatDateTime(value?: string | null): string {
    if (!value) return '-'
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? '-' : DATE_TIME.format(d)
}

/** Re-renders on an interval and returns the current time in ms. */
export function useNow(intervalMs: number): number {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
        return () => window.clearInterval(timer)
    }, [intervalMs])
    return now
}

/** `2d 3h`, `3h 20m`, `14m` or `40s` for a span in ms. With `seconds`, always `2d 03h 14m 05s` style. */
export function formatSpan(ms: number, seconds = false): string {
    const total = Math.max(0, Math.floor(ms / 1000))
    const d = Math.floor(total / 86400)
    const h = Math.floor((total % 86400) / 3600)
    const m = Math.floor((total % 3600) / 60)
    const s = total % 60
    if (seconds) return d > 0 ? `${d}d ${h}h ${m}m ${s}s` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`
    if (d > 0) return `${d}d ${h}h`
    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m`
    return `${s}s`
}

/** `in 2d 3h` for the future, `3h 20m ago` for the past. */
export function formatRelative(iso: string, nowMs: number): string {
    const t = new Date(iso).getTime()
    if (Number.isNaN(t)) return '-'
    const diff = t - nowMs
    return diff >= 0 ? `in ${formatSpan(diff)}` : `${formatSpan(-diff)} ago`
}

const STATUS_TONE: Record<AuctionDisplayStatus, Tone> = {
    live: 'success',
    ending_soon: 'warning',
    scheduled: 'info',
    ended: 'neutral',
    cancelled: 'danger',
}

const STATUS_LABEL: Record<AuctionDisplayStatus, string> = {
    live: 'Live',
    ending_soon: 'Ending soon',
    scheduled: 'Upcoming',
    ended: 'Ended',
    cancelled: 'Cancelled',
}

/** An auction past its end time that the closer has not settled yet shows as "Closing". */
export function AuctionStatusBadge({ displayStatus, status }: { displayStatus: AuctionDisplayStatus; status: AuctionStatus }) {
    if (displayStatus === 'ended' && status !== 'ended') return <StatusBadge tone="info">Closing</StatusBadge>
    return <StatusBadge tone={STATUS_TONE[displayStatus] ?? 'neutral'}>{STATUS_LABEL[displayStatus] ?? displayStatus}</StatusBadge>
}

const RESULT_TONE: Record<AuctionResult, Tone> = { sold: 'success', bought_now: 'success', reserve_not_met: 'warning', no_bids: 'neutral' }
const RESULT_LABEL: Record<AuctionResult, string> = { sold: 'Sold', bought_now: 'Bought now', reserve_not_met: 'Reserve not met', no_bids: 'No bids' }

export function ResultBadge({ result }: { result: AuctionResult | null }) {
    if (!result) return null
    return <StatusBadge tone={RESULT_TONE[result]}>{RESULT_LABEL[result]}</StatusBadge>
}

function humanize(value: string): string {
    const s = value.replace(/_/g, ' ').trim()
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

/** Order and payment state of the winner's order. Renders nothing for auctions without a winner. */
export function SettlementBadges({
    orderId,
    orderStatus,
    paymentStatus,
    settlement,
}: {
    orderId: string | null
    orderStatus: string | null
    paymentStatus: string | null
    settlement: AuctionSettlement
}) {
    if (!orderId) {
        return settlement === 'pending_order' ? <StatusBadge tone="info">Creating order</StatusBadge> : null
    }
    const payment =
        paymentStatus === 'paid' ? (
            <StatusBadge tone="success">Paid</StatusBadge>
        ) : paymentStatus === 'unpaid' ? (
            <StatusBadge tone="warning">Awaiting payment</StatusBadge>
        ) : paymentStatus ? (
            <StatusBadge tone="neutral">{humanize(paymentStatus)}</StatusBadge>
        ) : null
    return (
        <span className="inline-flex flex-wrap items-center gap-1">
            {orderStatus ? <StatusBadge tone="neutral">{humanize(orderStatus)}</StatusBadge> : null}
            {payment}
        </span>
    )
}

export function AuctionThumb({ image, className = 'h-12 w-12' }: { image: string | null | undefined; className?: string }) {
    return (
        <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 ${className}`}>
            {image ? (
                <Image src={image} alt="" fill sizes="128px" loading="lazy" className="object-contain p-0.5 mix-blend-multiply dark:mix-blend-normal" />
            ) : (
                <Gavel className="h-5 w-5" aria-hidden="true" />
            )}
        </div>
    )
}

/** Shown on the list, create and detail screens when the store is not verified (the server also blocks writes). */
export function VerificationNotice() {
    return (
        <Notice tone="warning" role="status">
            Only verified sellers can run auctions.{' '}
            <Link href={VERIFICATION_HREF} className={linkClass}>
                Complete verification in Settings
            </Link>
        </Notice>
    )
}
