import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useSWR, { mutate as globalMutate } from 'swr';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive, ArchiveRestore, Loader2, MoreHorizontal, Package, Pencil, Plus } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { DataTable, type DataTableSort } from '@/components/shadcn/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/shadcn/dropdown-menu';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import {
    fetchSellerListings,
    formatMoney,
    LOW_STOCK_THRESHOLD,
    setListingStatus,
    toListingSaveError,
    type ListingRow,
    type Paginated,
    type SellerApiError,
} from '@/services/sellerListingsService';
import { NotSellerState } from './NotSellerState';

type TabId = 'all' | 'active' | 'draft' | 'low' | 'archived';

const TABS: { id: TabId; label: string; status: string; lowStock: boolean }[] = [
    { id: 'all', label: 'All', status: '', lowStock: false },
    { id: 'active', label: 'Active', status: 'Active', lowStock: false },
    { id: 'draft', label: 'Draft', status: 'Draft', lowStock: false },
    { id: 'low', label: 'Low stock', status: '', lowStock: true },
    { id: 'archived', label: 'Archived', status: 'Archived', lowStock: false },
];

const STATUS_VARIANT: Record<string, BadgeProps['variant']> = {
    Active: 'success',
    Published: 'success',
    Draft: 'secondary',
    Pending: 'warning',
    Archived: 'outline',
    Suspended: 'destructive',
    Deactivated: 'destructive',
};

const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, keepPreviousData: true } as const;

const isArchived = (row: ListingRow) => row.status === 'Archived';
const canArchive = (row: ListingRow) => row.status !== 'Archived' && row.status !== 'Suspended' && row.status !== 'Deleted';

function priceText(row: ListingRow): string {
    const currency = row.pricing_currency;
    const prices = (row.variants ?? []).map((v) => Number(v.price)).filter((n) => Number.isFinite(n));
    if (prices.length > 1) {
        const lo = Math.min(...prices);
        const hi = Math.max(...prices);
        if (lo !== hi) return `${formatMoney(lo, currency)} - ${formatMoney(hi, currency)}`;
    }
    return formatMoney(row.primary_variant_price, currency);
}

function stockInfo(row: ListingRow): { total: number; label: string; variant: BadgeProps['variant'] | null } {
    const total = row.variant_stock_total ?? 0;
    const variants = row.variants ?? [];
    const hasVariants = variants.length > 0 || row.primary_sku !== null;
    if (hasVariants && total === 0) return { total, label: 'Out of stock', variant: 'destructive' };
    const lowCount = variants.filter((v) => (v.quantity ?? 0) <= LOW_STOCK_THRESHOLD).length;
    if (lowCount > 0 || (variants.length === 0 && total <= LOW_STOCK_THRESHOLD)) return { total, label: 'Low stock', variant: 'warning' };
    return { total, label: '', variant: null };
}

