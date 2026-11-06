import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { CARD, LINK_BTN } from './ui'

interface StepSectionProps {
    number: number
    title: string
    /** Section is the one currently expanded. */
    open: boolean
    /** Step has everything it needs. */
    complete: boolean
    /** One-line summary shown when collapsed and complete. */
    summary?: ReactNode
    onChange: () => void
    /** Hide the "Change" link (e.g. nothing to change). */
    locked?: boolean
    /** Text of the link that re-opens a completed section. */
    changeLabel?: string
    children: ReactNode
}

/** Amazon-style numbered checkout card: expanded form, or a one-line summary with a Change link. */
export default function StepSection({ number, title, open, complete, summary, onChange, locked = false, changeLabel = 'Change', children }: StepSectionProps) {
    const id = `checkout-step-${number}`
    return (
        <section aria-labelledby={id} className={CARD}>
            <div className="flex items-start gap-3 p-3 sm:p-4">
                <span
                    aria-hidden="true"
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        complete && !open
                            ? 'bg-primary-700 text-white'
                            : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    }`}
                >
                    {complete && !open ? <Check className="h-3.5 w-3.5" /> : number}
                </span>
                <div className="min-w-0 flex-1">
                    <h2
                        id={id}
                        className={`text-base font-bold leading-6 ${
                            open || complete ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'
                        }`}
                    >
                        {title}
                    </h2>
                    {!open && complete && summary ? (
                        <div className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{summary}</div>
                    ) : null}
                </div>
                {!open && complete && !locked ? (
                    <button type="button" onClick={onChange} aria-label={`${changeLabel}: ${title.toLowerCase()}`} className={LINK_BTN}>
                        {changeLabel}
                    </button>
                ) : null}
            </div>
            {open ? (
                <div className="border-t border-zinc-200 p-3 dark:border-zinc-800 sm:p-4">{children}</div>
            ) : null}
        </section>
    )
}
