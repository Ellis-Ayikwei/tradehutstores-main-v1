import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import { ChevronRight, ReceiptText, RefreshCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { DataTable } from '@/components/shadcn/data-table';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { cn } from '@/lib/utils';
import { fetchSellerOrders, type OrderApiError, type Paginated, type SellerOrderListRow } from '@/services/sellerOrdersService';
import { formatMoney } from '@/services/sellerStatsService';
import { setPageTitle } from '@/store/themeConfigSlice';
import { ORDER_LIST_KEY, OrderDetailSheet } from './OrderDetailSheet';
import { FulfilmentBadge, OrderThumb, PaymentBadge, PaymentDue, STATUS_TABS, formatDate, itemSummary, shortId } from './orderUi';

const PAGE_SIZE = 25;
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, keepPreviousData: true } as const;

const columns: ColumnDef<SellerOrderListRow>[] = [
    {
        id: 'order',
        header: 'Order',
        enableSorting: false,
        meta: { label: 'Order', cardTitle: true },
        cell: ({ row }) => (
            <div className="min-w-[7rem]">
                <p className="font-semibold text-foreground">#{shortId(row.original.id)}</p>
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
        id: 'total',
        header: 'Total',
        enableSorting: false,
        meta: { label: 'Total', className: 'text-right' },
        cell: ({ row }) => <span className="font-semibold tabular-nums text-foreground">{formatMoney(row.original.total_amount, row.original.currency)}</span>,
    },
    {
        id: 'payment',
        header: 'Payment',
        enableSorting: false,
        meta: { label: 'Payment' },
        cell: ({ row }) => (
            <div className="flex flex-col items-start gap-0.5">
                <PaymentBadge order={row.original} />
                <PaymentDue order={row.original} />
            </div>
        ),
    },
    {
        id: 'status',
        header: 'Status',
        enableSorting: false,
        meta: { label: 'Status' },
        cell: ({ row }) => <FulfilmentBadge status={row.original.order_status} />,
    },
];

export default function SellerOrders() {
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        dispatch(setPageTitle('Seller orders'));
    }, [dispatch]);

    const tab = STATUS_TABS.find((t) => t.value === searchParams.get('status') || (t.status !== '' && t.status === searchParams.get('status'))) ?? STATUS_TABS[0];
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const q = searchParams.get('q') ?? '';
    const orderId = searchParams.get('id');

    const update = useCallback(
        (patch: Record<string, string | null>, replace = true) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    for (const [key, value] of Object.entries(patch)) {
                        if (value === null || value === '') next.delete(key);
                        else next.set(key, value);
                    }
                    return next;
                },
                { replace }
            );
        },
        [setSearchParams]
    );

    const { data, error, isLoading, isValidating, mutate } = useSWR<Paginated<SellerOrderListRow>, OrderApiError>(
        [ORDER_LIST_KEY, page, PAGE_SIZE, tab.status, q],
        () => fetchSellerOrders({ page, pageSize: PAGE_SIZE, status: tab.status, q }),
        SWR_OPTIONS
    );

    const openOrder = useCallback((id: string) => update({ id }, false), [update]);
    const closeOrder = useCallback(() => update({ id: null }), [update]);

    const emptyState = useMemo(
        () =>
            q ? undefined : tab.value === 'all' ? (
                <EmptyState icon={ReceiptText} title="No orders yet" description="Orders from buyers show up here, ready to ship." />
            ) : (
                <EmptyState icon={ReceiptText} title={`No ${tab.label.toLowerCase()} orders`} description="Orders with this status will appear here." />
            ),
        [q, tab]
    );

    const renderMobileCard = useCallback(
        (order: SellerOrderListRow) => {
            const { title, extra } = itemSummary(order);
            return (
                <Card key={order.id} className="p-3">
                    <button type="button" onClick={() => openOrder(order.id)} className="flex w-full items-start gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <OrderThumb image={order.first_item?.image} />
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">#{shortId(order.id)}</p>
                                <span className="text-sm font-semibold tabular-nums text-foreground">{formatMoney(order.total_amount, order.currency)}</span>
                            </div>
                            <p className="truncate text-sm text-foreground">
                                {title}
                                {extra ? <span className="ml-1 text-muted-foreground">{extra}</span> : null}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(order.placed_at)}</p>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                <FulfilmentBadge status={order.order_status} />
                                <PaymentBadge order={order} />
                            </div>
                            <PaymentDue order={order} className="block" />
                        </div>
                        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                </Card>
            );
        },
        [openOrder]
    );

    const columnsWithAction = useMemo<ColumnDef<SellerOrderListRow>[]>(
        () => [
            ...columns,
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
                        aria-label={`Open order ${shortId(row.original.id)}`}
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
        [openOrder]
    );

    return (
        <div className="space-y-3">
            <PageHeader
                title="Orders"
                description="Orders to fulfil and track"
                className="pb-0"
                actions={
                    <Button type="button" variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
                        <RefreshCw className={cn(isValidating && 'animate-spin')} aria-hidden="true" />
                        Refresh
                    </Button>
                }
            />

            <Tabs value={tab.value} onValueChange={(value) => update({ status: value === 'all' ? null : value, page: null, id: null })}>
                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                    <TabsList className="w-max">
                        {STATUS_TABS.map((t) => (
                            <TabsTrigger key={t.value} value={t.value}>
                                {t.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
            </Tabs>

            <DataTable
                columns={columnsWithAction}
                data={data?.results ?? []}
                total={data?.count ?? 0}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={(next) => update({ page: next <= 1 ? null : String(next) })}
                search={q}
                onSearchChange={(value) => update({ q: value.trim() || null, page: null })}
                searchPlaceholder="Search by order ID or buyer"
                isLoading={isLoading}
                error={error}
                onRetry={() => void mutate()}
                emptyState={emptyState}
                getRowId={(row) => row.id}
                onRowClick={(row) => openOrder(row.id)}
                renderMobileCard={renderMobileCard}
                enableColumnVisibility={false}
            />

            <OrderDetailSheet orderId={orderId} onClose={closeOrder} />
        </div>
    );
}
