'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { AlertCircle, ChevronLeft, ChevronRight, ClipboardList, LogIn, Plus } from 'lucide-react'
import { AccountMobileHeader } from '@/components/account/AccountShell'
import RFQStatusBadge from '@/components/RFQ/RFQStatusBadge'
import { tryOpenAuthModalFromBridge } from '@/lib/authModalBridge'
import { formatDate, listRequests, parseRfqError, timeLeft, type RFQRow, type RFQStatus } from '@/lib/rfqApi'

type Tab = { value: RFQStatus | ''; label: string }

const TABS: Tab[] = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'open', label: 'Open' },
    { value: 'quoting', label: 'Quoting' },
    { value: 'awarded', label: 'Awarded' },
    { value: 'closed', label: 'Closed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'expired', label: 'Expired' },
]

const PRIMARY_LINK =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-bold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400'

function quotesLabel(r: RFQRow): string {
    if (r.status === 'draft') return 'Not posted'
    if (r.quote_count === 0) return 'No quotes yet'
    return `${r.quote_count} quote${r.quote_count === 1 ? '' : 's'}`
}

function RowLink({ r }: { r: RFQRow }) {
    const live = r.status === 'open' || r.status === 'quoting'
    const meta = [r.reference, r.category?.name].filter(Boolean).join(' · ')
    return (
        <Link
            href={`/account/requests/${encodeURIComponent(r.id)}`}
            className="block px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 md:grid md:grid-cols-[minmax(0,1fr)_110px_120px_110px_96px] md:items-center md:gap-3"
        >
            <div className="min-w-0">
                <div className="flex items-start justify-between gap-2 md:block">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100 md:line-clamp-1">{r.title}</p>
                    <RFQStatusBadge status={r.status} className="shrink-0 md:hidden" />
                </div>
                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-mono">{meta}</span>
                </p>
            </div>
            <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300 md:hidden">
                <span className="font-semibold">
                    {r.quantity.toLocaleString('en-GB')} {r.unit}
                </span>
                {' · '}
                <span className={r.quote_count > 0 ? 'font-semibold text-primary-700 dark:text-primary-400' : ''}>{quotesLabel(r)}</span>
                {live ? ` · ${timeLeft(r.closes_at)}` : ''}
                {' · '}
                Posted {formatDate(r.created_on)}
            </p>
            <p className="hidden text-sm text-zinc-800 dark:text-zinc-200 md:block">
                {r.quantity.toLocaleString('en-GB')} {r.unit}
            </p>
            <p className={`hidden text-sm md:block ${r.quote_count > 0 ? 'font-semibold text-primary-700 dark:text-primary-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                {quotesLabel(r)}
                {live ? <span className="block text-xs font-normal text-zinc-500 dark:text-zinc-400">{timeLeft(r.closes_at)}</span> : null}
            </p>
            <p className="hidden text-sm text-zinc-600 dark:text-zinc-400 md:block">{formatDate(r.created_on)}</p>
            <div className="hidden md:block">
                <RFQStatusBadge status={r.status} />
            </div>
        </Link>
    )
}

function Skeleton() {
    return (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800" aria-busy="true" aria-label="Loading requests">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2 px-3 py-3">
                    <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
                </div>
            ))}
        </div>
    )
}

export default function RequestsList() {
    const isAuthenticated = useIsAuthenticated()
    const [mounted, setMounted] = useState(false)
    const [status, setStatus] = useState<RFQStatus | ''>('')
    const [page, setPage] = useState(1)
    useEffect(() => setMounted(true), [])

    const signedIn = mounted && isAuthenticated
    const { data, error, isLoading, isValidating, mutate } = useSWR(
        signedIn ? ['rfq-list', status, page] : null,
        () => listRequests({ status, page }),
        { keepPreviousData: true }
    )

    const selectTab = (value: RFQStatus | '') => {
        setStatus(value)
        setPage(1)
    }

    const rows = data?.results ?? []
    const parsedError = error ? parseRfqError(error) : null
    const openSignIn = () => tryOpenAuthModalFromBridge('login')

    return (
        <div className="space-y-3">
            <AccountMobileHeader title="My requests" />
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="font-syne text-lg font-bold leading-tight text-zinc-900 dark:text-zinc-100 sm:text-xl">My requests</h1>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">Requests for quotation you have posted.</p>
                </div>
                <Link href="/rfq" className={PRIMARY_LINK}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    <span>
                        New<span className="hidden sm:inline"> request</span>
                    </span>
                </Link>
            </div>

            <div
                role="tablist"
                aria-label="Filter requests by status"
                className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                {TABS.map((t) => {
                    const active = t.value === status
                    return (
                        <button
                            key={t.label}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => selectTab(t.value)}
                            className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 ${
                                active
                                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                                    : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                            }`}
                        >
                            {t.label}
                        </button>
                    )
                })}
            </div>

            <section aria-live="polite" className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                {mounted && !isAuthenticated ? (
                    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                        <LogIn className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Sign in to see your requests.</p>
                        <button type="button" onClick={openSignIn} className={PRIMARY_LINK}>
                            Sign in
                        </button>
                    </div>
                ) : !mounted || (isLoading && !data) ? (
                    <Skeleton />
                ) : error && !data ? (
                    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                        <AlertCircle className="h-8 w-8 text-red-700 dark:text-red-400" aria-hidden="true" />
                        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{parsedError?.message}</p>
                        <button
                            type="button"
                            onClick={() => mutate()}
                            className="inline-flex min-h-[44px] items-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400"
                        >
                            Try again
                        </button>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                        <ClipboardList className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                        {status === '' ? (
                            <>
                                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">You haven&apos;t posted any requests yet.</p>
                                <Link href="/rfq" className={PRIMARY_LINK}>
                                    Post a request
                                </Link>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                    No {TABS.find((t) => t.value === status)?.label.toLowerCase()} requests.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => selectTab('')}
                                    className="inline-flex min-h-[44px] items-center rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400"
                                >
                                    Show all requests
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="hidden grid-cols-[minmax(0,1fr)_110px_120px_110px_96px] gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-400 md:grid">
                            <span>Request</span>
                            <span>Quantity</span>
                            <span>Quotes</span>
                            <span>Posted</span>
                            <span>Status</span>
                        </div>
                        <ul className={`divide-y divide-zinc-200 dark:divide-zinc-800 ${isValidating ? 'opacity-70' : ''}`}>
                            {rows.map((r) => (
                                <li key={r.id}>
                                    <RowLink r={r} />
                                </li>
                            ))}
                        </ul>
                        {data && (data.next || data.previous) ? (
                            <nav aria-label="Pagination" className="flex items-center justify-between gap-2 border-t border-zinc-200 dark:border-zinc-800 p-2">
                                <button
                                    type="button"
                                    disabled={!data.previous}
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                    Previous
                                </button>
                                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                                    Page {page} · {data.count} request{data.count === 1 ? '' : 's'}
                                </span>
                                <button
                                    type="button"
                                    disabled={!data.next}
                                    onClick={() => setPage((p) => p + 1)}
                                    className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 disabled:opacity-50"
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </nav>
                        ) : null}
                    </>
                )}
            </section>
        </div>
    )
}
