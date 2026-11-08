'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import { useSellerProfile } from '@/hooks/useSellerProfile'
import { useAuthModal } from '@/providers/AuthModalProvider'
import { RedirectToApply, SignedOutPrompt, ShellError, ShellSkeleton } from './GuardStates'
import { SellerMobileNav, SellerSidebar } from './SellerNav'
import VerificationBanner from './VerificationBanner'

/**
 * Client guard and frame for everything under /seller-central.
 *   not signed in            -> sign-in prompt (and the sign-in modal opens once)
 *   signed in, no profile    -> redirect to /sell
 *   profile failed to load   -> error with retry (401 -> sign-in prompt)
 *   suspended                -> frame renders; the banner says the area is read-only
 *   otherwise                -> rail (lg+) / tab strip (mobile), verification banner, page
 */
export default function SellerCentralShell({ children }: { children: ReactNode }) {
    const router = useRouter()
    const { openAuthModal } = useAuthModal()
    const { mounted, isAuthenticated, notSeller, profile, isLoading, isValidating, error, refresh } = useSellerProfile()

    const askedToSignIn = useRef(false)
    const signedOut = mounted && (!isAuthenticated || error?.kind === 'unauthenticated')

    useEffect(() => {
        if (signedOut && !askedToSignIn.current) {
            askedToSignIn.current = true
            openAuthModal('login')
        }
        if (!signedOut) askedToSignIn.current = false
    }, [signedOut, openAuthModal])

    useEffect(() => {
        if (notSeller) router.replace('/sell')
    }, [notSeller, router])

    let content: ReactNode
    if (!mounted) content = <ShellSkeleton />
    else if (signedOut) content = <SignedOutPrompt />
    else if (notSeller) content = <RedirectToApply />
    else if (error) content = <ShellError message={error.message} code={error.code} onRetry={() => void refresh()} retrying={isValidating} />
    else if (!profile || isLoading) content = <ShellSkeleton />
    else {
        content = (
            <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:items-start lg:gap-4">
                <aside className="hidden lg:block">
                    <SellerSidebar />
                </aside>
                <div className="min-w-0">
                    <SellerMobileNav />
                    <VerificationBanner />
                    {children}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-[60vh] bg-zinc-100 pb-6 dark:bg-zinc-950">
            <div className="mx-auto max-w-screen-2xl px-3 py-3 sm:px-4 lg:px-6 lg:py-4">{content}</div>
        </div>
    )
}
