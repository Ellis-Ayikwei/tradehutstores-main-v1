import {
    IconCheck,
    IconCopy,
    IconEdit,
    IconLayoutGrid,
    IconPlus,
    IconRefresh,
    IconRepeat,
    IconRotate,
    IconTrash,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AdPlacement,
    PLACEMENT_FORMATS,
    PlacementFormat,
    PlacementWritePayload,
    adsAdminErrorMessage,
    createPlacement,
    deletePlacement,
    fetchPlacements,
    patchPlacement,
} from '../../../services/adsAdminService';
import {
    Alert,
    EmptyState,
    FORMAT_ICONS,
    FORMAT_LOCATION_HINT,
    Field,
    LiveDot,
    ModalShell,
    inputCls,
} from './_shared';

function slugify(s: string): string {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function emptyDraft(): PlacementWritePayload {
    return {
        slug: '',
        name: '',
        description: '',
        format: 'banner',
        aspect_ratio: '21/4',
        max_active_slots: 1,
        rotation_seconds: 0,
        is_active: true,
    };
}

interface Props {
    onChange?: () => void;
}

const PlacementsTab: React.FC<Props> = ({ onChange }) => {
    const [rows, setRows] = useState<AdPlacement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<PlacementWritePayload>(emptyDraft);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setRows(await fetchPlacements());
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const filtered = useMemo(() => {
        const s = search.trim().toLowerCase();
        if (!s) return rows;
        return rows.filter((r) => r.slug.toLowerCase().includes(s) || r.name.toLowerCase().includes(s));
    }, [rows, search]);

    const openCreate = () => {
        setEditingId(null);
        setDraft(emptyDraft());
        setOpen(true);
    };

    const openEdit = (row: AdPlacement) => {
        setEditingId(row.id);
        setDraft({
            slug: row.slug,
            name: row.name,
            description: row.description,
            format: row.format,
            aspect_ratio: row.aspect_ratio,
            max_active_slots: row.max_active_slots,
            rotation_seconds: row.rotation_seconds,
            is_active: row.is_active,
        });
        setOpen(true);
    };

    const save = async () => {
        if (!draft.name.trim() || !draft.slug.trim()) {
            setError('Name and slug are required.');
            return;
        }
        try {
            setSaving(true);
            setError(null);
            if (editingId) {
                await patchPlacement(editingId, draft);
            } else {
                await createPlacement(draft);
            }
            setOpen(false);
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (row: AdPlacement) => {
        if (!confirm(`Delete placement "${row.name}"? All slots in it will be deleted too.`)) return;
        try {
            await deletePlacement(row.id);
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        }
    };

    const toggle = async (row: AdPlacement) => {
        try {
            await patchPlacement(row.id, { is_active: !row.is_active });
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        }
    };

    const copySlug = async (slug: string) => {
        try {
            await navigator.clipboard.writeText(`<AdSlot slug="${slug}" />`);
        } catch {
            /* ignore */
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3">
                <input
                    placeholder="Search by slug or name…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`${inputCls} max-w-sm`}
                />
                <button
                    type="button"
                    onClick={load}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-700 text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                    <IconRefresh size={16} /> Refresh
                </button>
                <button
                    type="button"
                    onClick={openCreate}
                    className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 shadow"
                >
                    <IconPlus size={16} /> New placement
                </button>
            </div>

            {error && <Alert>{error}</Alert>}

            {loading ? (
                <div className="text-center py-12 text-sm text-on-surface-variant">Loading placements…</div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={<IconLayoutGrid size={26} />}
                    title="No placements yet"
                    body="A placement is a named slot on the storefront (e.g. 'homepage-top-bar'). The FE renders ads via <AdSlot slug='your-slug' />. You usually create these once and rarely touch them after."
                    action={
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90"
                        >
                            <IconPlus size={16} /> Create your first placement
                        </button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((row) => {
                        const Icon = FORMAT_ICONS[row.format as PlacementFormat] || IconLayoutGrid;
                        return (
                            <div
                                key={row.id}
                                className="group rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div
                                            className={[
                                                'shrink-0 p-2.5 rounded-xl transition-colors',
                                                row.is_active
                                                    ? 'bg-primary/10 text-primary'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-on-surface-variant',
                                            ].join(' ')}
                                        >
                                            <Icon size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-bold text-on-surface dark:text-white truncate">
                                                    {row.name}
                                                </h3>
                                                <LiveDot on={row.is_active} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => copySlug(row.slug)}
                                                title="Copy <AdSlot> snippet"
                                                className="mt-0.5 group/slug inline-flex items-center gap-1 text-[11px] font-mono text-on-surface-variant hover:text-primary transition"
                                            >
                                                <code>{row.slug}</code>
                                                <IconCopy size={10} className="opacity-0 group-hover/slug:opacity-100 transition" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => toggle(row)}
                                            title={row.is_active ? 'Pause placement' : 'Activate'}
                                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-on-surface-variant"
                                        >
                                            <IconCheck size={15} />
                                        </button>
                                        <button
                                            onClick={() => openEdit(row)}
                                            title="Edit"
                                            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-on-surface-variant"
                                        >
                                            <IconEdit size={15} />
                                        </button>
                                        <button
                                            onClick={() => remove(row)}
                                            title="Delete"
                                            className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-red-600"
                                        >
                                            <IconTrash size={15} />
                                        </button>
                                    </div>
                                </div>

                                <p className="mt-3 text-xs text-on-surface-variant line-clamp-2">
                                    {row.description ||
                                        FORMAT_LOCATION_HINT[row.format as PlacementFormat] ||
                                        '—'}
                                </p>

                                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                                    <Stat label="Format" value={row.format} />
                                    <Stat
                                        label="Active slots"
                                        value={row.active_slot_count}
                                        accent={row.active_slot_count > 0 ? 'emerald' : 'gray'}
                                    />
                                    <Stat label="Max" value={row.max_active_slots} />
                                </div>

                                <div className="mt-3 flex items-center gap-2 flex-wrap text-[10px] text-on-surface-variant">
                                    {row.aspect_ratio && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                            <span className="font-mono">{row.aspect_ratio}</span>
                                        </span>
                                    )}
                                    {row.rotation_seconds > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                            <IconRepeat size={10} /> rotates {row.rotation_seconds}s
                                        </span>
                                    )}
                                    {row.max_active_slots > 1 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                            <IconRotate size={10} /> carousel up to {row.max_active_slots}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {open && (
                <ModalShell
                    title={editingId ? 'Edit placement' : 'New placement'}
                    icon={
                        <span className="p-2 rounded-lg bg-primary/10 text-primary">
                            <IconLayoutGrid size={18} />
                        </span>
                    }
                    onClose={() => setOpen(false)}
                    onSave={save}
                    saving={saving}
                    saveLabel={editingId ? 'Save changes' : 'Create placement'}
                    width="md"
                >
                    <div className="p-6 space-y-4">
                        {error && <Alert>{error}</Alert>}

                        <Field label="Name *">
                            <input
                                className={inputCls}
                                value={draft.name}
                                onChange={(e) => {
                                    const name = e.target.value;
                                    setDraft((d) => ({
                                        ...d,
                                        name,
                                        slug: editingId ? d.slug : slugify(name),
                                    }));
                                }}
                                placeholder="Homepage Top Bar"
                            />
                        </Field>
                        <Field
                            label="Slug *"
                            hint={`Used by the FE: <AdSlot slug="${draft.slug || 'your-slug'}" />`}
                        >
                            <input
                                className={`${inputCls} font-mono text-xs`}
                                value={draft.slug}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, slug: slugify(e.target.value) }))
                                }
                                placeholder="homepage-top-bar"
                            />
                        </Field>
                        <Field label="Description">
                            <textarea
                                className={inputCls}
                                rows={2}
                                value={draft.description}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, description: e.target.value }))
                                }
                                placeholder="Where this slot appears, expected creative size, ownership…"
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Format">
                                <select
                                    className={inputCls}
                                    value={draft.format}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            format: e.target.value as typeof d.format,
                                        }))
                                    }
                                >
                                    {PLACEMENT_FORMATS.map((f) => (
                                        <option key={f.value} value={f.value}>
                                            {f.label}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1 text-[11px] text-on-surface-variant">
                                    {FORMAT_LOCATION_HINT[draft.format as PlacementFormat]}
                                </p>
                            </Field>
                            <Field label="Aspect ratio" hint="Hint to creative producers (21/4, 16/9, 1/1)">
                                <input
                                    className={`${inputCls} font-mono text-xs`}
                                    value={draft.aspect_ratio}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, aspect_ratio: e.target.value }))
                                    }
                                    placeholder="21/4"
                                />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Max active slots" hint="≥ 2 enables carousel mode">
                                <input
                                    type="number"
                                    min={1}
                                    max={20}
                                    className={inputCls}
                                    value={draft.max_active_slots}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            max_active_slots: Math.max(1, Number(e.target.value) || 1),
                                        }))
                                    }
                                />
                            </Field>
                            <Field label="Rotation seconds" hint="0 = no rotate (only with max ≥ 2)">
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={draft.rotation_seconds}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            rotation_seconds: Math.max(0, Number(e.target.value) || 0),
                                        }))
                                    }
                                />
                            </Field>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-on-surface dark:text-gray-200">
                            <input
                                type="checkbox"
                                checked={draft.is_active}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, is_active: e.target.checked }))
                                }
                            />
                            Placement is active (ads will serve)
                        </label>
                    </div>
                </ModalShell>
            )}
        </div>
    );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; accent?: 'emerald' | 'gray' }> = ({
    label,
    value,
    accent = 'gray',
}) => (
    <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wide text-on-surface-variant">{label}</p>
        <p
            className={[
                'font-bold text-sm truncate capitalize',
                accent === 'emerald' ? 'text-emerald-600' : 'text-on-surface dark:text-white',
            ].join(' ')}
        >
            {value}
        </p>
    </div>
);

export default PlacementsTab;
