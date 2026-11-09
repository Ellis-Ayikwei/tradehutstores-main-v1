/**
 * Admin: record a payment received outside the gateway (cash handed over, a bank transfer, mobile money paid
 * directly...). POST /payments/ with an Idempotency-Key, so a double click or a retry can never record it twice.
 * The backend decides what is allowed (never more than is still owed; not on cancelled orders; not on an
 * order that is still waiting for an online payment) and its message is shown as-is.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Textarea } from '@/components/shadcn/textarea';
import axiosInstance from '@/services/axiosInstance';

const METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'mobile_money', label: 'Mobile money' },
    { value: 'bank_transfer', label: 'Bank transfer' },
    { value: 'card', label: 'Card' },
    { value: 'other', label: 'Other' },
];
const NEEDS_REFERENCE = new Set(['mobile_money', 'bank_transfer', 'card']);

/** The first human-readable message in a backend error body ({detail, code} or DRF field errors). */
function errorMessage(err: unknown): string {
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
    onRecorded: () => void;
}

export function RecordPaymentDialog({ open, onOpenChange, onRecorded }: Props) {
    const [orderNumber, setOrderNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [reference, setReference] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const busy = useRef(false);
    // One key per opened form: retrying the same submission can never record twice.
    const key = useRef('');

    useEffect(() => {
        if (open) {
            key.current = crypto.randomUUID();
            setOrderNumber('');
            setAmount('');
            setMethod('cash');
            setReference('');
            setNote('');
            setError(null);
        }
    }, [open]);

    const needsReference = NEEDS_REFERENCE.has(method);
    const amountNumber = Number(amount);
    const valid = orderNumber.trim().length >= 6 && Number.isFinite(amountNumber) && amountNumber > 0 && (!needsReference || reference.trim().length > 0);

    const submit = async () => {
        if (busy.current || !valid) return;
        busy.current = true;
        setSubmitting(true);
        setError(null);
        try {
            await axiosInstance.post(
                '/payments/',
                { order_number: orderNumber.trim(), amount: amountNumber.toFixed(2), method, reference: reference.trim(), note: note.trim() },
                { headers: { 'Idempotency-Key': key.current } }
            );
            toast.success('Payment recorded');
            onRecorded();
            onOpenChange(false);
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            busy.current = false;
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Record a payment</DialogTitle>
                    <DialogDescription>For money received outside the payment gateway. The order is marked paid once it is covered in full.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="rp-order">Order number</Label>
                        <Input id="rp-order" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="#9A3F21C4" autoComplete="off" autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="rp-amount">Amount</Label>
                            <Input id="rp-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="rp-method">Method</Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger id="rp-method">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {METHODS.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>
                                            {m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="rp-ref">Reference{needsReference ? '' : ' (optional)'}</Label>
                        <Input id="rp-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={needsReference ? 'Transaction ID or receipt number' : 'Receipt number'} />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="rp-note">Note (optional)</Label>
                        <Textarea id="rp-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} />
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
                    <Button onClick={submit} disabled={!valid || submitting}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Record payment
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
