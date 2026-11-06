'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { AlertCircle, Gavel, Search, SlidersHorizontal, X } from 'lucide-react'
import { ProductGrid } from '@/components/common/marketplace'
import AuctionCard, { AuctionCardSkeleton } from '@/components/Auctions/AuctionCard'
import Pager from '@/components/Auctions/Pager'
import { useDialogA11y } from '@/components/Auctions/useDialogA11y'
import { useCatalogCategories } from '@/hooks/useCatalogCategories'
import {
    fetchAuctions,
    type AuctionListStatus,
    type AuctionSort,
    type AuctionsApiError,
    type Paginated,
    type AuctionCardData,
} from '@/lib/auctionsApi'

const PAGE_SIZE = 20

const TABS: Array<{ value: AuctionListStatus; label: string; empty: string; hint: string }> = [
    { value: 'live', label: 'Live', empty: 'No live auctions right now', hint: 'New auctions appear here as soon as sellers start them.' },
    { value: 'ending_soon', label: 'Ending soon', empty: 'No auctions are ending soon', hint: 'Auctions in their final hour show up here.' },
    { value: 'scheduled', label: 'Upcoming', empty: 'No upcoming auctions', hint: 'Scheduled auctions will be listed here before they start.' },
    { value: 'ended', label: 'Ended', empty: 'No ended auctions yet', hint: 'Finished auctions will be listed here.' },
]

const SORTS: Array<{ value: AuctionSort; label: string }> = [
    { value: 'ending_soonest', label: 'Ending soonest' },
    { value: 'newest', label: 'Newest' },
    { value: 'price_asc', label: 'Price: low to high' },
    { value: 'price_desc', label: 'Price: high to low' },
    { value: 'most_bids', label: 'Most bids' },
]

const FIELD =
    'h-11 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-900 focus:border-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400 dark:focus:border-primary-400 dark:focus:ring-primary-400 [color-scheme:light] dark:[color-scheme:dark] sm:h-10 sm:text-sm'
const BTN_PRIMARY =
    'inline-flex h-11 items-center justify-center rounded-full bg-primary-700 px-5 text-sm font-semibold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950'
const BTN_SECONDARY =
    'inline-flex h-11 items-center justify-center rounded-full border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'

type ListResponse = Paginated<AuctionCardData>

