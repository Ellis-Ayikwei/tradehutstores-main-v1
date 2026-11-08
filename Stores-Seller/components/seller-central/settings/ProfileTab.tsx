'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { ValidationError } from 'yup'
import CategoryPicker, { normalizeOther } from '@/components/seller-onboarding/CategoryPicker'
import {
    Notice,
    Panel,
    Switch,
    TextArea,
    TextInput,
    btnPrimary,
    btnSecondary,
} from '@/components/seller-central/ui'
import { IDENTITY_LOCKED_FIELDS, buildProfileSchema, toFormValues, type ProfileFormValues } from './profileSchema'
import { useUnsavedGuard } from './useUnsavedGuard'
import { toSellerError } from '@/lib/seller/errors'
import { updateSellerProfile } from '@/lib/seller/profile'
import type { SellerProfile, SellerProfilePatch } from '@/lib/seller/types'

const LOCKED_HINT = 'Contact support to change this.'
const ACCEPTING_LABEL_ID = 'profile-accepting-orders-label'

type Values = ProfileFormValues
type FieldName = keyof Values

function sameIds(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false
    const sb = [...b].sort()
    return [...a].sort().every((id, i) => id === sb[i])
}

function sameValues(a: Values, b: Values): boolean {
    return (Object.keys(a) as FieldName[]).every((k) => {
        const x = a[k]
        const y = b[k]
        return Array.isArray(x) && Array.isArray(y) ? sameIds(x, y) : x === y
    })
}

