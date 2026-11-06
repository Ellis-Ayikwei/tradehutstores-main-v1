'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, RefreshCw, Search, X } from 'lucide-react'
import { useCatalogCategories } from '@/hooks/useCatalogCategories'
import { inputClass } from '@/components/seller-onboarding/fields'

/** Max categories a seller can pick (the API enforces the same limit). */
export const MAX_SELLING_CATEGORIES = 10
export const OTHER_MIN = 3
export const OTHER_MAX = 80

export const CATEGORY_REQUIRED_MESSAGE = 'Choose at least one category or describe it under Other.'

// Built with the constructor so the unicode-property flag does not depend on the TS target.
const OTHER_ALLOWED = new RegExp('^[\\p{L}\\p{N} &,-]+$', 'u')

/** Trims and collapses runs of whitespace (same normalisation the API applies). */
export function normalizeOther(value: string): string {
    return value.replace(/\s+/g, ' ').trim()
}

/** Returns an error message for the free-text "Other" category, or null when empty or valid. */
export function validateOther(value: string): string | null {
    const text = normalizeOther(value)
    if (!text) return null
    if (text.length < OTHER_MIN) return `Use at least ${OTHER_MIN} characters.`
    if (text.length > OTHER_MAX) return `Use at most ${OTHER_MAX} characters.`
    if (!OTHER_ALLOWED.test(text)) return 'Use only letters, numbers, spaces, & , and -.'
    return null
}

/**
 * Form-level check: at least one category OR a valid Other text.
 * Keys match the API field names so they can be merged into the form errors.
 */
export function validateCategorySelection(
    ids: string[],
    other: string
): { selling_categories?: string; other_category?: string } {
    const otherError = validateOther(other)
    if (otherError) return { other_category: otherError }
    if (ids.length === 0 && !normalizeOther(other)) return { selling_categories: CATEGORY_REQUIRED_MESSAGE }
    return {}
}

export interface CategoryOption {
    id: string
    name: string
}

export interface CategoryPickerValue {
    ids: string[]
    other: string
}

export interface CategoryPickerProps {
    id?: string
    value: CategoryPickerValue
    onChange: (next: CategoryPickerValue) => void
    /** Selection error (for example "Choose at least one category..."). */
    error?: string
    /** Error for the Other text field (format or API). */
    otherError?: string
    /** Reports the loaded top-level categories so the parent can show names (for example on a review step). */
    onCatalog?: (categories: CategoryOption[]) => void
    /** Names for ids that may not be in the loaded list (for example from a saved profile). */
    knownNames?: Record<string, string>
    label?: string
    helper?: string
}

const chipBase =
    'inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 py-2 text-left text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400'
const chipOff =
    'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'
const chipOn =
    'border-primary-700 dark:border-primary-400 bg-primary-50 dark:bg-zinc-800 text-primary-800 dark:text-primary-300'
const chipDisabled =
    'cursor-not-allowed border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500'

const SKELETON_WIDTHS = ['w-24', 'w-32', 'w-20', 'w-28', 'w-36', 'w-24', 'w-20', 'w-32', 'w-28', 'w-24']

function ChipSkeleton() {
    return (
        <div className="flex flex-wrap gap-2" aria-hidden>
            {SKELETON_WIDTHS.map((w, i) => (
                <span key={i} className={`h-11 ${w} animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800`} />
            ))}
        </div>
    )
}

