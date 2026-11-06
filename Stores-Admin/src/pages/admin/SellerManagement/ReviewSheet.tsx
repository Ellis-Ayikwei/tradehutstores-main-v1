import { useEffect, useRef, useState, type ReactNode } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { Ban, Check, Copy, Eye, EyeOff, Loader2, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Separator } from '@/components/shadcn/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/shadcn/sheet';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Switch } from '@/components/shadcn/switch';
import { cn } from '@/lib/utils';
import { fetchAdminSeller, updateAdminSeller, type AdminSellerError, type SellerDetail, type SellerUpdate } from '@/services/adminSellersService';
import { ErrorPanel } from '../../seller/components/ErrorPanel';
import { DecisionDialog, type ActionResult } from './DecisionDialog';
import { DocumentsSection } from './DocumentsSection';
import { CategoryChips, OTHER_CATEGORY_HINT, OtherCategoryChip, StatusBadge, businessTypeLabel, categoryNames, formatDate, formatDateTime, idTypeLabel, ownerName } from './sellerUi';

/** Every list, count and detail SWR key starts with this so one predicate refreshes them all. */
export const SELLERS_KEY = 'admin:sellers';
const detailKey = (id: string) => [SELLERS_KEY, 'detail', id] as const;
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false } as const;

const MIN_REJECT_REASON = 10;
const MIN_SUSPEND_REASON = 10;

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
    return (
        <section className={cn('space-y-2', className)}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            {children}
        </section>
    );
}

function Field({ label, value, className }: { label: string; value?: ReactNode; className?: string }) {
    const empty = value === null || value === undefined || value === '';
    return (
        <div className={cn('min-w-0', className)}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn('break-words text-sm', empty ? 'text-muted-foreground' : 'text-foreground')}>{empty ? 'Not provided' : value}</dd>
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div className="space-y-4" aria-busy="true" aria-label="Loading seller">
            <Skeleton className="h-5 w-1/2" />
            <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                ))}
            </div>
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-20 w-full" />
        </div>
    );
}

function IdentitySection({ seller }: { seller: SellerDetail }) {
    const [revealed, setRevealed] = useState(false);
    const full = seller.id_number?.trim() || '';
    const last4 = seller.id_number_last4 || (full ? full.slice(-4) : '');
    const masked = last4 ? `•••• ${last4}` : '';

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(full);
            toast.success('ID number copied');
        } catch {
            toast.error('Could not copy. Select the number and copy it manually.');
        }
    };

    return (
        <Section title="Identity (staff only)">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                <Field label="ID type" value={idTypeLabel(seller.id_type)} />
                <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">ID number</dt>
                    <dd className="flex flex-wrap items-center gap-1.5 text-sm">
                        {full || masked ? (
                            <>
                                <span className="break-all font-mono text-foreground">{revealed && full ? full : masked || '••••'}</span>
                                {full ? (
                                    <>
                                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setRevealed((v) => !v)} aria-pressed={revealed}>
                                            {revealed ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                                            {revealed ? 'Hide' : 'Reveal'}
                                        </Button>
                                        {revealed ? (
                                            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => void copy()} aria-label="Copy ID number">
                                                <Copy aria-hidden="true" />
                                                Copy
                                            </Button>
                                        ) : null}
                                    </>
                                ) : null}
                            </>
                        ) : (
                            <span className="text-muted-foreground">Not provided</span>
                        )}
                    </dd>
                </div>
                {seller.bank_account_last4 ? <Field label="Bank account" value={`•••• ${seller.bank_account_last4}`} /> : null}
            </dl>
        </Section>
    );
}

