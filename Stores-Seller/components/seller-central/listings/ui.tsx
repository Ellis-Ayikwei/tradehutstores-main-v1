'use client'

import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useDialogA11y } from '@/hooks/useDialogA11y'

/* Small local primitives for the listings screens: Tailwind only, solid colours, light + dark. */

export const cx = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(' ')

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1 dark:focus-visible:ring-primary-400 dark:focus-visible:ring-offset-zinc-900'

export const panelCls = 'rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900'
export const mutedText = 'text-zinc-500 dark:text-zinc-400'
export const headingCls = 'text-sm font-bold text-zinc-900 dark:text-zinc-100'
export const linkBtn = `font-semibold text-primary-700 underline hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 ${FOCUS} rounded-sm`

const btnBase = `inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${FOCUS}`
export const btnPrimary = `${btnBase} bg-primary-700 text-white hover:bg-primary-800 disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500`
export const btnSecondary = `${btnBase} border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500`
export const btnDanger = `${btnBase} bg-red-700 text-white hover:bg-red-800 disabled:bg-zinc-200 disabled:text-zinc-500 dark:bg-red-600 dark:hover:bg-red-700 dark:disabled:bg-zinc-800`
export const btnGhost = `${btnBase} text-zinc-700 hover:bg-zinc-100 disabled:text-zinc-400 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:disabled:text-zinc-600`
/** Compact secondary button for dense rows (still 44px tall on touch). */
export const btnSmall = 'min-h-11 px-3 sm:min-h-9'

const controlBase = `block w-full rounded-md border bg-white px-3 text-base text-zinc-900 placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 ${FOCUS}`
const controlBorder = (invalid?: boolean) => (invalid ? 'border-red-600 dark:border-red-400' : 'border-zinc-300 dark:border-zinc-700')

interface ControlProps {
    invalid?: boolean
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & ControlProps>(function TextInput({ invalid, className, ...rest }, ref) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cx(controlBase, controlBorder(invalid), 'h-11', className)} {...rest} />
})

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & ControlProps>(function TextArea({ invalid, className, ...rest }, ref) {
    return <textarea ref={ref} aria-invalid={invalid || undefined} className={cx(controlBase, controlBorder(invalid), 'py-2', className)} {...rest} />
})

export const SelectInput = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & ControlProps>(function SelectInput({ invalid, className, children, ...rest }, ref) {
    return (
        <select ref={ref} aria-invalid={invalid || undefined} className={cx(controlBase, controlBorder(invalid), 'h-11', className)} {...rest}>
            {children}
        </select>
    )
})

interface FieldProps {
    label: string
    error?: string
    hint?: string
    className?: string
    /** Render-prop so the control gets the generated id and aria wiring. */
    children: (props: { id: string; invalid: boolean; 'aria-describedby'?: string }) => ReactNode
    /** Hides the label visually (it stays for screen readers). */
    srOnlyLabel?: boolean
    /** Extra classes for the label, e.g. `md:sr-only` for table-like rows. */
    labelClassName?: string
}

export function Field({ label, error, hint, className, children, srOnlyLabel, labelClassName }: FieldProps) {
    const id = useId()
    const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
    return (
        <div className={cx('min-w-0 space-y-1', className)}>
            <label htmlFor={id} className={cx('block text-sm font-semibold text-zinc-900 dark:text-zinc-100', srOnlyLabel && 'sr-only', labelClassName)}>
                {label}
            </label>
            {children({ id, invalid: Boolean(error), 'aria-describedby': describedBy })}
            {error ? (
                <p id={`${id}-error`} className="text-xs font-medium text-red-700 dark:text-red-400">
                    {error}
                </p>
            ) : hint ? (
                <p id={`${id}-hint`} className={cx('text-xs', mutedText)}>
                    {hint}
                </p>
            ) : null}
        </div>
    )
}

interface ToggleProps {
    checked: boolean
    onChange: (next: boolean) => void
    label: string
    disabled?: boolean
    id?: string
}

/** Accessible on/off switch (button with role=switch). The 44px hit area comes from the wrapping button. */
export function Toggle({ checked, onChange, label, disabled, id }: ToggleProps) {
    return (
        <button
            type="button"
            id={id}
            role="switch"
            aria-checked={checked}
            aria-label={label}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cx('inline-flex h-11 w-12 shrink-0 items-center justify-center rounded-md disabled:cursor-not-allowed', FOCUS)}
        >
            <span className={cx('relative inline-block h-6 w-11 rounded-full transition-colors', checked ? 'bg-primary-700' : 'bg-zinc-400 dark:bg-zinc-600', disabled && 'bg-zinc-300 dark:bg-zinc-700')}>
                <span className={cx('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', checked ? 'left-[1.375rem]' : 'left-0.5')} />
            </span>
        </button>
    )
}

