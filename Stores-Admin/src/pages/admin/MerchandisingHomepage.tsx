import {
    IconAlertTriangle,
    IconBolt,
    IconCalendarTime,
    IconCheck,
    IconCircleCheckFilled,
    IconClock,
    IconEdit,
    IconEyeOff,
    IconLayoutGrid,
    IconList,
    IconPlus,
    IconRefresh,
    IconSearch,
    IconTrash,
    IconX,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import IconLoader from '../../components/Icon/IconLoader';
import axiosInstance from '../../services/axiosInstance';
import {
    addSectionItem,
    createMerchSection,
    deleteMerchSection,
    deleteSectionItem,
    fetchMerchSectionDetail,
    fetchMerchSections,
    merchAdminErrorMessage,
    patchMerchSection,
    type HomepageSectionAdminDetail,
    type HomepageSectionAdminList,
    type PopulationRulePayload,
    type SectionWritePayload,
} from '../../services/merchandisingAdminService';

const SECTION_TYPES = [
    { value: 'horizontal_scroll', label: 'Horizontal scroll' },
    { value: 'grid', label: 'Product grid' },
    { value: 'flash_sale', label: 'Flash sale' },
    { value: 'banner', label: 'Banner' },
    { value: 'category_spotlight', label: 'Category spotlight' },
];

const STRATEGIES = [
    { value: 'manual', label: 'Manual' },
    { value: 'auto', label: 'Automatic' },
    { value: 'mixed', label: 'Mixed' },
];

const RULE_TYPES = [
    { value: 'top_sellers', label: 'Top sellers' },
    { value: 'new_arrivals', label: 'New arrivals' },
    { value: 'high_rated', label: 'Highest rated' },
    { value: 'flash_sale', label: 'Flash sale products' },
    { value: 'tag_filter', label: 'Tag / keywords' },
    { value: 'category_best', label: 'Best in category' },
    { value: 'low_stock', label: 'Low stock' },
    { value: 'trending', label: 'Trending (views)' },
    { value: 'manual_override', label: 'Manual only (rule off)' },
];

const SECTION_TYPE_LABEL: Record<string, string> = Object.fromEntries(
    SECTION_TYPES.map((o) => [o.value, o.label])
);
const STRATEGY_LABEL: Record<string, string> = Object.fromEntries(
    STRATEGIES.map((o) => [o.value, o.label])
);

function slugify(s: string): string {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function emptyRule(): PopulationRulePayload {
    return {
        rule_type: 'new_arrivals',
        lookback_days: 7,
        min_rating: 4.0,
        tag: '',
        category: null,
        low_stock_threshold: 10,
        only_in_stock: true,
        only_available: true,
        min_price: null,
        max_price: null,
        cache_minutes: 30,
    };
}

function toDatetimeLocal(iso: string | null): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return '';
    }
}

