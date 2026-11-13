import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Textarea } from '@/components/shadcn/textarea';
import type { OrderApiError } from '@/services/adminOrdersService';
import { ErrorPanel } from '@/components/admin/ErrorPanel';

/** Resolves to the error when the action failed (the dialog stays open), or null on success. */
export type AdminActionResult = OrderApiError | null;

interface DialogBase {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderLabel: string;
}

const cancelSchema = z.object({
    reason: z.string().trim().min(3, 'Give a short reason').max(200, 'Keep the reason under 200 characters'),
});

type CancelValues = z.infer<typeof cancelSchema>;

export function CancelOrderDialog({
    open,
    onOpenChange,
    orderLabel,
    refundAmount,
    onSubmit,
}: DialogBase & {
    /** Set (already formatted) when cancelling will refund the buyer through the payment gateway. */
    refundAmount?: string | null;
    onSubmit: (reason: string) => Promise<AdminActionResult>;
}) {
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
                        The reserved stock goes back on sale.
                        {refundAmount ? ` The buyer is refunded ${refundAmount} through the payment gateway automatically; you can follow it under Payments.` : ''} This cannot be undone.
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

export function ConfirmDeliveryDialog({
    open,
    onOpenChange,
    orderLabel,
    isCod,
    totalLabel,
    onConfirm,
}: DialogBase & { isCod: boolean; totalLabel: string; onConfirm: () => Promise<AdminActionResult> }) {
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
                    <DialogTitle>Confirm delivery</DialogTitle>
                    <DialogDescription>
                        {isCod
                            ? `Confirm that order ${orderLabel} reached the buyer and ${totalLabel} was collected in cash. It is then marked as delivered and paid.`
                            : `Confirm that order ${orderLabel} reached the buyer. It is then marked as delivered.`}
                    </DialogDescription>
                </DialogHeader>
                {formError ? <ErrorPanel title="Could not confirm delivery" message={formError} /> : null}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Not yet
                    </Button>
                    <Button type="button" onClick={confirm} disabled={submitting}>
                        {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                        {isCod ? 'Delivered, cash collected' : 'Mark delivered'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
