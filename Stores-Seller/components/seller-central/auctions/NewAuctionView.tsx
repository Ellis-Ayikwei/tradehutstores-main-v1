'use client'

import { useCallback, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { ErrorPanel, PageHeader, Panel, btnPrimary, btnSecondary } from '@/components/seller-central/ui'
import {
    AUCTION_LIST_KEY,
    buildCreateBody,
    createSellerAuction,
    emptyAuctionForm,
    toAuctionError,
    toLocalInput,
    validateAuctionForm,
    type AuctionFormErrors,
    type AuctionFormValues,
} from '@/lib/seller/auctions'
import { useSellerProfile } from '@/hooks/useSellerProfile'
import AuctionForm from './AuctionForm'
import VariantPicker, { variantLabel, type VariantSelection } from './VariantPicker'
import { AUCTIONS_HREF, VerificationNotice, auctionHref } from './auctionUi'

const FIELD_IDS: Record<string, string> = {
    title: 'auction-title',
    description: 'auction-description',
    quantity: 'auction-quantity',
    starting_price: 'auction-starting-price',
    min_increment: 'auction-min-increment',
    reserve_price: 'auction-reserve-price',
    buy_now_price: 'auction-buy-now-price',
    starts_at: 'auction-starts-at',
    ends_at: 'auction-ends-at',
    soft_close_seconds: 'auction-soft-close',
}

export default function NewAuctionView() {
    const router = useRouter()
    const { mutate } = useSWRConfig()
    const { profile } = useSellerProfile()
    const unverified = profile !== null && profile.verification_status !== 'verified'

    const [selection, setSelection] = useState<VariantSelection | null>(null)
    const [values, setValues] = useState<AuctionFormValues>(() => emptyAuctionForm(new Date()))
    const [startNow, setStartNow] = useState(true)
    const [errors, setErrors] = useState<AuctionFormErrors>({})
    const [formError, setFormError] = useState<string | null>(null)
    const [serverUnverified, setServerUnverified] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const titleEdited = useRef(false)
    // One key per submit intent: a retry of the same body replays on the server instead of creating a second auction.
    const intent = useRef<{ key: string; fingerprint: string } | null>(null)

    const onSelect = useCallback((next: VariantSelection | null) => {
        setSelection(next)
        setErrors((e) => ({ ...e, variant_id: undefined }))
        if (!next) return
        const { product, variant } = next
        const label = variantLabel(variant)
        const suggested = label && label !== product.name ? `${product.name} - ${label}` : product.name
        if (!titleEdited.current) setValues((v) => ({ ...v, title: suggested.slice(0, 200) }))
    }, [])

    const onChange = useCallback((field: keyof AuctionFormValues, value: string) => {
        if (field === 'title') titleEdited.current = true
        setValues((v) => ({ ...v, [field]: value }))
        setErrors((e) => ({ ...e, [field]: undefined }))
        setFormError(null)
    }, [])

    const onStartNowChange = useCallback((next: boolean) => {
        setStartNow(next)
        setErrors((e) => ({ ...e, starts_at: undefined, ends_at: undefined }))
        if (!next) setValues((v) => ({ ...v, starts_at: toLocalInput(new Date(Date.now() + 60 * 60 * 1000)) }))
    }, [])

    const stock = selection ? (selection.variant.quantity ?? 0) : null

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        if (submitting) return
        const found = validateAuctionForm(values, { mode: 'create', startNow, stock, now: new Date() })
        if (!selection) found.variant_id = 'Choose a listing and variant.'
        setErrors(found)
        setFormError(null)
        const first = Object.keys(found)[0]
        if (first || !selection) {
            if (first && FIELD_IDS[first]) document.getElementById(FIELD_IDS[first])?.focus()
            return
        }

        const body = buildCreateBody(values, selection.variant.id, startNow)
        const fingerprint = JSON.stringify(body)
        if (!intent.current || intent.current.fingerprint !== fingerprint) intent.current = { key: crypto.randomUUID(), fingerprint }

        setSubmitting(true)
        try {
            const created = await createSellerAuction(body, intent.current.key)
            void mutate((k) => Array.isArray(k) && k[0] === AUCTION_LIST_KEY)
            router.push(auctionHref(created.id))
        } catch (err) {
            const apiError = toAuctionError(err, 'create')
            if (apiError.code === 'seller_not_verified') setServerUnverified(true)
            const fieldErrors = apiError.fieldErrors as AuctionFormErrors
            setErrors(fieldErrors)
            const mapped = Object.keys(fieldErrors).some((k) => k === 'variant_id' || k in FIELD_IDS)
            setFormError(apiError.kind === 'validation' && mapped ? 'Please fix the highlighted fields.' : apiError.message)
            if (apiError.code === 'variant_not_found') {
                setSelection(null)
                setErrors({ variant_id: apiError.message })
            }
            const firstServer = Object.keys(fieldErrors).find((k) => FIELD_IDS[k])
            if (firstServer) document.getElementById(FIELD_IDS[firstServer])?.focus()
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-3">
            <Link href={AUCTIONS_HREF} className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Auctions
            </Link>
            <PageHeader title="Create auction" description="Choose what to sell, set the prices and decide when it runs" />

            {unverified || serverUnverified ? <VerificationNotice /> : null}

            <form onSubmit={submit} noValidate className="space-y-3">
                <Panel title="What are you selling?" description="One of your own listings and a variant of it.">
                    <VariantPicker value={selection} onChange={onSelect} error={errors.variant_id} disabled={submitting} />
                </Panel>

                <Panel title="Auction details">
                    <AuctionForm values={values} errors={errors} onChange={onChange} mode="create" startNow={startNow} onStartNowChange={onStartNowChange} stock={stock} disabled={submitting} />
                </Panel>

                {formError ? <ErrorPanel title="Couldn't create the auction" message={formError} /> : null}

                <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-2 border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:justify-end sm:rounded-md sm:border">
                    <Link href={AUCTIONS_HREF} className={btnSecondary}>
                        Cancel
                    </Link>
                    <button type="submit" className={btnPrimary} disabled={submitting || unverified}>
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                        {submitting ? 'Creating...' : 'Create auction'}
                    </button>
                </div>
            </form>
        </div>
    )
}
