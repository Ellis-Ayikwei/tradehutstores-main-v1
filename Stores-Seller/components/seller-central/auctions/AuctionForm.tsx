'use client'

import { ChevronDown } from 'lucide-react'
import { TextArea, TextInput, btnSecondary } from '@/components/seller-central/ui'
import {
    AUCTION_CURRENCY,
    DURATION_PRESET_DAYS,
    MAX_SOFT_CLOSE_SECONDS,
    MAX_TITLE_LENGTH,
    fromLocalInput,
    toLocalInput,
    type AuctionFormErrors,
    type AuctionFormField,
    type AuctionFormValues,
} from '@/lib/seller/auctions'
import { formatSpan } from './auctionUi'

const DAY_MS = 24 * 60 * 60 * 1000

interface Props {
    values: AuctionFormValues
    errors: AuctionFormErrors
    onChange: (field: keyof AuctionFormValues, value: string) => void
    mode: 'create' | 'edit'
    /** Create only. */
    startNow: boolean
    onStartNowChange: (next: boolean) => void
    /** Create only: units in stock for the chosen variant, shown as the quantity limit. */
    stock: number | null
    disabled?: boolean
}

function fieldError(errors: AuctionFormErrors, key: AuctionFormField): string | undefined {
    return errors[key]
}