/** First message per field from a Yup error (array paths such as `selling_categories[0]` fold into the field). */
function collectErrors(e: unknown): Record<string, string> {
    if (!(e instanceof ValidationError)) throw e
    const out: Record<string, string> = {}
    for (const item of e.inner.length ? e.inner : [e]) {
        const key = (item.path ?? '').replace(/\[.*$/, '')
        if (key && !(key in out)) out[key] = item.message
    }
    return out
}

interface ProfileTabProps {
    profile: SellerProfile
    /** Puts the saved profile into the shared cache. */
    onSaved: (profile: SellerProfile) => void
}

export function ProfileTab({ profile, onSaved }: ProfileTabProps) {
    const status = profile.verification_status
    const identityLocked = status === 'verified'
    const readOnly = status === 'suspended'
    const lockedForm = identityLocked || readOnly
    const noneSaved = (profile.selling_categories ?? []).length === 0 && !(profile.other_category ?? '').trim()
    const categoriesRequired = profile.missing_fields.includes('selling_categories')
    const requiredByStatus = status === 'pending' || status === 'rejected' || categoriesRequired

    const baseline = useMemo(() => toFormValues(profile), [profile])
    const [values, setValues] = useState<Values>(baseline)
    const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
    const [submitted, setSubmitted] = useState(false)
    // Sellers with no categories saved can still save other changes until they edit a category field.
    const [categoriesTouched, setCategoriesTouched] = useState(false)
    const [serverErrors, setServerErrors] = useState<Record<string, string>>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [savedNotice, setSavedNotice] = useState(false)
    const [saving, setSaving] = useState(false)
    // Remounts the category picker when the values are replaced from outside it (discard, server refresh).
    const [pickerKey, setPickerKey] = useState(0)

    const dirty = !sameValues(values, baseline)
    const guardActive = dirty && !saving
    const { dialog } = useUnsavedGuard(guardActive)

    const dirtyRef = useRef(dirty)
    dirtyRef.current = dirty

    // Pick up server-side changes (for example a status change) without clobbering what the seller is typing.
    useEffect(() => {
        if (!dirtyRef.current) {
            setValues(baseline)
            setPickerKey((k) => k + 1)
        }
    }, [baseline])

    const schema = useMemo(
        () => buildProfileSchema({ locked: lockedForm, enforceCategories: requiredByStatus || categoriesTouched }),
        [lockedForm, requiredByStatus, categoriesTouched]
    )
    const clientErrors = useMemo(() => {
        try {
            schema.validateSync(values, { abortEarly: false })
            return {} as Record<string, string>
        } catch (e) {
            return collectErrors(e)
        }
    }, [schema, values])

    const errorFor = (name: FieldName): string | undefined => {
        if (serverErrors[name]) return serverErrors[name]
        return touched[name] || submitted ? clientErrors[name] : undefined
    }

    const setField = <K extends FieldName>(name: K, value: Values[K]) => {
        setValues((v) => ({ ...v, [name]: value }))
        setSavedNotice(false)
        setServerErrors((prev) => {
            if (!(name in prev)) return prev
            const next = { ...prev }
            delete next[name]
            return next
        })
    }
    const markTouched = (name: FieldName) => setTouched((t) => (t[name] ? t : { ...t, [name]: true }))

    const discard = () => {
        setValues(baseline)
        setTouched({})
        setSubmitted(false)
        setCategoriesTouched(false)
        setServerErrors({})
        setFormError(null)
        setSavedNotice(false)
        setPickerKey((k) => k + 1)
    }

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault()
        if (saving || readOnly || !dirty) return
        setSubmitted(true)
        setSavedNotice(false)
        setFormError(null)
        if (Object.keys(clientErrors).length > 0) {
            setFormError('Please fix the highlighted fields.')
            return
        }

        setSaving(true)
        try {
            const body: SellerProfilePatch = {
                ...values,
                business_name: values.business_name.trim(),
                business_description: values.business_description.trim(),
                other_category: normalizeOther(values.other_category),
                business_email: values.business_email.trim(),
                business_phone: values.business_phone.trim(),
                business_address: values.business_address.trim(),
                return_policy: values.return_policy.trim(),
                shipping_policy: values.shipping_policy.trim(),
            }
            // The API validates the category pair only when it is sent, so leave both out unless the seller edited them.
            if (!categoriesTouched) {
                delete body.selling_categories
                delete body.other_category
            }
            if (identityLocked) for (const key of IDENTITY_LOCKED_FIELDS) delete body[key]

            const updated = await updateSellerProfile(body)
            setValues(toFormValues(updated))
            setTouched({})
            setSubmitted(false)
            setCategoriesTouched(false)
            setServerErrors({})
            setPickerKey((k) => k + 1)
            setSavedNotice(true)
            onSaved(updated)
        } catch (e) {
            const err = toSellerError(e)
            const known = Object.keys(values)
            const placed: Record<string, string> = {}
            for (const [name, message] of Object.entries(err.fields)) if (known.includes(name)) placed[name] = message
            setServerErrors(placed)
            if (Object.keys(placed).length > 0) {
                setFormError(err.code === 'identity_locked' ? 'Some details can only be changed by support.' : 'Please fix the highlighted fields.')
            } else {
                setFormError(err.message)
            }
        } finally {
            setSaving(false)
        }
    }

    const knownNames = useMemo(() => {
        const map: Record<string, string> = {}
        for (const c of profile.selling_categories ?? []) map[String(c.id)] = c.name
        return map
    }, [profile.selling_categories])

    const barMessage = readOnly ? 'Your store is suspended, so these details are read-only.' : dirty ? 'You have unsaved changes' : 'All changes saved'

    return (
        <form onSubmit={onSubmit} noValidate className="space-y-3">
            {formError ? <Notice tone="danger" role="alert">{formError}</Notice> : null}
            {savedNotice ? <Notice tone="success" role="status">Store details saved.</Notice> : null}

            <fieldset disabled={readOnly || saving} className="min-w-0 space-y-3 border-0 p-0">
                <legend className="sr-only">Store profile</legend>

                <Panel title="Store details" description="Shown to buyers and used by our team to reach you.">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <TextInput
                            id="business_name"
                            label="Store name"
                            fieldClassName="sm:col-span-2"
                            value={values.business_name}
                            onChange={(e) => setField('business_name', e.target.value)}
                            onBlur={() => markTouched('business_name')}
                            disabled={identityLocked}
                            maxLength={255}
                            autoComplete="organization"
                            hint={identityLocked ? LOCKED_HINT : undefined}
                            error={errorFor('business_name')}
                        />
                        <TextArea
                            id="business_description"
                            label="About your store"
                            optional
                            fieldClassName="sm:col-span-2"
                            value={values.business_description}
                            onChange={(e) => setField('business_description', e.target.value)}
                            onBlur={() => markTouched('business_description')}
                            rows={3}
                            maxLength={2000}
                            hint="Tell buyers about your store."
                            error={errorFor('business_description')}
                        />

                        <div className="space-y-2 sm:col-span-2">
                            {categoriesRequired && !readOnly ? (
                                <Notice tone="warning" role="status">
                                    Add the categories you sell. We need this before we can review your application.
                                </Notice>
                            ) : noneSaved && !readOnly ? (
                                <Notice tone="info">Add the categories you sell so buyers and RFQ requests can find you.</Notice>
                            ) : null}
                            <CategoryPicker
                                key={pickerKey}
                                id="selling_categories"
                                label="Categories you sell"
                                helper="Pick everything you sell. You can change this later."
                                value={{ ids: values.selling_categories, other: values.other_category }}
                                knownNames={knownNames}
                                error={errorFor('selling_categories')}
                                otherError={errorFor('other_category')}
                                onChange={({ ids, other }) => {
                                    setCategoriesTouched(true)
                                    markTouched('selling_categories')
                                    markTouched('other_category')
                                    setValues((v) => ({ ...v, selling_categories: ids, other_category: other }))
                                    setSavedNotice(false)
                                    setServerErrors((prev) => {
                                        if (!('selling_categories' in prev) && !('other_category' in prev)) return prev
                                        const next = { ...prev }
                                        delete next.selling_categories
                                        delete next.other_category
                                        return next
                                    })
                                }}
                            />
                        </div>

                        <TextInput
                            id="business_email"
                            label="Contact email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            value={values.business_email}
                            onChange={(e) => setField('business_email', e.target.value)}
                            onBlur={() => markTouched('business_email')}
                            error={errorFor('business_email')}
                        />
                        <TextInput
                            id="business_phone"
                            label="Contact phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={values.business_phone}
                            onChange={(e) => setField('business_phone', e.target.value)}
                            onBlur={() => markTouched('business_phone')}
                            disabled={identityLocked}
                            hint={identityLocked ? LOCKED_HINT : undefined}
                            error={errorFor('business_phone')}
                        />
                        <TextArea
                            id="business_address"
                            label="Business address"
                            fieldClassName="sm:col-span-2"
                            value={values.business_address}
                            onChange={(e) => setField('business_address', e.target.value)}
                            onBlur={() => markTouched('business_address')}
                            disabled={identityLocked}
                            rows={2}
                            maxLength={500}
                            autoComplete="street-address"
                            hint={identityLocked ? LOCKED_HINT : undefined}
                            error={errorFor('business_address')}
                        />
                    </div>
                </Panel>

                <Panel title="Orders and policies" description="What buyers see before they order from you.">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800 lg:col-span-2">
                            <div className="min-w-0">
                                <p id={ACCEPTING_LABEL_ID} className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    Accepting orders
                                </p>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400">Turn off to pause new orders without hiding your store.</p>
                            </div>
                            <Switch
                                labelledBy={ACCEPTING_LABEL_ID}
                                checked={values.is_accepting_orders}
                                onChange={(next) => setField('is_accepting_orders', next)}
                                disabled={readOnly || saving}
                            />
                        </div>
                        <TextArea
                            id="return_policy"
                            label="Return policy"
                            value={values.return_policy}
                            onChange={(e) => setField('return_policy', e.target.value)}
                            onBlur={() => markTouched('return_policy')}
                            rows={4}
                            maxLength={5000}
                            error={errorFor('return_policy')}
                        />
                        <TextArea
                            id="shipping_policy"
                            label="Shipping policy"
                            value={values.shipping_policy}
                            onChange={(e) => setField('shipping_policy', e.target.value)}
                            onBlur={() => markTouched('shipping_policy')}
                            rows={4}
                            maxLength={5000}
                            error={errorFor('shipping_policy')}
                        />
                    </div>
                </Panel>
            </fieldset>

            <div className="sticky bottom-0 z-20 flex items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-100 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="min-w-0 truncate text-sm text-zinc-700 dark:text-zinc-300" aria-live="polite">
                    {barMessage}
                </p>
                <div className="flex shrink-0 gap-2">
                    <button type="button" className={btnSecondary} disabled={!dirty || saving || readOnly} onClick={discard}>
                        Discard
                    </button>
                    <button type="submit" className={btnPrimary} disabled={!dirty || saving || readOnly}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                        Save changes
                    </button>
                </div>
            </div>

            {dialog}
        </form>
    )
}
