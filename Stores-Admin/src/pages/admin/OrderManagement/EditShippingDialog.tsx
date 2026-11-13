import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import type { OrderShipment, ShippingPatch } from '@/services/adminOrdersService';
import { ErrorPanel } from '@/components/admin/ErrorPanel';
import type { AdminActionResult } from './AdminOrderDialogs';

const decimal = (max: number) => z.string().trim().refine((v) => v === '' || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= max), `Enter a number up to ${max}`);
const date = z.string().trim().refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Pick a date');

const schema = z
    .object({
        carrier: z.string().trim().min(1, 'Enter the carrier').max(100),
        service_level: z.string().trim().max(50),
        courier_reference: z.string().trim().max(100),
        tracking_url: z.string().trim().max(500).refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Enter a full link starting with http:// or https://'),
        parcels: z.string().trim().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 50), 'Enter 1 to 50'),
        weight_kg: decimal(100000),
        length_cm: decimal(100000),
        width_cm: decimal(100000),
        height_cm: decimal(100000),
        dispatch_date: date,
        estimated_delivery_date: date,
        contact_name: z.string().trim().max(100),
        contact_phone: z.string().trim().max(32),
        buyer_note: z.string().trim().max(300),
        internal_note: z.string().trim().max(500),
    })
    .superRefine((v, ctx) => {
        const dims = [v.length_cm, v.width_cm, v.height_cm];
        if (dims.some(Boolean) && !dims.every(Boolean)) ctx.addIssue({ code: 'custom', path: ['length_cm'], message: 'Give length, width and height together' });
        if (v.dispatch_date && v.estimated_delivery_date && v.estimated_delivery_date < v.dispatch_date) ctx.addIssue({ code: 'custom', path: ['estimated_delivery_date'], message: "Can't be before the dispatch date" });
    });

type Values = z.infer<typeof schema>;

const fromShipment = (s: OrderShipment | null, estimate: string | null): Values => ({
    carrier: s?.carrier ?? '',
    service_level: s?.service_level ?? '',
    courier_reference: s?.courier_reference ?? '',
    tracking_url: s?.tracking_url ?? '',
    parcels: s?.parcels ? String(s.parcels) : '',
    weight_kg: s?.weight_kg ?? '',
    length_cm: s?.length_cm ?? '',
    width_cm: s?.width_cm ?? '',
    height_cm: s?.height_cm ?? '',
    dispatch_date: s?.dispatch_date ?? '',
    estimated_delivery_date: s?.estimated_delivery_date ?? estimate ?? '',
    contact_name: s?.contact_name ?? '',
    contact_phone: s?.contact_phone ?? '',
    buyer_note: s?.buyer_note ?? '',
    internal_note: s?.internal_note ?? '',
});

const orNull = (v: string) => (v === '' ? null : v);

function toPatch(v: Values): ShippingPatch {
    return {
        carrier: v.carrier,
        service_level: v.service_level,
        courier_reference: v.courier_reference,
        tracking_url: v.tracking_url,
        parcels: v.parcels ? Number(v.parcels) : undefined,
        weight_kg: orNull(v.weight_kg),
        length_cm: orNull(v.length_cm),
        width_cm: orNull(v.width_cm),
        height_cm: orNull(v.height_cm),
        dispatch_date: orNull(v.dispatch_date),
        estimated_delivery_date: orNull(v.estimated_delivery_date),
        contact_name: v.contact_name,
        contact_phone: v.contact_phone,
        buyer_note: v.buyer_note,
        internal_note: v.internal_note,
    };
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderLabel: string;
    /** The order's shipment, or null before it has shipped (only the estimate can be set then). */
    shipment: OrderShipment | null;
    estimatedDelivery: string | null;
    onSubmit: (patch: ShippingPatch) => Promise<AdminActionResult>;
}

export function EditShippingDialog({ open, onOpenChange, orderLabel, shipment, estimatedDelivery, onSubmit }: Props) {
    const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: fromShipment(shipment, estimatedDelivery) });
    const [formError, setFormError] = useState<string | null>(null);
    const submitting = form.formState.isSubmitting;
    const shipped = shipment !== null;

    // Start from the latest saved values each time the dialog opens.
    useEffect(() => {
        if (open) {
            form.reset(fromShipment(shipment, estimatedDelivery));
            setFormError(null);
        }
    }, [open, shipment, estimatedDelivery, form]);

    const submit = form.handleSubmit(async (values) => {
        setFormError(null);
        const patch = shipped ? toPatch(values) : { estimated_delivery_date: orNull(values.estimated_delivery_date) };
        const error = await onSubmit(patch);
        if (!error) return;
        let placed = false;
        for (const key of Object.keys(values) as (keyof Values)[]) {
            const message = error.fieldErrors?.[key];
            if (message) {
                form.setError(key, { message });
                placed = true;
            }
        }
        if (!placed) setFormError(error.message);
    });

    const text = (name: keyof Values, label: string, props: { optional?: boolean; type?: string; inputMode?: 'decimal' | 'numeric'; className?: string } = {}) => (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem className={props.className}>
                    <FormLabel>
                        {label} {props.optional ? <span className="font-normal text-muted-foreground">(optional)</span> : null}
                    </FormLabel>
                    <FormControl>
                        <Input type={props.type} inputMode={props.inputMode} autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
        />
    );

    return (
        <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Edit shipping for {orderLabel}</DialogTitle>
                    <DialogDescription>
                        {shipped
                            ? `Correct or add details at any time. The tracking number ${shipment?.tracking_number} is issued by the platform and can't be changed.`
                            : "This order hasn't shipped yet, so only the estimated delivery date can be set. Carrier and parcel details are entered when you ship it."}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={submit} className="space-y-3" noValidate>
                        {formError ? <ErrorPanel title="Could not save the changes" message={formError} /> : null}
                        {shipped ? (
                            <>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {text('carrier', 'Carrier')}
                                    {text('service_level', 'Service', { optional: true })}
                                    {text('courier_reference', "Carrier's own reference", { optional: true })}
                                    {text('tracking_url', 'Tracking link', { optional: true, type: 'url' })}
                                </div>
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {text('parcels', 'Parcels', { inputMode: 'numeric', optional: true })}
                                    {text('weight_kg', 'Weight (kg)', { inputMode: 'decimal', optional: true })}
                                    {text('length_cm', 'Length (cm)', { inputMode: 'decimal', optional: true })}
                                    {text('width_cm', 'Width (cm)', { inputMode: 'decimal', optional: true })}
                                    {text('height_cm', 'Height (cm)', { inputMode: 'decimal', optional: true })}
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {text('dispatch_date', 'Dispatch date', { type: 'date', optional: true })}
                                    {text('estimated_delivery_date', 'Expected delivery', { type: 'date', optional: true })}
                                    {text('contact_name', 'Rider / contact name', { optional: true })}
                                    {text('contact_phone', 'Rider / contact phone', { optional: true })}
                                </div>
                                <FormField
                                    control={form.control}
                                    name="buyer_note"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Note for the buyer <span className="font-normal text-muted-foreground">(optional, shown to them)</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea rows={2} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="internal_note"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>
                                                Private note <span className="font-normal text-muted-foreground">(optional, staff and seller only)</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea rows={2} {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        ) : (
                            text('estimated_delivery_date', 'Expected delivery', { type: 'date', optional: true })
                        )}
                        <DialogFooter className="pt-1">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                                Back
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                                Save changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
