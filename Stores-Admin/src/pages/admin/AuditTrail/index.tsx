import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import type { ColumnDef } from '@tanstack/react-table';
import { Download, Eye, History, RefreshCw } from 'lucide-react';

import { Badge, type BadgeProps } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { DataTable, type DataTableSort } from '@/components/shadcn/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { PageHeader } from '@/components/shadcn/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { StatCard } from '@/components/shadcn/stat-card';
import { cn } from '@/lib/utils';
import axiosInstance from '@/services/axiosInstance';
import { setPageTitle } from '@/store/themeConfigSlice';

interface UserActivity {
    id: string;
    user_details: {
        id: string;
        email: string;
        first_name: string;
        last_name: string;
        user_type: string;
    };
    activity_type: string;
    request?: {
        id: string;
        title: string;
    };
    created_at: string;
    details?: unknown;
}

interface ActivityStats {
    users?: { total?: number };
    activities?: {
        total?: number;
        by_period?: { last_1_day?: number };
        most_active_users?: Array<{ user__email?: string; activity_count?: number }>;
    };
}

interface ActivityPage {
    rows: UserActivity[];
    count: number;
}

interface ActivityQuery {
    page: number;
    pageSize: number;
    search: string;
    activityType: string;
    startDate: string;
    endDate: string;
    sort: DataTableSort | null;
}

const PAGE_SIZE_DEFAULT = 25;
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, keepPreviousData: true } as const;

const ACTIVITY_LABELS: Record<string, string> = {
    login: 'Logged in',
    logout: 'Logged out',
    register: 'Registered',
    create_request: 'Created request',
    update_request: 'Updated request',
    cancel_request: 'Cancelled request',
    place_bid: 'Placed bid',
    update_bid: 'Updated bid',
    create_user: 'Created user',
    update_user: 'Updated user',
    delete_user: 'Deleted user',
    suspend_user: 'Suspended user',
    activate_user: 'Activated user',
    upload_file: 'Uploaded file',
    download_file: 'Downloaded file',
    api_call: 'API call',
};

const ACTIVITY_FILTER_OPTIONS = [
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'register', label: 'Registration' },
    { value: 'create_request', label: 'Create request' },
    { value: 'update_request', label: 'Update request' },
    { value: 'cancel_request', label: 'Cancel request' },
    { value: 'place_bid', label: 'Place bid' },
    { value: 'update_bid', label: 'Update bid' },
    { value: 'create_user', label: 'Create user' },
    { value: 'update_user', label: 'Update user' },
    { value: 'delete_user', label: 'Delete user' },
    { value: 'suspend_user', label: 'Suspend user' },
    { value: 'activate_user', label: 'Activate user' },
    { value: 'upload_file', label: 'Upload file' },
    { value: 'download_file', label: 'Download file' },
    { value: 'api_call', label: 'API call' },
];