function fromDatetimeLocal(v: string): string | null {
    if (!v || !v.trim()) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const inputCls =
    'w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-on-surface dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent';

type ColorPreset = { name: string; value: string };

const BACKGROUND_PRESETS: ColorPreset[] = [
    { name: 'None', value: '' },
    { name: 'Cream', value: '#fff8f6' },
    { name: 'Peach', value: '#fff1ec' },
    { name: 'Blush', value: '#ffe9e2' },
    { name: 'Soft rose', value: '#fef2f2' },
    { name: 'Honey', value: '#fff7ed' },
    { name: 'Butter', value: '#fefce8' },
    { name: 'Mint', value: '#ecfdf5' },
    { name: 'Sky', value: '#eff6ff' },
    { name: 'Lavender', value: '#f5f3ff' },
    { name: 'Slate', value: '#f1f5f9' },
    { name: 'Charcoal', value: '#1f2937' },
];

const ACCENT_PRESETS: ColorPreset[] = [
    { name: 'None', value: '' },
    { name: 'TradeHut orange', value: '#a43d00' },
    { name: 'Flame', value: '#f5620f' },
    { name: 'Sunset', value: '#f97316' },
    { name: 'Crimson', value: '#dc2626' },
    { name: 'Rose', value: '#e11d48' },
    { name: 'Bid green', value: '#006c4b' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'RFQ blue', value: '#0058ca' },
    { name: 'Cyan', value: '#0891b2' },
    { name: 'Indigo', value: '#4f46e5' },
    { name: 'Violet', value: '#7c3aed' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Slate', value: '#475569' },
];

const ColorSwatchPicker: React.FC<{
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
                    const selected = (p.value || '') === (matched?.value || (value ? '' : ''));
                    const isNone = p.value === '';
                    return (
                        <button
                            key={p.name}
                            type="button"
                            onClick={() => onChange(p.value)}
                            title={`${p.name}${p.value ? ` · ${p.value}` : ''}`}
                            className={`relative h-8 w-8 rounded-full border-2 transition shrink-0 ${
                                selected
                                    ? 'border-primary ring-2 ring-primary/30'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'
                            } ${isNone ? 'bg-white dark:bg-gray-800' : ''}`}
                            style={!isNone ? { backgroundColor: p.value } : undefined}
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
                    className="h-6 w-6 rounded-md border border-gray-200 dark:border-gray-700 shrink-0"
                    style={{ backgroundColor: value || 'transparent' }}
                />
                <input
                    className={`${inputCls} font-mono text-xs flex-1`}
                    value={value}
                    placeholder="Custom hex (e.g. #ff8800)"
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
            <p className="text-xs text-on-surface-variant dark:text-gray-500">
                {matched ? matched.name : isCustom ? `Custom · ${value}` : 'No color (uses default surface)'}
            </p>
        </div>
    );
};

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number | string;
    accent?: string;
}> = ({ icon, label, value, accent = 'text-primary' }) => (
    <div className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-card">
        <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-gray-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-on-surface dark:text-white">{value}</p>
            </div>
            <div className={`shrink-0 ${accent}`}>{icon}</div>
        </div>
    </div>
);

const MerchandisingHomepage: React.FC = () => {
    const [rows, setRows] = useState<HomepageSectionAdminList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'scheduled' | 'inactive'>('all');

    const [modalOpen, setModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [detail, setDetail] = useState<HomepageSectionAdminDetail | null>(null);
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
    const [tab, setTab] = useState<'general' | 'rule' | 'items'>('general');
    const [newProductId, setNewProductId] = useState('');

    const [title, setTitle] = useState('');
    const [subtitle, setSubtitle] = useState('');
    const [slug, setSlug] = useState('');
    const [sectionType, setSectionType] = useState('horizontal_scroll');
    const [strategy, setStrategy] = useState('auto');
    const [maxProducts, setMaxProducts] = useState(12);
    const [position, setPosition] = useState(0);
    const [isActive, setIsActive] = useState(true);
    const [showCountdown, setShowCountdown] = useState(false);
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [backgroundColor, setBackgroundColor] = useState('');
    const [accentColor, setAccentColor] = useState('');
    const [rule, setRule] = useState<PopulationRulePayload>(emptyRule);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setRows(await fetchMerchSections());
        } catch (e) {
            setError(merchAdminErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axiosInstance.get<unknown>('/catalog/categories/');
                const list: Record<string, unknown>[] = Array.isArray(data)
                    ? (data as Record<string, unknown>[])
                    : Array.isArray((data as { results?: unknown[] })?.results)
                    ? ((data as { results: Record<string, unknown>[] }).results)
                    : [];
                setCategories(
                    list
                        .map((c) => ({
                            id: String((c as { id?: string | number }).id ?? ''),
                            name: String(
                                (c as { name?: string; title?: string }).name ??
                                    (c as { name?: string; title?: string }).title ??
                                    ''
                            ),
                        }))
                        .filter((c) => c.id && c.name)
                );
            } catch (err) {
                console.error('Failed to load categories', err);
                setCategories([]);
            }
        })();
    }, []);

    const stats = useMemo(() => {
        const total = rows.length;
        const live = rows.filter((r) => r.is_live).length;
        const active = rows.filter((r) => r.is_active).length;
        const items = rows.reduce((sum, r) => sum + (r.items_count || 0), 0);
        return { total, live, active, items };
    }, [rows]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return rows
            .filter((r) => {
                if (statusFilter === 'live' && !r.is_live) return false;
                if (statusFilter === 'scheduled' && (r.is_live || !r.is_active)) return false;
                if (statusFilter === 'inactive' && r.is_active) return false;
                if (!q) return true;
                return (
                    r.title.toLowerCase().includes(q) ||
                    r.slug.toLowerCase().includes(q) ||
                    r.section_type.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => a.position - b.position);
    }, [rows, search, statusFilter]);

    const openCreate = () => {
        setSelectedId(null);
        setDetail(null);
        setTab('general');
        setTitle('');
        setSubtitle('');
        setSlug('');
        setSectionType('horizontal_scroll');
        setStrategy('auto');
        setMaxProducts(12);
        setPosition(rows.length);
        setIsActive(true);
        setShowCountdown(false);
        setStartsAt('');
        setEndsAt('');
        setBackgroundColor('');
        setAccentColor('');
        setRule(emptyRule());
        setNewProductId('');
        setModalOpen(true);
    };

    const openEdit = async (r: HomepageSectionAdminList) => {
        setSelectedId(r.id);
        setTab('general');
        setNewProductId('');
        setModalOpen(true);
        try {
            const d = await fetchMerchSectionDetail(r.id);
            setDetail(d);
            setTitle(d.title);
            setSubtitle(d.subtitle || '');
            setSlug(d.slug);
            setSectionType(d.section_type);
            setStrategy(d.strategy);
            setMaxProducts(d.max_products);
            setPosition(d.position);
            setIsActive(d.is_active);
            setShowCountdown(d.show_countdown);
            setStartsAt(toDatetimeLocal(d.starts_at));
            setEndsAt(toDatetimeLocal(d.ends_at));
            setBackgroundColor(d.background_color || '');
            setAccentColor(d.accent_color || '');
            setRule(
                d.rule
                    ? ({
                          ...emptyRule(),
                          ...d.rule,
                          min_rating: Number(d.rule.min_rating),
                          category: d.rule.category ? String(d.rule.category) : null,
                      } as PopulationRulePayload)
                    : emptyRule()
            );
        } catch (e) {
            setError(merchAdminErrorMessage(e));
        }
    };

    const buildPayload = (): SectionWritePayload => ({
        title,
        subtitle,
        slug: slug || slugify(title),
        section_type: sectionType,
        max_products: maxProducts,
        position,
        is_active: isActive,
        starts_at: fromDatetimeLocal(startsAt),
        ends_at: fromDatetimeLocal(endsAt),
        strategy,
        background_color: backgroundColor,
        accent_color: accentColor,
        show_countdown: showCountdown,
        rule: strategy === 'manual' ? null : { ...rule },
    });

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            const body = buildPayload();
            if (selectedId == null) {
                await createMerchSection(body);
            } else {
                await patchMerchSection(selectedId, body);
            }
            setModalOpen(false);
            await load();
        } catch (e) {
            setError(merchAdminErrorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (r: HomepageSectionAdminList) => {
        if (!window.confirm(`Delete section "${r.title}"?`)) return;
        try {
            await deleteMerchSection(r.id);
            await load();
        } catch (e) {
            setError(merchAdminErrorMessage(e));
        }
    };

    const refreshDetail = async () => {
        if (selectedId == null) return;
        const d = await fetchMerchSectionDetail(selectedId);
        setDetail(d);
    };

    const handleAddItem = async () => {
        if (selectedId == null || !newProductId.trim()) return;
        try {
            await addSectionItem(selectedId, newProductId.trim(), (detail?.items?.length ?? 0) + 1);
            setNewProductId('');
            await refreshDetail();
            await load();
        } catch (e) {
            setError(merchAdminErrorMessage(e));
        }
    };

    const handleRemoveItem = async (itemId: number) => {
        try {
            await deleteSectionItem(itemId);
            await refreshDetail();
            await load();
        } catch (e) {
            setError(merchAdminErrorMessage(e));
        }
    };

    if (loading && rows.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <IconLoader className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-on-surface dark:text-white">
                        <IconLayoutGrid className="text-primary" />
                        Homepage Merchandising
                    </h1>
                    <p className="mt-1 text-sm text-on-surface-variant dark:text-gray-400">
                        Curate the storefront homepage — sections, schedules and pinned product picks.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={load}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-on-surface dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition"
                    >
                        <IconRefresh size={16} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 transition shadow-card"
                    >
                        <IconPlus size={16} />
                        New section
                    </button>
                </div>
            </header>

            {/* Error banner */}
            {error && (
                <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-on-surface dark:text-white">
                    <IconAlertTriangle className="w-5 h-5 shrink-0 text-warning" />
                    <span className="flex-1">{error}</span>
                    <button type="button" onClick={() => setError(null)} className="text-on-surface-variant hover:text-on-surface">
                        <IconX size={16} />
                    </button>
                </div>
            )}

            {/* Stat cards */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<IconLayoutGrid size={28} />}
                    label="Total sections"
                    value={stats.total}
                    accent="text-primary"
                />
                <StatCard
                    icon={<IconBolt size={28} />}
                    label="Live now"
                    value={stats.live}
                    accent="text-emerald-600"
                />
                <StatCard
                    icon={<IconCalendarTime size={28} />}
                    label="Active"
                    value={stats.active}
                    accent="text-tertiary"
                />
                <StatCard
                    icon={<IconList size={28} />}
                    label="Pinned items"
                    value={stats.items}
                    accent="text-amber-600"
                />
            </section>

            {/* Filter / search */}
            <section className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by title, slug, or type…"
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-sm">
                    {(
                        [
                            { v: 'all', label: `All (${rows.length})` },
                            { v: 'live', label: `Live (${stats.live})` },
                            { v: 'scheduled', label: 'Scheduled' },
                            { v: 'inactive', label: 'Inactive' },
                        ] as const
                    ).map((opt) => (
                        <button
                            key={opt.v}
                            type="button"
                            onClick={() => setStatusFilter(opt.v)}
                            className={`px-3 py-1.5 rounded-md font-semibold transition ${
                                statusFilter === opt.v
                                    ? 'bg-white dark:bg-gray-900 text-primary shadow-sm'
                                    : 'text-on-surface-variant dark:text-gray-400 hover:text-on-surface dark:hover:text-white'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Table */}
            <section className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
                {filteredRows.length === 0 ? (
                    <div className="px-6 py-16 text-center">
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <IconLayoutGrid size={24} />
                        </div>
                        <p className="mt-4 text-sm font-semibold text-on-surface dark:text-white">
                            {rows.length === 0 ? 'No homepage sections yet' : 'No sections match this filter'}
                        </p>
                        <p className="mt-1 text-sm text-on-surface-variant dark:text-gray-400">
                            {rows.length === 0
                                ? 'Create your first section to drive the customer homepage.'
                                : 'Try a different search or filter.'}
                        </p>
                        {rows.length === 0 && (
                            <button
                                type="button"
                                onClick={openCreate}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 transition"
                            >
                                <IconPlus size={16} /> New section
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-on-surface-variant dark:text-gray-500 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
                                    <th className="px-5 py-3">#</th>
                                    <th className="px-5 py-3">Section</th>
                                    <th className="px-5 py-3">Type</th>
                                    <th className="px-5 py-3">Strategy</th>
                                    <th className="px-5 py-3">Items</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.map((r) => (
                                    <tr
                                        key={r.id}
                                        className="border-b border-gray-100 dark:border-gray-800/60 last:border-0 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition"
                                    >
                                        <td className="px-5 py-4 text-on-surface-variant dark:text-gray-400 font-mono">
                                            {r.position}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-on-surface dark:text-white">{r.title}</div>
                                            <code className="text-xs text-on-surface-variant dark:text-gray-500">{r.slug}</code>
                                        </td>
                                        <td className="px-5 py-4 text-on-surface-variant dark:text-gray-400">
                                            {SECTION_TYPE_LABEL[r.section_type] ?? r.section_type}
                                        </td>
                                        <td className="px-5 py-4 text-on-surface-variant dark:text-gray-400">
                                            {STRATEGY_LABEL[r.strategy] ?? r.strategy}
                                        </td>
                                        <td className="px-5 py-4 font-mono text-on-surface dark:text-white">
                                            {r.items_count}
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {r.is_live ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                                                        <IconCircleCheckFilled size={12} /> Live
                                                    </span>
                                                ) : r.is_active ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-tertiary/10 px-2 py-0.5 text-xs font-semibold text-tertiary">
                                                        <IconClock size={12} /> Scheduled
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-semibold text-on-surface-variant">
                                                        <IconEyeOff size={12} /> Inactive
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(r)}
                                                    title="Edit section"
                                                    className="p-2 rounded-lg text-tertiary hover:bg-tertiary/10 transition"
                                                >
                                                    <IconEdit size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(r)}
                                                    title="Delete section"
                                                    className="p-2 rounded-lg text-error hover:bg-error/10 transition"
                                                >
                                                    <IconTrash size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Help footer */}
            <p className="text-xs text-on-surface-variant dark:text-gray-500">
                Public API: <code className="font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">homepage/sections/</code>
                {' · '}Staff endpoints require Django <strong>is_staff</strong>.
            </p>

            {/* Edit / Create modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800">
                        {/* Modal header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                            <div>
                                <h2 className="text-lg font-bold text-on-surface dark:text-white">
                                    {selectedId == null ? 'New section' : 'Edit section'}
                                </h2>
                                {selectedId != null && detail && (
                                    <p className="text-xs text-on-surface-variant dark:text-gray-500 font-mono">
                                        {detail.slug}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                className="p-2 rounded-lg text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-on-surface dark:hover:text-white transition"
                                onClick={() => setModalOpen(false)}
                            >
                                <IconX size={18} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-1 px-6 pt-3 border-b border-gray-200 dark:border-gray-800">
                            {(['general', 'rule', 'items'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`px-3 py-2 text-sm font-semibold capitalize border-b-2 -mb-px transition ${
                                        tab === t
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-on-surface-variant hover:text-on-surface dark:hover:text-white'
                                    }`}
                                    onClick={() => setTab(t)}
                                >
                                    {t === 'items' ? 'Manual picks' : t}
                                </button>
                            ))}
                        </div>

                        {/* Modal body */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                            {tab === 'general' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                Title
                                            </label>
                                            <input
                                                className={inputCls}
                                                value={title}
                                                onChange={(e) => {
                                                    setTitle(e.target.value);
                                                    if (selectedId == null) setSlug(slugify(e.target.value));
                                                }}
                                                placeholder="Trending right now"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                Subtitle
                                            </label>
                                            <input
                                                className={inputCls}
                                                value={subtitle}
                                                onChange={(e) => setSubtitle(e.target.value)}
                                                placeholder="Optional caption shown under the title"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                Slug
                                            </label>
                                            <input
                                                className={`${inputCls} font-mono text-xs`}
                                                value={slug}
                                                onChange={(e) => setSlug(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                Section type
                                            </label>
                                            <select
                                                className={inputCls}
                                                value={sectionType}
                                                onChange={(e) => setSectionType(e.target.value)}
                                            >
                                                {SECTION_TYPES.map((o) => (
                                                    <option key={o.value} value={o.value}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                Strategy
                                            </label>
                                            <select
                                                className={inputCls}
                                                value={strategy}
                                                onChange={(e) => setStrategy(e.target.value)}
                                            >
                                                {STRATEGIES.map((o) => (
                                                    <option key={o.value} value={o.value}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                Max products
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                className={inputCls}
                                                value={maxProducts}
                                                onChange={(e) => setMaxProducts(Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                Position
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                className={inputCls}
                                                value={position}
                                                onChange={(e) => setPosition(Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                Starts at
                                            </label>
                                            <input
                                                type="datetime-local"
                                                className={inputCls}
                                                value={startsAt}
                                                onChange={(e) => setStartsAt(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                Ends at
                                            </label>
                                            <input
                                                type="datetime-local"
                                                className={inputCls}
                                                value={endsAt}
                                                onChange={(e) => setEndsAt(e.target.value)}
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                Background color
                                            </label>
                                            <ColorSwatchPicker
                                                value={backgroundColor}
                                                presets={BACKGROUND_PRESETS}
                                                onChange={setBackgroundColor}
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                Accent color
                                            </label>
                                            <ColorSwatchPicker
                                                value={accentColor}
                                                presets={ACCENT_PRESETS}
                                                onChange={setAccentColor}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface dark:text-white">
                                            <input
                                                type="checkbox"
                                                checked={isActive}
                                                onChange={(e) => setIsActive(e.target.checked)}
                                                className="h-4 w-4 rounded text-primary focus:ring-primary"
                                            />
                                            <span>Active</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface dark:text-white">
                                            <input
                                                type="checkbox"
                                                checked={showCountdown}
                                                onChange={(e) => setShowCountdown(e.target.checked)}
                                                className="h-4 w-4 rounded text-primary focus:ring-primary"
                                            />
                                            <span>Show countdown <span className="text-on-surface-variant text-xs">(needs end date)</span></span>
                                        </label>
                                    </div>
                                </>
                            )}

                            {tab === 'rule' && strategy !== 'manual' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                            Rule type
                                        </label>
                                        <select
                                            className={inputCls}
                                            value={rule.rule_type}
                                            onChange={(e) => setRule((r) => ({ ...r, rule_type: e.target.value }))}
                                        >
                                            {RULE_TYPES.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                            Lookback (days)
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            className={inputCls}
                                            value={rule.lookback_days}
                                            onChange={(e) => setRule((r) => ({ ...r, lookback_days: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                            Min rating
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className={inputCls}
                                            value={rule.min_rating}
                                            onChange={(e) => setRule((r) => ({ ...r, min_rating: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                            Tag / keyword filter
                                        </label>
                                        <input
                                            className={inputCls}
                                            value={rule.tag}
                                            onChange={(e) => setRule((r) => ({ ...r, tag: e.target.value }))}
                                            placeholder="For tag_filter rule"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                            Category (category_best)
                                        </label>
                                        <select
                                            className={inputCls}
                                            value={rule.category || ''}
                                            onChange={(e) =>
                                                setRule((r) => ({ ...r, category: e.target.value ? e.target.value : null }))
                                            }
                                        >
                                            <option value="">—</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                            Low stock threshold
                                        </label>
                                        <input
                                            type="number"
                                            className={inputCls}
                                            value={rule.low_stock_threshold}
                                            onChange={(e) =>
                                                setRule((r) => ({ ...r, low_stock_threshold: Number(e.target.value) }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                            Cache (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            className={inputCls}
                                            value={rule.cache_minutes}
                                            onChange={(e) =>
                                                setRule((r) => ({ ...r, cache_minutes: Number(e.target.value) }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                            Min price
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className={inputCls}
                                            value={rule.min_price ?? ''}
                                            onChange={(e) =>
                                                setRule((r) => ({ ...r, min_price: e.target.value === '' ? null : e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                            Max price
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className={inputCls}
                                            value={rule.max_price ?? ''}
                                            onChange={(e) =>
                                                setRule((r) => ({ ...r, max_price: e.target.value === '' ? null : e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div className="sm:col-span-2 flex flex-wrap gap-x-6 gap-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface dark:text-white">
                                            <input
                                                type="checkbox"
                                                checked={rule.only_in_stock}
                                                onChange={(e) => setRule((r) => ({ ...r, only_in_stock: e.target.checked }))}
                                                className="h-4 w-4 rounded text-primary focus:ring-primary"
                                            />
                                            <span>Only in stock</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-on-surface dark:text-white">
                                            <input
                                                type="checkbox"
                                                checked={rule.only_available}
                                                onChange={(e) => setRule((r) => ({ ...r, only_available: e.target.checked }))}
                                                className="h-4 w-4 rounded text-primary focus:ring-primary"
                                            />
                                            <span>Only available flag</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {tab === 'rule' && strategy === 'manual' && (
                                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 px-4 py-6 text-center">
                                    <p className="text-sm text-on-surface-variant dark:text-gray-400">
                                        Manual strategy uses only the pinned products from the <strong>Manual picks</strong> tab — no rule needed.
                                    </p>
                                </div>
                            )}

                            {tab === 'items' && (
                                <div className="space-y-4">
                                    {selectedId == null ? (
                                        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-on-surface dark:text-white flex items-center gap-2">
                                            <IconAlertTriangle className="w-5 h-5 text-warning shrink-0" />
                                            Save the section first, then add product UUIDs here.
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap gap-2 items-end">
                                                <div className="flex-1 min-w-[220px]">
                                                    <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1.5">
                                                        Product UUID
                                                    </label>
                                                    <input
                                                        className={`${inputCls} font-mono text-xs`}
                                                        value={newProductId}
                                                        onChange={(e) => setNewProductId(e.target.value)}
                                                        placeholder="From product list / Django admin"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 transition disabled:opacity-50"
                                                    onClick={handleAddItem}
                                                    disabled={!newProductId.trim()}
                                                >
                                                    Add product
                                                </button>
                                            </div>
                                            {(detail?.items?.length ?? 0) === 0 ? (
                                                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 px-4 py-6 text-center text-sm text-on-surface-variant">
                                                    No pinned items yet.
                                                </div>
                                            ) : (
                                                <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                                                    {(detail?.items ?? []).map((it) => (
                                                        <li
                                                            key={it.id}
                                                            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="font-medium text-on-surface dark:text-white truncate">
                                                                    {it.product_name || '(unnamed product)'}
                                                                </p>
                                                                <code className="text-xs text-on-surface-variant dark:text-gray-500 font-mono">
                                                                    {it.product}
                                                                </code>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="p-2 rounded-lg text-error hover:bg-error/10 transition shrink-0"
                                                                onClick={() => handleRemoveItem(it.id)}
                                                                title="Remove pinned product"
                                                            >
                                                                <IconTrash size={16} />
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal footer */}
                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/60">
                            <button
                                type="button"
                                className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-semibold text-on-surface dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                onClick={() => setModalOpen(false)}
                            >
                                Cancel
                            </button>
                            {tab !== 'items' && (
                                <button
                                    type="button"
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:opacity-90 transition disabled:opacity-50 inline-flex items-center gap-2"
                                    disabled={saving || !title.trim()}
                                    onClick={handleSave}
                                >
                                    {saving && <IconLoader className="w-4 h-4 animate-spin" />}
                                    {saving ? 'Saving…' : 'Save section'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MerchandisingHomepage;
