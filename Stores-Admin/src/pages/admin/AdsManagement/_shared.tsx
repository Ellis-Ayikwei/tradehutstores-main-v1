/**
 * Shared building blocks for the Ads admin pages: form field, colour swatch
 * picker, format icons, status badges, live ad previews, edit sheet, confirm
 * dialog, empty/error panels.
 */
import {
    AppWindow,
    Check,
    Loader2,
    Maximize,
    Monitor,
    PanelRight,
    PanelTop,
    Images,
    RectangleHorizontal,
    Smartphone,
    StickyNote,
    Tablet,
    Zap,
    type LucideIcon,
} from 'lucide-react';
import React, { useId } from 'react';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState as BaseEmptyState } from '@/components/shadcn/empty-state';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/shadcn/sheet';
import { cn } from '@/lib/utils';
import type { Creative, PlacementFormat, CampaignStatus } from '../../../services/adsAdminService';
import { CAMPAIGN_STATUSES } from '../../../services/adsAdminService';

// ── Form field ──────────────────────────────────────────────────────────────

/**
 * Label + control + hint. When the child is a single element without an `id`
 * one is generated so the label is programmatically associated.
 */
export const Field: React.FC<{
    label: string;
    hint?: string;
    className?: string;
    children: React.ReactNode;
}> = ({ label, hint, className, children }) => {
    const generated = useId();
    let control = children;
    let id: string | undefined;
    if (React.isValidElement(children) && typeof children.type !== 'symbol') {
        const existing = (children.props as { id?: string }).id;
        id = existing ?? generated;
        control = existing ? children : React.cloneElement(children as React.ReactElement<{ id?: string }>, { id });
    }
    return (
        <div className={cn('space-y-1.5', className)}>
            <Label htmlFor={id}>{label}</Label>
            {control}
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
    );
};

const EMPTY_VALUE = '__empty__';

/**
 * Thin wrapper over the shadcn Select. Radix items cannot have an empty-string value, so
 * an option with value '' is mapped to a sentinel and mapped back in onChange.
 */
