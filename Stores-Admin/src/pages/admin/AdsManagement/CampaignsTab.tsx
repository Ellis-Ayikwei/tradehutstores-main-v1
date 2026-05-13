import {
    IconBolt,
    IconCalendarTime,
    IconChartBar,
    IconChevronRight,
    IconClick,
    IconEdit,
    IconEye,
    IconFlame,
    IconPlus,
    IconRefresh,
    IconRocket,
    IconSparkles,
    IconSpeakerphone,
    IconTrash,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    CAMPAIGN_PRIORITIES,
    CAMPAIGN_STATUSES,
    Campaign,
    CampaignStatus,
    CampaignWritePayload,
    adsAdminErrorMessage,
    createCampaign,
    deleteCampaign,
    fetchCampaigns,
    patchCampaign,
} from '../../../services/adsAdminService';
import {
    Alert,
    EmptyState,
    Field,
    ModalShell,
    StatusBadge,
    inputCls,
} from './_shared';

function emptyDraft(): CampaignWritePayload {
    return {
        name: '',
        advertiser: '',
        seller: null,
        status: 'draft',
        priority: 5,
        starts_at: null,
        ends_at: null,
        daily_impression_cap: null,
        total_impression_cap: null,
        notes: '',
    };
}

function toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): string | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

interface Props {
    onChange?: () => void;
}

