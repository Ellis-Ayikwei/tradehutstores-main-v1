import { Link } from 'react-router-dom';
import { ArrowRight, Package, ReceiptText } from 'lucide-react';
import dayjs from 'dayjs';
import { Badge, type BadgeProps } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Skeleton } from '@/components/shadcn/skeleton';
import { formatMoney, type SellerApiError, type SellerOrderRow } from '@/services/sellerStatsService';
import { ErrorPanel } from '../components/ErrorPanel';

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
    Pending: 'warning',
    Processing: 'info',
    Shipped: 'info',
    Delivered: 'success',
    Cancelled: 'destructive',
    Refunded: 'secondary',
};

interface RecentOrdersProps {
    orders?: SellerOrderRow[];
    isLoading: boolean;
    error?: SellerApiError;
    onRetry: () => void;
    isRetrying: boolean;
}

function OrderRow({ order }: { order: SellerOrderRow }) {
    const title = order.first_item?.title || 'Order';
    const extra = order.item_count > 1 ? ` +${order.item_count - 1} more` : '';
    return (
        <li className="flex items-center gap-3 py-2.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                {order.first_item?.image ? <img src={order.first_item.image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5" aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                    {title}
                    <span className="text-muted-foreground">{extra}</span>
                </p>
                <p className="truncate text-xs text-muted-foreground">
                    #{String(order.id).slice(0, 8)} · {dayjs(order.placed_at).format('D MMM, HH:mm')}
                </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 md:flex-row md:items-center md:gap-3">
                <Badge variant={STATUS_VARIANT[order.order_status] ?? 'secondary'}>{order.order_status}</Badge>
                <span className="text-sm font-semibold tabular-nums text-foreground md:w-28 md:text-right">{formatMoney(order.total_amount, order.currency)}</span>
            </div>
        </li>
    );
}

export function RecentOrders({ orders, isLoading, error, onRetry, isRetrying }: RecentOrdersProps) {
    return (
        <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 p-4 pb-1 sm:p-5 sm:pb-1">
                <CardTitle className="text-base">Recent orders</CardTitle>
                <Button asChild variant="ghost" size="sm" className="-mr-2">
                    <Link to="/seller/orders">
                        View all
                        <ArrowRight aria-hidden="true" />
                    </Link>
                </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                {error ? (
                    <ErrorPanel title="Couldn't load recent orders" message={error.message} onRetry={onRetry} isRetrying={isRetrying} className="mt-2" />
                ) : isLoading ? (
                    <ul className="divide-y divide-border" aria-busy="true" aria-label="Loading recent orders">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <li key={i} className="flex items-center gap-3 py-2.5">
                                <Skeleton className="h-11 w-11 shrink-0" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-3/5" />
                                    <Skeleton className="h-3 w-2/5" />
                                </div>
                                <Skeleton className="h-8 w-20" />
                            </li>
                        ))}
                    </ul>
                ) : orders && orders.length > 0 ? (
                    <ul className="divide-y divide-border">
                        {orders.map((order) => (
                            <OrderRow key={order.id} order={order} />
                        ))}
                    </ul>
                ) : (
                    <EmptyState icon={ReceiptText} title="No orders yet" description="Orders from buyers will show up here as soon as they are placed." className="py-8" />
                )}
            </CardContent>
        </Card>
    );
}
