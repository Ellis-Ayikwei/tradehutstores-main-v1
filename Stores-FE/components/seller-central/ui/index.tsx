'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

/**
 * Seller Central UI primitives: flat, solid, theme-aware (AGENTS.md section 5).
 * Panels `rounded-md` with a divider border, inputs 44px / 16px text, no alpha, no gradients.
 */

// --- class strings ---------------------------------------------------------

const BTN_BASE =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 dark:focus-visible:ring-primary-400 dark:focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500'

export const btnPrimary = `${BTN_BASE} bg-primary-700 text-white hover:bg-primary-800`
export const btnSecondary = `${BTN_BASE} border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 disabled:border-zinc-200 dark:disabled:border-zinc-800`
export const btnDanger = `${BTN_BASE} bg-red-700 text-white hover:bg-red-800`
/** Compact variant for dense table rows (36px on md+, 44px on touch widths). */
export const btnSmall = 'min-h-[44px] px-3 md:min-h-[36px]'

export const linkClass = 'font-semibold text-primary-700 hover:underline dark:text-primary-400'

export const inputClass =
    'block min-h-[44px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-500 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-primary-400 dark:focus:ring-primary-900 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400'

const inputInvalid = 'border-red-600 focus:border-red-600 focus:ring-red-200 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-900'

// --- layout ----------------------------------------------------------------

export function Skeleton({ className = '' }: { className?: string }) {
    return <div aria-hidden className={`animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 ${className}`} />
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="font-syne text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">{title}</h1>
                {description ? <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{description}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    )
}

export function Panel({
    title,
    description,
    actions,
    children,
    className = '',
    bodyClassName = 'p-3 sm:p-4',
}: {
    title?: string
    description?: string
    actions?: ReactNode
    children: ReactNode
    className?: string
    bodyClassName?: string
}) {
    return (
        <section className={`rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
            {title || actions ? (
                <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800 sm:px-4">
                    <div className="min-w-0">
                        {title ? <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h2> : null}
                        {description ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p> : null}
                    </div>
                    {actions ? <div className="shrink-0">{actions}</div> : null}
                </header>
            ) : null}
            <div className={bodyClassName}>{children}</div>
        </section>
    )
}

// --- feedback --------------------------------------------------------------

export type Tone = 'info' | 'warning' | 'danger' | 'success' | 'neutral'

const NOTICE_TONE: Record<Tone, string> = {
    info: 'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100',
    warning: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
    danger: 'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100',
    success: 'border-green-300 bg-green-50 text-green-900 dark:border-green-700 dark:bg-green-950 dark:text-green-100',
    neutral: 'border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100',
}

export function Notice({
    tone = 'info',
    role,
    children,
    className = '',
}: {
    tone?: Tone
    role?: 'alert' | 'status'
    children: ReactNode
    className?: string
}) {
    return (
        <div role={role} className={`rounded-md border px-3 py-2 text-sm ${NOTICE_TONE[tone]} ${className}`}>
            {children}
        </div>
    )
}

const BADGE_TONE: Record<Tone, string> = {
    info: 'bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100',
    warning: 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100',
    danger: 'bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100',
    success: 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100',
    neutral: 'bg-zinc-200 text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100',
}

export function StatusBadge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
    return (
        <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${BADGE_TONE[tone]}`}>
            {children}
        </span>
    )
}

export function ErrorPanel({
    title = "We couldn't load this",
    message,
    onRetry,
    retrying = false,
    className = '',
}: {
    title?: string
    message: string
    onRetry?: () => void
    retrying?: boolean
    className?: string
}) {
    return (
        <div role="alert" className={`rounded-md border px-3 py-3 sm:px-4 ${NOTICE_TONE.danger} ${className}`}>
            <p className="text-sm font-bold">{title}</p>
            <p className="mt-0.5 break-words text-sm">{message}</p>
            {onRetry ? (
                <button type="button" onClick={onRetry} disabled={retrying} className={`${btnSecondary} mt-2`}>
                    {retrying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                    Try again
                </button>
            ) : null}
        </div>
    )
}

export function EmptyPanel({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
    return (
        <div className="rounded-md border border-dashed border-zinc-300 bg-white px-4 py-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</p>
            {description ? <p className="mx-auto mt-1 max-w-md text-sm text-zinc-600 dark:text-zinc-400">{description}</p> : null}
            {action ? <div className="mt-3 flex justify-center">{action}</div> : null}
        </div>
    )
}

// --- form fields -----------------------------------------------------------

export function FormField({
    id,
    label,
    optional,
    hint,
    error,
    children,
    className = '',
}: {
    id: string
    label: string
    optional?: boolean
    hint?: string
    error?: string
    children: ReactNode
    className?: string
}) {
    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1 flex items-baseline justify-between gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <span>{label}</span>
                {optional ? <span className="text-xs font-normal text-zinc-600 dark:text-zinc-400">Optional</span> : null}
            </label>
            {children}
            {error ? (
                <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">
                    {error}
                </p>
            ) : hint ? (
                <p id={`${id}-hint`} className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {hint}
                </p>
            ) : null}
        </div>
    )
}

type FieldProps = { id: string; label: string; optional?: boolean; hint?: string; error?: string; fieldClassName?: string }

function describedBy(id: string, error?: string, hint?: string) {
    return error ? `${id}-error` : hint ? `${id}-hint` : undefined
}

export function TextInput({ id, label, optional, hint, error, fieldClassName, className = '', ...rest }: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id'>) {
    return (
        <FormField id={id} label={label} optional={optional} hint={hint} error={error} className={fieldClassName}>
            <input
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy(id, error, hint)}
                className={`${inputClass} ${error ? inputInvalid : ''} ${className}`}
                {...rest}
            />
        </FormField>
    )
}

export function TextArea({ id, label, optional, hint, error, fieldClassName, className = '', ...rest }: FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>) {
    return (
        <FormField id={id} label={label} optional={optional} hint={hint} error={error} className={fieldClassName}>
            <textarea
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy(id, error, hint)}
                className={`${inputClass} ${error ? inputInvalid : ''} ${className}`}
                {...rest}
            />
        </FormField>
    )
}

export function SelectInput({
    id,
    label,
    optional,
    hint,
    error,
    fieldClassName,
    className = '',
    children,
    ...rest
}: FieldProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'>) {
    return (
        <FormField id={id} label={label} optional={optional} hint={hint} error={error} className={fieldClassName}>
            <select
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy(id, error, hint)}
                className={`${inputClass} ${error ? inputInvalid : ''} ${className}`}
                {...rest}
            >
                {children}
            </select>
        </FormField>
    )
}

/** Accessible on/off switch. Solid colours; label is supplied by the caller (`aria-labelledby`). */
export function Switch({
    checked,
    onChange,
    disabled,
    labelledBy,
}: {
    checked: boolean
    onChange: (next: boolean) => void
    disabled?: boolean
    labelledBy: string
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-labelledby={labelledBy}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 dark:focus-visible:ring-primary-400 dark:focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed ${
                checked
                    ? 'border-primary-700 bg-primary-700 disabled:border-zinc-400 disabled:bg-zinc-400 dark:disabled:border-zinc-600 dark:disabled:bg-zinc-600'
                    : 'border-zinc-400 bg-zinc-300 dark:border-zinc-600 dark:bg-zinc-700'
            }`}
        >
            <span
                aria-hidden
                className={`inline-block h-5 w-5 rounded-full bg-white ${checked ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    )
}
