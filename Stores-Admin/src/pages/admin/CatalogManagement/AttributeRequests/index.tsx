import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';
import { ChevronRight, Inbox, RefreshCw } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { DataTable } from '@/components/shadcn/data-table';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { cn } from '@/lib/utils';
import { ATTRIBUTE_REQUESTS_KEY, fetchAdminValueRequests, type AttributeRequestError, type AttributeValueRequest, type Paginated } from '@/services/attributeRequestsService';
import { listAttributes, type AdminAttribute } from '@/services/catalogAdminService';
import { ReviewSheet } from './ReviewSheet';
import { STATUS_TABS, StatusBadge, ValueCell, formatDate, requesterLabel } from './requestUi';

const PAGE_SIZE = 25;
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, keepPreviousData: true } as const;

/** Number of requests waiting for staff, for the tab badge. Shares the cache key prefix so a review refreshes it. */
export function usePendingValueRequestCount(): number | undefined {
    const { data } = useSWR<Paginated<AttributeValueRequest>, AttributeRequestError>([ATTRIBUTE_REQUESTS_KEY, 'count', 'pending'], () => fetchAdminValueRequests({ status: 'pending', pageSize: 1 }), SWR_OPTIONS);
    return data?.count;
}

export default function AttributeRequestsPanel() {
    const [tabValue, setTabValue] = useState('pending');
    const [attribute, setAttribute] = useState('');
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<AttributeValueRequest | null>(null);

    const tab = STATUS_TABS.find((t) => t.value === tabValue) ?? STATUS_TABS[0];
    const pendingCount = usePendingValueRequestCount();

    const attributes = useSWR<AdminAttribute[]>('admin:attributes', () => listAttributes().then((rows) => (Array.isArray(rows) ? rows : ((rows as { results?: AdminAttribute[] })?.results ?? []))), SWR_OPTIONS);

    const { data, error, isLoading, isValidating, mutate } = useSWR<Paginated<AttributeValueRequest>, AttributeRequestError>(
        [ATTRIBUTE_REQUESTS_KEY, 'list', tab.status, attribute, q, page, PAGE_SIZE],
        () => fetchAdminValueRequests({ status: tab.status, attribute, q, page, pageSize: PAGE_SIZE }),
        SWR_OPTIONS
    );

    const open = useCallback((row: AttributeValueRequest) => setSelected(row), []);

    const emptyState = useMemo(() => {
        if (q || attribute) return undefined;
        if (tab.value === 'pending') return <EmptyState icon={Inbox} title="No pending requests" description="When a seller asks for a new option value, it shows up here for review." />;
        if (tab.value === 'all') return <EmptyState icon={Inbox} title="No requests yet" description="Requests from sellers for new option values will appear here." />;
        return <EmptyState icon={Inbox} title={`No ${tab.label.toLowerCase()} requests`} description="Requests with this status will appear here." />;
    }, [q, attribute, tab]);

    const columns = useMemo<ColumnDef<AttributeValueRequest>[]>(
        () => [
            { id: 'value', header: 'Value', enableSorting: false, enableHiding: false, meta: { label: 'Value', cardTitle: true, className: 'max-w-[14rem]' }, cell: ({ row }) => <ValueCell row={row.original} /> },
            { id: 'type', header: 'Option type', enableSorting: false, meta: { label: 'Option type' }, cell: ({ row }) => <span className="text-sm text-foreground">{row.original.attribute.name}</span> },
            {
                id: 'seller',
                header: 'Seller',
                enableSorting: false,
                meta: { label: 'Seller', className: 'max-w-[14rem]' },
                cell: ({ row }) => {
                    const who = requesterLabel(row.original);
                    return (
                        <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">{who.primary}</p>
                            {who.secondary ? <p className="truncate text-xs text-muted-foreground">{who.secondary}</p> : null}
                        </div>
                    );
                },
            },
            { id: 'note', header: 'Note', enableSorting: false, meta: { label: 'Note', className: 'max-w-[16rem]' }, cell: ({ row }) => <span className="line-clamp-2 text-sm text-muted-foreground">{row.original.note || '-'}</span> },
            { id: 'date', header: 'Requested', enableSorting: false, meta: { label: 'Requested' }, cell: ({ row }) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.original.created_on) || '-'}</span> },
            { id: 'status', header: 'Status', enableSorting: false, meta: { label: 'Status' }, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
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
                        aria-label={`Review ${row.original.value_name}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            open(row.original);
                        }}
                    >
                        Review
                    </Button>
                ),
            },
        ],
        [open]
    );

    const renderMobileCard = useCallback(
        (row: AttributeValueRequest) => {
            const who = requesterLabel(row);
            return (
                <Card key={row.id} className="p-3">
                    <button type="button" onClick={() => open(row)} className="flex w-full items-start gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                                <ValueCell row={row} />
                                <StatusBadge status={row.status} className="shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {row.attribute.name} · {who.primary}
                                {formatDate(row.created_on) ? ` · ${formatDate(row.created_on)}` : ''}
                            </p>
                            {row.note ? <p className="line-clamp-2 text-sm text-muted-foreground">{row.note}</p> : null}
                        </div>
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                </Card>
            );
        },
        [open]
    );

    const toolbar = (
        <Select
            value={attribute || 'all'}
            onValueChange={(value) => {
                setAttribute(value === 'all' ? '' : value);
                setPage(1);
            }}
        >
            <SelectTrigger className="h-9 w-full min-w-[10rem] sm:w-auto" aria-label="Filter by option type">
                <SelectValue placeholder="All option types" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All option types</SelectItem>
                {(attributes.data ?? []).map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">Sellers ask for option values that are not in the catalog yet. Approve to add them, or reject with a note.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void mutate()} disabled={isValidating}>
                    <RefreshCw className={cn(isValidating && 'animate-spin')} aria-hidden="true" />
                    Refresh
                </Button>
            </div>

            <Tabs
                value={tab.value}
                onValueChange={(value) => {
                    setTabValue(value);
                    setPage(1);
                }}
            >
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
                onPageChange={setPage}
                search={q}
                onSearchChange={(value) => {
                    setQ(value.trim());
                    setPage(1);
                }}
                searchPlaceholder="Search value, seller or email"
                toolbar={toolbar}
                isLoading={isLoading}
                error={error}
                onRetry={() => void mutate()}
                emptyState={emptyState}
                getRowId={(row) => String(row.id)}
                onRowClick={open}
                renderMobileCard={renderMobileCard}
                enableColumnVisibility={false}
            />

            <ReviewSheet request={selected} attributes={attributes.data ?? []} onClose={() => setSelected(null)} />
        </div>
    );
}
