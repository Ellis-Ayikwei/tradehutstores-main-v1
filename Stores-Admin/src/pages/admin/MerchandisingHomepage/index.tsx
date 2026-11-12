import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, EyeOff, LayoutGrid, List, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Input } from '@/components/shadcn/input';
import { PageHeader } from '@/components/shadcn/page-header';
import { Skeleton } from '@/components/shadcn/skeleton';
import { StatCard } from '@/components/shadcn/stat-card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import axiosInstance from '@/services/axiosInstance';
import { deleteMerchSection, fetchMerchSections, merchAdminErrorMessage, type HomepageSectionAdminList } from '@/services/merchandisingAdminService';
import { SECTION_TYPE_LABEL, STRATEGY_LABEL } from './constants';
import { SectionSheet } from './SectionSheet';

type StatusFilter = 'all' | 'live' | 'scheduled' | 'inactive';

function StatusBadge({ row }: { row: HomepageSectionAdminList }) {
    if (row.is_live) {
        return (
            <Badge variant="success">
                <CheckCircle2 aria-hidden /> Live
            </Badge>
        );
    }
    if (row.is_active) {
        return (
            <Badge variant="info">
                <Clock aria-hidden /> Scheduled
            </Badge>
        );
    }
    return (
        <Badge variant="secondary">
            <EyeOff aria-hidden /> Inactive
        </Badge>
    );
}

