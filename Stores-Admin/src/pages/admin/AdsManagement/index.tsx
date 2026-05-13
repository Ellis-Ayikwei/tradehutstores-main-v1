import {
    IconBolt,
    IconChartBar,
    IconClick,
    IconEye,
    IconLayoutGrid,
    IconPhoto,
    IconRocket,
    IconSpeakerphone,
    IconTarget,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Campaign,
    adsAdminErrorMessage,
    fetchCampaigns,
    fetchPlacements,
    fetchSlots,
} from '../../../services/adsAdminService';
import CampaignsTab from './CampaignsTab';
import CreativesTab from './CreativesTab';
import PlacementsTab from './PlacementsTab';
import SlotsTab from './SlotsTab';

type Tab = 'campaigns' | 'creatives' | 'placements' | 'slots';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }>; description: string }[] = [
    {
        id: 'campaigns',
        label: 'Campaigns',
        icon: IconSpeakerphone,
        description: 'Umbrella for an advertiser push (status, schedule, budget caps).',
    },
    {
        id: 'creatives',
        label: 'Creatives',
        icon: IconPhoto,
        description: 'The visual + copy + CTA. Reusable across placements.',
    },
    {
        id: 'placements',
        label: 'Placements',
        icon: IconLayoutGrid,
        description: 'Slots on the storefront (homepage top bar, modal, footer, etc).',
    },
    {
        id: 'slots',
        label: 'Slots & Targeting',
        icon: IconTarget,
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

const AdsManagement: React.FC = () => {
    const [tab, setTab] = useState<Tab>('campaigns');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(true);
    const [statsError, setStatsError] = useState<string | null>(null);

    const loadStats = useCallback(async () => {
        try {
            setLoadingStats(true);
            setStatsError(null);
            const [camps, placements, slots] = await Promise.all([
                fetchCampaigns(),
                fetchPlacements(),
                fetchSlots(),
            ]);
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

    const headlineNumber = useMemo(() => {
        if (!stats) return '—';
        if (stats.liveSlots === 0) return 'No live ads';
        return `${stats.liveSlots} live ad${stats.liveSlots === 1 ? '' : 's'}`;
    }, [stats]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* ── Hero ──────────────────────────────────────────────── */}
                <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="relative px-6 md:px-8 py-6 md:py-8 bg-gradient-to-br from-primary/5 via-transparent to-primary/10">
                        <div className="flex items-start justify-between gap-6 flex-wrap">
                            <div className="flex items-start gap-4 min-w-0">
                                <div className="p-3 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                                    <IconRocket size={28} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                                        Ads & Promotions
                                    </p>
                                    <h1 className="text-2xl md:text-3xl font-bold text-on-surface dark:text-white">
                                        {headlineNumber}{' '}
                                        <span className="text-on-surface-variant font-normal text-xl md:text-2xl">
                                            across the storefront
                                        </span>
                                    </h1>
                                    <p className="mt-2 text-sm text-on-surface-variant dark:text-gray-400 max-w-2xl">
                                        Run sponsored campaigns across every placement — banners, carousels, top
                                        bars, modals, footers — with weighted slots, geo + device + user targeting,
                                        frequency caps, and live impression / click tracking.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Dashboard cards ───────────────────────────── */}
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard
                                icon={<IconBolt size={18} />}
                                label="Live ads"
                                value={loadingStats ? '…' : stats?.liveSlots ?? 0}
                                hint={
                                    stats
                                        ? `${stats.pausedSlots} paused`
                                        : ''
                                }
                                tone="emerald"
                            />
                            <StatCard
                                icon={<IconSpeakerphone size={18} />}
                                label="Running campaigns"
                                value={loadingStats ? '…' : stats?.runningCampaigns ?? 0}
                                hint={
                                    stats
                                        ? `${stats.activeCampaigns} active total`
                                        : ''
                                }
                                tone="blue"
                            />
                            <StatCard
                                icon={<IconEye size={18} />}
                                label="Impressions · 30d"
                                value={loadingStats ? '…' : formatCompact(stats?.impressions30d ?? 0)}
                                hint={`${formatCompact(stats?.clicks30d ?? 0)} clicks`}
                                tone="violet"
                            />
                            <StatCard
                                icon={<IconClick size={18} />}
                                label="Click-through · 30d"
                                value={loadingStats ? '…' : `${stats?.ctr30d ?? 0}%`}
                                hint={
                                    stats?.ctr30d && stats.ctr30d > 1.5
                                        ? '↑ healthy range'
                                        : stats?.ctr30d
                                        ? '↓ tune copy / targeting'
                                        : 'No data yet'
                                }
                                tone="amber"
                            />
                        </div>

                        {/* ── Top campaigns row ─────────────────────────── */}
                        {stats && stats.topCampaigns.length > 0 && (
                            <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-800">
                                <div className="flex items-center gap-2 mb-3">
                                    <IconChartBar size={14} className="text-on-surface-variant" />
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                                        Top performers · 30d
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    {stats.topCampaigns.map((c, i) => (
                                        <div
                                            key={c.id}
                                            className="flex items-center gap-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2.5"
                                        >
                                            <span
                                                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    i === 0
                                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                                        : i === 1
                                                        ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
                                                }`}
                                            >
                                                #{i + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-on-surface dark:text-white truncate">
                                                    {c.name}
                                                </p>
                                                <p className="text-[11px] text-on-surface-variant truncate">
                                                    {formatCompact(c.stats?.impressions ?? 0)} impressions ·{' '}
                                                    {c.stats?.ctr ?? 0}% CTR
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {statsError && (
                            <div className="mt-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                                Couldn't load stats: {statsError}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Tab strip ────────────────────────────────────────── */}
                <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <div className="flex items-stretch overflow-x-auto">
                        {TABS.map((t) => {
                            const Icon = t.icon;
                            const active = tab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setTab(t.id)}
                                    className={[
                                        'group relative flex-1 min-w-[170px] flex items-start gap-3 px-4 py-3 text-left transition-colors',
                                        active
                                            ? 'bg-primary/5 dark:bg-primary/10'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                                    ].join(' ')}
                                >
                                    <div
                                        className={[
                                            'shrink-0 p-2 rounded-lg transition-colors',
                                            active
                                                ? 'bg-primary text-white'
                                                : 'bg-gray-100 dark:bg-gray-800 text-on-surface-variant group-hover:bg-primary/10 group-hover:text-primary',
                                        ].join(' ')}
                                    >
                                        <Icon size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p
                                            className={[
                                                'text-sm font-bold whitespace-nowrap',
                                                active ? 'text-primary' : 'text-on-surface dark:text-white',
                                            ].join(' ')}
                                        >
                                            {t.label}
                                        </p>
                                        <p className="text-[11px] text-on-surface-variant line-clamp-2 mt-0.5">
                                            {t.description}
                                        </p>
                                    </div>
                                    {active && (
                                        <span className="absolute left-0 top-0 h-full w-0.5 bg-primary" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Tab body ─────────────────────────────────────────── */}
                <div>
                    {tab === 'campaigns' && <CampaignsTab onChange={loadStats} />}
                    {tab === 'creatives' && <CreativesTab onChange={loadStats} />}
                    {tab === 'placements' && <PlacementsTab onChange={loadStats} />}
                    {tab === 'slots' && <SlotsTab onChange={loadStats} />}
                </div>
            </div>
        </div>
    );
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number | string;
    hint?: string;
    tone?: 'emerald' | 'blue' | 'violet' | 'amber';
}> = ({ icon, label, value, hint, tone = 'emerald' }) => {
    const toneCls = {
        emerald: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400',
        blue: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',
        violet: 'text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400',
        amber: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400',
    }[tone];
    return (
        <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-500">
                    {label}
                </span>
                <span className={`p-1.5 rounded-lg ${toneCls}`}>{icon}</span>
            </div>
            <p className="text-2xl font-bold text-on-surface dark:text-white leading-tight">{value}</p>
            {hint && <p className="text-[11px] text-on-surface-variant dark:text-gray-500 mt-1">{hint}</p>}
        </div>
    );
};

function formatCompact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

export default AdsManagement;
