'use client'

import { useEffect, useState } from 'react'
import useAuthUser from 'react-auth-kit/hooks/useAuthUser'
import { useSellerStatus } from '@/hooks/useSellerStatus'
import ApplicationForm from '@/components/seller-onboarding/ApplicationForm'
import SignedOutPitch from '@/components/seller-onboarding/SignedOutPitch'
import {
    PendingScreen,
    RejectedScreen,
    StatusError,
    StatusSkeleton,
    SuspendedScreen,
    VerifiedScreen,
} from '@/components/seller-onboarding/StatusScreens'

type Mode = 'new' | 'resubmit'

export default function SellPageClient() {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const seller = useSellerStatus({ revalidateOnFocus: true })
    const authUser = useAuthUser<{ email?: string } | null>()

    const [editing, setEditing] = useState(false)
    // Set while a profile exists but its documents are still uploading, so the
    // form (with retry for failed uploads) stays on screen across status refreshes.
    const [lockedMode, setLockedMode] = useState<Mode | null>(null)

    if (!mounted) return <StatusSkeleton />
    if (!seller.isAuthenticated) return <SignedOutPitch />

    const formMode: Mode | null = lockedMode ?? (seller.status === 'none' ? 'new' : seller.status === 'rejected' && editing ? 'resubmit' : null)

    if (formMode) {
        return (
            <ApplicationForm
                key={formMode}
                mode={formMode}
                profile={formMode === 'resubmit' ? seller.profile : null}
                documents={formMode === 'resubmit' ? seller.documents : []}
                missingDocuments={formMode === 'resubmit' ? seller.missingDocuments : []}
                defaultEmail={authUser?.email ?? ''}
                onLock={(locked) => setLockedMode(locked ? formMode : null)}
                onFinished={async () => {
                    const result = await seller.refresh()
                    setEditing(false)
                    return result
                }}
                onCancel={() => setEditing(false)}
            />
        )
    }

    if (seller.error) return <StatusError onRetry={() => void seller.refresh()} />
    if (!seller.resolved || seller.status === 'unknown') return <StatusSkeleton />

    switch (seller.status) {
        case 'pending':
            return (
                <PendingScreen
                    missing={seller.missingDocuments}
                    documents={seller.documents}
                    onRefresh={seller.refresh}
                />
            )
        case 'rejected':
            return (
                <RejectedScreen
                    notes={seller.notes}
                    canResubmit={seller.canResubmit}
                    onEdit={() => setEditing(true)}
                />
            )
        case 'suspended':
            return <SuspendedScreen />
        case 'verified':
            return <VerifiedScreen />
        default:
            return <StatusSkeleton />
    }
}
