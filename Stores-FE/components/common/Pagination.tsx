'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ReactNode } from 'react'

interface PaginationProps {
    current: number
    total: number
    pageSize: number
    onChange: (page: number) => void
    className?: string
    showSummary?: boolean
    summary?: ReactNode
    baseBtnClassName?: string
    activeBtnClassName?: string
    inactiveBtnClassName?: string
    navGapClassName?: string
    ellipsisClassName?: string
    summaryClassName?: string
}

export default function Pagination({
    current,
    total,
    pageSize,
    onChange,
    className = 'flex flex-col items-center gap-4 mt-10',
    showSummary = true,
    summary,
    baseBtnClassName = 'flex items-center justify-center h-10 min-w-[40px] px-2 rounded-xl text-sm font-medium transition-all active:scale-95',
    activeBtnClassName = 'bg-primary-container text-on-primary-container font-bold shadow-sm',
    inactiveBtnClassName = 'border border-outline-variant/20 text-on-surface-variant hover:border-primary hover:text-primary',
    navGapClassName = 'flex items-center gap-1.5',
    ellipsisClassName = 'px-1 text-outline text-sm',
    summaryClassName = 'text-xs text-on-surface-variant',
}: PaginationProps) {
    const totalPages = Math.ceil(total / pageSize)
    if (totalPages <= 1) return null

    const pages: (number | '...')[] = []
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
        pages.push(1)
        if (current > 3) pages.push('...')
        for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
            pages.push(i)
        }
        if (current < totalPages - 2) pages.push('...')
        pages.push(totalPages)
    }

    return (
        <div className={className}>
            <div className={navGapClassName}>
                <button
                    onClick={() => onChange(current - 1)}
                    disabled={current === 1}
                    className={`${baseBtnClassName} border border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed`}
                    aria-label="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`dots-${i}`} className={ellipsisClassName}>
                            ...
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onChange(p as number)}
                            className={`${baseBtnClassName} ${current === p ? activeBtnClassName : inactiveBtnClassName}`}
                        >
                            {p}
                        </button>
                    )
                )}

                <button
                    onClick={() => onChange(current + 1)}
                    disabled={current === totalPages}
                    className={`${baseBtnClassName} border border-outline-variant/30 text-on-surface-variant hover:border-primary hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed`}
                    aria-label="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {showSummary && (
                <p className={summaryClassName}>
                    {summary ?? (
                        <>
                            Showing{' '}
                            <span className="font-bold text-on-surface">
                                {(current - 1) * pageSize + 1}–
                                {Math.min(current * pageSize, total).toLocaleString()}
                            </span>{' '}
                            of <span className="font-bold text-on-surface">{total.toLocaleString()}</span>{' '}
                            results
                        </>
                    )}
                </p>
            )}
        </div>
    )
}
