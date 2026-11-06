import type { QuoteStatus, RFQStatus } from '@/lib/rfqApi'

const RFQ_STYLES: Record<RFQStatus, { label: string; cls: string }> = {
    draft: { label: 'Draft', cls: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200' },
    open: { label: 'Open', cls: 'bg-sky-100 dark:bg-sky-900 text-sky-900 dark:text-sky-100' },
    quoting: { label: 'Quoting', cls: 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100' },
    awarded: { label: 'Awarded', cls: 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100' },
    closed: { label: 'Closed', cls: 'bg-zinc-800 text-white dark:bg-zinc-600 dark:text-zinc-50' },
    cancelled: { label: 'Cancelled', cls: 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100' },
    expired: { label: 'Expired', cls: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' },
}

const QUOTE_STYLES: Record<QuoteStatus, { label: string; cls: string }> = {
    submitted: { label: 'Submitted', cls: 'bg-sky-100 dark:bg-sky-900 text-sky-900 dark:text-sky-100' },
    accepted: { label: 'Awarded', cls: 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100' },
    not_selected: { label: 'Not selected', cls: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' },
    withdrawn: { label: 'Withdrawn', cls: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' },
}

type Props =
    | { kind?: 'rfq'; status: RFQStatus; className?: string }
    | { kind: 'quote'; status: QuoteStatus; className?: string }

/** Solid status chip for requests and quotes. */
export default function RFQStatusBadge(props: Props) {
    const style =
        props.kind === 'quote' ? QUOTE_STYLES[props.status] : RFQ_STYLES[props.status as RFQStatus]
    const { label, cls } = style ?? { label: String(props.status), cls: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' }
    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 text-xs font-bold leading-5 ${cls} ${props.className ?? ''}`}
        >
            {label}
        </span>
    )
}
