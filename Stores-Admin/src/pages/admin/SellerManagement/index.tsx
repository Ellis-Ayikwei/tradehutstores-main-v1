import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import { ChevronRight, RefreshCw, Store } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { DataTable } from '@/components/shadcn/data-table';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { cn } from '@/lib/utils';
import { fetchAdminSellers, type AdminSellerError, type Paginated, type SellerListRow } from '@/services/adminSellersService';
import { setPageTitle } from '@/store/themeConfigSlice';
import { SELLERS_KEY } from './sellerSections';
import { CategoryChips, MissingChip, STATUS_TABS, StatusBadge, businessTypeLabel, categoryNames, ownerName, rowDate } from './sellerUi';

const PAGE_SIZE = 25;
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, keepPreviousData: true } as const;

function docsLabel(row: SellerListRow): string {
    const count = row.documents_count ?? 0;
    return `${count} uploaded`;
}

function StoreCell({ row }: { row: SellerListRow }) {
    return (
        <div className="min-w-0 space-y-1">
            <p className="truncate font-semibold text-foreground">{row.business_name}</p>
            {row.business_type ? (
                <Badge variant="outline" className="font-medium">
                    {businessTypeLabel(row.business_type)}
                </Badge>
            ) : null}
            <CategoryChips names={categoryNames(row.selling_categories)} other={row.other_category} />
        </div>
    );
}

function OwnerCell({ row }: { row: SellerListRow }) {
    return (
        <div className="min-w-0">
            <p className="truncate text-sm text-foreground">{ownerName(row.user) || '-'}</p>
            {row.user?.email ? <p className="truncate text-xs text-muted-foreground">{row.user.email}</p> : null}
        </div>
    );
}

