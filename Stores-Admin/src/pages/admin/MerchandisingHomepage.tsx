import {
    IconAlertTriangle,
    IconEdit,
    IconLayoutGrid,
    IconPlus,
    IconTrash,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useState } from 'react';
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

const MerchandisingHomepage: React.FC = () => {
    const [rows, setRows] = useState<HomepageSectionAdminList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
                const { data } = await axiosInstance.get<Record<string, unknown>[]>('/categories/');
                const list = Array.isArray(data) ? data : [];
                setCategories(
                    list.map((c) => ({
                        id: String((c as { id?: string }).id ?? ''),
                        name: String((c as { name?: string }).name ?? ''),
                    }))
                );
            } catch {
                setCategories([]);
            }
        })();
    }, []);

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
        if (!window.confirm(`Delete section “${r.title}”?`)) return;
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
            <div className="flex items-center justify-center min-h-[320px]">
                <IconLoader className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="panel border-white-light px-0 dark:border-[#1b2e4b]">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 px-5">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <IconLayoutGrid className="text-primary" />
                        Homepage merchandising
                    </h1>
                    <p className="text-white-dark mt-1 text-sm">
                        Curate storefront homepage sections (public API:{' '}
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">homepage/sections/</code>
                        ). Staff API requires Django <strong>is_staff</strong>.
                    </p>
                </div>
                <button type="button" onClick={openCreate} className="btn btn-primary gap-2">
                    <IconPlus className="w-4 h-4" /> New section
                </button>
            </div>

            {error && (
                <div className="mx-5 mb-4 flex items-start gap-2 rounded border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
                    <IconAlertTriangle className="w-5 h-5 shrink-0 text-warning" />
                    <span>{error}</span>
                </div>
            )}

            <div className="table-responsive mb-6">
                <table className="table-hover">
                    <thead>
                        <tr>
                            <th>Pos</th>
                            <th>Title</th>
                            <th>Slug</th>
                            <th>Type</th>
                            <th>Strategy</th>
                            <th>Active</th>
                            <th>Live</th>
                            <th>Items</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr key={r.id}>
                                <td>{r.position}</td>
                                <td className="font-semibold">{r.title}</td>
                                <td>
                                    <code className="text-xs">{r.slug}</code>
                                </td>
                                <td className="text-sm">{r.section_type}</td>
                                <td className="text-sm">{r.strategy}</td>
                                <td>{r.is_active ? 'Yes' : 'No'}</td>
                                <td>{r.is_live ? 'Yes' : 'No'}</td>
                                <td>{r.items_count}</td>
                                <td className="text-end">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm gap-1 mr-2"
                                        onClick={() => openEdit(r)}
                                    >
                                        <IconEdit className="w-4 h-4" /> Edit
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm gap-1"
                                        onClick={() => handleDelete(r)}
                                    >
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {rows.length === 0 && !loading && (
                    <p className="px-5 py-8 text-center text-white-dark">No homepage sections yet. Create one to drive the customer homepage.</p>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-[#0e1726] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white-light dark:border-[#1b2e4b]">
                        <div className="sticky top-0 flex items-center justify-between border-b border-white-light dark:border-[#1b2e4b] px-5 py-4 bg-inherit">
                            <h2 className="text-lg font-bold">{selectedId == null ? 'New section' : 'Edit section'}</h2>
                            <button type="button" className="text-white-dark hover:text-primary" onClick={() => setModalOpen(false)}>
                                ✕
                            </button>
                        </div>

                        <div className="flex gap-2 border-b border-white-light dark:border-[#1b2e4b] px-5">
                            {(['general', 'rule', 'items'] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    className={`px-3 py-2 text-sm capitalize border-b-2 -mb-px ${
                                        tab === t ? 'border-primary text-primary font-semibold' : 'border-transparent text-white-dark'
                                    }`}
                                    onClick={() => setTab(t)}
                                >
                                    {t === 'items' ? 'Manual picks' : t}
                                </button>
                            ))}
                        </div>

                        <div className="p-5 space-y-4">
                            {tab === 'general' && (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm mb-1">Title</label>
                                            <input
                                                className="form-input"
                                                value={title}
                                                onChange={(e) => {
                                                    setTitle(e.target.value);
                                                    if (selectedId == null) setSlug(slugify(e.target.value));
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">Slug</label>
                                            <input className="form-input font-mono text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-sm mb-1">Subtitle</label>
                                            <input className="form-input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">Section type</label>
                                            <select className="form-select" value={sectionType} onChange={(e) => setSectionType(e.target.value)}>
                                                {SECTION_TYPES.map((o) => (
                                                    <option key={o.value} value={o.value}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">Strategy</label>
                                            <select className="form-select" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                                                {STRATEGIES.map((o) => (
                                                    <option key={o.value} value={o.value}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">Max products</label>
                                            <input
                                                type="number"
                                                min={1}
                                                className="form-input"
                                                value={maxProducts}
                                                onChange={(e) => setMaxProducts(Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">Position (sort)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                className="form-input"
                                                value={position}
                                                onChange={(e) => setPosition(Number(e.target.value))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">Start (optional)</label>
                                            <input type="datetime-local" className="form-input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">End (optional)</label>
                                            <input type="datetime-local" className="form-input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">Background color</label>
                                            <input
                                                className="form-input"
                                                placeholder="#fef2f2"
                                                value={backgroundColor}
                                                onChange={(e) => setBackgroundColor(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm mb-1">Accent color</label>
                                            <input className="form-input" placeholder="#f97316" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                                        <span>Active</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={showCountdown} onChange={(e) => setShowCountdown(e.target.checked)} />
                                        <span>Show countdown (requires end date)</span>
                                    </label>
                                </>
                            )}

                            {tab === 'rule' && strategy !== 'manual' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm mb-1">Rule type</label>
                                        <select
                                            className="form-select"
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
                                        <label className="block text-sm mb-1">Lookback (days)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            className="form-input"
                                            value={rule.lookback_days}
                                            onChange={(e) => setRule((r) => ({ ...r, lookback_days: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">Min rating</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="form-input"
                                            value={rule.min_rating}
                                            onChange={(e) => setRule((r) => ({ ...r, min_rating: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm mb-1">Tag / keyword filter</label>
                                        <input
                                            className="form-input"
                                            value={rule.tag}
                                            onChange={(e) => setRule((r) => ({ ...r, tag: e.target.value }))}
                                            placeholder="For tag_filter rule"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-sm mb-1">Category (category_best)</label>
                                        <select
                                            className="form-select"
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
                                        <label className="block text-sm mb-1">Low stock threshold</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={rule.low_stock_threshold}
                                            onChange={(e) => setRule((r) => ({ ...r, low_stock_threshold: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">Cache (minutes)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            className="form-input"
                                            value={rule.cache_minutes}
                                            onChange={(e) => setRule((r) => ({ ...r, cache_minutes: Number(e.target.value) }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">Min price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={rule.min_price ?? ''}
                                            onChange={(e) =>
                                                setRule((r) => ({ ...r, min_price: e.target.value === '' ? null : e.target.value }))
                                            }
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm mb-1">Max price</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="form-input"
                                            value={rule.max_price ?? ''}
                                            onChange={(e) =>
                                                setRule((r) => ({ ...r, max_price: e.target.value === '' ? null : e.target.value }))
                                            }
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={rule.only_in_stock}
                                            onChange={(e) => setRule((r) => ({ ...r, only_in_stock: e.target.checked }))}
                                        />
                                        <span>Only in stock</span>
                                    </label>
                                    <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={rule.only_available}
                                            onChange={(e) => setRule((r) => ({ ...r, only_available: e.target.checked }))}
                                        />
                                        <span>Only available flag</span>
                                    </label>
                                </div>
                            )}

                            {tab === 'rule' && strategy === 'manual' && (
                                <p className="text-sm text-white-dark">Manual strategy uses only pinned rows from the Manual picks tab (no population rule).</p>
                            )}

                            {tab === 'items' && (
                                <div className="space-y-4">
                                    {selectedId == null ? (
                                        <p className="text-sm text-warning">Save the section first, then add product UUIDs.</p>
                                    ) : (
                                        <>
                                            <div className="flex flex-wrap gap-2 items-end">
                                                <div className="flex-1 min-w-[200px]">
                                                    <label className="block text-sm mb-1">Product ID (UUID)</label>
                                                    <input
                                                        className="form-input font-mono text-xs"
                                                        value={newProductId}
                                                        onChange={(e) => setNewProductId(e.target.value)}
                                                        placeholder="From product list / Django admin"
                                                    />
                                                </div>
                                                <button type="button" className="btn btn-primary" onClick={handleAddItem}>
                                                    Add product
                                                </button>
                                            </div>
                                            <ul className="divide-y divide-white-light dark:divide-[#1b2e4b] border border-white-light dark:border-[#1b2e4b] rounded">
                                                {(detail?.items ?? []).map((it) => (
                                                    <li key={it.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                                                        <span>
                                                            <span className="font-mono text-xs text-white-dark">{it.product}</span>
                                                            <span className="ml-2">{it.product_name}</span>
                                                        </span>
                                                        <button type="button" className="text-danger" onClick={() => handleRemoveItem(it.id)}>
                                                            <IconTrash className="w-4 h-4" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-white-light dark:border-[#1b2e4b] px-5 py-4 bg-inherit">
                            <button type="button" className="btn btn-outline-primary" onClick={() => setModalOpen(false)}>
                                Cancel
                            </button>
                            {tab !== 'items' && (
                                <button type="button" className="btn btn-primary" disabled={saving || !title.trim()} onClick={handleSave}>
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
