'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated'
import { AlertCircle, Loader2, LogIn, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { tryOpenAuthModalFromBridge } from '@/lib/authModalBridge'
import { useCurrency } from '@/contexts/CurrencyContext'
import { COUNTRY_META } from '@/lib/storeCurrency'
import AttachmentUploader from '@/components/RFQ/AttachmentUploader'
import {
    RFQ_LIMITS,
    createRequest,
    listCategories,
    newIdempotencyKey,
    parseRfqError,
    uploadAttachment,
    type CreateRFQPayload,
    type RFQSpec,
} from '@/lib/rfqApi'

// ─── Form model ──────────────────────────────────────────────────────────────

type FormState = {
    title: string
    description: string
    categoryId: string
    subCategoryId: string
    quantity: string
    unit: string
    budgetMin: string
    budgetMax: string
    country: string
    city: string
    neededBy: string
    closesInDays: string
    specs: RFQSpec[]
}

type Errors = Partial<Record<string, string>>

const INITIAL: FormState = {
    title: '',
    description: '',
    categoryId: '',
    subCategoryId: '',
    quantity: '1',
    unit: 'units',
    budgetMin: '',
    budgetMax: '',
    country: 'GH',
    city: '',
    neededBy: '',
    closesInDays: '7',
    specs: [],
}

/** Quote deadline presets. Min 2 days / max 45 days keeps us inside the server's [24h, 60d] window. */
const CLOSES_OPTIONS = [2, 3, 7, 14, 30, 45]
const UNIT_SUGGESTIONS = ['units', 'pcs', 'kg', 'tonnes', 'litres', 'metres', 'boxes', 'cartons', 'pallets', 'sets']

/** Field order, used to focus the first invalid field. */
const FIELD_ORDER = [
    'title',
    'category_id',
    'sub_category_id',
    'description',
    'quantity',
    'unit',
    'budget_min',
    'budget_max',
    'delivery_country',
    'delivery_city',
    'needed_by',
    'closes_at',
    'specs',
]

const DECIMAL = /^\d{1,12}(\.\d{1,2})?$/

function todayIso(): string {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Mirrors the R2 field rules from the contract. */
function validate(f: FormState): Errors {
    const e: Errors = {}
    const title = f.title.trim()
    if (!title) e.title = 'Give your request a short title.'
    else if (title.length > RFQ_LIMITS.titleMax) e.title = `Keep the title under ${RFQ_LIMITS.titleMax} characters.`

    if (!f.categoryId) e.category_id = 'Choose a category so the right suppliers see your request.'

    const desc = f.description.trim()
    if (!desc) e.description = 'Describe what you need.'
    else if (desc.length > RFQ_LIMITS.descriptionMax) e.description = `Keep the description under ${RFQ_LIMITS.descriptionMax} characters.`

    if (!/^\d+$/.test(f.quantity.trim()) || Number(f.quantity) < 1) e.quantity = 'Enter a whole number, 1 or more.'
    else if (Number(f.quantity) > 2147483647) e.quantity = 'That quantity is too large.'

    if (f.unit.trim().length > RFQ_LIMITS.unitMax) e.unit = `Max ${RFQ_LIMITS.unitMax} characters.`

    const min = f.budgetMin.trim()
    const max = f.budgetMax.trim()
    if (min && !DECIMAL.test(min)) e.budget_min = 'Use a number with up to 2 decimals.'
    if (max && !DECIMAL.test(max)) e.budget_max = 'Use a number with up to 2 decimals.'
    if (!e.budget_min && !e.budget_max && min && max && Number(min) > Number(max)) {
        e.budget_max = 'Maximum must be at least the minimum.'
    }

    if (!/^[A-Z]{2}$/.test(f.country)) e.delivery_country = 'Choose a delivery country.'
    if (f.city.trim().length > RFQ_LIMITS.cityMax) e.delivery_city = `Max ${RFQ_LIMITS.cityMax} characters.`

    if (f.neededBy && f.neededBy < todayIso()) e.needed_by = 'Pick today or a later date.'

    if (!CLOSES_OPTIONS.includes(Number(f.closesInDays))) e.closes_at = 'Choose when quotes should close.'

    if (f.specs.length > RFQ_LIMITS.specsMax) e.specs = `At most ${RFQ_LIMITS.specsMax} specifications.`
    else if (f.specs.some((s) => (s.label.trim() === '') !== (s.value.trim() === ''))) {
        e.specs = 'Fill in both the label and the value, or remove the row.'
    }
    return e
}

function buildPayload(f: FormState, publish: boolean): CreateRFQPayload {
    const specs = f.specs
        .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
        .filter((s) => s.label && s.value)
    const payload: CreateRFQPayload = {
        title: f.title.trim(),
        description: f.description.trim(),
        category_id: f.categoryId,
        quantity: Number(f.quantity),
        delivery_country: f.country,
        closes_at: new Date(Date.now() + Number(f.closesInDays) * 86_400_000).toISOString(),
        publish,
    }
    if (f.subCategoryId) payload.sub_category_id = f.subCategoryId
    if (f.unit.trim()) payload.unit = f.unit.trim()
    if (f.budgetMin.trim()) payload.budget_min = f.budgetMin.trim()
    if (f.budgetMax.trim()) payload.budget_max = f.budgetMax.trim()
    if (f.city.trim()) payload.delivery_city = f.city.trim()
    if (f.neededBy) payload.needed_by = f.neededBy
    if (specs.length) payload.specs = specs
    return payload
}

/**
 * Stable fingerprint of what the create call would send. `closes_at` is derived from "now", so it is
 * replaced by the chosen day count; otherwise every retry would look like an edit.
 */
function fingerprintPayload(f: FormState, publish: boolean): string {
    const { closes_at: _closesAt, ...rest } = buildPayload(f, publish)
    void _closesAt
    const ordered = Object.fromEntries(Object.entries(rest).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
    return JSON.stringify({ ...ordered, closes_in_days: f.closesInDays })
}

// ─── UI bits ─────────────────────────────────────────────────────────────────

const INPUT =
    'block w-full min-h-[44px] [color-scheme:light] dark:[color-scheme:dark] rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-primary-700 dark:focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-700 dark:focus:ring-primary-400 disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-500 dark:disabled:text-zinc-400'
const INPUT_ERR = 'border-red-600 dark:border-red-500 focus:border-red-600 dark:focus:border-red-500 focus:ring-red-600 dark:focus:ring-red-400'
const CARD = 'rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 sm:p-4'

function Field({
    id,
    label,
    required,
    hint,
    error,
    className = '',
    children,
}: {
    id: string
    label: string
    required?: boolean
    hint?: string
    error?: string
    className?: string
    children: ReactNode
}) {
    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {label}
                {required ? <span className="text-red-700 dark:text-red-400"> *</span> : <span className="font-normal text-zinc-500 dark:text-zinc-400"> (optional)</span>}
            </label>
            {children}
            {error ? (
                <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">
                    {error}
                </p>
            ) : hint ? (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
            ) : null}
        </div>
    )
}

function SectionTitle({ children }: { children: ReactNode }) {
    return <h2 className="mb-2 font-syne text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">{children}</h2>
}

// ─── Form ────────────────────────────────────────────────────────────────────

export default function RFQForm() {
    const router = useRouter()
    const isAuthenticated = useIsAuthenticated()
    const { baseCurrency } = useCurrency()
    const [mounted, setMounted] = useState(false)
    const [form, setForm] = useState<FormState>(INITIAL)
    const [files, setFiles] = useState<File[]>([])
    const [errors, setErrors] = useState<Errors>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState<'draft' | 'publish' | null>(null)
    /** Idempotency key for the create call, tied to the payload it was first used with. */
    const keyRef = useRef<{ key: string; fingerprint: string } | null>(null)
    const alertRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => setMounted(true), [])
    const locked = mounted && !isAuthenticated

    const { data: categories, error: catError, isLoading: catLoading, mutate: retryCategories } = useSWR(
        'rfq-categories',
        listCategories,
        { revalidateOnFocus: false }
    )
    const subCategories = categories?.find((c) => String(c.id) === form.categoryId)?.sub_categories ?? []

    const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }, [])

    const clearError = (...keys: string[]) =>
        setErrors((prev) => {
            if (!keys.some((k) => prev[k])) return prev
            const next = { ...prev }
            keys.forEach((k) => delete next[k])
            return next
        })

    const openSignIn = () => {
        if (!tryOpenAuthModalFromBridge('login')) router.push('/auth/login')
    }

    const focusFirstError = (errs: Errors) => {
        const first = FIELD_ORDER.find((k) => errs[k])
        if (!first) return
        requestAnimationFrame(() => document.getElementById(`rfq-${first}`)?.focus())
    }

    const submit = async (publish: boolean) => {
        if (submitting) return
        if (locked) {
            openSignIn()
            return
        }
        setFormError(null)
        const errs = validate(form)
        setErrors(errs)
        if (Object.keys(errs).length > 0) {
            focusFirstError(errs)
            return
        }
        setSubmitting(publish ? 'publish' : 'draft')
        // Reuse the key only when the payload is unchanged since the failed attempt (network error / 5xx retry);
        // any edit gets a fresh key so it is never replayed as the old request.
        const fingerprint = fingerprintPayload(form, publish)
        if (!keyRef.current || keyRef.current.fingerprint !== fingerprint) {
            keyRef.current = { key: newIdempotencyKey(), fingerprint }
        }
        try {
            const rfq = await createRequest(buildPayload(form, publish), keyRef.current.key)
            let failed = 0
            for (const file of files) {
                try {
                    await uploadAttachment(rfq.id, file)
                } catch {
                    failed += 1
                }
            }
            keyRef.current = null
            router.push(`/account/requests/${encodeURIComponent(rfq.id)}${failed ? `?attach_failed=${failed}` : ''}`)
        } catch (err) {
            const parsed = parseRfqError(err)
            // A rejected (4xx) payload must never be replayed under the same key.
            if (parsed.status !== null && parsed.status < 500) keyRef.current = null
            const fieldErrs: Errors = {}
            for (const [k, v] of Object.entries(parsed.fields)) if (FIELD_ORDER.includes(k)) fieldErrs[k] = v
            if (parsed.code === 'category_not_found') fieldErrs.category_id = parsed.message
            setErrors(fieldErrs)
            const hasFieldErrs = Object.keys(fieldErrs).length > 0
            setFormError(
                parsed.status === 401
                    ? 'Please sign in to post your request.'
                    : hasFieldErrs
                      ? 'Please fix the highlighted fields.'
                      : parsed.message
            )
            if (hasFieldErrs) focusFirstError(fieldErrs)
            else requestAnimationFrame(() => alertRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
            setSubmitting(null)
        }
    }

    const errProps = (name: string) => ({
        'aria-invalid': errors[name] ? true : undefined,
        'aria-describedby': errors[name] ? `rfq-${name}-error` : undefined,
    })
    const cls = (name: string) => `${INPUT} ${errors[name] ? INPUT_ERR : ''}`

    const currencyPrefix = (
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {baseCurrency}
        </span>
    )

    const actions = (layout: 'card' | 'bar') => {
        const busy = submitting !== null
        const base =
            'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 disabled:opacity-60'
        if (locked) {
            return (
                <button type="button" onClick={openSignIn} className={`${base} w-full bg-primary-700 text-white hover:bg-primary-800`}>
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    Sign in to post
                </button>
            )
        }
        return (
            <div className={layout === 'bar' ? 'grid grid-cols-[auto_1fr] gap-2' : 'space-y-2'}>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => submit(false)}
                    className={`${base} border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 ${layout === 'card' ? 'w-full' : ''}`}
                >
                    {submitting === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Save draft
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => submit(true)}
                    className={`${base} bg-primary-700 text-white hover:bg-primary-800 ${layout === 'card' ? 'order-first w-full' : ''}`}
                >
                    {submitting === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                    Post request
                </button>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-screen-xl px-3 pb-24 pt-3 sm:px-4 lg:px-6 lg:pb-8 lg:pt-4">
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-4">
                <form
                    id="rfq-form"
                    noValidate
                    onSubmit={(e) => {
                        e.preventDefault()
                        submit(true)
                    }}
                    className="space-y-3 lg:space-y-4"
                >
                    {locked ? (
                        <div className="flex flex-col gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Sign in to post a request. The form below is a preview until you do.</p>
                            <button
                                type="button"
                                onClick={openSignIn}
                                className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 text-sm font-bold text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400"
                            >
                                <LogIn className="h-4 w-4" aria-hidden="true" />
                                Sign in to post
                            </button>
                        </div>
                    ) : null}

                    {formError ? (
                        <div
                            ref={alertRef}
                            role="alert"
                            className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 text-sm font-medium text-red-800 dark:text-red-100"
                        >
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                            <span>{formError}</span>
                        </div>
                    ) : null}

                    <fieldset disabled={locked} className="min-w-0 space-y-3 lg:space-y-4">
                        <legend className="sr-only">Request details</legend>

                        <section className={CARD} aria-label="What you need">
                            <SectionTitle>What do you need?</SectionTitle>
                            <div className="space-y-3">
                                <Field id="rfq-title" label="Title" required error={errors.title}>
                                    <input
                                        id="rfq-title"
                                        type="text"
                                        value={form.title}
                                        maxLength={RFQ_LIMITS.titleMax}
                                        onChange={(e) => {
                                            set('title', e.target.value)
                                            clearError('title')
                                        }}
                                        placeholder="e.g. Cotton t-shirts, plain, assorted sizes"
                                        className={cls('title')}
                                        {...errProps('title')}
                                    />
                                </Field>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    <Field id="rfq-category_id" label="Category" required error={errors.category_id}>
                                        <select
                                            id="rfq-category_id"
                                            value={form.categoryId}
                                            disabled={locked || catLoading || !!catError}
                                            onChange={(e) => {
                                                set('categoryId', e.target.value)
                                                set('subCategoryId', '')
                                                clearError('category_id', 'sub_category_id')
                                            }}
                                            className={cls('category_id')}
                                            {...errProps('category_id')}
                                        >
                                            <option value="">{catLoading ? 'Loading categories…' : 'Select a category'}</option>
                                            {(categories ?? []).map((c) => (
                                                <option key={String(c.id)} value={String(c.id)}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                        {catError ? (
                                            <p role="alert" className="mt-1 text-xs font-medium text-red-700 dark:text-red-400">
                                                Couldn&apos;t load categories.{' '}
                                                <button type="button" onClick={() => retryCategories()} className="font-bold underline">
                                                    Retry
                                                </button>
                                            </p>
                                        ) : !catLoading && categories && categories.length === 0 ? (
                                            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">No categories are available right now.</p>
                                        ) : null}
                                    </Field>
                                    {subCategories.length > 0 ? (
                                        <Field id="rfq-sub_category_id" label="Subcategory" error={errors.sub_category_id}>
                                            <select
                                                id="rfq-sub_category_id"
                                                value={form.subCategoryId}
                                                onChange={(e) => set('subCategoryId', e.target.value)}
                                                className={cls('sub_category_id')}
                                            >
                                                <option value="">Any</option>
                                                {subCategories.map((s) => (
                                                    <option key={String(s.id)} value={String(s.id)}>
                                                        {s.sub_category_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>
                                    ) : null}
                                </div>

                                <Field
                                    id="rfq-description"
                                    label="Description"
                                    required
                                    error={errors.description}
                                    hint="Materials, sizes, quality, packaging, anything a supplier needs to quote accurately."
                                >
                                    <textarea
                                        id="rfq-description"
                                        rows={4}
                                        value={form.description}
                                        maxLength={RFQ_LIMITS.descriptionMax}
                                        onChange={(e) => {
                                            set('description', e.target.value)
                                            clearError('description')
                                        }}
                                        className={cls('description')}
                                        {...errProps('description')}
                                    />
                                    <p className="mt-0.5 text-right text-xs text-zinc-500 dark:text-zinc-400">
                                        {form.description.length}/{RFQ_LIMITS.descriptionMax}
                                    </p>
                                </Field>
                            </div>
                        </section>

                        <section className={CARD} aria-label="Quantity and budget">
                            <SectionTitle>Quantity &amp; budget</SectionTitle>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <Field id="rfq-quantity" label="Quantity" required error={errors.quantity}>
                                    <input
                                        id="rfq-quantity"
                                        type="text"
                                        inputMode="numeric"
                                        value={form.quantity}
                                        onChange={(e) => {
                                            set('quantity', e.target.value.replace(/[^\d]/g, ''))
                                            clearError('quantity')
                                        }}
                                        className={cls('quantity')}
                                        {...errProps('quantity')}
                                    />
                                </Field>
                                <Field id="rfq-unit" label="Unit" error={errors.unit}>
                                    <input
                                        id="rfq-unit"
                                        type="text"
                                        list="rfq-unit-list"
                                        value={form.unit}
                                        maxLength={RFQ_LIMITS.unitMax}
                                        onChange={(e) => {
                                            set('unit', e.target.value)
                                            clearError('unit')
                                        }}
                                        className={cls('unit')}
                                        {...errProps('unit')}
                                    />
                                    <datalist id="rfq-unit-list">
                                        {UNIT_SUGGESTIONS.map((u) => (
                                            <option key={u} value={u} />
                                        ))}
                                    </datalist>
                                </Field>
                                <Field id="rfq-budget_min" label="Budget from" error={errors.budget_min}>
                                    <div className="relative">
                                        {currencyPrefix}
                                        <input
                                            id="rfq-budget_min"
                                            type="text"
                                            inputMode="decimal"
                                            value={form.budgetMin}
                                            onChange={(e) => {
                                                set('budgetMin', e.target.value.replace(/[^\d.]/g, ''))
                                                clearError('budget_min', 'budget_max')
                                            }}
                                            className={`${cls('budget_min')} pl-12`}
                                            {...errProps('budget_min')}
                                        />
                                    </div>
                                </Field>
                                <Field id="rfq-budget_max" label="Budget to" error={errors.budget_max}>
                                    <div className="relative">
                                        {currencyPrefix}
                                        <input
                                            id="rfq-budget_max"
                                            type="text"
                                            inputMode="decimal"
                                            value={form.budgetMax}
                                            onChange={(e) => {
                                                set('budgetMax', e.target.value.replace(/[^\d.]/g, ''))
                                                clearError('budget_min', 'budget_max')
                                            }}
                                            className={`${cls('budget_max')} pl-12`}
                                            {...errProps('budget_max')}
                                        />
                                    </div>
                                </Field>
                            </div>
                            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                                Budget is optional and shown to suppliers in {baseCurrency}. Quotes are always in {baseCurrency}.
                            </p>
                        </section>

                        <section className={CARD} aria-label="Delivery and timing">
                            <SectionTitle>Delivery &amp; timing</SectionTitle>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field id="rfq-delivery_country" label="Deliver to (country)" required error={errors.delivery_country}>
                                    <select
                                        id="rfq-delivery_country"
                                        value={form.country}
                                        onChange={(e) => {
                                            set('country', e.target.value)
                                            clearError('delivery_country')
                                        }}
                                        className={cls('delivery_country')}
                                        {...errProps('delivery_country')}
                                    >
                                        {Object.entries(COUNTRY_META).map(([code, meta]) => (
                                            <option key={code} value={code}>
                                                {meta.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field id="rfq-delivery_city" label="City / town" error={errors.delivery_city}>
                                    <input
                                        id="rfq-delivery_city"
                                        type="text"
                                        value={form.city}
                                        maxLength={RFQ_LIMITS.cityMax}
                                        onChange={(e) => {
                                            set('city', e.target.value)
                                            clearError('delivery_city')
                                        }}
                                        className={cls('delivery_city')}
                                        {...errProps('delivery_city')}
                                    />
                                </Field>
                                <Field id="rfq-needed_by" label="Needed by" error={errors.needed_by}>
                                    <input
                                        id="rfq-needed_by"
                                        type="date"
                                        min={mounted ? todayIso() : undefined}
                                        value={form.neededBy}
                                        onChange={(e) => {
                                            set('neededBy', e.target.value)
                                            clearError('needed_by')
                                        }}
                                        className={cls('needed_by')}
                                        {...errProps('needed_by')}
                                    />
                                </Field>
                                <Field
                                    id="rfq-closes_at"
                                    label="Accept quotes for"
                                    required
                                    error={errors.closes_at}
                                    hint="After this, suppliers can no longer send quotes."
                                >
                                    <select
                                        id="rfq-closes_at"
                                        value={form.closesInDays}
                                        onChange={(e) => {
                                            set('closesInDays', e.target.value)
                                            clearError('closes_at')
                                        }}
                                        className={cls('closes_at')}
                                        {...errProps('closes_at')}
                                    >
                                        {CLOSES_OPTIONS.map((d) => (
                                            <option key={d} value={d}>
                                                {d} days
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                            </div>
                        </section>

                        <section className={CARD} aria-label="Specifications and files">
                            <SectionTitle>Specifications &amp; files</SectionTitle>
                            <div className="space-y-3">
                                <div id="rfq-specs" tabIndex={-1}>
                                    <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        Specifications <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
                                    </p>
                                    {form.specs.length > 0 ? (
                                        <ul className="mb-2 space-y-2">
                                            {form.specs.map((s, i) => (
                                                <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                                                    <input
                                                        type="text"
                                                        aria-label={`Specification ${i + 1} label`}
                                                        placeholder="Label"
                                                        value={s.label}
                                                        onChange={(e) => {
                                                            set('specs', form.specs.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                                                            clearError('specs')
                                                        }}
                                                        className={INPUT}
                                                    />
                                                    <input
                                                        type="text"
                                                        aria-label={`Specification ${i + 1} value`}
                                                        placeholder="Value"
                                                        value={s.value}
                                                        onChange={(e) => {
                                                            set('specs', form.specs.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))
                                                            clearError('specs')
                                                        }}
                                                        className={INPUT}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => set('specs', form.specs.filter((_, idx) => idx !== i))}
                                                        aria-label={`Remove specification ${i + 1}`}
                                                        className="flex h-11 w-11 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400"
                                                    >
                                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                    {errors.specs ? (
                                        <p role="alert" className="mb-2 text-xs font-medium text-red-700 dark:text-red-400">
                                            {errors.specs}
                                        </p>
                                    ) : null}
                                    <button
                                        type="button"
                                        disabled={form.specs.length >= RFQ_LIMITS.specsMax}
                                        onClick={() => set('specs', [...form.specs, { label: '', value: '' }])}
                                        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 disabled:opacity-60"
                                    >
                                        <Plus className="h-4 w-4" aria-hidden="true" />
                                        Add specification
                                    </button>
                                </div>
                                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
                                    <p className="mb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                        Attachments <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
                                    </p>
                                    <AttachmentUploader files={files} onChange={setFiles} disabled={locked || submitting !== null} />
                                </div>
                            </div>
                        </section>
                    </fieldset>
                </form>

                <aside className="hidden lg:sticky lg:top-40 lg:block">
                    <div className="space-y-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
                        <h2 className="font-syne text-sm font-bold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">Ready to post?</h2>
                        {actions('card')}
                        <p className="flex items-start gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3 text-xs text-zinc-600 dark:text-zinc-400">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-700 dark:text-zinc-300" aria-hidden="true" />
                            <span>
                                Quotes are private: only you and the supplier who sent each one can see it. Save a draft to finish later; a draft is
                                not shown to suppliers.
                            </span>
                        </p>
                    </div>
                </aside>
            </div>

            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
                {actions('bar')}
            </div>
        </div>
    )
}
