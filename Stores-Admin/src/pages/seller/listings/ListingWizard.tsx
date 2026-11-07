import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useBlocker } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldPath } from 'react-hook-form';
import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Form } from '@/components/shadcn/form';
import { Skeleton } from '@/components/shadcn/skeleton';
import { cn } from '@/lib/utils';
import { fetchSellerStats } from '@/services/sellerStatsService';
import {
    fetchProductDetail,
    fetchProductImages,
    fetchProductVariants,
    fetchSellerSelf,
    toListingSaveError,
    type ImageDetail,
    type ProductDetail,
    type SellerApiError,
    type SellerSelf,
    type VariantDetail,
} from '@/services/sellerListingsService';
import { ErrorPanel } from '../components/ErrorPanel';
import { NotSellerState } from './NotSellerState';
import { saveListing, type SaveAction } from './saveListing';
import { defaultListingValues, imagesFromServer, listingSchema, stepIndexForField, STEPS, valuesFromServer, type ImageItem, type ListingFormValues } from './schema';
import { DetailsStep } from './steps/DetailsStep';
import { ImagesStep } from './steps/ImagesStep';
import { ReviewStep } from './steps/ReviewStep';
import { ShippingStep } from './steps/ShippingStep';
import { VariantsStep } from './steps/VariantsStep';

const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, revalidateOnReconnect: false } as const;
const IMAGES_STEP = STEPS.findIndex((s) => s.id === 'images');

const isListingsKey = (key: unknown) => Array.isArray(key) && key[0] === 'seller:listings';

