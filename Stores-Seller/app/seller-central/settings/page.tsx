import { Suspense } from 'react'
import type { Metadata } from 'next'
import SettingsView, { SettingsSkeleton } from '@/components/seller-central/settings/SettingsView'

export const metadata: Metadata = {
    title: 'Store settings | Seller Central',
}

export default function SellerSettingsPage() {
    return (
        <Suspense fallback={<SettingsSkeleton />}>
            <SettingsView />
        </Suspense>
    )
}
