'use client'

import Link from 'next/link'
import { useAuthModal } from '@/providers/AuthModalProvider'
import { ErrorPanel, Panel, Skeleton, btnPrimary, btnSecondary } from '@/components/seller-central/ui'

/** Skeleton shaped like the shell (rail + content) so nothing jumps when the profile arrives. */
export function ShellSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading Seller Central" className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-4">
            <div className="hidden lg:block">
                <Skeleton className="h-80" />
            </div>
            <div className="space-y-3">
                <Skeleton className="h-24 lg:hidden" />
                <Skeleton className="h-8 w-48" />
                <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-20" />
                    ))}
                </div>
                <Skeleton className="h-56" />
            </div>
        </div>
    )
}

export function SignedOutPrompt() {
    const { openAuthModal } = useAuthModal()
    return (
        <div className="mx-auto max-w-lg">
            <Panel title="Sign in to manage your store" bodyClassName="space-y-3 p-3 text-sm text-zinc-700 dark:text-zinc-300 sm:p-4">
                <p>Seller Central is where you manage your listings, orders and store settings. Sign in with the account you use to sell on TradeHut.</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => openAuthModal('login')} className={btnPrimary}>
                        Sign in
                    </button>
                    <Link href="/sell" className={btnSecondary}>
                        Apply to sell
                    </Link>
                </div>
            </Panel>
        </div>
    )
}

export function RedirectToApply() {
    return (
        <div className="mx-auto max-w-lg">
            <Panel title="You don't have a seller account yet" bodyClassName="space-y-3 p-3 text-sm text-zinc-700 dark:text-zinc-300 sm:p-4">
                <p role="status">Taking you to the seller application.</p>
                <Link href="/sell" className={btnPrimary}>
                    Go to the application
                </Link>
            </Panel>
        </div>
    )
}

export function ShellError({ message, onRetry, retrying }: { message: string; onRetry: () => void; retrying: boolean }) {
    return (
        <div className="mx-auto max-w-lg">
            <ErrorPanel title="We couldn't load your store" message={message} onRetry={onRetry} retrying={retrying} />
        </div>
    )
}
