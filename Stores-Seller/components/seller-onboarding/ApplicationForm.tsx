'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { storefrontHref } from '@/lib/storefront'
import CategoryPicker, {
    CATEGORY_REQUIRED_MESSAGE,
    normalizeOther,
    validateCategorySelection,
    type CategoryOption,
} from '@/components/seller-onboarding/CategoryPicker'
import DocumentSlot, { validateDocFile } from '@/components/seller-onboarding/DocumentSlot'
import { SelectField, TextAreaField, TextField } from '@/components/seller-onboarding/fields'
import { primaryBtn, secondaryBtn } from '@/components/seller-onboarding/StatusScreens'
import {
    DOC_LABELS,
    ID_TYPE_OPTIONS,
    parseApiError,
    resubmitApplication,
    submitOnboarding,
    updateSellerProfile,
    uploadSellerDocument,
    type BusinessType,
    type DocKind,
    type IdType,
    type OnboardingPayload,
    type SellerDocument,
    type SellerMe,
    type SellerProfilePatch,
} from '@/lib/sellerOnboardingApi'

type Mode = 'new' | 'resubmit'

interface Values {
    business_name: string
    business_type: BusinessType
    business_description: string
    /** Category uuids (max 10). */
    selling_categories: string[]
    /** Free-text category, only used under "Other". */
    other_category: string
    business_email: string
    business_phone: string
    business_address: string
    business_registration_number: string
    tax_id: string
    id_type: IdType
}

type Errors = Record<string, string>

const STEPS = ['Business', 'Identity', 'Documents', 'Review'] as const
const DOCS_STEP = 2
const REVIEW_STEP = 3

/** Which step each API field belongs to, for mapping DRF 400s. */
const FIELD_STEP: Record<string, number> = {
    business_name: 0,
    business_type: 0,
    business_description: 0,
    selling_categories: 0,
    other_category: 0,
    business_email: 0,
    business_phone: 0,
    business_address: 0,
    business_registration_number: 0,
    tax_id: 0,
    id_type: 1,
    id_number: 1,
    kind: DOCS_STEP,
    file: DOCS_STEP,
    accept_terms: REVIEW_STEP,
}

const GHANA_MOBILE = /^(?:\+?233|0)[25]\d{8}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const EMPTY: Values = {
    business_name: '',
    business_type: 'individual',
    business_description: '',
    selling_categories: [],
    other_category: '',
    business_email: '',
    business_phone: '',
    business_address: '',
    business_registration_number: '',
    tax_id: '',
    id_type: 'ghana_card',
}

// Draft text lives in sessionStorage so a refresh keeps it. ID numbers, files
// and the terms checkbox are deliberately never stored.
const draftKey = (mode: Mode) => `th_seller_application_v1_${mode}`

function readDraft(mode: Mode): { values?: Partial<Values>; step?: number } | null {
    try {
        const raw = sessionStorage.getItem(draftKey(mode))
        return raw ? (JSON.parse(raw) as { values?: Partial<Values>; step?: number }) : null
    } catch {
        return null
    }
}

function writeDraft(mode: Mode, values: Values, step: number) {
    try {
        sessionStorage.setItem(draftKey(mode), JSON.stringify({ values, step }))
    } catch {
        /* storage unavailable: nothing to persist */
    }
}

function clearDraft(mode: Mode) {
    try {
        sessionStorage.removeItem(draftKey(mode))
    } catch {
        /* storage unavailable */
    }
}

function fromProfile(p: SellerMe | null | undefined): Partial<Values> {
    if (!p) return {}
    return {
        business_name: p.business_name ?? '',
        business_type: p.business_type ?? 'individual',
        business_description: p.business_description ?? '',
        selling_categories: (p.selling_categories ?? []).map((c) => c.id),
        other_category: p.other_category ?? '',
        business_email: p.business_email ?? '',
        business_phone: p.business_phone ?? '',
        business_address: p.business_address ?? '',
        business_registration_number: p.business_registration_number ?? '',
        tax_id: p.tax_id ?? '',
        id_type: p.id_type ?? 'ghana_card',
    }
}

