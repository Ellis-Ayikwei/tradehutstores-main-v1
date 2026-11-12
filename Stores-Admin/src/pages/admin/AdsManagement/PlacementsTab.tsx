import { Check, Copy, LayoutGrid, Pencil, Plus, Power, RefreshCw, Repeat, RotateCw, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Switch } from '@/components/shadcn/switch';
import { Textarea } from '@/components/shadcn/textarea';
import { cn } from '@/lib/utils';
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
import { Alert, CardGridSkeleton, CheckRow, ConfirmDialog, EmptyState, FORMAT_ICONS, FORMAT_LOCATION_HINT, Field, FormSheet, LiveDot, SimpleSelect, Toolbar } from './_shared';

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
    const [formError, setFormError] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<PlacementWritePayload>(emptyDraft);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [toDelete, setToDelete] = useState<AdPlacement | null>(null);
    const [deleting, setDeleting] = useState(false);

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
        setFormError(null);
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
        setFormError(null);
        setOpen(true);
    };

    const save = async () => {
        if (!draft.name.trim() || !draft.slug.trim()) {
            setFormError('Name and slug are required.');
            return;
        }
        try {
            setSaving(true);
            setFormError(null);
            if (editingId) {
                await patchPlacement(editingId, draft);
            } else {
                await createPlacement(draft);
            }
            toast.success(editingId ? 'Placement saved' : 'Placement created');
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
            await deletePlacement(toDelete.id);
            toast.success('Placement deleted');
            setToDelete(null);
            await load();
            onChange?.();
        } catch (e) {
            toast.error(adsAdminErrorMessage(e));
        } finally {
            setDeleting(false);
        }
    };

    const toggle = async (row: AdPlacement) => {
        try {
            await patchPlacement(row.id, { is_active: !row.is_active });
            toast.success(row.is_active ? 'Placement paused' : 'Placement activated');
            await load();
            onChange?.();
        } catch (e) {
            toast.error(adsAdminErrorMessage(e));
        }
    };

    const copySlug = async (slug: string) => {
        try {
            await navigator.clipboard.writeText(`<AdSlot slug="${slug}" />`);
            toast.success('Snippet copied');
        } catch {
            toast.error('Could not copy to the clipboard.');
        }
    };

    return (
        <div className="space-y-4">
            <Toolbar>
                <Input placeholder="Search by slug or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-sm" aria-label="Search placements" />
                <div className="flex gap-2 sm:ml-auto">
                    <Button type="button" variant="outline" onClick={load} className="flex-1 sm:flex-none">
                        <RefreshCw /> Refresh
                    </Button>
                    <Button type="button" onClick={openCreate} className="flex-1 sm:flex-none">
                        <Plus /> New placement
                    </Button>
                </div>
            </Toolbar>

            {error ? <Alert onRetry={load}>{error}</Alert> : null}

            {loading ? (
                <CardGridSkeleton />
            ) : filtered.length === 0 ? (
                <EmptyState
                    icon={LayoutGrid}
                    title={rows.length === 0 ? 'No placements yet' : 'No placements match'}
                    body={
                        rows.length === 0
                            ? "A placement is a named slot on the storefront (e.g. 'homepage-top-bar'). The storefront renders ads via <AdSlot slug='your-slug' />. You usually create these once and rarely touch them after."
                            : 'Try a different search.'
                    }
                    action={
                        rows.length === 0 ? (
                            <Button type="button" onClick={openCreate}>
                                <Plus /> Create your first placement
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((row) => {
                        const Icon = FORMAT_ICONS[row.format as PlacementFormat] || LayoutGrid;
                        return (
                            <Card key={row.id} className="p-4 sm:p-5">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                        <div
                                            className={cn(
                                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                                                row.is_active ? 'bg-primary-subtle text-primary-subtle-foreground' : 'bg-muted text-muted-foreground'
                                            )}
                                        >
                                            <Icon className="h-5 w-5" aria-hidden />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-x-2">
                                                <h3 className="truncate font-semibold text-foreground">{row.name}</h3>
                                                <LiveDot on={row.is_active} />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => copySlug(row.slug)}
                                                title="Copy <AdSlot> snippet"
                                                className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-subtle"
                                            >
                                                <code className="truncate font-mono">{row.slug}</code>
                                                <Copy className="h-3 w-3 shrink-0" aria-hidden />
                                                <span className="sr-only">Copy AdSlot snippet</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-1">
                                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => toggle(row)} aria-label={row.is_active ? `Pause ${row.name}` : `Activate ${row.name}`} title={row.is_active ? 'Pause placement' : 'Activate'}>
                                            {row.is_active ? <Power /> : <Check />}
                                        </Button>
                                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(row)} aria-label={`Edit ${row.name}`}>
                                            <Pencil />
                                        </Button>
                                        <Button type="button" variant="destructive" size="icon-sm" onClick={() => setToDelete(row)} aria-label={`Delete ${row.name}`}>
                                            <Trash2 />
                                        </Button>
                                    </div>
                                </div>

                                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{row.description || FORMAT_LOCATION_HINT[row.format as PlacementFormat] || '-'}</p>

                                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                                    <Stat label="Format" value={row.format} capitalize />
                                    <Stat label="Active slots" value={row.active_slot_count} good={row.active_slot_count > 0} />
                                    <Stat label="Max" value={row.max_active_slots} />
                                </div>

                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    {row.aspect_ratio ? (
                                        <Badge variant="secondary" className="font-mono">
                                            {row.aspect_ratio}
                                        </Badge>
                                    ) : null}
                                    {row.rotation_seconds > 0 ? (
                                        <Badge variant="secondary">
                                            <Repeat aria-hidden /> rotates {row.rotation_seconds}s
                                        </Badge>
                                    ) : null}
                                    {row.max_active_slots > 1 ? (
                                        <Badge variant="secondary">
                                            <RotateCw aria-hidden /> carousel up to {row.max_active_slots}
                                        </Badge>
                                    ) : null}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <FormSheet
                open={open}
                title={editingId ? 'Edit placement' : 'New placement'}
                description="A named place on the storefront where ads can appear."
                onClose={() => setOpen(false)}
                onSave={save}
                saving={saving}
                saveLabel={editingId ? 'Save changes' : 'Create placement'}
                width="md"
            >
                <div className="space-y-4 p-4">
                    {formError ? <Alert>{formError}</Alert> : null}

                    <Field label="Name *">
                        <Input
                            value={draft.name}
                            onChange={(e) => {
                                const name = e.target.value;
                                setDraft((d) => ({ ...d, name, slug: editingId ? d.slug : slugify(name) }));
                            }}
                            placeholder="Homepage Top Bar"
                        />
                    </Field>
                    <Field label="Slug *" hint={`Used by the storefront: <AdSlot slug="${draft.slug || 'your-slug'}" />`}>
                        <Input className="font-mono text-xs" value={draft.slug} onChange={(e) => setDraft((d) => ({ ...d, slug: slugify(e.target.value) }))} placeholder="homepage-top-bar" />
                    </Field>
                    <Field label="Description">
                        <Textarea rows={2} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Where this slot appears, expected creative size, ownership…" />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Format" hint={FORMAT_LOCATION_HINT[draft.format as PlacementFormat]}>
                            <SimpleSelect value={draft.format} onChange={(v) => setDraft((d) => ({ ...d, format: v as typeof d.format }))} options={PLACEMENT_FORMATS} />
                        </Field>
                        <Field label="Aspect ratio" hint="Hint to creative producers (21/4, 16/9, 1/1)">
                            <Input className="font-mono text-xs" value={draft.aspect_ratio} onChange={(e) => setDraft((d) => ({ ...d, aspect_ratio: e.target.value }))} placeholder="21/4" />
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Max active slots" hint="2 or more enables carousel mode">
                            <Input
                                type="number"
                                min={1}
                                max={20}
                                value={draft.max_active_slots}
                                onChange={(e) => setDraft((d) => ({ ...d, max_active_slots: Math.max(1, Number(e.target.value) || 1) }))}
                            />
                        </Field>
                        <Field label="Rotation seconds" hint="0 = no rotate (only with max 2 or more)">
                            <Input
                                type="number"
                                min={0}
                                value={draft.rotation_seconds}
                                onChange={(e) => setDraft((d) => ({ ...d, rotation_seconds: Math.max(0, Number(e.target.value) || 0) }))}
                            />
                        </Field>
                    </div>
                    <CheckRow id="placement-active" label="Placement is active (ads will serve)">
                        <Switch id="placement-active" checked={draft.is_active} onCheckedChange={(v) => setDraft((d) => ({ ...d, is_active: v }))} />
                    </CheckRow>
                </div>
            </FormSheet>

            <ConfirmDialog
                open={toDelete !== null}
                title="Delete this placement?"
                description={toDelete ? `"${toDelete.name}" and all slots in it will be deleted. This cannot be undone.` : undefined}
                busy={deleting}
                onConfirm={confirmRemove}
                onCancel={() => setToDelete(null)}
            />
        </div>
    );
};

const Stat: React.FC<{ label: string; value: React.ReactNode; good?: boolean; capitalize?: boolean }> = ({ label, value, good, capitalize }) => (
    <div className="rounded-lg bg-muted px-2.5 py-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn('truncate text-sm font-bold', capitalize && 'capitalize', good ? 'text-success-600' : 'text-foreground')}>{value}</p>
    </div>
);

export default PlacementsTab;
