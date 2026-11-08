'use client'

import { useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { MapPin, Plus } from 'lucide-react'
import { AddressApiError, createAddress } from '@/lib/addressesApi'
import type { Address } from '@/lib/addressesApi'
import { BTN_PRIMARY, BTN_SECONDARY, Banner, FOCUS, LINK_BTN, OptionRow, Spinner, inputClass } from './ui'

export const GHANA_REGIONS = [
    'Ahafo',
    'Ashanti',
    'Bono',
    'Bono East',
    'Central',
    'Eastern',
    'Greater Accra',
    'North East',
    'Northern',
    'Oti',
    'Savannah',
    'Upper East',
    'Upper West',
    'Volta',
    'Western',
    'Western North',
] as const

/** Ghana mobile: 0XXXXXXXXX or +233XXXXXXXXX / 233XXXXXXXXX, nine digits starting 2 or 5 after the prefix. */
const GHANA_MOBILE = /^(?:\+?233|0)([25]\d{8})$/

export function normalisePhone(raw: string, country: string): string | null {
    const compact = raw.replace(/[\s\-()]/g, '')
    if (country.trim().toLowerCase() === 'ghana') {
        const m = GHANA_MOBILE.exec(compact)
        return m ? `+233${m[1]}` : null
    }
    return /^\+?\d{7,15}$/.test(compact) ? compact : null
}

export function formatPhone(phone: string | null | undefined): string {
    if (!phone) return ''
    const m = /^\+233([25]\d{2})(\d{3})(\d{3})$/.exec(phone)
    return m ? `0${m[1]} ${m[2]} ${m[3]}` : phone
}

interface FormValues {
    fullName: string
    phone: string
    address: string
    city: string
    region: string
    landmark: string
    postal: string
    country: string
}

const EMPTY: FormValues = {
    fullName: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    landmark: '',
    postal: '',
    country: 'Ghana',
}

type FormErrors = Partial<Record<keyof FormValues, string>>

function validate(v: FormValues): FormErrors {
    const e: FormErrors = {}
    if (v.fullName.trim().length < 2) e.fullName = 'Enter the recipient’s full name.'
    if (!v.country.trim()) e.country = 'Enter a country.'
    if (!normalisePhone(v.phone, v.country)) {
        e.phone =
            v.country.trim().toLowerCase() === 'ghana'
                ? 'Enter a valid Ghana mobile number (for example 0XX XXX XXXX).'
                : 'Enter a valid phone number with 7 to 15 digits.'
    }
    if (v.address.trim().length < 5) e.address = 'Enter the street, house number or area.'
    if (v.city.trim().length < 2) e.city = 'Enter the city or town.'
    if (v.country.trim().toLowerCase() === 'ghana' && !v.region) e.region = 'Choose a region.'
    return e
}

/** Server field names -> form field names. */
const SERVER_FIELD: Record<string, keyof FormValues> = {
    full_name: 'fullName',
    phone: 'phone',
    address: 'address',
    address_line2: 'landmark',
    city: 'city',
    state: 'region',
    postal_code: 'postal',
    country: 'country',
}

function Field({
    id,
    label,
    error,
    optional = false,
    hint,
    children,
    className = '',
}: {
    id: string
    label: string
    error?: string
    optional?: boolean
    hint?: string
    children: ReactNode
    className?: string
}) {
    return (
        <div className={className}>
            <label htmlFor={id} className="mb-1 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {label}
                {optional ? <span className="font-normal text-zinc-600 dark:text-zinc-400"> (optional)</span> : null}
            </label>
            {children}
            {hint && !error ? <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{hint}</p> : null}
            {error ? (
                <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {error}
                </p>
            ) : null}
        </div>
    )
}

function AddressForm({
    onCreated,
    onCancel,
}: {
    onCreated: (address: Address) => void
    onCancel?: () => void
}) {
    const uid = useId()
    const [values, setValues] = useState<FormValues>(EMPTY)
    const [errors, setErrors] = useState<FormErrors>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    const set = (key: keyof FormValues) => (value: string) => {
        setValues((prev) => ({ ...prev, [key]: value }))
        if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
    const idOf = (key: string) => `${uid}-${key}`
    const ariaFor = (key: keyof FormValues) => ({
        'aria-invalid': errors[key] ? true : undefined,
        'aria-describedby': errors[key] ? `${idOf(key)}-error` : undefined,
    })
    const isGhana = values.country.trim().toLowerCase() === 'ghana'

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        if (saving) return
        const found = validate(values)
        setErrors(found)
        setFormError(null)
        if (Object.keys(found).length > 0) return
        const phone = normalisePhone(values.phone, values.country)
        if (!phone) return
        setSaving(true)
        try {
            const created = await createAddress({
                full_name: values.fullName.trim(),
                phone,
                address: values.address.trim(),
                address_line2: values.landmark.trim() || undefined,
                city: values.city.trim(),
                state: values.region.trim() || undefined,
                // The address table requires a non-blank postal_code; Ghana addresses often have none.
                postal_code: values.postal.trim() || 'N/A',
                country: values.country.trim(),
            })
            onCreated(created)
        } catch (err) {
            const apiErr = err instanceof AddressApiError ? err : null
            const mapped: FormErrors = {}
            for (const [field, message] of Object.entries(apiErr?.fieldErrors ?? {})) {
                const key = SERVER_FIELD[field]
                if (key) mapped[key] = message
            }
            setErrors(mapped)
            setFormError(
                apiErr && apiErr.status === 401
                    ? 'Please sign in again to save this address.'
                    : Object.keys(mapped).length > 0
                      ? 'Please fix the highlighted fields.'
                      : 'We could not save this address. Check your connection and try again.'
            )
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={submit} noValidate className="space-y-3">
            {formError ? <Banner tone="error"><p>{formError}</p></Banner> : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id={idOf('fullName')} label="Full name" error={errors.fullName}>
                    <input
                        id={idOf('fullName')}
                        value={values.fullName}
                        onChange={(e) => set('fullName')(e.target.value)}
                        autoComplete="name"
                        maxLength={255}
                        className={inputClass(Boolean(errors.fullName))}
                        {...ariaFor('fullName')}
                    />
                </Field>
                <Field id={idOf('phone')} label="Mobile number" error={errors.phone} hint="We call or message this number for delivery.">
                    <input
                        id={idOf('phone')}
                        value={values.phone}
                        onChange={(e) => set('phone')(e.target.value)}
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="0XX XXX XXXX"
                        className={inputClass(Boolean(errors.phone))}
                        {...ariaFor('phone')}
                    />
                </Field>
                <Field id={idOf('address')} label="Address" error={errors.address} className="sm:col-span-2">
                    <input
                        id={idOf('address')}
                        value={values.address}
                        onChange={(e) => set('address')(e.target.value)}
                        autoComplete="address-line1"
                        maxLength={255}
                        placeholder="House number, street or area"
                        className={inputClass(Boolean(errors.address))}
                        {...ariaFor('address')}
                    />
                </Field>
                <Field id={idOf('city')} label="City / town" error={errors.city}>
                    <input
                        id={idOf('city')}
                        value={values.city}
                        onChange={(e) => set('city')(e.target.value)}
                        autoComplete="address-level2"
                        maxLength={100}
                        className={inputClass(Boolean(errors.city))}
                        {...ariaFor('city')}
                    />
                </Field>
                <Field id={idOf('region')} label="Region" error={errors.region} optional={!isGhana}>
                    {isGhana ? (
                        <select
                            id={idOf('region')}
                            value={values.region}
                            onChange={(e) => set('region')(e.target.value)}
                            autoComplete="address-level1"
                            className={inputClass(Boolean(errors.region))}
                            {...ariaFor('region')}
                        >
                            <option value="">Select region</option>
                            {GHANA_REGIONS.map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            id={idOf('region')}
                            value={values.region}
                            onChange={(e) => set('region')(e.target.value)}
                            autoComplete="address-level1"
                            maxLength={100}
                            className={inputClass(Boolean(errors.region))}
                            {...ariaFor('region')}
                        />
                    )}
                </Field>
                <Field id={idOf('landmark')} label="Landmark" optional error={errors.landmark} hint="A nearby place that helps the rider find you.">
                    <input
                        id={idOf('landmark')}
                        value={values.landmark}
                        onChange={(e) => set('landmark')(e.target.value)}
                        maxLength={255}
                        className={inputClass(Boolean(errors.landmark))}
                        {...ariaFor('landmark')}
                    />
                </Field>
                <Field id={idOf('postal')} label="Digital address / postal code" optional error={errors.postal}>
                    <input
                        id={idOf('postal')}
                        value={values.postal}
                        onChange={(e) => set('postal')(e.target.value)}
                        autoComplete="postal-code"
                        maxLength={20}
                        className={inputClass(Boolean(errors.postal))}
                        {...ariaFor('postal')}
                    />
                </Field>
                <Field id={idOf('country')} label="Country" error={errors.country} className="sm:col-span-2">
                    <input
                        id={idOf('country')}
                        value={values.country}
                        onChange={(e) => set('country')(e.target.value)}
                        autoComplete="country-name"
                        maxLength={100}
                        className={inputClass(Boolean(errors.country))}
                        {...ariaFor('country')}
                    />
                </Field>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                {onCancel ? (
                    <button type="button" onClick={onCancel} disabled={saving} className={BTN_SECONDARY}>
                        Cancel
                    </button>
                ) : null}
                <button type="submit" disabled={saving} className={BTN_PRIMARY}>
                    {saving ? <Spinner /> : null}
                    Save and use this address
                </button>
            </div>
        </form>
    )
}

interface AddressSectionProps {
    addresses: Address[] | undefined
    loading: boolean
    error: boolean
    onRetry: () => void
    selectedId: string | null
    onSelect: (id: string) => void
    onCreated: (address: Address) => void
    onContinue: () => void
    /** Address the server rejected (address_not_found). */
    rejectedId?: string | null
}

export default function AddressSection({
    addresses,
    loading,
    error,
    onRetry,
    selectedId,
    onSelect,
    onCreated,
    onContinue,
    rejectedId,
}: AddressSectionProps) {
    const [adding, setAdding] = useState(false)

    if (loading && !addresses) {
        return (
            <div role="status" aria-label="Loading your addresses" className="animate-pulse space-y-2">
                {[0, 1].map((i) => (
                    <div key={i} className="h-[72px] rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                ))}
            </div>
        )
    }

    if (error && !addresses) {
        return (
            <Banner
                tone="error"
                action={
                    <button type="button" onClick={onRetry} className={`${LINK_BTN} shrink-0 font-semibold text-white hover:text-white-dark`}>
                        Retry
                    </button>
                }
            >
                <p>We couldn’t load your saved addresses.</p>
            </Banner>
        )
    }

    const list = addresses ?? []

    if (list.length === 0) {
        return (
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>You have no saved addresses yet. Add where we should deliver this order.</p>
                </div>
                <AddressForm onCreated={onCreated} />
            </div>
        )
    }

    return (
        <div className="space-y-3">
            <div role="radiogroup" aria-label="Delivery address" className="space-y-2">
                {list.map((a) => (
                    <OptionRow
                        key={a.id}
                        name="delivery-address"
                        value={a.id}
                        selected={selectedId === a.id}
                        onSelect={() => onSelect(a.id)}
                    >
                        <p className="font-semibold">
                            {a.full_name || 'Recipient'}
                            {a.is_default ? (
                                <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                                    Default
                                </span>
                            ) : null}
                        </p>
                        <p className="text-zinc-700 dark:text-zinc-300">
                            {[a.address, a.address_line2].filter(Boolean).join(', ')}
                        </p>
                        <p className="text-zinc-700 dark:text-zinc-300">
                            {[a.city, a.state, a.postal_code && a.postal_code !== 'N/A' ? a.postal_code : null, a.country]
                                .filter(Boolean)
                                .join(', ')}
                        </p>
                        {a.phone ? <p className="text-zinc-600 dark:text-zinc-400">{formatPhone(a.phone)}</p> : null}
                        {rejectedId === a.id ? (
                            <p role="alert" className="mt-1 text-red-700 dark:text-red-300">
                                This address could not be used. Choose another or add a new one.
                            </p>
                        ) : null}
                    </OptionRow>
                ))}
            </div>

            {adding ? (
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    <h3 className="mb-3 text-sm font-bold text-zinc-900 dark:text-zinc-100">Add a new address</h3>
                    <AddressForm
                        onCancel={() => setAdding(false)}
                        onCreated={(a) => {
                            setAdding(false)
                            onCreated(a)
                        }}
                    />
                </div>
            ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={() => setAdding(true)}
                        className={`inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400 sm:min-h-[32px] ${FOCUS}`}
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                        Add a new address
                    </button>
                    <button type="button" onClick={onContinue} disabled={!selectedId} className={BTN_PRIMARY}>
                        Deliver to this address
                    </button>
                </div>
            )}
        </div>
    )
}
