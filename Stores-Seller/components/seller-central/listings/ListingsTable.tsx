'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import useSWR, { mutate as globalMutate } from 'swr'
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Loader2, Package, Pencil, Plus, Search, X } from 'lucide-react'
import {
    EmptyPanel,
    ErrorPanel,
    PageHeader,
    Skeleton,
    StatusBadge,
    btnPrimary,
    btnSecondary,
    btnSmall,
    inputClass,
    type Tone,
} from '@/components/seller-central/ui'
import { fetchSellerListings, formatMoney, LOW_STOCK_THRESHOLD, setListingStatus, toListingSaveError, type ListingApiError, type ListingRow, type Paginated } from '@/lib/seller/listings'
import { isSellerProductKey, isSellerStatsKey } from '@/hooks/useSellerKeys'
import { useSellerProfile } from '@/hooks/useSellerProfile'
import { takeFlash } from './flash'
import { NotSellerState } from './NotSellerState'
import { Banner, Modal, ToastProvider, btnDanger, cx, useToast } from './ui'

const NEW_LISTING_HREF = '/seller-central/listings/new'
const editHref = (id: string) => `/seller-central/listings/${encodeURIComponent(id)}/edit`

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, keepPreviousData: true } as const

type TabId = 'all' | 'active' | 'draft' | 'low' | 'archived'

const TABS: { id: TabId; label: string; status: string; lowStock: boolean }[] = [
    { id: 'all', label: 'All', status: '', lowStock: false },
    { id: 'active', label: 'Active', status: 'Active', lowStock: false },
    { id: 'draft', label: 'Draft', status: 'Draft', lowStock: false },
    { id: 'low', label: 'Low stock', status: '', lowStock: true },
    { id: 'archived', label: 'Archived', status: 'Archived', lowStock: false },
]

const STATUS_TONE: Record<string, Tone> = {
    Active: 'success',
    Published: 'success',
    Draft: 'neutral',
    Pending: 'warning',
    Archived: 'neutral',
    Suspended: 'danger',
    Deactivated: 'danger',
}

interface SortState {
    id: 'name' | 'updated_at'
    desc: boolean
}

const DATE_ONLY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

function formatDate(value?: string | null): string {
    if (!value) return '-'
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? '-' : DATE_ONLY.format(d)
}

const isArchived = (row: ListingRow) => row.status === 'Archived'
const canArchive = (row: ListingRow) => row.status !== 'Archived' && row.status !== 'Suspended' && row.status !== 'Deleted'

function priceText(row: ListingRow): string {
    const currency = row.pricing_currency
    const prices = (row.variants ?? []).map((v) => Number(v.price)).filter((n) => Number.isFinite(n))
    if (prices.length > 1) {
        const lo = Math.min(...prices)
        const hi = Math.max(...prices)
        if (lo !== hi) return `${formatMoney(lo, currency)} - ${formatMoney(hi, currency)}`
    }
    return formatMoney(row.primary_variant_price, currency)
}

function stockInfo(row: ListingRow): { total: number; label: string; tone: Tone | null } {
    const total = row.variant_stock_total ?? 0
    const variants = row.variants ?? []
    const hasVariants = variants.length > 0 || row.primary_sku !== null
    if (hasVariants && total === 0) return { total, label: 'Out of stock', tone: 'danger' }
    const lowCount = variants.filter((v) => (v.quantity ?? 0) <= LOW_STOCK_THRESHOLD).length
    if (lowCount > 0 || (variants.length === 0 && total <= LOW_STOCK_THRESHOLD)) return { total, label: 'Low stock', tone: 'warning' }
    return { total, label: '', tone: null }
}

function Thumb({ row, size }: { row: ListingRow; size: 'sm' | 'md' }) {
    const box = size === 'md' ? 'h-14 w-14' : 'h-11 w-11'
    return (
        <span className={cx('relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400', box)}>
            {row.main_product_image ? (
                <Image src={row.main_product_image} alt="" fill sizes="56px" loading="lazy" className="object-contain p-1 mix-blend-multiply dark:mix-blend-normal" />
            ) : (
                <Package className="h-5 w-5" aria-hidden="true" />
            )}
        </span>
    )
}

function ListingStatus({ status }: { status: ListingRow['status'] }) {
    return <StatusBadge tone={STATUS_TONE[status ?? ''] ?? 'neutral'}>{status || 'No status'}</StatusBadge>
}

interface RowActionsProps {
    row: ListingRow
    busy: boolean
    /** Suspended stores can look but not change anything. */
    readOnly: boolean
    onArchive: (row: ListingRow) => void
    onRestore: (row: ListingRow) => void
}

