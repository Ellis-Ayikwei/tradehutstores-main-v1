import { BarChart3, Clock, Eye, EyeOff, Flag, Globe, Pencil, Plus, RefreshCw, Route, Target, Trash2, User, Zap } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Switch } from '@/components/shadcn/switch';
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
import { Alert, CheckRow, ConfirmDialog, DeviceIcon, EmptyState, Field, FormSection, FormSheet, LivePreview, SimpleSelect, Toolbar, creativeAsPreview, fromLocalInput, toLocalInput } from './_shared';

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
    const [formError, setFormError] = useState<string | null>(null);

    const [placementFilter, setPlacementFilter] = useState<number | ''>('');
    const [campaignFilter, setCampaignFilter] = useState<string>('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<AdSlotWritePayload>(emptyDraft);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [toDelete, setToDelete] = useState<AdSlotRow | null>(null);
    const [deleting, setDeleting] = useState(false);

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
        setFormError(null);
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
        setFormError(null);
        setOpen(true);
    };

    const save = async () => {
        if (!draft.placement || !draft.creative) {
            setFormError('Placement and creative are required.');
            return;
        }
        try {
            setSaving(true);
            setFormError(null);
            if (editingId) await patchSlot(editingId, draft);
            else await createSlot(draft);
            toast.success(editingId ? 'Slot saved' : 'Slot booked');
            setOpen(false);
            await load();
            onChange?.();
        } catch (e) {
            setFormError(adsAdminErrorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const confirmRemove = async () => {
        if (!toDelete) return;
        try {
            setDeleting(true);
            await deleteSlot(toDelete.id);
            toast.success('Slot deleted');
            setToDelete(null);
            await load();
            onChange?.();
        } catch (e) {
            toast.error(adsAdminErrorMessage(e));
        } finally {
            setDeleting(false);
        }
    };

    const toggle = async (row: AdSlotRow) => {
        try {
            await toggleSlot(row.id);
            toast.success(row.is_active ? 'Slot paused' : 'Slot activated');
            await load();
            onChange?.();
        } catch (e) {
            toast.error(adsAdminErrorMessage(e));
        }
    };

    const canBook = placements.length > 0 && creatives.length > 0;

    return (
        <div className="space-y-4">
            <Toolbar>
                <SimpleSelect
                    value={placementFilter === '' ? '' : String(placementFilter)}
                    onChange={(v) => setPlacementFilter(v ? Number(v) : '')}
                    options={[{ value: '', label: 'All placements' }, ...placements.map((p) => ({ value: String(p.id), label: `${p.name} · ${p.slug}` }))]}
                    className="sm:w-64"
                />
                <SimpleSelect
                    value={campaignFilter}
                    onChange={setCampaignFilter}
                    options={[{ value: '', label: 'All campaigns' }, ...campaigns.map((c) => ({ value: c.id, label: c.name }))]}
                    className="sm:w-64"
                />
                <div className="flex gap-2 sm:ml-auto">
                    <Button type="button" variant="outline" onClick={load} className="flex-1 sm:flex-none">
                        <RefreshCw /> Refresh
                    </Button>
                    <Button
                        type="button"
                        onClick={openCreate}
                        disabled={!canBook}
                        className="flex-1 sm:flex-none"
                        title={!placements.length ? 'Create a placement first' : !creatives.length ? 'Create a creative first' : undefined}
                    >
                        <Plus /> Book a slot
                    </Button>
                </div>
            </Toolbar>

            {error ? <Alert onRetry={load}>{error}</Alert> : null}

            {loading ? (
                <div className="space-y-3" aria-busy="true" aria-label="Loading">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <EmptyState
                    icon={Target}
                    title="No slots booked"
                    body="A slot binds a creative into a placement with a weight, schedule, and optional targeting. The selection algorithm picks one (or N) per request based on these rules."
                    action={
                        canBook ? (
                            <Button type="button" onClick={openCreate}>
                                <Plus /> Book your first slot
                            </Button>
                        ) : (
                            <p className="text-xs text-muted-foreground">You'll need at least one placement and one creative first.</p>
                        )
                    }
                />
            ) : (
                <div className="space-y-3">
                    {rows.map((row) => {
                        const creative = creativeMap[row.creative];
                        return (
                            <Card key={row.id} className="p-4">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                                    <div className="w-full shrink-0 md:w-52">
                                        {creative ? (
                                            <LivePreview creative={creativeAsPreview(creative)} variant="banner" />
                                        ) : (
                                            <div className="flex aspect-[21/5] items-center justify-center rounded-xl bg-muted text-xs text-muted-foreground">creative missing</div>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h3 className="font-semibold text-foreground">{row.creative_name}</h3>
                                                    <StatusPill row={row} />
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Route className="h-3 w-3" aria-hidden />
                                                    <span>placed in</span>
                                                    <code className="font-mono text-primary">{row.placement_slug}</code>
                                                </div>
                                            </div>
                                            <div className="flex shrink-0 gap-1">
                                                <Button type="button" variant="ghost" size="icon-sm" onClick={() => toggle(row)} aria-label={row.is_active ? 'Pause slot' : 'Activate slot'} title={row.is_active ? 'Pause slot' : 'Activate slot'}>
                                                    {row.is_active ? <EyeOff /> : <Eye />}
                                                </Button>
                                                <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label="Edit slot">
                                                    <Pencil />
                                                </Button>
                                                <Button type="button" variant="destructive" size="icon-sm" onClick={() => setToDelete(row)} aria-label="Delete slot">
                                                    <Trash2 />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                            <Badge variant="default">
                                                <Zap aria-hidden /> weight {row.weight}
                                            </Badge>
                                            {row.starts_at || row.ends_at ? (
                                                <Badge variant="secondary">
                                                    <Clock aria-hidden />
                                                    {row.starts_at ? new Date(row.starts_at).toLocaleDateString() : 'now'}
                                                    {' → '}
                                                    {row.ends_at ? new Date(row.ends_at).toLocaleDateString() : 'no end'}
                                                </Badge>
                                            ) : null}
                                            {row.cap_per_day > 0 ? (
                                                <Badge variant="secondary">
                                                    <User aria-hidden /> cap {row.cap_per_day}/day
                                                </Badge>
                                            ) : null}
                                            {row.cap_per_session > 0 ? (
                                                <Badge variant="secondary">
                                                    <User aria-hidden /> cap {row.cap_per_session}/session
                                                </Badge>
                                            ) : null}
                                            {row.delay_seconds > 0 ? (
                                                <Badge variant="secondary">
                                                    <Clock aria-hidden /> delay {row.delay_seconds}s
                                                </Badge>
                                            ) : null}
                                            <TargetingPills targeting={row.targeting} />
                                        </div>

                                        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                                            <BarChart3 className="h-3.5 w-3.5" aria-hidden />
                                            <span>7d:</span>
                                            <span className="font-bold text-foreground">{row.stats?.impressions ?? 0}</span>
                                            <span>imp ·</span>
                                            <span className="font-bold text-foreground">{row.stats?.clicks ?? 0}</span>
                                            <span>clicks · {row.stats?.ctr ?? 0}% CTR</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <SlotEditor
                open={open}
                draft={draft}
                setDraft={setDraft}
                placements={placements}
                creatives={filteredCreatives.length ? filteredCreatives : creatives}
                creativeMap={creativeMap}
                onClose={() => setOpen(false)}
                onSave={save}
                saving={saving}
                isEdit={!!editingId}
                error={formError}
            />

            <ConfirmDialog
                open={toDelete !== null}
                title="Delete this ad slot?"
                description={toDelete ? `"${toDelete.creative_name}" will be removed from ${toDelete.placement_slug}. This cannot be undone.` : undefined}
                busy={deleting}
                onConfirm={confirmRemove}
                onCancel={() => setToDelete(null)}
            />
        </div>
    );
};

// ── Status pill ────────────────────────────────────────────────────────────

const StatusPill: React.FC<{ row: AdSlotRow }> = ({ row }) => {
    if (row.is_live) {
        return (
            <Badge variant="success">
                <span className="h-1.5 w-1.5 rounded-full bg-success-600" aria-hidden />
                Live
            </Badge>
        );
    }
    if (row.is_active) return <Badge variant="warning">Ready</Badge>;
    return <Badge variant="secondary">Off</Badge>;
};

const TargetingPills: React.FC<{ targeting: TargetingRulePayload | null }> = ({ targeting }) => {
    if (!targeting) {
        return <Badge variant="secondary">everyone</Badge>;
    }
    const pills: React.ReactNode[] = [];
    if (targeting.countries.length) {
        pills.push(
            <Badge key="geo" variant="secondary">
                <Globe aria-hidden />
                {targeting.countries.slice(0, 3).join(', ')}
                {targeting.countries.length > 3 && ` +${targeting.countries.length - 3}`}
            </Badge>
        );
    }
    if (targeting.devices.length) {
        pills.push(
            <Badge key="dev" variant="secondary">
                {targeting.devices.includes('mobile') ? <DeviceIcon device="mobile" /> : null}
                {targeting.devices.includes('tablet') ? <DeviceIcon device="tablet" /> : null}
                {targeting.devices.includes('desktop') ? <DeviceIcon device="desktop" /> : null}
                {targeting.devices.join('+')}
            </Badge>
        );
    }
    if (targeting.user_states.length) {
        pills.push(
            <Badge key="usr" variant="secondary">
                <User aria-hidden />
                {targeting.user_states.join(', ')}
            </Badge>
        );
    }
    if (targeting.path_includes.length) {
        pills.push(
            <Badge key="path" variant="secondary">
                paths {targeting.path_includes.length}
            </Badge>
        );
    }
    if (targeting.ab_bucket) {
        pills.push(
            <Badge key="ab" variant="secondary">
                <Flag aria-hidden />
                A/B: {targeting.ab_bucket}
            </Badge>
        );
    }
    return <>{pills.length ? pills : <Badge variant="secondary">everyone</Badge>}</>;
};

// ── Slot editor ────────────────────────────────────────────────────────────

const splitList = (v: string, upper = false) =>
    (upper ? v.toUpperCase() : v)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

const ToggleChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <Button type="button" size="sm" variant={active ? 'default' : 'outline'} aria-pressed={active} onClick={onClick}>
        {children}
    </Button>
);

const SlotEditor: React.FC<{
    open: boolean;
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
}> = ({ open, draft, setDraft, placements, creatives, creativeMap, onClose, onSave, saving, isEdit, error }) => {
    const targetingOn = !!draft.targeting;
    const t = draft.targeting ?? emptyTargeting();
    const setT = (patch: Partial<TargetingRulePayload>) => setDraft((d) => ({ ...d, targeting: { ...(d.targeting ?? emptyTargeting()), ...patch } }));
    const selectedCreative = draft.creative ? creativeMap[draft.creative] : null;
    const selectedPlacement = placements.find((p) => p.id === draft.placement);
    const num = (key: keyof AdSlotWritePayload) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) || 0 }));
    const cartValue = (v: string) => (v ? Number(v) : null);

    return (
        <FormSheet
            open={open}
            title={isEdit ? 'Edit slot' : 'Book a new slot'}
            description="Place a creative into a placement with weight, schedule and targeting."
            onClose={onClose}
            onSave={onSave}
            saving={saving}
            saveLabel={isEdit ? 'Save changes' : 'Book slot'}
            width="xl"
        >
            <div className="grid lg:grid-cols-[1fr,320px]">
                <div className="space-y-5 p-4">
                    {error ? <Alert>{error}</Alert> : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Placement *">
                            <SimpleSelect
                                value={draft.placement ? String(draft.placement) : ''}
                                onChange={(v) => setDraft((d) => ({ ...d, placement: Number(v) || 0 }))}
                                options={placements.map((p) => ({ value: String(p.id), label: `${p.name} · ${p.slug}` }))}
                                placeholder="Select placement"
                            />
                        </Field>
                        <Field label="Creative *">
                            <SimpleSelect
                                value={draft.creative}
                                onChange={(v) => setDraft((d) => ({ ...d, creative: v }))}
                                options={creatives.map((c) => ({ value: c.id, label: `${c.name} (${c.campaign_name})` }))}
                                placeholder="Select creative"
                            />
                        </Field>
                    </div>

                    <Field label="Weight" hint="Selection probability vs other slots in the same placement. Higher wins more often.">
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={0}
                                max={50}
                                value={draft.weight}
                                onChange={num('weight')}
                                className="h-9 flex-1 accent-primary"
                                aria-label="Weight slider"
                            />
                            <Input type="number" min={0} className="w-20 text-center" value={draft.weight} onChange={num('weight')} aria-label="Weight" />
                        </div>
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Position hint" hint="Carousel ordering (low goes first)">
                            <Input type="number" min={0} value={draft.position_hint} onChange={num('position_hint')} />
                        </Field>
                        <div className="space-y-1.5">
                            <span className="text-sm font-medium text-foreground">Active</span>
                            <CheckRow id="slot-active" label="Slot is active">
                                <Switch id="slot-active" checked={draft.is_active} onCheckedChange={(v) => setDraft((d) => ({ ...d, is_active: v }))} />
                            </CheckRow>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Starts at">
                            <Input type="datetime-local" value={toLocalInput(draft.starts_at)} onChange={(e) => setDraft((d) => ({ ...d, starts_at: fromLocalInput(e.target.value) }))} />
                        </Field>
                        <Field label="Ends at">
                            <Input type="datetime-local" value={toLocalInput(draft.ends_at)} onChange={(e) => setDraft((d) => ({ ...d, ends_at: fromLocalInput(e.target.value) }))} />
                        </Field>
                    </div>

                    <FormSection title="Behaviour and frequency caps">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <span className="text-sm font-medium text-foreground">Dismissible</span>
                                <CheckRow id="slot-dismissible" label="Show close button">
                                    <Switch id="slot-dismissible" checked={draft.dismissible} onCheckedChange={(v) => setDraft((d) => ({ ...d, dismissible: v }))} />
                                </CheckRow>
                            </div>
                            <Field label="Modal: close button delay (s)">
                                <Input type="number" min={0} value={draft.show_close_after_seconds} onChange={num('show_close_after_seconds')} />
                            </Field>
                        </div>
                        <Field label="Modal: show after N seconds on page">
                            <Input type="number" min={0} value={draft.delay_seconds} onChange={num('delay_seconds')} />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Cap / session">
                                <Input type="number" min={0} value={draft.cap_per_session} onChange={num('cap_per_session')} />
                            </Field>
                            <Field label="Cap / day">
                                <Input type="number" min={0} value={draft.cap_per_day} onChange={num('cap_per_day')} />
                            </Field>
                            <Field label="Cap / week">
                                <Input type="number" min={0} value={draft.cap_per_week} onChange={num('cap_per_week')} />
                            </Field>
                        </div>
                    </FormSection>

                    <FormSection title="Targeting">
                        <CheckRow id="slot-targeting" label="Enable targeting (otherwise: everyone)">
                            <Switch id="slot-targeting" checked={targetingOn} onCheckedChange={(v) => setDraft((d) => ({ ...d, targeting: v ? emptyTargeting() : null }))} />
                        </CheckRow>

                        {targetingOn ? (
                            <div className="space-y-4">
                                <Field label="Countries (ISO-2)" hint="Comma-separated. Empty = anywhere.">
                                    <Input className="font-mono text-xs" value={t.countries.join(',')} onChange={(e) => setT({ countries: splitList(e.target.value, true) })} placeholder="GH,NG,KE" />
                                </Field>
                                <Field label="Exclude countries">
                                    <Input className="font-mono text-xs" value={t.exclude_countries.join(',')} onChange={(e) => setT({ exclude_countries: splitList(e.target.value, true) })} placeholder="US,CN" />
                                </Field>
                                <div className="space-y-1.5">
                                    <span className="text-sm font-medium text-foreground">Devices</span>
                                    <div className="flex flex-wrap gap-2">
                                        {DEVICE_OPTIONS.map((opt) => {
                                            const checked = t.devices.includes(opt.value);
                                            return (
                                                <ToggleChip key={opt.value} active={checked} onClick={() => setT({ devices: checked ? t.devices.filter((d) => d !== opt.value) : [...t.devices, opt.value] })}>
                                                    {opt.label}
                                                </ToggleChip>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-sm font-medium text-foreground">User states</span>
                                    <div className="flex flex-wrap gap-2">
                                        {USER_STATE_OPTIONS.map((opt) => {
                                            const checked = t.user_states.includes(opt.value);
                                            return (
                                                <ToggleChip key={opt.value} active={checked} onClick={() => setT({ user_states: checked ? t.user_states.filter((s) => s !== opt.value) : [...t.user_states, opt.value] })}>
                                                    {opt.label}
                                                </ToggleChip>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field label="Path includes">
                                        <Input className="text-xs" value={t.path_includes.join(',')} onChange={(e) => setT({ path_includes: splitList(e.target.value) })} placeholder="/electronics,/deals" />
                                    </Field>
                                    <Field label="Path excludes">
                                        <Input className="text-xs" value={t.path_excludes.join(',')} onChange={(e) => setT({ path_excludes: splitList(e.target.value) })} placeholder="/checkout" />
                                    </Field>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <Field label="Min cart">
                                        <Input type="number" value={t.min_cart_value ?? ''} onChange={(e) => setT({ min_cart_value: cartValue(e.target.value) })} />
                                    </Field>
                                    <Field label="Max cart">
                                        <Input type="number" value={t.max_cart_value ?? ''} onChange={(e) => setT({ max_cart_value: cartValue(e.target.value) })} />
                                    </Field>
                                    <Field label="A/B bucket">
                                        <Input value={t.ab_bucket} onChange={(e) => setT({ ab_bucket: e.target.value })} placeholder="A" />
                                    </Field>
                                </div>
                                <CheckRow id="slot-empty-cart" label="Only show when cart is empty">
                                    <Switch id="slot-empty-cart" checked={t.only_with_empty_cart} onCheckedChange={(v) => setT({ only_with_empty_cart: v })} />
                                </CheckRow>
                            </div>
                        ) : null}
                    </FormSection>
                </div>

                {/* Summary: below the form on mobile, sticky column on lg */}
                <div className="space-y-4 border-t border-border bg-muted p-4 lg:sticky lg:top-0 lg:self-start lg:border-l lg:border-t-0">
                    <p className="text-sm font-semibold text-foreground">Slot summary</p>
                    <div className="space-y-2 rounded-xl border border-border bg-card p-3 text-xs">
                        <div className="text-muted-foreground">Will appear in</div>
                        <div className="font-semibold text-foreground">{selectedPlacement?.name ?? '-'}</div>
                        <code className="block break-all font-mono text-[11px] text-primary">&lt;AdSlot slug="{selectedPlacement?.slug ?? '?'}" /&gt;</code>
                    </div>

                    {selectedCreative ? (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">What it will look like</p>
                            <LivePreview creative={creativeAsPreview(selectedCreative)} variant="banner" />
                        </div>
                    ) : null}

                    <div className="rounded-xl bg-info-subtle p-3 text-xs leading-relaxed text-info-subtle-foreground">
                        <strong>How weight works:</strong> if 3 slots compete for the same placement with weights 20 / 10 / 10, the first wins about 50% of the time, the others about 25% each. Bump weight to win more often.
                    </div>
                </div>
            </div>
        </FormSheet>
    );
};

export default SlotsTab;