export const SimpleSelect: React.FC<{
    id?: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
}> = ({ id, value, onChange, options, placeholder, className }) => (
    <Select value={value === '' && options.some((o) => o.value === '') ? EMPTY_VALUE : value} onValueChange={(v) => onChange(v === EMPTY_VALUE ? '' : v)}>
        <SelectTrigger id={id} className={className}>
            <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
            {options.map((o) => (
                <SelectItem key={o.value || EMPTY_VALUE} value={o.value === '' ? EMPTY_VALUE : o.value}>
                    {o.label}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
);

/** Bordered group of related fields inside a sheet. */
export const FormSection: React.FC<{ title: string; icon?: LucideIcon; className?: string; children: React.ReactNode }> = ({
    title,
    icon: Icon,
    className,
    children,
}) => (
    <section className={cn('space-y-4 rounded-2xl border border-border bg-card p-4', className)}>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {Icon ? <Icon className="h-4 w-4 text-muted-foreground" aria-hidden /> : null}
            {title}
        </h3>
        {children}
    </section>
);

/** Switch-style row used for boolean fields. */
export const CheckRow: React.FC<{ id: string; label: string; children: React.ReactNode }> = ({ id, label, children }) => (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
        <Label htmlFor={id}>{label}</Label>
        {children}
    </div>
);

// ── Colour swatch picker ────────────────────────────────────────────────────
// Presets are creative (advertising) colour *data* stored on a creative, not UI theme colours.

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

const swatchStyle = (value: string): React.CSSProperties =>
    value.includes('gradient') ? { backgroundImage: value } : value ? { backgroundColor: value } : {};

export const ColorSwatchPicker: React.FC<{
    value: string;
    presets: ColorPreset[];
    onChange: (v: string) => void;
}> = ({ value, presets, onChange }) => {
    const matched = presets.find((p) => p.value.toLowerCase() === value.toLowerCase());
    const isCustom = !!value && !matched;

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
                {presets.map((p) => {
                    const selected = matched ? matched.value === p.value : false;
                    const isNone = p.value === '';
                    return (
                        <button
                            key={p.name + p.value}
                            type="button"
                            onClick={() => onChange(p.value)}
                            title={`${p.name}${p.value ? ` · ${p.value}` : ''}`}
                            aria-label={p.name}
                            aria-pressed={selected}
                            className={cn(
                                'relative h-8 w-8 shrink-0 rounded-full border-2 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-subtle',
                                selected ? 'border-primary' : 'border-border hover:border-muted-foreground',
                                isNone && 'bg-card'
                            )}
                            style={isNone ? undefined : swatchStyle(p.value)}
                        >
                            {isNone ? (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <span className="block h-px w-5 rotate-45 bg-muted-foreground" />
                                </span>
                            ) : null}
                            {selected && !isNone ? <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white" aria-hidden /> : null}
                        </button>
                    );
                })}
            </div>
            <div className="flex items-center gap-2">
                <span className="h-8 w-8 shrink-0 rounded-md border border-border bg-muted" style={swatchStyle(value)} aria-hidden />
                <Input
                    className="flex-1 font-mono text-xs"
                    value={value}
                    placeholder="Hex colour or linear-gradient(...)"
                    onChange={(e) => onChange(e.target.value)}
                    aria-label="Colour value"
                />
                {isCustom ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
                        Clear
                    </Button>
                ) : null}
            </div>
            <p className="text-xs text-muted-foreground">{matched ? matched.name : isCustom ? `Custom · ${value}` : 'No colour (uses default surface)'}</p>
        </div>
    );
};

// ── Format icons ────────────────────────────────────────────────────────────

export const FORMAT_ICONS: Record<PlacementFormat, LucideIcon> = {
    banner: RectangleHorizontal,
    carousel: Images,
    modal: AppWindow,
    topbar: PanelTop,
    sidebar: PanelRight,
    inline_card: StickyNote,
    fullscreen: Maximize,
};

export const FORMAT_LOCATION_HINT: Record<PlacementFormat, string> = {
    banner: 'A horizontal image strip embedded in a page.',
    carousel: 'Multiple banners that auto-rotate. Set rotation seconds.',
    modal: 'Centered popup over a dimmed backdrop. Best for sign-up offers.',
    topbar: 'Sticky thin strip above the navbar. Site-wide.',
    sidebar: 'Vertical card in the left/right column of category and product pages.',
    inline_card: 'Card embedded between content sections.',
    fullscreen: 'Full-viewport overlay. Use sparingly, high friction.',
};

// ── Status badges ───────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<CampaignStatus, 'secondary' | 'info' | 'success' | 'warning' | 'destructive' | 'outline'> = {
    draft: 'secondary',
    scheduled: 'info',
    running: 'success',
    paused: 'warning',
    ended: 'destructive',
    archived: 'outline',
};

export const StatusBadge: React.FC<{ status: CampaignStatus }> = ({ status }) => {
    const meta = CAMPAIGN_STATUSES.find((s) => s.value === status);
    return (
        <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>
            {status === 'running' ? <Zap aria-hidden /> : null}
            {meta?.label || status}
        </Badge>
    );
};

export const LiveDot: React.FC<{ on?: boolean; label?: string }> = ({ on = true, label }) => (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className={cn('inline-flex h-2 w-2 rounded-full', on ? 'bg-success-600' : 'bg-muted-foreground')} aria-hidden />
        {label || (on ? 'Live' : 'Off')}
    </span>
);

// ── Device icon ─────────────────────────────────────────────────────────────

export const DeviceIcon: React.FC<{ device: 'mobile' | 'tablet' | 'desktop'; className?: string }> = ({ device, className }) => {
    const Icon = device === 'mobile' ? Smartphone : device === 'tablet' ? Tablet : Monitor;
    return <Icon className={cn('h-3.5 w-3.5', className)} aria-hidden />;
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

// Storefront render fallbacks when a creative leaves a colour blank (Tailwind classes, same
// values as the storefront ad component). Colours set on the creative stay inline styles.
const FALLBACK_BG_CLASS = 'bg-gray-800';
const FALLBACK_FG_CLASS = 'text-white';
const FALLBACK_ACCENT_BG_CLASS = 'bg-amber-400';
const FALLBACK_ACCENT_BORDER_CLASS = 'border-amber-400';
const CTA_CHIP_CLASS = 'bg-white text-gray-900';

/** Surface props: creative colours go inline, blanks fall back to Tailwind classes. */
const surfaceProps = (bg: string, fg: string): { className: string; style: React.CSSProperties } => {
    const isGradient = bg.includes('gradient');
    return {
        className: cn(!bg && FALLBACK_BG_CLASS, !fg && FALLBACK_FG_CLASS),
        style: {
            background: bg && isGradient ? bg : undefined,
            backgroundColor: bg && !isGradient ? bg : undefined,
            color: fg || undefined,
        },
    };
};

export const LivePreview: React.FC<PreviewProps> = ({ creative, variant = 'banner' }) => {
    const bg = creative.background_color || '';
    const fg = creative.text_color || '';
    const accent = creative.accent_color || '';
    const surface = surfaceProps(bg, fg);
    const accentStyle: React.CSSProperties = accent ? { backgroundColor: accent } : {};
    const image = creative.image_desktop_preview || creative.image_desktop_url || '';

    if (variant === 'topbar') {
        return (
            <div className={cn('overflow-hidden rounded-xl border border-border', surface.className)} style={surface.style}>
                <div className="flex items-center justify-center gap-3 px-4 py-2 text-xs font-medium">
                    {creative.eyebrow ? <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider">{creative.eyebrow}</span> : null}
                    <span className="truncate">{creative.headline || '(headline)'}</span>
                    {creative.cta_label ? (
                        <span
                            className={cn('whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold', CTA_CHIP_CLASS, !accent && FALLBACK_ACCENT_BORDER_CLASS)}
                            style={accent ? { borderColor: accent } : undefined}
                        >
                            {creative.cta_label}
                        </span>
                    ) : null}
                </div>
            </div>
        );
    }

    if (variant === 'modal') {
        return (
            <div className="mx-auto max-w-md overflow-hidden rounded-2xl border border-border">
                {image ? (
                    <div className="aspect-[16/10] overflow-hidden bg-muted">
                        <img src={image} alt="" className="h-full w-full object-cover" />
                    </div>
                ) : null}
                <div className={cn('p-6 text-center', surface.className)} style={surface.style}>
                    {creative.eyebrow ? (
                        <span className={cn('mb-3 inline-block rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white', !accent && FALLBACK_ACCENT_BG_CLASS)} style={accentStyle}>
                            {creative.eyebrow}
                        </span>
                    ) : null}
                    <h2 className="text-2xl font-bold leading-tight">{creative.headline || '(headline)'}</h2>
                    {creative.subheadline ? <p className="mt-2 text-sm">{creative.subheadline}</p> : null}
                    {creative.cta_label ? (
                        <span className={cn('mt-5 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white', !accent && FALLBACK_ACCENT_BG_CLASS)} style={accentStyle}>
                            {creative.cta_label} →
                        </span>
                    ) : null}
                </div>
            </div>
        );
    }

    // Default: banner / carousel / inline_card / etc.
    return (
        <div className={cn('relative aspect-[21/5] w-full overflow-hidden rounded-xl border border-border', surface.className)} style={surface.style}>
            {image ? <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
            <div className={cn('absolute inset-0 flex flex-col justify-center px-4 sm:px-8', image && 'bg-gradient-to-r from-black/60 via-black/25 to-transparent')}>
                {creative.eyebrow ? (
                    <span className={cn('mb-2 inline-block w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white', !accent && FALLBACK_ACCENT_BG_CLASS)} style={accentStyle}>
                        {creative.eyebrow}
                    </span>
                ) : null}
                <h3 className="max-w-md text-sm font-bold leading-tight sm:text-xl">{creative.headline || '(headline)'}</h3>
                {creative.subheadline ? <p className="mt-1 line-clamp-2 max-w-md text-xs sm:text-sm">{creative.subheadline}</p> : null}
                {creative.cta_label ? (
                    <span className={cn('mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white', !accent && FALLBACK_ACCENT_BG_CLASS)} style={accentStyle}>
                        {creative.cta_label} →
                    </span>
                ) : null}
            </div>
        </div>
    );
};

// ── Edit sheet ──────────────────────────────────────────────────────────────

export const FormSheet: React.FC<{
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    onSave: () => void;
    saving: boolean;
    saveLabel?: string;
    width?: 'md' | 'lg' | 'xl';
    children: React.ReactNode;
}> = ({ open, title, description, onClose, onSave, saving, saveLabel = 'Save', width = 'lg', children }) => {
    const widthCls = width === 'xl' ? 'sm:max-w-5xl' : width === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-xl';
    return (
        <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
            <SheetContent className={cn('flex w-full flex-col gap-0 overflow-hidden p-0 sm:p-0', widthCls)}>
                <SheetHeader className="border-b border-border p-4 pr-14">
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription className={description ? undefined : 'sr-only'}>{description ?? title}</SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">{children}</div>
                <SheetFooter className="flex-row justify-end gap-2 border-t border-border bg-background p-4 sm:p-4">
                    <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={onSave} disabled={saving}>
                        {saving ? <Loader2 className="animate-spin" aria-hidden /> : null}
                        {saving ? 'Saving…' : saveLabel}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

// ── Confirm dialog (destructive actions) ────────────────────────────────────

export const ConfirmDialog: React.FC<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}> = ({ open, title, description, confirmLabel = 'Delete', busy = false, onConfirm, onCancel }) => (
    <Dialog open={open} onOpenChange={(next) => (!next && !busy ? onCancel() : undefined)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
                    Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={onConfirm} disabled={busy}>
                    {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
                    {confirmLabel}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

// ── Empty / loading / error panels ──────────────────────────────────────────

export const EmptyState: React.FC<{
    icon: LucideIcon;
    title: string;
    body: string;
    action?: React.ReactNode;
}> = ({ icon, title, body, action }) => (
    <Card>
        <BaseEmptyState icon={icon} title={title} description={body} action={action} className="py-16" />
    </Card>
);

export const CardGridSkeleton: React.FC<{ count?: number; className?: string }> = ({ count = 6, className }) => (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3', className)} aria-busy="true" aria-label="Loading">
        {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
        ))}
    </div>
);

/** Filter / action bar above each tab's list. Stacks on mobile. */
export const Toolbar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</Card>
);

export const Alert: React.FC<{ tone?: 'error' | 'info' | 'warn'; children: React.ReactNode; onRetry?: () => void }> = ({
    tone = 'error',
    children,
    onRetry,
}) => {
    const cls =
        tone === 'error'
            ? 'border-destructive bg-destructive-subtle text-destructive-subtle-foreground'
            : tone === 'warn'
              ? 'border-warning-subtle-foreground bg-warning-subtle text-warning-subtle-foreground'
              : 'border-info-subtle-foreground bg-info-subtle text-info-subtle-foreground';
    return (
        <div role={tone === 'error' ? 'alert' : 'status'} className={cn('flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm', cls)}>
            <span className="min-w-0">{children}</span>
            {onRetry ? (
                <Button type="button" variant="outline" size="sm" onClick={onRetry}>
                    Try again
                </Button>
            ) : null}
        </div>
    );
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

/** Datetime helpers shared by the editors (ISO <-> value of <input type="datetime-local">). */
export function toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string): string | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
