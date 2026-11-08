import { Suspense } from 'react'
import type { Metadata } from 'next'
import OrdersView from '@/components/seller-central/orders/OrdersView'

export const metadata: Metadata = {
    title: 'Orders | Seller Central',
}

function OrdersFallback() {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="Loading orders">
            <div className="h-12 w-40 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-72 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
        </div>
    )
}

export default function SellerOrdersPage() {
    return (
        <Suspense fallback={<OrdersFallback />}>
            <OrdersView />
        </Suspense>
    )
}
