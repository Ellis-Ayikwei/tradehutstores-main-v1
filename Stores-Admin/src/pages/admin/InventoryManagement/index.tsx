import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Boxes, Loader2, Minus, Package, Pencil, Plus, RefreshCw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import { DataTable, type DataTableSort } from '@/components/shadcn/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { PageHeader } from '@/components/shadcn/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { StatCard } from '@/components/shadcn/stat-card';
import { Textarea } from '@/components/shadcn/textarea';
import { cn } from '@/lib/utils';
import { useCurrency } from '../../../contexts/CurrencyContext';
import axiosInstance from '../../../services/axiosInstance';

type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';

interface InventoryItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    current_stock: number;
    minimum_stock: number;
    maximum_stock: number;
    reorder_point: number;
    warehouse_location?: string;
    last_restocked: string;
    unit_cost: number;
    total_value: number;
    status: StockStatus;
}

const STATUS_META: Record<StockStatus, { label: string; variant: 'success' | 'warning' | 'destructive' | 'info'; icon: typeof Package }> = {
    in_stock: { label: 'In stock', variant: 'success', icon: Package },
    low_stock: { label: 'Low stock', variant: 'warning', icon: AlertTriangle },
    out_of_stock: { label: 'Out of stock', variant: 'destructive', icon: AlertTriangle },
    overstock: { label: 'Overstock', variant: 'info', icon: TrendingUp },
};

const PAGE_SIZES = [10, 25, 50, 100];

const formatDate = (dateString: string): string =>
    new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateString));

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const meta = STATUS_META[status as StockStatus] ?? STATUS_META.in_stock;
    const Icon = meta.icon;
    return (
        <Badge variant={meta.variant}>
            <Icon aria-hidden="true" />
            {meta.label}
        </Badge>
    );
};

const StockBar: React.FC<{ item: InventoryItem }> = ({ item }) => {
    const current = item.current_stock || 0;
    const max = item.maximum_stock || 1;
    const pct = (current / max) * 100;
    const color = pct < 25 ? 'bg-destructive' : pct < 50 ? 'bg-warning' : 'bg-success';
    return (
        <div className="h-1.5 w-full min-w-[96px] overflow-hidden rounded-full bg-muted">
            <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
    );
};

const StockLevel: React.FC<{ item: InventoryItem }> = ({ item }) => {
    const current = item.current_stock || 0;
    const tone = current <= (item.reorder_point || 0) ? 'text-destructive' : current <= (item.minimum_stock || 0) ? 'text-warning-700' : 'text-foreground';
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-1.5">
                <span className={cn('font-semibold', tone)}>{item.current_stock ?? 0}</span>
                <span className="text-xs text-muted-foreground">/ {item.maximum_stock || 0}</span>
            </div>
            <StockBar item={item} />
        </div>
    );
};