function Thumb({ row, className }: { row: ListingRow; className?: string }) {
    return (
        <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground ${className ?? 'h-11 w-11'}`}>
            {row.main_product_image ? <img src={row.main_product_image} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package className="h-5 w-5" aria-hidden="true" />}
        </div>
    );
}

function StatusBadge({ status }: { status: ListingRow['status'] }) {
    return <Badge variant={STATUS_VARIANT[status ?? ''] ?? 'secondary'}>{status || 'No status'}</Badge>;
}

interface RowActionsProps {
    row: ListingRow;
    busy: boolean;
    onEdit: (row: ListingRow) => void;
    onArchive: (row: ListingRow) => void;
    onRestore: (row: ListingRow) => void;
}

function RowActions({ row, busy, onEdit, onArchive, onRestore }: RowActionsProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${row.name}`} disabled={busy} onClick={(e) => e.stopPropagation()}>
                    {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <MoreHorizontal aria-hidden="true" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onSelect={() => onEdit(row)}>
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    Edit
                </DropdownMenuItem>
                {isArchived(row) ? (
                    <DropdownMenuItem onSelect={() => onRestore(row)}>
                        <ArchiveRestore className="mr-2 h-4 w-4" aria-hidden="true" />
                        Restore as draft
                    </DropdownMenuItem>
                ) : canArchive(row) ? (
                    <DropdownMenuItem onSelect={() => onArchive(row)}>
                        <Archive className="mr-2 h-4 w-4" aria-hidden="true" />
                        Archive
                    </DropdownMenuItem>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function ListingsTable() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [sort, setSort] = useState<DataTableSort | null>({ id: 'updated_at', desc: true });
    const [search, setSearch] = useState('');
    const [tab, setTab] = useState<TabId>('all');
    const [pendingArchive, setPendingArchive] = useState<ListingRow | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const active = TABS.find((t) => t.id === tab) ?? TABS[0];
    const ordering = sort ? `${sort.desc ? '-' : ''}${sort.id}` : undefined;

    const { data, error, isLoading, mutate } = useSWR<Paginated<ListingRow>, SellerApiError>(
        ['seller:listings', page, pageSize, ordering ?? '', search, active.status, active.lowStock],
        () => fetchSellerListings({ page, pageSize, search, status: active.status, lowStock: active.lowStock, ordering }),
        SWR_OPTIONS
    );

    const edit = (row: ListingRow) => navigate({ search: `?mode=edit&id=${encodeURIComponent(row.id)}` });

    const changeStatus = async (row: ListingRow, status: 'Archived' | 'Draft', success: string) => {
        setBusyId(row.id);
        try {
            await setListingStatus(row.id, status);
            toast.success(success);
            await mutate();
            void globalMutate('seller:stats');
        } catch (e) {
            toast.error(toListingSaveError(e).message);
        } finally {
            setBusyId(null);
        }
    };

    const columns: ColumnDef<ListingRow>[] = [
        {
            id: 'name',
            accessorKey: 'name',
            header: 'Listing',
            meta: { label: 'Listing', cardTitle: true },
            cell: ({ row }) => (
                <div className="flex min-w-0 items-center gap-2.5">
                    <Thumb row={row.original} />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{row.original.name}</p>
                        {row.original.category_name ? <p className="truncate text-xs text-muted-foreground">{row.original.category_name}</p> : null}
                    </div>
                </div>
            ),
        },
        {
            id: 'sku',
            header: 'SKU',
            enableSorting: false,
            meta: { label: 'SKU' },
            cell: ({ row }) => {
                const more = (row.original.variants?.length ?? 0) > 1 ? ` +${(row.original.variants?.length ?? 1) - 1}` : '';
                return row.original.primary_sku ? (
                    <span className="font-mono text-xs text-muted-foreground">
                        {row.original.primary_sku}
                        {more}
                    </span>
                ) : (
                    <span className="text-muted-foreground">-</span>
                );
            },
        },
        {
            id: 'price',
            header: 'Price',
            enableSorting: false,
            meta: { label: 'Price', className: 'whitespace-nowrap' },
            cell: ({ row }) => <span className="text-sm tabular-nums">{priceText(row.original)}</span>,
        },
        {
            id: 'stock',
            header: 'Stock',
            enableSorting: false,
            meta: { label: 'Stock', className: 'whitespace-nowrap' },
            cell: ({ row }) => {
                const info = stockInfo(row.original);
                return (
                    <span className="inline-flex items-center gap-1.5 text-sm tabular-nums">
                        {info.total.toLocaleString()}
                        {info.variant ? <Badge variant={info.variant}>{info.label}</Badge> : null}
                    </span>
                );
            },
        },
        {
            id: 'status',
            header: 'Status',
            enableSorting: false,
            meta: { label: 'Status' },
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        },
        {
            id: 'updated_at',
            accessorKey: 'updated_at',
            header: 'Updated',
            meta: { label: 'Updated', className: 'whitespace-nowrap' },
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.updated_at ? dayjs(row.original.updated_at).format('D MMM YYYY') : '-'}</span>,
        },
        {
            id: 'actions',
            header: () => <span className="sr-only">Actions</span>,
            enableSorting: false,
            enableHiding: false,
            meta: { className: 'w-12 text-right' },
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <RowActions row={row.original} busy={busyId === row.original.id} onEdit={edit} onArchive={setPendingArchive} onRestore={(r) => void changeStatus(r, 'Draft', 'Restored as a draft')} />
                </div>
            ),
        },
    ];

    if (error?.kind === 'forbidden') {
        return (
            <div className="space-y-3">
                <PageHeader title="Listings" className="pb-0" />
                <NotSellerState message={error.message} />
            </div>
        );
    }

    const filtered = Boolean(search) || tab !== 'all';

    const emptyState = filtered ? (
        <EmptyState
            icon={Package}
            title="No listings match"
            description="Try another tab or a different search."
            action={
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setSearch('');
                        setTab('all');
                        setPage(1);
                    }}
                >
                    Clear filters
                </Button>
            }
        />
    ) : (
        <EmptyState
            icon={Package}
            title="No listings yet"
            description="Products you list for sale show up here with their stock and status."
            action={
                <Button asChild>
                    <Link to={{ search: '?mode=new' }}>
                        <Plus aria-hidden="true" />
                        Add listing
                    </Link>
                </Button>
            }
        />
    );

    return (
        <div className="space-y-3">
            <PageHeader
                title="Listings"
                description="Manage the products you sell"
                className="pb-0"
                actions={
                    <Button asChild>
                        <Link to={{ search: '?mode=new' }}>
                            <Plus aria-hidden="true" />
                            Add listing
                        </Link>
                    </Button>
                }
            />

            <Tabs
                value={tab}
                onValueChange={(v) => {
                    setTab(v as TabId);
                    setPage(1);
                }}
            >
                <TabsList className="h-9 w-full justify-start overflow-x-auto sm:w-auto" aria-label="Filter listings by status">
                    {TABS.map((t) => (
                        <TabsTrigger key={t.id} value={t.id} className="py-1">
                            {t.label}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <DataTable<ListingRow>
                columns={columns}
                data={data?.results ?? []}
                total={data?.count ?? 0}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={setPage}
                onPageSizeChange={(s) => {
                    setPageSize(s);
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
                searchPlaceholder="Search listings"
                isLoading={isLoading}
                error={error}
                onRetry={() => void mutate()}
                emptyState={emptyState}
                getRowId={(row) => row.id}
                onRowClick={edit}
                enableColumnVisibility={false}
                renderMobileCard={(row) => {
                    const info = stockInfo(row);
                    return (
                        <Card className="p-3" onClick={() => edit(row)}>
                            <div className="flex items-start gap-2.5">
                                <Thumb row={row} className="h-14 w-14" />
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{row.name}</p>
                                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{row.primary_sku ?? '-'}</p>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <RowActions row={row} busy={busyId === row.id} onEdit={edit} onArchive={setPendingArchive} onRestore={(r) => void changeStatus(r, 'Draft', 'Restored as a draft')} />
                                </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-sm">
                                <span className="font-medium tabular-nums text-foreground">{priceText(row)}</span>
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                    {info.total.toLocaleString()} in stock
                                    {info.variant ? <Badge variant={info.variant}>{info.label}</Badge> : null}
                                </span>
                                <StatusBadge status={row.status} />
                            </div>
                        </Card>
                    );
                }}
            />

            <Dialog open={pendingArchive !== null} onOpenChange={(open) => !open && setPendingArchive(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Archive this listing?</DialogTitle>
                        <DialogDescription>
                            {pendingArchive ? `"${pendingArchive.name}" will be hidden from buyers. You can restore it later as a draft.` : ''}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setPendingArchive(null)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                const row = pendingArchive;
                                setPendingArchive(null);
                                if (row) void changeStatus(row, 'Archived', 'Listing archived');
                            }}
                        >
                            Archive
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
