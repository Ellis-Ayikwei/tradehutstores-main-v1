import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { ArrowLeft, Check, Pencil, ExternalLink, RefreshCw, ReceiptText, Truck, XCircle } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { Separator } from '@/components/shadcn/separator';
import { Skeleton } from '@/components/shadcn/skeleton';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
    cancelAdminOrder,
    confirmAdminDelivery,
    fetchAdminOrder,
    shipAdminOrder,
    updateAdminShipping,
    type ShippingPatch,
    type AdminOrderDetail,
    type AdminOrderError,
    type OrderApiError,
    type ShipOrderInput,
} from '@/services/adminOrdersService';
import { setPageTitle } from '@/store/themeConfigSlice';
import { OrderThumb, addressLines, amount, formatDate, humanize } from '@/pages/seller/orders/orderUi';
import { ShipDialog } from '@/pages/seller/orders/OrderActionDialogs';
import { Badge } from '@/components/shadcn/badge';
import { CancelOrderDialog, ConfirmDeliveryDialog, type AdminActionResult } from './AdminOrderDialogs';
import { EditShippingDialog } from './EditShippingDialog';
import { PaymentStatusBadge, StatusBadge, payModeLabel } from './adminOrderUi';

const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false } as const;

interface TimelineStep {
    key: string;
    label: string;
    at: string;
}

/** Real timestamps only: the API `timeline` when provided, otherwise the dated fields on the order. */
function buildTimeline(order: AdminOrderDetail): TimelineStep[] {
    if (order.timeline.length > 0) {
        return order.timeline.map((e, i) => ({ key: `${e.status}-${i}`, label: humanize(e.status), at: e.at }));
    }
    const steps: TimelineStep[] = [];
    const push = (key: string, label: string, at: string | null) => {
        if (at) steps.push({ key, label, at });
    };
    push('placed', 'Order placed', order.placed_at);
    push('paid', 'Payment received', order.paid_at);
    push('shipped', 'Shipped', order.shipped_at);
    push('delivered', 'Delivered', order.delivered_at);
    return steps.sort((a, b) => a.at.localeCompare(b.at));
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 text-sm">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-right text-foreground">{children}</dd>
        </div>
    );
}

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
    return (
        <Card className={className}>
            <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 sm:p-5 sm:pt-2">{children}</CardContent>
        </Card>
    );
}

function DetailSkeleton() {
    return (
        <div className="grid gap-3 lg:grid-cols-3" aria-busy="true" aria-label="Loading order">
            <div className="space-y-3 lg:col-span-2">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-40 w-full" />
            </div>
            <div className="space-y-3">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    );
}