function RowActions({ row, busy, readOnly, onArchive, onRestore }: RowActionsProps) {
    if (readOnly) return null
    return (
        <div className="flex items-center gap-1">
            <Link href={editHref(row.id)} className={cx(btnSecondary, btnSmall)} aria-label={`Edit ${row.name}`}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
            </Link>
            {isArchived(row) ? (
                <button type="button" className={cx(btnSecondary, btnSmall)} onClick={() => onRestore(row)} disabled={busy} aria-label={`Restore ${row.name} as draft`}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArchiveRestore className="h-4 w-4" aria-hidden="true" />}
                    <span className="hidden xl:inline">Restore</span>
                </button>
            ) : canArchive(row) ? (
                <button type="button" className={cx(btnSecondary, btnSmall)} onClick={() => onArchive(row)} disabled={busy} aria-label={`Archive ${row.name}`}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Archive className="h-4 w-4" aria-hidden="true" />}
                    <span className="hidden xl:inline">Archive</span>
                </button>
            ) : null}
        </div>
    )
}

function ListSkeleton() {
    return (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800" aria-busy="true" aria-label="Loading listings">
            {Array.from({ length: 6 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-11 w-11 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                </li>
            ))}
        </ul>
    )
}

function SortHeader({ label, id, sort, onSort, className }: { label: string; id: SortState['id']; sort: SortState; onSort: (id: SortState['id']) => void; className?: string }) {
    const active = sort.id === id
    return (
        <th scope="col" className={cx('px-3 py-2 font-medium', className)} aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'}>
            <button type="button" onClick={() => onSort(id)} className="inline-flex min-h-[44px] items-center gap-1 font-medium hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 dark:hover:text-zinc-100 md:min-h-[36px]">
                {label}
                {active ? sort.desc ? <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : null}
            </button>
        </th>
    )
}

