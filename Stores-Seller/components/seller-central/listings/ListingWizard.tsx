'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import useSWR, { mutate as globalMutate } from 'swr'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { Skeleton, btnPrimary, btnSecondary } from '@/components/seller-central/ui'
import {
    fetchProductDetail,
    fetchProductImages,
    fetchProductVariants,
    fetchSellerSelf,
    toListingSaveError,
    type ImageDetail,
    type ListingApiError,
    type ProductDetail,
    type SellerSelf,
    type VariantDetail,
} from '@/lib/seller/listings'
import { fetchSellerStats } from '@/lib/seller/stats'
import type { SellerStats } from '@/lib/seller/types'
import type { FormApi } from './formApi'
import { setFlash } from './flash'
import { NotSellerState } from './NotSellerState'
import { saveListing, type SaveAction } from './saveListing'
import {
    defaultListingValues,
    errorsForStep,
    imagesFromServer,
    stepIndexForField,
    STEPS,
    validateListing,
    valuesFromServer,
    type FormErrors,
    type ImageItem,
    type ListingFormValues,
    type VariantFormValues,
} from './schema'
import { DetailsStep } from './steps/DetailsStep'
import { ImagesStep } from './steps/ImagesStep'
import { ReviewStep } from './steps/ReviewStep'
import { ShippingStep } from './steps/ShippingStep'
import { VariantsStep } from './steps/VariantsStep'
import { isSellerProductKey, isSellerStatsKey, useSellerKeys } from '@/hooks/useSellerKeys'
import { useSellerProfile } from '@/hooks/useSellerProfile'
import { useUnsavedGuard } from '@/hooks/useUnsavedGuard'
import { Banner, ErrorPanel, Modal, ToastProvider, cx, useToast } from './ui'

const LIST_HREF = '/seller-central/listings'
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, revalidateOnReconnect: false } as const
const IMAGES_STEP = STEPS.findIndex((s) => s.id === 'images')

const isListingsKey = (key: unknown) => Array.isArray(key) && key[0] === 'seller:listings'

function WizardSkeleton() {
    return (
        <div className="mx-auto max-w-3xl space-y-3" aria-busy="true" aria-label="Loading listing">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    )
}

interface WizardFormProps {
    productId?: string
    initialStatus?: string | null
    initialValues: ListingFormValues
    initialImages: ImageItem[]
    initialVariantIds: string[]
    currency?: string
}

