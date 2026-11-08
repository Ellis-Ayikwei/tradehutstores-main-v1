'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { requestNewValue, type AttributeRequestError, type RequestValueOutcome } from '@/lib/seller/attributeRequests'
import type { OptionValue } from './schema'
import { colourError, ColourField, isColourAttribute } from './ColourField'
import { Banner, btnPrimary, btnSecondary, Field, Modal, TextArea, TextInput } from './ui'

const MAX_NAME = 100
const MAX_NOTE = 500

interface RequestValueDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    attributeId: string
    attributeName: string
    displayType: string
    /** Values already loaded for this option type, to catch an exact match before asking staff. */
    existing: OptionValue[]
    /** Called with the outcome of a request that reached the server (created, exists, already requested). */
    onOutcome: (outcome: RequestValueOutcome) => void
    /** Called when a loaded value already matches the typed name. */
    onMatchedExisting: (value: OptionValue) => void
}

export function RequestValueDialog({ open, onOpenChange, attributeId, attributeName, displayType, existing, onOutcome, onMatchedExisting }: RequestValueDialogProps) {
    const [name, setName] = useState('')
    const [colour, setColour] = useState('')
    const [note, setNote] = useState('')
    const [error, setError] = useState<AttributeRequestError | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const busy = useRef(false)
    const withColour = isColourAttribute(attributeName, displayType)

    useEffect(() => {
        if (!open) {
            setName('')
            setColour('')
            setNote('')
            setError(null)
        }
    }, [open])

    const trimmed = name.trim()
    const nameInvalid = trimmed.length < 1 || trimmed.length > MAX_NAME
    const hexMessage = withColour ? colourError(colour) : ''
    const canSubmit = !nameInvalid && !hexMessage && !submitting

    const submit = async () => {
        if (busy.current || !canSubmit) return

        const match = existing.find((v) => v.label.trim().toLowerCase() === trimmed.toLowerCase())
        if (match) {
            onMatchedExisting(match)
            onOpenChange(false)
            return
        }

        busy.current = true
        setSubmitting(true)
        setError(null)
        try {
            const outcome = await requestNewValue({
                attribute: attributeId,
                value_name: trimmed,
                ...(withColour && colour.trim() ? { color_code: colour.trim().toUpperCase() } : {}),
                ...(note.trim() ? { note: note.trim() } : {}),
            })
            onOutcome(outcome)
            onOpenChange(false)
        } catch (err) {
            setError(err as AttributeRequestError)
        } finally {
            busy.current = false
            setSubmitting(false)
        }
    }

    const nameFieldError = error?.fieldErrors?.value_name
    const generalError = error && !nameFieldError ? error.message : null

    return (
        <Modal
            open={open}
            onClose={() => onOpenChange(false)}
            locked={submitting}
            title={`Request a new ${attributeName.toLowerCase()} value`}
            description="Our team checks every new value before it can be used. You will be able to pick it here once it is approved."
        >
            <form
                className="space-y-3"
                noValidate
                onSubmit={(event) => {
                    event.preventDefault()
                    void submit()
                }}
            >
                <Field label="Value name" error={nameFieldError}>
                    {(field) => <TextInput {...field} value={name} onChange={(e) => setName(e.target.value)} maxLength={MAX_NAME} placeholder={withColour ? 'For example Mustard' : 'The value you need'} autoComplete="off" disabled={submitting} />}
                </Field>

                {withColour ? <ColourField value={colour} onChange={setColour} label="Colour (optional)" disabled={submitting} /> : null}

                <Field label="Note for our team (optional)">
                    {(field) => <TextArea {...field} value={note} onChange={(e) => setNote(e.target.value)} maxLength={MAX_NOTE} rows={2} disabled={submitting} />}
                </Field>

                {generalError ? <Banner tone="error">{generalError}</Banner> : null}

                <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                    <button type="button" className={btnSecondary} onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </button>
                    <button type="submit" className={btnPrimary} disabled={!canSubmit}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                        Send request
                    </button>
                </div>
            </form>
        </Modal>
    )
}
