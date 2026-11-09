/** Pieces of the seller review that the full seller page reuses. */
import { useEffect, useRef, useState, type ReactNode } from 'react';

import { toast } from 'sonner';
import { Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Switch } from '@/components/shadcn/switch';
import { cn } from '@/lib/utils';
import { updateAdminSeller, type AdminSellerError, type SellerDetail, type SellerUpdate } from '@/services/adminSellersService';
import { ErrorPanel } from '../../seller/components/ErrorPanel';
import { idTypeLabel } from './sellerUi';

/** Every list, count and detail SWR key starts with this so one predicate refreshes them all. */
export const SELLERS_KEY = 'admin:sellers';
export const detailKey = (id: string) => [SELLERS_KEY, 'detail', id] as const;
export const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false } as const;

export const MIN_REJECT_REASON = 10;
export const MIN_SUSPEND_REASON = 10;

export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
    return (
        <section className={cn('space-y-2', className)}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            {children}
        </section>
    );
}

export function Field({ label, value, className }: { label: string; value?: ReactNode; className?: string }) {
    const empty = value === null || value === undefined || value === '';
    return (
        <div className={cn('min-w-0', className)}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn('break-words text-sm', empty ? 'text-muted-foreground' : 'text-foreground')}>{empty ? 'Not provided' : value}</dd>
        </div>
    );
}

export function DetailSkeleton() {
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

export function IdentitySection({ seller }: { seller: SellerDetail }) {
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

export function StoreSettings({ seller, onSaved, onError }: { seller: SellerDetail; onSaved: () => void; onError: (error: AdminSellerError) => void }) {
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