/** Guards against a stale or hand-edited draft: ids must be strings, other must be a string. */
function sanitizeCategories(v: Values): Values {
    const ids = Array.isArray(v.selling_categories)
        ? Array.from(new Set(v.selling_categories.filter((x): x is string => typeof x === 'string'))).slice(0, 10)
        : []
    return { ...v, selling_categories: ids, other_category: typeof v.other_category === 'string' ? v.other_category : '' }
}

function cleanPhone(v: string) {
    return v.replace(/[\s()-]/g, '')
}

function SectionTitle({ children }: { children: string }) {
    return <h2 className="font-syne text-lg font-extrabold text-gray-900 dark:text-white">{children}</h2>
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-3 py-1.5 text-sm">
            <dt className="shrink-0 text-gray-500 dark:text-gray-400">{label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-gray-900 dark:text-white">{value || '-'}</dd>
        </div>
    )
}

export interface ApplicationFormProps {
    mode: Mode
    /** Profile from GET sellers/me/ (resubmit mode prefill). */
    profile?: SellerMe | null
    documents?: SellerDocument[]
    missingDocuments?: DocKind[]
    /** Account email, used to prefill business_email. */
    defaultEmail?: string
    /** Called with true once the profile exists but uploads are unfinished, false when done. */
    onLock: (locked: boolean) => void
    /** Called after everything succeeded (refresh the seller status). */
    onFinished: () => Promise<unknown>
    onCancel?: () => void
}

