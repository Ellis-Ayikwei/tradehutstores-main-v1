import { Badge, type BadgeProps } from '@/components/shadcn/badge';
import { formatDate, humanize } from '@/pages/seller/orders/orderUi';

export { formatDate, humanize };

export type FulfilmentKey = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export const FULFILMENT_LABEL: Record<FulfilmentKey, string> = {
    pending: 'Pending',
    processing: 'Processing',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
};

const FULFILMENT_VARIANT: Record<FulfilmentKey, BadgeProps['variant']> = {
    pending: 'warning',
    processing: 'info',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'destructive',
};

/** Accepts the list's lowercase status or the detail's raw status ("Processing", "Refunded", ...). */
export function normaliseStatus(status: string | null | undefined): FulfilmentKey {
    const s = String(status ?? 'pending').toLowerCase();
    if (s === 'refunded') return 'cancelled';
    return (s in FULFILMENT_LABEL ? s : 'pending') as FulfilmentKey;
}

export function StatusBadge({ status, refunded }: { status: string; refunded?: boolean }) {
    const key = normaliseStatus(status);
    if (refunded || String(status).toLowerCase() === 'refunded') return <Badge variant="secondary">Refunded</Badge>;
    return <Badge variant={FULFILMENT_VARIANT[key]}>{FULFILMENT_LABEL[key]}</Badge>;
}

/** Works for the list vocabulary (pending/paid/refunded) and the detail vocabulary (unpaid/.../partially_refunded). */
export function PaymentStatusBadge({ status, payMode }: { status: string; payMode?: string | null }) {
    switch (status) {
        case 'paid':
            return <Badge variant="success">Paid</Badge>;
        case 'refunded':
            return <Badge variant="secondary">Refunded</Badge>;
        case 'partially_refunded':
            return <Badge variant="secondary">Partly refunded</Badge>;
        default:
            if (String(payMode ?? '').toUpperCase() === 'COD') return <Badge variant="info">COD</Badge>;
            return <Badge variant="warning">Awaiting payment</Badge>;
    }
}

/** Display the API's pay mode ("COD", "Online", "Bank Transfer", ...). */
export function payModeLabel(payMode: string | null | undefined): string {
    const m = String(payMode ?? '').trim();
    if (!m) return '-';
    return m.toUpperCase() === 'COD' ? 'Cash on delivery' : m;
}

export function shortOrderId(id: string): string {
    return String(id).slice(0, 8).toUpperCase();
}