function StoreSettings({ seller, onSaved, onError }: { seller: SellerDetail; onSaved: () => void; onError: (error: AdminSellerError) => void }) {
    const initialRate = seller.commission_rate === null || seller.commission_rate === undefined ? '' : String(seller.commission_rate);
    const [rate, setRate] = useState(initialRate);
    const [active, setActive] = useState(Boolean(seller.is_active));
    const [accepting, setAccepting] = useState(Boolean(seller.is_accepting_orders));
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const busy = useRef(false);

    useEffect(() => {
        setRate(seller.commission_rate === null || seller.commission_rate === undefined ? '' : String(seller.commission_rate));
        setActive(Boolean(seller.is_active));
        setAccepting(Boolean(seller.is_accepting_orders));
    }, [seller.id, seller.commission_rate, seller.is_active, seller.is_accepting_orders]);

    const trimmedRate = rate.trim();
    const rateNumber = Number(trimmedRate);
    let rateError: string | null = null;
    if (trimmedRate !== '') {
        if (!/^\d+(\.\d{1,2})?$/.test(trimmedRate)) rateError = 'Enter a number with up to 2 decimals';
        else if (rateNumber < 0 || rateNumber > 100) rateError = 'Must be between 0 and 100';
    }

    const rateChanged = trimmedRate !== '' && (initialRate === '' || Number(initialRate) !== rateNumber);
    const activeChanged = active !== Boolean(seller.is_active);
    const acceptingChanged = accepting !== Boolean(seller.is_accepting_orders);
    const dirty = rateChanged || activeChanged || acceptingChanged;

    const save = async () => {
        if (busy.current || !dirty || rateError) return;
        busy.current = true;
        setSaving(true);
        setFormError(null);
        const body: SellerUpdate = {};
        if (rateChanged) body.commission_rate = trimmedRate;
        if (activeChanged) body.is_active = active;
        if (acceptingChanged) body.is_accepting_orders = accepting;
        try {
            await updateAdminSeller(seller.id, body);
            toast.success('Store settings saved');
            onSaved();
        } catch (e) {
            const err = e as AdminSellerError;
            setFormError(err.fieldErrors?.commission_rate ?? err.message);
            if (err.kind === 'forbidden' || err.kind === 'not_found') onError(err);
            if (err.kind === 'network' || err.kind === 'server') toast.error(err.message);
        } finally {
            busy.current = false;
            setSaving(false);
        }
    };

    return (
        <Section title="Store settings">
            <div className="space-y-3 rounded-lg border p-3">
                {formError ? <ErrorPanel title="Could not save settings" message={formError} /> : null}
                <div className="space-y-1.5">
                    <Label htmlFor="seller-commission">Commission rate (%)</Label>
                    <Input
                        id="seller-commission"
                        inputMode="decimal"
                        value={rate}
                        onChange={(event) => setRate(event.target.value)}
                        disabled={saving}
                        aria-invalid={Boolean(rateError)}
                        className="max-w-[10rem]"
                    />
                    {rateError ? <p className="text-xs text-destructive">{rateError}</p> : null}
                </div>
                <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="seller-active" className="leading-snug">
                        Account active
                        <span className="block text-xs font-normal text-muted-foreground">Inactive stores are hidden from buyers.</span>
                    </Label>
                    <Switch id="seller-active" checked={active} onCheckedChange={setActive} disabled={saving} />
                </div>
                <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="seller-accepting" className="leading-snug">
                        Accepting orders
                        <span className="block text-xs font-normal text-muted-foreground">Turn off to pause new orders.</span>
                    </Label>
                    <Switch id="seller-accepting" checked={accepting} onCheckedChange={setAccepting} disabled={saving} />
                </div>
                <Button type="button" size="sm" onClick={() => void save()} disabled={!dirty || Boolean(rateError) || saving}>
                    {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                    Save settings
                </Button>
            </div>
        </Section>
    );
}

type Decision = 'approve' | 'reject' | 'suspend' | 'reinstate';

interface ReviewSheetProps {
    sellerId: string | null;
    onClose: () => void;
}

export function ReviewSheet({ sellerId, onClose }: ReviewSheetProps) {
    const { mutate: globalMutate } = useSWRConfig();
    const { data: seller, error, isLoading, isValidating, mutate } = useSWR<SellerDetail, AdminSellerError>(sellerId ? detailKey(sellerId) : null, () => fetchAdminSeller(sellerId as string), SWR_OPTIONS);

    const [dialog, setDialog] = useState<Decision | null>(null);
    const [actionError, setActionError] = useState<AdminSellerError | null>(null);

    useEffect(() => {
        setDialog(null);
        setActionError(null);
    }, [sellerId]);

    const refreshAll = () => {
        void globalMutate((key) => Array.isArray(key) && key[0] === SELLERS_KEY);
    };

    const surfaceError = (err: AdminSellerError) => {
        setActionError(err);
        refreshAll();
    };

    /** PATCH a decision. Resolves to the error (dialog stays open) or null on success; sheet stays open on the new state. */
    const decide = async (body: SellerUpdate, success: string): Promise<ActionResult> => {
        if (!sellerId) return null;
        setActionError(null);
        try {
            await updateAdminSeller(sellerId, body);
            toast.success(success);
            setDialog(null);
            refreshAll();
            return null;
        } catch (e) {
            const err = e as AdminSellerError;
            if (err.kind === 'network' || err.kind === 'server') toast.error(err.message);
            if (err.kind === 'forbidden' || err.kind === 'not_found') {
                setDialog(null);
                surfaceError(err);
                toast.error(err.message);
            } else if (err.kind === 'conflict' && err.code !== 'missing_documents') {
                toast.error(err.message);
                refreshAll();
            }
            return err;
        }
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setActionError(null);
            onClose();
        }
    };

    const status = seller?.verification_status;
    const store = seller?.business_name ?? 'this store';
    const missing = seller?.missing_documents ?? [];
    const docs = seller?.documents ?? [];
    const owner = seller ? ownerName(seller.user) : '';
    const hasBar = Boolean(seller && (status === 'pending' || status === 'rejected' || status === 'verified' || status === 'suspended'));

    return (
        <Sheet open={Boolean(sellerId)} onOpenChange={handleOpenChange}>
            <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl sm:p-0 md:max-w-2xl">
                <SheetHeader className="space-y-1 border-b p-4 pr-12">
                    <div className="flex flex-wrap items-center gap-2">
                        <SheetTitle className="min-w-0 truncate">{seller?.business_name ?? 'Seller review'}</SheetTitle>
                        {status ? <StatusBadge status={status} /> : null}
                    </div>
                    <SheetDescription>{seller ? [businessTypeLabel(seller.business_type), owner].filter(Boolean).join(' · ') : 'Application details'}</SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {actionError ? <ErrorPanel title="That did not go through" message={actionError.message} /> : null}

                    {isLoading && !seller ? (
                        <DetailSkeleton />
                    ) : error && !seller ? (
                        <ErrorPanel title="Could not load this seller" message={error.message} onRetry={() => void mutate()} isRetrying={isValidating} />
                    ) : seller ? (
                        <>
                            <Section title="Business">
                                <dl className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                                    <Field label="Store name" value={seller.business_name} />
                                    <Field label="Business type" value={businessTypeLabel(seller.business_type)} />
                                    <Field label="Owner" value={owner ? `${owner}${seller.user?.email ? ` (${seller.user.email})` : ''}` : ''} className="sm:col-span-2" />
                                    <Field label="Business email" value={seller.business_email} />
                                    <Field label="Business phone" value={seller.business_phone} />
                                    <Field label="Address" value={seller.business_address} className="sm:col-span-2" />
                                    <Field label="Registration no." value={seller.business_registration_number} />
                                    <Field label="Tax ID" value={seller.tax_id} />
                                    <div className="min-w-0 space-y-1.5 sm:col-span-2">
                                        <dt className="text-xs text-muted-foreground">Sells</dt>
                                        <dd className="space-y-1.5">
                                            {categoryNames(seller.selling_categories).length > 0 ? (
                                                <CategoryChips names={categoryNames(seller.selling_categories)} limit={Number.MAX_SAFE_INTEGER} />
                                            ) : !seller.other_category?.trim() ? (
                                                <span className="text-sm text-muted-foreground">Not provided</span>
                                            ) : null}
                                            {seller.other_category?.trim() ? (
                                                <div className="space-y-0.5">
                                                    <OtherCategoryChip text={seller.other_category} />
                                                    <p className="text-xs text-muted-foreground">{OTHER_CATEGORY_HINT}</p>
                                                </div>
                                            ) : null}
                                        </dd>
                                    </div>
                                    <Field label="About the store" value={seller.business_description} className="sm:col-span-2" />
                                </dl>
                            </Section>

                            <Separator />
                            <IdentitySection key={seller.id} seller={seller} />

                            <Separator />
                            <Section title={`Documents (${docs.length})`}>
                                {missing.length > 0 && status !== 'verified' ? <p className="rounded-md bg-warning-subtle p-2 text-xs text-warning-subtle-foreground">Required documents are missing, so approval will be blocked until they are provided.</p> : null}
                                <DocumentsSection documents={docs} missing={missing} onChanged={refreshAll} onError={surfaceError} />
                            </Section>

                            <Separator />
                            <StoreSettings seller={seller} onSaved={refreshAll} onError={surfaceError} />

                            <Separator />
                            <Section title="History and notes">
                                <dl className="space-y-2">
                                    <Field label="Review notes" value={seller.verification_notes} />
                                    <Field label="Verified on" value={formatDateTime(seller.verification_date)} />
                                    {seller.created_on ? <Field label="Applied on" value={formatDate(seller.created_on)} /> : null}
                                </dl>
                            </Section>
                        </>
                    ) : null}
                </div>

                {hasBar && seller ? (
                    <>
                        <Separator />
                        <div className="flex flex-wrap gap-2 bg-background p-3 [&>button]:flex-1 sm:[&>button]:flex-none" role="group" aria-label="Decision">
                            {status === 'pending' || status === 'rejected' ? (
                                <Button type="button" onClick={() => setDialog('approve')}>
                                    <Check aria-hidden="true" />
                                    Approve
                                </Button>
                            ) : null}
                            {status === 'pending' ? (
                                <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDialog('reject')}>
                                    <XCircle aria-hidden="true" />
                                    Reject…
                                </Button>
                            ) : null}
                            {status === 'verified' ? (
                                <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDialog('suspend')}>
                                    <Ban aria-hidden="true" />
                                    Suspend…
                                </Button>
                            ) : null}
                            {status === 'suspended' ? (
                                <Button type="button" onClick={() => setDialog('reinstate')}>
                                    <RotateCcw aria-hidden="true" />
                                    Reinstate
                                </Button>
                            ) : null}
                        </div>
                    </>
                ) : null}
            </SheetContent>

            {seller ? (
                <>
                    <DecisionDialog
                        open={dialog === 'approve'}
                        onOpenChange={(open) => setDialog(open ? 'approve' : null)}
                        title={`Approve ${store}?`}
                        description="Their products become public."
                        confirmLabel="Approve"
                        onSubmit={() => decide({ verification_status: 'verified' }, `${store} approved`)}
                    />
                    <DecisionDialog
                        open={dialog === 'reinstate'}
                        onOpenChange={(open) => setDialog(open ? 'reinstate' : null)}
                        title={`Reinstate ${store}?`}
                        description="The store is verified again and its products become public."
                        confirmLabel="Reinstate"
                        onSubmit={() => decide({ verification_status: 'verified' }, `${store} reinstated`)}
                    />
                    <DecisionDialog
                        open={dialog === 'reject'}
                        onOpenChange={(open) => setDialog(open ? 'reject' : null)}
                        title={`Reject ${store}?`}
                        description={
                            <span className="flex items-start gap-1.5">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>The reason you write is shown to the seller, so keep it clear and professional.</span>
                            </span>
                        }
                        confirmLabel="Reject application"
                        destructive
                        minReason={MIN_REJECT_REASON}
                        reasonLabel="Reason (shown to the seller)"
                        onSubmit={(reason) => decide({ verification_status: 'rejected', verification_notes: reason }, `${store} rejected`)}
                    />
                    <DecisionDialog
                        open={dialog === 'suspend'}
                        onOpenChange={(open) => setDialog(open ? 'suspend' : null)}
                        title={`Suspend ${store}?`}
                        description="Their products are removed from public view until the store is reinstated."
                        confirmLabel="Suspend store"
                        destructive
                        minReason={MIN_SUSPEND_REASON}
                        reasonLabel="Reason"
                        reasonHint="Saved to the seller's review notes."
                        onSubmit={(reason) => decide({ verification_status: 'suspended', verification_notes: reason }, `${store} suspended`)}
                    />
                </>
            ) : null}
        </Sheet>
    );
}