function WizardForm({ productId, initialStatus, initialValues, initialImages, initialVariantIds, currency }: WizardFormProps) {
    const router = useRouter()
    const toast = useToast()
    const { readOnly } = useSellerProfile()
    const isEdit = Boolean(productId)
    const canChangePublication = !isEdit || initialStatus === 'Draft'

    const [values, setValuesState] = useState<ListingFormValues>(initialValues)
    const [serverErrors, setServerErrors] = useState<FormErrors>({})
    const [attempted, setAttempted] = useState<number[]>([])
    const [step, setStep] = useState(0)
    const [maxStep, setMaxStep] = useState(0)
    const [images, setImagesState] = useState<ImageItem[]>(initialImages)
    const [changed, setChanged] = useState(false)
    const [saving, setSaving] = useState<SaveAction | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    const valuesRef = useRef(initialValues)
    const imagesRef = useRef(initialImages)
    const createdProductId = useRef<string | undefined>(productId)
    const serverVariantIds = useRef<string[]>(initialVariantIds)
    const serverImageIds = useRef<string[]>(initialImages.filter((i) => i.id).map((i) => i.id as string))
    const topRef = useRef<HTMLDivElement>(null)

    /** Applies a change to the form values; `ref` always holds the latest so async save callbacks never read stale state. */
    const commit = useCallback((update: (prev: ListingFormValues) => ListingFormValues) => {
        const next = update(valuesRef.current)
        valuesRef.current = next
        setValuesState(next)
    }, [])

    const dropServerErrors = useCallback((shouldDrop: (path: string) => boolean) => {
        setServerErrors((prev) => {
            const keys = Object.keys(prev)
            if (!keys.some(shouldDrop)) return prev
            const next: FormErrors = {}
            keys.filter((k) => !shouldDrop(k)).forEach((k) => {
                next[k] = prev[k]
            })
            return next
        })
    }, [])

    const patch = useCallback(
        (changes: Partial<ListingFormValues>) => {
            commit((prev) => ({ ...prev, ...changes }))
            setChanged(true)
            const roots = Object.keys(changes)
            dropServerErrors((path) => roots.includes(path.split('.')[0]))
        },
        [commit, dropServerErrors]
    )

    const setVariant = useCallback(
        (index: number, changes: Partial<VariantFormValues>) => {
            commit((prev) => ({ ...prev, variants: prev.variants.map((row, i) => (i === index ? { ...row, ...changes } : row)) }))
            setChanged(true)
            const fields = Object.keys(changes)
            dropServerErrors((path) => fields.some((f) => path === `variants.${index}.${f}`))
        },
        [commit, dropServerErrors]
    )

    const setImages = useCallback((next: ImageItem[]) => {
        imagesRef.current = next
        setImagesState(next)
        setChanged(true)
    }, [])

    // Free object URLs of images that were never uploaded.
    useEffect(
        () => () => {
            imagesRef.current.forEach((i) => {
                if (i.file) URL.revokeObjectURL(i.url)
            })
        },
        []
    )

    const guard = useUnsavedGuard(changed && saving === null)

    const errors = useMemo(() => {
        const all = validateListing(values)
        const shown: FormErrors = {}
        attempted.forEach((s) => Object.assign(shown, errorsForStep(all, s)))
        return { ...shown, ...serverErrors }
    }, [values, attempted, serverErrors])

    const form: FormApi = useMemo(() => ({ values, errors, patch, setVariant, currency }), [values, errors, patch, setVariant, currency])

    const goToList = () => guard.requestLeave(() => router.push(LIST_HREF))

    const goToStep = (index: number) => {
        setStep(index)
        setMaxStep((m) => Math.max(m, index))
        topRef.current?.scrollIntoView({ block: 'start' })
    }

    const markAttempted = (indexes: number[]) => setAttempted((prev) => Array.from(new Set([...prev, ...indexes])))

    const firstErrorStep = (paths: string[]) => (paths.length ? Math.min(...paths.map(stepIndexForField)) : -1)

    const next = () => {
        const stepErrors = errorsForStep(validateListing(valuesRef.current), step)
        if (Object.keys(stepErrors).length > 0) {
            markAttempted([step])
            toast.error('Some details need your attention')
            return
        }
        goToStep(step + 1)
    }

    const submit = async (action: SaveAction) => {
        if (readOnly) return
        const all = validateListing(valuesRef.current)
        const invalid = Object.keys(all)
        if (invalid.length > 0) {
            markAttempted(Array.from({ length: STEPS.length }, (_, i) => i))
            goToStep(firstErrorStep(invalid))
            toast.error('Some details need your attention')
            return
        }
        if (action === 'publish' && imagesRef.current.length === 0) {
            setFormError('Add at least one image before publishing.')
            goToStep(IMAGES_STEP)
            return
        }

        setSaving(action)
        setFormError(null)
        setServerErrors({})
        try {
            await saveListing(
                {
                    values: valuesRef.current,
                    images: imagesRef.current,
                    action,
                    productId: createdProductId.current,
                    serverVariantIds: serverVariantIds.current,
                    serverImageIds: serverImageIds.current,
                },
                {
                    onProduct: (id) => {
                        createdProductId.current = id
                    },
                    onVariant: (index, id) => {
                        commit((prev) => ({ ...prev, variants: prev.variants.map((row, i) => (i === index ? { ...row, serverId: id } : row)) }))
                        serverVariantIds.current = [...serverVariantIds.current, id]
                    },
                    onVariantsPruned: (ids) => {
                        serverVariantIds.current = serverVariantIds.current.filter((id) => !ids.includes(id))
                        // A deleted variant must not be PATCHed later if the seller switches that row back on.
                        commit((prev) => ({ ...prev, variants: prev.variants.map((row) => (row.serverId && ids.includes(row.serverId) ? { ...row, serverId: undefined } : row)) }))
                    },
                    onImages: (saved) => {
                        imagesRef.current = saved
                        setImagesState(saved)
                        serverImageIds.current = Array.from(new Set([...serverImageIds.current, ...saved.filter((i) => i.id).map((i) => i.id as string)]))
                    },
                }
            )
            // Drop the cached editor copies so reopening this listing never shows a pre-save snapshot.
            await globalMutate(isSellerProductKey, undefined, { revalidate: false })
            await globalMutate(isListingsKey)
            void globalMutate(isSellerStatsKey)
            setFlash(action === 'publish' ? 'Listing published' : action === 'draft' ? 'Draft saved' : 'Changes saved')
            setChanged(false)
            guard.leaveNow(() => router.push(LIST_HREF))
        } catch (e) {
            const err = toListingSaveError(e)
            const unmatched: string[] = []
            const matched: string[] = []
            const nextServerErrors: FormErrors = {}
            err.fields.forEach((f) => {
                const root = f.name.split('.')[0]
                if (STEPS.some((s) => (s.fields as string[]).includes(root))) {
                    nextServerErrors[f.name] = f.message
                    matched.push(f.name)
                } else {
                    unmatched.push(`${f.name.replace(/_/g, ' ')}: ${f.message}`)
                }
            })
            setServerErrors(nextServerErrors)
            setFormError([err.message, ...unmatched].join(' '))
            const target = firstErrorStep(matched)
            if (target >= 0) goToStep(target)
            toast.error(err.kind === 'validation' ? 'Please fix the highlighted fields' : err.message)
        } finally {
            setSaving(null)
        }
    }

    const busy = saving !== null
    const isLast = step === STEPS.length - 1
    const current = STEPS[step]

    return (
        <form onSubmit={(e) => e.preventDefault()} noValidate className="mx-auto max-w-3xl">
            <div ref={topRef} className="scroll-mt-20" />
            <div className="mb-3 flex items-center gap-2">
                <button type="button" onClick={goToList} aria-label="Back to listings" className="-ml-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 dark:text-zinc-300 dark:hover:bg-zinc-800">
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <h1 className="min-w-0 truncate font-syne text-xl font-bold text-zinc-900 dark:text-zinc-100 sm:text-2xl">{isEdit ? 'Edit listing' : 'New listing'}</h1>
            </div>

            <nav aria-label="Listing steps" className="mb-3">
                <ol className="flex items-center gap-1.5">
                    {STEPS.map((s, i) => {
                        const done = i < step
                        const isCurrent = i === step
                        const reachable = i <= maxStep
                        return (
                            <li key={s.id} className={cx('flex items-center', isCurrent ? 'min-w-0 flex-1' : 'shrink-0', !isCurrent && 'sm:min-w-0 sm:flex-1')}>
                                <button
                                    type="button"
                                    onClick={() => reachable && goToStep(i)}
                                    disabled={!reachable || busy}
                                    aria-current={isCurrent ? 'step' : undefined}
                                    className={cx(
                                        'flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 disabled:cursor-not-allowed sm:h-9',
                                        isCurrent
                                            ? 'w-full bg-primary-700 text-white'
                                            : done
                                              ? 'bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100'
                                              : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
                                        !isCurrent && 'sm:w-full'
                                    )}
                                >
                                    <span className="flex h-4 w-4 shrink-0 items-center justify-center text-xs">{done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}</span>
                                    <span className={cx('truncate', !isCurrent && 'hidden sm:inline')}>{s.label}</span>
                                </button>
                            </li>
                        )
                    })}
                </ol>
            </nav>

            {readOnly ? (
                <div className="mb-3">
                    <Banner tone="warning">Your store is suspended, so listings are read-only. You can look through this listing but not save changes.</Banner>
                </div>
            ) : null}

            {formError ? (
                <div className="mb-3">
                    <ErrorPanel title="This listing was not fully saved" message={formError} />
                </div>
            ) : null}

            <fieldset disabled={busy || readOnly} className="m-0 min-w-0 border-0 p-0">
                <legend className="sr-only">{current.label}</legend>
                <section aria-label={current.label}>
                    {current.id === 'details' ? <DetailsStep form={form} /> : null}
                    {current.id === 'variants' ? <VariantsStep form={form} images={images} onImagesChange={setImages} /> : null}
                    {current.id === 'images' ? <ImagesStep form={form} images={images} onChange={setImages} /> : null}
                    {current.id === 'shipping' ? <ShippingStep form={form} /> : null}
                    {current.id === 'review' ? <ReviewStep form={form} images={images} canPublish={images.length > 0} /> : null}
                </section>
            </fieldset>

            <div className="sticky bottom-0 z-30 mt-4 flex items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-100 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                <button type="button" className={btnSecondary} onClick={() => (step === 0 ? goToList() : goToStep(step - 1))} disabled={busy}>
                    {step === 0 ? 'Cancel' : 'Back'}
                </button>
                {!isLast ? (
                    <button type="button" className={btnPrimary} onClick={next} disabled={busy}>
                        Next
                    </button>
                ) : (
                    <div className="flex items-center gap-2">
                        {canChangePublication ? (
                            <>
                                <button type="button" className={btnSecondary} onClick={() => void submit('draft')} disabled={busy || readOnly}>
                                    {saving === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                    Save draft
                                </button>
                                <button type="button" className={btnPrimary} onClick={() => void submit('publish')} disabled={busy || readOnly || images.length === 0}>
                                    {saving === 'publish' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                    Publish
                                </button>
                            </>
                        ) : (
                            <button type="button" className={btnPrimary} onClick={() => void submit('save')} disabled={busy || readOnly}>
                                {saving === 'save' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                                Save changes
                            </button>
                        )}
                    </div>
                )}
            </div>

            <Modal
                open={guard.confirmOpen}
                onClose={guard.stay}
                title="Leave without saving?"
                description="You have changes that have not been saved. If you leave now they will be lost."
                footer={
                    <>
                        <button type="button" className={btnSecondary} onClick={guard.stay}>
                            Keep editing
                        </button>
                        <button type="button" className="inline-flex min-h-11 items-center justify-center rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600" onClick={guard.leave}>
                            Leave
                        </button>
                    </>
                }
            />
        </form>
    )
}

interface LoadedProduct {
    product: ProductDetail
    variants: VariantDetail[]
    images: ImageDetail[]
}

/** Loads what the wizard needs (seller identity, and in edit mode the product) and refuses foreign products. */
function WizardLoader({ productId }: { productId?: string }) {
    const { meKey, statsKey } = useSellerKeys()
    const me = useSWR<SellerSelf, ListingApiError>(meKey, fetchSellerSelf, SWR_OPTIONS)
    const stats = useSWR<SellerStats>(statsKey, fetchSellerStats, SWR_OPTIONS)

    // Always fetch on mount, and keep only what a fetch started in this mount returned (via onSuccess): a cached copy
    // from an earlier visit is never used to fill the form. The first fresh copy is then frozen so a later background
    // revalidation can never remount the form and wipe the seller's edits.
    const [loaded, setLoaded] = useState<{ product?: ProductDetail; variants?: VariantDetail[]; images?: ImageDetail[] }>({})
    const editOptions = { ...SWR_OPTIONS, revalidateOnMount: true, revalidateIfStale: true, dedupingInterval: 0 } as const
    const product = useSWR<ProductDetail, ListingApiError>(productId ? ['seller:product', productId] : null, () => fetchProductDetail(productId as string), {
        ...editOptions,
        onSuccess: (data) => setLoaded((prev) => (prev.product ? prev : { ...prev, product: data })),
    })
    const variants = useSWR<VariantDetail[], ListingApiError>(productId ? ['seller:product-variants', productId] : null, () => fetchProductVariants(productId as string), {
        ...editOptions,
        onSuccess: (data) => setLoaded((prev) => (prev.variants ? prev : { ...prev, variants: data })),
    })
    const images = useSWR<ImageDetail[], ListingApiError>(productId ? ['seller:product-images', productId] : null, () => fetchProductImages(productId as string), {
        ...editOptions,
        onSuccess: (data) => setLoaded((prev) => (prev.images ? prev : { ...prev, images: data })),
    })
    const ready: LoadedProduct | null = loaded.product && loaded.variants && loaded.images ? { product: loaded.product, variants: loaded.variants, images: loaded.images } : null

    const back = (
        <Link href={LIST_HREF} className={btnSecondary}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to listings
        </Link>
    )

    if (me.error?.kind === 'forbidden') return <NotSellerState message={me.error.message} />
    const loadError = me.error ?? product.error ?? variants.error ?? images.error
    if (loadError) {
        const retry = () => {
            void me.mutate()
            void product.mutate()
            void variants.mutate()
            void images.mutate()
        }
        if (product.error?.kind === 'not_found' || product.error?.kind === 'forbidden') {
            return (
                <div className="mx-auto max-w-3xl space-y-3">
                    <ErrorPanel title="Listing not found" message="This listing does not exist or does not belong to your store." />
                    {back}
                </div>
            )
        }
        return (
            <div className="mx-auto max-w-3xl space-y-3">
                <ErrorPanel title="Could not open the listing editor" message={loadError.message} onRetry={retry} />
                {back}
            </div>
        )
    }

    if (me.isLoading || !me.data) return <WizardSkeleton />

    if (!productId) {
        return <WizardForm initialValues={defaultListingValues()} initialImages={[]} initialVariantIds={[]} currency={stats.data?.currency} />
    }

    if (!ready) return <WizardSkeleton />

    if (!ready.product.seller_profile || String(ready.product.seller_profile) !== String(me.data.id)) {
        return (
            <div className="mx-auto max-w-3xl space-y-3">
                <ErrorPanel title="Listing not found" message="This listing does not exist or does not belong to your store." />
                {back}
            </div>
        )
    }

    return (
        <WizardForm
            productId={productId}
            initialStatus={ready.product.status}
            initialValues={valuesFromServer(ready.product, ready.variants)}
            initialImages={imagesFromServer(ready.images, ready.variants)}
            initialVariantIds={ready.variants.map((v) => String(v.id))}
            currency={ready.product.pricing_currency ?? stats.data?.currency}
        />
    )
}

export default function ListingWizard({ productId }: { productId?: string }) {
    return (
        <ToastProvider>
            <WizardLoader key={productId ?? 'new'} productId={productId} />
        </ToastProvider>
    )
}
