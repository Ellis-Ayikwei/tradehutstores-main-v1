import dayjs from 'dayjs';
import { Package } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/shadcn/badge';
import { cn } from '@/lib/utils';
import type { OrderAddress, SellerOrderDetail, SellerOrderListRow } from '@/services/sellerOrdersService';

export interface StatusTab {
    value: string;
    label: string;
    /** Value sent as `?status=`. Empty = all. */
    status: string;
}

/** Tabs map to the contract's `order_status` values (O6 `?status=`). */
export const STATUS_TABS: StatusTab[] = [
    { value: 'all', label: 'All', status: '' },
    { value: 'to-pay', label: 'To pay', status: 'Pending' },
    { value: 'to-ship', label: 'To ship', status: 'Processing' },
    { value: 'shipped', label: 'Shipped', status: 'Shipped' },
    { value: 'delivered', label: 'Delivered', status: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled', status: 'Cancelled' },
    { value: 'refunded', label: 'Refunded', status: 'Refunded' },
];

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
    Pending: 'warning',
    Processing: 'info',
    Shipped: 'info',
    Delivered: 'success',
    Cancelled: 'destructive',
    Refunded: 'secondary',
};

const STATUS_LABEL: Record<string, string> = {
    Pending: 'Pending payment',
    Processing: 'To ship',
};

export function isCod(order: { pay_mode?: string | null }): boolean {
    return String(order.pay_mode ?? '').toUpperCase() === 'COD';
}

export function shortId(id: string): string {
    return String(id).slice(0, 8).toUpperCase();
}

export function formatDate(value?: string | null, withTime = true): string {
    if (!value) return '-';
    const d = dayjs(value);
    return d.isValid() ? d.format(withTime ? 'D MMM YYYY, HH:mm' : 'D MMM YYYY') : '-';
}

export function humanize(value: string): string {
    const s = value.replace(/_/g, ' ').trim();
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function FulfilmentBadge({ status }: { status: string }) {
    return <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>{STATUS_LABEL[status] ?? humanize(status)}</Badge>;
}

export function PaymentBadge({ order }: { order: SellerOrderListRow }) {
    switch (order.payment_status) {
        case 'paid':
            return <Badge variant="success">Paid</Badge>;
        case 'refunded':
            return <Badge variant="secondary">Refunded</Badge>;
        case 'partially_refunded':
            return <Badge variant="secondary">Partly refunded</Badge>;
        default:
            if (isCod(order)) return <Badge variant="info">COD · pay on delivery</Badge>;
            return <Badge variant="warning">Awaiting payment</Badge>;
    }
}

/** Due date line for unpaid online orders. Overdue dates are highlighted. */
export function PaymentDue({ order, className }: { order: SellerOrderListRow; className?: string }) {
    if (order.payment_status !== 'unpaid' || isCod(order) || !order.payment_due_at) return null;
    const overdue = dayjs(order.payment_due_at).isBefore(dayjs());
    return (
        <span className={cn('text-xs', overdue ? 'font-medium text-destructive' : 'text-muted-foreground', className)}>
            {overdue ? 'Payment overdue ' : 'Payment due '}
            {formatDate(order.payment_due_at)}
        </span>
    );
}

export function OrderThumb({ image, className }: { image?: string | null; className?: string }) {
    return (
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground', className)}>
            {image ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5" aria-hidden="true" />}
        </div>
    );
}

export function itemSummary(order: SellerOrderListRow): { title: string; extra: string } {
    const title = order.first_item?.title || 'Order';
    const extra = order.item_count > 1 ? `+${order.item_count - 1} more` : '';
    return { title, extra };
}

/** Buyer name only when the API provides one (the contract names no field, so several are tried). */
export function buyerName(order: SellerOrderDetail): string {
    return (order.buyer_name || order.buyer?.name || order.buyer?.full_name || order.address?.full_name || order.shipping_address?.full_name || '').trim();
}

export function orderAddress(order: SellerOrderDetail): OrderAddress | null {
    return order.address ?? order.shipping_address ?? null;
}

/** Address lines exactly as provided, skipping empty parts. */
export function addressLines(address: OrderAddress | null): string[] {
    if (!address) return [];
    const cityLine = [address.city, address.state, address.postal_code].filter(Boolean).join(', ');
    return [address.address, address.address_line2, cityLine, address.country].map((l) => (l ?? '').trim()).filter(Boolean);
}

/** Parses a decimal string; non-finite or empty values become 0. */
export function amount(value?: string | null): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