function ListingsList() {
    const toast = useToast()
    const { readOnly } = useSellerProfile()
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [sort, setSort] = useState<SortState>({ id: 'updated_at', desc: true })
    const [draft, setDraft] = useState('')
    const [search, setSearch] = useState('')
    const [tab, setTab] = useState<TabId>('all')
    const [pendingArchive, setPendingArchive] = useState<ListingRow | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)

    useEffect(() => {
        const message = takeFlash()
        if (message) toast.success(message)
    }, [toast])

    useEffect(() => {
        const next = draft.trim()
        if (next === search) return
        const timer = window.setTimeout(() => {
            setSearch(next)
            setPage(1)
        }, 400)
        return () => window.clearTimeout(timer)
    }, [draft, search])

    const active = TABS.find((t) => t.id === tab) ?? TABS[0]
    const ordering = `${sort.desc ? '-' : ''}${sort.id}`

    const { data, error, isLoading, isValidating, mutate } = useSWR<Paginated<ListingRow>, ListingApiError>(
        ['seller:listings', page, pageSize, ordering, search, active.status, active.lowStock],
        () => fetchSellerListings({ page, pageSize, search, status: active.status, lowStock: active.lowStock, ordering }),
        SWR_OPTIONS
    )

    const changeStatus = async (row: ListingRow, status: 'Archived' | 'Draft', success: string) => {
        setBusyId(row.id)
        try {
            await setListingStatus(row.id, status)
            toast.success(success)
            // Drop the cached editor copies so the next edit opens the new status, not a stale snapshot.
            await globalMutate(isSellerProductKey, undefined, { revalidate: false })
            await mutate()
            void globalMutate(isSellerStatsKey)
        } catch (e) {
            toast.error(toListingSaveError(e).message)
        } finally {
            setBusyId(null)
        }
    }

    const onSort = (id: SortState['id']) => {
        setSort((s) => (s.id === id ? { id, desc: !s.desc } : { id, desc: id === 'updated_at' }))
        setPage(1)
    }

    const clearFilters = () => {
        setDraft('')
        setSearch('')
        setTab('all')
        setPage(1)
    }

    const rows = data?.results ?? []
    const total = data?.count ?? 0
    const pageCount = Math.max(1, Math.ceil(total / pageSize))

    // Archiving the last row on the last page leaves that page empty: step back to the new last page.
    useEffect(() => {
        if (data && page > pageCount) setPage(pageCount)
    }, [data, page, pageCount])

    if (error?.kind === 'forbidden') {
        return (
            <div className="space-y-3">
                <PageHeader title="Listings" />
                <NotSellerState message={error.message} />
            </div>
        )
    }

    const from = total === 0 ? 0 : (page - 1) * pageSize + 1
    const to = Math.min(total, page * pageSize)
    const filtered = Boolean(search) || tab !== 'all'

    const onRestore = (row: ListingRow) => void changeStatus(row, 'Draft', 'Restored as a draft')

    return (
        <div className="space-y-3">
            <PageHeader
                title="Listings"
                description="Manage the products you sell"
                actions={
                    readOnly ? null : (
                        <Link href={NEW_LISTING_HREF} className={btnPrimary}>
                            <Plus className="h-4 w-4" aria-hidden="true" />
                            Add listing
                        </Link>
                    )
                }
            />

            {readOnly ? <Banner tone="warning">Your store is suspended, so listings are read-only. You can still view them.</Banner> : null}

            <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                <div role="tablist" aria-label="Filter listings by status" className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
                    {TABS.map((t) => {
                        const selected = t.id === tab
                        return (
                            <button
                                key={t.id}
                                type="button"
                                role="tab"
                                aria-selected={selected}
                                onClick={() => {
                                    setTab(t.id)
                                    setPage(1)
                                }}
                                className={cx(
                                    'min-h-[44px] shrink-0 border-b-2 px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600 sm:px-4',
                                    selected
                                        ? 'border-primary-700 text-primary-700 dark:border-primary-400 dark:text-primary-400'
                                        : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                                )}
                            >
                                {t.label}
                            </button>
                        )
                    })}
                </div>

                <form
                    role="search"
                    onSubmit={(e) => {
                        e.preventDefault()
                        setSearch(draft.trim())
                        setPage(1)
                    }}
                    className="border-b border-zinc-200 p-3 dark:border-zinc-800"
                >
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                        <input type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search listings" aria-label="Search listings" className={cx(inputClass, 'pl-9 pr-11')} />
                        {draft ? (
                            <button
                                type="button"
                                aria-label="Clear search"
                                onClick={() => {
                                    setDraft('')
                                    setSearch('')
                                    setPage(1)
                                }}
                                className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        ) : null}
                    </div>
                </form>

                {isLoading && !data ? (
                    <ListSkeleton />
                ) : error && !data ? (
                    <div className="p-3">
                        <ErrorPanel title="Couldn't load your listings" message={error.message} onRetry={() => void mutate()} retrying={isValidating} />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="p-3">
                        {filtered ? (
                            <EmptyPanel
                                title="No listings match"
                                description="Try another tab or a different search."
                                action={
                                    <button type="button" className={btnSecondary} onClick={clearFilters}>
                                        Clear filters
                                    </button>
                                }
                            />
                        ) : (
                            <EmptyPanel
                                title="No listings yet"
                                description="Products you list for sale show up here with their stock and status."
                                action={
                                    readOnly ? undefined : (
                                        <Link href={NEW_LISTING_HREF} className={btnPrimary}>
                                            <Plus className="h-4 w-4" aria-hidden="true" />
                                            Add listing
                                        </Link>
                                    )
                                }
                            />
                        )}
                    </div>
                ) : (
                    <>
                        {error ? (
                            <div className="p-3">
                                <ErrorPanel title="Couldn't refresh your listings" message={error.message} onRetry={() => void mutate()} retrying={isValidating} />
                            </div>
                        ) : null}

                        {/* Cards under md */}
                        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 md:hidden">
                            {rows.map((row) => {
                                const info = stockInfo(row)
                                return (
                                    <li key={row.id} className="p-3">
                                        <div className="flex items-start gap-3">
                                            <Thumb row={row} size="md" />
                                            <div className="min-w-0 flex-1">
                                                <Link href={editHref(row.id)} className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:text-primary-700 hover:underline dark:text-zinc-100 dark:hover:text-primary-400">
                                                    {row.name}
                                                </Link>
                                                <p className="mt-0.5 truncate font-mono text-xs text-zinc-600 dark:text-zinc-400">{row.primary_sku ?? '-'}</p>
                                            </div>
                                            <ListingStatus status={row.status} />
                                        </div>
                                        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-sm">
                                            <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{priceText(row)}</span>
                                            <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                                                {info.total.toLocaleString()} in stock
                                                {info.tone ? <StatusBadge tone={info.tone}>{info.label}</StatusBadge> : null}
                                            </span>
                                        </div>
                                        {readOnly ? null : (
                                            <div className="mt-2">
                                                <RowActions row={row} busy={busyId === row.id} readOnly={readOnly} onArchive={setPendingArchive} onRestore={onRestore} />
                                            </div>
                                        )}
                                    </li>
                                )
                            })}
                        </ul>

                        {/* Table from md */}
                        <div className="hidden md:block">
                            <table className="w-full table-fixed border-collapse text-left text-sm">
                                <caption className="sr-only">Your listings</caption>
                                <thead>
                                    <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                                        <SortHeader label="Listing" id="name" sort={sort} onSort={onSort} />
                                        <th scope="col" className="hidden w-32 px-3 py-2 font-medium xl:table-cell">
                                            SKU
                                        </th>
                                        <th scope="col" className="w-36 px-3 py-2 font-medium lg:w-28 xl:w-36">
                                            Price
                                        </th>
                                        <th scope="col" className="w-36 px-3 py-2 font-medium lg:w-28 xl:w-36">
                                            Stock
                                        </th>
                                        <th scope="col" className="w-24 px-3 py-2 font-medium">
                                            Status
                                        </th>
                                        <SortHeader label="Updated" id="updated_at" sort={sort} onSort={onSort} className="hidden w-28 xl:table-cell" />
                                        <th scope="col" className="w-36 px-3 py-2 font-medium xl:w-52">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {rows.map((row) => {
                                        const info = stockInfo(row)
                                        const more = (row.variants?.length ?? 0) > 1 ? ` +${(row.variants?.length ?? 1) - 1}` : ''
                                        return (
                                            <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800">
                                                <td className="px-3 py-2 align-middle">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <Thumb row={row} size="sm" />
                                                        <div className="min-w-0">
                                                            <Link href={editHref(row.id)} className="block truncate font-semibold text-zinc-900 hover:text-primary-700 hover:underline dark:text-zinc-100 dark:hover:text-primary-400">
                                                                {row.name}
                                                            </Link>
                                                            {row.category_name ? <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">{row.category_name}</p> : null}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="hidden px-3 py-2 align-middle xl:table-cell">
                                                    {row.primary_sku ? (
                                                        <span className="block truncate font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                                            {row.primary_sku}
                                                            {more}
                                                        </span>
                                                    ) : (
                                                        <span className="text-zinc-600 dark:text-zinc-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 align-middle font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{priceText(row)}</td>
                                                <td className="px-3 py-2 align-middle">
                                                    <span className="inline-flex flex-wrap items-center gap-1.5 tabular-nums text-zinc-900 dark:text-zinc-100">
                                                        {info.total.toLocaleString()}
                                                        {info.tone ? <StatusBadge tone={info.tone}>{info.label}</StatusBadge> : null}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 align-middle">
                                                    <ListingStatus status={row.status} />
                                                </td>
                                                <td className="hidden whitespace-nowrap px-3 py-2 align-middle text-zinc-600 dark:text-zinc-400 xl:table-cell">{formatDate(row.updated_at)}</td>
                                                <td className="px-3 py-2 align-middle">
                                                    <RowActions row={row} busy={busyId === row.id} readOnly={readOnly} onArchive={setPendingArchive} onRestore={onRestore} />
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {from}-{to} of {total}
                                </p>
                                <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                                    <span className="hidden sm:inline">Per page</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => {
                                            setPageSize(Number(e.target.value))
                                            setPage(1)
                                        }}
                                        aria-label="Listings per page"
                                        className={cx(inputClass, 'w-auto py-1')}
                                    >
                                        {PAGE_SIZE_OPTIONS.map((n) => (
                                            <option key={n} value={n}>
                                                {n}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <button type="button" className={btnSecondary} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Previous page">
                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                    <span className="hidden sm:inline">Previous</span>
                                </button>
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {page} / {pageCount}
                                </span>
                                <button type="button" className={btnSecondary} disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        </nav>
                    </>
                )}
            </div>

            <Modal
                open={pendingArchive !== null}
                onClose={() => setPendingArchive(null)}
                title="Archive this listing?"
                description={pendingArchive ? `"${pendingArchive.name}" will be hidden from buyers. You can restore it later as a draft.` : undefined}
                footer={
                    <>
                        <button type="button" className={btnSecondary} onClick={() => setPendingArchive(null)}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className={btnDanger}
                            onClick={() => {
                                const row = pendingArchive
                                setPendingArchive(null)
                                if (row) void changeStatus(row, 'Archived', 'Listing archived')
                            }}
                        >
                            Archive
                        </button>
                    </>
                }
            />
        </div>
    )
}

export default function ListingsTable() {
    return (
        <ToastProvider>
            <ListingsList />
        </ToastProvider>
    )
}