function activityLabel(type: string): string {
    if (ACTIVITY_LABELS[type]) return ACTIVITY_LABELS[type];
    const text = type.replace(/_/g, ' ').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function activityBadge(type: string): BadgeProps['variant'] {
    if (type.includes('login') || type.includes('activate')) return 'success';
    if (type.includes('logout') || type.includes('delete') || type.includes('cancel') || type.includes('suspend')) return 'destructive';
    if (type.includes('update') || type.includes('modify')) return 'info';
    if (type.includes('create') || type.includes('register')) return 'secondary';
    return 'outline';
}

function formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function userName(user: UserActivity['user_details'] | undefined): string {
    if (!user) return '';
    return `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
}

/** Sends paging and filters to the API; a bare-array answer (no server paging) is filtered and paged locally. */
async function fetchActivities(query: ActivityQuery): Promise<ActivityPage> {
    const params: Record<string, string | number> = { page: query.page, page_size: query.pageSize };
    if (query.search) params.search = query.search;
    if (query.activityType) params.activity_type = query.activityType;
    if (query.startDate) params.start_date = query.startDate;
    if (query.endDate) params.end_date = query.endDate;
    if (query.sort) params.ordering = `${query.sort.desc ? '-' : ''}${query.sort.id}`;

    const data = (await axiosInstance.get('/activities/', { params })).data;
    if (!Array.isArray(data)) {
        const rows: UserActivity[] = data?.results ?? [];
        return { rows, count: typeof data?.count === 'number' ? data.count : rows.length };
    }

    let rows = data as UserActivity[];
    const term = query.search.toLowerCase();
    if (term) rows = rows.filter((a) => [a.user_details?.email, a.activity_type, a.request?.title].some((value) => (value ?? '').toLowerCase().includes(term)));
    if (query.activityType) rows = rows.filter((a) => a.activity_type === query.activityType);
    if (query.startDate) rows = rows.filter((a) => a.created_at.slice(0, 10) >= query.startDate);
    if (query.endDate) rows = rows.filter((a) => a.created_at.slice(0, 10) <= query.endDate);
    if (query.sort) {
        const direction = query.sort.desc ? -1 : 1;
        rows = [...rows].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0) * direction);
    }
    const start = (query.page - 1) * query.pageSize;
    return { rows: rows.slice(start, start + query.pageSize), count: rows.length };
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

function exportCsv(rows: UserActivity[]) {
    const lines = rows.map((activity) => [activity.user_details?.email ?? '', activityLabel(activity.activity_type), formatDate(activity.created_at), activity.request?.title ?? ''].map(csvCell).join(','));
    const blob = new Blob([['User,Activity,Timestamp,Request', ...lines].join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-0.5">
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm text-foreground">{children}</dd>
        </div>
    );
}

export default function AuditTrail() {
    const dispatch = useDispatch();
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
    const [search, setSearch] = useState('');
    const [activityType, setActivityType] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sort, setSort] = useState<DataTableSort | null>(null);
    const [selected, setSelected] = useState<UserActivity | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Audit trail'));
    }, [dispatch]);

    const query: ActivityQuery = { page, pageSize, search, activityType, startDate, endDate, sort };
    const { data, error, isLoading, isValidating, mutate } = useSWR<ActivityPage>(
        ['audit-trail', page, pageSize, search, activityType, startDate, endDate, sort?.id ?? '', sort?.desc ?? false],
        () => fetchActivities(query),
        { ...SWR_OPTIONS, refreshInterval: 30000 }
    );

    const { data: stats, isLoading: statsLoading } = useSWR<ActivityStats>('audit-trail-stats', async () => (await axiosInstance.get('/activities/stats/')).data, {
        shouldRetryOnError: false,
        revalidateOnFocus: false,
        refreshInterval: 60000,
    });

    const columns = useMemo<ColumnDef<UserActivity>[]>(
        () => [
            {
                id: 'activity',
                header: 'Activity',
                enableSorting: false,
                enableHiding: false,
                meta: { label: 'Activity', cardTitle: true, className: 'max-w-[18rem]' },
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{activityLabel(row.original.activity_type)}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.original.request ? `Request: ${row.original.request.title}` : 'System activity'}</p>
                    </div>
                ),
            },
            {
                id: 'user',
                header: 'User',
                enableSorting: false,
                meta: { label: 'User', className: 'max-w-[16rem]' },
                cell: ({ row }) => {
                    const user = row.original.user_details;
                    return (
                        <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{userName(user) || '-'}</p>
                            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                            {user?.user_type ? <p className="text-xs text-muted-foreground">{user.user_type}</p> : null}
                        </div>
                    );
                },
            },
            {
                id: 'type',
                header: 'Type',
                enableSorting: false,
                meta: { label: 'Type' },
                cell: ({ row }) => <Badge variant={activityBadge(row.original.activity_type)}>{activityLabel(row.original.activity_type)}</Badge>,
            },
            {
                accessorKey: 'created_at',
                header: 'Timestamp',
                meta: { label: 'Timestamp' },
                cell: ({ row }) => <span className="whitespace-nowrap text-sm text-foreground">{formatDate(row.original.created_at)}</span>,
            },
            {
                id: 'details',
                header: () => <span className="sr-only">Details</span>,
                enableSorting: false,
                enableHiding: false,
                meta: { className: 'w-16 text-right' },
                cell: ({ row }) => (
                    <Button type="button" variant="outline" size="icon-sm" aria-label="View activity details" title="View details" onClick={() => setSelected(row.original)}>
                        <Eye aria-hidden="true" />
                    </Button>
                ),
            },
        ],
        []
    );

    const resetPage = () => setPage(1);
    const hasFilters = Boolean(search || activityType || startDate || endDate);
    const mostActive = stats?.activities?.most_active_users?.[0];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Audit trail"
                description="Track user activities and system events."
                className="pb-0"
                actions={
                    <>
                        <Button type="button" variant="outline" onClick={() => void mutate()} disabled={isValidating}>
                            <RefreshCw className={cn(isValidating && 'animate-spin')} aria-hidden="true" />
                            {isValidating ? 'Refreshing...' : 'Refresh'}
                        </Button>
                        <Button type="button" onClick={() => exportCsv(data?.rows ?? [])} disabled={!data || data.rows.length === 0}>
                            <Download aria-hidden="true" />
                            Export CSV
                        </Button>
                    </>
                }
            />

            {statsLoading || stats ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Total activities" value={(stats?.activities?.total ?? 0).toLocaleString()} isLoading={statsLoading} />
                    <StatCard label="Today's activities" value={(stats?.activities?.by_period?.last_1_day ?? 0).toLocaleString()} isLoading={statsLoading} />
                    <StatCard label="Total users" value={(stats?.users?.total ?? 0).toLocaleString()} isLoading={statsLoading} />
                    <StatCard
                        label="Most active user"
                        value={mostActive?.user__email?.split('@')[0] ?? '-'}
                        hint={mostActive ? `${mostActive.activity_count ?? 0} activities` : undefined}
                        isLoading={statsLoading}
                    />
                </div>
            ) : null}

            <DataTable
                columns={columns}
                data={data?.rows ?? []}
                total={data?.count ?? 0}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                    setPageSize(next);
                    resetPage();
                }}
                sort={sort}
                onSortChange={(next) => {
                    setSort(next);
                    resetPage();
                }}
                search={search}
                onSearchChange={(value) => {
                    setSearch(value);
                    resetPage();
                }}
                searchPlaceholder="Search activities"
                isLoading={isLoading}
                error={error}
                onRetry={() => void mutate()}
                getRowId={(row) => String(row.id)}
                enableColumnVisibility={false}
                toolbar={
                    <>
                        <Select
                            value={activityType || 'all'}
                            onValueChange={(value) => {
                                setActivityType(value === 'all' ? '' : value);
                                resetPage();
                            }}
                        >
                            <SelectTrigger aria-label="Filter by activity type" className="w-full sm:w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All types</SelectItem>
                                {ACTIVITY_FILTER_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="audit-start" className="sr-only">
                                Start date
                            </Label>
                            <Input
                                id="audit-start"
                                type="date"
                                value={startDate}
                                max={endDate || undefined}
                                onChange={(event) => {
                                    setStartDate(event.target.value);
                                    resetPage();
                                }}
                                className="w-full sm:w-40"
                            />
                            <span className="text-sm text-muted-foreground">to</span>
                            <Label htmlFor="audit-end" className="sr-only">
                                End date
                            </Label>
                            <Input
                                id="audit-end"
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(event) => {
                                    setEndDate(event.target.value);
                                    resetPage();
                                }}
                                className="w-full sm:w-40"
                            />
                        </div>
                    </>
                }
                emptyState={
                    hasFilters ? (
                        <EmptyState icon={History} title="No activity matches your filters" description="Try a different search, type or date range." />
                    ) : (
                        <EmptyState icon={History} title="No activity recorded yet" description="User activity and system events will be listed here." />
                    )
                }
            />

            <Dialog open={Boolean(selected)} onOpenChange={(open) => (open ? undefined : setSelected(null))}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Activity details</DialogTitle>
                        <DialogDescription>{selected ? activityLabel(selected.activity_type) : ''}</DialogDescription>
                    </DialogHeader>
                    {selected ? (
                        <div className="space-y-4">
                            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <DetailRow label="User">
                                    <p>{userName(selected.user_details) || '-'}</p>
                                    <p className="break-all text-xs text-muted-foreground">{selected.user_details?.email}</p>
                                </DetailRow>
                                <DetailRow label="Activity type">{activityLabel(selected.activity_type)}</DetailRow>
                                <DetailRow label="Timestamp">{formatDate(selected.created_at)}</DetailRow>
                                <DetailRow label="Request">{selected.request?.title || '-'}</DetailRow>
                            </dl>
                            {selected.details ? (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground">Additional details</p>
                                    <pre className="max-h-64 overflow-auto rounded-lg border bg-muted p-3 text-xs text-foreground">{JSON.stringify(selected.details, null, 2)}</pre>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
