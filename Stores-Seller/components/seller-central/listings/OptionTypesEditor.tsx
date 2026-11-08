'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Clock, Plus, X } from 'lucide-react'
import useSWR from 'swr'
import { createdValueId, fetchMyValueRequests, type AttributeValueRequest, type RequestValueOutcome } from '@/lib/seller/attributeRequests'
import { fetchAttributes, fetchAttributeValues, type AttributeOption } from '@/lib/seller/listings'
import type { OptionType, OptionValue } from './schema'
import { countCombos, MAX_MATRIX, MAX_OPTION_TYPES, toOptionValue } from './optionUtils'
import { RequestValueDialog } from './RequestValueDialog'
import { Banner, btnSecondary, btnSmall, cx, headingCls, linkBtn, mutedText, panelCls, Skeleton, TextInput, useToast } from './ui'

const SWR_OPTIONS = { revalidateOnFocus: false, shouldRetryOnError: false } as const
/** The seller's own requests refresh when they return to the tab, so an approval shows up without a reload. */
const REQUEST_SWR_OPTIONS = { revalidateOnFocus: true, shouldRetryOnError: false } as const
const PENDING_KEY = 'seller:value-requests:mine:pending'
const APPROVED_KEY = 'seller:value-requests:mine:approved'
const REJECTED_KEY = 'seller:value-requests:mine:rejected'
const MAX_REJECTED_SHOWN = 5

interface OptionTypesEditorProps {
    types: OptionType[]
    onChange: (next: OptionType[]) => void
    /** Shown under the types when the seller wants named options instead. */
    onUseNames?: () => void
    error?: string
    /** Per-type errors keyed by index (e.g. "Choose at least one colour value"). */
    typeErrors?: Record<number, string>
}

const dot = 'h-3.5 w-3.5 shrink-0 rounded-full border border-zinc-400 dark:border-zinc-500'

/** Step A: choose 1-3 option types. Step B: choose the values for each. */
export function OptionTypesEditor({ types, onChange, onUseNames, error, typeErrors }: OptionTypesEditorProps) {
    const attributes = useSWR<AttributeOption[]>('seller:catalog:attributes', fetchAttributes, SWR_OPTIONS)
    const chosen = new Set(types.map((t) => t.attributeId))
    const available = (attributes.data ?? []).filter((a) => !chosen.has(a.id))
    const combos = countCombos(types)

    const pending = useSWR<AttributeValueRequest[]>(PENDING_KEY, () => fetchMyValueRequests('pending'), REQUEST_SWR_OPTIONS)
    const approved = useSWR<AttributeValueRequest[]>(APPROVED_KEY, () => fetchMyValueRequests('approved'), REQUEST_SWR_OPTIONS)
    const rejected = useSWR<AttributeValueRequest[]>(REJECTED_KEY, () => fetchMyValueRequests('rejected'), REQUEST_SWR_OPTIONS)
    const addPending = (request: AttributeValueRequest) => void pending.mutate((current) => [request, ...(current ?? []).filter((r) => r.id !== request.id)], { revalidate: false })

    const addType = (a: AttributeOption) => onChange([...types, { attributeId: a.id, name: a.name, displayType: a.displayType, values: [] }])
    const removeType = (id: string) => onChange(types.filter((t) => t.attributeId !== id))
    const setValues = (id: string, values: OptionValue[]) => onChange(types.map((t) => (t.attributeId === id ? { ...t, values } : t)))

    return (
        <div className="space-y-3">
            <section className={panelCls}>
                <h3 className={headingCls}>1. Option types</h3>
                <p className={cx('mt-0.5 text-xs', mutedText)}>What can buyers choose between? Pick up to {MAX_OPTION_TYPES}, for example Colour and Size.</p>

                {types.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Chosen option types">
                        {types.map((t) => (
                            <li key={t.attributeId}>
                                <span className="inline-flex min-h-9 items-center gap-1 rounded-full border border-zinc-300 bg-zinc-100 py-0.5 pl-3 pr-1 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100">
                                    {t.name}
                                    <button
                                        type="button"
                                        onClick={() => removeType(t.attributeId)}
                                        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 dark:hover:bg-zinc-700"
                                        aria-label={`Remove ${t.name}`}
                                    >
                                        <X className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </span>
                            </li>
                        ))}
                    </ul>
                ) : null}

                {attributes.isLoading ? (
                    <div className="mt-2 flex gap-1.5" aria-busy="true" aria-label="Loading option types">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                    </div>
                ) : attributes.error ? (
                    <p className="mt-2 text-sm text-red-700 dark:text-red-400" role="alert">
                        Could not load option types.{' '}
                        <button type="button" className={linkBtn} onClick={() => void attributes.mutate()}>
                            Try again
                        </button>
                    </p>
                ) : (attributes.data ?? []).length === 0 ? (
                    <p className={cx('mt-2 text-sm', mutedText)}>No option types are set up yet. Contact support on 024 813 8722 to have Colour and Size added.</p>
                ) : types.length < MAX_OPTION_TYPES && available.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {available.map((a) => (
                            <button key={a.id} type="button" className={cx(btnSecondary, btnSmall)} onClick={() => addType(a)}>
                                <Plus className="h-4 w-4" aria-hidden="true" />
                                {a.name}
                            </button>
                        ))}
                    </div>
                ) : null}

                {onUseNames ? (
                    <p className={cx('mt-2 text-xs', mutedText)}>
                        Need something else?{' '}
                        <button type="button" className={linkBtn} onClick={onUseNames}>
                            Use simple named options instead
                        </button>
                    </p>
                ) : null}
            </section>

            {types.map((t, i) => (
                <ValuesCard
                    key={t.attributeId}
                    type={t}
                    error={typeErrors?.[i]}
                    onChange={(values) => setValues(t.attributeId, values)}
                    pending={(pending.data ?? []).filter((r) => String(r.attribute.id) === t.attributeId)}
                    approved={(approved.data ?? []).filter((r) => String(r.attribute.id) === t.attributeId)}
                    rejected={(rejected.data ?? []).filter((r) => String(r.attribute.id) === t.attributeId)}
                    onRequested={addPending}
                />
            ))}

            {combos > MAX_MATRIX ? (
                <Banner tone="warning">
                    These choices make {combos} combinations. Only the first {MAX_MATRIX} are listed below. Remove some values to keep every combination.
                </Banner>
            ) : null}
            {error ? (
                <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
                    {error}
                </p>
            ) : null}
        </div>
    )
}

