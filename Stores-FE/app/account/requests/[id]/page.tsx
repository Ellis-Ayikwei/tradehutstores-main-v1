import type { Metadata } from 'next'
import { Suspense } from 'react'
import RequestDetail from '@/components/RFQ/RequestDetail'

export const metadata: Metadata = {
    title: 'Request | TradeHut',
}

export default function AccountRequestDetailPage() {
    return (
        <Suspense fallback={null}>
            <RequestDetail />
        </Suspense>
    )
}