export default function MerchandisingHomepage() {
    const [rows, setRows] = useState<HomepageSectionAdminList[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

    const [sheetOpen, setSheetOpen] = useState(false);
    const [editing, setEditing] = useState<HomepageSectionAdminList | null>(null);
    const [toDelete, setToDelete] = useState<HomepageSectionAdminList | null>(null);
    const [deleting, setDeleting] = useState(false);

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
        void load();
    }, [load]);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axiosInstance.get<unknown>('/catalog/categories/');
                const list: Record<string, unknown>[] = Array.isArray(data)
                    ? (data as Record<string, unknown>[])
                    : Array.isArray((data as { results?: unknown[] })?.results)
                    ? (data as { results: Record<string, unknown>[] }).results
                    : [];
                setCategories(
                    list
                        .map((c) => ({
                            id: String((c as { id?: string | number }).id ?? ''),
                            name: String((c as { name?: string; title?: string }).name ?? (c as { name?: string; title?: string }).title ?? ''),
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
                return r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || r.section_type.toLowerCase().includes(q);
            })
            .sort((a, b) => a.position - b.position);
    }, [rows, search, statusFilter]);

    const openCreate = () => {
        setEditing(null);
        setSheetOpen(true);
    };

    const openEdit = (r: HomepageSectionAdminList) => {
        setEditing(r);
        setSheetOpen(true);
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        try {
            setDeleting(true);
            await deleteMerchSection(toDelete.id);
            toast.success('Section deleted');
            setToDelete(null);
            await load();
        } catch (e) {
            setToDelete(null);
            setError(merchAdminErrorMessage(e));
        } finally {
            setDeleting(false);
        }
    };

    const initialLoad = loading && rows.length === 0;

    const rowActions = (r: HomepageSectionAdminList) => (
        <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openEdit(r)}>
                <Pencil aria-hidden /> Edit
            </Button>
            <Button type="button" variant="destructive" size="icon-sm" onClick={() => setToDelete(r)} aria-label={`Delete ${r.title}`}>
                <Trash2 aria-hidden />
            </Button>
        </div>
    );

    return (
        <div className="mx-auto w-full max-w-6xl space-y-4">
            <PageHeader
                title="Homepage merchandising"
                description="Curate the storefront homepage: sections, schedules and pinned product picks."
                actions={
                    <>
                        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
                            <RefreshCw className={loading ? 'animate-spin' : undefined} aria-hidden /> Refresh
                        </Button>
                        <Button type="button" onClick={openCreate}>
                            <Plus aria-hidden /> New section
                        </Button>
                    </>
                }
            />

            {error ? (
                <div role="alert" className="flex items-start gap-2 rounded-md bg-warning-subtle px-4 py-3 text-sm text-warning-subtle-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span className="flex-1">{error}</span>
                    <button type="button" onClick={() => setError(null)} aria-label="Dismiss error" className="shrink-0 rounded-sm hover:text-foreground">
                        <X className="h-4 w-4" aria-hidden />
                    </button>
                </div>
            ) : null}

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Total sections" value={stats.total} icon={LayoutGrid} isLoading={initialLoad} />
                <StatCard label="Live now" value={stats.live} icon={Zap} isLoading={initialLoad} />
                <StatCard label="Active" value={stats.active} icon={CalendarClock} isLoading={initialLoad} />
                <StatCard label="Pinned items" value={stats.items} icon={List} isLoading={initialLoad} />
            </section>

            <Card>
                <CardContent className="flex flex-col gap-3 p-4 pt-4 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                        <Input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by title, slug, or type"
                            aria-label="Search sections"
                            className="pl-9"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                            <TabsList>
                                <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
                                <TabsTrigger value="live">Live ({stats.live})</TabsTrigger>
                                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                                <TabsTrigger value="inactive">Inactive</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    {initialLoad ? (
                        <div className="space-y-3 p-4" aria-busy="true">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : error && rows.length === 0 ? (
                        <EmptyState
                            icon={AlertTriangle}
                            title="Could not load sections"
                            description={error}
                            action={
                                <Button type="button" variant="outline" onClick={() => void load()}>
                                    Try again
                                </Button>
                            }
                        />
                    ) : filteredRows.length === 0 ? (
                        <EmptyState
                            icon={LayoutGrid}
                            title={rows.length === 0 ? 'No homepage sections yet' : 'No sections match this filter'}
                            description={rows.length === 0 ? 'Create your first section to drive the customer homepage.' : 'Try a different search or filter.'}
                            action={
                                rows.length === 0 ? (
                                    <Button type="button" onClick={openCreate}>
                                        <Plus aria-hidden /> New section
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <>
                            {/* Cards under md */}
                            <ul className="divide-y divide-border md:hidden">
                                {filteredRows.map((r) => (
                                    <li key={r.id} className="space-y-3 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                                                <code className="block truncate font-mono text-xs text-muted-foreground">{r.slug}</code>
                                            </div>
                                            <StatusBadge row={r} />
                                        </div>
                                        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                                            <div>
                                                <dt className="text-muted-foreground">Type</dt>
                                                <dd className="text-foreground">{SECTION_TYPE_LABEL[r.section_type] ?? r.section_type}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-muted-foreground">Strategy</dt>
                                                <dd className="text-foreground">{STRATEGY_LABEL[r.strategy] ?? r.strategy}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-muted-foreground">Position</dt>
                                                <dd className="font-mono text-foreground">{r.position}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-muted-foreground">Items</dt>
                                                <dd className="font-mono text-foreground">{r.items_count}</dd>
                                            </div>
                                        </dl>
                                        {rowActions(r)}
                                    </li>
                                ))}
                            </ul>

                            {/* Table from md */}
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-14">#</TableHead>
                                            <TableHead>Section</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Strategy</TableHead>
                                            <TableHead>Items</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRows.map((r) => (
                                            <TableRow key={r.id}>
                                                <TableCell className="font-mono text-muted-foreground">{r.position}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-foreground">{r.title}</div>
                                                    <code className="font-mono text-xs text-muted-foreground">{r.slug}</code>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{SECTION_TYPE_LABEL[r.section_type] ?? r.section_type}</TableCell>
                                                <TableCell className="text-muted-foreground">{STRATEGY_LABEL[r.strategy] ?? r.strategy}</TableCell>
                                                <TableCell className="font-mono text-foreground">{r.items_count}</TableCell>
                                                <TableCell>
                                                    <StatusBadge row={r} />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end">{rowActions(r)}</div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground">
                Public API: <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono">homepage/sections/</code>
                {' · '}Staff endpoints require Django <strong className="text-foreground">is_staff</strong>.
            </p>

            <SectionSheet open={sheetOpen} section={editing} sectionCount={rows.length} categories={categories} onOpenChange={setSheetOpen} onChanged={load} />

            <Dialog open={toDelete !== null} onOpenChange={(open) => (!open && !deleting ? setToDelete(null) : undefined)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this section?</DialogTitle>
                        <DialogDescription>{toDelete ? `"${toDelete.title}" will be removed from the homepage. This cannot be undone.` : null}</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
                            {deleting ? <Loader2 className="animate-spin" aria-hidden /> : null}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
