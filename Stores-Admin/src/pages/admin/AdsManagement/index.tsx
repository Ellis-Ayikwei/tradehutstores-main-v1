import { BarChart3, Eye, LayoutGrid, Image as ImageIcon, Megaphone, MousePointerClick, Target, Zap, type LucideIcon } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/shadcn/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { PageHeader } from '@/components/shadcn/page-header';
import { StatCard } from '@/components/shadcn/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { Campaign, adsAdminErrorMessage, fetchCampaigns, fetchPlacements, fetchSlots } from '../../../services/adsAdminService';
import CampaignsTab from './CampaignsTab';
import CreativesTab from './CreativesTab';
import PlacementsTab from './PlacementsTab';
import SlotsTab from './SlotsTab';
import { Alert } from './_shared';

type Tab = 'campaigns' | 'creatives' | 'placements' | 'slots';

const TABS: { id: Tab; label: string; icon: LucideIcon; description: string }[] = [
    {
        id: 'campaigns',
        label: 'Campaigns',
        icon: Megaphone,
        description: 'Umbrella for an advertiser push (status, schedule, budget caps).',
    },
    {
        id: 'creatives',
        label: 'Creatives',
        icon: ImageIcon,
        description: 'The visual, copy and CTA. Reusable across placements.',
    },
    {
        id: 'placements',
        label: 'Placements',
        icon: LayoutGrid,
        description: 'Slots on the storefront (homepage top bar, modal, footer, etc).',
    },
    {
        id: 'slots',
        label: 'Slots & Targeting',
        icon: Target,
        description: 'Bind a creative into a placement with weight, schedule, frequency caps, targeting.',
    },
];

interface DashboardStats {
    activeCampaigns: number;
    runningCampaigns: number;
    liveSlots: number;
    pausedSlots: number;
    placementsCount: number;
    activePlacements: number;
    impressions30d: number;
    clicks30d: number;
    ctr30d: number;
    topCampaigns: Campaign[];
}

function formatCompact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

const AdsManagement: React.FC = () => {
    const [tab, setTab] = useState<Tab>('campaigns');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);

    const loadStats = useCallback(async () => {
        try {
            setLoadingStats(true);
            setStatsError(null);
            const [camps, placements, slots] = await Promise.all([fetchCampaigns(), fetchPlacements(), fetchSlots()]);
            const running = camps.filter((c) => c.status === 'running');
            const totalImpr = camps.reduce((s, c) => s + (c.stats?.impressions ?? 0), 0);
            const totalClicks = camps.reduce((s, c) => s + (c.stats?.clicks ?? 0), 0);
            const ctr = totalImpr ? (totalClicks / totalImpr) * 100 : 0;
            const topCampaigns = [...camps]
                .filter((c) => (c.stats?.impressions ?? 0) > 0)
                .sort((a, b) => (b.stats?.impressions ?? 0) - (a.stats?.impressions ?? 0))
                .slice(0, 3);
            setStats({
                activeCampaigns: camps.filter((c) => c.status !== 'archived').length,
                runningCampaigns: running.length,
                liveSlots: slots.filter((s) => s.is_live).length,
                pausedSlots: slots.filter((s) => !s.is_active).length,
                placementsCount: placements.length,
                activePlacements: placements.filter((p) => p.is_active).length,
                impressions30d: totalImpr,
                clicks30d: totalClicks,
                ctr30d: Math.round(ctr * 100) / 100,
                topCampaigns,
            });
        } catch (e) {
            setStatsError(adsAdminErrorMessage(e));
        } finally {
            setLoadingStats(false);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const headline = useMemo(() => {
        if (!stats) return 'Run sponsored campaigns across every placement on the storefront.';
        const live = stats.liveSlots === 0 ? 'No live ads' : `${stats.liveSlots} live ad${stats.liveSlots === 1 ? '' : 's'}`;
        return `${live} across the storefront. Weighted slots, targeting, frequency caps and impression / click tracking.`;
    }, [stats]);

    const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0];

    return (
        <div className="mx-auto w-full max-w-7xl space-y-4">
            <PageHeader title="Ads & Promotions" description={headline} />

            {statsError ? (
                <Alert onRetry={loadStats}>Couldn't load stats: {statsError}</Alert>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={Zap}
                    label="Live ads"
                    value={stats?.liveSlots ?? 0}
                    hint={stats ? `${stats.pausedSlots} paused` : undefined}
                    isLoading={loadingStats}
                />
                <StatCard
                    icon={Megaphone}
                    label="Running campaigns"
                    value={stats?.runningCampaigns ?? 0}
                    hint={stats ? `${stats.activeCampaigns} active total` : undefined}
                    isLoading={loadingStats}
                />
                <StatCard
                    icon={Eye}
                    label="Impressions · 30d"
                    value={formatCompact(stats?.impressions30d ?? 0)}
                    hint={`${formatCompact(stats?.clicks30d ?? 0)} clicks`}
                    isLoading={loadingStats}
                />
                <StatCard
                    icon={MousePointerClick}
                    label="Click-through · 30d"
                    value={`${stats?.ctr30d ?? 0}%`}
                    hint={stats?.ctr30d && stats.ctr30d > 1.5 ? 'Healthy range' : stats?.ctr30d ? 'Tune copy or targeting' : 'No data yet'}
                    isLoading={loadingStats}
                />
            </div>

            {stats && stats.topCampaigns.length > 0 ? (
                <Card>
                    <CardHeader className="pb-3 sm:pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                            <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
                            Top performers · 30d
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
                            {stats.topCampaigns.map((c, i) => (
                                <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-muted px-3 py-2.5">
                                    <Badge variant={i === 0 ? 'warning' : 'secondary'} className="shrink-0">
                                        #{i + 1}
                                    </Badge>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {formatCompact(c.stats?.impressions ?? 0)} impressions · {c.stats?.ctr ?? 0}% CTR
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            ) : null}

            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
                <div className="overflow-x-auto pb-1">
                    <TabsList className="h-auto w-max min-w-full justify-start sm:min-w-0">
                        {TABS.map((t) => {
                            const Icon = t.icon;
                            return (
                                <TabsTrigger key={t.id} value={t.id} className="h-8 flex-none px-4">
                                    <Icon aria-hidden />
                                    {t.label}
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{activeTab.description}</p>

                <TabsContent value="campaigns" className="mt-4">
                    <CampaignsTab onChange={loadStats} />
                </TabsContent>
                <TabsContent value="creatives" className="mt-4">
                    <CreativesTab onChange={loadStats} />
                </TabsContent>
                <TabsContent value="placements" className="mt-4">
                    <PlacementsTab onChange={loadStats} />
                </TabsContent>
                <TabsContent value="slots" className="mt-4">
                    <SlotsTab onChange={loadStats} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdsManagement;
