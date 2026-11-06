import type { Metadata } from 'next'
import RequestsList from '@/components/RFQ/RequestsList'

export const metadata: Metadata = {
    title: 'My requests | TradeHut',
}

export default function AccountRequestsPage() {
    return <RequestsList />
}