export default function AuctionForm({ values, errors, onChange, mode, startNow, onStartNowChange, stock, disabled }: Props) {
    const currency = AUCTION_CURRENCY
    const creating = mode === 'create'

    const startsAt = creating && startNow ? new Date() : fromLocalInput(values.starts_at)
    const endsAt = fromLocalInput(values.ends_at)
    const duration = startsAt && endsAt && endsAt.getTime() > startsAt.getTime() ? formatSpan(endsAt.getTime() - startsAt.getTime()) : null

    const applyPreset = (days: number) => {
        const base = startsAt ?? new Date()
        onChange('ends_at', toLocalInput(new Date(base.getTime() + days * DAY_MS)))
    }

    return (
        <div className="space-y-5">
            <fieldset className="space-y-3" disabled={disabled}>
                <legend className="mb-2 text-base font-bold text-zinc-900 dark:text-zinc-100">Details</legend>
                <TextInput id="auction-title" label="Title" value={values.title} onChange={(e) => onChange('title', e.target.value)} error={fieldError(errors, 'title')} maxLength={MAX_TITLE_LENGTH} autoComplete="off" />
                <TextArea
                    id="auction-description"
                    label="Description"
                    optional
                    rows={4}
                    value={values.description}
                    onChange={(e) => onChange('description', e.target.value)}
                    error={fieldError(errors, 'description')}
                    hint="Condition, what is included, anything a bidder should know."
                />
            </fieldset>

            <fieldset className="space-y-3" disabled={disabled}>
                <legend className="mb-2 text-base font-bold text-zinc-900 dark:text-zinc-100">Quantity and prices</legend>
                {creating ? (
                    <TextInput
                        id="auction-quantity"
                        label="Quantity"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={stock ?? undefined}
                        step={1}
                        value={values.quantity}
                        onChange={(e) => onChange('quantity', e.target.value)}
                        error={fieldError(errors, 'quantity')}
                        hint={stock !== null ? `${stock} in stock. This lot is taken out of your stock while the auction runs.` : 'Pick a variant to see its stock.'}
                    />
                ) : (
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">
                        Quantity: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{values.quantity}</span>. The lot size cannot be changed after the auction is created.
                    </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                    <TextInput
                        id="auction-starting-price"
                        label={`Starting price (${currency})`}
                        inputMode="decimal"
                        value={values.starting_price}
                        onChange={(e) => onChange('starting_price', e.target.value)}
                        error={fieldError(errors, 'starting_price')}
                        autoComplete="off"
                    />
                    <TextInput
                        id="auction-min-increment"
                        label={`Minimum bid increase (${currency})`}
                        inputMode="decimal"
                        value={values.min_increment}
                        onChange={(e) => onChange('min_increment', e.target.value)}
                        error={fieldError(errors, 'min_increment')}
                        hint="Each bid must beat the current price by at least this much."
                        autoComplete="off"
                    />
                    <TextInput
                        id="auction-reserve-price"
                        label={`Reserve price (${currency})`}
                        optional
                        inputMode="decimal"
                        value={values.reserve_price}
                        onChange={(e) => onChange('reserve_price', e.target.value)}
                        error={fieldError(errors, 'reserve_price')}
                        hint="Hidden from bidders. If bids stay below it, the item is not sold."
                        autoComplete="off"
                    />
                    <TextInput
                        id="auction-buy-now-price"
                        label={`Buy now price (${currency})`}
                        optional
                        inputMode="decimal"
                        value={values.buy_now_price}
                        onChange={(e) => onChange('buy_now_price', e.target.value)}
                        error={fieldError(errors, 'buy_now_price')}
                        placeholder={creating ? undefined : 'Leave blank to keep the current price'}
                        hint="Lets a buyer end the auction at once, until the first bid."
                        autoComplete="off"
                    />
                </div>
            </fieldset>

            <fieldset className="space-y-3" disabled={disabled}>
                <legend className="mb-2 text-base font-bold text-zinc-900 dark:text-zinc-100">Schedule</legend>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">Times are in your local time.</p>
                {creating ? (
                    <div role="group" aria-label="When to start" className="grid grid-cols-2 gap-2 sm:max-w-sm">
                        {[
                            { now: true, label: 'Start now' },
                            { now: false, label: 'Schedule' },
                        ].map((opt) => (
                            <button
                                key={opt.label}
                                type="button"
                                aria-pressed={startNow === opt.now}
                                onClick={() => onStartNowChange(opt.now)}
                                className={`min-h-[44px] rounded-md border px-3 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 ${
                                    startNow === opt.now
                                        ? 'border-primary-700 bg-primary-700 text-white'
                                        : 'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                ) : null}
                {!creating || !startNow ? (
                    <TextInput
                        id="auction-starts-at"
                        label="Starts"
                        type="datetime-local"
                        value={values.starts_at}
                        onChange={(e) => onChange('starts_at', e.target.value)}
                        error={fieldError(errors, 'starts_at')}
                        hint="Up to 30 days ahead."
                    />
                ) : null}
                <TextInput
                    id="auction-ends-at"
                    label="Ends"
                    type="datetime-local"
                    value={values.ends_at}
                    onChange={(e) => onChange('ends_at', e.target.value)}
                    error={fieldError(errors, 'ends_at')}
                    hint={duration ? `Runs for ${duration}. Between 1 hour and 14 days.` : 'Between 1 hour and 14 days.'}
                />
                <div role="group" aria-label="Duration presets" className="flex flex-wrap gap-2">
                    {DURATION_PRESET_DAYS.map((days) => (
                        <button key={days} type="button" className={`${btnSecondary} min-w-[56px]`} onClick={() => applyPreset(days)}>
                            {days}d
                        </button>
                    ))}
                </div>
            </fieldset>

            <details className="group rounded-md border border-zinc-200 dark:border-zinc-800" open={Boolean(errors.soft_close_seconds)}>
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-bold text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 dark:text-zinc-100">
                    Advanced
                    <ChevronDown className="h-4 w-4 group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
                    <fieldset disabled={disabled}>
                        <TextInput
                            id="auction-soft-close"
                            label="Late bid extension (seconds)"
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={MAX_SOFT_CLOSE_SECONDS}
                            step={1}
                            value={values.soft_close_seconds}
                            onChange={(e) => onChange('soft_close_seconds', e.target.value)}
                            error={fieldError(errors, 'soft_close_seconds')}
                            hint={`A bid placed this close to the end resets the clock to this many seconds. 0 turns it off. Up to ${MAX_SOFT_CLOSE_SECONDS}.`}
                        />
                    </fieldset>
                </div>
            </details>
        </div>
    )
}