function WizardSkeleton() {
    return (
        <div className="mx-auto max-w-3xl space-y-3" aria-busy="true" aria-label="Loading listing">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
}

interface WizardFormProps {
    productId?: string;
    initialStatus?: string | null;
    initialValues: ListingFormValues;
    initialImages: ImageItem[];
    initialVariantIds: string[];
    currency?: string;
}

function WizardForm({ productId, initialStatus, initialValues, initialImages, initialVariantIds, currency }: WizardFormProps) {
    const navigate = useNavigate();
    const isEdit = Boolean(productId);
    const canChangePublication = !isEdit || initialStatus === 'Draft';

    const form = useForm<ListingFormValues>({ resolver: zodResolver(listingSchema), defaultValues: initialValues, mode: 'onTouched' });

    const [step, setStep] = useState(0);
    const [maxStep, setMaxStep] = useState(0);
    const [images, setImagesState] = useState<ImageItem[]>(initialImages);
    const [imagesDirty, setImagesDirty] = useState(false);
    const [saving, setSaving] = useState<SaveAction | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const imagesRef = useRef(images);
    const createdProductId = useRef<string | undefined>(productId);
    const serverVariantIds = useRef<string[]>(initialVariantIds);
    const serverImageIds = useRef<string[]>(initialImages.filter((i) => i.id).map((i) => i.id as string));
    const allowLeave = useRef(false);
    const topRef = useRef<HTMLDivElement>(null);

    const setImages = useCallback((next: ImageItem[]) => {
        imagesRef.current = next;
        setImagesState(next);
        setImagesDirty(true);
    }, []);

    // Free object URLs of images that were never uploaded.
    useEffect(
        () => () => {
            imagesRef.current.forEach((i) => {
                if (i.file) URL.revokeObjectURL(i.url);
            });
        },
        []
    );

    const dirty = (form.formState.isDirty || imagesDirty) && !saving;
    const dirtyRef = useRef(dirty);
    dirtyRef.current = dirty;

    const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && !allowLeave.current && currentLocation.pathname + currentLocation.search !== nextLocation.pathname + nextLocation.search);

    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    const goToList = () => navigate({ search: '' });

    const goToStep = (index: number) => {
        setStep(index);
        setMaxStep((m) => Math.max(m, index));
        topRef.current?.scrollIntoView({ block: 'start' });
    };

    const next = async () => {
        const fields = STEPS[step].fields;
        const ok = fields.length === 0 ? true : await form.trigger(fields as FieldPath<ListingFormValues>[]);
        if (ok) goToStep(step + 1);
    };

    const firstErrorStep = (names: string[]) => (names.length ? Math.min(...names.map(stepIndexForField)) : -1);

    const submit = (action: SaveAction) =>
        form.handleSubmit(
            async (values) => {
                if (action === 'publish' && imagesRef.current.length === 0) {
                    setFormError('Add at least one image before publishing.');
                    goToStep(IMAGES_STEP);
                    return;
                }
                setSaving(action);
                setFormError(null);
                try {
                    await saveListing(
                        {
                            values,
                            images: imagesRef.current,
                            action,
                            productId: createdProductId.current,
                            serverVariantIds: serverVariantIds.current,
                            serverImageIds: serverImageIds.current,
                        },
                        {
                            onProduct: (id) => {
                                createdProductId.current = id;
                            },
                            onVariant: (index, id) => {
                                form.setValue(`variants.${index}.serverId`, id);
                                serverVariantIds.current = [...serverVariantIds.current, id];
                            },
                            onVariantsPruned: (ids) => {
                                serverVariantIds.current = serverVariantIds.current.filter((id) => !ids.includes(id));
                                // A deleted variant must not be PATCHed later if the seller switches that row back on.
                                form.getValues('variants').forEach((row, i) => {
                                    if (row.serverId && ids.includes(row.serverId)) form.setValue(`variants.${i}.serverId`, undefined);
                                });
                            },
                            onImages: (saved) => {
                                imagesRef.current = saved;
                                setImagesState(saved);
                                serverImageIds.current = Array.from(new Set([...serverImageIds.current, ...saved.filter((i) => i.id).map((i) => i.id as string)]));
                            },
                        }
                    );
                    allowLeave.current = true;
                    await globalMutate(isListingsKey);
                    void globalMutate('seller:stats');
                    toast.success(action === 'publish' ? 'Listing published' : action === 'draft' ? 'Draft saved' : 'Changes saved');
                    goToList();
                } catch (e) {
                    const err = toListingSaveError(e);
                    const unmatched: string[] = [];
                    const matched: string[] = [];
                    err.fields.forEach((f) => {
                        const root = f.name.split('.')[0];
                        if (STEPS.some((s) => (s.fields as string[]).includes(root))) {
                            form.setError(f.name as FieldPath<ListingFormValues>, { type: 'server', message: f.message });
                            matched.push(f.name);
                        } else {
                            unmatched.push(`${f.name.replace(/_/g, ' ')}: ${f.message}`);
                        }
                    });
                    setFormError([err.message, ...unmatched].join(' '));
                    const target = firstErrorStep(matched);
                    if (target >= 0) goToStep(target);
                    toast.error(err.kind === 'validation' ? 'Please fix the highlighted fields' : err.message);
                } finally {
                    setSaving(null);
                }
            },
            (errors) => {
                const target = firstErrorStep(Object.keys(errors));
                if (target >= 0) goToStep(target);
                toast.error('Some details need your attention');
            }
        )();

    const busy = saving !== null;
    const isLast = step === STEPS.length - 1;

    return (
        <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} noValidate className="mx-auto max-w-3xl">
                <div ref={topRef} className="scroll-mt-16" />
                <div className="mb-2 flex items-center gap-2">
                    <Button type="button" variant="ghost" size="icon" className="-ml-2 h-9 w-9" onClick={goToList} aria-label="Back to listings">
                        <ArrowLeft aria-hidden="true" />
                    </Button>
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-bold tracking-tight text-foreground">{isEdit ? 'Edit listing' : 'New listing'}</h1>
                    </div>
                </div>

                <nav aria-label="Listing steps" className="mb-3">
                    <ol className="flex items-center gap-1.5">
                        {STEPS.map((s, i) => {
                            const done = i < step;
                            const current = i === step;
                            const reachable = i <= maxStep;
                            return (
                                <li key={s.id} className={cn('flex items-center gap-1.5', current ? 'min-w-0 flex-1' : 'shrink-0', !current && 'sm:min-w-0 sm:flex-1')}>
                                    <button
                                        type="button"
                                        onClick={() => reachable && goToStep(i)}
                                        disabled={!reachable || busy}
                                        aria-current={current ? 'step' : undefined}
                                        className={cn(
                                            'flex h-8 min-w-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed',
                                            current ? 'w-full bg-primary text-primary-foreground' : done ? 'bg-success-subtle text-success-subtle-foreground' : 'bg-muted text-muted-foreground',
                                            !current && 'sm:w-full'
                                        )}
                                    >
                                        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-[11px]">{done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i + 1}</span>
                                        <span className={cn('truncate', !current && 'hidden sm:inline')}>{s.label}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </nav>

                {formError ? <ErrorPanel title="This listing was not fully saved" message={formError} className="mb-3" /> : null}

                <section aria-label={STEPS[step].label}>
                    {STEPS[step].id === 'details' ? <DetailsStep /> : null}
                    {STEPS[step].id === 'variants' ? <VariantsStep currency={currency} images={images} onImagesChange={setImages} /> : null}
                    {STEPS[step].id === 'images' ? <ImagesStep images={images} onChange={setImages} /> : null}
                    {STEPS[step].id === 'shipping' ? <ShippingStep /> : null}
                    {STEPS[step].id === 'review' ? <ReviewStep images={images} currency={currency} canPublish={images.length > 0} /> : null}
                </section>

                <div className="sticky bottom-[4.25rem] z-40 mt-4 flex items-center justify-between gap-2 border-t bg-background py-2.5 md:bottom-0">
                    <Button type="button" variant="outline" onClick={() => (step === 0 ? goToList() : goToStep(step - 1))} disabled={busy}>
                        {step === 0 ? 'Cancel' : 'Back'}
                    </Button>
                    {!isLast ? (
                        <Button type="button" onClick={next} disabled={busy}>
                            Next
                        </Button>
                    ) : (
                        <div className="flex items-center gap-2">
                            {canChangePublication ? (
                                <>
                                    <Button type="button" variant="outline" onClick={() => void submit('draft')} disabled={busy}>
                                        {saving === 'draft' ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                                        Save draft
                                    </Button>
                                    <Button type="button" onClick={() => void submit('publish')} disabled={busy || images.length === 0}>
                                        {saving === 'publish' ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                                        Publish
                                    </Button>
                                </>
                            ) : (
                                <Button type="button" onClick={() => void submit('save')} disabled={busy}>
                                    {saving === 'save' ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                                    Save changes
                                </Button>
                            )}
                        </div>
                    )}
                </div>

                <Dialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.state === 'blocked' && blocker.reset()}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Leave without saving?</DialogTitle>
                            <DialogDescription>You have changes that have not been saved. If you leave now they will be lost.</DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => blocker.state === 'blocked' && blocker.reset()}>
                                Keep editing
                            </Button>
                            <Button type="button" variant="destructive" onClick={() => blocker.state === 'blocked' && blocker.proceed()}>
                                Leave
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </form>
        </Form>
    );
}

/** Loads what the wizard needs (seller identity, and in edit mode the product) and refuses foreign products. */
export default function ListingWizard({ productId }: { productId?: string }) {
    const navigate = useNavigate();
    const me = useSWR<SellerSelf, SellerApiError>('seller:me', fetchSellerSelf, SWR_OPTIONS);
    const stats = useSWR<{ currency: string }, SellerApiError>('seller:stats', fetchSellerStats, SWR_OPTIONS);
    const product = useSWR<ProductDetail, SellerApiError>(productId ? ['seller:product', productId] : null, () => fetchProductDetail(productId as string), { ...SWR_OPTIONS, revalidateIfStale: true, dedupingInterval: 0 });
    const variants = useSWR<VariantDetail[], SellerApiError>(productId ? ['seller:product-variants', productId] : null, () => fetchProductVariants(productId as string), { ...SWR_OPTIONS, dedupingInterval: 0 });
    const images = useSWR<ImageDetail[], SellerApiError>(productId ? ['seller:product-images', productId] : null, () => fetchProductImages(productId as string), { ...SWR_OPTIONS, dedupingInterval: 0 });

    const back = (
        <Button type="button" variant="outline" size="sm" onClick={() => navigate({ search: '' })}>
            <ArrowLeft aria-hidden="true" />
            Back to listings
        </Button>
    );

    if (me.error?.kind === 'forbidden') return <NotSellerState message={me.error.message} />;
    const loadError = me.error ?? product.error ?? variants.error ?? images.error;
    if (loadError) {
        const retry = () => {
            void me.mutate();
            void product.mutate();
            void variants.mutate();
            void images.mutate();
        };
        if (product.error?.kind === 'not_found' || product.error?.kind === 'forbidden') {
            return (
                <div className="mx-auto max-w-3xl space-y-3">
                    <ErrorPanel title="Listing not found" message="This listing does not exist or does not belong to your store." />
                    {back}
                </div>
            );
        }
        return (
            <div className="mx-auto max-w-3xl space-y-3">
                <ErrorPanel title="Could not open the listing editor" message={loadError.message} onRetry={retry} />
                {back}
            </div>
        );
    }

    if (me.isLoading || !me.data) return <WizardSkeleton />;

    if (!productId) {
        return <WizardForm key="new" initialValues={defaultListingValues()} initialImages={[]} initialVariantIds={[]} currency={stats.data?.currency} />;
    }

    if (product.isValidating || variants.isValidating || images.isValidating || !product.data || !variants.data || !images.data) return <WizardSkeleton />;

    if (!product.data.seller_profile || String(product.data.seller_profile) !== String(me.data.id)) {
        return (
            <div className="mx-auto max-w-3xl space-y-3">
                <ErrorPanel title="Listing not found" message="This listing does not exist or does not belong to your store." />
                {back}
            </div>
        );
    }

    return (
        <WizardForm
            key={productId}
            productId={productId}
            initialStatus={product.data.status}
            initialValues={valuesFromServer(product.data, variants.data)}
            initialImages={imagesFromServer(images.data, variants.data)}
            initialVariantIds={variants.data.map((v) => String(v.id))}
            currency={product.data.pricing_currency ?? stats.data?.currency}
        />
    );
}
