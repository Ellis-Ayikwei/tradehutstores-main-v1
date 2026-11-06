import { useMemo, useState, type ReactNode } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { Banknote, Check, ExternalLink, Printer, Truck, XCircle } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Separator } from '@/components/shadcn/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/shadcn/sheet';
import { Skeleton } from '@/components/shadcn/skeleton';
import { cn } from '@/lib/utils';
import {
    cancelSellerOrder,
    confirmSellerCodDelivery,
    fetchSellerOrder,
    shipSellerOrder,
    type OrderApiError,
    type OrderTimelineEntry,
    type SellerOrderDetail,
    type ShipOrderInput,
} from '@/services/sellerOrdersService';
import { formatMoney } from '@/services/sellerStatsService';
import { ErrorPanel } from '../components/ErrorPanel';
import { CancelDialog, ConfirmCodDialog, ShipDialog, type ActionResult } from './OrderActionDialogs';
import { PackingSlip } from './PackingSlip';
import { FulfilmentBadge, OrderThumb, PaymentBadge, PaymentDue, addressLines, amount, buyerName, formatDate, humanize, isCod, orderAddress, shortId } from './orderUi';

export const ORDER_LIST_KEY = 'seller:orders:list';
const detailKey = (id: string) => ['seller:orders:detail', id] as const;

const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false } as const;

const CANCEL_REASON_LABEL: Record<string, string> = {
    payment_timeout: 'Payment timed out',
    payment_overdue: 'Payment overdue',
    buyer: 'Cancelled by the buyer',
    seller: 'Cancelled by you',
    admin: 'Cancelled by TradeHut',
};

interface TimelineStep {
    key: string;
    label: string;
    at: string;
}

/** Real timestamps only: the API `timeline` when provided, otherwise the dated fields on the order. */
function buildTimeline(order: SellerOrderDetail): TimelineStep[] {
    if (order.timeline && order.timeline.length > 0) {
        return order.timeline.map((entry: OrderTimelineEntry, i) => ({ key: `${entry.status}-${i}`, label: humanize(entry.status), at: entry.at }));
    }
    const steps: TimelineStep[] = [];
    const push = (key: string, label: string, at?: string | null) => {
        if (at) steps.push({ key, label, at });
    };
    push('placed', 'Order placed', order.placed_at);
    push('paid', 'Payment received', order.paid_at);
    push('shipped', 'Shipped', order.shipped_at);
    push('delivered', 'Delivered', order.delivered_at);
    push('cancelled', 'Cancelled', order.cancelled_at);
    return steps.sort((a, b) => a.at.localeCompare(b.at));
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
    return (
        <section className={cn('space-y-2', className)}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            {children}
        </section>
    );
}

function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
    return (
        <div className={cn('flex items-center justify-between gap-3 text-sm', muted && 'text-muted-foreground', strong && 'font-semibold text-foreground')}>
            <dt>{label}</dt>
            <dd className="tabular-nums">{value}</dd>
        </div>
    );
}

function DetailSkeleton() {
    return (
        <div className="space-y-4 p-4" aria-busy="true" aria-label="Loading order">
            <Skeleton className="h-6 w-2/3" />
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-11 w-11 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-3/5" />
                        <Skeleton className="h-3 w-2/5" />
                    </div>
                </div>
            ))}
            <Skeleton className="h-24 w-full" />
        </div>
    );
}

interface OrderDetailSheetProps {
    orderId: string | null;
    onClose: () => void;
}