export default function SellerManagement() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    useEffect(() => {
        dispatch(setPageTitle('Sellers'));
    }, [dispatch]);

    const tab = STATUS_TABS.find((t) => t.value === searchParams.get('status')) ?? STATUS_TABS[0];
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const q = searchParams.get('q') ?? '';

    const update = useCallback(
        (patch: Record<string, string | null>, replace = true) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    for (const [key, value] of Object.entries(patch)) {
                        if (value === null || value === '') next.delete(key);
                        else next.set(key, value);
                    }
                    return next;
                },
                { replace }
            );
        },
        [setSearchParams]
    );

    const { data, error, isLoading, isValidating, mutate } = useSWR<Paginated<SellerListRow>, AdminSellerError>(
        [SELLERS_KEY, 'list', tab.status, q, page, PAGE_SIZE],
        () => fetchAdminSellers({ status: tab.status, q, page, pageSize: PAGE_SIZE }),
        SWR_OPTIONS
    );

    // Pending count for the tab badge; independent of the tab and search currently shown.
    const { data: pendingData } = useSWR<Paginated<SellerListRow>, AdminSellerError>([SELLERS_KEY, 'count', 'pending'], () => fetchAdminSellers({ status: 'pending', pageSize: 1 }), SWR_OPTIONS);
    const pendingCount = pendingData?.count;

    const openSeller = useCallback((id: string | number) => navigate(`/admin/sellers/${id}`), [navigate]);

    const emptyState = useMemo(() => {
        if (q) return undefined;
        if (tab.value === 'pending') return <EmptyState icon={Store} title="No pending applications" description="New seller applications waiting for review show up here." />;
        if (tab.value === 'all') return <EmptyState icon={Store} title="No sellers yet" description="Sellers who apply online will appear here." />;
        return <EmptyState icon={Store} title={`No ${tab.label.toLowerCase()} sellers`} description="Sellers with this status will appear here." />;
    }, [q, tab]);

    const columns = useMemo<ColumnDef<SellerListRow>[]>(
        () => [
            { id: 'store', header: 'Store', enableSorting: false, enableHiding: false, meta: { label: 'Store', cardTitle: true, className: 'max-w-[18rem]' }, cell: ({ row }) => <StoreCell row={row.original} /> },
            { id: 'owner', header: 'Owner', enableSorting: false, meta: { label: 'Owner', className: 'max-w-[14rem]' }, cell: ({ row }) => <OwnerCell row={row.original} /> },
            { id: 'status', header: 'Status', enableSorting: false, meta: { label: 'Status' }, cell: ({ row }) => <StatusBadge status={row.original.verification_status} /> },
            {
                id: 'documents',
                header: 'Documents',
                enableSorting: false,
                meta: { label: 'Documents', className: 'max-w-[16rem]' },
                cell: ({ row }) => (
                    <div className="flex flex-col items-start gap-1">
                        <span className="text-sm text-foreground">{docsLabel(row.original)}</span>
                        <MissingChip kinds={row.original.missing_documents ?? []} />
                    </div>
                ),
            },
            { id: 'date', header: 'Updated', enableSorting: false, meta: { label: 'Updated' }, cell: ({ row }) => <span className="whitespace-nowrap text-sm text-muted-foreground">{rowDate(row.original) || '-'}</span> },
            {
                id: 'review',
                header: () => <span className="sr-only">Review</span>,
                enableSorting: false,
                enableHiding: false,
                meta: { className: 'w-24 text-right' },
                cell: ({ row }) => (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label={`Open ${row.original.business_name}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            openSeller(row.original.id);
                        }}
                    >
                        Open
                    </Button>
                ),
            },
        ],
        [openSeller]
    );

    const renderMobileCard = useCallback(
        (row: SellerListRow) => {
            const missing = row.missing_documents ?? [];
            return (
                <Card key={row.id} className="p-3">
                    <button type="button" onClick={() => openSeller(row.id)} className="flex w-full items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                                <p className="min-w-0 truncate text-sm font-semibold text-foreground">{row.business_name}</p>
                                <StatusBadge status={row.verification_status} className="shrink-0" />
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                {row.business_type ? (
                                    <Badge variant="outline" className="font-medium">
                                        {businessTypeLabel(row.business_type)}
                                    </Badge>
                                ) : null}
                                <span className="truncate text-xs text-muted-foreground">{[ownerName(row.user), row.user?.email].filter(Boolean).join(' · ')}</span>
                            </div>
                            <CategoryChips names={categoryNames(row.selling_categories)} other={row.other_category} />
                            <p className="text-xs text-muted-foreground">
                                {docsLabel(row)}
                                {rowDate(row) ? ` · ${rowDate(row)}` : ''}
                            </p>
                            {missing.length > 0 ? <MissingChip kinds={missing} /> : null}
                        </div>
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                </Card>
            );
        },
        [openSeller]
    );

    return (
        <div className="space-y-3">
            <PageHeader
                title="Sellers"
                description="Review applications and open a seller to see what they sold and what they have been paid. Products stay hidden until approved."
                className="pb-0"
                actions={
                    <Button type="button" variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
                        <RefreshCw className={cn(isValidating && 'animate-spin')} aria-hidden="true" />
                        Refresh
                    </Button>
                }
            />

            <Tabs value={tab.value} onValueChange={(value) => update({ status: value === 'pending' ? null : value, page: null })}>
                <div className="-mx-1 overflow-x-auto px-1 pb-1">
                    <TabsList className="w-max">
                        {STATUS_TABS.map((t) => (
                            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                                {t.label}
                                {t.value === 'pending' && pendingCount !== undefined ? (
                                    <Badge variant="outline" className={cn('border-transparent px-1.5 py-0', pendingCount > 0 ? 'bg-warning-subtle text-warning-subtle-foreground' : 'bg-muted text-muted-foreground')}>
                                        {pendingCount}
                                    </Badge>
                                ) : null}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
            </Tabs>

            <DataTable
                columns={columns}
                data={data?.results ?? []}
                total={data?.count ?? 0}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={(next) => update({ page: next <= 1 ? null : String(next) })}
                search={q}
                onSearchChange={(value) => update({ q: value.trim() || null, page: null })}
                searchPlaceholder="Search store, owner or email"
                isLoading={isLoading}
                error={error}
                onRetry={() => void mutate()}
                emptyState={emptyState}
                getRowId={(row) => String(row.id)}
                onRowClick={(row) => openSeller(row.id)}
                renderMobileCard={renderMobileCard}
                enableColumnVisibility={false}
            />

        </div>
    );
}