interface ValuesCardProps {
    type: OptionType
    error?: string
    onChange: (values: OptionValue[]) => void
    /** This option type's requests waiting for staff. */
    pending: AttributeValueRequest[]
    /** This option type's approved requests, used to refetch values when a new one has been added. */
    approved: AttributeValueRequest[]
    /** This option type's requests staff turned down (shown struck through, with the reason). */
    rejected: AttributeValueRequest[]
    onRequested: (request: AttributeValueRequest) => void
}

function PendingChip({ request }: { request: AttributeValueRequest }) {
    return (
        <span
            tabIndex={0}
            title="You will be able to use it once our team approves it"
            className="inline-flex min-h-9 cursor-default items-center gap-1.5 rounded-full border border-dashed border-zinc-400 bg-white px-3 text-sm text-zinc-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 dark:border-zinc-500 dark:bg-zinc-900 dark:text-zinc-300"
            aria-label={`${request.value_name}, pending review. You will be able to use it once our team approves it.`}
        >
            {request.color_code ? <span className={dot} style={{ backgroundColor: request.color_code }} aria-hidden="true" /> : null}
            {request.value_name} · pending review
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
    )
}

function RejectedChip({ request, open, onToggle }: { request: AttributeValueRequest; open: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            title={request.review_note ? `Not approved: ${request.review_note}` : 'Not approved'}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-dashed border-zinc-300 bg-white px-3 text-sm text-zinc-500 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
            {request.color_code ? <span className={dot} style={{ backgroundColor: request.color_code }} aria-hidden="true" /> : null}
            <span className="line-through">{request.value_name}</span>
            <span className="text-xs font-semibold text-red-700 dark:text-red-400">not approved</span>
        </button>
    )
}

