import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { Banknote, Loader2, PackageSearch, Plus, ReceiptText } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { DataTable } from '@/components/shadcn/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';
import { Textarea } from '@/components/shadcn/textarea';
import {
    fetchSellerOrders,
    fetchSellerPayouts,
    fetchSellerSold,
    recordSellerPayout,
    type AdminSellerError,
    type Paginated,
    type PayoutMethod,
    type SellerFinanceSummary,
    type SellerPayoutRow,
    type SoldItem,
} from '@/services/adminSellersService';
import type { SellerOrderListRow } from '@/services/sellerOrdersService';
import { formatMoney } from '@/services/sellerStatsService';
import { FulfilmentBadge, OrderThumb, PaymentBadge, formatDate, humanize, itemSummary, shortId } from '@/pages/seller/orders/orderUi';
import { ErrorPanel } from '../../seller/components/ErrorPanel';
import { SELLERS_KEY, SWR_OPTIONS } from './sellerSections';

const ordersKey = (id: string, ...rest: unknown[]) => [SELLERS_KEY, 'orders', id, ...rest] as const;
const soldKey = (id: string) => [SELLERS_KEY, 'sold', id] as const;
const payoutsKey = (id: string) => [SELLERS_KEY, 'payouts', id] as const;
export const summaryKey = (id: string) => [SELLERS_KEY, 'summary', id] as const;

