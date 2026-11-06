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
import type { OrderApiError, ShipOrderInput } from '@/services/sellerOrdersService';
import { ErrorPanel } from '../components/ErrorPanel';

/** Resolves to the error when the action failed (so the dialog stays open), or null on success. */
export type ActionResult = OrderApiError | null;

interface DialogBase {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderLabel: string;
}

const optionalUrl = z
    .string()
    .trim()
    .max(500, 'Tracking link is too long')
    .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Enter a full link starting with http:// or https://');

const shipSchema = z.object({
    carrier: z.string().trim().min(1, 'Enter the carrier').max(100, 'Carrier name is too long'),
    tracking_number: z.string().trim().min(1, 'Enter the tracking number').max(100, 'Tracking number is too long'),
    tracking_url: optionalUrl,
});

type ShipValues = z.infer<typeof shipSchema>;

export function ShipDialog({ open, onOpenChange, orderLabel, onSubmit }: DialogBase & { onSubmit: (values: ShipOrderInput) => Promise<ActionResult> }) {
    const form = useForm<ShipValues>({ resolver: zodResolver(shipSchema), defaultValues: { carrier: '', tracking_number: '', tracking_url: '' } });
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
        const error = await onSubmit(values);
        if (!error) return;
        let placed = false;
        for (const key of ['carrier', 'tracking_number', 'tracking_url'] as const) {
            const message = error.fieldErrors?.[key];
            if (message) {
                form.setError(key, { message });
                placed = true;
            }
        }
        if (!placed) setFormError(error.message);
    });

    return (
        <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ship order {orderLabel}</DialogTitle>
                    <DialogDescription>Add the carrier and tracking number. The buyer is notified once it is marked as shipped.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={submit} className="space-y-3" noValidate>
                        {formError ? <ErrorPanel title="Could not mark as shipped" message={formError} /> : null}
                        <FormField
                            control={form.control}
                            name="carrier"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Carrier</FormLabel>
                                    <FormControl>
                                        <Input autoComplete="off" autoFocus {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tracking_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tracking number</FormLabel>
                                    <FormControl>
                                        <Input autoComplete="off" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="tracking_url"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Tracking link <span className="font-normal text-muted-foreground">(optional)</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input type="url" inputMode="url" autoComplete="off" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-1">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                                Back
                            </Button>
                            <Button type="submit" disabled={submitting}>
                                {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                                Mark as shipped
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
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
                        {isPaid ? ' This order is already paid, so the buyer will be refunded by our team.' : ''} This cannot be undone.
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
