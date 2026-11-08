'use client'

import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useDialogA11y } from '@/hooks/useDialogA11y'
import type { OrderApiError, ShipOrderInput } from '@/lib/seller/orders'
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, INPUT, Notice } from './orderUi'

/** Resolves to the error when the action failed (so the dialog stays open), or null on success. */
export type ActionResult = OrderApiError | null

interface ModalShellProps {
    titleId: string
    onClose: () => void
    children: ReactNode
}

/** Mounted only while open (so form state resets on close). Bottom sheet on mobile, centred card from sm. */
function ModalShell({ titleId, onClose, children }: ModalShellProps) {
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
                className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-lg border border-zinc-200 bg-white p-4 text-zinc-900 sm:max-w-md sm:rounded-md dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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

type ShipErrors = Partial<Record<'carrier' | 'tracking_number' | 'tracking_url', string>>

function ShipForm({ onOpenChange, orderLabel, onSubmit }: Omit<DialogBase, 'open'> & { onSubmit: (values: ShipOrderInput) => Promise<ActionResult> }) {
    const uid = useId()
    const titleId = `${uid}-title`
    const [carrier, setCarrier] = useState('')
    const [tracking, setTracking] = useState('')
    const [link, setLink] = useState('')
    const [errors, setErrors] = useState<ShipErrors>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    const close = () => {
        if (!submitting) onOpenChange(false)
    }

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        const c = carrier.trim()
        const t = tracking.trim()
        const u = link.trim()
        const next: ShipErrors = {}
        if (!c) next.carrier = 'Enter the carrier'
        else if (c.length > 100) next.carrier = 'Carrier name is too long'
        if (!t) next.tracking_number = 'Enter the tracking number'
        else if (t.length > 100) next.tracking_number = 'Tracking number is too long'
        if (u && u.length > 500) next.tracking_url = 'Tracking link is too long'
        else if (u && !URL_PATTERN.test(u)) next.tracking_url = 'Enter a full link starting with http:// or https://'
        setErrors(next)
        setFormError(null)
        if (Object.keys(next).length > 0) return

        setSubmitting(true)
        const error = await onSubmit({ carrier: c, tracking_number: t, tracking_url: u || undefined })
        setSubmitting(false)
        if (!error) return
        const server: ShipErrors = {}
        for (const key of ['carrier', 'tracking_number', 'tracking_url'] as const) {
            const message = error.fieldErrors?.[key]
            if (message) server[key] = message
        }
        if (Object.keys(server).length > 0) setErrors(server)
        else setFormError(error.message)
    }

    return (
        <ModalShell titleId={titleId} onClose={close}>
            <h2 id={titleId} className="text-base font-bold">
                Ship order {orderLabel}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Add the carrier and tracking number. The buyer is notified once it is marked as shipped.</p>
            <form onSubmit={submit} className="mt-3 space-y-3" noValidate>
                {formError ? <Notice title="Could not mark as shipped" message={formError} /> : null}
                <Field id={`${uid}-carrier`} label="Carrier" error={errors.carrier}>
                    <input
                        id={`${uid}-carrier`}
                        className={INPUT}
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                        autoComplete="off"
                        aria-invalid={Boolean(errors.carrier)}
                        aria-describedby={errors.carrier ? `${uid}-carrier-error` : undefined}
                    />
                </Field>
                <Field id={`${uid}-tracking`} label="Tracking number" error={errors.tracking_number}>
                    <input
                        id={`${uid}-tracking`}
                        className={INPUT}
                        value={tracking}
                        onChange={(e) => setTracking(e.target.value)}
                        autoComplete="off"
                        aria-invalid={Boolean(errors.tracking_number)}
                        aria-describedby={errors.tracking_number ? `${uid}-tracking-error` : undefined}
                    />
                </Field>
                <Field id={`${uid}-link`} label="Tracking link" optional error={errors.tracking_url}>
                    <input
                        id={`${uid}-link`}
                        className={INPUT}
                        type="url"
                        inputMode="url"
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        autoComplete="off"
                        aria-invalid={Boolean(errors.tracking_url)}
                        aria-describedby={errors.tracking_url ? `${uid}-link-error` : undefined}
                    />
                </Field>
                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                    <button type="button" className={BTN_SECONDARY} onClick={close} disabled={submitting}>
                        Back
                    </button>
                    <button type="submit" className={BTN_PRIMARY} disabled={submitting}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                        Mark as shipped
                    </button>
                </div>
            </form>
        </ModalShell>
    )
}

export function ShipDialog({ open, onSubmit, ...rest }: DialogBase & { onSubmit: (values: ShipOrderInput) => Promise<ActionResult> }) {
    return open ? <ShipForm {...rest} onSubmit={onSubmit} /> : null
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
                {isPaid ? ' This order is already paid, so the buyer will be refunded by our team.' : ''} This cannot be undone.
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
