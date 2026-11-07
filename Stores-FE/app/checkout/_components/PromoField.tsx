'use client'

import { useId, useState } from 'react'
import { Check, Tag, X } from 'lucide-react'
import { FOCUS, LINK_BTN, Spinner, inputClass } from './ui'

interface PromoFieldProps {
    /** Currently applied code (null = none). */
    applied: { code: string; note?: string } | null
    /** Resolve to an error message, or null when the code was accepted. */
    onApply: (code: string) => Promise<string | null>
    onRemove: () => void
    disabled?: boolean
}

/** Collapsed "Have a promo code?" link that expands to a 44px input + Apply button. Themed light and dark. */
export default function PromoField({ applied, onApply, onRemove, disabled = false }: PromoFieldProps) {
    const id = useId()
    const [open, setOpen] = useState(false)
    const [value, setValue] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submit = async () => {
        const code = value.trim()
        if (!code || busy) return
        setBusy(true)
        setError(null)
        const message = await onApply(code)
        setBusy(false)
        if (message) {
            setError(message)
            return
        }
        setValue('')
        setOpen(false)
    }

    if (applied) {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100">
                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                <p className="min-w-0 flex-1">
                    <span className="font-semibold">{applied.code}</span> applied
                    {applied.note ? <span className="block text-xs">{applied.note}</span> : null}
                </p>
                <button
                    type="button"
                    onClick={onRemove}
                    disabled={disabled}
                    aria-label={`Remove promo code ${applied.code}`}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white disabled:cursor-not-allowed disabled:text-zinc-400 dark:disabled:text-zinc-600 dark:hover:bg-zinc-800 sm:h-9 sm:w-9 ${FOCUS}`}
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
        )
    }

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)} disabled={disabled} className={LINK_BTN}>
                <Tag className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Have a promo code?
            </button>
        )
    }

    return (
        <div>
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Promo code
            </label>
            <div className="flex gap-2">
                <input
                    id={id}
                    type="text"
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value)
                        if (error) setError(null)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            void submit()
                        }
                    }}
                    autoCapitalize="characters"
                    autoComplete="off"
                    spellCheck={false}
                    disabled={disabled || busy}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? `${id}-error` : undefined}
                    className={`${inputClass(Boolean(error))} min-w-0 flex-1 uppercase`}
                />
                <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={disabled || busy || !value.trim()}
                    className={`inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:disabled:text-zinc-500 ${FOCUS}`}
                >
                    {busy ? <Spinner /> : null}
                    Apply
                </button>
            </div>
            {error ? (
                <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {error}
                </p>
            ) : null}
        </div>
    )
}