export default function AuctionsHubPage() {
    const [tab, setTab] = useState<AuctionListStatus>('live')
    const [searchInput, setSearchInput] = useState('')
    const [q, setQ] = useState('')
    const [category, setCategory] = useState('')
    const [sort, setSort] = useState<AuctionSort>('ending_soonest')
    const [page, setPage] = useState(1)
    const [sheetOpen, setSheetOpen] = useState(false)
    const sheetRef = useRef<HTMLDivElement>(null)
    const closeSheet = useCallback(() => setSheetOpen(false), [])
    // Focus trap, Escape to close, scroll lock and focus return to the Filter button.
    useDialogA11y(sheetOpen, sheetRef, closeSheet)
    const { categories } = useCatalogCategories()

    // Debounce the search box; reset to page 1 whenever any filter changes.
    useEffect(() => {
        const t = setTimeout(() => {
            setQ(searchInput.trim())
            setPage(1)
        }, 350)
        return () => clearTimeout(t)
    }, [searchInput])

    const selectTab = (next: AuctionListStatus) => {
        setTab(next)
        setSort(next === 'scheduled' || next === 'ended' ? 'newest' : 'ending_soonest')
        setPage(1)
    }

    const filtersActive = q !== '' || category !== ''
    const clearFilters = () => {
        setSearchInput('')
        setQ('')
        setCategory('')
        setPage(1)
    }

    const { data, error, isLoading, mutate } = useSWR<ListResponse, AuctionsApiError>(
        ['auctions', tab, q, category, sort, page],
        () => fetchAuctions({ status: tab, q, category, sort, page, page_size: PAGE_SIZE }),
        {
            refreshInterval: tab === 'live' || tab === 'ending_soon' ? 10000 : tab === 'scheduled' ? 30000 : 0,
            refreshWhenHidden: false,
            revalidateOnFocus: true,
        }
    )

    const { data: liveData } = useSWR<ListResponse, AuctionsApiError>(
        ['auctions-live-count'],
        () => fetchAuctions({ status: 'live', page_size: 1 }),
        { refreshInterval: 15000, refreshWhenHidden: false, shouldRetryOnError: false }
    )

    const refresh = useCallback(() => {
        void mutate()
    }, [mutate])

    const current = TABS.find(t => t.value === tab) ?? TABS[0]
    const results = data?.results ?? []
    const notReady = error?.status === 404

    const categorySelect = (
        <label className="block">
            <span className="sr-only">Category</span>
            <select
                value={category}
                onChange={e => {
                    setCategory(e.target.value)
                    setPage(1)
                }}
                className={`${FIELD} w-full`}
            >
                <option value="">All categories</option>
                {categories.map(c => (
                    <option key={c.id} value={c.id}>
                        {c.name}
                    </option>
                ))}
            </select>
        </label>
    )
    const sortSelect = (
        <label className="block">
            <span className="sr-only">Sort by</span>
            <select
                value={sort}
                onChange={e => {
                    setSort(e.target.value as AuctionSort)
                    setPage(1)
                }}
                className={`${FIELD} w-full`}
            >
                {SORTS.map(s => (
                    <option key={s.value} value={s.value}>
                        {s.label}
                    </option>
                ))}
            </select>
        </label>
    )

    return (
        <div className="mx-auto max-w-[1440px] space-y-3 px-3 py-3 sm:px-4 lg:space-y-4 lg:px-6">
            {/* Header: title + live count */}
            <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <Gavel className="h-5 w-5 shrink-0 text-primary-700 dark:text-primary-400" aria-hidden="true" />
                    <h1 className="truncate font-syne text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">Bid Central</h1>
                    {liveData ? (
                        <span className="shrink-0 rounded bg-emerald-700 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-white">
                            {liveData.count.toLocaleString()} live
                        </span>
                    ) : null}
                </div>
                <Link href="/account/bids" className="shrink-0 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400">
                    My bids
                </Link>
            </div>

            {/* Tabs */}
            <div role="tablist" aria-label="Auction status" className="grid grid-cols-4 border-b border-zinc-200 dark:border-zinc-800 sm:flex sm:gap-2">
                {TABS.map(t => {
                    const active = t.value === tab
                    return (
                        <button
                            key={t.value}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => selectTab(t.value)}
                            className={`-mb-px min-h-[44px] whitespace-nowrap border-b-2 px-1 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 sm:px-4 ${
                                active
                                    ? 'border-primary-700 text-primary-700 dark:border-primary-400 dark:text-primary-400'
                                    : 'border-transparent text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100'
                            }`}
                        >
                            {t.label}
                        </button>
                    )
                })}
            </div>

            {/* Toolbar: search + category + sort in one row (md+); search + filter button on mobile */}
            <div className="flex items-center gap-2">
                <label className="relative block min-w-0 flex-1">
                    <span className="sr-only">Search auctions</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                    <input
                        type="search"
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        placeholder="Search auctions"
                        className={`${FIELD} w-full pl-9`}
                    />
                </label>
                <div className="hidden w-44 md:block lg:w-52">{categorySelect}</div>
                <div className="hidden w-44 md:block lg:w-52">{sortSelect}</div>
                <button
                    type="button"
                    onClick={() => setSheetOpen(true)}
                    className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 md:hidden"
                >
                    <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                    Filter
                </button>
            </div>

            {/* Result line */}
            {data && results.length > 0 ? (
                <p className="text-sm text-zinc-700 dark:text-zinc-300" aria-live="polite">
                    {data.count.toLocaleString()} {data.count === 1 ? 'auction' : 'auctions'}
                    {filtersActive ? (
                        <button type="button" onClick={clearFilters} className="ml-2 font-semibold text-primary-700 hover:underline dark:text-primary-400">
                            Clear filters
                        </button>
                    ) : null}
                </p>
            ) : null}

            {/* Body */}
            {notReady ? (
                <StateBox
                    icon={<Gavel className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />}
                    title="Bid Central is getting ready"
                    body="Auctions are not available yet. Please check back soon, or keep shopping in the meantime."
                >
                    <Link href="/products" className={BTN_PRIMARY}>
                        Browse products
                    </Link>
                    <button type="button" onClick={refresh} className={BTN_SECONDARY}>
                        Check again
                    </button>
                </StateBox>
            ) : error && !data ? (
                <StateBox
                    icon={<AlertCircle className="h-8 w-8 text-red-700 dark:text-red-400" aria-hidden="true" />}
                    title="We could not load auctions"
                    body={error.isNetwork ? 'Check your connection and try again.' : 'Something went wrong on our side. Please try again.'}
                    alert
                >
                    <button type="button" onClick={refresh} className={BTN_PRIMARY}>
                        Try again
                    </button>
                </StateBox>
            ) : isLoading && !data ? (
                <ProductGrid layout="listing">
                    {Array.from({ length: 10 }, (_, i) => (
                        <AuctionCardSkeleton key={i} />
                    ))}
                </ProductGrid>
            ) : results.length === 0 ? (
                filtersActive ? (
                    <StateBox
                        icon={<Search className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />}
                        title="No auctions match your filters"
                        body="Try a different search or clear the filters."
                    >
                        <button type="button" onClick={clearFilters} className={BTN_PRIMARY}>
                            Clear filters
                        </button>
                    </StateBox>
                ) : (
                    <StateBox icon={<Gavel className="h-8 w-8 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />} title={current.empty} body={current.hint}>
                        <Link href="/products" className={BTN_PRIMARY}>
                            Browse products
                        </Link>
                        {tab === 'live' ? (
                            <button type="button" onClick={() => selectTab('scheduled')} className={BTN_SECONDARY}>
                                See upcoming auctions
                            </button>
                        ) : null}
                    </StateBox>
                )
            ) : (
                <div>
                    <ProductGrid layout="listing">
                        {results.map((a, i) => (
                            <AuctionCard key={a.id} auction={a} priority={i < 4} onCountdownEnd={refresh} />
                        ))}
                    </ProductGrid>
                    <Pager
                        page={page}
                        pageSize={PAGE_SIZE}
                        count={data?.count ?? 0}
                        onChange={p => {
                            setPage(p)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="mt-4"
                    />
                </div>
            )}

            {/* Mobile filter sheet */}
            {sheetOpen ? (
                <div className="md:hidden">
                    <div aria-hidden="true" onClick={closeSheet} className="fixed inset-0 z-[400] bg-black/50" />
                    <div
                        ref={sheetRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Filter and sort"
                        className="fixed inset-x-0 bottom-0 z-[401] rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-xl dark:bg-zinc-900"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-1 dark:border-zinc-800">
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Filter and sort</span>
                            <button
                                type="button"
                                onClick={closeSheet}
                                aria-label="Close"
                                className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-700 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:focus-visible:ring-primary-400"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="space-y-3 p-3">
                            {categorySelect}
                            {sortSelect}
                            <button type="button" onClick={closeSheet} className={`${BTN_PRIMARY} w-full`}>
                                Show results
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}

function StateBox({
    icon,
    title,
    body,
    alert = false,
    children,
}: {
    icon: React.ReactNode
    title: string
    body: string
    alert?: boolean
    children?: React.ReactNode
}) {
    return (
        <div role={alert ? 'alert' : undefined} className="flex flex-col items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
            {icon}
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
            <p className="max-w-md text-sm text-zinc-700 dark:text-zinc-300">{body}</p>
            {children ? <div className="mt-1 flex flex-wrap justify-center gap-2">{children}</div> : null}
        </div>
    )
}
