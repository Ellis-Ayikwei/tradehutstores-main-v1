import { BarChart3, CalendarClock, ChevronRight, Eye, Flame, Megaphone, MousePointerClick, Pause, Pencil, Play, Plus, RefreshCw, Sparkles, Trash2, Zap } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import { cn } from '@/lib/utils';
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
import { Alert, CardGridSkeleton, ConfirmDialog, EmptyState, Field, FormSheet, SimpleSelect, StatusBadge, Toolbar, fromLocalInput, toLocalInput } from './_shared';

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

interface Props {
    onChange?: () => void;
}

const CampaignsTab: React.FC<Props> = ({ onChange }) => {
    const [rows, setRows] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState<CampaignWritePayload>(emptyDraft);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [toDelete, setToDelete] = useState<Campaign | null>(null);
    const [deleting, setDeleting] = useState(false);

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
            .filter((r) => !s || r.name.toLowerCase().includes(s) || r.advertiser.toLowerCase().includes(s));
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
        setFormError(null);
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
        setFormError(null);
        setOpen(true);
    };

    const save = async () => {
        if (!draft.name.trim()) {
            setFormError('Campaign name is required.');
            return;
        }
        try {
            setSaving(true);
            setFormError(null);
            if (editingId) await patchCampaign(editingId, draft);
            else await createCampaign(draft);
            toast.success(editingId ? 'Campaign saved' : 'Campaign created');
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
            await deleteCampaign(toDelete.id);
            toast.success('Campaign deleted');
            setToDelete(null);
            await load();
            onChange?.();
        } catch (e) {
            toast.error(adsAdminErrorMessage(e));
        } finally {
            setDeleting(false);
        }
    };

    const cycleStatus = async (row: Campaign) => {
        const next: CampaignStatus = row.status === 'running' ? 'paused' : 'running';
        try {
            await patchCampaign(row.id, { status: next });
            toast.success(next === 'running' ? 'Campaign running' : 'Campaign paused');
            await load();
            onChange?.();
        } catch (e) {
            toast.error(adsAdminErrorMessage(e));
        }
    };

    const numberOrNull = (v: string) => (v ? Number(v) : null);

    return (
        <div className="space-y-4">
            {/* Status filter */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by status">
                <FilterChip active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="All" count={counts.all} />
                {CAMPAIGN_STATUSES.filter((s) => s.value !== 'archived').map((s) => (
                    <FilterChip key={s.value} active={statusFilter === s.value} onClick={() => setStatusFilter(s.value)} label={s.label} count={counts[s.value] ?? 0} />
                ))}
            </div>

            <Toolbar>
                <Input placeholder="Search by campaign or advertiser…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-sm" aria-label="Search campaigns" />
                <div className="flex gap-2 sm:ml-auto">
                    <Button type="button" variant="outline" onClick={load} className="flex-1 sm:flex-none">
                        <RefreshCw /> Refresh
                    </Button>
                    <Button type="button" onClick={openCreate} className="flex-1 sm:flex-none">
                        <Plus /> New campaign
                    </Button>
                </div>
            </Toolbar>

            {error ? <Alert onRetry={load}>{error}</Alert> : null}

            {loading ? (
                <CardGridSkeleton />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={Megaphone}
                    title={rows.length === 0 ? 'No campaigns yet' : 'No campaigns match'}
                    body={
                        rows.length === 0
                            ? 'A campaign is the umbrella for an ad push (status, schedule, advertiser, impression caps). Group creatives under it, then book them into placements as slots.'
                            : 'Try a different search or status filter.'
                    }
                    action={
                        rows.length === 0 ? (
                            <Button type="button" onClick={openCreate}>
                                <Plus /> Create your first campaign
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((row) => (
                        <CampaignCard key={row.id} row={row} onEdit={() => openEdit(row)} onCycleStatus={() => cycleStatus(row)} onDelete={() => setToDelete(row)} />
                    ))}
                </div>
            )}

            <FormSheet
                open={open}
                title={editingId ? 'Edit campaign' : 'New campaign'}
                description="Status, schedule and impression caps for an ad push."
                onClose={() => setOpen(false)}
                onSave={save}
                saving={saving}
                saveLabel={editingId ? 'Save changes' : 'Create campaign'}
                width="lg"
            >
                <div className="space-y-4 p-4">
                    {formError ? <Alert>{formError}</Alert> : null}

                    <Field label="Campaign name *">
                        <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Black Friday 2026" />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Advertiser / brand">
                            <Input value={draft.advertiser} onChange={(e) => setDraft((d) => ({ ...d, advertiser: e.target.value }))} placeholder="TradeHut House" />
                        </Field>
                        <Field label="Seller (optional)" hint="UUID of the seller this is paid for. Leave blank for in-house pushes.">
                            <Input
                                className="font-mono text-xs"
                                value={draft.seller ?? ''}
                                onChange={(e) => setDraft((d) => ({ ...d, seller: e.target.value.trim() || null }))}
                                placeholder="seller UUID"
                            />
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <span className="text-sm font-medium text-foreground">Status</span>
                            <div className="grid grid-cols-3 gap-1.5" role="group" aria-label="Status">
                                {CAMPAIGN_STATUSES.filter((s) => s.value !== 'archived').map((s) => (
                                    <Button
                                        key={s.value}
                                        type="button"
                                        size="sm"
                                        variant={draft.status === s.value ? 'default' : 'outline'}
                                        aria-pressed={draft.status === s.value}
                                        onClick={() => setDraft((d) => ({ ...d, status: s.value }))}
                                        className="px-2 text-xs"
                                    >
                                        {s.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <Field label="Priority" hint="Higher priority wins more often in the auction">
                            <SimpleSelect
                                value={String(draft.priority)}
                                onChange={(v) => setDraft((d) => ({ ...d, priority: Number(v) }))}
                                options={CAMPAIGN_PRIORITIES.map((p) => ({ value: String(p.value), label: p.label }))}
                            />
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Starts at">
                            <Input type="datetime-local" value={toLocalInput(draft.starts_at)} onChange={(e) => setDraft((d) => ({ ...d, starts_at: fromLocalInput(e.target.value) }))} />
                        </Field>
                        <Field label="Ends at">
                            <Input type="datetime-local" value={toLocalInput(draft.ends_at)} onChange={(e) => setDraft((d) => ({ ...d, ends_at: fromLocalInput(e.target.value) }))} />
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Daily impression cap" hint="Pause for the day after N impressions">
                            <Input
                                type="number"
                                min={0}
                                value={draft.daily_impression_cap ?? ''}
                                onChange={(e) => setDraft((d) => ({ ...d, daily_impression_cap: numberOrNull(e.target.value) }))}
                                placeholder="No limit"
                            />
                        </Field>
                        <Field label="Total impression cap" hint="End campaign after N total">
                            <Input
                                type="number"
                                min={0}
                                value={draft.total_impression_cap ?? ''}
                                onChange={(e) => setDraft((d) => ({ ...d, total_impression_cap: numberOrNull(e.target.value) }))}
                                placeholder="No limit"
                            />
                        </Field>
                    </div>
                    <Field label="Internal notes" hint="Briefing, contract, deal terms…">
                        <Textarea rows={3} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
                    </Field>
                </div>
            </FormSheet>

            <ConfirmDialog
                open={toDelete !== null}
                title="Delete this campaign?"
                description={toDelete ? `"${toDelete.name}" and all its creatives will be deleted. This cannot be undone.` : undefined}
                busy={deleting}
                onConfirm={confirmRemove}
                onCancel={() => setToDelete(null)}
            />
        </div>
    );
};

const FilterChip: React.FC<{ active: boolean; onClick: () => void; label: string; count: number }> = ({ active, onClick, label, count }) => (
    <Button type="button" size="sm" variant={active ? 'default' : 'outline'} aria-pressed={active} onClick={onClick} className="shrink-0">
        {label}
        <span className="text-xs opacity-80">{count}</span>
    </Button>
);

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; valueClass?: string }> = ({ icon, label, value, valueClass }) => (
    <div>
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
            {icon} {label}
        </div>
        <p className={cn('mt-0.5 text-lg font-bold leading-tight text-foreground', valueClass)}>{value}</p>
    </div>
);

const CampaignCard: React.FC<{
    row: Campaign;
    onEdit: () => void;
    onCycleStatus: () => void;
    onDelete: () => void;
}> = ({ row, onEdit, onCycleStatus, onDelete }) => {
    const isUrgent = row.priority >= 20;
    const isHigh = row.priority >= 10 && !isUrgent;
    const ctr = row.stats?.ctr ?? 0;

    return (
        <Card className="flex flex-col p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <StatusBadge status={row.status} />
                        {isUrgent ? (
                            <Badge variant="destructive">
                                <Flame aria-hidden /> Urgent
                            </Badge>
                        ) : null}
                        {isHigh ? (
                            <Badge variant="warning">
                                <Zap aria-hidden /> High
                            </Badge>
                        ) : null}
                    </div>
                    <h3 className="truncate font-semibold text-foreground">{row.name}</h3>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{row.advertiser || 'No advertiser'}</span>
                        {row.seller_name ? <span className="truncate text-primary">· {row.seller_name}</span> : null}
                    </p>
                </div>
                <div className="flex shrink-0 gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" onClick={onEdit} aria-label={`Edit ${row.name}`}>
                        <Pencil />
                    </Button>
                    <Button type="button" variant="destructive" size="icon-sm" onClick={onDelete} aria-label={`Delete ${row.name}`}>
                        <Trash2 />
                    </Button>
                </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {row.starts_at || row.ends_at ? (
                    <span className="inline-flex items-center gap-0.5">
                        {row.starts_at ? new Date(row.starts_at).toLocaleDateString() : 'now'}
                        <ChevronRight className="h-3 w-3" aria-hidden />
                        {row.ends_at ? new Date(row.ends_at).toLocaleDateString() : 'no end'}
                    </span>
                ) : (
                    <span>Always on</span>
                )}
            </div>

            {row.daily_impression_cap || row.total_impression_cap ? (
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    {row.daily_impression_cap ? <span>cap {row.daily_impression_cap.toLocaleString()}/day</span> : null}
                    {row.total_impression_cap ? <span>cap {row.total_impression_cap.toLocaleString()} total</span> : null}
                </div>
            ) : null}

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-xs">
                <Stat icon={<BarChart3 className="h-3 w-3" aria-hidden />} label="Creatives" value={row.creative_count} />
                <Stat icon={<Eye className="h-3 w-3" aria-hidden />} label="Impr 30d" value={(row.stats?.impressions ?? 0).toLocaleString()} />
                <Stat
                    icon={<MousePointerClick className="h-3 w-3" aria-hidden />}
                    label="CTR"
                    value={`${ctr}%`}
                    valueClass={ctr >= 1.5 ? 'text-success-600' : ctr > 0 ? 'text-warning-subtle-foreground' : undefined}
                />
            </div>

            <Button type="button" variant="outline" onClick={onCycleStatus} className="mt-4 w-full" title={row.status === 'running' ? 'Pause this campaign' : 'Set to Running, ads start serving'}>
                {row.status === 'running' ? (
                    <>
                        <Pause /> Pause campaign
                    </>
                ) : (
                    <>
                        <Play /> Run campaign
                    </>
                )}
            </Button>
        </Card>
    );
};

export default CampaignsTab;
