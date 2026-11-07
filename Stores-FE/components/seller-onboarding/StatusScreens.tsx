'use client'

import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import {
    AlertTriangle,
    BadgeCheck,
    Clock,
    Loader2,
    MapPin,
    MessageCircle,
    Phone,
    Store,
    XCircle,
} from 'lucide-react'
import CategoryPicker, {
    CATEGORY_REQUIRED_MESSAGE,
    normalizeOther,
    validateCategorySelection,
} from '@/components/seller-onboarding/CategoryPicker'
import DocumentSlot, { validateDocFile } from '@/components/seller-onboarding/DocumentSlot'
import { useSellerStatus } from '@/hooks/useSellerStatus'
import {
    DOC_LABELS,
    SELLER_DASHBOARD_URL,
    parseApiError,
    updateSellerProfile,
    uploadSellerDocument,
    type DocKind,
    type SellerDocument,
} from '@/lib/sellerOnboardingApi'

export const primaryBtn =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 active:bg-primary-900 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 transition-colors'
export const secondaryBtn =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800 transition-colors'

function StatusCard({
    icon,
    iconClass,
    title,
    children,
}: {
    icon: ReactNode
    iconClass: string
    title: string
    children: ReactNode
}) {
    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${iconClass}`}>{icon}</span>
                <h1 className="pt-1.5 font-syne text-xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
                    {title}
                </h1>
            </div>
            <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300">{children}</div>
        </section>
    )
}

/** Link to the seller dashboard. Hidden (dev-only note) when NEXT_PUBLIC_ADMIN_URL is unset. */
export function GoToStore({ label = 'Go to my store' }: { label?: string }) {
    if (SELLER_DASHBOARD_URL) {
        return (
            <a href={SELLER_DASHBOARD_URL} className={primaryBtn}>
                <Store className="h-4 w-4" aria-hidden />
                {label}
            </a>
        )
    }
    if (process.env.NODE_ENV === 'development') {
        return (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Dev only: set NEXT_PUBLIC_ADMIN_URL in Stores-FE/.env to show the &quot;{label}&quot; link.
            </p>
        )
    }
    return null
}

function ContactBlock() {
    return (
        <div className="rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
            <div className="flex flex-col gap-2 sm:flex-row">
                <a href="tel:+233248138722" className={primaryBtn}>
                    <Phone className="h-4 w-4" aria-hidden />
                    Call 024 813 8722
                </a>
                <a href="https://wa.me/233248138722" target="_blank" rel="noopener noreferrer" className={secondaryBtn}>
                    <MessageCircle className="h-4 w-4" aria-hidden />
                    WhatsApp us
                </a>
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                La Trade Fair, Accra, Ghana
            </p>
        </div>
    )
}

/** Upload slots for documents the application still needs (also the resume path after a refresh). */
function MissingDocuments({
    kinds,
    documents,
    onDone,
}: {
    kinds: DocKind[]
    documents: SellerDocument[]
    onDone: () => Promise<unknown>
}) {
    const [files, setFiles] = useState<Partial<Record<DocKind, File>>>({})
    const [errors, setErrors] = useState<Partial<Record<DocKind, string>>>({})
    const [busy, setBusy] = useState(false)
    const chosen = kinds.filter((k) => files[k])

    async function upload() {
        setBusy(true)
        const nextErrors: Partial<Record<DocKind, string>> = {}
        for (const kind of chosen) {
            try {
                await uploadSellerDocument(kind, files[kind] as File)
                setFiles((prev) => {
                    const copy = { ...prev }
                    delete copy[kind]
                    return copy
                })
            } catch (err) {
                const parsed = parseApiError(err)
                nextErrors[kind] = parsed.fields.file ?? parsed.fields.kind ?? parsed.message
            }
        }
        setErrors(nextErrors)
        await onDone()
        setBusy(false)
    }

    return (
        <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Documents still needed</p>
            {kinds.map((kind) => (
                <DocumentSlot
                    key={kind}
                    label={DOC_LABELS[kind]}
                    required
                    file={files[kind] ?? null}
                    existing={documents.find((d) => d.kind === kind)}
                    error={errors[kind]}
                    disabled={busy}
                    onSelect={(file) => {
                        if (!file) {
                            setFiles((prev) => {
                                const copy = { ...prev }
                                delete copy[kind]
                                return copy
                            })
                            return
                        }
                        const problem = validateDocFile(file)
                        setErrors((prev) => ({ ...prev, [kind]: problem ?? undefined }))
                        if (!problem) setFiles((prev) => ({ ...prev, [kind]: file }))
                    }}
                />
            ))}
            <button type="button" onClick={upload} disabled={busy || chosen.length === 0} className={`${primaryBtn} w-full sm:w-auto`}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {busy ? 'Uploading...' : chosen.length === 0 ? 'Upload documents' : `Upload ${chosen.length} document${chosen.length === 1 ? '' : 's'}`}
            </button>
        </div>
    )
}

const NEEDS_CATEGORIES = 'selling_categories'

/** Solid warning notice shown when the backend reports `missing_fields` includes selling_categories. */
function CategoriesNotice({ children }: { children?: ReactNode }) {
    return (
        <div
            role="status"
            className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
            <p className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                    <span className="block font-bold">Tell us what you sell</span>
                    Your application has no product categories yet. Add at least one category, or describe what you sell under Other, so we can
                    review it.
                </span>
            </p>
            {children}
        </div>
    )
}

/**
 * "Complete your application" flow for pending sellers: only the missing pieces (categories), saved with
 * PATCH sellers/me/. Never calls resubmit; the application is already under review.
 */
function CompleteCategories({ onDone, onCancel }: { onDone: () => Promise<unknown>; onCancel: () => void }) {
    const { profile } = useSellerStatus()
    const [value, setValue] = useState<{ ids: string[]; other: string }>(() => ({
        ids: (profile?.selling_categories ?? []).map((c) => c.id),
        other: profile?.other_category ?? '',
    }))
    const [errors, setErrors] = useState<{ selling_categories?: string; other_category?: string }>({})
    const [general, setGeneral] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    async function save() {
        const found = validateCategorySelection(value.ids, value.other)
        setErrors(found)
        if (found.selling_categories || found.other_category) return
        setBusy(true)
        setGeneral(null)
        try {
            await updateSellerProfile({ selling_categories: value.ids, other_category: normalizeOther(value.other) })
            await onDone()
            onCancel()
        } catch (err) {
            const parsed = parseApiError(err)
            const next = {
                selling_categories: parsed.fields.selling_categories ?? (parsed.code === 'missing_categories' ? CATEGORY_REQUIRED_MESSAGE : undefined),
                other_category: parsed.fields.other_category,
            }
            setErrors(next)
            setGeneral(next.selling_categories || next.other_category ? null : parsed.message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
            {general ? (
                <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
                    {general}
                </p>
            ) : null}
            <CategoryPicker
                value={value}
                onChange={(next) => {
                    setValue(next)
                    setErrors({})
                }}
                error={errors.selling_categories}
                otherError={errors.other_category}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={save} disabled={busy} className={primaryBtn}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                    {busy ? 'Saving...' : 'Save categories'}
                </button>
                <button type="button" onClick={onCancel} disabled={busy} className={secondaryBtn}>
                    Cancel
                </button>
            </div>
        </div>
    )
}

export function PendingScreen({
    missing,
    documents,
    onRefresh,
}: {
    missing: DocKind[]
    documents: SellerDocument[]
    onRefresh: () => Promise<unknown>
}) {
    const { missingFields } = useSellerStatus()
    const [completing, setCompleting] = useState(false)
    const needsCategories = missingFields.includes(NEEDS_CATEGORIES)
    return (
        <StatusCard
            icon={<Clock className="h-5 w-5" aria-hidden />}
            iconClass="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100"
            title="Application received"
        >
            <p>
                We are reviewing your details. You can already prepare your listings; they go live once you are verified.
            </p>
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Your products will not be visible to buyers until your store is verified.
            </p>
            {needsCategories ? (
                <CategoriesNotice>
                    {completing ? (
                        <CompleteCategories onDone={onRefresh} onCancel={() => setCompleting(false)} />
                    ) : (
                        <button type="button" onClick={() => setCompleting(true)} className={primaryBtn}>
                            Add what you sell
                        </button>
                    )}
                </CategoriesNotice>
            ) : null}
            {missing.length > 0 ? <MissingDocuments kinds={missing} documents={documents} onDone={onRefresh} /> : null}
            <div className="flex flex-col gap-2 sm:flex-row">
                <GoToStore />
                <Link href="/" className={secondaryBtn}>
                    Back to shop
                </Link>
            </div>
        </StatusCard>
    )
}

export function RejectedScreen({
    notes,
    canResubmit,
    onEdit,
}: {
    notes: string | null
    canResubmit: boolean
    onEdit: () => void
}) {
    const { missingFields } = useSellerStatus()
    const needsCategories = missingFields.includes(NEEDS_CATEGORIES)
    return (
        <StatusCard
            icon={<XCircle className="h-5 w-5" aria-hidden />}
            iconClass="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
            title="Application not approved"
        >
            <p>We could not verify your store yet. Here is the reason from our team:</p>
            <blockquote className="whitespace-pre-line rounded-lg border-l-4 border-red-600 bg-red-50 p-3 text-red-900 dark:bg-red-950 dark:text-red-100">
                {notes?.trim() || 'No reason was provided. Please contact us for details.'}
            </blockquote>
            {needsCategories ? (
                <CategoriesNotice>
                    {canResubmit ? (
                        <button type="button" onClick={onEdit} className={primaryBtn}>
                            Add what you sell
                        </button>
                    ) : null}
                </CategoriesNotice>
            ) : null}
            <p>Your products stay hidden from buyers until your store is verified.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
                {canResubmit ? (
                    <button type="button" onClick={onEdit} className={primaryBtn}>
                        Update and resubmit
                    </button>
                ) : null}
                <GoToStore label="My store" />
            </div>
            {!canResubmit ? <ContactBlock /> : null}
        </StatusCard>
    )
}

export function SuspendedScreen() {
    return (
        <StatusCard
            icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            iconClass="bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100"
            title="Seller account suspended"
        >
            <p>Your seller account is currently suspended and your products are not visible to buyers. Please contact us to find out more.</p>
            <ContactBlock />
        </StatusCard>
    )
}

export function VerifiedScreen() {
    return (
        <StatusCard
            icon={<BadgeCheck className="h-5 w-5" aria-hidden />}
            iconClass="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
            title="You're verified"
        >
            <p>Your store is verified. Manage your listings and orders from your store dashboard.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
                <GoToStore />
                <Link href="/" className={secondaryBtn}>
                    Back to shop
                </Link>
            </div>
        </StatusCard>
    )
}

export function StatusSkeleton() {
    return (
        <div className="animate-pulse space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900" aria-busy="true">
            <div className="h-6 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-11 w-40 rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
    )
}

export function StatusError({ onRetry }: { onRetry: () => void }) {
    return (
        <StatusCard
            icon={<AlertTriangle className="h-5 w-5" aria-hidden />}
            iconClass="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
            title="Could not load your seller status"
        >
            <p>Check your connection and try again.</p>
            <button type="button" onClick={onRetry} className={primaryBtn}>
                Try again
            </button>
        </StatusCard>
    )
}
