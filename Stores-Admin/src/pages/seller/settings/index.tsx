import { Store } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/shadcn/card';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { ErrorPanel } from '../components/ErrorPanel';
import { useSellerProfile } from '../hooks/useSellerProfile';
import { ProfileTab } from './ProfileTab';
import { VerificationTab } from './VerificationTab';

const TABS = ['profile', 'verification'] as const;
type TabId = (typeof TABS)[number];

function SettingsSkeleton() {
    return (
        <div className="space-y-3" aria-busy="true" aria-label="Loading store settings">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-56" />
            <Skeleton className="h-48" />
        </div>
    );
}

export default function SellerSettings() {
    const [params, setParams] = useSearchParams();
    const { profile, error, isLoading, isValidating, mutate, revalidate } = useSellerProfile();

    const requested = params.get('tab');
    const tab: TabId = TABS.includes(requested as TabId) ? (requested as TabId) : 'profile';

    return (
        <div className="space-y-3">
            <PageHeader title="Store settings" description="Your store details and verification" className="pb-0" />

            {isLoading && !profile ? (
                <SettingsSkeleton />
            ) : error && !profile ? (
                error.kind === 'forbidden' || error.kind === 'not_found' ? (
                    <Card>
                        <EmptyState icon={Store} title="No store profile found" description={error.message} />
                    </Card>
                ) : (
                    <ErrorPanel title="We couldn't load your store settings" message={error.message} onRetry={() => void revalidate()} isRetrying={isValidating} />
                )
            ) : profile ? (
                <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
                    <TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
                        <TabsTrigger value="profile">Store profile</TabsTrigger>
                        <TabsTrigger value="verification">Verification</TabsTrigger>
                    </TabsList>
                    {/* Kept mounted (just hidden) so unsaved profile edits survive a tab switch. */}
                    <TabsContent value="profile" forceMount className="mt-3 data-[state=inactive]:hidden">
                        <ProfileTab profile={profile} onSaved={(updated) => void mutate(updated, { revalidate: false })} />
                    </TabsContent>
                    <TabsContent value="verification" className="mt-3">
                        <VerificationTab profile={profile} onChanged={() => mutate()} />
                    </TabsContent>
                </Tabs>
            ) : null}
        </div>
    );
}
