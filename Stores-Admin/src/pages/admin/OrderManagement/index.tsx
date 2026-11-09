import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import { ChevronRight, Clock, ReceiptText, RefreshCw, ShoppingBag, Truck } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { DataTable } from '@/components/shadcn/data-table';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { StatCard } from '@/components/shadcn/stat-card';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { fetchAdminOrders, type AdminOrderError, type AdminOrderRow } from '@/services/adminOrdersService';
import { setPageTitle } from '@/store/themeConfigSlice';
import { PaymentStatusBadge, StatusBadge, formatDate } from './adminOrderUi';

const PAGE_SIZE = 25;
const API_LIMIT = 1000;
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, keepPreviousData: true } as const;

type TabValue = 'all' | AdminOrderRow['status'];

const TABS: { value: TabValue; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
];

/** The three sidebar entries share this page; they only differ in the tab they open on. */
function tabForPath(pathname: string): TabValue {
    if (pathname.endsWith('/pending')) return 'pending';
    if (pathname.endsWith('/completed')) return 'delivered';
    return 'all';
}

export default function OrderManagement() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { formatDisplayPrice } = useCurrency();

    useEffect(() => {
        dispatch(setPageTitle('Orders'));
    }, [dispatch]);

    const [tab, setTab] = useState<TabValue>(() => tabForPath(pathname));
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');

    // Following a different sidebar entry (same component, new path) re-selects its tab.
    useEffect(() => {
        setTab(tabForPath(pathname));
        setPage(1);
    }, [pathname]);

    const { data, error, isLoading, isValidating, mutate } = useSWR<AdminOrderRow[], AdminOrderError>(['admin:orders'], () => fetchAdminOrders('', API_LIMIT), SWR_OPTIONS);
    const orders = useMemo(() => data ?? [], [data]);

    const counts = useMemo(() => {
        const c: Record<TabValue, number> = { all: orders.length, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
        for (const o of orders) c[o.status] += 1;
        return c;
    }, [orders]);

    const orderValue = useMemo(() => orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + (o.total_amount || 0), 0), [orders]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return orders.filter((o) => {
            if (tab !== 'all' && o.status !== tab) return false;
            if (!q) return true;
            return [o.order_number, o.customer_name, o.customer_email].some((v) => (v || '').toLowerCase().includes(q));
        });
    }, [orders, tab, search]);

    const pageRows = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

    const openOrder = useCallback((id: string) => navigate(`/admin/orders/${id}`), [navigate]);

    const columns = useMemo<ColumnDef<AdminOrderRow>[]>(
        () => [
            {
                id: 'order',
                header: 'Order',
                enableSorting: false,
                meta: { label: 'Order', cardTitle: true },
                cell: ({ row }) => (
                    <Link to={`/admin/orders/${row.original.id}`} className="font-semibold text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
                        {row.original.order_number}
                    </Link>
                ),
            },
            {
                id: 'customer',
                header: 'Customer',
                enableSorting: false,
                meta: { label: 'Customer' },
                cell: ({ row }) => (
                    <div className="min-w-[8rem]">
                        <p className="text-sm font-medium text-foreground">{row.original.customer_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{row.original.customer_email || '-'}</p>
                    </div>
                ),
            },
            {
                id: 'items',
                header: 'Items',
                enableSorting: false,
                meta: { label: 'Items', className: 'text-right' },
                cell: ({ row }) => <span className="tabular-nums text-foreground">{row.original.items_count}</span>,
            },
            {
                id: 'total',
                header: 'Total',
                enableSorting: false,
                meta: { label: 'Total', className: 'text-right' },
                cell: ({ row }) => <span className="font-semibold tabular-nums text-foreground">{formatDisplayPrice(row.original.total_amount || 0)}</span>,
            },
            {
                id: 'payment',
                header: 'Payment',
                enableSorting: false,
                meta: { label: 'Payment' },
                cell: ({ row }) => <PaymentStatusBadge status={row.original.payment_status === 'pending' ? 'unpaid' : row.original.payment_status} />,
            },
            {
                id: 'status',
                header: 'Status',
                enableSorting: false,
                meta: { label: 'Status' },
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
            },
            {
                id: 'date',
                header: 'Placed',
                enableSorting: false,
                meta: { label: 'Placed' },
                cell: ({ row }) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.original.created_at)}</span>,
            },
            {
                id: 'view',
                header: () => <span className="sr-only">Open</span>,
                enableSorting: false,
                enableHiding: false,
                meta: { className: 'w-12 text-right' },
                cell: ({ row }) => (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Open order ${row.original.order_number}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            openOrder(row.original.id);
                        }}
                    >
                        <ChevronRight />
                    </Button>
                ),
            },
        ],
        [formatDisplayPrice, openOrder]
    );

    const renderMobileCard = useCallback(
        (order: AdminOrderRow) => (
            <Card key={order.id} className="p-3">
                <button type="button" onClick={() => openOrder(order.id)} className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{order.order_number}</p>
                            <span className="text-sm font-semibold tabular-nums text-foreground">{formatDisplayPrice(order.total_amount || 0)}</span>
                        </div>
                        <p className="truncate text-sm text-foreground">{order.customer_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">
                            {order.items_count} item{order.items_count === 1 ? '' : 's'} · {formatDate(order.created_at)}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <StatusBadge status={order.status} />
                            <PaymentStatusBadge status={order.payment_status === 'pending' ? 'unpaid' : order.payment_status} />
                        </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
            </Card>
        ),
        [formatDisplayPrice, openOrder]
    );

    const emptyState = useMemo(() => {
        if (search.trim()) return undefined;
        return tab === 'all' ? (
            <EmptyState icon={ReceiptText} title="No orders yet" description="Orders placed by buyers will appear here." />
        ) : (
            <EmptyState icon={ReceiptText} title={`No ${tab} orders`} description="Orders with this status will appear here." />
        );
    }, [search, tab]);

    return (
        <div className="space-y-3">
            <PageHeader
                title="Orders"
                description="Every order across all sellers"
                className="pb-0"
                actions={
                    <Button type="button" variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
                        <RefreshCw className={cn(isValidating && 'animate-spin')} aria-hidden="true" />
                        Refresh
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Orders" value={counts.all} icon={ShoppingBag} isLoading={isLoading} />
                <StatCard label="Order value" value={formatDisplayPrice(orderValue)} icon={ReceiptText} hint="Excludes cancelled" isLoading={isLoading} />
                <StatCard label="Pending" value={counts.pending} icon={Clock} isLoading={isLoading} />
                <StatCard label="Processing" value={counts.processing} icon={Truck} isLoading={isLoading} />
            </div>

            {orders.length >= API_LIMIT ? (
                <p className="rounded-xl bg-warning-subtle px-3 py-2 text-sm text-warning-subtle-foreground" role="status">
                    Showing the latest {API_LIMIT} orders. Older orders are not listed here.
                </p>
            ) : null}

            <Tabs
                value={tab}
                onValueChange={(value) => {
                    setTab(value as TabValue);
                    setPage(1);
                }}
            >
                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                    <TabsList className="w-max">
                        {TABS.map((t) => (
                            <TabsTrigger key={t.value} value={t.value}>
                                {t.label}
                                {counts[t.value] > 0 ? <span className="ml-1.5 tabular-nums text-muted-foreground">{counts[t.value]}</span> : null}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
            </Tabs>

            <DataTable
                columns={columns}
                data={pageRows}
                total={filtered.length}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                search={search}
                onSearchChange={(value) => {
                    setSearch(value);
                    setPage(1);
                }}
                searchPlaceholder="Search by order number, customer or email"
                isLoading={isLoading}
                error={error}
                onRetry={() => void mutate()}
                emptyState={emptyState}
                getRowId={(row) => row.id}
                onRowClick={(row) => openOrder(row.id)}
                renderMobileCard={renderMobileCard}
                enableColumnVisibility={false}
            />
        </div>
    );
}
