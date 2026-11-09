/**
 * Admin: one payment in full (/admin/revenue/payments/:id).
 * Who paid and for what (the whole order with its items and address), how the money came in (gateway reference,
 * channel, checkout), every refund on it, other payments on the same order, and a timeline. Staff can refund from here.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import { toast } from 'sonner';
import type { AxiosError } from 'axios';
import { ArrowLeft, ExternalLink, Loader2, ReceiptText, RefreshCw, Undo2 } from 'lucide-react';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { Separator } from '@/components/shadcn/separator';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Textarea } from '@/components/shadcn/textarea';
import axiosInstance from '@/services/axiosInstance';
import type { AdminOrderDetail } from '@/services/adminOrdersService';
import { setPageTitle } from '@/store/themeConfigSlice';
import { STATUS_VARIANT, formatMoney, humanize } from './PaymentsLedger';
import { RefundDialog, apiErrorMessage } from './RefundDialog';

interface RefundRow {
    id: string;
    reference: string | null;
    amount: string;
    currency: string;
    status: string;
    provider: string;
    recorded_by: string | null;
    note: string | null;
    failure_note: string | null;
    created_at: string | null;
    processed_at: string | null;
}

interface PaymentFull {
    id: string;
    reference: string | null;
    transaction_id: string | null;
    order_id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    amount: string;
    currency: string;
    status: string;
    provider: string;
    method: string | null;
    paid_at: string | null;
    created_at: string | null;
    recorded_by: string | null;
    note: string | null;
    refunded_amount: string;
    refundable_amount: string;
    gateway: { transaction_id: string | null; channel: string | null; gateway_response: string | null; paid_at: string | null } | null;
    checkout: { id: string; status: string; reference: string | null; amount: string; expires_at: string | null; paid_at: string | null } | null;
    order: AdminOrderDetail;
    amount_paid_on_order: string;
    amount_outstanding_on_order: string;
    other_payments: { id: string; status: string; provider: string; method: string | null; amount: string; currency: string; reference: string | null; created_at: string | null }[];
    refunds: RefundRow[];
    timeline: { at: string; label: string; kind: 'info' | 'success' | 'error' }[];
}

const when = (value?: string | null) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '-');
const PROVIDER_LABEL: Record<string, string> = { paystack: 'Card or mobile money', cod: 'Cash on delivery', manual: 'Recorded by an admin' };

const fetchPayment = async (id: string) => (await axiosInstance.get<PaymentFull>(`/payments/${encodeURIComponent(id)}/`)).data;

function Panel({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
                {action}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 text-sm">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-right text-foreground">{children}</dd>
        </div>
    );
}

export default function PaymentDetail() {
    const { id = '' } = useParams<{ id: string }>();
    const dispatch = useDispatch();
    const { data, error, isLoading, isValidating, mutate } = useSWR<PaymentFull, AxiosError>(['admin:payment', id], () => fetchPayment(id), { revalidateOnFocus: false });
    const [refundOpen, setRefundOpen] = useState(false);
    const [failing, setFailing] = useState<RefundRow | null>(null);

    useEffect(() => {
        dispatch(setPageTitle(data ? `Payment ${data.reference ?? data.order_number}` : 'Payment'));
    }, [dispatch, data]);

    const back = (
        <Button asChild variant="outline" size="sm">
            <Link to="/admin/revenue/transactions">
                <ArrowLeft aria-hidden="true" />
                Payments
            </Link>
        </Button>
    );

    if (error && !data) {
        const missing = error.response?.status === 404;
        return (
            <div className="space-y-3">
                <PageHeader title="Payment" className="pb-0" actions={back} />
                <Card>
                    <EmptyState
                        icon={ReceiptText}
                        title={missing ? 'Payment not found' : "We couldn't load this payment"}
                        description={missing ? 'It may have been removed, or the link is wrong.' : 'Please try again.'}
                        action={
                            missing ? undefined : (
                                <Button type="button" variant="outline" size="sm" onClick={() => void mutate()}>
                                    <RefreshCw aria-hidden="true" />
                                    Try again
                                </Button>
                            )
                        }
                    />
                </Card>
            </div>
        );
    }

    if (isLoading || !data) {
        return (
            <div className="space-y-3">
                <PageHeader title="Payment" className="pb-0" actions={back} />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    const p = data;
    const o = p.order;
    const money = (value: string | null | undefined) => (value === null || value === undefined ? '-' : formatMoney(value, p.currency));
    const canRefund = Number(p.refundable_amount) > 0 && ['succeeded', 'refunded', 'needs_review'].includes(p.status) && Number(p.refundable_amount) > 0;
    const addr = o.shipping_address;
    const addressText = addr ? [addr.address, addr.address_line2, addr.city, addr.state, addr.postal_code, addr.country].filter(Boolean).join(', ') : '';

    return (
        <div className="space-y-3">
            <PageHeader
                title={`Payment ${p.reference ? p.reference : p.order_number}`}
                description={`${PROVIDER_LABEL[p.provider] ?? humanize(p.provider)} · ${when(p.created_at)}`}
                className="pb-0"
                actions={
                    <>
                        {back}
                        <Button type="button" variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
                            <RefreshCw className={isValidating ? 'animate-spin' : undefined} aria-hidden="true" />
                            Refresh
                        </Button>
                        {canRefund ? (
                            <Button type="button" variant="destructive" size="sm" onClick={() => setRefundOpen(true)}>
                                <Undo2 aria-hidden="true" />
                                Refund
                            </Button>
                        ) : null}
                    </>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANT[p.status] ?? 'outline'}>{humanize(p.status)}</Badge>
                <span className="text-2xl font-bold tabular-nums text-foreground">{money(p.amount)}</span>
                {Number(p.refunded_amount) > 0 ? <Badge variant="secondary">{money(p.refunded_amount)} refunded</Badge> : null}
            </div>
            {p.status === 'needs_review' ? (
                <p className="rounded-md border border-amber-600 bg-amber-100 px-3 py-2 text-sm text-amber-950 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100" role="status">
                    <span className="font-semibold">This payment needs your attention. </span>
                    {p.note ?? 'The gateway took this money but it could not be matched to the order safely.'} Refund it, or cancel the order from the order page.
                </p>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-2">
                    <Panel title="Payment">
                        <dl className="space-y-2">
                            <Row label="Amount">{money(p.amount)}</Row>
                            <Row label="Status">
                                <Badge variant={STATUS_VARIANT[p.status] ?? 'outline'}>{humanize(p.status)}</Badge>
                            </Row>
                            <Row label="Paid through">{PROVIDER_LABEL[p.provider] ?? humanize(p.provider)}</Row>
                            <Row label="Method">{p.method ? humanize(p.method) : '-'}</Row>
                            {p.reference ? <Row label="Reference"><span className="font-mono text-xs">{p.reference}</span></Row> : null}
                            {p.transaction_id ? <Row label="Gateway transaction"><span className="font-mono text-xs">{p.transaction_id}</span></Row> : null}
                            <Row label="Received">{when(p.paid_at)}</Row>
                            {p.recorded_by ? <Row label="Recorded by">{p.recorded_by}</Row> : null}
                            {p.note ? <Row label="Note">{p.note}</Row> : null}
                            <Separator />
                            <Row label="Refunded so far">{money(p.refunded_amount)}</Row>
                            <Row label="Can still refund">{money(p.refundable_amount)}</Row>
                        </dl>
                    </Panel>

                    <Panel
                        title={`Order ${p.order_number}`}
                        action={
                            <Button asChild variant="outline" size="sm">
                                <Link to={`/admin/orders/${p.order_id}`}>
                                    Open order
                                    <ExternalLink aria-hidden="true" />
                                </Link>
                            </Button>
                        }
                    >
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{humanize(o.order_status)}</Badge>
                            <Badge variant={o.payment_status === 'paid' ? 'success' : 'secondary'}>{humanize(o.payment_status)}</Badge>
                            <span className="text-sm text-muted-foreground">{o.pay_mode}</span>
                        </div>
                        <ul className="divide-y">
                            {o.items.map((item) => (
                                <li key={item.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                                    <div className="min-w-0">
                                        <p className="text-foreground">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.sku ? `${item.sku} · ` : ''}
                                            {item.quantity} × {money(item.unit_price)}
                                            {item.seller ? ` · sold by ${item.seller}` : ''}
                                        </p>
                                    </div>
                                    <span className="shrink-0 tabular-nums text-foreground">{money(item.total_price)}</span>
                                </li>
                            ))}
                        </ul>
                        <Separator className="my-3" />
                        <dl className="space-y-2">
                            <Row label="Subtotal">{money(o.subtotal)}</Row>
                            {o.promo_discount && Number(o.promo_discount) > 0 ? <Row label={`Discount${o.promo_code ? ` (${o.promo_code})` : ''}`}>-{money(o.promo_discount)}</Row> : null}
                            <Row label="Delivery">{money(o.shipping_cost)}</Row>
                            <Row label="Tax">{money(o.tax_amount)}</Row>
                            <Row label="Order total"><span className="font-semibold">{money(o.total_amount)}</span></Row>
                            <Row label="Paid on this order">{money(p.amount_paid_on_order)}</Row>
                            <Row label="Still owed">{money(p.amount_outstanding_on_order)}</Row>
                        </dl>
                    </Panel>

                    <Panel title={`Refunds (${p.refunds.length})`}>
                        {p.refunds.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No refunds on this payment.</p>
                        ) : (
                            <ul className="space-y-3">
                                {p.refunds.map((r) => (
                                    <li key={r.id} className="rounded-md border p-3 text-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-medium text-foreground">{r.note ?? 'Refund'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {r.provider === 'paystack' ? 'Through the payment gateway' : 'Paid back directly'}
                                                    {r.recorded_by ? ` · by ${r.recorded_by}` : ' · by the system'}
                                                    {' · '}
                                                    {when(r.created_at)}
                                                </p>
                                                {r.processed_at ? <p className="text-xs text-muted-foreground">Settled {when(r.processed_at)}</p> : null}
                                                {r.failure_note ? <p className="mt-1 text-xs text-destructive">{r.failure_note}</p> : null}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="tabular-nums text-foreground">{money(r.amount)}</p>
                                                <Badge variant={r.status === 'succeeded' ? 'success' : r.status === 'pending' ? 'warning' : 'destructive'}>{humanize(r.status)}</Badge>
                                            </div>
                                        </div>
                                        {r.status === 'pending' && r.provider === 'paystack' ? (
                                            <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
                                                <p className="text-xs text-muted-foreground">Waiting for the gateway to confirm. Stuck? Check the gateway dashboard first.</p>
                                                <Button type="button" variant="outline" size="sm" onClick={() => setFailing(r)}>
                                                    Mark as failed
                                                </Button>
                                            </div>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <Panel title="Timeline">
                        <ol className="space-y-2">
                            {p.timeline.map((e, i) => (
                                <li key={`${e.at}-${i}`} className="flex items-start gap-3 text-sm">
                                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.kind === 'success' ? 'bg-emerald-600' : e.kind === 'error' ? 'bg-red-600' : 'bg-muted-foreground'}`} aria-hidden="true" />
                                    <span className="text-foreground">{e.label}</span>
                                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{when(e.at)}</span>
                                </li>
                            ))}
                        </ol>
                    </Panel>
                </div>

                <div className="space-y-3">
                    <Panel title="Customer">
                        <dl className="space-y-2">
                            <Row label="Name">{p.customer_name || '-'}</Row>
                            <Row label="Email">
                                {p.customer_email ? (
                                    <a href={`mailto:${p.customer_email}`} className="text-primary hover:underline">
                                        {p.customer_email}
                                    </a>
                                ) : (
                                    '-'
                                )}
                            </Row>
                            {addr?.phone ? <Row label="Phone">{addr.phone}</Row> : null}
                            {addressText ? <Row label="Deliver to">{addressText}</Row> : null}
                        </dl>
                    </Panel>

                    {p.gateway || p.checkout ? (
                        <Panel title="Gateway">
                            <dl className="space-y-2">
                                {p.gateway?.channel ? <Row label="Channel">{humanize(p.gateway.channel)}</Row> : null}
                                {p.gateway?.gateway_response ? <Row label="Gateway said">{p.gateway.gateway_response}</Row> : null}
                                {p.gateway?.transaction_id ? <Row label="Transaction"><span className="font-mono text-xs">{p.gateway.transaction_id}</span></Row> : null}
                                {p.checkout ? (
                                    <>
                                        <Row label="Checkout">
                                            <Badge variant={STATUS_VARIANT[p.checkout.status] ?? 'outline'}>{humanize(p.checkout.status)}</Badge>
                                        </Row>
                                        {p.checkout.expires_at ? <Row label="Pay-by">{when(p.checkout.expires_at)}</Row> : null}
                                    </>
                                ) : null}
                            </dl>
                        </Panel>
                    ) : null}

                    {p.other_payments.length > 0 ? (
                        <Panel title="Other payments on this order">
                            <ul className="space-y-2">
                                {p.other_payments.map((s) => (
                                    <li key={s.id} className="flex items-start justify-between gap-3 text-sm">
                                        <div className="min-w-0">
                                            <Link to={`/admin/revenue/payments/${s.id}`} className="font-medium text-primary hover:underline">
                                                {PROVIDER_LABEL[s.provider] ?? humanize(s.provider)}
                                            </Link>
                                            <p className="text-xs text-muted-foreground">{when(s.created_at)}</p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="tabular-nums text-foreground">{formatMoney(s.amount, s.currency)}</p>
                                            <Badge variant={STATUS_VARIANT[s.status] ?? 'outline'}>{humanize(s.status)}</Badge>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    ) : null}
                </div>
            </div>

            <RefundDialog
                open={refundOpen}
                onOpenChange={setRefundOpen}
                paymentId={p.id}
                provider={p.provider}
                currency={p.currency}
                refundable={p.refundable_amount}
                onDone={() => void mutate()}
            />
            <MarkFailedDialog refund={failing} onClose={() => setFailing(null)} onDone={() => void mutate()} />
        </div>
    );
}

/** For a gateway refund stuck "pending" after you confirmed on the gateway dashboard that it does not exist. */
function MarkFailedDialog({ refund, onClose, onDone }: { refund: RefundRow | null; onClose: () => void; onDone: () => void }) {
    const [note, setNote] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (refund) {
            setNote('');
            setError(null);
        }
    }, [refund]);

    const submit = async () => {
        if (!refund) return;
        setSubmitting(true);
        setError(null);
        try {
            await axiosInstance.post(`/payments/refunds/${refund.id}/mark-failed/`, { note: note.trim() });
            toast.success('Refund marked as failed. The amount can be refunded again.');
            onDone();
            onClose();
        } catch (err) {
            setError(apiErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={Boolean(refund)} onOpenChange={(next) => (!next && !submitting ? onClose() : undefined)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Mark this refund as failed?</DialogTitle>
                    <DialogDescription>
                        Only do this after checking the payment gateway dashboard and confirming the refund was not made. If it later goes through anyway, the system records it.
                    </DialogDescription>
                </DialogHeader>
                <Textarea rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you check? (optional)" />
                {error ? (
                    <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
                        {error}
                    </p>
                ) : null}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>
                        Keep it pending
                    </Button>
                    <Button variant="destructive" onClick={submit} disabled={submitting}>
                        {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Mark as failed
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
