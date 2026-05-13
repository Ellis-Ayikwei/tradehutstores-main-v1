import type { ApiOrder, ApiOrderItem } from '@/lib/accountApi'

const PLACEHOLDER_IMG =
    'https://images.unsplash.com/photo-1560393464-5c69a73c5770?w=200&q=80'

function num(v: string | number | null | undefined): number {
    if (v == null) return 0
    if (typeof v === 'number') return v
    const n = parseFloat(v)
    return Number.isFinite(n) ? n : 0
}

/** List page — tabs: all | processing | shipped | delivered | returned | cancelled */
export type OrdersListStatus =
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'returned'
    | 'cancelled'

export interface OrdersListOrderItem {
    id: string
    name: string
    imageUrl: string
    imageAlt: string
    qty: number
    unitPrice: number
}

export interface OrdersListOrder {
    id: string
    reference: string
    date: string
    total: number
    currency: string
    status: OrdersListStatus
    items: OrdersListOrderItem[]
}

function apiStatusToListStatus(raw: string | null | undefined): OrdersListStatus {
    const s = (raw || '').trim().toLowerCase()
    if (s === 'shipped') return 'shipped'
    if (s === 'delivered') return 'delivered'
    if (s === 'returned') return 'returned'
    if (s === 'cancelled' || s === 'canceled') return 'cancelled'
    /* Pending, Processing, unknown */
    return 'processing'
}

function formatListDate(iso: string | undefined): string {
    if (!iso) return '—'
    try {
        return new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }).format(new Date(iso))
    } catch {
        return iso
    }
}

function mapLineItem(it: ApiOrderItem): OrdersListOrderItem {
    return {
        id: String(it.id),
        name: it.product_name || 'Product',
        imageUrl: PLACEHOLDER_IMG,
        imageAlt: it.product_name || 'Product',
        qty: it.quantity,
        unitPrice: num(it.unit_price),
    }
}

export function mapApiOrdersToListOrders(orders: ApiOrder[], currency = 'GHS'): OrdersListOrder[] {
    return orders.map((o) => ({
        id: String(o.id),
        reference: `#${String(o.id).slice(0, 8).toUpperCase()}`,
        date: formatListDate(o.created_at),
        total: num(o.total_amount),
        currency,
        status: apiStatusToListStatus(o.order_status),
        items: (o.items || []).map(mapLineItem),
    }))
}

/** Detail page */
export type OrderDetailStatusUi =
    | 'processing'
    | 'confirmed'
    | 'shipped'
    | 'delivered'
    | 'reviewed'

export interface OrderDetailLineItem {
    id: string
    name: string
    variant: string
    qty: number
    unitPrice: number
    imageUrl: string
    imageAlt: string
    productSlug: string
}

export interface OrderDetailUi {
    id: string
    reference: string
    placedDate: string
    status: OrderDetailStatusUi
    timelineStep: number
    items: OrderDetailLineItem[]
    subtotal: number
    shipping: number
    tax: number
    total: number
    paymentMethod: string
    shippingAddress: {
        name: string
        line1: string
        line2?: string
        city: string
        state: string
        zip: string
        country: string
        phone?: string
    }
    trackingNumber?: string
    carrier?: string
    estimatedDelivery?: string
    canReview: boolean
}

function detailStatusFromApi(raw: string | null | undefined): OrderDetailStatusUi {
    const s = (raw || '').trim().toLowerCase()
    if (s === 'shipped') return 'shipped'
    if (s === 'delivered') return 'delivered'
    return 'processing'
}

function timelineStepForStatus(st: OrderDetailStatusUi): number {
    switch (st) {
        case 'processing':
            return 0
        case 'confirmed':
            return 1
        case 'shipped':
            return 2
        case 'delivered':
            return 3
        case 'reviewed':
            return 4
        default:
            return 0
    }
}

function formatDetailDate(iso: string | undefined): string {
    if (!iso) return '—'
    try {
        return new Intl.DateTimeFormat(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(new Date(iso))
    } catch {
        return iso
    }
}

export function mapApiOrderToDetail(o: ApiOrder, currency = 'GHS'): OrderDetailUi {
    const items = o.items || []
    const subtotal = items.reduce((acc, it) => acc + num(it.total_price), 0)
    const total = num(o.total_amount)
    const shipping = 0
    const tax = Math.max(0, total - subtotal)
    const st = detailStatusFromApi(o.order_status)

    const productHref = (pid: string | null) =>
        pid ? `/products/${pid}` : '/products'

    return {
        id: String(o.id),
        reference: `#${String(o.id).slice(0, 8).toUpperCase()}`,
        placedDate: formatDetailDate(o.created_at),
        status: st,
        timelineStep: timelineStepForStatus(st),
        items: items.map((it) => ({
            id: String(it.id),
            name: it.product_name || 'Product',
            variant: "Standard",
            qty: it.quantity,
            unitPrice: num(it.unit_price),
            imageUrl: PLACEHOLDER_IMG,
            imageAlt: it.product_name || 'Product',
            productSlug: productHref(it.product),
        })),
        subtotal,
        shipping,
        tax,
        total: total || subtotal,
        paymentMethod: o.pay_mode || '—',
        shippingAddress: {
            name: 'Delivery',
            line1:
                o.address_id != null
                    ? `Saved address #${o.address_id}`
                    : 'Address on file',
            city: '—',
            state: '—',
            zip: '—',
            country: '—',
            phone: o.phone != null ? String(o.phone) : undefined,
        },
        trackingNumber: undefined,
        carrier: undefined,
        estimatedDelivery: o.estimated_delivery_date
            ? formatListDate(o.estimated_delivery_date)
            : undefined,
        canReview: st === 'delivered',
    }
}