function ValuesCard({ type, error, onChange, pending, approved, rejected, onRequested }: ValuesCardProps) {
    const toast = useToast()
    const values = useSWR(['seller:catalog:attribute-values', type.attributeId], () => fetchAttributeValues(type.attributeId), SWR_OPTIONS)
    const [search, setSearch] = useState('')
    const [requestOpen, setRequestOpen] = useState(false)
    const [openRejected, setOpenRejected] = useState<string | null>(null)
    const refetchedFor = useRef(new Set<string>())

    // A request staff approved since this list loaded: refetch once so the new value appears and can be picked.
    useEffect(() => {
        if (!values.data) return
        const loaded = new Set(values.data.map((v) => v.id))
        const fresh = approved.filter((r) => {
            const id = createdValueId(r)
            return id !== null && !loaded.has(id) && !refetchedFor.current.has(r.id)
        })
        if (fresh.length === 0) return
        fresh.forEach((r) => refetchedFor.current.add(r.id))
        void values.mutate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [approved, values.data])

    // Saved values stay selectable even if the catalog no longer lists them.
    const all = useMemo(() => {
        const fromApi = (values.data ?? []).map(toOptionValue)
        const extra = type.values.filter((v) => !fromApi.some((x) => x.id === v.id))
        return [...fromApi, ...extra]
    }, [values.data, type.values])
    const selected = new Set(type.values.map((v) => v.id))
    const needle = search.trim().toLowerCase()
    const shown = needle ? all.filter((v) => v.label.toLowerCase().includes(needle)) : all

    const toggle = (v: OptionValue) => onChange(selected.has(v.id) ? type.values.filter((x) => x.id !== v.id) : [...type.values, v])
    const selectOnly = (v: OptionValue) => {
        if (!selected.has(v.id)) onChange([...type.values, v])
    }

    const handleMatched = (v: OptionValue) => {
        selectOnly(v)
        toast.success(`${v.label} already exists. Selected it for you.`)
    }

    const handleOutcome = (outcome: RequestValueOutcome) => {
        if (outcome.kind === 'created') {
            onRequested(outcome.request)
            toast.success(`Request sent for ${outcome.request.value_name}. Our team will review it.`)
        } else if (outcome.kind === 'already_requested') {
            onRequested(outcome.request)
            toast.info(`${outcome.request.value_name} is already waiting for review.`)
        } else {
            const v = outcome.value
            selectOnly({ id: String(v.id), label: v.value_name, colorCode: v.color_code || undefined, image: null })
            void values.mutate()
            toast.success(`${v.value_name} already exists. Selected it for you.`)
        }
    }

    // A rejected name that now exists as a value (or is waiting again) is no longer worth showing as rejected.
    const rejectedShown = rejected
        .filter((r) => !all.some((v) => v.label.toLowerCase() === r.value_name.toLowerCase()) && !pending.some((p) => p.value_name.toLowerCase() === r.value_name.toLowerCase()))
        .filter((r) => !needle || r.value_name.toLowerCase().includes(needle))
        .slice(0, MAX_REJECTED_SHOWN)
    const shownPending = needle ? pending.filter((r) => r.value_name.toLowerCase().includes(needle)) : pending
    const openRequest = rejectedShown.find((r) => r.id === openRejected)

    return (
        <section className={panelCls}>
            <div className="flex items-baseline justify-between gap-2">
                <h3 className={headingCls}>{type.name} values</h3>
                <span className={cx('text-xs', mutedText)}>{type.values.length} selected</span>
            </div>

            {all.length > 10 ? <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${type.name.toLowerCase()}`} className="mt-2" aria-label={`Search ${type.name} values`} autoComplete="off" /> : null}

            {values.isLoading ? (
                <div className="mt-2 flex flex-wrap gap-1.5" aria-busy="true" aria-label={`Loading ${type.name.toLowerCase()} values`}>
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-9 w-16" />
                    <Skeleton className="h-9 w-16" />
                </div>
            ) : values.error ? (
                <p className="mt-2 text-sm text-red-700 dark:text-red-400" role="alert">
                    Could not load {type.name.toLowerCase()} values.{' '}
                    <button type="button" className={linkBtn} onClick={() => void values.mutate()}>
                        Try again
                    </button>
                </p>
            ) : shown.length === 0 && shownPending.length === 0 && rejectedShown.length === 0 ? (
                <p className={cx('mt-2 text-sm', mutedText)}>{all.length === 0 ? `No ${type.name.toLowerCase()} values exist yet.` : 'Nothing matches your search.'}</p>
            ) : (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                    {shown.map((v) => {
                        const on = selected.has(v.id)
                        return (
                            <li key={v.id}>
                                <button
                                    type="button"
                                    onClick={() => toggle(v)}
                                    aria-pressed={on}
                                    className={cx(
                                        'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                                        on
                                            ? 'border-primary-700 bg-primary-50 font-semibold text-primary-900 dark:border-primary-400 dark:bg-primary-900 dark:text-primary-50'
                                            : 'border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800'
                                    )}
                                >
                                    {v.colorCode ? <span className={dot} style={{ backgroundColor: v.colorCode }} aria-hidden="true" /> : null}
                                    {v.label}
                                    {on ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                                </button>
                            </li>
                        )
                    })}
                    {shownPending.map((r) => (
                        <li key={`pending-${r.id}`}>
                            <PendingChip request={r} />
                        </li>
                    ))}
                    {rejectedShown.map((r) => (
                        <li key={`rejected-${r.id}`}>
                            <RejectedChip request={r} open={openRejected === r.id} onToggle={() => setOpenRejected(openRejected === r.id ? null : r.id)} />
                        </li>
                    ))}
                </ul>
            )}

            {openRequest ? (
                <p className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200" role="note">
                    <span className="font-semibold">{openRequest.value_name} was not approved.</span> {openRequest.review_note ? `Reason from our team: ${openRequest.review_note}` : 'Our team did not leave a reason.'}
                </p>
            ) : null}

            {error ? (
                <p role="alert" className="mt-2 text-sm font-medium text-red-700 dark:text-red-400">
                    {error}
                </p>
            ) : null}

            <p className={cx('mt-2 text-xs', mutedText)}>
                Can&apos;t find yours?{' '}
                <button type="button" className={linkBtn} onClick={() => setRequestOpen(true)}>
                    Request a new value
                </button>
            </p>

            <RequestValueDialog
                open={requestOpen}
                onOpenChange={setRequestOpen}
                attributeId={type.attributeId}
                attributeName={type.name}
                displayType={type.displayType}
                existing={all}
                onOutcome={handleOutcome}
                onMatchedExisting={handleMatched}
            />
        </section>
    )
}
