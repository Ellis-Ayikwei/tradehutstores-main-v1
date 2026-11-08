'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileText, Loader2, RefreshCw, ShieldCheck, Upload } from 'lucide-react'
import {
    Notice,
    Panel,
    StatusBadge,
    btnPrimary,
    btnSecondary,
    btnSmall,
    linkClass,
    type Tone,
} from '@/components/seller-central/ui'
import { toSellerError, stringList } from '@/lib/seller/errors'
import {
    BUSINESS_TYPE_LABELS,
    DOCUMENT_ACCEPT,
    DOCUMENT_KINDS,
    DOCUMENT_KIND_LABELS,
    ID_TYPE_LABELS,
    resubmitSellerApplication,
    uploadSellerDocument,
    validateDocumentFile,
} from '@/lib/seller/profile'
import type { DocumentKind, DocumentStatus, SellerDocument, SellerProfile, VerificationStatus } from '@/lib/seller/types'

const PROFILE_TAB = '/seller-central/settings?tab=profile'

const STATUS_BADGE: Record<VerificationStatus, { label: string; tone: Tone }> = {
    pending: { label: 'Pending review', tone: 'warning' },
    verified: { label: 'Verified', tone: 'success' },
    rejected: { label: 'Rejected', tone: 'danger' },
    suspended: { label: 'Suspended', tone: 'danger' },
}

const DOC_BADGE: Record<DocumentStatus, { label: string; tone: Tone }> = {
    pending: { label: 'Under review', tone: 'warning' },
    approved: { label: 'Approved', tone: 'success' },
    rejected: { label: 'Rejected', tone: 'danger' },
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-zinc-600 dark:text-zinc-400">{label}</dt>
            <dd className="break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</dd>
        </div>
    )
}

interface DocumentRowProps {
    kind: DocumentKind
    doc?: SellerDocument
    needed: boolean
    optional: boolean
    locked: boolean
    uploading: boolean
    busy: boolean
    error?: string
    onPick: (kind: DocumentKind, file: File) => void
}

function DocumentRow({ kind, doc, needed, optional, locked, uploading, busy, error, onPick }: DocumentRowProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const label = DOCUMENT_KIND_LABELS[kind]
    const badge = doc ? DOC_BADGE[doc.status] : needed ? { label: 'Needed', tone: 'warning' as Tone } : { label: 'Not uploaded', tone: 'neutral' as Tone }
    const uploaded = doc?.uploaded_at ? new Date(doc.uploaded_at) : null
    const inputId = `doc-${kind}`

    return (
        <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</p>
                        <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                        {optional && !doc ? <span className="text-xs text-zinc-600 dark:text-zinc-400">Optional</span> : null}
                    </div>
                    {doc?.note ? <p className="break-words text-sm text-red-700 dark:text-red-400">{doc.note}</p> : null}
                    {uploaded && !Number.isNaN(uploaded.getTime()) ? (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">Uploaded {uploaded.toLocaleDateString()}</p>
                    ) : null}
                    {error ? (
                        <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
                            {error}
                        </p>
                    ) : null}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 pl-6 sm:pl-0">
                {doc?.url ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" aria-label={`View ${label}`} className={`${linkClass} text-sm`}>
                        View
                    </a>
                ) : null}
                {!locked ? (
                    <>
                        <input
                            id={inputId}
                            ref={inputRef}
                            type="file"
                            accept={DOCUMENT_ACCEPT}
                            className="sr-only"
                            tabIndex={-1}
                            aria-label={`Choose file for ${label}`}
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                e.target.value = ''
                                if (file) onPick(kind, file)
                            }}
                        />
                        <button
                            type="button"
                            className={`${doc ? btnSecondary : btnPrimary} ${btnSmall}`}
                            disabled={busy}
                            onClick={() => inputRef.current?.click()}
                            aria-label={`${doc ? 'Replace' : 'Upload'} ${label}`}
                        >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Upload className="h-4 w-4" aria-hidden />}
                            {uploading ? 'Uploading' : doc ? 'Replace' : 'Upload'}
                        </button>
                    </>
                ) : null}
            </div>
        </li>
    )
}

