import {
    IconBolt,
    IconChartBar,
    IconClock,
    IconDeviceDesktop,
    IconDeviceMobile,
    IconDeviceTablet,
    IconEdit,
    IconEye,
    IconEyeOff,
    IconFlag,
    IconGlobe,
    IconPlus,
    IconRefresh,
    IconRoute,
    IconTarget,
    IconTrash,
    IconUser,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AdPlacement,
    AdSlotRow,
    AdSlotWritePayload,
    Campaign,
    Creative,
    DEVICE_OPTIONS,
    TargetingRulePayload,
    USER_STATE_OPTIONS,
    adsAdminErrorMessage,
    createSlot,
    deleteSlot,
    emptyTargeting,
    fetchCampaigns,
    fetchCreatives,
    fetchPlacements,
    fetchSlots,
    patchSlot,
    toggleSlot,
} from '../../../services/adsAdminService';
import {
    Alert,
    EmptyState,
    Field,
    LivePreview,
    ModalShell,
    creativeAsPreview,
    inputCls,
} from './_shared';

function emptyDraft(): AdSlotWritePayload {
    return {
        placement: 0,
        creative: '',
        is_active: true,
        weight: 10,
        position_hint: 0,
        starts_at: null,
        ends_at: null,
        dismissible: true,
        show_close_after_seconds: 0,
        delay_seconds: 0,
        cap_per_session: 0,
        cap_per_day: 0,
        cap_per_week: 0,
        targeting: null,
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

const SlotsTab: React.FC<Props> = ({ onChange }) => {
    const [rows, setRows] = useState<AdSlotRow[]>([]);
    const [placements, setPlacements] = useState<AdPlacement[]>([]);
    const [creatives, setCreatives] = useState<Creative[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [placementFilter, setPlacementFilter] = useState<number | ''>('');
    const [campaignFilter, setCampaignFilter] = useState<string>('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<AdSlotWritePayload>(emptyDraft);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const [slots, plList, crList, cpList] = await Promise.all([
                fetchSlots({
                    placement: placementFilter ? Number(placementFilter) : undefined,
                    campaign: campaignFilter || undefined,
                }),
                fetchPlacements(),
                fetchCreatives(),
                fetchCampaigns(),
            ]);
            setRows(slots);
            setPlacements(plList);
            setCreatives(crList);
            setCampaigns(cpList);
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [placementFilter, campaignFilter]);

    useEffect(() => {
        load();
    }, [load]);

    const filteredCreatives = useMemo(() => {
        if (!campaignFilter) return creatives;
        return creatives.filter((c) => c.campaign === campaignFilter);
    }, [creatives, campaignFilter]);

    const creativeMap = useMemo(() => {
        const m: Record<string, Creative> = {};
        creatives.forEach((c) => (m[c.id] = c));
        return m;
    }, [creatives]);

    const openCreate = () => {
        setEditingId(null);
        setDraft({
            ...emptyDraft(),
            placement: placements[0]?.id ?? 0,
            creative: filteredCreatives[0]?.id ?? '',
        });
        setOpen(true);
    };

    const openEdit = (row: AdSlotRow) => {
        setEditingId(row.id);
        setDraft({
            placement: row.placement,
            creative: row.creative,
            is_active: row.is_active,
            weight: row.weight,
            position_hint: row.position_hint,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            dismissible: row.dismissible,
            show_close_after_seconds: row.show_close_after_seconds,
            delay_seconds: row.delay_seconds,
            cap_per_session: row.cap_per_session,
            cap_per_day: row.cap_per_day,
            cap_per_week: row.cap_per_week,
            targeting: row.targeting,
        });
        setOpen(true);
    };

    const save = async () => {
        if (!draft.placement || !draft.creative) {
            setError('Placement and creative are required.');
            return;
        }
        try {
            setSaving(true);
            setError(null);
            if (editingId) await patchSlot(editingId, draft);
            else await createSlot(draft);
            setOpen(false);
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const remove = async (row: AdSlotRow) => {
        if (!confirm(`Delete this ad slot? ("${row.creative_name}" -> ${row.placement_slug})`)) return;
        try {
            await deleteSlot(row.id);
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        }
    };

    const toggle = async (row: AdSlotRow) => {
        try {
            await toggleSlot(row.id);
            await load();
            onChange?.();
        } catch (e) {
            setError(adsAdminErrorMessage(e));
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-3">
                <select
                    value={placementFilter}
                    onChange={(e) =>
                        setPlacementFilter(e.target.value ? Number(e.target.value) : '')
                    }
                    className={`${inputCls} max-w-[260px]`}
                >
                    <option value="">All placements</option>
                    {placements.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name} · {p.slug}
                        </option>
                    ))}
                </select>
                <select
                    value={campaignFilter}
                    onChange={(e) => setCampaignFilter(e.target.value)}
                    className={`${inputCls} max-w-[260px]`}
                >
                    <option value="">All campaigns</option>
                    {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </select>
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
                    disabled={!placements.length || !creatives.length}
                    className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 shadow disabled:opacity-50"
                    title={
                        !placements.length
                            ? 'Create a placement first'
                            : !creatives.length
                            ? 'Create a creative first'
                            : ''
                    }
                >
                    <IconPlus size={16} /> Book a slot
                </button>
            </div>

            {error && <Alert>{error}</Alert>}

            {loading ? (
                <div className="text-center py-12 text-sm text-on-surface-variant">Loading slots…</div>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={<IconTarget size={26} />}
                    title="No slots booked"
                    body="A slot binds a Creative into a Placement with a weight, schedule, and optional targeting. The selection algorithm picks one (or N) per request based on these rules."
                    action={
                        placements.length && creatives.length ? (
                            <button
                                type="button"
                                onClick={openCreate}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90"
                            >
                                <IconPlus size={16} /> Book your first slot
                            </button>
                        ) : (
                            <p className="text-xs text-on-surface-variant">
                                You'll need at least one Placement and one Creative first.
                            </p>
                        )
                    }
                />
            ) : (
                <div className="space-y-3">
                    {rows.map((row) => {
                        const creative = creativeMap[row.creative];
                        return (
                            <div
                                key={row.id}
                                className="group rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 shadow-sm hover:shadow-md transition-all"
                            >
                                <div className="flex items-start gap-4 flex-wrap md:flex-nowrap">
                                    {/* Thumbnail */}
                                    <div className="w-full md:w-[200px] shrink-0">
                                        {creative ? (
                                            <div className="rounded-lg overflow-hidden">
                                                <LivePreview
                                                    creative={creativeAsPreview(creative)}
                                                    variant="banner"
                                                />
                                            </div>
                                        ) : (
                                            <div className="aspect-[21/5] rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-on-surface-variant">
                                                creative missing
                                            </div>
                                        )}
                                    </div>

                                    {/* Body */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-bold text-on-surface dark:text-white">
                                                        {row.creative_name}
                                                    </h3>
                                                    <StatusPill row={row} />
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                                                    <IconRoute size={12} />
                                                    <span>placed in</span>
                                                    <code className="font-mono text-primary">
                                                        {row.placement_slug}
                                                    </code>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => toggle(row)}
                                                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-on-surface-variant"
                                                    title={row.is_active ? 'Pause slot' : 'Activate slot'}
                                                >
                                                    {row.is_active ? (
                                                        <IconEyeOff size={15} />
                                                    ) : (
                                                        <IconEye size={15} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => openEdit(row)}
                                                    className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-on-surface-variant"
                                                    title="Edit"
                                                >
                                                    <IconEdit size={15} />
                                                </button>
                                                <button
                                                    onClick={() => remove(row)}
                                                    className="p-1.5 rounded-md hover:bg-red-100 dark:hover:bg-red-950 text-red-600"
                                                    title="Delete"
                                                >
                                                    <IconTrash size={15} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Pills row */}
                                        <div className="mt-3 flex items-center gap-2 flex-wrap text-[11px]">
                                            <Pill icon={<IconBolt size={11} />} tone="primary">
                                                weight {row.weight}
                                            </Pill>
                                            {(row.starts_at || row.ends_at) && (
                                                <Pill icon={<IconClock size={11} />}>
                                                    {row.starts_at
                                                        ? new Date(row.starts_at).toLocaleDateString()
                                                        : 'now'}
                                                    {' → '}
                                                    {row.ends_at
                                                        ? new Date(row.ends_at).toLocaleDateString()
                                                        : '∞'}
                                                </Pill>
                                            )}
                                            {row.cap_per_day > 0 && (
                                                <Pill icon={<IconUser size={11} />}>
                                                    cap {row.cap_per_day}/day
                                                </Pill>
                                            )}
                                            {row.cap_per_session > 0 && (
                                                <Pill icon={<IconUser size={11} />}>
                                                    cap {row.cap_per_session}/session
                                                </Pill>
                                            )}
                                            {row.delay_seconds > 0 && (
                                                <Pill icon={<IconClock size={11} />}>
                                                    delay {row.delay_seconds}s
                                                </Pill>
                                            )}
                                            <TargetingPills targeting={row.targeting} />
                                        </div>

                                        {/* Stats */}
                                        <div className="mt-3 flex items-center gap-6 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs">
                                            <div className="flex items-center gap-2">
                                                <IconChartBar size={14} className="text-on-surface-variant" />
                                                <span className="text-on-surface-variant">7d:</span>
                                                <span className="font-bold text-on-surface dark:text-white">
                                                    {row.stats?.impressions ?? 0}
                                                </span>
                                                <span className="text-on-surface-variant">imp ·</span>
                                                <span className="font-bold text-on-surface dark:text-white">
                                                    {row.stats?.clicks ?? 0}
                                                </span>
                                                <span className="text-on-surface-variant">
                                                    clicks · {row.stats?.ctr ?? 0}% CTR
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {open && (
                <SlotEditor
                    draft={draft}
                    setDraft={setDraft}
                    placements={placements}
                    creatives={filteredCreatives.length ? filteredCreatives : creatives}
                    creativeMap={creativeMap}
                    onClose={() => setOpen(false)}
                    onSave={save}
                    saving={saving}
                    isEdit={!!editingId}
                    error={error}
                />
            )}
        </div>
    );
};

// ── Status pill ────────────────────────────────────────────────────────────

const StatusPill: React.FC<{ row: AdSlotRow }> = ({ row }) => {
    if (row.is_live) {
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
    if (row.is_active) {
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

const Pill: React.FC<{
    icon?: React.ReactNode;
    tone?: 'default' | 'primary';
    children: React.ReactNode;
}> = ({ icon, tone = 'default', children }) => (
    <span
        className={[
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold',
            tone === 'primary'
                ? 'bg-primary/10 text-primary'
                : 'bg-gray-100 dark:bg-gray-800 text-on-surface-variant',
        ].join(' ')}
    >
        {icon}
        {children}
    </span>
);

const TargetingPills: React.FC<{ targeting: TargetingRulePayload | null }> = ({ targeting }) => {
    if (!targeting) {
        return <Pill>everyone</Pill>;
    }
    const pills: React.ReactNode[] = [];
    if (targeting.countries.length) {
        pills.push(
            <Pill key="geo" icon={<IconGlobe size={11} />}>
                {targeting.countries.slice(0, 3).join(', ')}
                {targeting.countries.length > 3 && ` +${targeting.countries.length - 3}`}
            </Pill>
        );
    }
    if (targeting.devices.length) {
        pills.push(
            <Pill key="dev">
                {targeting.devices.includes('mobile') && <IconDeviceMobile size={11} />}
                {targeting.devices.includes('tablet') && <IconDeviceTablet size={11} />}
                {targeting.devices.includes('desktop') && <IconDeviceDesktop size={11} />}
                {targeting.devices.join('+')}
            </Pill>
        );
    }
    if (targeting.user_states.length) {
        pills.push(
            <Pill key="usr" icon={<IconUser size={11} />}>
                {targeting.user_states.join(', ')}
            </Pill>
        );
    }
    if (targeting.path_includes.length) {
        pills.push(<Pill key="path">paths {targeting.path_includes.length}</Pill>);
    }
    if (targeting.ab_bucket) {
        pills.push(
            <Pill key="ab" icon={<IconFlag size={11} />}>
                A/B: {targeting.ab_bucket}
            </Pill>
        );
    }
    return <>{pills.length ? pills : <Pill>everyone</Pill>}</>;
};

// ── Slot editor ────────────────────────────────────────────────────────────

const SlotEditor: React.FC<{
    draft: AdSlotWritePayload;
    setDraft: React.Dispatch<React.SetStateAction<AdSlotWritePayload>>;
    placements: AdPlacement[];
    creatives: Creative[];
    creativeMap: Record<string, Creative>;
    onClose: () => void;
    onSave: () => void;
    saving: boolean;
    isEdit: boolean;
    error: string | null;
}> = ({ draft, setDraft, placements, creatives, creativeMap, onClose, onSave, saving, isEdit, error }) => {
    const targetingOn = !!draft.targeting;
    const t = draft.targeting ?? emptyTargeting();
    const setT = (patch: Partial<TargetingRulePayload>) =>
        setDraft((d) => ({ ...d, targeting: { ...(d.targeting ?? emptyTargeting()), ...patch } }));
    const selectedCreative = draft.creative ? creativeMap[draft.creative] : null;
    const selectedPlacement = placements.find((p) => p.id === draft.placement);

    return (
        <ModalShell
            title={isEdit ? 'Edit slot' : 'Book a new slot'}
            icon={
                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                    <IconTarget size={18} />
                </span>
            }
            onClose={onClose}
            onSave={onSave}
            saving={saving}
            saveLabel={isEdit ? 'Save changes' : 'Book slot'}
            width="xl"
        >
            <div className="grid lg:grid-cols-[1fr,320px] gap-0 lg:divide-x divide-gray-200 dark:divide-gray-800">
                <div className="p-6 space-y-5">
                    {error && <Alert>{error}</Alert>}

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Placement *">
                            <select
                                className={inputCls}
                                value={draft.placement}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, placement: Number(e.target.value) }))
                                }
                            >
                                <option value={0}>— Select placement —</option>
                                {placements.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} · {p.slug}
                                    </option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Creative *">
                            <select
                                className={inputCls}
                                value={draft.creative}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, creative: e.target.value }))
                                }
                            >
                                <option value="">— Select creative —</option>
                                {creatives.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} ({c.campaign_name})
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    {/* Weight slider */}
                    <Field
                        label="Weight"
                        hint="Selection probability vs other slots in the same placement. Higher wins more often."
                    >
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={0}
                                max={50}
                                value={draft.weight}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, weight: Number(e.target.value) }))
                                }
                                className="flex-1 accent-primary"
                            />
                            <input
                                type="number"
                                min={0}
                                className={`${inputCls} w-20 text-center`}
                                value={draft.weight}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, weight: Number(e.target.value) || 0 }))
                                }
                            />
                        </div>
                    </Field>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Position hint" hint="Carousel ordering (low → first)">
                            <input
                                type="number"
                                min={0}
                                className={inputCls}
                                value={draft.position_hint}
                                onChange={(e) =>
                                    setDraft((d) => ({
                                        ...d,
                                        position_hint: Number(e.target.value) || 0,
                                    }))
                                }
                            />
                        </Field>
                        <Field label="Active?">
                            <label className="flex items-center gap-2 mt-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={draft.is_active}
                                    onChange={(e) =>
                                        setDraft((d) => ({ ...d, is_active: e.target.checked }))
                                    }
                                />
                                Slot is active
                            </label>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Starts at">
                            <input
                                type="datetime-local"
                                className={inputCls}
                                value={toLocalInput(draft.starts_at)}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, starts_at: fromLocalInput(e.target.value) }))
                                }
                            />
                        </Field>
                        <Field label="Ends at">
                            <input
                                type="datetime-local"
                                className={inputCls}
                                value={toLocalInput(draft.ends_at)}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, ends_at: fromLocalInput(e.target.value) }))
                                }
                            />
                        </Field>
                    </div>

                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 bg-gray-50/40 dark:bg-gray-800/30">
                        <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                            Behaviour & frequency caps
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Dismissible?">
                                <label className="flex items-center gap-2 mt-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={draft.dismissible}
                                        onChange={(e) =>
                                            setDraft((d) => ({ ...d, dismissible: e.target.checked }))
                                        }
                                    />
                                    Show close button
                                </label>
                            </Field>
                            <Field label="Modal — close button delay (s)">
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={draft.show_close_after_seconds}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            show_close_after_seconds: Number(e.target.value) || 0,
                                        }))
                                    }
                                />
                            </Field>
                        </div>
                        <Field label="Modal — show after N seconds on page">
                            <input
                                type="number"
                                min={0}
                                className={inputCls}
                                value={draft.delay_seconds}
                                onChange={(e) =>
                                    setDraft((d) => ({ ...d, delay_seconds: Number(e.target.value) || 0 }))
                                }
                            />
                        </Field>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Cap / session">
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={draft.cap_per_session}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            cap_per_session: Number(e.target.value) || 0,
                                        }))
                                    }
                                />
                            </Field>
                            <Field label="Cap / day">
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={draft.cap_per_day}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            cap_per_day: Number(e.target.value) || 0,
                                        }))
                                    }
                                />
                            </Field>
                            <Field label="Cap / week">
                                <input
                                    type="number"
                                    min={0}
                                    className={inputCls}
                                    value={draft.cap_per_week}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            cap_per_week: Number(e.target.value) || 0,
                                        }))
                                    }
                                />
                            </Field>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3 bg-gray-50/40 dark:bg-gray-800/30">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                                Targeting
                            </p>
                            <label className="flex items-center gap-2 text-xs">
                                <input
                                    type="checkbox"
                                    checked={targetingOn}
                                    onChange={(e) =>
                                        setDraft((d) => ({
                                            ...d,
                                            targeting: e.target.checked ? emptyTargeting() : null,
                                        }))
                                    }
                                />
                                Enable targeting (otherwise: everyone)
                            </label>
                        </div>

                        {targetingOn && (
                            <div className="space-y-3 pt-2">
                                <Field label="Countries (ISO-2)" hint="Comma-separated. Empty = anywhere.">
                                    <input
                                        className={`${inputCls} font-mono text-xs`}
                                        value={t.countries.join(',')}
                                        onChange={(e) =>
                                            setT({
                                                countries: e.target.value
                                                    .toUpperCase()
                                                    .split(',')
                                                    .map((s) => s.trim())
                                                    .filter(Boolean),
                                            })
                                        }
                                        placeholder="GH,NG,KE"
                                    />
                                </Field>
                                <Field label="Exclude countries">
                                    <input
                                        className={`${inputCls} font-mono text-xs`}
                                        value={t.exclude_countries.join(',')}
                                        onChange={(e) =>
                                            setT({
                                                exclude_countries: e.target.value
                                                    .toUpperCase()
                                                    .split(',')
                                                    .map((s) => s.trim())
                                                    .filter(Boolean),
                                            })
                                        }
                                        placeholder="US,CN"
                                    />
                                </Field>
                                <Field label="Devices">
                                    <div className="flex gap-2 flex-wrap">
                                        {DEVICE_OPTIONS.map((opt) => {
                                            const checked = t.devices.includes(opt.value);
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() =>
                                                        setT({
                                                            devices: checked
                                                                ? t.devices.filter((d) => d !== opt.value)
                                                                : [...t.devices, opt.value],
                                                        })
                                                    }
                                                    className={[
                                                        'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                                                        checked
                                                            ? 'bg-primary text-white border-primary'
                                                            : 'border-gray-300 dark:border-gray-700 text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800',
                                                    ].join(' ')}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Field>
                                <Field label="User states">
                                    <div className="flex gap-2 flex-wrap">
                                        {USER_STATE_OPTIONS.map((opt) => {
                                            const checked = t.user_states.includes(opt.value);
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    onClick={() =>
                                                        setT({
                                                            user_states: checked
                                                                ? t.user_states.filter(
                                                                      (s) => s !== opt.value
                                                                  )
                                                                : [...t.user_states, opt.value],
                                                        })
                                                    }
                                                    className={[
                                                        'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
                                                        checked
                                                            ? 'bg-primary text-white border-primary'
                                                            : 'border-gray-300 dark:border-gray-700 text-on-surface-variant hover:bg-gray-100 dark:hover:bg-gray-800',
                                                    ].join(' ')}
                                                >
                                                    {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </Field>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Path includes">
                                        <input
                                            className={`${inputCls} text-xs`}
                                            value={t.path_includes.join(',')}
                                            onChange={(e) =>
                                                setT({
                                                    path_includes: e.target.value
                                                        .split(',')
                                                        .map((s) => s.trim())
                                                        .filter(Boolean),
                                                })
                                            }
                                            placeholder="/electronics,/deals"
                                        />
                                    </Field>
                                    <Field label="Path excludes">
                                        <input
                                            className={`${inputCls} text-xs`}
                                            value={t.path_excludes.join(',')}
                                            onChange={(e) =>
                                                setT({
                                                    path_excludes: e.target.value
                                                        .split(',')
                                                        .map((s) => s.trim())
                                                        .filter(Boolean),
                                                })
                                            }
                                            placeholder="/checkout"
                                        />
                                    </Field>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <Field label="Min cart">
                                        <input
                                            type="number"
                                            className={inputCls}
                                            value={t.min_cart_value ?? ''}
                                            onChange={(e) =>
                                                setT({
                                                    min_cart_value: e.target.value
                                                        ? Number(e.target.value)
                                                        : null,
                                                })
                                            }
                                        />
                                    </Field>
                                    <Field label="Max cart">
                                        <input
                                            type="number"
                                            className={inputCls}
                                            value={t.max_cart_value ?? ''}
                                            onChange={(e) =>
                                                setT({
                                                    max_cart_value: e.target.value
                                                        ? Number(e.target.value)
                                                        : null,
                                                })
                                            }
                                        />
                                    </Field>
                                    <Field label="A/B bucket">
                                        <input
                                            className={inputCls}
                                            value={t.ab_bucket}
                                            onChange={(e) => setT({ ab_bucket: e.target.value })}
                                            placeholder="A"
                                        />
                                    </Field>
                                </div>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={t.only_with_empty_cart}
                                        onChange={(e) => setT({ only_with_empty_cart: e.target.checked })}
                                    />
                                    Only show when cart is empty
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: contextual preview + summary */}
                <div className="lg:sticky lg:top-0 lg:self-start p-6 bg-gray-50/60 dark:bg-gray-950/40 space-y-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        Slot summary
                    </p>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 bg-white dark:bg-gray-900 space-y-2 text-xs">
                        <div className="text-on-surface-variant">Will appear in</div>
                        <div className="font-bold text-on-surface dark:text-white">
                            {selectedPlacement?.name ?? '—'}
                        </div>
                        <code className="block text-[11px] text-primary font-mono">
                            &lt;AdSlot slug="{selectedPlacement?.slug ?? '?'}" /&gt;
                        </code>
                    </div>

                    {selectedCreative && (
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                                What it will look like
                            </p>
                            <LivePreview creative={creativeAsPreview(selectedCreative)} variant="banner" />
                        </div>
                    )}

                    <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 p-3 text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed">
                        <strong>How weight works:</strong> if 3 slots compete for the same placement
                        with weights 20 / 10 / 10, the first wins ~50% of the time, the others ~25% each.
                        Bump weight to win more often.
                    </div>
                </div>
            </div>
        </ModalShell>
    );
};

export default SlotsTab;