const CampaignsTab: React.FC<Props> = ({ onChange }) => {
    const [rows, setRows] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<CampaignWritePayload>(emptyDraft);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setRows(await fetchCampaigns());
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
        return rows
            .filter((r) => statusFilter === 'all' || r.status === statusFilter)
            .filter(
                (r) =>
                    !s ||
                    r.name.toLowerCase().includes(s) ||
                    r.advertiser.toLowerCase().includes(s)
            );
    }, [rows, search, statusFilter]);

    const counts = useMemo(() => {
        const out: Record<string, number> = { all: rows.length };
        CAMPAIGN_STATUSES.forEach((s) => {
            out[s.value] = rows.filter((r) => r.status === s.value).length;
        });
        return out;
    }, [rows]);

    const openCreate = () => {
        setEditingId(null);
        setDraft(emptyDraft());
        setOpen(true);
    };

    const openEdit = (row: Campaign) => {
        setEditingId(row.id);
        setDraft({
            name: row.name,
            advertiser: row.advertiser,
            seller: row.seller,
            status: row.status,
            priority: row.priority,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            daily_impression_cap: row.daily_impression_cap,
            total_impression_cap: row.total_impression_cap,
            notes: row.notes ?? '',
        });
        setOpen(true);
    };

    const save = async () => {
        if (!draft.name.trim()) {
            setError('Campaign name is required.');
            return;
        }
        try {
            setSaving(true);
            setError(null);
            if (editingId) await patchCampaign(editingId, draft);
            else await createCampaign(draft);
            setOpen(false);
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (row: Campaign) => {
        if (!confirm(`Delete campaign "${row.name}" and all its creatives?`)) return;
        try {
            await deleteCampaign(row.id);
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        }
    };

    const cycleStatus = async (row: Campaign) => {
        const next: CampaignStatus =
            row.status === 'running' ? 'paused' : row.status === 'paused' ? 'running' : 'running';
        try {
            await patchCampaign(row.id, { status: next });
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        }
    };

    return (
        <div className="space-y-4">
            {/* Status segmented filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-x-auto">
                <FilterChip
                    active={statusFilter === 'all'}
                    onClick={() => setStatusFilter('all')}
                    label="All"
                    count={counts.all}
                />
                {CAMPAIGN_STATUSES.filter((s) => s.value !== 'archived').map((s) => (
                    <FilterChip
                        key={s.value}
                        active={statusFilter === s.value}
                        onClick={() => setStatusFilter(s.value)}
                        label={s.label}
                        count={counts[s.value] ?? 0}
                        dotColor={s.color}
                    />
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3">
                <input
                    placeholder="Search by campaign or advertiser…"
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
                    <IconPlus size={16} /> New campaign
                </button>
            </div>

            {error && <Alert>{error}</Alert>}

            {loading ? (
                <div className="text-center py-12 text-sm text-on-surface-variant">
                    Loading campaigns…
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={<IconSpeakerphone size={26} />}
                    title="No campaigns yet"
                    body="A campaign is the umbrella for an ad push (status, schedule, advertiser, impression caps). You group creatives under it, then book them into placements as slots."
                    action={
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90"
                        >
                            <IconPlus size={16} /> Create your first campaign
                        </button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((row) => (
                        <CampaignCard
                            key={row.id}
                            row={row}
                            onEdit={() => openEdit(row)}
                            onCycleStatus={() => cycleStatus(row)}
                            onDelete={() => remove(row)}
                        />
                    ))}
                </div>
            )}

            {open && (
                <ModalShell
                    title={editingId ? 'Edit campaign' : 'New campaign'}
                    icon={
                        <span className="p-2 rounded-lg bg-primary/10 text-primary">
                            <IconRocket size={18} />
                        </span>
                    }
                    onClose={() => setOpen(false)}
                    onSave={save}
                    saving={saving}
                    saveLabel={editingId ? 'Save changes' : 'Create campaign'}
                    width="lg"
                >
                    <div className="p-6 space-y-4">
                        {error && <Alert>{error}</Alert>}

                        <Field label="Campaign name *">
                            <input
                                className={inputCls}
                                value={draft.name}
                                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                                placeholder="Black Friday 2026"
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Advertiser / brand">
                                <input
                                    className={inputCls}
                                    value={draft.advertiser}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, advertiser: e.target.value }))
                                    }
                                    placeholder="TradeHut House"
                                />
                            </Field>
                            <Field
                                label="Seller (optional)"
                                hint="UUID of the seller this is paid for. Leave blank for in-house pushes."
                            >
                                <input
                                    className={`${inputCls} font-mono text-xs`}
                                    value={draft.seller ?? ''}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            seller: e.target.value.trim() || null,
                                        }))
                                    }
                                    placeholder="seller UUID"
                                />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Status">
                                <div className="grid grid-cols-3 gap-1">
                                    {CAMPAIGN_STATUSES.filter((s) => s.value !== 'archived').map((s) => (
                                        <button
                                            key={s.value}
                                            type="button"
                                            onClick={() =>
                                                setDraft((d) => ({ ...d, status: s.value }))
                                            }
                                            className={[
                                                'px-2 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide transition border',
                                                draft.status === s.value
                                                    ? 'text-white border-transparent shadow'
                                                    : 'border-gray-300 dark:border-gray-700 text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800',
                                            ].join(' ')}
                                            style={
                                                draft.status === s.value
                                                    ? { backgroundColor: s.color }
                                                    : undefined
                                            }
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </Field>
                            <Field label="Priority" hint="Higher priority wins more often in the auction">
                                <select
                                    className={inputCls}
                                    value={draft.priority}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, priority: Number(e.target.value) }))
                                    }
                                >
                                    {CAMPAIGN_PRIORITIES.map((p) => (
                                        <option key={p.value} value={p.value}>
                                            {p.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Starts at">
                                <input
                                    type="datetime-local"
                                    className={inputCls}
                                    value={toLocalInput(draft.starts_at)}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            starts_at: fromLocalInput(e.target.value),
                                        }))
                                    }
                                />
                            </Field>
                            <Field label="Ends at">
                                <input
                                    type="datetime-local"
                                    className={inputCls}
                                    value={toLocalInput(draft.ends_at)}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            ends_at: fromLocalInput(e.target.value),
                                        }))
                                    }
                                />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Daily impression cap" hint="Pause for the day after N impressions">
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={draft.daily_impression_cap ?? ''}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            daily_impression_cap: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                        }))
                                    }
                                    placeholder="No limit"
                                />
                            </Field>
                            <Field label="Total impression cap" hint="End campaign after N total">
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={draft.total_impression_cap ?? ''}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            total_impression_cap: e.target.value
                                                ? Number(e.target.value)
                                                : null,
                                        }))
                                    }
                                    placeholder="No limit"
                                />
                            </Field>
                        </div>
                        <Field label="Internal notes" hint="Briefing, contract, deal terms…">
                            <textarea
                                rows={3}
                                className={inputCls}
                                value={draft.notes}
                                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                            />
                        </Field>
                    </div>
                </ModalShell>
            )}
        </div>
    );
};

const FilterChip: React.FC<{
    active: boolean;
    onClick: () => void;
    label: string;
    count: number;
    dotColor?: string;
}> = ({ active, onClick, label, count, dotColor }) => (
    <button
        type="button"
        onClick={onClick}
        className={[
            'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap',
            active
                ? 'bg-primary text-white shadow'
                : 'text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800',
        ].join(' ')}
    >
        {dotColor && (
            <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: active ? '#ffffff' : dotColor }}
            />
        )}
        {label}
        <span
            className={[
                'inline-block px-1.5 rounded text-[10px] font-bold',
                active ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-800 text-on-surface-variant',
            ].join(' ')}
        >
            {count}
        </span>
    </button>
);

const CampaignCard: React.FC<{
    row: Campaign;
    onEdit: () => void;
    onCycleStatus: () => void;
    onDelete: () => void;
}> = ({ row, onEdit, onCycleStatus, onDelete }) => {
    const isUrgent = row.priority >= 20;
    const isHigh = row.priority >= 10 && !isUrgent;

    return (
        <div className="group rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all relative overflow-hidden">
            {/* Priority accent stripe */}
            {(isUrgent || isHigh) && (
                <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: isUrgent ? '#dc2626' : '#f59e0b' }}
                />
            )}

            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <StatusBadge status={row.status} />
                        {isUrgent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                <IconFlame size={10} /> URGENT
                            </span>
                        )}
                        {isHigh && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                <IconBolt size={10} /> HIGH
                            </span>
                        )}
                    </div>
                    <h3 className="font-bold text-on-surface dark:text-white truncate">{row.name}</h3>
                    <p className="text-xs text-on-surface-variant truncate flex items-center gap-1.5 mt-0.5">
                        <IconSparkles size={11} />
                        {row.advertiser || 'No advertiser'}
                        {row.seller_name && (
                            <span className="text-primary">· {row.seller_name}</span>
                        )}
                    </p>
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onEdit}
                        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-on-surface-variant"
                        title="Edit"
                    >
                        <IconEdit size={15} />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-red-600"
                        title="Delete"
                    >
                        <IconTrash size={15} />
                    </button>
                </div>
            </div>

            {/* Schedule */}
            <div className="mt-3 flex items-center gap-2 text-[11px] text-on-surface-variant">
                <IconCalendarTime size={12} />
                {row.starts_at || row.ends_at ? (
                    <span>
                        {row.starts_at ? new Date(row.starts_at).toLocaleDateString() : 'now'}
                        <IconChevronRight size={10} className="inline mx-0.5" />
                        {row.ends_at ? new Date(row.ends_at).toLocaleDateString() : '∞'}
                    </span>
                ) : (
                    <span>Always on</span>
                )}
            </div>

            {/* Caps */}
            {(row.daily_impression_cap || row.total_impression_cap) && (
                <div className="mt-2 flex items-center gap-3 text-[11px] text-on-surface-variant">
                    {row.daily_impression_cap && (
                        <span>cap {row.daily_impression_cap.toLocaleString()}/day</span>
                    )}
                    {row.total_impression_cap && (
                        <span>cap {row.total_impression_cap.toLocaleString()} total</span>
                    )}
                </div>
            )}

            {/* Stats */}
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-2 text-xs">
                <div>
                    <div className="flex items-center gap-1 text-on-surface-variant text-[10px] uppercase tracking-wide">
                        <IconChartBar size={10} /> Creatives
                    </div>
                    <p className="font-bold text-on-surface dark:text-white text-lg leading-tight mt-0.5">
                        {row.creative_count}
                    </p>
                </div>
                <div>
                    <div className="flex items-center gap-1 text-on-surface-variant text-[10px] uppercase tracking-wide">
                        <IconEye size={10} /> Impr 30d
                    </div>
                    <p className="font-bold text-on-surface dark:text-white text-lg leading-tight mt-0.5">
                        {(row.stats?.impressions ?? 0).toLocaleString()}
                    </p>
                </div>
                <div>
                    <div className="flex items-center gap-1 text-on-surface-variant text-[10px] uppercase tracking-wide">
                        <IconClick size={10} /> CTR
                    </div>
                    <p
                        className={[
                            'font-bold text-lg leading-tight mt-0.5',
                            (row.stats?.ctr ?? 0) >= 1.5
                                ? 'text-emerald-600'
                                : (row.stats?.ctr ?? 0) > 0
                                ? 'text-amber-600'
                                : 'text-on-surface dark:text-white',
                        ].join(' ')}
                    >
                        {row.stats?.ctr ?? 0}%
                    </p>
                </div>
            </div>

            {/* Status quick toggle */}
            <button
                type="button"
                onClick={onCycleStatus}
                className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-gray-300 dark:border-gray-700 text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                title={
                    row.status === 'running'
                        ? 'Pause this campaign'
                        : 'Set to Running — ads start serving'
                }
            >
                {row.status === 'running' ? '⏸ Pause campaign' : '▶ Run campaign'}
            </button>
        </div>
    );
};

export default CampaignsTab;
