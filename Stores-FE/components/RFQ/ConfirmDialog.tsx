'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { AlertCircle, Loader2, X } from 'lucide-react'

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type Props = {
    open: boolean
    title: string
    children: ReactNode
    confirmLabel: string
    cancelLabel?: string
    /** "primary" = brand, "danger" = solid red. */
    tone?: 'primary' | 'danger'
    busy?: boolean
    error?: string | null
    onConfirm: () => void
    onClose: () => void
}

/**
 * Minimal accessible confirm dialog: bottom sheet on mobile, centred card from sm.
 * Esc closes, Tab is trapped, focus returns to the trigger.
 */
export default function ConfirmDialog({
    open,
    title,
    children,
    confirmLabel,
    cancelLabel = 'Keep as is',
    tone = 'primary',
    busy = false,
    error,
    onConfirm,
    onClose,
}: Props) {
    const ref = useRef<HTMLDivElement | null>(null)
    const busyRef = useRef(busy)
    busyRef.current = busy
    const closeRef = useRef(onClose)
    closeRef.current = onClose

    useEffect(() => {
        if (!open) return
        const trigger = document.activeElement as HTMLElement | null
        const root = ref.current
        const items = () => (root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)) : [])
        items()[0]?.focus()
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busyRef.current) {
                closeRef.current()
                return
            }
            if (e.key !== 'Tab') return
            const list = items()
            if (list.length === 0) return
            const first = list[0]
            const last = list[list.length - 1]
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault()
                last.focus()
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault()
                first.focus()
            }
        }
        document.addEventListener('keydown', onKey)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = prevOverflow
            trigger?.focus?.()
        }
    }, [open])

    if (!open) return null

    const confirmCls =
        tone === 'danger'
            ? 'bg-red-700 text-white hover:bg-red-800'
            : 'bg-primary-700 text-white hover:bg-primary-800'

    return (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="presentation">
            <div className="absolute inset-0 bg-black/50" onClick={busy ? undefined : onClose} aria-hidden="true" />
            <div
                ref={ref}
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className="relative flex max-h-[90vh] w-full flex-col rounded-t-2xl bg-white dark:bg-zinc-900 shadow-xl sm:max-w-md sm:rounded-2xl"
            >
                <div className="flex items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2">
                    <h2 className="font-syne text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        aria-label="Close"
                        className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400"
                    >
                        <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                </div>
                <div className="space-y-3 overflow-y-auto px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
                    {children}
                    {error ? (
                        <p
                            role="alert"
                            className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950 p-2.5 text-sm font-medium text-red-800 dark:text-red-100"
                        >
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{error}</span>
                        </p>
                    ) : null}
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-zinc-200 dark:border-zinc-800 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={busy}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 ${confirmCls}`}
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
