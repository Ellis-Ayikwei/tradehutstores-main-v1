'use client'

import type { KeyboardEvent } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { EmptyPanel, ErrorPanel, PageHeader, Skeleton } from '@/components/seller-central/ui'
import { useSellerProfile } from '@/hooks/useSellerProfile'
import { ProfileTab } from './ProfileTab'
import { VerificationTab } from './VerificationTab'

const TABS = [
    { id: 'profile', label: 'Store profile' },
    { id: 'verification', label: 'Verification' },
] as const
type TabId = (typeof TABS)[number]['id']

function isTabId(value: string | null): value is TabId {
    return TABS.some((t) => t.id === value)
}

export function SettingsSkeleton() {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="Loading store settings">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-11 w-full sm:w-72" />
            <Skeleton className="h-56" />
            <Skeleton className="h-48" />
        </div>
    )
}

export default function SettingsView() {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const { profile, error, isLoading, isValidating, refresh, setProfile } = useSellerProfile()

    const requested = searchParams.get('tab')
    const tab: TabId = isTabId(requested) ? requested : 'profile'

    const selectTab = (next: TabId) => {
        if (next === tab) return
        router.replace(`${pathname}?tab=${next}`, { scroll: false })
    }

    const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
        const current = TABS.findIndex((t) => t.id === tab)
        let nextIndex: number
        if (e.key === 'ArrowRight') nextIndex = (current + 1) % TABS.length
        else if (e.key === 'ArrowLeft') nextIndex = (current - 1 + TABS.length) % TABS.length
        else if (e.key === 'Home') nextIndex = 0
        else if (e.key === 'End') nextIndex = TABS.length - 1
        else return
        e.preventDefault()
        const nextTab = TABS[nextIndex].id
        selectTab(nextTab)
        document.getElementById(`settings-tab-${nextTab}`)?.focus()
    }

    return (
        <div className="space-y-3">
            <PageHeader title="Store settings" description="Your store details and verification" />

            {isLoading && !profile ? (
                <SettingsSkeleton />
            ) : error && !profile ? (
                error.kind === 'forbidden' || error.kind === 'not_found' ? (
                    <EmptyPanel title="No store profile found" description={error.message} />
                ) : (
                    <ErrorPanel
                        title="We couldn't load your store settings"
                        message={error.message}
                        onRetry={() => void refresh()}
                        retrying={isValidating}
                    />
                )
            ) : profile ? (
                <>
                    <div
                        role="tablist"
                        aria-label="Store settings"
                        onKeyDown={onTabKeyDown}
                        className="grid grid-cols-2 border-b border-zinc-200 dark:border-zinc-800 sm:inline-grid sm:grid-cols-[repeat(2,auto)]"
                    >
                        {TABS.map((t) => {
                            const selected = t.id === tab
                            return (
                                <button
                                    key={t.id}
                                    id={`settings-tab-${t.id}`}
                                    type="button"
                                    role="tab"
                                    aria-selected={selected}
                                    aria-controls={`settings-panel-${t.id}`}
                                    tabIndex={selected ? 0 : -1}
                                    onClick={() => selectTab(t.id)}
                                    className={`min-h-[44px] border-b-2 px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 ${
                                        selected
                                            ? 'border-primary-700 text-primary-700 dark:border-primary-400 dark:text-primary-400'
                                            : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            )
                        })}
                    </div>

                    {/* Kept mounted (just hidden) so unsaved profile edits survive a tab switch. */}
                    <div id="settings-panel-profile" role="tabpanel" aria-labelledby="settings-tab-profile" hidden={tab !== 'profile'}>
                        <ProfileTab profile={profile} onSaved={setProfile} />
                    </div>
                    {tab === 'verification' ? (
                        <div id="settings-panel-verification" role="tabpanel" aria-labelledby="settings-tab-verification">
                            <VerificationTab profile={profile} onChanged={refresh} />
                        </div>
                    ) : null}
                </>
            ) : null}
        </div>
    )
}