const ORDER_STATUS_OPTIONS = [
    { value: 'all', label: 'All statuses' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Processing', label: 'Processing' },
    { value: 'Shipped', label: 'Shipped' },
    { value: 'Delivered', label: 'Delivered' },
    { value: 'Cancelled', label: 'Cancelled' },
    { value: 'Refunded', label: 'Refunded' },
];

const METHOD_LABEL: Record<PayoutMethod, string> = { bank_transfer: 'Bank transfer', mobile_money: 'Mobile money', cash: 'Cash', other: 'Other' };

// ------------------------------------------------------------------------------------- orders

const PAGE_SIZE = 20;

export function SellerOrdersTab({ sellerId }: { sellerId: string }) {
    const [page, setPage] = useState(1);
    const [q, setQ] = useState('');
    const [status, setStatus] = useState('all');
    const { data, error, isLoading, mutate } = useSWR<Paginated<SellerOrderListRow>, AdminSellerError>(
        ordersKey(sellerId, page, q, status),
        () => fetchSellerOrders(sellerId, { page, pageSize: PAGE_SIZE, q, status: status === 'all' ? '' : status }),
        { ...SWR_OPTIONS, keepPreviousData: true }
    );

    const columns: ColumnDef<SellerOrderListRow>[] = [
        {
            id: 'order',
            header: 'Order',
            enableSorting: false,
            meta: { label: 'Order', cardTitle: true },
            cell: ({ row }) => (
                <div className="min-w-[7rem]">
                    <Link to={`/admin/orders/${row.original.id}`} className="font-semibold text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
                        #{shortId(row.original.id)}
                    </Link>
                    <p className="text-xs text-muted-foreground">{formatDate(row.original.placed_at)}</p>
                </div>
            ),
        },
        {
            id: 'items',
            header: 'Items',
            enableSorting: false,
            meta: { label: 'Items', className: 'max-w-[20rem]' },
            cell: ({ row }) => {
                const { title, extra } = itemSummary(row.original);
                return (
                    <div className="flex items-center gap-3">
                        <OrderThumb image={row.original.first_item?.image} />
                        <p className="min-w-0 truncate text-sm text-foreground">
                            {title}
                            {extra ? <span className="ml-1 text-muted-foreground">{extra}</span> : null}
                        </p>
                    </div>
                );
            },
        },
        {
            id: 'buyer',
            header: 'Buyer',
            enableSorting: false,
            meta: { label: 'Buyer' },
            cell: ({ row }) => <span className="text-sm text-foreground">{row.original.buyer_name || '-'}</span>,
        },
        {
            id: 'total',
            header: 'Their share of the order',
            enableSorting: false,
            meta: { label: 'Total', className: 'text-right' },
            cell: ({ row }) => <span className="font-semibold tabular-nums text-foreground">{formatMoney(row.original.total_amount, row.original.currency)}</span>,
        },
        { id: 'payment', header: 'Payment', enableSorting: false, meta: { label: 'Payment' }, cell: ({ row }) => <PaymentBadge order={row.original} /> },
        { id: 'status', header: 'Status', enableSorting: false, meta: { label: 'Status' }, cell: ({ row }) => <FulfilmentBadge status={row.original.order_status} /> },
    ];

    return (
        <DataTable
            columns={columns}
            data={data?.results ?? []}
            total={data?.count ?? 0}
            page={page}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            search={q}
            onSearchChange={(value) => {
                setQ(value.trim());
                setPage(1);
            }}
            searchPlaceholder="Search order ID, buyer or item"
            toolbar={
                <Select
                    value={status}
                    onValueChange={(value) => {
                        setStatus(value);
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-[11rem]" aria-label="Filter by status">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {ORDER_STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                                {o.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            }
            isLoading={isLoading}
            error={error}
            onRetry={() => void mutate()}
            emptyState={<EmptyState icon={ReceiptText} title="No orders" description="Orders containing this seller's items appear here." />}
            getRowId={(row) => row.id}
            enableColumnVisibility={false}
        />
    );
}

// ---------------------------------------------------------------------------------- sold items

export function SellerSoldTab({ sellerId, currency }: { sellerId: string; currency: string }) {
    const { data, error, isLoading, mutate } = useSWR<SoldItem[], AdminSellerError>(soldKey(sellerId), () => fetchSellerSold(sellerId), SWR_OPTIONS);

    if (isLoading) return <Skeleton className="h-48 w-full" />;
    if (error) return <ErrorPanel title="Could not load sold items" message={error.message} onRetry={() => void mutate()} />;
    if (!data || data.length === 0) {
        return (
            <Card>
                <EmptyState icon={PackageSearch} title="Nothing sold yet" description="Products appear here once buyers order them. Cancelled orders are not counted." />
            </Card>
        );
    }
    return (
        <Card className="overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Units</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((row) => (
                        <TableRow key={row.product_id ?? row.title}>
                            <TableCell className="font-medium text-foreground">{row.title}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.units}</TableCell>
                            <TableCell className="text-right tabular-nums">{row.orders}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums text-foreground">{formatMoney(row.revenue, currency)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
    );
}

// ------------------------------------------------------------------------------------ payouts

const payoutSchema = z.object({
    amount: z
        .string()
        .trim()
        .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with up to 2 decimals')
        .refine((v) => Number(v) > 0, 'Amount must be greater than zero'),
    method: z.enum(['bank_transfer', 'mobile_money', 'cash', 'other']),
    reference: z.string().trim().max(100, 'Reference is too long'),
    note: z.string().trim().max(500, 'Keep the note under 500 characters'),
});

type PayoutValues = z.infer<typeof payoutSchema>;

function RecordPayoutDialog({ open, onOpenChange, sellerId, summary, onRecorded }: { open: boolean; onOpenChange: (open: boolean) => void; sellerId: string; summary: SellerFinanceSummary; onRecorded: () => void }) {
    const form = useForm<PayoutValues>({ resolver: zodResolver(payoutSchema), defaultValues: { amount: '', method: 'bank_transfer', reference: '', note: '' } });
    const [formError, setFormError] = useState<string | null>(null);
    // One key per attempt: a double click or retry can't pay twice. A fresh key is made after each success.
    const keyRef = useRef<string>(crypto.randomUUID());
    const submitting = form.formState.isSubmitting;
    const method = form.watch('method');

    useEffect(() => {
        if (!open) {
            form.reset();
            setFormError(null);
        }
    }, [open, form]);

    const submit = form.handleSubmit(async (values) => {
        setFormError(null);
        if ((values.method === 'bank_transfer' || values.method === 'mobile_money') && !values.reference) {
            form.setError('reference', { message: 'A transaction reference is required for this method' });
            return;
        }
        try {
            await recordSellerPayout(sellerId, { amount: values.amount, method: values.method, reference: values.reference || undefined, note: values.note || undefined }, keyRef.current);
            keyRef.current = crypto.randomUUID();
            toast.success('Payout recorded');
            onRecorded();
            onOpenChange(false);
        } catch (e) {
            const err = e as AdminSellerError;
            const field = err.fieldErrors?.amount ?? err.fieldErrors?.reference;
            setFormError(field ?? err.message);
        }
    });

    return (
        <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Record a payout</DialogTitle>
                    <DialogDescription>
                        Record money you have already sent to this seller. Available to pay out now: {formatMoney(summary.balance, summary.currency)}. This does not move any money by itself, and a recorded payout cannot be edited.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={submit} className="space-y-3" noValidate>
                        {formError ? <ErrorPanel title="Could not record the payout" message={formError} /> : null}
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Amount ({summary.currency})</FormLabel>
                                    <FormControl>
                                        <Input inputMode="decimal" autoComplete="off" autoFocus {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>How it was sent</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {(Object.keys(METHOD_LABEL) as PayoutMethod[]).map((m) => (
                                                <SelectItem key={m} value={m}>
                                                    {METHOD_LABEL[m]}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="reference"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Transaction reference{' '}
                                        {method === 'bank_transfer' || method === 'mobile_money' ? null : <span className="font-normal text-muted-foreground">(optional)</span>}
                                    </FormLabel>
                                    <FormControl>
                                        <Input autoComplete="off" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="note"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Note <span className="font-normal text-muted-foreground">(optional)</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea rows={2} {...field} />
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
                                Record payout
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function SellerPayoutsTab({ sellerId, summary }: { sellerId: string; summary: SellerFinanceSummary }) {
    const { mutate: globalMutate } = useSWRConfig();
    const [open, setOpen] = useState(false);
    const { data, error, isLoading, mutate } = useSWR<SellerPayoutRow[], AdminSellerError>(payoutsKey(sellerId), () => fetchSellerPayouts(sellerId), SWR_OPTIONS);
    const balance = Number(summary.balance);

    const refresh = () => {
        void mutate();
        void globalMutate(summaryKey(sellerId));
    };

    return (
        <div className="space-y-3">
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                    <p className="text-sm text-muted-foreground">Available to pay out</p>
                    <p className="text-2xl font-bold tabular-nums text-foreground">{formatMoney(summary.balance, summary.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                        Earnings are held for {summary.hold_days} days after delivery. {formatMoney(summary.pending_earnings, summary.currency)} is still on hold.
                        {balance < 0 ? ' A negative balance means the seller owes the platform commission on cash orders.' : ''}
                    </p>
                </div>
                <Button type="button" onClick={() => setOpen(true)} disabled={!(balance > 0)}>
                    <Plus aria-hidden="true" />
                    Record payout
                </Button>
            </Card>

            {isLoading ? (
                <Skeleton className="h-40 w-full" />
            ) : error ? (
                <ErrorPanel title="Could not load payouts" message={error.message} onRetry={() => void mutate()} />
            ) : !data || data.length === 0 ? (
                <Card>
                    <EmptyState icon={Banknote} title="No payouts yet" description="Money sent to this seller is listed here once you record it." />
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Recorded by</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((p) => (
                                <TableRow key={p.id}>
                                    <TableCell className="whitespace-nowrap">{formatDate(p.paid_at)}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{METHOD_LABEL[p.method] ?? humanize(p.method)}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[16rem]">
                                        <p className="truncate text-foreground">{p.reference || '-'}</p>
                                        {p.note ? <p className="truncate text-xs text-muted-foreground">{p.note}</p> : null}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{p.recorded_by || '-'}</TableCell>
                                    <TableCell className="text-right font-semibold tabular-nums text-foreground">{formatMoney(p.amount, p.currency)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            )}

            <RecordPayoutDialog open={open} onOpenChange={setOpen} sellerId={sellerId} summary={summary} onRecorded={refresh} />
        </div>
    );
}