export function OrderDetailSheet({ orderId, onClose }: OrderDetailSheetProps) {
    const { mutate: globalMutate } = useSWRConfig();
    const { data: order, error, isLoading, isValidating, mutate } = useSWR<SellerOrderDetail, OrderApiError>(orderId ? detailKey(orderId) : null, () => fetchSellerOrder(orderId as string), SWR_OPTIONS);

    const [shipOpen, setShipOpen] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [codOpen, setCodOpen] = useState(false);
    const [actionError, setActionError] = useState<OrderApiError | null>(null);

    const timeline = useMemo(() => (order ? buildTimeline(order) : []), [order]);

    const refreshLists = () => {
        void globalMutate((key) => key === ORDER_LIST_KEY || (Array.isArray(key) && key[0] === ORDER_LIST_KEY));
        void globalMutate('seller:stats');
        void globalMutate('seller:recent-orders');
    };

    /**
     * Runs a state-changing call with an optimistic update. On success the detail is refetched and the
     * lists are refreshed; on failure the optimistic data is rolled back and the error is surfaced.
     */
    const runAction = async (call: () => Promise<void>, optimistic: (current: SellerOrderDetail) => SellerOrderDetail, success: string): Promise<ActionResult> => {
        if (!order) return null;
        setActionError(null);
        const next = optimistic(order);
        try {
            await mutate(
                async () => {
                    await call();
                    return next;
                },
                { optimisticData: next, rollbackOnError: true, populateCache: true, revalidate: true }
            );
            toast.success(success);
            refreshLists();
            return null;
        } catch (e) {
            const err = e as OrderApiError;
            if (err.kind !== 'validation') toast.error(err.message);
            if (err.kind === 'conflict' || err.kind === 'not_found' || err.kind === 'forbidden') {
                setActionError(err);
                setShipOpen(false);
                setCancelOpen(false);
                setCodOpen(false);
                void mutate();
                refreshLists();
            }
            return err;
        }
    };

    const ship = async (values: ShipOrderInput): Promise<ActionResult> => {
        if (!orderId) return null;
        const result = await runAction(
            () => shipSellerOrder(orderId, values),
            (d) => {
                const at = new Date().toISOString();
                return {
                    ...d,
                    order_status: 'Shipped',
                    shipped_at: at,
                    shipments: [{ carrier: values.carrier.trim(), tracking_number: values.tracking_number.trim(), tracking_url: values.tracking_url?.trim() || null, shipped_at: at }],
                    timeline: d.timeline && d.timeline.length > 0 ? [...d.timeline, { status: 'Shipped', at }] : d.timeline,
                };
            },
            'Order marked as shipped'
        );
        if (!result) setShipOpen(false);
        return result;
    };

    const cancel = async (reason: string): Promise<ActionResult> => {
        if (!orderId) return null;
        const result = await runAction(
            () => cancelSellerOrder(orderId, reason),
            (d) => {
                const at = new Date().toISOString();
                return { ...d, order_status: 'Cancelled', cancelled_at: at, cancel_reason: 'seller', timeline: d.timeline && d.timeline.length > 0 ? [...d.timeline, { status: 'Cancelled', at }] : d.timeline };
            },
            'Order cancelled'
        );
        if (!result) setCancelOpen(false);
        return result;
    };

    const confirmCod = async (): Promise<ActionResult> => {
        if (!orderId) return null;
        const result = await runAction(
            () => confirmSellerCodDelivery(orderId),
            (d) => {
                const at = new Date().toISOString();
                return { ...d, order_status: 'Delivered', payment_status: 'paid', delivered_at: at, paid_at: at, timeline: d.timeline && d.timeline.length > 0 ? [...d.timeline, { status: 'Delivered', at }] : d.timeline };
            },
            'Delivery confirmed'
        );
        if (!result) setCodOpen(false);
        return result;
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setActionError(null);
            onClose();
        }
    };

    const status = order?.order_status;
    const canShip = status === 'Processing';
    const canCancel = status === 'Processing';
    const canConfirmCod = Boolean(order && status === 'Shipped' && isCod(order));
    const canPrint = status === 'Processing' || status === 'Shipped' || status === 'Delivered';
    const hasActions = canShip || canCancel || canConfirmCod || canPrint;
    const hint =
        order && !canShip && !canConfirmCod
            ? status === 'Pending'
                ? 'Waiting for the buyer to pay. You can ship once the order is paid.'
                : status === 'Shipped'
                  ? 'Waiting for the buyer to confirm delivery.'
                  : null
            : null;

    const label = order ? `#${shortId(order.id)}` : orderId ? `#${shortId(orderId)}` : '';
    const name = order ? buyerName(order) : '';
    const address = order ? orderAddress(order) : null;
    const lines = addressLines(address);
    const phone = address?.phone?.trim();
    const cancelledNote = order?.order_status === 'Cancelled' && order.cancel_reason ? CANCEL_REASON_LABEL[order.cancel_reason] ?? humanize(order.cancel_reason) : null;
    const hasDiscount = order ? amount(order.promo_discount) > 0 : false;

    return (
        <Sheet open={Boolean(orderId)} onOpenChange={handleOpenChange}>
            <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl sm:p-0">
                <SheetHeader className="space-y-1 border-b p-4 pr-12">
                    <SheetTitle>Order {label}</SheetTitle>
                    <SheetDescription>{order ? `Placed ${formatDate(order.placed_at)}` : 'Order details'}</SheetDescription>
                </SheetHeader>

                <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    {actionError ? <ErrorPanel title="That didn't go through" message={actionError.message} /> : null}

                    {isLoading && !order ? (
                        <DetailSkeleton />
                    ) : error && !order ? (
                        <ErrorPanel title="Couldn't load this order" message={error.message} onRetry={() => void mutate()} isRetrying={isValidating} />
                    ) : order ? (
                        <>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <FulfilmentBadge status={order.order_status} />
                                <PaymentBadge order={order} />
                                <PaymentDue order={order} />
                                {cancelledNote ? <span className="text-xs text-muted-foreground">{cancelledNote}</span> : null}
                            </div>

                            <Section title={`Items (${order.items.length})`}>
                                <ul className="divide-y divide-border">
                                    {order.items.map((item, index) => (
                                        <li key={item.id ?? `${item.variant_id ?? item.product_id ?? 'item'}-${index}`} className="flex items-center gap-3 py-2">
                                            <OrderThumb image={item.image} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {item.sku ? `${item.sku} · ` : ''}
                                                    {item.quantity} × {formatMoney(item.unit_price, order.currency)}
                                                </p>
                                            </div>
                                            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatMoney(item.total_price, order.currency)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </Section>

                            <dl className="space-y-1 rounded-lg bg-muted p-3">
                                {order.subtotal != null ? <Row label="Subtotal" value={formatMoney(order.subtotal, order.currency)} /> : null}
                                {hasDiscount ? <Row label="Discount" value={`-${formatMoney(order.promo_discount, order.currency)}`} /> : null}
                                {order.shipping_cost != null ? <Row label="Shipping" value={formatMoney(order.shipping_cost, order.currency)} /> : null}
                                {order.tax_amount != null ? <Row label="Tax" value={formatMoney(order.tax_amount, order.currency)} /> : null}
                                <Row label="Total" value={formatMoney(order.total_amount, order.currency)} strong />
                                {order.commission_amount != null ? <Row label="TradeHut commission" value={`-${formatMoney(order.commission_amount, order.currency)}`} muted /> : null}
                                {order.net_amount != null ? <Row label="Your net" value={formatMoney(order.net_amount, order.currency)} muted /> : null}
                            </dl>

                            <Section title="Ship to">
                                {name || lines.length > 0 || phone ? (
                                    <address className="space-y-0.5 text-sm not-italic text-foreground">
                                        {name ? <p className="font-medium">{name}</p> : null}
                                        {lines.map((line) => (
                                            <p key={line}>{line}</p>
                                        ))}
                                        {phone ? <p className="text-muted-foreground">{phone}</p> : null}
                                    </address>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No shipping address came with this order.</p>
                                )}
                            </Section>

                            {order.shipments && order.shipments.length > 0 ? (
                                <Section title="Shipment">
                                    <ul className="space-y-2">
                                        {order.shipments.map((s, i) => (
                                            <li key={`${s.tracking_number}-${i}`} className="rounded-lg border p-3 text-sm">
                                                <p className="font-medium text-foreground">{s.carrier}</p>
                                                <p className="break-all text-muted-foreground">Tracking {s.tracking_number}</p>
                                                {s.tracking_url ? (
                                                    <a href={s.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-primary hover:underline">
                                                        Track parcel
                                                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                                                    </a>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ul>
                                </Section>
                            ) : null}

                            {timeline.length > 0 ? (
                                <Section title="Timeline">
                                    <ol className="space-y-2">
                                        {timeline.map((step) => (
                                            <li key={step.key} className="flex items-start gap-2.5 text-sm">
                                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-subtle text-success-subtle-foreground">
                                                    <Check className="h-3 w-3" aria-hidden="true" />
                                                </span>
                                                <span className="font-medium text-foreground">{step.label}</span>
                                                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{formatDate(step.at)}</span>
                                            </li>
                                        ))}
                                    </ol>
                                </Section>
                            ) : null}
                        </>
                    ) : null}
                </div>

                {order && (hasActions || hint) ? (
                    <>
                        <Separator />
                        <div className="space-y-2 bg-background p-3">
                            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
                            {hasActions ? (
                                <div className="flex flex-wrap gap-2 [&>button]:flex-1 sm:[&>button]:flex-none">
                                    {canShip ? (
                                        <Button type="button" onClick={() => setShipOpen(true)}>
                                            <Truck aria-hidden="true" />
                                            Ship order
                                        </Button>
                                    ) : null}
                                    {canConfirmCod ? (
                                        <Button type="button" onClick={() => setCodOpen(true)}>
                                            <Banknote aria-hidden="true" />
                                            Cash collected
                                        </Button>
                                    ) : null}
                                    {canPrint ? (
                                        <Button type="button" variant="outline" onClick={() => window.print()}>
                                            <Printer aria-hidden="true" />
                                            Packing slip
                                        </Button>
                                    ) : null}
                                    {canCancel ? (
                                        <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setCancelOpen(true)}>
                                            <XCircle aria-hidden="true" />
                                            Cancel order
                                        </Button>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </>
                ) : null}
            </SheetContent>

            {order ? (
                <>
                    <ShipDialog open={shipOpen} onOpenChange={setShipOpen} orderLabel={label} onSubmit={ship} />
                    <CancelDialog open={cancelOpen} onOpenChange={setCancelOpen} orderLabel={label} isPaid={order.payment_status === 'paid'} onSubmit={cancel} />
                    <ConfirmCodDialog open={codOpen} onOpenChange={setCodOpen} orderLabel={label} totalLabel={formatMoney(order.total_amount, order.currency)} onConfirm={confirmCod} />
                    <PackingSlip order={order} />
                </>
            ) : null}
        </Sheet>
    );
}
