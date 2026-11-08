import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react'

/** Focus ring that is visible on both themes (ring offset matches the card surface). */
export const FOCUS =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-primary-400 dark:focus-visible:ring-offset-zinc-900'

/** Text-link styled button, 44px tall on mobile. */
export const LINK_BTN = `inline-flex min-h-[44px] items-center text-sm text-primary-700 hover:text-primary-800 hover:underline dark:text-primary-400 dark:hover:text-primary-300 disabled:cursor-not-allowed disabled:text-zinc-400 disabled:no-underline dark:disabled:text-zinc-500 sm:min-h-[32px] ${FOCUS}`

export const CARD = 'rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'

export const INPUT_BASE =
    'h-11 w-full rounded-md border bg-white px-3 text-base text-zinc-900 placeholder:text-zinc-400 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400'

export const inputClass = (hasError: boolean) =>
    `${INPUT_BASE} ${hasError ? 'border-red-600 dark:border-red-400' : 'border-zinc-300 dark:border-zinc-700'}`

export const BTN_PRIMARY = `inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary-700 px-5 text-sm font-semibold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-600 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400 ${FOCUS}`

export const BTN_SECONDARY = `inline-flex h-11 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:disabled:text-zinc-500 ${FOCUS}`

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
    return <Loader2 className={`${className} animate-spin`} aria-hidden="true" />
}

type Tone = 'error' | 'warning' | 'success' | 'info'

const TONES: Record<Tone, string> = {
    error: 'border-red-700 bg-red-600 text-white dark:border-red-600 dark:bg-red-700 dark:text-white',
    warning: 'border-amber-600 bg-amber-500 text-zinc-950 dark:border-amber-500 dark:bg-amber-600 dark:text-zinc-950',
    success:
        'border-emerald-700 bg-emerald-600 text-white dark:border-emerald-600 dark:bg-emerald-700 dark:text-white',
    info: 'border-zinc-700 bg-zinc-800 text-white dark:border-zinc-600 dark:bg-zinc-800 dark:text-white',
}

export function Banner({
    tone,
    children,
    action,
    onDismiss,
    className = '',
}: {
    tone: Tone
    children: ReactNode
    action?: ReactNode
    onDismiss?: () => void
    className?: string
}) {
    const Icon = tone === 'success' ? CheckCircle2 : tone === 'info' ? Info : AlertTriangle
    return (
        <div
            role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${TONES[tone]} ${className}`}
        >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 space-y-1">{children}</div>
            {action}
            {onDismiss ? (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Dismiss message"
                    className={`-my-1 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 sm:h-9 sm:w-9 ${FOCUS}`}
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>
            ) : null}
        </div>
    )
}

/** The honest fallback shown whenever the checkout endpoints are not reachable. */
export function OrderingUnavailable({ className = '' }: { className?: string }) {
    return (
        <Banner tone="warning" className={className}>
            <p className="font-semibold">Online ordering isn&apos;t available right now.</p>
            <p>
                Call us on{' '}
                <a href="tel:+233248138722" className="font-semibold underline hover:no-underline">
                    024 813 8722
                </a>{' '}
                or message us on{' '}
                <a
                    href="https://wa.me/233248138722"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline hover:no-underline"
                >
                    WhatsApp
                </a>
                .
            </p>
        </Banner>
    )
}

/** Radio option row. `selected` drives the themed border/background. */
export function OptionRow({
    name,
    value,
    selected,
    onSelect,
    children,
    disabled = false,
}: {
    name: string
    value: string
    selected: boolean
    onSelect: () => void
    children: ReactNode
    disabled?: boolean
}) {
    return (
        <label
            className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border p-3 focus-within:ring-2 focus-within:ring-primary-700 dark:focus-within:ring-primary-400 ${
                selected
                    ? 'border-primary-700 bg-primary-700 text-white dark:border-primary-400 dark:bg-primary-600 dark:text-white'
                    : 'border-zinc-200 bg-white hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500 dark:text-zinc-100'
            } ${disabled ? 'cursor-not-allowed !bg-zinc-100 !text-zinc-500 dark:!bg-zinc-800 dark:!text-zinc-500' : ''}`}
        >
            <input
                type="radio"
                name={name}
                value={value}
                checked={selected}
                disabled={disabled}
                onChange={onSelect}
                className="mt-1 h-4 w-4 shrink-0 accent-primary-700 focus:outline-none dark:accent-primary-400"
            />
            <div className="min-w-0 flex-1 text-sm">{children}</div>
        </label>
    )
}