interface VerificationTabProps {
    profile: SellerProfile
    /** Re-fetches the profile after an upload or resubmission. */
    onChanged: () => Promise<unknown>
}

export function VerificationTab({ profile, onChanged }: VerificationTabProps) {
    const [uploadingKind, setUploadingKind] = useState<DocumentKind | null>(null)
    const [rowErrors, setRowErrors] = useState<Partial<Record<DocumentKind, string>>>({})
    const [uploadedNotice, setUploadedNotice] = useState<string | null>(null)
    const [resubmitting, setResubmitting] = useState(false)
    const [resubmitError, setResubmitError] = useState<string | null>(null)
    const [resubmitNeedsCategories, setResubmitNeedsCategories] = useState(false)
    const [resubmitted, setResubmitted] = useState(false)

    const status = profile.verification_status
    const badge = STATUS_BADGE[status]
    const missing = profile.missing_documents
    const locked = status === 'verified' || status === 'suspended'
    const registered = profile.business_type === 'registered_business'
    const docByKind = new Map(profile.documents.map((d) => [d.kind, d]))
    const visibleKinds = DOCUMENT_KINDS.filter((k) => k !== 'business_registration' || registered || docByKind.has(k) || missing.includes(k))

    const details: { label: string; value: string }[] = [
        profile.business_type ? { label: 'Business type', value: BUSINESS_TYPE_LABELS[profile.business_type] ?? profile.business_type } : null,
        profile.business_registration_number ? { label: 'Registration number', value: profile.business_registration_number } : null,
        profile.tax_id ? { label: 'Tax ID', value: profile.tax_id } : null,
        profile.id_type ? { label: 'ID type', value: ID_TYPE_LABELS[profile.id_type] ?? profile.id_type } : null,
        profile.id_number_last4 ? { label: 'ID number', value: `**** ${profile.id_number_last4}` } : null,
    ].filter((d): d is { label: string; value: string } => d !== null)

    const missingCategories = profile.missing_fields.includes('selling_categories')
    const canResubmit = !locked && missing.length === 0 && !missingCategories && (status === 'rejected' || Boolean(profile.can_resubmit))
    const busy = uploadingKind !== null || resubmitting

    const handlePick = async (kind: DocumentKind, file: File) => {
        const problem = validateDocumentFile(file)
        setRowErrors((e) => ({ ...e, [kind]: problem ?? undefined }))
        setUploadedNotice(null)
        if (problem) return
        setUploadingKind(kind)
        try {
            await uploadSellerDocument(kind, file)
            setResubmitted(false)
            setUploadedNotice(`${DOCUMENT_KIND_LABELS[kind]} uploaded.`)
            await onChanged()
        } catch (e) {
            setRowErrors((prev) => ({ ...prev, [kind]: toSellerError(e).message }))
        } finally {
            setUploadingKind(null)
        }
    }

    const handleResubmit = async () => {
        setResubmitting(true)
        setResubmitError(null)
        setResubmitNeedsCategories(false)
        setUploadedNotice(null)
        try {
            await resubmitSellerApplication()
            setResubmitted(true)
            await onChanged()
        } catch (e) {
            const err = toSellerError(e)
            const missingFields = [...stringList(err.data.missing_fields), ...stringList(err.data.missing)]
            if (err.code === 'missing_categories' || missingFields.includes('selling_categories')) {
                // Not a generic failure: point the seller at the Profile tab instead.
                setResubmitNeedsCategories(true)
            } else {
                setResubmitError(err.message)
            }
            await onChanged().catch(() => undefined)
        } finally {
            setResubmitting(false)
        }
    }

    return (
        <div className="space-y-3">
            <Panel
                title="Verification status"
                actions={<StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
                bodyClassName="space-y-2 p-3 text-sm text-zinc-800 dark:text-zinc-200 sm:p-4"
            >
                {status === 'verified' ? (
                    <p className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-700 dark:text-green-400" aria-hidden />
                        Your store is verified. Your products can be seen by buyers.
                    </p>
                ) : null}
                {status === 'pending' ? (
                    <p className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                        <span>
                            Your application is with our team for review. Your products won&apos;t be live until your store is verified, but you can keep preparing your listings.
                        </span>
                    </p>
                ) : null}
                {status === 'rejected' ? (
                    <div className="space-y-2">
                        <p className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" aria-hidden />
                            <span>Your application was not approved. Your products won&apos;t be live until your store is verified.</span>
                        </p>
                        <p className="break-words rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                            <span className="font-semibold">Reason:</span> {profile.verification_notes?.trim() || 'No reason was given. Please contact us.'}
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">Fix the points above, replace any document that needs it, then resubmit your application.</p>
                    </div>
                ) : null}
                {status === 'suspended' ? (
                    <p className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" aria-hidden />
                        <span>
                            Your store is suspended and your products are not visible. Contact us on{' '}
                            <a href="tel:+233248138722" className={linkClass}>
                                024 813 8722
                            </a>{' '}
                            or{' '}
                            <a href="https://wa.me/233248138722" target="_blank" rel="noopener noreferrer" className={linkClass}>
                                WhatsApp
                            </a>
                            .
                        </span>
                    </p>
                ) : null}
            </Panel>

            {details.length ? (
                <Panel title="Submitted details" description="What you gave us when you applied. These can't be edited here.">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                        {details.map((d) => (
                            <DetailRow key={d.label} label={d.label} value={d.value} />
                        ))}
                    </dl>
                </Panel>
            ) : null}

            <Panel
                title="Documents"
                description="JPG, PNG or PDF, up to 10 MB each. Our team reviews your application once the documents we need are uploaded."
            >
                <div className="space-y-2">
                    {missing.length ? (
                        <Notice tone="warning" role="status">
                            <span className="font-semibold">Still needed:</span> {missing.map((k) => DOCUMENT_KIND_LABELS[k] ?? k).join(', ')}.
                        </Notice>
                    ) : null}
                    {uploadedNotice ? (
                        <Notice tone="success" role="status">
                            {uploadedNotice}
                        </Notice>
                    ) : null}
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {visibleKinds.map((kind) => (
                            <DocumentRow
                                key={kind}
                                kind={kind}
                                doc={docByKind.get(kind)}
                                needed={missing.includes(kind)}
                                optional={kind === 'selfie_with_id'}
                                locked={locked}
                                uploading={uploadingKind === kind}
                                busy={busy}
                                error={rowErrors[kind]}
                                onPick={handlePick}
                            />
                        ))}
                    </ul>
                </div>
            </Panel>

            {!locked ? (
                <div className="sticky bottom-0 z-20 flex flex-col gap-2 border-t border-zinc-200 bg-zinc-100 py-2.5 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 text-sm text-zinc-700 dark:text-zinc-300" aria-live="polite">
                        {resubmitError ? (
                            <p role="alert" className="font-medium text-red-700 dark:text-red-400">
                                {resubmitError}
                            </p>
                        ) : missingCategories || resubmitNeedsCategories ? (
                            <p className="flex flex-wrap items-center gap-x-3 gap-y-1" role={resubmitNeedsCategories ? 'alert' : undefined}>
                                <span className={resubmitNeedsCategories ? 'font-medium text-red-700 dark:text-red-400' : undefined}>Add what you sell in the Store profile tab first.</span>
                                <Link href={PROFILE_TAB} className={linkClass}>
                                    Go to Store profile
                                </Link>
                                {missing.length ? <span className="basis-full">Then upload the missing documents.</span> : null}
                            </p>
                        ) : resubmitted ? (
                            <p role="status">Application resubmitted for review.</p>
                        ) : missing.length ? (
                            <p>Upload the missing documents to resubmit.</p>
                        ) : canResubmit ? (
                            <p>Ready to send for review.</p>
                        ) : (
                            <p>Resubmitting is only needed if your application is not approved. Changes you make now are included when we review it.</p>
                        )}
                    </div>
                    <button type="button" className={`${btnPrimary} shrink-0`} disabled={!canResubmit || busy} onClick={() => void handleResubmit()}>
                        {resubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
                        Resubmit for review
                    </button>
                </div>
            ) : null}
        </div>
    )
}
