/**
 * Admin revenue screens (Overview / Transactions / Refunds): the payments ledger.
 *
 * Reads `GET /payments/` (staff only): every payment against every order, whether it came through the
 * payment gateway (card / mobile money), was cash on delivery, or was recorded by an admin. "Record payment"
 * adds one by hand (`POST /payments/`). If the API is ever unreachable (404) the page says so honestly
 * instead of showing an error or invented numbers (AGENTS.md §1b).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import type { AxiosError } from 'axios';
import type { ColumnDef } from '@tanstack/react-table';
import { CreditCard, Plus, PlugZap } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { DataTable, type DataTableSort } from '@/components/shadcn/data-table';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import axiosInstance from '@/services/axiosInstance';
import { setPageTitle } from '@/store/themeConfigSlice';
import { RecordPaymentDialog } from './RecordPaymentDialog';

export type RevenueView = 'overview' | 'transactions' | 'refunds';

interface PaymentRow {
    id: string;
    reference?: string | null;
    transaction_id?: string | null;
    order_id?: string;
    /** Set on refund rows: the payment they came out of. */
    payment_id?: string;
    order_number?: string;
    customer_name?: string;
    customer_email?: string;
    amount: string;
    currency?: string | null;
    status: string;
    payment_type?: string | null;
    provider?: string | null;
    recorded_by?: string | null;
    note?: string | null;
    created_at: string;
}

interface Paginated<T> {
    count: number;
    results: T[];
}

const COPY: Record<RevenueView, { title: string; description: string }> = {
    overview: { title: 'Revenue', description: 'Payments received across the marketplace' },
    transactions: { title: 'Transactions', description: 'Every payment, newest first' },
    refunds: { title: 'Refunds', description: 'Refunded and partially refunded payments' },
};

export const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
    completed: 'success',
    succeeded: 'success',
    paid: 'success',
    pending: 'warning',
    processing: 'info',
    failed: 'destructive',
    cancelled: 'secondary',
    refunded: 'secondary',
    partially_refunded: 'warning',
    needs_review: 'warning',
};

export const humanize = (v: string) => v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export function formatMoney(amount: string, currency?: string | null) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return amount;
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'GHS' }).format(n);
    } catch {
        return `${currency ?? ''} ${n.toFixed(2)}`.trim();
    }
}

async function fetchPayments([, page, pageSize, ordering, search, view]: [string, number, number, string, string, RevenueView]) {
    const params: Record<string, string | number> = { page, page_size: pageSize, ordering };
    if (search) params.search = search;
    // The Refunds tab lists refunds (money going back); the others list payments (money coming in).
    const res = await axiosInstance.get<Paginated<PaymentRow>>(view === 'refunds' ? '/payments/refunds/' : '/payments/', { params });
    return res.data;
}

