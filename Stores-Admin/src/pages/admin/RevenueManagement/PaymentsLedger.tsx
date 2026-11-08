/**
 * Admin revenue screens (Overview / Transactions / Refunds).
 *
 * Replaces the legacy moving-app RevenueManagement page (Stripe bookings/providers), which called
 * endpoints that do not exist in Stores-BE. `apps/payments` has models only: no serializers, views
 * or urls, and `payments/` is commented out in backend/urls.py. Until that API ships, a 404 renders
 * an honest "not connected" state instead of an error or invented numbers (AGENTS.md §1b).
 * Columns read only generic fields; align them with the payments contract when it is written.
 */
import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import type { AxiosError } from 'axios';
import type { ColumnDef } from '@tanstack/react-table';
import { CreditCard, PlugZap } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/shadcn/badge';
import { Card } from '@/components/shadcn/card';
import { DataTable, type DataTableSort } from '@/components/shadcn/data-table';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import axiosInstance from '@/services/axiosInstance';
import { setPageTitle } from '@/store/themeConfigSlice';

export type RevenueView = 'overview' | 'transactions' | 'refunds';

interface PaymentRow {
    id: string;
    reference?: string | null;
    transaction_id?: string | null;
    amount: string;
    currency?: string | null;
    status: string;
    payment_type?: string | null;
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

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
    completed: 'success',
    succeeded: 'success',
    paid: 'success',
    pending: 'warning',
    processing: 'info',
    failed: 'destructive',
    cancelled: 'secondary',
    refunded: 'secondary',
    partially_refunded: 'warning',
};

const humanize = (v: string) => v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function formatMoney(amount: string, currency?: string | null) {
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
    if (view === 'refunds') params.status = 'refunded,partially_refunded';
    const res = await axiosInstance.get<Paginated<PaymentRow>>('/payments/', { params });
    return res.data;
}

export default function PaymentsLedger({ view }: { view: RevenueView }) {
    const dispatch = useDispatch();
    const copy = COPY[view];
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(25);
    const [sort, setSort] = useState<DataTableSort | null>({ id: 'created_at', desc: true });
    const [search, setSearch] = useState('');

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
                cell: ({ row }) => <span className="font-medium text-foreground">{row.original.reference || row.original.transaction_id || row.original.id.slice(0, 8)}</span>,
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
                header: 'Type',
                enableSorting: false,
                meta: { label: 'Type', hideOnMobile: true },
                cell: ({ row }) => (row.original.payment_type ? humanize(row.original.payment_type) : <span className="text-muted-foreground">-</span>),
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
            <PageHeader title={copy.title} description={copy.description} className="pb-0" />
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
                    searchPlaceholder="Search by reference"
                    isLoading={isLoading}
                    error={error}
                    onRetry={() => mutate()}
                    getRowId={(row) => row.id}
                    emptyState={<EmptyState icon={CreditCard} title={view === 'refunds' ? 'No refunds yet' : 'No payments yet'} description="Payments show up here as buyers check out." />}
                />
            )}
        </div>
    );
}
