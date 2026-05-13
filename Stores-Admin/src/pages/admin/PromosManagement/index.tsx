import {
    IconBolt,
    IconBuildingStore,
    IconClick,
    IconDiscount2,
    IconHistory,
    IconReceipt2,
    IconTag,
    IconTicket,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';
import {
    PromoStats,
    adminPromoStats,
    promosAdminErrorMessage,
} from '../../../services/promosAdminService';
import CodesTab from './CodesTab';
import RedemptionsTab from './RedemptionsTab';

type Tab = 'codes' | 'redemptions';

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }>; description: string }[] = [
    {
        id: 'codes',
        label: 'Codes',
        icon: IconTicket,
        description: 'Create / edit / pause platform-wide and seller-scoped promo codes.',
    },
    {
        id: 'redemptions',
        label: 'Redemptions',
        icon: IconHistory,
        description: 'Read-only log of every successful promo use across all orders.',
    },
];

const PromosManagement: React.FC = () => {
    const [tab, setTab] = useState<Tab>('codes');
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
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Hero */}
                <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                    <div className="relative px-6 md:px-8 py-6 md:py-8 bg-gradient-to-br from-primary/5 via-transparent to-primary/10">
                        <div className="flex items-start gap-4 min-w-0">
                            <div className="p-3 rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                                <IconDiscount2 size={28} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                                    Promo codes
                                </p>
                                <h1 className="text-2xl md:text-3xl font-bold text-on-surface dark:text-white">
                                    {loadingStats
                                        ? 'Loading…'
                                        : `${stats?.active_codes ?? 0} active code${
                                              stats?.active_codes === 1 ? '' : 's'
                                          }`}{' '}
                                    <span className="text-on-surface-variant font-normal text-xl md:text-2xl">
                                        across the platform
                                    </span>
                                </h1>
                                <p className="mt-2 text-sm text-on-surface-variant dark:text-gray-400 max-w-2xl">
                                    Run discounts at the platform level — or scope them to a specific seller.
                                    Validate, calculate, and atomically redeem at order time. Track every
                                    redemption, every failed attempt, and the revenue each campaign drove.
                                </p>
                            </div>
                        </div>

                        {/* Stat cards */}
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard
                                icon={<IconTag size={18} />}
                                label="Total codes"
                                value={loadingStats ? '…' : stats?.total_codes ?? 0}
                                hint={stats ? `${stats.active_codes} active` : ''}
                                tone="violet"
                            />
                            <StatCard
                                icon={<IconBolt size={18} />}
                                label="Platform codes"
                                value={loadingStats ? '…' : stats?.platform_codes ?? 0}
                                hint="Run by ops / marketing"
                                tone="blue"
                            />
                            <StatCard
                                icon={<IconBuildingStore size={18} />}
                                label="Seller codes"
                                value={loadingStats ? '…' : stats?.seller_codes ?? 0}
                                hint="Created by individual sellers"
                                tone="emerald"
                            />
                            <StatCard
                                icon={<IconReceipt2 size={18} />}
                                label="Discount given · 30d"
                                value={
                                    loadingStats
                                        ? '…'
                                        : `GHS ${formatCompact(stats?.discount_given_30d ?? 0)}`
                                }
                                hint={
                                    stats
                                        ? `${formatCompact(stats.redemptions_30d)} redemptions`
                                        : 'No redemptions yet'
                                }
                                tone="amber"
                            />
                        </div>

                        {statsError && (
                            <div className="mt-4 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-200">
                                Couldn't load stats: {statsError}
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs */}
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
                                        'group relative flex-1 min-w-[200px] flex items-start gap-3 px-4 py-3 text-left transition-colors',
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
                                    {active && <span className="absolute left-0 top-0 h-full w-0.5 bg-primary" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    {tab === 'codes' && <CodesTab onChange={loadStats} />}
                    {tab === 'redemptions' && <RedemptionsTab />}
                </div>
            </div>
        </div>
    );
};

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
    return Math.round(n).toString();
}

export default PromosManagement;
