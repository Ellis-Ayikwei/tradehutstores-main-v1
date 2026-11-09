import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import type { OrderApiError, ShipOrderInput } from '@/services/sellerOrdersService';
import { ErrorPanel } from '../components/ErrorPanel';

/** Resolves to the error when the action failed (so the dialog stays open), or null on success. */
export type ActionResult = OrderApiError | null;

interface DialogBase {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderLabel: string;
}

const URL_PATTERN = /^https?:\/\/\S+$/i;
const PHONE_PATTERN = /^\+?[\d][\d\s()-]{5,19}$/;
const CARRIERS = ['Own delivery (rider)', 'DHL', 'FedEx', 'UPS', 'Aramex', 'Ghana Post', 'Yango Delivery', 'Bolt Delivery'] as const;
const OTHER_CARRIER = 'Other';
/** Days from dispatch to the usual arrival; pre-fills the delivery estimate. */
const SERVICE_LEVELS = [
    { value: 'Standard', days: 4, hint: '3 to 5 days' },
    { value: 'Express', days: 2, hint: '1 to 2 days' },
    { value: 'Same day', days: 0, hint: 'Today' },
    { value: 'Pickup', days: 0, hint: 'Buyer collects' },
] as const;

type ShipField =
    | 'carrier'
    | 'courier_reference'
    | 'tracking_url'
    | 'parcels'
    | 'weight_kg'
    | 'length_cm'
    | 'width_cm'
    | 'height_cm'
    | 'dispatch_date'
    | 'estimated_delivery_date'
    | 'contact_name'
    | 'contact_phone'
    | 'buyer_note'
    | 'internal_note'
    | 'packed';
type ShipErrors = Partial<Record<ShipField, string>>;

/** What the dialog shows about the order it is shipping (the callers have different order shapes). */
export interface ShipContext {
    recipient?: string | null;
    addressLines: string[];
    phone?: string | null;
    itemCount: number;
    /** Set for cash on delivery: the amount the rider collects, already formatted. */
    cashDue?: string | null;
}

const SELECT_CLASS =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const localIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (iso: string, n: number) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate() + n);
    return localIso(d);
};

