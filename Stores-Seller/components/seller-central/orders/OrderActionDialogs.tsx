'use client'

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useDialogA11y } from '@/hooks/useDialogA11y'
import type { OrderApiError, SellerOrderDetail, ShipOrderInput } from '@/lib/seller/orders'
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, INPUT, Notice, addressLines, buyerName, formatMoney, isCod } from './orderUi'

/** Resolves to the error when the action failed (so the dialog stays open), or null on success. */
export type ActionResult = OrderApiError | null

interface ModalShellProps {
    titleId: string
    onClose: () => void
    children: ReactNode
    /** The ship form is long: give it more room from sm up. */
    wide?: boolean
}

/** Mounted only while open (so form state resets on close). Bottom sheet on mobile, centred card from sm. */
function ModalShell({ titleId, onClose, children, wide = false }: ModalShellProps) {
    const ref = useRef<HTMLDivElement>(null)
    useDialogA11y(true, ref, onClose)
    return (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
            <div
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className={`relative max-h-[90vh] w-full overflow-y-auto rounded-t-lg border border-zinc-200 bg-white p-4 text-zinc-900 sm:rounded-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}
            >
                {children}
            </div>
        </div>
    )
}

function Field({
    id,
    label,
    optional,
    error,
    children,
}: {
    id: string
    label: string
    optional?: boolean
    error?: string
    children: ReactNode
}) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {label}
                {optional ? <span className="ml-1 font-normal text-zinc-500 dark:text-zinc-400">(optional)</span> : null}
            </label>
            {children}
            {error ? (
                <p id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            ) : null}
        </div>
    )
}

interface DialogBase {
    open: boolean
    onOpenChange: (open: boolean) => void
    orderLabel: string
}

/* ------------------------------------------------------------------ ship */

const URL_PATTERN = /^https?:\/\/\S+$/i
const PHONE_PATTERN = /^\+?[\d][\d\s()-]{5,19}$/

const CARRIERS = ['Own delivery (rider)', 'DHL', 'FedEx', 'UPS', 'Aramex', 'Ghana Post', 'Yango Delivery', 'Bolt Delivery'] as const
const OTHER_CARRIER = 'Other'

/** Days from dispatch to the usual arrival, used to pre-fill the delivery estimate. */
const SERVICE_LEVELS = [
    { value: 'Standard', days: 4, hint: '3 to 5 days' },
    { value: 'Express', days: 2, hint: '1 to 2 days' },
    { value: 'Same day', days: 0, hint: 'Today' },
    { value: 'Pickup', days: 0, hint: 'Buyer collects' },
] as const

type ShipField =
    | 'carrier'
    | 'service_level'
    | 'courier_reference'
    | 'tracking_url'
    | 'parcels'
    | 'weight_kg'
    | 'length_cm'
    | 'width_cm'
    | 'height_cm'
    | 'dispatch_date'
    | 'estimated_delivery_date'
    | 'contact_name'
    | 'contact_phone'
    | 'buyer_note'
    | 'internal_note'
    | 'packed'
type ShipErrors = Partial<Record<ShipField, string>>

const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (iso: string, n: number) => {
    const d = new Date(`${iso}T00:00:00`)
    d.setDate(d.getDate() + n)
    return localIso(d)
}

function SectionHeading({ children }: { children: ReactNode }) {
    return <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">{children}</legend>
}

function ShipForm({
    onOpenChange,
    orderLabel,
    order,
    onSubmit,
}: Omit<DialogBase, 'open'> & { order: SellerOrderDetail; onSubmit: (values: ShipOrderInput) => Promise<ActionResult> }) {
    const uid = useId()
    const titleId = `${uid}-title`
    const today = localIso(new Date())

    const [carrierChoice, setCarrierChoice] = useState<string>(CARRIERS[0])
    const [carrierOther, setCarrierOther] = useState('')
    const [service, setService] = useState<string>('Standard')
    const [courierRef, setCourierRef] = useState('')
    const [link, setLink] = useState('')
    const [parcels, setParcels] = useState('1')
    const [weight, setWeight] = useState('')
    const [length, setLength] = useState('')
    const [width, setWidth] = useState('')
    const [height, setHeight] = useState('')
    const [dispatch, setDispatch] = useState(today)
    const [etaOverride, setEtaOverride] = useState<string | null>(null)
    const [contactName, setContactName] = useState('')
    const [contactPhone, setContactPhone] = useState('')
    const [buyerNote, setBuyerNote] = useState('')
    const [internalNote, setInternalNote] = useState('')
    const [packed, setPacked] = useState(false)
    const [errors, setErrors] = useState<ShipErrors>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const days = SERVICE_LEVELS.find((s) => s.value === service)?.days ?? 4
    const eta = etaOverride ?? (dispatch ? addDays(dispatch, days) : '')
    const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)
    const address = addressLines(order.shipping_address)
    const recipient = buyerName(order)
    const phone = order.shipping_address?.phone?.trim()

    const close = () => {
        if (!submitting) onOpenChange(false)
    }

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        const next: ShipErrors = {}
        const carrier = carrierChoice === OTHER_CARRIER ? carrierOther.trim() : carrierChoice
        if (!carrier) next.carrier = 'Enter the delivery company'
        else if (carrier.length > 100) next.carrier = 'That name is too long'

        const parcelCount = Number(parcels)
        if (!Number.isInteger(parcelCount) || parcelCount < 1 || parcelCount > 50) next.parcels = 'Enter a whole number from 1 to 50'

        const positive = (value: string, field: ShipField) => {
            if (!value.trim()) return
            const n = Number(value)
            if (!Number.isFinite(n) || n <= 0) next[field] = 'Enter a number above 0'
        }
        positive(weight, 'weight_kg')
        const dims = [length, width, height]
        if (dims.some((d) => d.trim()) && !dims.every((d) => d.trim())) next.length_cm = 'Give length, width and height together, or none'
        else {
            positive(length, 'length_cm')
            positive(width, 'width_cm')
            positive(height, 'height_cm')
        }

        if (!dispatch) next.dispatch_date = 'Pick the dispatch date'
        if (dispatch && eta && eta < dispatch) next.estimated_delivery_date = 'Delivery can’t be before the dispatch date'
        const u = link.trim()
        if (u && !URL_PATTERN.test(u)) next.tracking_url = 'Enter a full link starting with http:// or https://'
        else if (u.length > 500) next.tracking_url = 'That link is too long'
        const p = contactPhone.trim()
        if (p && !PHONE_PATTERN.test(p)) next.contact_phone = 'Enter a valid phone number'
        if (!packed) next.packed = 'Confirm the items are packed before shipping'

        setErrors(next)
        setFormError(null)
        if (Object.keys(next).length > 0) return

        setSubmitting(true)
        const error = await onSubmit({
            carrier,
            service_level: service,
            courier_reference: courierRef.trim() || undefined,
            tracking_url: u || undefined,
            parcels: parcelCount,
            weight_kg: weight.trim() || undefined,
            length_cm: length.trim() || undefined,
            width_cm: width.trim() || undefined,
            height_cm: height.trim() || undefined,
            dispatch_date: dispatch,
            estimated_delivery_date: eta || undefined,
            contact_name: contactName.trim() || undefined,
            contact_phone: p || undefined,
            buyer_note: buyerNote.trim() || undefined,
            internal_note: internalNote.trim() || undefined,
        })
        setSubmitting(false)
        if (!error) return
        const server: ShipErrors = {}
        let any = false
        for (const key of Object.keys(error.fieldErrors ?? {}) as ShipField[]) {
            const message = error.fieldErrors?.[key]
            if (message) {
                server[key] = message
                any = true
            }
        }
        if (any) setErrors(server)
        else setFormError(error.message)
    }

    const err = (field: ShipField) => errors[field]
    const describe = (field: ShipField) => (errors[field] ? `${uid}-${field}-error` : undefined)

    return (
        <ModalShell titleId={titleId} onClose={close} wide>
            <h2 id={titleId} className="text-base font-bold">
                Ship order {orderLabel}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Tell us how it is going out. We generate the tracking number for you when you confirm, and the buyer sees it straight away.
            </p>

            <form onSubmit={submit} className="mt-3 space-y-4" noValidate>
                {formError ? <Notice title="Could not mark as shipped" message={formError} /> : null}

                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-800">
                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Deliver to</p>
                    {recipient || address.length > 0 ? (
                        <address className="mt-1 not-italic text-zinc-900 dark:text-zinc-100">
                            {recipient ? <p className="font-semibold">{recipient}</p> : null}
                            {address.map((line) => (
                                <p key={line}>{line}</p>
                            ))}
                            {phone ? <p className="text-zinc-600 dark:text-zinc-400">{phone}</p> : null}
                        </address>
                    ) : (
                        <p className="mt-1 text-zinc-600 dark:text-zinc-400">No address came with this order.</p>
                    )}
                    <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        {isCod(order) ? ` · cash on delivery, collect ${formatMoney(order.total_amount, order.currency)}` : ' · already paid'}
                    </p>
                </div>

                <fieldset>
                    <SectionHeading>Delivery partner</SectionHeading>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field id={`${uid}-carrier`} label="Delivery company" error={err('carrier')}>
                            <select
                                id={`${uid}-carrier`}
                                className={INPUT}
                                value={carrierChoice}
                                onChange={(e) => setCarrierChoice(e.target.value)}
                                aria-invalid={Boolean(err('carrier'))}
                                aria-describedby={describe('carrier')}
                            >
                                {CARRIERS.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                                <option value={OTHER_CARRIER}>Other…</option>
                            </select>
                        </Field>
                        {carrierChoice === OTHER_CARRIER ? (
                            <Field id={`${uid}-carrier-other`} label="Company name" error={err('carrier')}>
                                <input id={`${uid}-carrier-other`} className={INPUT} value={carrierOther} onChange={(e) => setCarrierOther(e.target.value)} autoComplete="off" />
                            </Field>
                        ) : (
                            <Field id={`${uid}-service`} label="Service">
                                <select id={`${uid}-service`} className={INPUT} value={service} onChange={(e) => setService(e.target.value)}>
                                    {SERVICE_LEVELS.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.value} ({s.hint})
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        )}
                        {carrierChoice === OTHER_CARRIER ? (
                            <Field id={`${uid}-service`} label="Service">
                                <select id={`${uid}-service`} className={INPUT} value={service} onChange={(e) => setService(e.target.value)}>
                                    {SERVICE_LEVELS.map((s) => (
                                        <option key={s.value} value={s.value}>
                                            {s.value} ({s.hint})
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        ) : null}
                        <Field id={`${uid}-courier_reference`} label="Courier’s own reference" optional error={err('courier_reference')}>
                            <input
                                id={`${uid}-courier_reference`}
                                className={INPUT}
                                value={courierRef}
                                onChange={(e) => setCourierRef(e.target.value)}
                                autoComplete="off"
                                placeholder="Waybill number, if they gave one"
                                aria-invalid={Boolean(err('courier_reference'))}
                                aria-describedby={describe('courier_reference')}
                            />
                        </Field>
                        <Field id={`${uid}-tracking_url`} label="Courier tracking link" optional error={err('tracking_url')}>
                            <input
                                id={`${uid}-tracking_url`}
                                className={INPUT}
                                type="url"
                                inputMode="url"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                autoComplete="off"
                                aria-invalid={Boolean(err('tracking_url'))}
                                aria-describedby={describe('tracking_url')}
                            />
                        </Field>
                    </div>
                </fieldset>

                <fieldset>
                    <SectionHeading>Package</SectionHeading>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field id={`${uid}-parcels`} label="Number of parcels" error={err('parcels')}>
                            <input
                                id={`${uid}-parcels`}
                                className={INPUT}
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={50}
                                value={parcels}
                                onChange={(e) => setParcels(e.target.value)}
                                aria-invalid={Boolean(err('parcels'))}
                                aria-describedby={describe('parcels')}
                            />
                        </Field>
                        <Field id={`${uid}-weight_kg`} label="Total weight (kg)" optional error={err('weight_kg')}>
                            <input
                                id={`${uid}-weight_kg`}
                                className={INPUT}
                                inputMode="decimal"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                placeholder="e.g. 2.5"
                                aria-invalid={Boolean(err('weight_kg'))}
                                aria-describedby={describe('weight_kg')}
                            />
                        </Field>
                    </div>
                    <div className="mt-3">
                        <p className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Size in cm <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {(
                                [
                                    ['length_cm', 'Length', length, setLength],
                                    ['width_cm', 'Width', width, setWidth],
                                    ['height_cm', 'Height', height, setHeight],
                                ] as const
                            ).map(([field, label, value, set]) => (
                                <input
                                    key={field}
                                    className={INPUT}
                                    inputMode="decimal"
                                    value={value}
                                    onChange={(e) => set(e.target.value)}
                                    placeholder={label}
                                    aria-label={`${label} in centimetres`}
                                    aria-invalid={Boolean(err(field))}
                                    aria-describedby={describe(field)}
                                />
                            ))}
                        </div>
                        {err('length_cm') || err('width_cm') || err('height_cm') ? (
                            <p id={`${uid}-length_cm-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
                                {err('length_cm') ?? err('width_cm') ?? err('height_cm')}
                            </p>
                        ) : null}
                    </div>
                </fieldset>

                <fieldset>
                    <SectionHeading>Dates</SectionHeading>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field id={`${uid}-dispatch_date`} label="Dispatch date" error={err('dispatch_date')}>
                            <input
                                id={`${uid}-dispatch_date`}
                                className={INPUT}
                                type="date"
                                value={dispatch}
                                onChange={(e) => setDispatch(e.target.value)}
                                aria-invalid={Boolean(err('dispatch_date'))}
                                aria-describedby={describe('dispatch_date')}
                            />
                        </Field>
                        <Field id={`${uid}-estimated_delivery_date`} label="Expected delivery" error={err('estimated_delivery_date')}>
                            <input
                                id={`${uid}-estimated_delivery_date`}
                                className={INPUT}
                                type="date"
                                value={eta}
                                min={dispatch || undefined}
                                onChange={(e) => setEtaOverride(e.target.value)}
                                aria-invalid={Boolean(err('estimated_delivery_date'))}
                                aria-describedby={describe('estimated_delivery_date')}
                            />
                        </Field>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">The estimate follows the service you picked; change it if you know better. The buyer sees it.</p>
                </fieldset>

                <fieldset>
                    <SectionHeading>Handover</SectionHeading>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field id={`${uid}-contact_name`} label="Rider or courier name" optional error={err('contact_name')}>
                            <input id={`${uid}-contact_name`} className={INPUT} value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="off" maxLength={100} />
                        </Field>
                        <Field id={`${uid}-contact_phone`} label="Their phone" optional error={err('contact_phone')}>
                            <input
                                id={`${uid}-contact_phone`}
                                className={INPUT}
                                type="tel"
                                inputMode="tel"
                                value={contactPhone}
                                onChange={(e) => setContactPhone(e.target.value)}
                                autoComplete="off"
                                aria-invalid={Boolean(err('contact_phone'))}
                                aria-describedby={describe('contact_phone')}
                            />
                        </Field>
                    </div>
                </fieldset>

                <fieldset>
                    <SectionHeading>Notes</SectionHeading>
                    <div className="space-y-3">
                        <Field id={`${uid}-buyer_note`} label="Message to the buyer" optional error={err('buyer_note')}>
                            <textarea
                                id={`${uid}-buyer_note`}
                                rows={2}
                                maxLength={300}
                                className={`${INPUT} py-2`}
                                value={buyerNote}
                                onChange={(e) => setBuyerNote(e.target.value)}
                                placeholder="e.g. The rider will call before arriving"
                            />
                        </Field>
                        <Field id={`${uid}-internal_note`} label="Private note" optional error={err('internal_note')}>
                            <textarea
                                id={`${uid}-internal_note`}
                                rows={2}
                                maxLength={500}
                                className={`${INPUT} py-2`}
                                value={internalNote}
                                onChange={(e) => setInternalNote(e.target.value)}
                                placeholder="Only you and our team see this"
                            />
                        </Field>
                    </div>
                </fieldset>

                <div>
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-900 dark:text-zinc-100">
                        <input
                            type="checkbox"
                            checked={packed}
                            onChange={(e) => setPacked(e.target.checked)}
                            className="mt-0.5 h-5 w-5 shrink-0 accent-primary-700"
                            aria-invalid={Boolean(err('packed'))}
                            aria-describedby={describe('packed')}
                        />
                        <span>
                            I have packed all {itemCount} {itemCount === 1 ? 'item' : 'items'} and the packing slip is inside.
                        </span>
                    </label>
                    {err('packed') ? (
                        <p id={`${uid}-packed-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {err('packed')}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 pt-3 sm:flex-row sm:justify-end dark:border-zinc-700">
                    <button type="button" className={BTN_SECONDARY} onClick={close} disabled={submitting}>
                        Back
                    </button>
                    <button type="submit" className={BTN_PRIMARY} disabled={submitting}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                        Confirm shipment
                    </button>
                </div>
            </form>
        </ModalShell>
    )
}

export function ShipDialog({
    open,
    order,
    onSubmit,
    ...rest
}: DialogBase & { order: SellerOrderDetail; onSubmit: (values: ShipOrderInput) => Promise<ActionResult> }) {
    return open ? <ShipForm {...rest} order={order} onSubmit={onSubmit} /> : null
}

/* ------------------------------------------------------------------ cancel */

function CancelForm({ onOpenChange, orderLabel, isPaid, onSubmit }: Omit<DialogBase, 'open'> & { isPaid: boolean; onSubmit: (reason: string) => Promise<ActionResult> }) {
    const uid = useId()
    const titleId = `${uid}-title`
    const [reason, setReason] = useState('')
    const [error, setError] = useState<string | undefined>()
    const [formError, setFormError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const close = () => {
        if (!submitting) onOpenChange(false)
    }

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        const r = reason.trim()
        setFormError(null)
        if (r.length < 3) {
            setError('Give a short reason')
            return
        }
        if (r.length > 200) {
            setError('Keep the reason under 200 characters')
            return
        }
        setError(undefined)
        setSubmitting(true)
        const result = await onSubmit(r)
        setSubmitting(false)
        if (!result) return
        const message = result.fieldErrors?.reason
        if (message) setError(message)
        else setFormError(result.message)
    }

    return (
        <ModalShell titleId={titleId} onClose={close}>
            <h2 id={titleId} className="text-base font-bold">
                Cancel order {orderLabel}?
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                The stock is returned to your listing and the buyer is told the order was cancelled.
                {isPaid ? ' This order is already paid, so the buyer is refunded in full automatically.' : ''} This cannot be undone.
            </p>
            <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
                {formError ? <Notice title="Could not cancel the order" message={formError} /> : null}
                <Field id={`${uid}-reason`} label="Reason" error={error}>
                    <textarea
                        id={`${uid}-reason`}
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={200}
                        className={`${INPUT} py-2`}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? `${uid}-reason-error` : undefined}
                    />
                </Field>
                <p className="text-right text-xs text-zinc-500 dark:text-zinc-400">{reason.trim().length}/200</p>
                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                    <button type="button" className={BTN_SECONDARY} onClick={close} disabled={submitting}>
                        Keep order
                    </button>
                    <button type="submit" className={BTN_DANGER} disabled={submitting}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                        Cancel order
                    </button>
                </div>
            </form>
        </ModalShell>
    )
}

export function CancelDialog({ open, ...rest }: DialogBase & { isPaid: boolean; onSubmit: (reason: string) => Promise<ActionResult> }) {
    return open ? <CancelForm {...rest} /> : null
}

/* ------------------------------------------------------------------ COD cash collected */

function CodForm({ onOpenChange, orderLabel, totalLabel, onConfirm }: Omit<DialogBase, 'open'> & { totalLabel: string; onConfirm: () => Promise<ActionResult> }) {
    const uid = useId()
    const titleId = `${uid}-title`
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    const close = () => {
        if (!submitting) onOpenChange(false)
    }

    const confirm = async () => {
        setSubmitting(true)
        setFormError(null)
        const error = await onConfirm()
        setSubmitting(false)
        if (error) setFormError(error.message)
    }

    return (
        <ModalShell titleId={titleId} onClose={close}>
            <h2 id={titleId} className="text-base font-bold">
                Confirm cash collected
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Confirm that {totalLabel} was collected from the buyer for order {orderLabel}. The order is then marked as delivered and paid.
            </p>
            {formError ? (
                <div className="mt-3">
                    <Notice title="Could not confirm delivery" message={formError} />
                </div>
            ) : null}
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className={BTN_SECONDARY} onClick={close} disabled={submitting}>
                    Not yet
                </button>
                <button type="button" className={BTN_PRIMARY} onClick={confirm} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Cash collected
                </button>
            </div>
        </ModalShell>
    )
}

export function ConfirmCodDialog({ open, ...rest }: DialogBase & { totalLabel: string; onConfirm: () => Promise<ActionResult> }) {
    return open ? <CodForm {...rest} /> : null
}
