import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import { ChevronRight, Clock, ReceiptText, RefreshCw, ShoppingBag, Store, Truck, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { Skeleton } from '@/components/shadcn/skeleton';
import { StatCard } from '@/components/shadcn/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { fetchAdminOrders, type AdminOrderError, type AdminOrderRow } from '@/services/adminOrdersService';
import { fetchAdminSellers, type AdminSellerError, type Paginated, type SellerListRow } from '@/services/adminSellersService';
import { setPageTitle } from '@/store/themeConfigSlice';
import { PaymentStatusBadge, StatusBadge, formatDate } from './OrderManagement/adminOrderUi';
import { SELLERS_KEY } from './SellerManagement/sellerSections';

// Same key, limit and options as the Orders page, so both screens share one cached request.
const ORDERS_LIMIT = 1000;
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, keepPreviousData: true } as const;
const RECENT_COUNT = 5;

function AttentionLink({ to, icon: Icon, title, hint }: { to: string; icon: LucideIcon; title: string; hint: string }) {
    return (
        <Link
            to={to}
            className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
        >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-subtle text-warning-subtle-foreground">
                <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Link>
    );
}

export default function EcommerceDashboard() {
    const dispatch = useDispatch();
    const { formatDisplayPrice } = useCurrency();

    useEffect(() => {
        dispatch(setPageTitle('Dashboard'));
    }, [dispatch]);

    const { data, error, isLoading, isValidating, mutate } = useSWR<AdminOrderRow[], AdminOrderError>(['admin:orders'], () => fetchAdminOrders('', ORDERS_LIMIT), SWR_OPTIONS);
    const { data: pendingSellers } = useSWR<Paginated<SellerListRow>, AdminSellerError>([SELLERS_KEY, 'count', 'pending'], () => fetchAdminSellers({ status: 'pending', pageSize: 1 }), SWR_OPTIONS);

    const orders = useMemo(() => data ?? [], [data]);
    const pending = useMemo(() => orders.filter((o) => o.status === 'pending').length, [orders]);
    const processing = useMemo(() => orders.filter((o) => o.status === 'processing').length, [orders]);
    const orderValue = useMemo(() => orders.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + (o.total_amount || 0), 0), [orders]);
    const sellersWaiting = pendingSellers?.count ?? 0;
    // The API returns newest first and stops at ORDERS_LIMIT; past that the totals cover only the latest orders.
    const capped = orders.length >= ORDERS_LIMIT;

    return (
        <div className="space-y-4 sm:space-y-6">
            <PageHeader
                title="Dashboard"
                description="Orders and seller applications that need attention."
                actions={
                    <Button variant="outline" onClick={() => void mutate()} disabled={isValidating}>
                        <RefreshCw className={cn('h-4 w-4', isValidating && 'animate-spin')} aria-hidden="true" />
                        Refresh
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatCard label="Orders" value={orders.length} icon={ShoppingBag} isLoading={isLoading} hint={capped ? `Latest ${ORDERS_LIMIT}` : undefined} />
                <StatCard label="Order value" value={formatDisplayPrice(orderValue)} icon={ReceiptText} isLoading={isLoading} hint="Excludes cancelled" />
                <StatCard label="Pending" value={pending} icon={Clock} isLoading={isLoading} />
                <StatCard label="Processing" value={processing} icon={Truck} isLoading={isLoading} />
            </div>

            {pending > 0 || sellersWaiting > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                    {pending > 0 ? (
                        <AttentionLink to="/admin/orders/pending" icon={Clock} title={`${pending} pending ${pending === 1 ? 'order' : 'orders'}`} hint="Waiting to be processed" />
                    ) : null}
                    {sellersWaiting > 0 ? (
                        <AttentionLink
                            to="/admin/sellers?status=pending"
                            icon={Store}
                            title={`${sellersWaiting} seller ${sellersWaiting === 1 ? 'application' : 'applications'}`}
                            hint="Waiting for review"
                        />
                    ) : null}
                </div>
            ) : null}

            <Card>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                    <CardTitle>Recent orders</CardTitle>
                    <Button asChild variant="ghost" size="sm">
                        <Link to="/admin/orders/list">
                            View all
                            <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-0 sm:p-0">
                    {isLoading ? (
                        <div className="space-y-3 p-4 sm:p-6">
                            {Array.from({ length: RECENT_COUNT }).map((_, i) => (
                                <Skeleton key={i} className="h-8 w-full" />
                            ))}
                        </div>
                    ) : error && orders.length === 0 ? (
                        <EmptyState
                            title="Could not load orders"
                            description={error.message}
                            action={
                                <Button variant="outline" onClick={() => void mutate()}>
                                    Try again
                                </Button>
                            }
                        />
                    ) : orders.length === 0 ? (
                        <EmptyState icon={ShoppingBag} title="No orders yet" description="New orders show up here as soon as they are placed." />
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order</TableHead>
                                    <TableHead className="hidden sm:table-cell">Customer</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden md:table-cell">Payment</TableHead>
                                    <TableHead className="hidden lg:table-cell">Placed</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {orders.slice(0, RECENT_COUNT).map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            <Link to={`/admin/orders/${order.id}`} className="font-semibold text-foreground hover:underline">
                                                {order.order_number}
                                            </Link>
                                            <span className="block max-w-[10rem] truncate text-xs text-muted-foreground sm:hidden">{order.customer_name}</span>
                                        </TableCell>
                                        <TableCell className="hidden max-w-[14rem] truncate sm:table-cell">{order.customer_name}</TableCell>
                                        <TableCell>
                                            <StatusBadge status={order.status} />
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <PaymentStatusBadge status={order.payment_status} />
                                        </TableCell>
                                        <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">{formatDate(order.created_at)}</TableCell>
                                        <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{formatDisplayPrice(order.total_amount)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