export default function ApplicationForm({
    mode,
    profile,
    documents = [],
    missingDocuments = [],
    defaultEmail = '',
    onLock,
    onFinished,
    onCancel,
}: ApplicationFormProps) {
    // The form only renders after the client knows the user is signed in, so
    // reading sessionStorage in the initialisers cannot cause a hydration mismatch.
    const [values, setValues] = useState<Values>(() => {
        const draft = readDraft(mode)
        return sanitizeCategories({
            ...EMPTY,
            business_email: defaultEmail,
            ...fromProfile(profile),
            ...(draft?.values ?? {}),
        })
    })
    // Names for category ids (profile first, then the loaded catalog) for the review step.
    const [categoryNames, setCategoryNames] = useState<Record<string, string>>(() => {
        const map: Record<string, string> = {}
        for (const c of profile?.selling_categories ?? []) map[c.id] = c.name
        return map
    })
    const [step, setStep] = useState<number>(() => {
        const s = readDraft(mode)?.step
        return typeof s === 'number' && s >= 0 && s < DOCS_STEP ? s : 0
    })
    const [idNumber, setIdNumber] = useState('')
    const [acceptTerms, setAcceptTerms] = useState(false)
    const [files, setFiles] = useState<Partial<Record<DocKind, File>>>({})
    const [fileErrors, setFileErrors] = useState<Partial<Record<DocKind, string>>>({})
    const [uploaded, setUploaded] = useState<Partial<Record<DocKind, boolean>>>({})
    const [errors, setErrors] = useState<Errors>({})
    const [general, setGeneral] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [locked, setLocked] = useState(false)
    const [progressText, setProgressText] = useState<string | null>(null)

    const saved = useRef(false)
    const uploadedRef = useRef(new Set<DocKind>())
    const topRef = useRef<HTMLDivElement>(null)
    const firstRender = useRef(true)

    const isRegistered = values.business_type === 'registered_business'
    const isPassport = values.id_type === 'passport'
    const idLast4 = profile?.id_number_last4 ?? null

    useEffect(() => {
        if (locked) return
        writeDraft(mode, values, Math.min(step, DOCS_STEP - 1))
    }, [mode, values, step, locked])

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false
            return
        }
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [step])

    const docKinds = useMemo(() => {
        const kinds: { kind: DocKind; required: boolean }[] = [{ kind: 'id_card', required: true }]
        kinds.push({ kind: 'id_card_back', required: !isPassport })
        kinds.push({ kind: 'proof_of_address', required: true })
        if (isRegistered) kinds.push({ kind: 'business_registration', required: true })
        kinds.push({ kind: 'selfie_with_id', required: false })
        return kinds
    }, [isPassport, isRegistered])

    /** A required document is satisfied by a chosen file or by one already on file. */
    function hasDoc(kind: DocKind): boolean {
        if (files[kind]) return true
        return mode === 'resubmit' && documents.some((d) => d.kind === kind) && !missingDocuments.includes(kind)
    }

    function setValue<K extends keyof Values>(key: K, value: Values[K]) {
        setValues((prev) => ({ ...prev, [key]: value }))
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
    }

    const handleCatalog = useCallback((list: CategoryOption[]) => {
        const map: Record<string, string> = {}
        for (const c of list) map[c.id] = c.name
        setCategoryNames((prev) => ({ ...prev, ...map }))
        // Drop saved ids that are no longer in the catalog (for example a deactivated category).
        setValues((prev) => {
            const kept = prev.selling_categories.filter((id) => id in map)
            return kept.length === prev.selling_categories.length ? prev : { ...prev, selling_categories: kept }
        })
    }, [])

    function validateBusiness(): Errors {
        const e: Errors = { ...validateCategorySelection(values.selling_categories, values.other_category) }
        if (values.business_name.trim().length < 2) e.business_name = 'Enter your business or trading name.'
        if (!EMAIL.test(values.business_email.trim())) e.business_email = 'Enter a valid email address.'
        if (!GHANA_MOBILE.test(cleanPhone(values.business_phone))) {
            e.business_phone = 'Enter a Ghana mobile number, for example 024 xxx xxxx.'
        }
        if (!values.business_address.trim()) e.business_address = 'Enter your business address.'
        if (isRegistered && !values.business_registration_number.trim()) {
            e.business_registration_number = 'Enter your business registration number.'
        }
        return e
    }

    function validateIdentity(): Errors {
        const e: Errors = {}
        if (!idNumber.trim() && mode === 'new') e.id_number = 'Enter your ID number.'
        if (!idNumber.trim() && mode === 'resubmit' && !idLast4) e.id_number = 'Enter your ID number.'
        return e
    }

    function validateDocuments(): Errors {
        const e: Errors = {}
        for (const { kind, required } of docKinds) {
            if (required && !hasDoc(kind)) e[`doc_${kind}`] = `${DOC_LABELS[kind]} is required.`
        }
        return e
    }

    function validateStep(n: number): Errors {
        if (n === 0) return validateBusiness()
        if (n === 1) return validateIdentity()
        if (n === DOCS_STEP) return validateDocuments()
        return {}
    }

    function goNext() {
        const e = validateStep(step)
        setErrors(e)
        if (Object.keys(e).length > 0) return
        setGeneral(null)
        setStep((s) => Math.min(REVIEW_STEP, s + 1))
    }

    function goBack() {
        if (locked) return
        setGeneral(null)
        setStep((s) => Math.max(0, s - 1))
    }

    function selectFile(kind: DocKind, file: File | null) {
        setErrors((prev) => ({ ...prev, [`doc_${kind}`]: '' }))
        if (!file) {
            setFiles((prev) => {
                const copy = { ...prev }
                delete copy[kind]
                return copy
            })
            setFileErrors((prev) => ({ ...prev, [kind]: undefined }))
            uploadedRef.current.delete(kind)
            setUploaded((prev) => ({ ...prev, [kind]: false }))
            return
        }
        const problem = validateDocFile(file)
        setFileErrors((prev) => ({ ...prev, [kind]: problem ?? undefined }))
        if (problem) return
        setFiles((prev) => ({ ...prev, [kind]: file }))
        // A replaced file must be uploaded again.
        uploadedRef.current.delete(kind)
        setUploaded((prev) => ({ ...prev, [kind]: false }))
    }

    function buildPayload(): OnboardingPayload {
        return {
            business_name: values.business_name.trim(),
            business_type: values.business_type,
            business_description: values.business_description.trim() || undefined,
            selling_categories: values.selling_categories,
            other_category: normalizeOther(values.other_category),
            business_email: values.business_email.trim(),
            business_phone: cleanPhone(values.business_phone),
            business_address: values.business_address.trim(),
            business_registration_number: isRegistered ? values.business_registration_number.trim() : undefined,
            tax_id: values.tax_id.trim() || undefined,
            id_type: values.id_type,
            id_number: idNumber.trim(),
            accept_terms: true,
        }
    }

    function buildPatch(): SellerProfilePatch {
        const { accept_terms: _terms, id_number, ...rest } = buildPayload()
        void _terms
        return id_number ? { ...rest, id_number } : rest
    }

    /** Maps an API error to field messages, jumping to the earliest step with one. */
    function applyApiError(err: unknown): boolean {
        const parsed = parseApiError(err)
        const mapped: Errors = {}
        const leftovers: string[] = []
        let target: number | null = null
        // Backend `missing_categories` 400: send the user to the categories step.
        if (parsed.code === 'missing_categories') {
            mapped.selling_categories = CATEGORY_REQUIRED_MESSAGE
            target = 0
        }
        for (const [field, message] of Object.entries(parsed.fields)) {
            // `missing` / `missing_fields` are machine hints, never user-facing text.
            if (field === 'missing' || field === 'missing_fields') continue
            const fieldStep = FIELD_STEP[field]
            if (fieldStep === undefined) {
                leftovers.push(`${field.replace(/_/g, ' ')}: ${message}`)
                continue
            }
            if (fieldStep === DOCS_STEP) {
                setGeneral(message)
                if (target === null || fieldStep < target) target = fieldStep
                continue
            }
            mapped[field] = message
            if (target === null || fieldStep < target) target = fieldStep
        }
        setErrors((prev) => ({ ...prev, ...mapped }))
        const text = [parsed.message, ...leftovers].filter(Boolean).join(' ')
        if (text) setGeneral(text)
        else if (Object.keys(mapped).length > 0) setGeneral('Please fix the highlighted fields.')
        if (target !== null && !locked) setStep(target)
        return Object.keys(mapped).length > 0 || Object.keys(parsed.fields).length > 0
    }

    async function handleSubmit() {
        const all: Errors = { ...validateBusiness(), ...validateIdentity(), ...validateDocuments() }
        if (!acceptTerms && !locked) all.accept_terms = 'Please accept the terms to continue.'
        if (Object.keys(all).length > 0) {
            setErrors(all)
            if (all.accept_terms && Object.keys(all).length === 1) {
                setStep(REVIEW_STEP)
            } else {
                const first = Object.keys(all)[0]
                if (!locked) {
                    setStep(
                        first.startsWith('doc_') ? DOCS_STEP : FIELD_STEP[first] ?? 0
                    )
                }
            }
            return
        }

        setSubmitting(true)
        setGeneral(null)
        setErrors({})
        try {
            if (!saved.current) {
                try {
                    if (mode === 'new') await submitOnboarding(buildPayload())
                    else await updateSellerProfile(buildPatch())
                } catch (err) {
                    const parsed = parseApiError(err)
                    const alreadySeller = mode === 'new' && parsed.status === 409 && parsed.code === 'already_seller'
                    if (!alreadySeller) throw err
                }
                saved.current = true
                setLocked(true)
                onLock(true)
            }

            const pending = docKinds.map((d) => d.kind).filter((k) => files[k] && !uploadedRef.current.has(k))
            const failed: Partial<Record<DocKind, string>> = {}
            for (let i = 0; i < pending.length; i += 1) {
                const kind = pending[i]
                setProgressText(`Uploading ${DOC_LABELS[kind]} (${i + 1} of ${pending.length})`)
                try {
                    await uploadSellerDocument(kind, files[kind] as File)
                    uploadedRef.current.add(kind)
                    setUploaded((prev) => ({ ...prev, [kind]: true }))
                } catch (err) {
                    const parsed = parseApiError(err)
                    failed[kind] = parsed.fields.file ?? parsed.fields.kind ?? parsed.message
                }
            }
            setFileErrors(failed)
            if (Object.keys(failed).length > 0) {
                setStep(DOCS_STEP)
                setGeneral('Your application was saved, but some documents did not upload. Retry them below.')
                return
            }

            if (mode === 'resubmit') await resubmitApplication()

            clearDraft(mode)
            await onFinished()
            onLock(false)
        } catch (err) {
            applyApiError(err)
        } finally {
            setProgressText(null)
            setSubmitting(false)
        }
    }

    const activeStep = locked ? DOCS_STEP : step
    const hasFailedUploads = Object.values(fileErrors).some(Boolean)
    const isLastAction = locked || step === REVIEW_STEP

    return (
        <div ref={topRef} className="scroll-mt-28">
            <header className="mb-3">
                <h1 className="font-syne text-xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
                    {mode === 'resubmit' ? 'Update your application' : 'Apply to sell on TradeHut'}
                </h1>
                <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">
                    Step {activeStep + 1} of {STEPS.length}: {STEPS[activeStep]}
                </p>
                <ol className="mt-2 flex gap-1.5" aria-label="Progress">
                    {STEPS.map((label, i) => (
                        <li
                            key={label}
                            aria-current={i === activeStep ? 'step' : undefined}
                            className={`h-1.5 flex-1 rounded-full ${
                                i < activeStep
                                    ? 'bg-primary-700'
                                    : i === activeStep
                                      ? 'bg-primary-400'
                                      : 'bg-gray-200 dark:bg-gray-800'
                            }`}
                        >
                            <span className="sr-only">{label}</span>
                        </li>
                    ))}
                </ol>
            </header>

            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
                {locked ? (
                    <p className="mb-3 flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
                        <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        Your details are saved. Finish uploading your documents to complete the application.
                    </p>
                ) : null}

                {general ? (
                    <p
                        role="alert"
                        className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100"
                    >
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                        {general}
                    </p>
                ) : null}

                {activeStep === 0 && (
                    <div className="space-y-3">
                        <SectionTitle>Business details</SectionTitle>
                        <TextField
                            id="business_name"
                            label="Business or trading name"
                            value={values.business_name}
                            onChange={(e) => setValue('business_name', e.target.value)}
                            autoComplete="organization"
                            error={errors.business_name}
                        />
                        <fieldset>
                            <legend className="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-100">I am selling as</legend>
                            <div className="grid grid-cols-2 gap-2">
                                {(
                                    [
                                        ['individual', 'An individual'],
                                        ['registered_business', 'A registered business'],
                                    ] as const
                                ).map(([value, label]) => (
                                    <label
                                        key={value}
                                        className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${
                                            values.business_type === value
                                                ? 'border-primary-700 bg-primary-50 text-primary-900 dark:bg-primary-900 dark:text-white'
                                                : 'border-gray-300 bg-white text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name="business_type"
                                            value={value}
                                            checked={values.business_type === value}
                                            onChange={() => setValue('business_type', value)}
                                            className="h-4 w-4 accent-primary-700"
                                        />
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        {isRegistered && (
                            <TextField
                                id="business_registration_number"
                                label="Business registration number"
                                value={values.business_registration_number}
                                onChange={(e) => setValue('business_registration_number', e.target.value)}
                                error={errors.business_registration_number}
                            />
                        )}
                        <TextField
                            id="tax_id"
                            label="Tax ID (TIN)"
                            optional
                            value={values.tax_id}
                            onChange={(e) => setValue('tax_id', e.target.value)}
                            error={errors.tax_id}
                        />
                        <CategoryPicker
                            value={{ ids: values.selling_categories, other: values.other_category }}
                            onChange={({ ids, other }) => {
                                setValues((prev) => ({ ...prev, selling_categories: ids, other_category: other }))
                                if (errors.selling_categories || errors.other_category) {
                                    setErrors((prev) => ({ ...prev, selling_categories: '', other_category: '' }))
                                }
                            }}
                            onCatalog={handleCatalog}
                            knownNames={categoryNames}
                            error={errors.selling_categories}
                            otherError={errors.other_category}
                        />
                        <TextAreaField
                            id="business_description"
                            label="Tell buyers about your store (optional)"
                            rows={3}
                            maxLength={500}
                            value={values.business_description}
                            onChange={(e) => setValue('business_description', e.target.value)}
                            hint={`${values.business_description.length}/500 characters`}
                            error={errors.business_description}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <TextField
                                id="business_email"
                                label="Business email"
                                type="email"
                                autoComplete="email"
                                value={values.business_email}
                                onChange={(e) => setValue('business_email', e.target.value)}
                                error={errors.business_email}
                            />
                            <TextField
                                id="business_phone"
                                label="Business phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                placeholder="Ghana mobile number"
                                value={values.business_phone}
                                onChange={(e) => setValue('business_phone', e.target.value)}
                                error={errors.business_phone}
                            />
                        </div>
                        <TextAreaField
                            id="business_address"
                            label="Business address"
                            rows={2}
                            autoComplete="street-address"
                            value={values.business_address}
                            onChange={(e) => setValue('business_address', e.target.value)}
                            error={errors.business_address}
                        />
                    </div>
                )}

                {activeStep === 1 && (
                    <div className="space-y-3">
                        <SectionTitle>Identity verification</SectionTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            We use this to verify the person behind the store. Only the last 4 digits of your ID number are shown back to you.
                        </p>
                        <SelectField
                            id="id_type"
                            label="ID type"
                            value={values.id_type}
                            onChange={(e) => setValue('id_type', e.target.value as IdType)}
                            error={errors.id_type}
                        >
                            {ID_TYPE_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectField>
                        <TextField
                            id="id_number"
                            label="ID number"
                            value={idNumber}
                            onChange={(e) => {
                                setIdNumber(e.target.value)
                                if (errors.id_number) setErrors((prev) => ({ ...prev, id_number: '' }))
                            }}
                            autoComplete="off"
                            autoCapitalize="characters"
                            spellCheck={false}
                            hint={
                                mode === 'resubmit' && idLast4
                                    ? `Leave blank to keep the number on file (ending ${idLast4}).`
                                    : undefined
                            }
                            error={errors.id_number}
                        />
                    </div>
                )}

                {activeStep === DOCS_STEP && (
                    <div className="space-y-3">
                        <SectionTitle>Documents</SectionTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            JPG, PNG or PDF, up to 10MB each. Make sure details are clear and readable.
                        </p>
                        {docKinds.map(({ kind, required }) => (
                            <DocumentSlot
                                key={kind}
                                label={kind === 'id_card' && isPassport ? 'Passport (photo page)' : DOC_LABELS[kind]}
                                hint={
                                    kind === 'id_card_back'
                                        ? isPassport
                                            ? 'Only if your passport has a second page with details.'
                                            : 'The back of your ID card.'
                                        : kind === 'proof_of_address'
                                        ? 'For example a utility bill or bank statement.'
                                        : kind === 'selfie_with_id'
                                          ? 'A photo of you holding your ID.'
                                          : undefined
                                }
                                required={required}
                                file={files[kind] ?? null}
                                existing={documents.find((d) => d.kind === kind)}
                                uploaded={uploaded[kind]}
                                error={fileErrors[kind] || errors[`doc_${kind}`] || undefined}
                                disabled={submitting}
                                onSelect={(f) => selectFile(kind, f)}
                            />
                        ))}
                    </div>
                )}

                {activeStep === REVIEW_STEP && (
                    <div className="space-y-3">
                        <SectionTitle>Review and submit</SectionTitle>
                        <dl className="divide-y divide-gray-100 rounded-xl bg-gray-50 px-3 dark:divide-gray-700 dark:bg-gray-800">
                            <ReviewRow label="Business" value={values.business_name} />
                            <ReviewRow
                                label="Selling as"
                                value={isRegistered ? 'Registered business' : 'Individual'}
                            />
                            {isRegistered && (
                                <ReviewRow label="Registration no." value={values.business_registration_number} />
                            )}
                            <ReviewRow label="Tax ID" value={values.tax_id} />
                            <ReviewRow
                                label="Selling"
                                value={[
                                    ...values.selling_categories.map((id) => categoryNames[id] ?? 'Category'),
                                    ...(normalizeOther(values.other_category)
                                        ? [`Other: ${normalizeOther(values.other_category)}`]
                                        : []),
                                ].join(', ')}
                            />
                            {values.business_description.trim() ? (
                                <ReviewRow label="About your store" value={values.business_description.trim()} />
                            ) : null}
                            <ReviewRow label="Email" value={values.business_email} />
                            <ReviewRow label="Phone" value={values.business_phone} />
                            <ReviewRow label="Address" value={values.business_address} />
                            <ReviewRow
                                label="ID"
                                value={`${ID_TYPE_OPTIONS.find((o) => o.value === values.id_type)?.label ?? ''} ${
                                    idNumber ? `ending ${idNumber.trim().slice(-4)}` : idLast4 ? `ending ${idLast4}` : ''
                                }`}
                            />
                            {docKinds.map(({ kind }) => (
                                <ReviewRow
                                    key={kind}
                                    label={DOC_LABELS[kind]}
                                    value={files[kind]?.name ?? (hasDoc(kind) ? 'On file' : 'Not added')}
                                />
                            ))}
                        </dl>
                        <label
                            className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                                errors.accept_terms ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={acceptTerms}
                                onChange={(e) => {
                                    setAcceptTerms(e.target.checked)
                                    if (errors.accept_terms) setErrors((prev) => ({ ...prev, accept_terms: '' }))
                                }}
                                className="mt-0.5 h-5 w-5 shrink-0 accent-primary-700"
                            />
                            <span className="text-gray-800 dark:text-gray-100">
                                I confirm the information I provided is accurate and I agree to the{' '}
                                <a
                                    href={storefrontHref('/legal/terms')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold text-primary-700 underline dark:text-primary-300"
                                >
                                    TradeHut terms
                                </a>
                                .
                            </span>
                        </label>
                        {errors.accept_terms ? (
                            <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                                {errors.accept_terms}
                            </p>
                        ) : null}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Your products will not be visible to buyers until your store is verified.
                        </p>
                    </div>
                )}
            </div>

            {progressText ? (
                <p className="mt-2 text-center text-xs text-gray-600 dark:text-gray-300" role="status">
                    {progressText}
                </p>
            ) : null}

            <div className="sticky bottom-0 z-20 -mx-4 mt-3 flex gap-2 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950 sm:mx-0 sm:rounded-xl sm:border">
                {!locked && step > 0 ? (
                    <button type="button" onClick={goBack} disabled={submitting} className={secondaryBtn}>
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Back
                    </button>
                ) : mode === 'resubmit' && onCancel && !locked ? (
                    <button type="button" onClick={onCancel} disabled={submitting} className={secondaryBtn}>
                        Cancel
                    </button>
                ) : null}

                {isLastAction ? (
                    <button type="button" onClick={handleSubmit} disabled={submitting} className={`${primaryBtn} flex-1`}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                        {submitting
                            ? 'Submitting...'
                            : locked
                              ? hasFailedUploads
                                  ? 'Retry failed uploads'
                                  : 'Finish application'
                              : mode === 'resubmit'
                                ? 'Resubmit application'
                                : 'Submit application'}
                    </button>
                ) : (
                    <button type="button" onClick={goNext} className={`${primaryBtn} flex-1`}>
                        Continue
                        <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                )}
            </div>
        </div>
    )
}
