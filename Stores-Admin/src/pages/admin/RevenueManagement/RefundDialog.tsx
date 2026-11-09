/**
 * Admin: refund all or part of a payment. POST /payments/<id>/refund/ with an Idempotency-Key.
 *
 * Two ways to give the money back:
 *   - through the payment gateway (card / mobile money payments only): the gateway sends it to the customer's
 *     original card or wallet. It stays "Pending" until the gateway confirms, which can take days;
 *   - "I paid it back myself" (cash, bank transfer, or anything outside the gateway): recorded as done at once.
 * The server refuses to refund more than is left on the payment, even with refunds still pending.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import axiosInstance from '@/services/axiosInstance';
import { formatMoney } from './PaymentsLedger';

/** The first human-readable message in a backend error body ({detail, code} or DRF field errors). */
export function apiErrorMessage(err: unknown): string {
    const data = (err as AxiosError<Record<string, unknown>>)?.response?.data;
    if (!data || typeof data !== 'object') return 'Something went wrong. Please try again.';
    if (typeof data.detail === 'string') return data.detail;
    for (const value of Object.values(data)) {
        const first = Array.isArray(value) ? value[0] : value;
        if (typeof first === 'string') return first;
    }
    return 'Something went wrong. Please try again.';
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    paymentId: string;
    provider: string;
    currency: string;
    /** What can still be refunded (pending refunds already count as spent). */
    refundable: string;
    onDone: () => void;
}

export function RefundDialog({ open, onOpenChange, paymentId, provider, currency, refundable, onDone }: Props) {
    const viaGateway = provider === 'paystack';
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [mode, setMode] = useState<'gateway' | 'manual'>('gateway');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const busy = useRef(false);
    // One key per opened form: a retry of the same submission can never refund twice.
    const key = useRef('');

    useEffect(() => {
        if (open) {
            key.current = crypto.randomUUID();
            setAmount(refundable);
            setReason('');
            setMode(viaGateway ? 'gateway' : 'manual');
            setError(null);
        }
    }, [open, refundable, viaGateway]);

    const amountNumber = Number(amount);
    const max = Number(refundable);
    const valid = Number.isFinite(amountNumber) && amountNumber > 0 && amountNumber <= max + 0.0001 && reason.trim().length >= 3;

    const submit = async () => {
        if (busy.current || !valid) return;
        busy.current = true;
        setSubmitting(true);
        setError(null);
        try {
            const res = await axiosInstance.post<{ status: string }>(
                `/payments/${paymentId}/refund/`,
                { amount: amountNumber.toFixed(2), reason: reason.trim(), mode },
                { headers: { 'Idempotency-Key': key.current } }
            );
            toast.success(res.data.status === 'succeeded' ? 'Refund recorded' : 'Refund requested. It stays pending until the gateway confirms it.');
            onDone();
            onOpenChange(false);
        } catch (err) {
            // A gateway that did not answer leaves the refund pending (and the amount reserved): refresh to show it.
            if ((err as AxiosError<{ code?: string }>)?.response?.data?.code === 'gateway_unconfirmed') onDone();
            setError(apiErrorMessage(err));
        } finally {
            busy.current = false;
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Refund this payment</DialogTitle>
                    <DialogDescription>Up to {formatMoney(refundable, currency)} can still be refunded on this payment.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="rf-amount">Amount to refund</Label>
                        <Input id="rf-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
                        {Number.isFinite(amountNumber) && amountNumber > max + 0.0001 ? <p className="text-sm text-destructive">That is more than can be refunded.</p> : null}
                    </div>

                    <fieldset className="space-y-2">
                        <legend className="mb-1 text-sm font-medium">How is the money going back?</legend>
                        <label className={`flex items-start gap-3 rounded-md border p-3 text-sm ${viaGateway ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                            <input type="radio" name="rf-mode" className="mt-1" checked={mode === 'gateway'} disabled={!viaGateway} onChange={() => setMode('gateway')} />
                            <span>
                                <span className="block font-medium">Through the payment gateway</span>
                                <span className="block text-muted-foreground">
                                    {viaGateway ? 'Sent back to the customer’s card or mobile money wallet. It can take a few days to arrive.' : 'Only available for card and mobile money payments.'}
                                </span>
                            </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm">
                            <input type="radio" name="rf-mode" className="mt-1" checked={mode === 'manual'} onChange={() => setMode('manual')} />
                            <span>
                                <span className="block font-medium">I paid it back myself</span>
                                <span className="block text-muted-foreground">Cash, bank transfer or mobile money sent directly. This only records it; no money moves from here.</span>
                            </span>
                        </label>
                    </fieldset>

                    <div className="space-y-1.5">
                        <Label htmlFor="rf-reason">Reason</Label>
                        <Textarea id="rf-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Item out of stock, customer cancelled" />
                    </div>

                    {error ? (
                        <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
                            {error}
                        </p>
                    ) : null}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={submit} disabled={!valid || submitting}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Refund {Number.isFinite(amountNumber) && amountNumber > 0 ? formatMoney(amountNumber.toFixed(2), currency) : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
