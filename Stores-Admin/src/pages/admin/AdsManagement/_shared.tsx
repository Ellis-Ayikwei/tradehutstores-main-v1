/**
 * Shared building blocks for the Ads admin pages — color swatch picker,
 * format icons, status badges, live ad previews.
 */
import {
    IconBolt,
    IconBuildingStore,
    IconCheck,
    IconColorSwatch,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconDeviceTablet,
    IconLayoutBottombar,
    IconLayoutNavbar,
    IconLayoutSidebar,
    IconNote,
    IconPhotoVideo,
    IconRectangle,
    IconWindowMaximize,
} from '@tabler/icons-react';
import React from 'react';
import type {
    Creative,
    PlacementFormat,
    CampaignStatus,
} from '../../../services/adsAdminService';
import { CAMPAIGN_STATUSES } from '../../../services/adsAdminService';

// ── Inputs ──────────────────────────────────────────────────────────────────

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

// ── Color swatch picker ─────────────────────────────────────────────────────

export type ColorPreset = { name: string; value: string };

export const BACKGROUND_PRESETS: ColorPreset[] = [
    { name: 'None', value: '' },
    { name: 'White', value: '#ffffff' },
    { name: 'Cream', value: '#fff8f6' },
    { name: 'Honey', value: '#fff7ed' },
    { name: 'Sky', value: '#eff6ff' },
    { name: 'Mint', value: '#ecfdf5' },
    { name: 'Lavender', value: '#f5f3ff' },
    { name: 'Slate light', value: '#f1f5f9' },
    { name: 'Charcoal', value: '#1f2937' },
    { name: 'Midnight', value: '#0f172a' },
    { name: 'TradeHut orange', value: '#a43d00' },
    { name: 'Bid green', value: '#006c4b' },
    { name: 'Sunset', value: 'linear-gradient(90deg,#f97316,#dc2626)' },
    { name: 'Royal', value: 'linear-gradient(90deg,#4f46e5,#7c3aed,#db2777)' },
    { name: 'Aurora', value: 'linear-gradient(90deg,#10b981,#06b6d4,#4f46e5)' },
];

export const ACCENT_PRESETS: ColorPreset[] = [
    { name: 'None', value: '' },
    { name: 'TradeHut', value: '#a43d00' },
    { name: 'Flame', value: '#f5620f' },
    { name: 'Sunset', value: '#f97316' },
    { name: 'Crimson', value: '#dc2626' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Bid green', value: '#006c4b' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'RFQ blue', value: '#0058ca' },
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Violet', value: '#7c3aed' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Yellow', value: '#fbbf24' },
    { name: 'Slate', value: '#475569' },
];

export const TEXT_PRESETS: ColorPreset[] = [
    { name: 'White', value: '#ffffff' },
    { name: 'Black', value: '#0f172a' },
    { name: 'Charcoal', value: '#1f2937' },
    { name: 'Slate', value: '#475569' },
    { name: 'Cream', value: '#fef3c7' },
];

export const ColorSwatchPicker: React.FC<{
    value: string;
    presets: ColorPreset[];
    onChange: (v: string) => void;
}> = ({ value, presets, onChange }) => {
    const matched = presets.find((p) => p.value.toLowerCase() === value.toLowerCase());
    const isCustom = !!value && !matched;

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => {
                    const selected = (p.value || '') === (matched?.value || (value ? '' : ''));
                    const isNone = p.value === '';
                    const swatchStyle: React.CSSProperties = {};
                    if (!isNone) {
                        if (p.value.includes('gradient')) swatchStyle.backgroundImage = p.value;
                        else swatchStyle.backgroundColor = p.value;
                    }
                    return (
                        <button
                            key={p.name + p.value}
                            type="button"
                            onClick={() => onChange(p.value)}
                            title={`${p.name}${p.value ? ` · ${p.value}` : ''}`}
                            className={[
                                'relative h-8 w-8 rounded-full border-2 transition shrink-0',
                                selected
                                    ? 'border-primary ring-2 ring-primary/30 scale-110'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:scale-105',
                                isNone ? 'bg-white dark:bg-gray-800' : '',
                            ].join(' ')}
                            style={swatchStyle}
                        >
                            {isNone && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="block h-px w-5 rotate-45 bg-gray-400" />
                                </span>
                            )}
                            {selected && !isNone && (
                                <IconCheck size={14} className="absolute inset-0 m-auto text-white drop-shadow" />
                            )}
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center gap-2">
                <span
                    className="h-7 w-7 rounded-md border border-gray-300 dark:border-gray-700 shrink-0"
                    style={
                        value.includes('gradient')
                            ? { backgroundImage: value }
                            : { backgroundColor: value || 'transparent' }
                    }
                />
                <input
                    className={`${inputCls} font-mono text-xs flex-1`}
                    value={value}
                    placeholder="#a43d00 or linear-gradient(...)"
                    onChange={(e) => onChange(e.target.value)}
                />
                {isCustom && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="text-xs font-semibold text-on-surface-variant hover:text-error transition px-2 py-1"
                    >
                        Clear
                    </button>
                )}
            </div>
            <p className="text-[11px] text-on-surface-variant dark:text-gray-500">
                {matched ? matched.name : isCustom ? `Custom · ${value}` : 'No color (uses default surface)'}
            </p>
        </div>
    );
};