export default function PaymentsLedger({ view }: { view: RevenueView }) {
    const dispatch = useDispatch();
    const copy = COPY[view];
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [sort, setSort] = useState<DataTableSort | null>({ id: 'created_at', desc: true });
    const [search, setSearch] = useState('');
    const [recordOpen, setRecordOpen] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle(copy.title));
    }, [dispatch, copy.title]);

    const ordering = sort ? `${sort.desc ? '-' : ''}${sort.id}` : '-created_at';
    const { data, error, isLoading, mutate } = useSWR<Paginated<PaymentRow>, AxiosError>(['/payments/', page, pageSize, ordering, search, view], fetchPayments, {
        revalidateOnFocus: false,
        shouldRetryOnError: (err: AxiosError) => err?.response?.status !== 404,
    });

    const notConnected = error?.response?.status === 404;

    const columns = useMemo<ColumnDef<PaymentRow>[]>(
        () => [
            {
                id: 'reference',
                header: 'Reference',
                enableSorting: false,
                meta: { label: 'Reference', cardTitle: true },
                cell: ({ row }) => (
                    <Link to={`/admin/revenue/payments/${row.original.payment_id ?? row.original.id}`} className="font-medium text-primary hover:underline">
                        {row.original.reference || row.original.transaction_id || `#${row.original.id.slice(0, 8).toUpperCase()}`}
                    </Link>
                ),
            },
            {
                id: 'order',
                header: 'Order',
                enableSorting: false,
                meta: { label: 'Order' },
                cell: ({ row }) => <span className="font-mono text-xs">{row.original.order_number ?? '-'}</span>,
            },
            {
                id: 'customer',
                header: 'Customer',
                enableSorting: false,
                meta: { label: 'Customer', hideOnMobile: true },
                cell: ({ row }) =>
                    row.original.customer_email ? (
                        <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">{row.original.customer_name}</p>
                            <p className="truncate text-xs text-muted-foreground">{row.original.customer_email}</p>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">-</span>
                    ),
            },
            {
                accessorKey: 'amount',
                header: 'Amount',
                meta: { label: 'Amount' },
                cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span>,
            },
            {
                accessorKey: 'status',
                header: 'Status',
                meta: { label: 'Status' },
                cell: ({ row }) => <Badge variant={STATUS_VARIANT[row.original.status] ?? 'outline'}>{humanize(row.original.status)}</Badge>,
            },
            {
                accessorKey: 'payment_type',
                header: 'Method',
                enableSorting: false,
                meta: { label: 'Method', hideOnMobile: true },
                cell: ({ row }) => (row.original.payment_type ? humanize(row.original.payment_type) : <span className="text-muted-foreground">-</span>),
            },
            {
                id: 'recorded_by',
                header: 'Recorded by',
                enableSorting: false,
                meta: { label: 'Recorded by', hideOnMobile: true },
                cell: ({ row }) =>
                    row.original.recorded_by ? (
                        <span title={row.original.note ?? undefined}>{row.original.recorded_by}</span>
                    ) : (
                        <span className="text-muted-foreground">{row.original.provider === 'paystack' ? 'Gateway' : row.original.provider === 'cod' ? 'Seller' : '-'}</span>
                    ),
            },
            {
                accessorKey: 'created_at',
                header: 'Date',
                meta: { label: 'Date' },
                cell: ({ row }) => new Date(row.original.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
            },
        ],
        []
    );

    return (
        <div className="space-y-3">
            <PageHeader
                title={copy.title}
                description={copy.description}
                className="pb-0"
                actions={
                    view === 'refunds' ? undefined : (
                        <Button onClick={() => setRecordOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Record payment
                        </Button>
                    )
                }
            />
            <RecordPaymentDialog open={recordOpen} onOpenChange={setRecordOpen} onRecorded={() => void mutate()} />
            {notConnected ? (
                <Card>
                    <EmptyState
                        icon={PlugZap}
                        title="Payments aren't connected yet"
                        description="The payments API isn't live on the backend yet. Transactions and refunds will appear here once it is."
                    />
                </Card>
            ) : (
                <DataTable
                    columns={columns}
                    data={data?.results ?? []}
                    total={data?.count ?? 0}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={setPage}
                    onPageSizeChange={(s) => {
                        setPageSize(s);
                        setPage(1);
                    }}
                    sort={sort}
                    onSortChange={(s) => {
                        setSort(s);
                        setPage(1);
                    }}
                    search={search}
                    onSearchChange={(v) => {
                        setSearch(v);
                        setPage(1);
                    }}
                    searchPlaceholder="Search by reference, order number or customer email"
                    isLoading={isLoading}
                    error={error}
                    onRetry={() => mutate()}
                    getRowId={(row) => row.id}
                    emptyState={<EmptyState icon={CreditCard} title={view === 'refunds' ? 'No refunds yet' : 'No payments yet'} description="Payments show up here as buyers check out, or when you record one." />}
                />
            )}
        </div>
    );
}
