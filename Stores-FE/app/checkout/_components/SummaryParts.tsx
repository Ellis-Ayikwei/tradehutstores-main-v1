'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronDown, Receipt } from 'lucide-react'
import { Money, Price, formatInCurrency } from './Money'
import { BTN_PRIMARY, CARD, FOCUS, Spinner } from './ui'

export interface SummaryModel {
    itemCount: number
    subtotal: number | null
    shipping: number | null
    tax: number | null
    promo: number | null
    total: number | null
    /** Summary is being re-priced (shows skeleton rows only). */
    loading: boolean
    /** Currency the buyer is actually charged in (order/quote currency), if known. */
    chargeCurrency: string | null
    displayCurrency: string
}

export interface PlaceModel {
    /** Button label when idle. */
    label: string
    placing: boolean
    canPlace: boolean
    /** Why the button is disabled, shown under it. */
    blocker: string | null
    onPlace: () => void
}

const PENDING = 'Calculated at checkout'
const MUTED = 'text-zinc-600 dark:text-zinc-400'

function Row({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className={strong ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-700 dark:text-zinc-300'}>{label}</dt>
            <dd className="text-right">{children}</dd>
        </div>
    )
}

const SK = 'inline-block h-4 w-16 animate-pulse rounded bg-zinc-200 align-middle dark:bg-zinc-700'

export function SummaryRows({ model, formatPrice }: { model: SummaryModel; formatPrice: (n: number) => string }) {
    const value = (n: number | null, treatZeroAsFree = false): ReactNode => {
        if (model.loading) return <span className={SK} aria-hidden="true" />
        if (n === null) return <span className={MUTED}>{PENDING}</span>
        if (treatZeroAsFree && n === 0) return <span className="font-medium text-emerald-700 dark:text-emerald-400">Free</span>
        return <Money amount={n} format={formatPrice} className="text-zinc-900 dark:text-zinc-100" />
    }
    const itemsLabel = `Items (${model.itemCount})`
    return (
        <dl className="space-y-1.5 text-sm" aria-busy={model.loading}>
            <Row label={itemsLabel}>{value(model.subtotal)}</Row>
            <Row label="Shipping">{value(model.shipping, true)}</Row>
            <Row label="Tax">{value(model.tax)}</Row>
            {!model.loading && model.promo !== null && model.promo > 0 ? (
                <Row label="Promo discount">
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        -<Money amount={model.promo} format={formatPrice} />
                    </span>
                </Row>
            ) : null}
            <div className="border-t border-zinc-200 pt-2 dark:border-zinc-800">
                <Row label="Order total" strong>
                    {model.loading ? (
                        <span className={`${SK} h-6 w-24`} aria-hidden="true" />
                    ) : model.total === null ? (
                        <span className={`text-sm ${MUTED}`}>{PENDING}</span>
                    ) : (
                        <Price amount={model.total} format={formatPrice} size="md" />
                    )}
                </Row>
                {!model.loading &&
                model.total !== null &&
                model.chargeCurrency &&
                model.chargeCurrency !== model.displayCurrency ? (
                    <p className={`mt-1 text-right text-xs ${MUTED}`}>
                        You will be charged {formatInCurrency(model.total, model.chargeCurrency)}
                    </p>
                ) : null}
            </div>
        </dl>
    )
}

export function PlaceOrderButton({ place, className = '' }: { place: PlaceModel; className?: string }) {
    return (
        <button
            type="button"
            onClick={place.onPlace}
            disabled={!place.canPlace || place.placing}
            aria-busy={place.placing}
            className={`${BTN_PRIMARY} h-12 w-full text-base ${className}`}
        >
            {place.placing ? <Spinner className="h-5 w-5" /> : null}
            {place.placing ? 'Placing your order…' : place.label}
        </button>
    )
}

export function LegalText() {
    return (
        <p className="text-xs leading-snug text-zinc-600 dark:text-zinc-400">
            By placing your order you agree to our{' '}
            <Link href="/legal/terms" className={`text-primary-700 underline hover:no-underline dark:text-primary-400 ${FOCUS}`}>
                Terms of Use
            </Link>{' '}
            and{' '}
            <Link href="/legal/privacy" className={`text-primary-700 underline hover:no-underline dark:text-primary-400 ${FOCUS}`}>
                Privacy Notice
            </Link>
            .
        </p>
    )
}

function Blocker({ text }: { text: string | null }) {
    if (!text) return null
    return <p className={`text-center text-xs ${MUTED}`}>{text}</p>
}

/** lg+: sticky right-hand card with the primary action at the top, like Amazon. */
export function DesktopSummary({
    model,
    place,
    formatPrice,
    promo,
    notices,
}: {
    model: SummaryModel
    place: PlaceModel
    formatPrice: (n: number) => string
    promo: ReactNode
    notices?: ReactNode
}) {
    return (
        <aside aria-label="Order summary" className={`${CARD} hidden space-y-3 p-4 lg:sticky lg:top-40 lg:block`}>
            <PlaceOrderButton place={place} />
            <Blocker text={place.blocker} />
            <LegalText />
            <h2 className="border-t border-zinc-200 pt-3 text-base font-bold text-zinc-900 dark:border-zinc-800 dark:text-zinc-100">
                Order summary
            </h2>
            <SummaryRows model={model} formatPrice={formatPrice} />
            {notices}
            {promo ? <div className="border-t border-zinc-200 pt-2 dark:border-zinc-800">{promo}</div> : null}
        </aside>
    )
}

/** < lg: collapsible "Order summary" bar at the top with the total visible. */
export function MobileSummaryBar({
    model,
    formatPrice,
    promo,
    notices,
}: {
    model: SummaryModel
    formatPrice: (n: number) => string
    promo: ReactNode
    notices?: ReactNode
}) {
    const [open, setOpen] = useState(false)
    return (
        <div className={`${CARD} lg:hidden`}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="mobile-order-summary"
                className={`flex min-h-[48px] w-full items-center justify-between gap-3 px-3 py-2 text-left sm:px-4 ${FOCUS}`}
            >
                <span className="flex items-center gap-2 text-sm font-semibold text-primary-700 dark:text-primary-400">
                    <Receipt className="h-4 w-4" aria-hidden="true" />
                    {open ? 'Hide order summary' : 'Show order summary'}
                    <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                </span>
                <span className="text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {model.loading ? (
                        <span className={`${SK} h-5 w-20`} aria-hidden="true" />
                    ) : model.total === null ? (
                        <span className={`text-xs font-normal ${MUTED}`}>{PENDING}</span>
                    ) : (
                        <Money amount={model.total} format={formatPrice} />
                    )}
                </span>
            </button>
            {open ? (
                <div id="mobile-order-summary" className="space-y-3 border-t border-zinc-200 p-3 dark:border-zinc-800 sm:p-4">
                    <SummaryRows model={model} formatPrice={formatPrice} />
                    {notices}
                    {promo ? <div className="border-t border-zinc-200 pt-2 dark:border-zinc-800">{promo}</div> : null}
                </div>
            ) : null}
        </div>
    )
}

/** < lg: fixed bottom bar with total + Place order. The page adds bottom padding so nothing hides behind it. */
export function MobileStickyBar({
    model,
    place,
    formatPrice,
}: {
    model: SummaryModel
    place: PlaceModel
    formatPrice: (n: number) => string
}) {
    return (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
            <div className="mx-auto flex max-w-[1440px] items-center gap-3">
                <div className="min-w-0">
                    <p className={`text-xs ${MUTED}`}>Order total</p>
                    <p className="truncate text-base font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                        {model.loading ? (
                            <span className={`${SK} h-5 w-20`} aria-hidden="true" />
                        ) : model.total === null ? (
                            <span className={`text-xs font-normal ${MUTED}`}>{PENDING}</span>
                        ) : (
                            <Money amount={model.total} format={formatPrice} />
                        )}
                    </p>
                </div>
                <PlaceOrderButton place={place} className="!w-auto flex-1" />
            </div>
            {place.blocker ? <p className={`mt-1 text-center text-xs ${MUTED}`}>{place.blocker}</p> : null}
        </div>
    )
}