type Tone = 'info' | 'warning' | 'success' | 'error'

const TONES: Record<Tone, string> = {
    info: 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
    warning: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
    success: 'border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
    error: 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
}

export function Banner({ tone, children, role, className }: { tone: Tone; children: ReactNode; role?: 'status' | 'alert' | 'note'; className?: string }) {
    const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertTriangle
    return (
        <div role={role ?? (tone === 'error' ? 'alert' : 'status')} className={cx('flex items-start gap-2 rounded-md border p-3 text-sm', TONES[tone], className)}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    )
}

export function Skeleton({ className }: { className?: string }) {
    return <div className={cx('animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800', className)} aria-hidden="true" />
}

/* ------------------------------------------------------------------- Modal */

interface ModalProps {
    open: boolean
    onClose: () => void
    title: string
    description?: string
    children?: ReactNode
    footer?: ReactNode
    /** Block closing while a request is in flight. */
    locked?: boolean
}

/** Bottom sheet on mobile, centred card from `sm`. Focus trap, Escape and scroll lock come from useDialogA11y. */
export function Modal({ open, onClose, title, description, children, footer, locked }: ModalProps) {
    const ref = useRef<HTMLDivElement>(null)
    const titleId = useId()
    const descId = useId()
    useDialogA11y(open, ref, () => {
        if (!locked) onClose()
    })
    if (!open || typeof document === 'undefined') return null
    return createPortal(
        <div className="fixed inset-0 z-[600] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && !locked && onClose()}>
            <div
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
                className="max-h-[90vh] w-full overflow-y-auto rounded-t-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:max-w-md sm:rounded-md sm:p-5"
            >
                <div className="flex items-start justify-between gap-2">
                    <h2 id={titleId} className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {title}
                    </h2>
                    <button type="button" onClick={onClose} disabled={locked} aria-label="Close" className={cx('-mr-2 -mt-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800', FOCUS)}>
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
                {description ? (
                    <p id={descId} className={cx('mt-1 text-sm', mutedText)}>
                        {description}
                    </p>
                ) : null}
                {children ? <div className="mt-3">{children}</div> : null}
                {footer ? <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div> : null}
            </div>
        </div>,
        document.body
    )
}

/* ------------------------------------------------------------------- Toast */

type ToastTone = 'success' | 'error' | 'info'
interface ToastItem {
    id: number
    tone: ToastTone
    message: string
}
interface ToastApi {
    success: (message: string) => void
    error: (message: string) => void
    info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const TOAST_TONE: Record<ToastTone, string> = {
    success: 'border-green-700 bg-green-700 text-white dark:border-green-600 dark:bg-green-600',
    error: 'border-red-700 bg-red-700 text-white dark:border-red-600 dark:bg-red-600',
    info: 'border-zinc-800 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900',
}

/** A tiny local toast stack (no dependency). Wrap a screen once; call `useToast()` anywhere inside. */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<ToastItem[]>([])
    const nextId = useRef(1)
    const timers = useRef<number[]>([])

    useEffect(() => {
        const list = timers.current
        return () => list.forEach((t) => window.clearTimeout(t))
    }, [])

    const push = useCallback((tone: ToastTone, message: string) => {
        const id = nextId.current++
        setItems((prev) => [...prev.slice(-2), { id, tone, message }])
        timers.current.push(window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), tone === 'error' ? 7000 : 4000))
    }, [])

    const api = useMemo<ToastApi>(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push])

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[700] flex flex-col items-center gap-2 px-3 lg:bottom-6" aria-live="polite" role="status">
                {items.map((t) => (
                    <div key={t.id} className={cx('pointer-events-auto flex max-w-md items-center gap-2 rounded-md border py-1 pl-3 pr-1 text-sm font-medium shadow-sm', TOAST_TONE[t.tone])}>
                        <span className="min-w-0 flex-1 py-1">{t.message}</span>
                        <button type="button" onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))} aria-label="Dismiss" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md">
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast(): ToastApi {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
    return ctx
}

/* ------------------------------------------------------------- Error panel */

export function ErrorPanel({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
    return (
        <Banner tone="error" role="alert">
            <p className="font-semibold">{title}</p>
            <p className="mt-0.5">{message}</p>
            {onRetry ? (
                <button type="button" onClick={onRetry} className={cx('mt-1.5', linkBtn)}>
                    Try again
                </button>
            ) : null}
        </Banner>
    )
}