const InventoryManagement: React.FC = () => {
    const { formatDisplayPrice: formatCurrency } = useCurrency();

    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<DataTableSort | null>(null);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [adjustment, setAdjustment] = useState({ quantity: 0, reason: '', type: 'add' as 'add' | 'remove' });
    const [adjustError, setAdjustError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    const fetchInventory = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/products/inventory/');
            const data = response.data;
            setInventory(Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);
        } catch (err) {
            setError('Failed to fetch inventory. Please try again later.');
            console.error('Error fetching inventory:', err);
            setInventory([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    const stats = useMemo(
        () => ({
            all: inventory.length,
            in_stock: inventory.filter((i) => i.status === 'in_stock').length,
            low_stock: inventory.filter((i) => i.status === 'low_stock').length,
            out_of_stock: inventory.filter((i) => i.status === 'out_of_stock').length,
            overstock: inventory.filter((i) => i.status === 'overstock').length,
            total_value: inventory.reduce((sum, i) => sum + (i.total_value || 0), 0),
        }),
        [inventory]
    );

    const visibleRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        let rows = inventory.filter((i) => (statusFilter === 'all' ? true : i.status === statusFilter));
        if (q) {
            rows = rows.filter((i) => [i.product_name, i.sku, i.warehouse_location].some((v) => (v || '').toLowerCase().includes(q)));
        }
        if (sort) {
            const key = sort.id as keyof InventoryItem;
            rows = [...rows].sort((a, b) => {
                const av = a[key] ?? '';
                const bv = b[key] ?? '';
                const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
                return sort.desc ? -cmp : cmp;
            });
        }
        return rows;
    }, [inventory, statusFilter, search, sort]);

    const pagedRows = useMemo(() => visibleRows.slice((page - 1) * pageSize, page * pageSize), [visibleRows, page, pageSize]);

    const openAdjust = (item: InventoryItem, type: 'add' | 'remove') => {
        setSelectedItem(item);
        setAdjustment({ quantity: 0, reason: '', type });
        setAdjustError(null);
    };

    const newStock = selectedItem
        ? adjustment.type === 'add'
            ? selectedItem.current_stock + adjustment.quantity
            : selectedItem.current_stock - adjustment.quantity
        : 0;

    const confirmAdjust = async () => {
        if (!selectedItem || adjustment.quantity <= 0) return;
        try {
            setSaving(true);
            setAdjustError(null);
            await axiosInstance.patch(`/products/inventory/${selectedItem.id}/`, {
                current_stock: newStock,
                adjustment_reason: adjustment.reason,
            });
            setSelectedItem(null);
            toast.success('Stock updated.');
            await fetchInventory();
        } catch (err) {
            setAdjustError('Failed to update stock. Please try again.');
            console.error('Error updating stock:', err);
        } finally {
            setSaving(false);
        }
    };

    const rowActions = (item: InventoryItem) => (
        <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => openAdjust(item, 'add')} title="Add stock" aria-label={`Add stock to ${item.product_name}`}>
                <Plus aria-hidden="true" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => openAdjust(item, 'remove')} title="Remove stock" aria-label={`Remove stock from ${item.product_name}`}>
                <Minus aria-hidden="true" />
            </Button>
            <Button asChild variant="ghost" size="icon-sm">
                <Link to={`/admin/products/${item.product_id}/edit`} title="Edit product" aria-label={`Edit ${item.product_name}`}>
                    <Pencil aria-hidden="true" />
                </Link>
            </Button>
        </div>
    );

    const columns = useMemo<ColumnDef<InventoryItem>[]>(
        () => [
            {
                id: 'product_name',
                accessorKey: 'product_name',
                header: 'Product',
                meta: { label: 'Product', cardTitle: true },
                cell: ({ row }) => (
                    <div>
                        <div className="font-semibold text-foreground">{row.original.product_name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">SKU: {row.original.sku || 'N/A'}</div>
                    </div>
                ),
            },
            {
                id: 'current_stock',
                accessorKey: 'current_stock',
                header: 'Stock level',
                meta: { label: 'Stock level' },
                cell: ({ row }) => <StockLevel item={row.original} />,
            },
            {
                id: 'reorder_point',
                accessorKey: 'reorder_point',
                header: 'Reorder point',
                meta: { label: 'Reorder point' },
                cell: ({ row }) => <span>{row.original.reorder_point ?? 0}</span>,
            },
            {
                id: 'unit_cost',
                accessorKey: 'unit_cost',
                header: 'Unit cost',
                meta: { label: 'Unit cost' },
                cell: ({ row }) => <span className="text-muted-foreground">{formatCurrency(row.original.unit_cost || 0)}</span>,
            },
            {
                id: 'total_value',
                accessorKey: 'total_value',
                header: 'Total value',
                meta: { label: 'Total value' },
                cell: ({ row }) => <span className="font-semibold">{formatCurrency(row.original.total_value || 0)}</span>,
            },
            {
                id: 'warehouse_location',
                accessorKey: 'warehouse_location',
                header: 'Location',
                enableSorting: false,
                meta: { label: 'Location' },
                cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.warehouse_location || 'N/A'}</span>,
            },
            {
                id: 'status',
                accessorKey: 'status',
                header: 'Status',
                meta: { label: 'Status' },
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
            },
            {
                id: 'last_restocked',
                accessorKey: 'last_restocked',
                header: 'Last restocked',
                meta: { label: 'Last restocked' },
                cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.last_restocked ? formatDate(row.original.last_restocked) : 'N/A'}</span>,
            },
            {
                id: 'actions',
                header: () => <span className="sr-only">Actions</span>,
                enableSorting: false,
                enableHiding: false,
                cell: ({ row }) => rowActions(row.original),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [formatCurrency]
    );

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            <PageHeader
                title="Inventory"
                description="Track and manage product stock levels."
                actions={
                    <Button type="button" variant="outline" onClick={fetchInventory} disabled={loading}>
                        <RefreshCw className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <StatCard label="Total items" value={stats.all} icon={Boxes} isLoading={loading} />
                <StatCard label="In stock" value={stats.in_stock} icon={Package} isLoading={loading} />
                <StatCard label="Low stock" value={stats.low_stock} icon={AlertTriangle} isLoading={loading} />
                <StatCard label="Out of stock" value={stats.out_of_stock} icon={AlertTriangle} isLoading={loading} />
                <StatCard label="Total value" value={formatCurrency(stats.total_value)} icon={TrendingUp} isLoading={loading} className="col-span-2 md:col-span-1" />
            </div>

            <DataTable<InventoryItem>
                columns={columns}
                data={pagedRows}
                total={visibleRows.length}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZES}
                onPageChange={setPage}
                onPageSizeChange={(n) => {
                    setPageSize(n);
                    setPage(1);
                }}
                sort={sort}
                onSortChange={(s) => {
                    setSort(s);
                    setPage(1);
                }}
                search={search}
                onSearchChange={(v) => {
                    setSearch(v);
                    setPage(1);
                }}
                searchPlaceholder="Search product, SKU or location"
                isLoading={loading}
                error={error}
                onRetry={fetchInventory}
                getRowId={(row) => row.id}
                toolbar={
                    <Select
                        value={statusFilter}
                        onValueChange={(v) => {
                            setStatusFilter(v);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[200px]" aria-label="Filter by status">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All items ({stats.all})</SelectItem>
                            <SelectItem value="in_stock">In stock ({stats.in_stock})</SelectItem>
                            <SelectItem value="low_stock">Low stock ({stats.low_stock})</SelectItem>
                            <SelectItem value="out_of_stock">Out of stock ({stats.out_of_stock})</SelectItem>
                            <SelectItem value="overstock">Overstock ({stats.overstock})</SelectItem>
                        </SelectContent>
                    </Select>
                }
                emptyState={
                    <EmptyState
                        icon={Boxes}
                        title={inventory.length === 0 ? 'No inventory yet' : 'No items match'}
                        description={inventory.length === 0 ? 'Stock records will appear here once products are tracked.' : 'Try a different search or status filter.'}
                    />
                }
                renderMobileCard={(item) => (
                    <Card key={item.id}>
                        <CardContent className="space-y-3 p-4 pt-4">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate font-semibold text-foreground">{item.product_name || 'N/A'}</p>
                                    <p className="text-xs text-muted-foreground">SKU: {item.sku || 'N/A'}</p>
                                </div>
                                <StatusBadge status={item.status} />
                            </div>
                            <StockLevel item={item} />
                            <dl className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <dt className="text-xs text-muted-foreground">Reorder point</dt>
                                    <dd>{item.reorder_point ?? 0}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">Total value</dt>
                                    <dd className="font-semibold">{formatCurrency(item.total_value || 0)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">Location</dt>
                                    <dd>{item.warehouse_location || 'N/A'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-muted-foreground">Last restocked</dt>
                                    <dd>{item.last_restocked ? formatDate(item.last_restocked) : 'N/A'}</dd>
                                </div>
                            </dl>
                            <div className="flex justify-end border-t border-border pt-3">{rowActions(item)}</div>
                        </CardContent>
                    </Card>
                )}
            />

            {/* Stock adjustment */}
            <Dialog open={selectedItem !== null} onOpenChange={(o) => (!o && !saving ? setSelectedItem(null) : undefined)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{adjustment.type === 'add' ? 'Add stock' : 'Remove stock'}</DialogTitle>
                        <DialogDescription>
                            {selectedItem ? `${selectedItem.product_name} · current stock ${selectedItem.current_stock}` : null}
                        </DialogDescription>
                    </DialogHeader>

                    {adjustError ? (
                        <div role="alert" className="rounded-xl bg-destructive-subtle px-4 py-3 text-sm text-destructive-subtle-foreground">
                            {adjustError}
                        </div>
                    ) : null}

                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="adjust-qty">Quantity *</Label>
                            <Input
                                id="adjust-qty"
                                type="number"
                                min={1}
                                value={adjustment.quantity || ''}
                                onChange={(e) => setAdjustment((a) => ({ ...a, quantity: parseInt(e.target.value, 10) || 0 }))}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="adjust-reason">Reason *</Label>
                            <Textarea id="adjust-reason" rows={3} value={adjustment.reason} onChange={(e) => setAdjustment((a) => ({ ...a, reason: e.target.value }))} placeholder="Enter reason for adjustment" />
                        </div>
                        <div className="rounded-xl bg-muted px-4 py-3 text-sm">
                            <span className="text-muted-foreground">New stock: </span>
                            <span className={cn('font-semibold', newStock < 0 && 'text-destructive')}>{newStock}</span>
                            {newStock < 0 ? <p className="mt-1 text-xs text-destructive">Stock cannot go below zero.</p> : null}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSelectedItem(null)} disabled={saving}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={confirmAdjust} disabled={saving || !adjustment.quantity || !adjustment.reason.trim() || newStock < 0}>
                            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                            Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default InventoryManagement;
