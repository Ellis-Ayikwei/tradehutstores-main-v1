import {
    IconBolt,
    IconBuildingStore,
    IconCheck,
    IconGift,
    IconPercentage,
    IconReceipt2,
    IconShoppingCart,
    IconTruck,
} from '@tabler/icons-react';
import React from 'react';
import { DiscountType, PromoCode } from '../../../services/promosAdminService';
import { DISCOUNT_TYPES } from '../../../services/promosAdminService';

export const inputCls =
    'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-on-surface dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition';

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
    label,
    hint,
    children,
}) => (
    <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-500 mb-1.5">
            {label}
        </label>
        {children}
        {hint && <p className="mt-1 text-[11px] text-on-surface-variant dark:text-gray-500">{hint}</p>}
    </div>
);

export const Alert: React.FC<{ tone?: 'error' | 'info' | 'warn'; children: React.ReactNode }> = ({
    tone = 'error',
    children,
}) => {
    const cls =
        tone === 'error'
            ? 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-200'
            : tone === 'warn'
              ? 'border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200'
              : 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-200';
    return <div className={`rounded-lg border px-4 py-3 text-sm ${cls}`}>{children}</div>;
};

export const EmptyState: React.FC<{
    icon: React.ReactNode;
    title: string;
    body: string;
    action?: React.ReactNode;
}> = ({ icon, title, body, action }) => (
    <div className="text-center py-16 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white/40 dark:bg-gray-900/40">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-3">
            {icon}
        </div>
        <h3 className="font-bold text-on-surface dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-on-surface-variant dark:text-gray-500 max-w-sm mx-auto">{body}</p>
        {action && <div className="mt-5">{action}</div>}
    </div>
);

export const ModalShell: React.FC<{
    title: string;
    onClose: () => void;
    onSave: () => void;
    saving: boolean;
    saveLabel?: string;
    width?: 'md' | 'lg' | 'xl';
    children: React.ReactNode;
    icon?: React.ReactNode;
}> = ({ title, onClose, onSave, saving, saveLabel = 'Save', width = 'lg', children, icon }) => {
    const widthCls = width === 'xl' ? 'max-w-5xl' : width === 'lg' ? 'max-w-3xl' : 'max-w-xl';
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl ${widthCls} w-full max-h-[92vh] flex flex-col`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
                    <div className="flex items-center gap-3">
                        {icon}
                        <h2 className="text-lg font-bold text-on-surface dark:text-white">{title}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-on-surface-variant"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">{children}</div>
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-800/30">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-700 text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-60 shadow"
                    >
                        {saving ? 'Saving…' : saveLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Discount type icons / badges ────────────────────────────────────────────

export const DISCOUNT_ICONS: Record<DiscountType, React.ComponentType<{ size?: number }>> = {
    percentage: IconPercentage,
    fixed_amount: IconReceipt2,
    free_shipping: IconTruck,
    buy_x_get_y: IconGift,
    fixed_price: IconShoppingCart,
};

export const DiscountBadge: React.FC<{ promo: PromoCode }> = ({ promo }) => {
    const meta = DISCOUNT_TYPES.find((d) => d.value === promo.discount_type);
    const Icon = DISCOUNT_ICONS[promo.discount_type] || IconPercentage;
    return (
        <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-white shadow-sm"
            style={{ backgroundColor: meta?.color || '#6366f1' }}
        >
            <Icon size={11} />
            {promo.discount_label}
        </span>
    );
};

export const ScopeBadge: React.FC<{ promo: PromoCode }> = ({ promo }) => {
    if (promo.is_seller_scoped) {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                <IconBuildingStore size={10} />
                {promo.seller_name || 'seller'}
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
            platform
        </span>
    );
};

export const StatusBadge: React.FC<{ promo: PromoCode }> = ({ promo }) => {
    if (promo.is_live) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                LIVE
            </span>
        );
    }
    if (promo.is_active) {
        return (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                READY
            </span>
        );
    }
    return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            OFF
        </span>
    );
};

export const UsageBar: React.FC<{ promo: PromoCode }> = ({ promo }) => {
    if (!promo.max_redemptions) {
        return (
            <span className="text-xs text-on-surface-variant">
                {promo.current_redemptions} uses · ∞
            </span>
        );
    }
    const pct = Math.min(100, (promo.current_redemptions / promo.max_redemptions) * 100);
    const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
    return (
        <div className="space-y-1 min-w-[140px]">
            <div className="flex items-center justify-between text-[11px]">
                <span className="text-on-surface-variant">
                    <strong className="text-on-surface dark:text-white">{promo.current_redemptions}</strong> / {promo.max_redemptions}
                </span>
                <span className="font-bold" style={{ color }}>
                    {pct.toFixed(0)}%
                </span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
};
