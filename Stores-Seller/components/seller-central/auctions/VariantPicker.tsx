'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import useSWR from 'swr'
import { Package, Search } from 'lucide-react'
import { EmptyPanel, ErrorPanel, Skeleton, btnSecondary, inputClass, linkClass } from '@/components/seller-central/ui'
import { fetchProductVariants, fetchSellerListings, formatMoney, type ListingApiError, type ListingRow, type Paginated, type VariantDetail } from '@/lib/seller/listings'

export interface VariantSelection {
    product: ListingRow
    variant: VariantDetail
}

interface Props {
    value: VariantSelection | null
    onChange: (next: VariantSelection | null) => void
    error?: string
    disabled?: boolean
}

const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, keepPreviousData: true } as const
const LIST_SIZE = 8

function stockOf(variant: VariantDetail): number {
    return variant.quantity ?? 0
}

export function variantLabel(variant: VariantDetail): string {
    return variant.name?.trim() || variant.sku
}

function ProductThumb({ image }: { image: string | null }) {
    return (
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {image ? <Image src={image} alt="" fill sizes="44px" loading="lazy" className="object-contain p-0.5 mix-blend-multiply dark:mix-blend-normal" /> : <Package className="h-5 w-5" aria-hidden="true" />}
        </span>
    )
}