// ── Format icons ────────────────────────────────────────────────────────────

export const FORMAT_ICONS: Record<PlacementFormat, React.ComponentType<{ size?: number }>> = {
    banner: IconRectangle,
    carousel: IconPhotoVideo,
    modal: IconWindowMaximize,
    topbar: IconLayoutNavbar,
    sidebar: IconLayoutSidebar,
    inline_card: IconNote,
    fullscreen: IconColorSwatch,
};

export const FORMAT_LOCATION_HINT: Record<PlacementFormat, string> = {
    banner: 'A horizontal image strip embedded in a page.',
    carousel: 'Multiple banners that auto-rotate. Set rotation_seconds.',
    modal: 'Centered popup over a dimmed backdrop. Best for sign-up offers.',
    topbar: 'Sticky thin strip above the navbar. Site-wide.',
    sidebar: 'Vertical card in the left/right column of category & PDP pages.',
    inline_card: 'Card embedded between content sections.',
    fullscreen: 'Full-viewport overlay. Use sparingly — high friction.',
};

// ── Status badges ───────────────────────────────────────────────────────────

export const StatusBadge: React.FC<{ status: CampaignStatus }> = ({ status }) => {
    const meta = CAMPAIGN_STATUSES.find((s) => s.value === status);
    const isRunning = status === 'running';
    return (
        <span
            className={[
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-sm',
                isRunning ? 'animate-pulse-soft' : '',
            ].join(' ')}
            style={{ backgroundColor: meta?.color }}
        >
            {isRunning && <IconBolt size={10} />}
            {meta?.label || status}
        </span>
    );
};

