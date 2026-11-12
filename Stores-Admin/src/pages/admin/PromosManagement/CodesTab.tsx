import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, Copy, Eye, EyeOff, Loader2, Pencil, Plus, RefreshCw, Ticket, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Input } from '@/components/shadcn/input';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';
import {
    PromoCode,
    PromoCodeWritePayload,
    PromoFilter,
    bulkGenerate,
    createAdminPromo,
    deleteAdminPromo,
    emptyDraft,
    fetchAdminPromos,
    patchAdminPromo,
    promosAdminErrorMessage,
    toggleAdminPromo,
} from '@/services/promosAdminService';
import { Field, Alert, DiscountBadge, ScopeBadge, StatusBadge, UsageBar } from './_shared';
import { CodeSheet } from './CodeSheet';

interface Props {
    onChange?: () => void;
}

const Schedule: React.FC<{ row: PromoCode }> = ({ row }) =>
    row.starts_at || row.ends_at ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            {row.starts_at ? new Date(row.starts_at).toLocaleDateString() : 'now'}
            <span> → </span>
            {row.ends_at ? new Date(row.ends_at).toLocaleDateString() : 'no end'}
        </span>
    ) : (
        <span className="text-xs text-muted-foreground">Always</span>
    );

const CodesTab: React.FC<Props> = ({ onChange }) => {
    const [rows, setRows] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<PromoFilter>({});
    const [search, setSearch] = useState('');

    const [editingId, setEditingId] = useState<number | null>(null);
    const [draft, setDraft] = useState<PromoCodeWritePayload>(emptyDraft);
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [toDelete, setToDelete] = useState<PromoCode | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [bulkFor, setBulkFor] = useState<PromoCode | null>(null);
    const [bulkCount, setBulkCount] = useState(10);
    const [bulkPrefix, setBulkPrefix] = useState('');
    const [bulkBusy, setBulkBusy] = useState(false);
    const [bulkResult, setBulkResult] = useState<string[] | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            setRows(await fetchAdminPromos({ ...filter, q: search || undefined }));
        } catch (e) {
            setError(promosAdminErrorMessage(e));
        } finally {
            setLoading(false);
        }
    }, [filter, search]);

    useEffect(() => {
        load();
    }, [load]);

    const counts = useMemo(
        () => ({
            all: rows.length,
            live: rows.filter((r) => r.is_live).length,
            platform: rows.filter((r) => !r.is_seller_scoped).length,
            seller: rows.filter((r) => r.is_seller_scoped).length,
            inactive: rows.filter((r) => !r.is_active).length,
        }),
        [rows]
    );

    const openCreate = () => {
        setEditingId(null);
        setDraft(emptyDraft());
        setError(null);
        setOpen(true);
    };

    const openEdit = (row: PromoCode) => {
        setEditingId(row.id);
        setError(null);
        setDraft({
            code: row.code,
            name: row.name,
            description: row.description,
            is_active: row.is_active,
            seller: row.seller,
            discount_type: row.discount_type,
            discount_value: parseFloat(row.discount_value || '0'),
            max_discount_amount: row.max_discount_amount ? parseFloat(row.max_discount_amount) : null,
            buy_quantity: row.buy_quantity ?? 0,
            get_quantity: row.get_quantity ?? 0,
            fixed_price: row.fixed_price ? parseFloat(row.fixed_price) : null,
            target_type: row.target_type,
            products: row.products ?? [],
            categories: row.categories ?? [],
            include_free_shipping: row.include_free_shipping ?? false,
            min_order_value: parseFloat(row.min_order_value || '0'),
            min_items_count: row.min_items_count,
            user_segment: row.user_segment ?? 'all',
            specific_users: row.specific_users ?? [],
            stackable: row.stackable,
            first_order_only: row.first_order_only,
            max_redemptions: row.max_redemptions,
            max_redemptions_per_user: row.max_redemptions_per_user,
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            auto_apply: row.auto_apply,
            auto_apply_priority: row.auto_apply_priority,
        });
        setOpen(true);
    };

    const save = async () => {
        if (!draft.code.trim() || !draft.name.trim()) {
            setError('Code and name are required.');
            return;
        }
        try {
            setSaving(true);
            setError(null);
            if (editingId) await patchAdminPromo(editingId, draft);
            else await createAdminPromo(draft);
            setOpen(false);
            toast.success(editingId ? 'Promo code updated.' : 'Promo code created.');
            await load();
            onChange?.();
        } catch (e) {
            setError(promosAdminErrorMessage(e));
        } finally {
            setSaving(false);
        }
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        try {
            setDeleting(true);
            await deleteAdminPromo(toDelete.id);
            setToDelete(null);
            toast.success('Promo code deleted.');
            await load();
            onChange?.();
        } catch (e) {
            setToDelete(null);
            setError(promosAdminErrorMessage(e));
        } finally {
            setDeleting(false);
        }
    };

    const toggle = async (row: PromoCode) => {
        try {
            await toggleAdminPromo(row.id);
            await load();
            onChange?.();
        } catch (e) {
            setError(promosAdminErrorMessage(e));
        }
    };

    const copyCode = async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            toast.success(`Copied ${code}`);
        } catch {
            /* ignore */
        }
    };

    const openBulk = (row: PromoCode) => {
        setBulkFor(row);
        setBulkPrefix(row.code.split('-')[0] || '');
        setBulkResult(null);
    };

    const closeBulk = () => {
        setBulkFor(null);
        setBulkResult(null);
    };

    const runBulk = async () => {
        if (!bulkFor) return;
        try {
            setBulkBusy(true);
            const r = await bulkGenerate(bulkFor.id, bulkCount, bulkPrefix || undefined);
            setBulkResult(r.codes);
            await load();
            onChange?.();
        } catch (e) {
            closeBulk();
            setError(promosAdminErrorMessage(e));
        } finally {
            setBulkBusy(false);
        }
    };

    const filters: { label: string; count: number; active: boolean; apply: () => void }[] = [
        { label: 'All', count: counts.all, active: !filter.platform_only && filter.is_active === undefined && !filter.seller, apply: () => setFilter({}) },
        { label: 'Platform', count: counts.platform, active: filter.platform_only === true, apply: () => setFilter({ platform_only: true }) },
        {
            label: 'Active',
            count: counts.live + (counts.all - counts.live - counts.inactive),
            active: filter.is_active === true,
            apply: () => setFilter({ is_active: true }),
        },
        { label: 'Paused', count: counts.inactive, active: filter.is_active === false, apply: () => setFilter({ is_active: false }) },
    ];

    const actions = (row: PromoCode) => (
        <div className="flex justify-end gap-1">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => toggle(row)} title={row.is_active ? 'Pause' : 'Activate'} aria-label={row.is_active ? 'Pause code' : 'Activate code'}>
                {row.is_active ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => openBulk(row)} title="Bulk-generate codes from this template" aria-label="Bulk-generate codes">
                <Wand2 aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(row)} title="Edit" aria-label="Edit code">
                <Pencil aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setToDelete(row)} title="Delete" aria-label="Delete code" className="text-destructive">
                <Trash2 aria-hidden="true" />
            </Button>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {filters.map((f) => (
                    <Button key={f.label} type="button" size="sm" variant={f.active ? 'default' : 'outline'} onClick={f.apply}>
                        {f.label}
                        <Badge variant="secondary" className="h-4 px-1.5">
                            {f.count}
                        </Badge>
                    </Button>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input placeholder="Search by code or name…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-sm" aria-label="Search promo codes" />
                <Button type="button" variant="outline" onClick={load} disabled={loading}>
                    <RefreshCw className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh
                </Button>
                <Button type="button" onClick={openCreate} className="sm:ml-auto">
                    <Plus aria-hidden="true" /> New code
                </Button>
            </div>

            {error && !open ? <Alert>{error}</Alert> : null}

            {loading ? (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={Ticket}
                        title="No promo codes"
                        description="Create one to start running discounts. You can scope it to a specific seller or run it platform-wide."
                        action={
                            <Button type="button" onClick={openCreate}>
                                <Plus aria-hidden="true" /> Create your first code
                            </Button>
                        }
                    />
                </Card>
            ) : (
                <>
                    {/* Desktop table */}
                    <Card className="hidden overflow-hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Code</TableHead>
                                    <TableHead>Discount</TableHead>
                                    <TableHead>Scope</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Schedule</TableHead>
                                    <TableHead>Usage</TableHead>
                                    <TableHead className="w-[1%]">
                                        <span className="sr-only">Actions</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="align-top">
                                            <button
                                                type="button"
                                                onClick={() => copyCode(row.code)}
                                                title="Copy code"
                                                className="group/code inline-flex items-center gap-1.5 font-mono text-sm font-bold text-foreground transition hover:text-primary"
                                            >
                                                {row.code}
                                                <Copy className="h-3 w-3 opacity-0 transition group-hover/code:opacity-100" aria-hidden="true" />
                                            </button>
                                            <p className="mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground">{row.name}</p>
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <DiscountBadge promo={row} />
                                            {row.first_order_only && <p className="mt-1 text-xs text-muted-foreground">First order only</p>}
                                            {row.auto_apply && <p className="mt-1 text-xs font-semibold text-primary">Auto-apply · priority {row.auto_apply_priority}</p>}
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <ScopeBadge promo={row} />
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <StatusBadge promo={row} />
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <Schedule row={row} />
                                        </TableCell>
                                        <TableCell className="align-top">
                                            <UsageBar promo={row} />
                                        </TableCell>
                                        <TableCell className="align-top">{actions(row)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>

                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                        {rows.map((row) => (
                            <Card key={row.id}>
                                <CardContent className="space-y-3 p-4 pt-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <button type="button" onClick={() => copyCode(row.code)} className="inline-flex items-center gap-1.5 font-mono text-sm font-bold text-foreground">
                                                {row.code}
                                                <Copy className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                                            </button>
                                            <p className="truncate text-xs text-muted-foreground">{row.name}</p>
                                        </div>
                                        <StatusBadge promo={row} />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <DiscountBadge promo={row} />
                                        <ScopeBadge promo={row} />
                                    </div>
                                    {row.first_order_only && <p className="text-xs text-muted-foreground">First order only</p>}
                                    {row.auto_apply && <p className="text-xs font-semibold text-primary">Auto-apply · priority {row.auto_apply_priority}</p>}
                                    <Schedule row={row} />
                                    <UsageBar promo={row} />
                                    {actions(row)}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            <CodeSheet open={open} onOpenChange={setOpen} editing={editingId !== null} draft={draft} setDraft={setDraft} error={error} saving={saving} onSave={save} />

            {/* Delete confirm */}
            <Dialog open={toDelete !== null} onOpenChange={(o) => (!o ? setToDelete(null) : undefined)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this promo code?</DialogTitle>
                        <DialogDescription>
                            {toDelete ? `"${toDelete.code}" will be permanently removed. This cannot be undone.` : null}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deleting}>
                            {deleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk-generate */}
            <Dialog open={bulkFor !== null} onOpenChange={(o) => (!o ? closeBulk() : undefined)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{bulkFor ? `Bulk-generate from "${bulkFor.code}"` : 'Bulk-generate'}</DialogTitle>
                        <DialogDescription>
                            Mints N unique codes that copy the rule from {bulkFor?.code}. Each new code defaults to inactive, max 1 redemption, max 1 per user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Count" htmlFor="bulk-count">
                            <Input id="bulk-count" type="number" min={1} max={500} value={bulkCount} onChange={(e) => setBulkCount(Math.max(1, Number(e.target.value) || 1))} />
                        </Field>
                        <Field label="Prefix" htmlFor="bulk-prefix" hint="Each code becomes <PREFIX>-XXXXXXXX">
                            <Input id="bulk-prefix" className="font-mono uppercase" value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value.toUpperCase())} placeholder="SUMMER" />
                        </Field>
                    </div>
                    {bulkResult && (
                        <div className="rounded-xl bg-success-subtle p-3 text-success-subtle-foreground">
                            <p className="mb-2 text-xs font-semibold">Created {bulkResult.length} codes (paused; review and activate when ready)</p>
                            <div className="max-h-40 overflow-y-auto font-mono text-xs">
                                {bulkResult.map((c) => (
                                    <div key={c}>{c}</div>
                                ))}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={closeBulk}>
                            {bulkResult ? 'Close' : 'Cancel'}
                        </Button>
                        {!bulkResult && (
                            <Button type="button" onClick={runBulk} disabled={bulkBusy}>
                                {bulkBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Wand2 aria-hidden="true" />}
                                Mint {bulkCount} codes
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CodesTab;