export default function OrderDetail() {
    const { id = '' } = useParams<{ id: string }>();
    const dispatch = useDispatch();
    const { formatDisplayPrice } = useCurrency();

    const { data: order, error, isLoading, isValidating, mutate } = useSWR<AdminOrderDetail, AdminOrderError>(id ? ['admin:order', id] : null, () => fetchAdminOrder(id), SWR_OPTIONS);

    useEffect(() => {
        dispatch(setPageTitle(order ? `Order ${order.order_number}` : 'Order'));
    }, [dispatch, order]);

    const { mutate: globalMutate } = useSWRConfig();
    const [shipOpen, setShipOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [editShippingOpen, setEditShippingOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);

    /** Runs one action, shows the server's refreshed order, and refreshes the list. Resolves to the error (dialog stays open) or null. */
    const run = async (call: () => Promise<AdminOrderDetail>, success: string): Promise<AdminActionResult> => {
        try {
            const next = await call();
            await mutate(next, { revalidate: false });
            void globalMutate(['admin:orders']);
            toast.success(success);
            return null;
        } catch (e) {
            const err = e as OrderApiError;
            // The order changed under us (or vanished): show what it is now.
            if (err.kind === 'conflict' || err.kind === 'not_found') void mutate();
            return err;
        }
    };

    const onShip = async (values: ShipOrderInput) => {
        const error = await run(() => shipAdminOrder(id, values), 'Order marked as shipped');
        if (!error) setShipOpen(false);
        return error;
    };
    const onEditShipping = async (patch: ShippingPatch) => {
        const error = await run(() => updateAdminShipping(id, patch), 'Shipping details saved');
        if (!error) setEditShippingOpen(false);
        return error;
    };
    const onConfirmDelivery = async () => {
        const error = await run(() => confirmAdminDelivery(id), 'Delivery confirmed');
        if (!error) setConfirmOpen(false);
        return error;
    };
    const onCancel = async (reason: string) => {
        const error = await run(() => cancelAdminOrder(id, reason), 'Order cancelled');
        if (!error) setCancelOpen(false);
        return error;
    };

    const money = (value: string | null | undefined) => (value === null || value === undefined ? '-' : formatDisplayPrice(amount(value)));
    const backLink = (
        <Button asChild variant="outline" size="sm">
            <Link to="/admin/orders/list">
                <ArrowLeft aria-hidden="true" />
                Orders
            </Link>
        </Button>
    );

    if (error && !order) {
        return (
            <div className="space-y-3">
                <PageHeader title="Order" className="pb-0" actions={backLink} />
                <Card>
                    <EmptyState
                        icon={ReceiptText}
                        title={error.kind === 'not_found' ? 'Order not found' : "We couldn't load this order"}
                        description={error.message}
                        action={
                            error.kind === 'not_found' || error.kind === 'forbidden' ? undefined : (
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

    if (isLoading || !order) {
        return (
            <div className="space-y-3">
                <PageHeader title="Order" className="pb-0" actions={backLink} />
                <DetailSkeleton />
            </div>
        );
    }

    const address = order.shipping_address;
    const lines = addressLines(address);
    const timeline = buildTimeline(order);
    const hasBreakdown = order.shipping_cost !== null || order.tax_amount !== null || order.promo_discount !== null;
    const isCod = String(order.pay_mode).toUpperCase() === 'COD';
    // Why cancel is not offered even though the order has not shipped (money paid by cash / bank that must be paid
    // back by hand first, the buyer still paying online...). The server decides; this page only shows its reason.
    const cancelBlocker = order.actions.cancel_blocker;
    const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
    const shipContext = {
        recipient: address?.full_name || order.customer.name,
        addressLines: lines,
        phone: address?.phone ?? null,
        itemCount,
        cashDue: isCod ? money(order.total_amount) : null,
    };

    return (
        <div className="space-y-3">
            <PageHeader
                title={`Order ${order.order_number}`}
                description={order.placed_at ? `Placed ${formatDate(order.placed_at)}` : undefined}
                className="pb-0"
                actions={
                    <>
                        {backLink}
                        <Button type="button" variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
                            <RefreshCw className={cn(isValidating && 'animate-spin')} aria-hidden="true" />
                            Refresh
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditShippingOpen(true)}>
                            <Pencil aria-hidden="true" />
                            Edit shipping
                        </Button>
                        {order.actions.ship ? (
                            <Button type="button" size="sm" onClick={() => setShipOpen(true)}>
                                <Truck aria-hidden="true" />
                                Ship order
                            </Button>
                        ) : null}
                        {order.actions.confirm_delivery ? (
                            <Button type="button" size="sm" onClick={() => setConfirmOpen(true)}>
                                <Check aria-hidden="true" />
                                Confirm delivery
                            </Button>
                        ) : null}
                        {order.actions.cancel ? (
                            <Button type="button" variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>
                                <XCircle aria-hidden="true" />
                                Cancel order
                            </Button>
                        ) : null}
                    </>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order.order_status} />
                <PaymentStatusBadge status={order.payment_status} payMode={order.pay_mode} />
            </div>
            {cancelBlocker ? (
                <p className="rounded-md border border-amber-600 bg-amber-100 px-3 py-2 text-sm text-amber-950 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100" role="status">
                    <span className="font-semibold">Can't be cancelled right now. </span>
                    {cancelBlocker.message}
                </p>
            ) : null}

            <div className="grid gap-3 lg:grid-cols-3">
                <div className="space-y-3 lg:col-span-2">
                    <Panel title={`Items (${order.items.reduce((n, i) => n + i.quantity, 0)})`}>
                        {order.items.length === 0 ? (
                            <p className="text-sm text-muted-foreground">This order has no items.</p>
                        ) : (
                            <ul className="divide-y divide-border">
                                {order.items.map((item) => (
                                    <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                                        <OrderThumb image={item.image} className="h-14 w-14" />
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <p className="text-sm font-medium text-foreground">{item.title || 'Item'}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {[item.sku ? `SKU ${item.sku}` : null, item.seller ? `Sold by ${item.seller}` : null].filter(Boolean).join(' · ') || ' '}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {item.quantity} × {money(item.unit_price)}
                                            </p>
                                        </div>
                                        <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{money(item.total_price)}</p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <Panel title="Timeline">
                        {timeline.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No dated events yet.</p>
                        ) : (
                            <ol className="space-y-3">
                                {timeline.map((step) => (
                                    <li key={step.key} className="flex items-start justify-between gap-3 text-sm">
                                        <span className="font-medium text-foreground">{step.label}</span>
                                        <span className="text-muted-foreground">{formatDate(step.at)}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Panel>
                </div>

                <div className="space-y-3">
                    <Panel title="Summary">
                        <dl className="space-y-2">
                            <InfoRow label="Subtotal">{money(order.subtotal)}</InfoRow>
                            {hasBreakdown ? (
                                <>
                                    {order.shipping_cost !== null ? <InfoRow label="Shipping">{money(order.shipping_cost)}</InfoRow> : null}
                                    {order.tax_amount !== null ? <InfoRow label="Tax">{money(order.tax_amount)}</InfoRow> : null}
                                    {order.promo_discount !== null ? (
                                        <InfoRow label={order.promo_code ? `Promo (${order.promo_code})` : 'Promo'}>-{money(order.promo_discount)}</InfoRow>
                                    ) : null}
                                </>
                            ) : null}
                        </dl>
                        <Separator className="my-3" />
                        <div className="flex items-center justify-between text-base font-semibold text-foreground">
                            <span>Total</span>
                            <span className="tabular-nums">{money(order.total_amount)}</span>
                        </div>
                    </Panel>

                    <Panel title="Payment">
                        <dl className="space-y-2">
                            <InfoRow label="Method">{payModeLabel(order.pay_mode)}</InfoRow>
                            <InfoRow label="Status">
                                <PaymentStatusBadge status={order.payment_status} payMode={order.pay_mode} />
                            </InfoRow>
                            {order.paid_at ? <InfoRow label="Paid">{formatDate(order.paid_at)}</InfoRow> : null}
                            <InfoRow label="Received">{money(order.amount_paid)}</InfoRow>
                            <InfoRow label="Outstanding">{money(order.amount_outstanding)}</InfoRow>
                        </dl>
                        {order.payments.length > 0 ? (
                            <>
                                <Separator className="my-3" />
                                <ul className="space-y-2">
                                    {order.payments.map((p) => (
                                        <li key={p.id} className="flex items-start justify-between gap-3 text-sm">
                                            <div className="min-w-0">
                                                <p className="text-foreground">
                                                    <Link to={`/admin/revenue/payments/${p.id}`} className="font-medium text-primary hover:underline">
                                                        {humanize(p.method ?? p.provider)}
                                                    </Link>
                                                    {p.reference ? <span className="ml-1 text-muted-foreground">· {p.reference}</span> : null}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{p.paid_at ? formatDate(p.paid_at) : 'Not paid yet'}</p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="tabular-nums text-foreground">{money(p.amount)}</p>
                                                <Badge variant={p.status === 'succeeded' ? 'success' : p.status === 'pending' ? 'warning' : 'secondary'}>{humanize(p.status)}</Badge>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : null}
                        {order.refunds.length > 0 ? (
                            <>
                                <Separator className="my-3" />
                                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Refunds</p>
                                <ul className="space-y-2">
                                    {order.refunds.map((r) => (
                                        <li key={r.id} className="flex items-start justify-between gap-3 text-sm">
                                            <div className="min-w-0">
                                                <p className="text-foreground">{r.reason ?? 'Refund'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {r.processed_at ? formatDate(r.processed_at) : formatDate(r.created_at)}
                                                    {r.failure_note ? ` · ${r.failure_note}` : ''}
                                                </p>
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="tabular-nums text-foreground">{money(r.amount)}</p>
                                                <Badge variant={r.status === 'succeeded' ? 'success' : r.status === 'pending' ? 'warning' : 'destructive'}>{humanize(r.status)}</Badge>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        ) : null}
                    </Panel>

                    <Panel title="Customer">
                        <dl className="space-y-2">
                            <InfoRow label="Name">{order.customer.name || '-'}</InfoRow>
                            <InfoRow label="Email">
                                {order.customer.email ? (
                                    <a href={`mailto:${order.customer.email}`} className="text-primary hover:underline">
                                        {order.customer.email}
                                    </a>
                                ) : (
                                    '-'
                                )}
                            </InfoRow>
                            {address?.phone ? <InfoRow label="Phone">{address.phone}</InfoRow> : null}
                        </dl>
                    </Panel>

                    <Panel title="Delivery">
                        {lines.length > 0 ? (
                            <address className="space-y-0.5 text-sm not-italic text-foreground">
                                {address?.full_name ? <p className="font-medium">{address.full_name}</p> : null}
                                {lines.map((line) => (
                                    <p key={line}>{line}</p>
                                ))}
                            </address>
                        ) : (
                            <p className="text-sm text-muted-foreground">No delivery address on this order.</p>
                        )}
                        {order.delivery_method || order.estimated_delivery_date ? (
                            <dl className="mt-3 space-y-2">
                                {order.delivery_method ? <InfoRow label="Method">{humanize(order.delivery_method)}</InfoRow> : null}
                                {order.estimated_delivery_date ? <InfoRow label="Estimated">{formatDate(order.estimated_delivery_date, false)}</InfoRow> : null}
                            </dl>
                        ) : null}
                        {order.shipments.length > 0 ? (
                            <>
                                <Separator className="my-3" />
                                {order.shipments.map((s) => (
                                    <dl key={s.tracking_number} className="space-y-2">
                                        <InfoRow label="Carrier">
                                            {s.carrier || '-'}
                                            {s.service_level ? <span className="text-muted-foreground"> · {s.service_level}</span> : null}
                                        </InfoRow>
                                        <InfoRow label="Tracking">
                                            {s.tracking_url ? (
                                                <a href={s.tracking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-primary hover:underline">
                                                    {s.tracking_number}
                                                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                                </a>
                                            ) : (
                                                <span className="font-mono">{s.tracking_number}</span>
                                            )}
                                        </InfoRow>
                                        {s.courier_reference ? <InfoRow label="Courier ref">{s.courier_reference}</InfoRow> : null}
                                        {s.parcels ? <InfoRow label="Parcels">{String(s.parcels)}</InfoRow> : null}
                                        {s.weight_kg ? <InfoRow label="Weight">{`${s.weight_kg} kg`}</InfoRow> : null}
                                        {s.length_cm && s.width_cm && s.height_cm ? <InfoRow label="Size">{`${s.length_cm} × ${s.width_cm} × ${s.height_cm} cm`}</InfoRow> : null}
                                        {s.dispatch_date ? <InfoRow label="Dispatched">{formatDate(s.dispatch_date, false)}</InfoRow> : null}
                                        {s.estimated_delivery_date ? <InfoRow label="Expected">{formatDate(s.estimated_delivery_date, false)}</InfoRow> : null}
                                        {s.contact_name || s.contact_phone ? <InfoRow label="Rider">{[s.contact_name, s.contact_phone].filter(Boolean).join(' · ')}</InfoRow> : null}
                                        {s.buyer_note ? <InfoRow label="Buyer note">{s.buyer_note}</InfoRow> : null}
                                        {s.internal_note ? <InfoRow label="Private note">{s.internal_note}</InfoRow> : null}
                                    </dl>
                                ))}
                            </>
                        ) : null}
                    </Panel>
                </div>
            </div>

            <EditShippingDialog
                open={editShippingOpen}
                onOpenChange={setEditShippingOpen}
                orderLabel={order.order_number}
                shipment={order.shipments[0] ?? null}
                estimatedDelivery={order.estimated_delivery_date}
                onSubmit={onEditShipping}
            />
            <ShipDialog open={shipOpen} onOpenChange={setShipOpen} orderLabel={order.order_number} context={shipContext} onSubmit={onShip} />
            <ConfirmDeliveryDialog open={confirmOpen} onOpenChange={setConfirmOpen} orderLabel={order.order_number} isCod={isCod} totalLabel={money(order.total_amount)} onConfirm={onConfirmDelivery} />
            <CancelOrderDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                orderLabel={order.order_number}
                refundAmount={order.actions.cancel_refunds_buyer ? money(order.amount_paid) : null}
                onSubmit={onCancel}
            />
        </div>
    );
}