export const LiveDot: React.FC<{ on?: boolean; label?: string }> = ({ on = true, label }) => (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold">
        <span className="relative flex h-2 w-2">
            {on && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                    on ? 'bg-emerald-500' : 'bg-gray-400'
                }`}
            />
        </span>
        {label || (on ? 'Live' : 'Off')}
    </span>
);

// ── Device chip ─────────────────────────────────────────────────────────────

export const DeviceIcon: React.FC<{ device: 'mobile' | 'tablet' | 'desktop'; size?: number }> = ({
    device,
    size = 14,
}) => {
    const Icon =
        device === 'mobile' ? IconDeviceMobile : device === 'tablet' ? IconDeviceTablet : IconDeviceDesktop;
    return <Icon size={size} />;
};

// ── Live ad preview (renders the creative the way the storefront would) ─────

interface PreviewProps {
    creative: {
        eyebrow: string;
        headline: string;
        subheadline: string;
        cta_label: string;
        background_color: string;
        text_color: string;
        accent_color: string;
        image_desktop_url?: string | null;
        image_desktop_preview?: string | null;
    };
    variant?: PlacementFormat;
}

export const LivePreview: React.FC<PreviewProps> = ({ creative, variant = 'banner' }) => {
    const bg = creative.background_color || '#1f2937';
    const fg = creative.text_color || '#ffffff';
    const accent = creative.accent_color || '#fbbf24';
    const image = creative.image_desktop_preview || creative.image_desktop_url || '';
    const isGradient = bg.includes('gradient');

    if (variant === 'topbar') {
        return (
            <div
                className="rounded-lg overflow-hidden"
                style={{
                    background: isGradient ? bg : undefined,
                    backgroundColor: isGradient ? undefined : bg,
                    color: fg,
                }}
            >
                <div className="flex items-center justify-center gap-3 px-4 py-2 text-xs font-medium">
                    {creative.eyebrow && (
                        <span className="font-bold uppercase tracking-wider text-[10px] shrink-0">
                            {creative.eyebrow}
                        </span>
                    )}
                    <span className="truncate">{creative.headline || '(headline)'}</span>
                    {creative.cta_label && (
                        <span
                            className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap"
                            style={{ borderColor: `${accent}55`, backgroundColor: 'rgba(255,255,255,0.22)' }}
                        >
                            {creative.cta_label}
                        </span>
                    )}
                </div>
            </div>
        );
    }

    if (variant === 'modal') {
        return (
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 dark:border-gray-800 max-w-md mx-auto">
                {image && (
                    <div className="aspect-[16/10] bg-gray-100 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={image} alt="" className="w-full h-full object-cover" />
                    </div>
                )}
                <div
                    className="p-7 text-center"
                    style={{
                        background: isGradient ? bg : undefined,
                        backgroundColor: isGradient ? undefined : bg,
                        color: fg,
                    }}
                >
                    {creative.eyebrow && (
                        <span
                            className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] mb-3 px-3 py-1 rounded-full"
                            style={{ backgroundColor: accent, color: '#fff' }}
                        >
                            {creative.eyebrow}
                        </span>
                    )}
                    <h2 className="text-2xl font-bold leading-tight">{creative.headline || '(headline)'}</h2>
                    {creative.subheadline && (
                        <p className="mt-2 text-sm opacity-80">{creative.subheadline}</p>
                    )}
                    {creative.cta_label && (
                        <button
                            type="button"
                            className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold shadow-md"
                            style={{ backgroundColor: accent, color: '#ffffff' }}
                        >
                            {creative.cta_label} →
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Default: banner / carousel / inline_card / etc.
    return (
        <div
            className="relative rounded-2xl overflow-hidden shadow-md aspect-[21/5] w-full"
            style={{
                background: isGradient ? bg : undefined,
                backgroundColor: isGradient ? undefined : bg,
                color: fg,
            }}
        >
            {image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                    src={image}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-90"
                />
            )}
            <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 bg-gradient-to-r from-black/55 via-black/25 to-transparent">
                {creative.eyebrow && (
                    <span
                        className="inline-block w-fit text-[10px] font-bold uppercase tracking-[0.2em] mb-2 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: accent, color: '#fff' }}
                    >
                        {creative.eyebrow}
                    </span>
                )}
                <h3 className="text-lg sm:text-2xl font-bold leading-tight max-w-md drop-shadow-lg">
                    {creative.headline || '(headline)'}
                </h3>
                {creative.subheadline && (
                    <p className="mt-1 text-xs sm:text-sm opacity-90 max-w-md line-clamp-2">
                        {creative.subheadline}
                    </p>
                )}
                {creative.cta_label && (
                    <span
                        className="mt-3 inline-flex items-center gap-1.5 self-start px-4 py-1.5 rounded-full text-xs font-bold shadow"
                        style={{ backgroundColor: accent, color: '#ffffff' }}
                    >
                        {creative.cta_label} →
                    </span>
                )}
            </div>
        </div>
    );
};

// ── Modal shell ─────────────────────────────────────────────────────────────

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
    const widthCls =
        width === 'xl' ? 'max-w-5xl' : width === 'lg' ? 'max-w-3xl' : 'max-w-xl';
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

// ── Empty state ─────────────────────────────────────────────────────────────

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

// ── Inline alert ────────────────────────────────────────────────────────────

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

// Helper to summarise a creative for the preview
export function creativeAsPreview(c: Partial<Creative>) {
    return {
        eyebrow: c.eyebrow ?? '',
        headline: c.headline ?? '',
        subheadline: c.subheadline ?? '',
        cta_label: c.cta_label ?? '',
        background_color: c.background_color ?? '',
        text_color: c.text_color ?? '',
        accent_color: c.accent_color ?? '',
        image_desktop_url: c.image_desktop_url ?? null,
    };
}

// Re-export icons used elsewhere so tabs don't have to know which to import
export { IconBuildingStore };
