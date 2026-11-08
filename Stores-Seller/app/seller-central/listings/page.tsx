import type { Metadata } from 'next'
import ListingsTable from '@/components/seller-central/listings/ListingsTable'

export const metadata: Metadata = {
    title: 'Listings | Seller Central',
}

export default function SellerListingsPage() {
    return <ListingsTable />
}
