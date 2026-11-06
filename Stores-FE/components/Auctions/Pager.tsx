import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PagerProps {
    page: number
    pageSize: number
    count: number
    onChange: (page: number) => void
    className?: string
}

const BTN =
    'inline-flex h-11 items-center gap-1 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-100 disabled:text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:disabled:border-zinc-800 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950 sm:h-9'

/** Previous / next pager for DRF page-number pagination. Renders nothing for a single page. */
export default function Pager({ page, pageSize, count, onChange, className = '' }: PagerProps) {
    const pages = Math.max(1, Math.ceil(count / pageSize))
    if (pages <= 1) return null
    return (
        <nav aria-label="Pagination" className={`flex items-center justify-center gap-3 ${className}`}>
            <button type="button" className={BTN} disabled={page <= 1} onClick={() => onChange(page - 1)}>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
            </button>
            <span className="text-sm text-zinc-700 dark:text-zinc-300" aria-live="polite">
                Page {page} of {pages}
            </span>
            <button type="button" className={BTN} disabled={page >= pages} onClick={() => onChange(page + 1)}>
                Next
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
        </nav>
    )
}