/** Pick one of the seller's own listings, then one of its variants. Out-of-stock variants cannot be chosen. */
export default function VariantPicker({ value, onChange, error, disabled }: Props) {
    const [draft, setDraft] = useState('')
    const [search, setSearch] = useState('')
    const [product, setProduct] = useState<ListingRow | null>(null)
    const autoPicked = useRef<string | null>(null)

    useEffect(() => {
        const next = draft.trim()
        if (next === search) return
        const timer = window.setTimeout(() => setSearch(next), 400)
        return () => window.clearTimeout(timer)
    }, [draft, search])

    const listing = useSWR<Paginated<ListingRow>, ListingApiError>(
        value || product ? null : ['seller:auctions:pick-listing', search],
        () => fetchSellerListings({ page: 1, pageSize: LIST_SIZE, search, status: '', lowStock: false }),
        SWR_OPTIONS
    )
    const variants = useSWR<VariantDetail[], ListingApiError>(product && !value ? ['seller:auctions:pick-variants', product.id] : null, () => fetchProductVariants((product as ListingRow).id), SWR_OPTIONS)

    // A listing with a single in-stock variant needs no second step.
    useEffect(() => {
        if (!product || !variants.data || autoPicked.current === product.id) return
        autoPicked.current = product.id
        if (variants.data.length === 1 && stockOf(variants.data[0]) > 0) onChange({ product, variant: variants.data[0] })
    }, [product, variants.data, onChange])

    if (value) {
        const { product: p, variant: v } = value
        return (
            <div className="space-y-1">
                <div className="flex items-center gap-3 rounded-md border border-zinc-300 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800">
                    <ProductThumb image={p.main_product_image} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{p.name}</p>
                        <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                            {variantLabel(v)} · SKU {v.sku} · {formatMoney(v.price, p.pricing_currency)} · {stockOf(v)} in stock
                        </p>
                    </div>
                    <button
                        type="button"
                        className={btnSecondary}
                        disabled={disabled}
                        onClick={() => {
                            autoPicked.current = p.id
                            setProduct(p)
                            onChange(null)
                        }}
                    >
                        Change
                    </button>
                </div>
                {error ? (
                    <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
                        {error}
                    </p>
                ) : null}
            </div>
        )
    }

    if (product) {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{product.name}</p>
                    <button
                        type="button"
                        className={`${linkClass} min-h-[44px] shrink-0 px-2`}
                        onClick={() => {
                            autoPicked.current = null
                            setProduct(null)
                        }}
                    >
                        Choose another listing
                    </button>
                </div>
                {variants.error ? (
                    <ErrorPanel title="Couldn't load the variants" message={variants.error.message} onRetry={() => void variants.mutate()} retrying={variants.isValidating} />
                ) : !variants.data ? (
                    <div className="space-y-2" aria-busy="true" aria-label="Loading variants">
                        <Skeleton className="h-14" />
                        <Skeleton className="h-14" />
                    </div>
                ) : variants.data.length === 0 ? (
                    <EmptyPanel title="This listing has no variants" description="Add a variant with a price and stock in Listings, then come back." />
                ) : (
                    <ul role="radiogroup" aria-label="Variant" className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                        {variants.data.map((v) => {
                            const stock = stockOf(v)
                            return (
                                <li key={v.id}>
                                    <button
                                        type="button"
                                        role="radio"
                                        aria-checked={false}
                                        disabled={stock <= 0 || disabled}
                                        onClick={() => onChange({ product, variant: v })}
                                        className="flex min-h-[44px] w-full items-center justify-between gap-3 p-3 text-left hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:hover:bg-zinc-800 dark:disabled:bg-zinc-800"
                                    >
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{variantLabel(v)}</span>
                                            <span className="block truncate text-xs text-zinc-600 dark:text-zinc-400">SKU {v.sku}</span>
                                        </span>
                                        <span className="shrink-0 text-right text-xs">
                                            <span className="block font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(v.price, product.pricing_currency)}</span>
                                            <span className={stock > 0 ? 'text-zinc-600 dark:text-zinc-400' : 'font-semibold text-red-700 dark:text-red-400'}>{stock > 0 ? `${stock} in stock` : 'Out of stock'}</span>
                                        </span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                )}
                {error ? (
                    <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
                        {error}
                    </p>
                ) : null}
            </div>
        )
    }

    const rows = listing.data?.results ?? []
    return (
        <div className="space-y-2">
            <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                <input
                    type="search"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Search your listings"
                    aria-label="Search your listings"
                    disabled={disabled}
                    className={`${inputClass} pl-9`}
                />
            </div>
            {listing.error && !listing.data ? (
                <ErrorPanel title="Couldn't load your listings" message={listing.error.message} onRetry={() => void listing.mutate()} retrying={listing.isValidating} />
            ) : listing.isLoading && !listing.data ? (
                <div className="space-y-2" aria-busy="true" aria-label="Loading listings">
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                    <Skeleton className="h-14" />
                </div>
            ) : rows.length === 0 ? (
                search ? (
                    <EmptyPanel title={`No listings match "${search}"`} description="Check the spelling or clear the search." />
                ) : (
                    <EmptyPanel
                        title="You have no listings yet"
                        description="An auction sells one of your listings. Create a listing with a price and stock first."
                        action={
                            <Link href="/seller-central/listings/new" className={btnSecondary}>
                                Create a listing
                            </Link>
                        }
                    />
                )
            ) : (
                <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {rows.map((row) => (
                        <li key={row.id}>
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => setProduct(row)}
                                className="flex min-h-[44px] w-full items-center gap-3 p-3 text-left hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600 dark:hover:bg-zinc-800"
                            >
                                <ProductThumb image={row.main_product_image} />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{row.name}</span>
                                    <span className="block truncate text-xs text-zinc-600 dark:text-zinc-400">
                                        {row.variant_stock_total} in stock{row.status ? ` · ${row.status}` : ''}
                                    </span>
                                </span>
                                <span className="shrink-0 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatMoney(row.primary_variant_price, row.pricing_currency)}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {listing.data && listing.data.count > rows.length ? <p className="text-xs text-zinc-600 dark:text-zinc-400">Showing {rows.length} of {listing.data.count}. Search to narrow the list.</p> : null}
            {error ? (
                <p role="alert" className="text-xs font-medium text-red-700 dark:text-red-400">
                    {error}
                </p>
            ) : null}
        </div>
    )
}