function ShipField({ id, label, optional, error, children }: { id: string; label: string; optional?: boolean; error?: string; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>
                {label} {optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
            </Label>
            {children}
            {error ? (
                <p id={`${id}-error`} className="text-sm text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

function Heading({ children }: { children: ReactNode }) {
    return <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{children}</legend>;
}

function ShipForm({ onOpenChange, orderLabel, context, onSubmit }: Omit<DialogBase, 'open'> & { context: ShipContext; onSubmit: (values: ShipOrderInput) => Promise<ActionResult> }) {
    const uid = useId();
    const today = localIso(new Date());
    const [carrierChoice, setCarrierChoice] = useState<string>(CARRIERS[0]);
    const [carrierOther, setCarrierOther] = useState('');
    const [service, setService] = useState<string>('Standard');
    const [courierRef, setCourierRef] = useState('');
    const [link, setLink] = useState('');
    const [parcels, setParcels] = useState('1');
    const [weight, setWeight] = useState('');
    const [length, setLength] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [dispatch, setDispatch] = useState(today);
    const [etaOverride, setEtaOverride] = useState<string | null>(null);
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [buyerNote, setBuyerNote] = useState('');
    const [internalNote, setInternalNote] = useState('');
    const [packed, setPacked] = useState(false);
    const [errors, setErrors] = useState<ShipErrors>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const days = SERVICE_LEVELS.find((s) => s.value === service)?.days ?? 4;
    const eta = etaOverride ?? (dispatch ? addDays(dispatch, days) : '');
    const items = `${context.itemCount} ${context.itemCount === 1 ? 'item' : 'items'}`;
    const err = (field: ShipField) => errors[field];
    const describe = (field: ShipField) => (errors[field] ? `${uid}-${field}-error` : undefined);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        const next: ShipErrors = {};
        const carrier = carrierChoice === OTHER_CARRIER ? carrierOther.trim() : carrierChoice;
        if (!carrier) next.carrier = 'Enter the delivery company';
        else if (carrier.length > 100) next.carrier = 'That name is too long';
        const parcelCount = Number(parcels);
        if (!Number.isInteger(parcelCount) || parcelCount < 1 || parcelCount > 50) next.parcels = 'Enter a whole number from 1 to 50';
        const positive = (value: string, field: ShipField) => {
            if (!value.trim()) return;
            const n = Number(value);
            if (!Number.isFinite(n) || n <= 0) next[field] = 'Enter a number above 0';
        };
        positive(weight, 'weight_kg');
        const dims = [length, width, height];
        if (dims.some((d) => d.trim()) && !dims.every((d) => d.trim())) next.length_cm = 'Give length, width and height together, or none';
        else {
            positive(length, 'length_cm');
            positive(width, 'width_cm');
            positive(height, 'height_cm');
        }
        if (!dispatch) next.dispatch_date = 'Pick the dispatch date';
        if (dispatch && eta && eta < dispatch) next.estimated_delivery_date = 'Delivery can’t be before the dispatch date';
        const u = link.trim();
        if (u && !URL_PATTERN.test(u)) next.tracking_url = 'Enter a full link starting with http:// or https://';
        const p = contactPhone.trim();
        if (p && !PHONE_PATTERN.test(p)) next.contact_phone = 'Enter a valid phone number';
        if (!packed) next.packed = 'Confirm the items are packed before shipping';

        setErrors(next);
        setFormError(null);
        if (Object.keys(next).length > 0) return;

        setSubmitting(true);
        const error = await onSubmit({
            carrier,
            service_level: service,
            courier_reference: courierRef.trim() || undefined,
            tracking_url: u || undefined,
            parcels: parcelCount,
            weight_kg: weight.trim() || undefined,
            length_cm: length.trim() || undefined,
            width_cm: width.trim() || undefined,
            height_cm: height.trim() || undefined,
            dispatch_date: dispatch,
            estimated_delivery_date: eta || undefined,
            contact_name: contactName.trim() || undefined,
            contact_phone: p || undefined,
            buyer_note: buyerNote.trim() || undefined,
            internal_note: internalNote.trim() || undefined,
        });
        setSubmitting(false);
        if (!error) return;
        const server: ShipErrors = {};
        let any = false;
        for (const key of Object.keys(error.fieldErrors ?? {}) as ShipField[]) {
            const message = error.fieldErrors?.[key];
            if (message) {
                server[key] = message;
                any = true;
            }
        }
        if (any) setErrors(server);
        else setFormError(error.message);
    };

    const serviceSelect = (
        <ShipField id={`${uid}-service`} label="Service">
            <select id={`${uid}-service`} className={SELECT_CLASS} value={service} onChange={(e) => setService(e.target.value)}>
                {SERVICE_LEVELS.map((s) => (
                    <option key={s.value} value={s.value}>
                        {s.value} ({s.hint})
                    </option>
                ))}
            </select>
        </ShipField>
    );

    return (
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
                <DialogTitle>Ship order {orderLabel}</DialogTitle>
                <DialogDescription>Tell us how it is going out. The tracking number is generated for you when you confirm, and the buyer sees it straight away.</DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4" noValidate>
                {formError ? <ErrorPanel title="Could not mark as shipped" message={formError} /> : null}

                <div className="rounded-md border bg-muted p-3 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Deliver to</p>
                    {context.recipient || context.addressLines.length > 0 ? (
                        <address className="mt-1 not-italic">
                            {context.recipient ? <p className="font-semibold">{context.recipient}</p> : null}
                            {context.addressLines.map((line) => (
                                <p key={line}>{line}</p>
                            ))}
                            {context.phone ? <p className="text-muted-foreground">{context.phone}</p> : null}
                        </address>
                    ) : (
                        <p className="mt-1 text-muted-foreground">No address came with this order.</p>
                    )}
                    <p className="mt-2 text-muted-foreground">
                        {items}
                        {context.cashDue ? ` · cash on delivery, collect ${context.cashDue}` : ' · already paid'}
                    </p>
                </div>

                <fieldset>
                    <Heading>Delivery partner</Heading>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ShipField id={`${uid}-carrier`} label="Delivery company" error={err('carrier')}>
                            <select
                                id={`${uid}-carrier`}
                                className={SELECT_CLASS}
                                value={carrierChoice}
                                onChange={(e) => setCarrierChoice(e.target.value)}
                                aria-invalid={Boolean(err('carrier'))}
                                aria-describedby={describe('carrier')}
                            >
                                {CARRIERS.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                                <option value={OTHER_CARRIER}>Other…</option>
                            </select>
                        </ShipField>
                        {carrierChoice === OTHER_CARRIER ? (
                            <ShipField id={`${uid}-carrier-other`} label="Company name" error={err('carrier')}>
                                <Input id={`${uid}-carrier-other`} value={carrierOther} onChange={(e) => setCarrierOther(e.target.value)} autoComplete="off" />
                            </ShipField>
                        ) : (
                            serviceSelect
                        )}
                        {carrierChoice === OTHER_CARRIER ? serviceSelect : null}
                        <ShipField id={`${uid}-courier_reference`} label="Courier’s own reference" optional error={err('courier_reference')}>
                            <Input id={`${uid}-courier_reference`} value={courierRef} onChange={(e) => setCourierRef(e.target.value)} autoComplete="off" placeholder="Waybill number, if they gave one" />
                        </ShipField>
                        <ShipField id={`${uid}-tracking_url`} label="Courier tracking link" optional error={err('tracking_url')}>
                            <Input
                                id={`${uid}-tracking_url`}
                                type="url"
                                inputMode="url"
                                value={link}
                                onChange={(e) => setLink(e.target.value)}
                                autoComplete="off"
                                aria-invalid={Boolean(err('tracking_url'))}
                                aria-describedby={describe('tracking_url')}
                            />
                        </ShipField>
                    </div>
                </fieldset>

                <fieldset>
                    <Heading>Package</Heading>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ShipField id={`${uid}-parcels`} label="Number of parcels" error={err('parcels')}>
                            <Input id={`${uid}-parcels`} type="number" inputMode="numeric" min={1} max={50} value={parcels} onChange={(e) => setParcels(e.target.value)} aria-invalid={Boolean(err('parcels'))} aria-describedby={describe('parcels')} />
                        </ShipField>
                        <ShipField id={`${uid}-weight_kg`} label="Total weight (kg)" optional error={err('weight_kg')}>
                            <Input id={`${uid}-weight_kg`} inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 2.5" aria-invalid={Boolean(err('weight_kg'))} aria-describedby={describe('weight_kg')} />
                        </ShipField>
                    </div>
                    <div className="mt-3">
                        <p className="mb-1.5 text-sm font-medium">
                            Size in cm <span className="font-normal text-muted-foreground">(optional)</span>
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {(
                                [
                                    ['length_cm', 'Length', length, setLength],
                                    ['width_cm', 'Width', width, setWidth],
                                    ['height_cm', 'Height', height, setHeight],
                                ] as const
                            ).map(([field, label, value, set]) => (
                                <Input key={field} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} placeholder={label} aria-label={`${label} in centimetres`} aria-invalid={Boolean(err(field))} />
                            ))}
                        </div>
                        {err('length_cm') || err('width_cm') || err('height_cm') ? <p className="mt-1 text-sm text-destructive">{err('length_cm') ?? err('width_cm') ?? err('height_cm')}</p> : null}
                    </div>
                </fieldset>

                <fieldset>
                    <Heading>Dates</Heading>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ShipField id={`${uid}-dispatch_date`} label="Dispatch date" error={err('dispatch_date')}>
                            <Input id={`${uid}-dispatch_date`} type="date" value={dispatch} onChange={(e) => setDispatch(e.target.value)} aria-invalid={Boolean(err('dispatch_date'))} aria-describedby={describe('dispatch_date')} />
                        </ShipField>
                        <ShipField id={`${uid}-estimated_delivery_date`} label="Expected delivery" error={err('estimated_delivery_date')}>
                            <Input
                                id={`${uid}-estimated_delivery_date`}
                                type="date"
                                value={eta}
                                min={dispatch || undefined}
                                onChange={(e) => setEtaOverride(e.target.value)}
                                aria-invalid={Boolean(err('estimated_delivery_date'))}
                                aria-describedby={describe('estimated_delivery_date')}
                            />
                        </ShipField>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">The estimate follows the service you picked; change it if you know better. The buyer sees it.</p>
                </fieldset>

                <fieldset>
                    <Heading>Handover</Heading>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ShipField id={`${uid}-contact_name`} label="Rider or courier name" optional error={err('contact_name')}>
                            <Input id={`${uid}-contact_name`} value={contactName} onChange={(e) => setContactName(e.target.value)} autoComplete="off" maxLength={100} />
                        </ShipField>
                        <ShipField id={`${uid}-contact_phone`} label="Their phone" optional error={err('contact_phone')}>
                            <Input id={`${uid}-contact_phone`} type="tel" inputMode="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} autoComplete="off" aria-invalid={Boolean(err('contact_phone'))} aria-describedby={describe('contact_phone')} />
                        </ShipField>
                    </div>
                </fieldset>

                <fieldset>
                    <Heading>Notes</Heading>
                    <div className="space-y-3">
                        <ShipField id={`${uid}-buyer_note`} label="Message to the buyer" optional error={err('buyer_note')}>
                            <Textarea id={`${uid}-buyer_note`} rows={2} maxLength={300} value={buyerNote} onChange={(e) => setBuyerNote(e.target.value)} placeholder="e.g. The rider will call before arriving" />
                        </ShipField>
                        <ShipField id={`${uid}-internal_note`} label="Private note" optional error={err('internal_note')}>
                            <Textarea id={`${uid}-internal_note`} rows={2} maxLength={500} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} placeholder="Only staff and the seller see this" />
                        </ShipField>
                    </div>
                </fieldset>

                <div>
                    <label className="flex cursor-pointer items-start gap-3 text-sm">
                        <input type="checkbox" checked={packed} onChange={(e) => setPacked(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" aria-invalid={Boolean(err('packed'))} aria-describedby={describe('packed')} />
                        <span>I have checked all {items} are packed and the packing slip is inside.</span>
                    </label>
                    {err('packed') ? (
                        <p id={`${uid}-packed-error`} className="mt-1 text-sm text-destructive">
                            {err('packed')}
                        </p>
                    ) : null}
                </div>

                <DialogFooter className="border-t pt-3">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Back
                    </Button>
                    <Button type="submit" disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                        Confirm shipment
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    );
}

export function ShipDialog({
    open,
    onOpenChange,
    orderLabel,
    context,
    onSubmit,
}: DialogBase & { context: ShipContext; onSubmit: (values: ShipOrderInput) => Promise<ActionResult> }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Mounted only while open, so the form starts clean every time. */}
            {open ? <ShipForm onOpenChange={onOpenChange} orderLabel={orderLabel} context={context} onSubmit={onSubmit} /> : null}
        </Dialog>
    );
}

const cancelSchema = z.object({
    reason: z.string().trim().min(3, 'Give a short reason').max(200, 'Keep the reason under 200 characters'),
});

type CancelValues = z.infer<typeof cancelSchema>;

export function CancelDialog({ open, onOpenChange, orderLabel, isPaid, onSubmit }: DialogBase & { isPaid: boolean; onSubmit: (reason: string) => Promise<ActionResult> }) {
    const form = useForm<CancelValues>({ resolver: zodResolver(cancelSchema), defaultValues: { reason: '' } });
    const [formError, setFormError] = useState<string | null>(null);
    const submitting = form.formState.isSubmitting;

    useEffect(() => {
        if (!open) {
            form.reset();
            setFormError(null);
        }
    }, [open, form]);

    const submit = form.handleSubmit(async (values) => {
        setFormError(null);
        const error = await onSubmit(values.reason);
        if (!error) return;
        const message = error.fieldErrors?.reason;
        if (message) form.setError('reason', { message });
        else setFormError(error.message);
    });

    return (
        <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Cancel order {orderLabel}?</DialogTitle>
                    <DialogDescription>
                        The stock is returned to your listing and the buyer is told the order was cancelled.
                        {isPaid ? ' This order is already paid, so the buyer is refunded in full automatically.' : ''} This cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={submit} className="space-y-3" noValidate>
                        {formError ? <ErrorPanel title="Could not cancel the order" message={formError} /> : null}
                        <FormField
                            control={form.control}
                            name="reason"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reason</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} autoFocus {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-1">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                                Keep order
                            </Button>
                            <Button type="submit" variant="destructive" disabled={submitting}>
                                {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                                Cancel order
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function ConfirmCodDialog({ open, onOpenChange, orderLabel, totalLabel, onConfirm }: DialogBase & { totalLabel: string; onConfirm: () => Promise<ActionResult> }) {
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) setFormError(null);
    }, [open]);

    const confirm = async () => {
        setSubmitting(true);
        setFormError(null);
        const error = await onConfirm();
        setSubmitting(false);
        if (error) setFormError(error.message);
    };

    return (
        <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Confirm cash collected</DialogTitle>
                    <DialogDescription>
                        Confirm that {totalLabel} was collected from the buyer for order {orderLabel}. The order is then marked as delivered and paid.
                    </DialogDescription>
                </DialogHeader>
                {formError ? <ErrorPanel title="Could not confirm delivery" message={formError} /> : null}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Not yet
                    </Button>
                    <Button type="button" onClick={confirm} disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                        Cash collected
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