function PickerInner({
    id,
    value,
    onChange,
    error,
    otherError,
    onCatalog,
    knownNames,
    label,
    helper,
    onRetry,
}: CategoryPickerProps & { onRetry: () => void }) {
    const { categories, loading, error: loadFailed } = useCatalogCategories()
    const [query, setQuery] = useState('')
    const [otherOpen, setOtherOpen] = useState(value.other.length > 0)
    const [otherTouched, setOtherTouched] = useState(false)

    const options = useMemo<CategoryOption[]>(
        () =>
            categories
                .map((c) => ({ id: c.id, name: c.name.trim() }))
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
        [categories]
    )

    useEffect(() => {
        if (!loading && !loadFailed) onCatalog?.(options)
    }, [loading, loadFailed, options, onCatalog])

    // When categories cannot load, Other is the only way to answer the question.
    useEffect(() => {
        if (loadFailed) setOtherOpen(true)
    }, [loadFailed])

    const nameById = useMemo(() => {
        const map: Record<string, string> = { ...(knownNames ?? {}) }
        for (const o of options) map[o.id] = o.name
        return map
    }, [options, knownNames])

    const q = query.trim().toLowerCase()
    const visible = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options
    const atLimit = value.ids.length >= MAX_SELLING_CATEGORIES
    const labelId = `${id}-label`
    const otherId = `${id}-other`

    function toggle(catId: string) {
        if (value.ids.includes(catId)) {
            onChange({ ...value, ids: value.ids.filter((x) => x !== catId) })
        } else if (!atLimit) {
            onChange({ ...value, ids: [...value.ids, catId] })
        }
    }

    function toggleOther() {
        if (otherOpen) {
            setOtherOpen(false)
            setOtherTouched(false)
            onChange({ ...value, other: '' })
        } else {
            setOtherOpen(true)
        }
    }

    const otherLength = normalizeOther(value.other).length
    const localOtherError = value.other && (otherTouched || !OTHER_ALLOWED.test(normalizeOther(value.other))) ? validateOther(value.other) : null
    const shownOtherError = otherError || localOtherError || undefined
    const hasSelection = value.ids.length > 0 || otherLength > 0

    return (
        <div role="group" aria-labelledby={labelId}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
                <span id={labelId} className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    {label ?? 'What do you sell?'}
                </span>
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400">Required</span>
            </div>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {helper ?? 'Pick everything you sell — you can change this later'}
            </p>

            {hasSelection ? (
                <div className="mb-2">
                    <p className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
                        Selected ({value.ids.length}/{MAX_SELLING_CATEGORIES})
                    </p>
                    <ul className="flex flex-wrap gap-2">
                        {value.ids.map((catId) => {
                            const name = nameById[catId] ?? 'Selected category'
                            return (
                                <li key={catId}>
                                    <button
                                        type="button"
                                        onClick={() => toggle(catId)}
                                        aria-label={`Remove ${name}`}
                                        className={`${chipBase} ${chipOn}`}
                                    >
                                        <span className="min-w-0 break-words">{name}</span>
                                        <X className="h-4 w-4 shrink-0" aria-hidden />
                                    </button>
                                </li>
                            )
                        })}
                        {otherLength > 0 ? (
                            <li>
                                <button
                                    type="button"
                                    onClick={toggleOther}
                                    aria-label="Remove Other category"
                                    className={`${chipBase} ${chipOn}`}
                                >
                                    <span className="min-w-0 break-words">Other: {normalizeOther(value.other)}</span>
                                    <X className="h-4 w-4 shrink-0" aria-hidden />
                                </button>
                            </li>
                        ) : null}
                    </ul>
                </div>
            ) : null}

            {loading ? (
                <ChipSkeleton />
            ) : loadFailed ? (
                <div
                    role="alert"
                    className="flex flex-col gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between"
                >
                    <p className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        We could not load the category list. Retry, or describe what you sell under Other.
                    </p>
                    <button
                        type="button"
                        onClick={onRetry}
                        className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-700 bg-white px-3 text-sm font-semibold text-amber-900 dark:border-amber-400 dark:bg-amber-950 dark:text-amber-100"
                    >
                        <RefreshCw className="h-4 w-4" aria-hidden />
                        Retry
                    </button>
                </div>
            ) : (
                <>
                    {options.length > 0 ? (
                        <div className="relative mb-2">
                            <Search
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400"
                                aria-hidden
                            />
                            <input
                                id={`${id}-filter`}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search categories"
                                aria-label="Search categories"
                                autoComplete="off"
                                maxLength={60}
                                className={`${inputClass} border-gray-300 pl-9 focus:border-primary-700 focus:ring-primary-200 dark:border-gray-700 dark:focus:ring-primary-900`}
                            />
                        </div>
                    ) : null}

                    {options.length === 0 ? (
                        <p className="rounded-lg border border-zinc-300 bg-white p-3 text-sm text-gray-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300">
                            No categories are available yet. Describe what you sell under Other.
                        </p>
                    ) : (
                        <div className="max-h-56 overflow-y-auto rounded-lg border border-zinc-300 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900">
                            {visible.length === 0 ? (
                                <p className="p-2 text-sm text-gray-600 dark:text-gray-300">
                                    No categories match &ldquo;{query.trim()}&rdquo;. If yours is not listed, choose Other below.
                                </p>
                            ) : (
                                <ul className="flex flex-wrap gap-2">
                                    {visible.map((o) => {
                                        const selected = value.ids.includes(o.id)
                                        const disabled = !selected && atLimit
                                        return (
                                            <li key={o.id}>
                                                <button
                                                    type="button"
                                                    aria-pressed={selected}
                                                    disabled={disabled}
                                                    onClick={() => toggle(o.id)}
                                                    className={`${chipBase} ${
                                                        selected ? chipOn : disabled ? chipDisabled : chipOff
                                                    }`}
                                                >
                                                    {selected ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                                                    <span className="min-w-0 break-words">{o.name}</span>
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>
                    )}
                </>
            )}

            {atLimit ? (
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-300" role="status">
                    You can pick up to {MAX_SELLING_CATEGORIES} categories. Remove one to add another.
                </p>
            ) : null}

            <div className="mt-2">
                <button
                    type="button"
                    aria-pressed={otherOpen}
                    onClick={toggleOther}
                    className={`${chipBase} ${otherOpen ? chipOn : chipOff}`}
                >
                    {otherOpen ? <Check className="h-4 w-4 shrink-0" aria-hidden /> : null}
                    Other
                </button>
            </div>

            {otherOpen ? (
                <div className="mt-2">
                    <label htmlFor={otherId} className="mb-1 flex items-baseline justify-between gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                        <span>Tell us the category</span>
                        <span
                            className={`text-xs font-normal ${
                                otherLength > OTHER_MAX
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-500 dark:text-gray-400'
                            }`}
                        >
                            {otherLength}/{OTHER_MAX}
                        </span>
                    </label>
                    <input
                        id={otherId}
                        type="text"
                        value={value.other}
                        maxLength={OTHER_MAX + 20}
                        autoComplete="off"
                        aria-invalid={shownOtherError ? true : undefined}
                        aria-describedby={shownOtherError ? `${otherId}-error` : `${otherId}-hint`}
                        onChange={(e) => onChange({ ...value, other: e.target.value })}
                        onBlur={() => {
                            setOtherTouched(true)
                            if (value.other !== normalizeOther(value.other)) {
                                onChange({ ...value, other: normalizeOther(value.other) })
                            }
                        }}
                        className={`${inputClass} ${
                            shownOtherError
                                ? 'border-red-500 focus:border-red-600 focus:ring-red-200 dark:focus:ring-red-900'
                                : 'border-gray-300 focus:border-primary-700 focus:ring-primary-200 dark:border-gray-700 dark:focus:ring-primary-900'
                        }`}
                    />
                    {shownOtherError ? (
                        <p id={`${otherId}-error`} role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                            {shownOtherError}
                        </p>
                    ) : (
                        <p id={`${otherId}-hint`} className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {OTHER_MIN}-{OTHER_MAX} characters. Letters, numbers, spaces, &amp; , and - only.
                        </p>
                    )}
                </div>
            ) : null}

            {error ? (
                <p id={`${id}-error`} role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    {error}
                </p>
            ) : null}
        </div>
    )
}

/**
 * Required multi-select of top-level catalog categories with an "Other" free-text escape hatch.
 * Self-contained (loads categories itself) so it can be reused, for example in Seller Settings.
 */
export default function CategoryPicker({ id = 'selling_categories', ...props }: CategoryPickerProps) {
    // Bumping the key remounts the inner component, which re-runs the category fetch (Retry).
    const [attempt, setAttempt] = useState(0)
    return <PickerInner key={attempt} id={id} {...props} onRetry={() => setAttempt((n) => n + 1)} />
}
