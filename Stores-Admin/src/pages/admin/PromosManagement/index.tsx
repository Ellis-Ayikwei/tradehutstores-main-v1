import React, { useCallback, useEffect, useState } from 'react';
import { Building2, History, Receipt, Tag, Ticket, Zap } from 'lucide-react';
import { PageHeader } from '@/components/shadcn/page-header';
import { StatCard } from '@/components/shadcn/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { PromoStats, adminPromoStats, promosAdminErrorMessage } from '@/services/promosAdminService';
import CodesTab from './CodesTab';
import RedemptionsTab from './RedemptionsTab';
import { Alert } from './_shared';

function formatCompact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return Math.round(n).toString();
}

const PromosManagement: React.FC = () => {
    const [stats, setStats] = useState<PromoStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);

    const loadStats = useCallback(async () => {
        try {
            setLoadingStats(true);
            setStatsError(null);
            setStats(await adminPromoStats());
        } catch (e) {
            setStatsError(promosAdminErrorMessage(e));
        } finally {
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <PageHeader
                title="Promo codes"
                description="Run discounts platform-wide or scope them to a single seller, and track every redemption."
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard
                    icon={Tag}
                    label="Total codes"
                    value={stats?.total_codes ?? 0}
                    hint={stats ? `${stats.active_codes} active` : undefined}
                    isLoading={loadingStats}
                />
                <StatCard icon={Zap} label="Platform codes" value={stats?.platform_codes ?? 0} hint="Run by ops / marketing" isLoading={loadingStats} />
                <StatCard icon={Building2} label="Seller codes" value={stats?.seller_codes ?? 0} hint="Created by individual sellers" isLoading={loadingStats} />
                <StatCard
                    icon={Receipt}
                    label="Discount given · 30d"
                    value={`GHS ${formatCompact(stats?.discount_given_30d ?? 0)}`}
                    hint={stats ? `${formatCompact(stats.redemptions_30d)} redemptions` : undefined}
                    isLoading={loadingStats}
                />
            </div>

            {statsError ? <Alert>Couldn't load stats: {statsError}</Alert> : null}

            <Tabs defaultValue="codes" className="space-y-4">
                <TabsList className="h-auto w-full sm:w-fit">
                    <TabsTrigger value="codes" className="py-1.5">
                        <Ticket aria-hidden="true" /> Codes
                    </TabsTrigger>
                    <TabsTrigger value="redemptions" className="py-1.5">
                        <History aria-hidden="true" /> Redemptions
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="codes">
                    <CodesTab onChange={loadStats} />
                </TabsContent>
                <TabsContent value="redemptions">
                    <RedemptionsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default PromosManagement;
