import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR, { useSWRConfig } from 'swr';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { Ban, CheckCircle2, Eye, Loader2, Plus, RefreshCw, Trash2, UserRound, Users } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';
import { Badge, type BadgeProps } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { DataTable, type DataTableSort } from '@/components/shadcn/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { PageHeader } from '@/components/shadcn/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { StatCard } from '@/components/shadcn/stat-card';
import { Textarea } from '@/components/shadcn/textarea';
import { toast } from '@/components/shadcn/sonner';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import axiosInstance from '@/services/axiosInstance';
import { setPageTitle } from '@/store/themeConfigSlice';

type AccountStatus = 'active' | 'pending' | 'suspended' | 'inactive';

interface Customer {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    account_status: AccountStatus;
    profile_picture?: string;
    date_joined: string;
    last_active: string;
    total_orders: number;
    total_spent: number;
    average_order_value: number;
}

interface CustomerQuery {
    page: number;
    pageSize: number;
    search: string;
    status: AccountStatus | 'all';
    sort: DataTableSort | null;
}

interface CustomerPage {
    rows: Customer[];
    count: number;
}

const CUSTOMERS_KEY = 'customers';
const PAGE_SIZE_DEFAULT = 25;
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false, keepPreviousData: true } as const;

const STATUS_OPTIONS: { value: AccountStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All customers' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'inactive', label: 'Inactive' },
];

const STATUS_BADGE: Record<AccountStatus, BadgeProps['variant']> = {
    active: 'success',
    pending: 'warning',
    suspended: 'destructive',
    inactive: 'secondary',
};

const suspendSchema = z.object({ reason: z.string().trim() });
type SuspendValues = z.infer<typeof suspendSchema>;

function fullName(customer: Customer): string {
    return `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim();
}

function formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function apiErrorMessage(error: unknown, fallback: string): string {
    const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    return fallback;
}

/**
 * Sends paging, search, status and ordering to the API. If the endpoint answers with a bare array
 * (no server-side paging), the same filters are applied locally so the table still behaves.
 */
async function fetchCustomers(query: CustomerQuery): Promise<CustomerPage> {
    const params: Record<string, string | number> = { page: query.page, page_size: query.pageSize };
    if (query.search) params.search = query.search;
    if (query.status !== 'all') params.account_status = query.status;
    if (query.sort) params.ordering = `${query.sort.desc ? '-' : ''}${query.sort.id}`;

    const response = await axiosInstance.get('/customers/', { params });
    const data = response.data;

    if (!Array.isArray(data)) {
        const rows: Customer[] = data?.results ?? data?.data ?? [];
        return { rows, count: typeof data?.count === 'number' ? data.count : rows.length };
    }

    let rows = data as Customer[];
    const term = query.search.toLowerCase();
    if (term) rows = rows.filter((c) => [c.first_name, c.last_name, c.email, c.phone_number].some((value) => (value ?? '').toLowerCase().includes(term)));
    if (query.status !== 'all') rows = rows.filter((c) => c.account_status === query.status);
    if (query.sort) {
        const { id, desc } = query.sort;
        const key = id as keyof Customer;
        rows = [...rows].sort((a, b) => {
            const left = a[key] ?? '';
            const right = b[key] ?? '';
            const order = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right));
            return desc ? -order : order;
        });
    }
    const start = (query.page - 1) * query.pageSize;
    return { rows: rows.slice(start, start + query.pageSize), count: rows.length };
}

function CustomerCell({ customer }: { customer: Customer }) {
    const name = fullName(customer);
    return (
        <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-9 w-9">
                {customer.profile_picture ? <AvatarImage src={customer.profile_picture} alt={name || 'Customer'} /> : null}
                <AvatarFallback>
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{name || '-'}</p>
                <p className="truncate text-xs text-muted-foreground">{customer.email || '-'}</p>
            </div>
        </div>
    );
}

function SuspendDialog({ customer, onClose, onDone }: { customer: Customer | null; onClose: () => void; onDone: () => void }) {
    const form = useForm<SuspendValues>({ resolver: zodResolver(suspendSchema), defaultValues: { reason: '' } });
    const { isSubmitting } = form.formState;
    const activating = customer?.account_status === 'suspended';

    useEffect(() => {
        form.reset({ reason: '' });
    }, [customer, form]);

    const submit = form.handleSubmit(async (values) => {
        if (!customer) return;
        try {
            await axiosInstance.patch(`/customers/${customer.id}/`, {
                account_status: activating ? 'active' : 'suspended',
                suspension_reason: values.reason,
            });
            toast.success(activating ? 'Customer activated' : 'Customer suspended');
            onDone();
            onClose();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to update customer status. Please try again.'));
        }
    });

    return (
        <Dialog open={Boolean(customer)} onOpenChange={(open) => (open || isSubmitting ? undefined : onClose())}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{activating ? 'Activate customer?' : 'Suspend customer?'}</DialogTitle>
                    <DialogDescription>
                        {activating ? `${customer ? fullName(customer) : ''} will be able to use their account again.` : `${customer ? fullName(customer) : ''} will no longer be able to use their account.`}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={submit} noValidate className="space-y-4">
                        {activating ? null : (
                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Suspension reason</FormLabel>
                                        <FormControl>
                                            <Textarea rows={3} placeholder="Enter the reason for suspension" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" variant={activating ? 'default' : 'destructive'} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                                {activating ? 'Activate' : 'Suspend'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteDialog({ customer, onClose, onDone }: { customer: Customer | null; onClose: () => void; onDone: () => void }) {
    const [deleting, setDeleting] = useState(false);

    const confirm = async () => {
        if (!customer) return;
        setDeleting(true);
        try {
            await axiosInstance.delete(`/customers/${customer.id}/`);
            toast.success('Customer deleted');
            onDone();
            onClose();
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to delete customer. Please try again.'));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={Boolean(customer)} onOpenChange={(open) => (open || deleting ? undefined : onClose())}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete customer?</DialogTitle>
                    <DialogDescription>
                        {customer ? fullName(customer) || customer.email : ''} and all their customer data will be removed. This cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose} disabled={deleting}>
                        Keep customer
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => void confirm()} disabled={deleting}>
                        {deleting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                        Delete customer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function CustomerManagement() {
    const dispatch = useDispatch();
    const { mutate: globalMutate } = useSWRConfig();
    const { formatDisplayPrice } = useCurrency();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<AccountStatus | 'all'>('all');
    const [sort, setSort] = useState<DataTableSort | null>(null);
    const [suspendTarget, setSuspendTarget] = useState<Customer | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Customers'));
    }, [dispatch]);

    const query: CustomerQuery = { page, pageSize, search, status, sort };
    const { data, error, isLoading, isValidating, mutate } = useSWR<CustomerPage>([CUSTOMERS_KEY, 'list', page, pageSize, search, status, sort?.id ?? '', sort?.desc ?? false], () => fetchCustomers(query), SWR_OPTIONS);

    const { data: allCount, isLoading: allLoading } = useSWR<CustomerPage>([CUSTOMERS_KEY, 'count', 'all'], () => fetchCustomers({ page: 1, pageSize: 1, search: '', status: 'all', sort: null }), SWR_OPTIONS);
    const { data: activeCount, isLoading: activeLoading } = useSWR<CustomerPage>([CUSTOMERS_KEY, 'count', 'active'], () => fetchCustomers({ page: 1, pageSize: 1, search: '', status: 'active', sort: null }), SWR_OPTIONS);

    const refreshAll = useCallback(() => globalMutate((key) => Array.isArray(key) && key[0] === CUSTOMERS_KEY), [globalMutate]);

    const columns = useMemo<ColumnDef<Customer>[]>(
        () => [
            { accessorKey: 'first_name', header: 'Customer', enableHiding: false, meta: { label: 'Customer', cardTitle: true, className: 'max-w-[18rem]' }, cell: ({ row }) => <CustomerCell customer={row.original} /> },
            { accessorKey: 'phone_number', header: 'Phone', meta: { label: 'Phone' }, cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.phone_number || '-'}</span> },
            { accessorKey: 'total_orders', header: 'Orders', meta: { label: 'Orders' }, cell: ({ row }) => <span className="font-semibold text-foreground">{row.original.total_orders ?? 0}</span> },
            { accessorKey: 'total_spent', header: 'Total spent', meta: { label: 'Total spent' }, cell: ({ row }) => <span className="whitespace-nowrap font-semibold text-foreground">{formatDisplayPrice(row.original.total_spent || 0)}</span> },
            { accessorKey: 'average_order_value', header: 'Avg. order', meta: { label: 'Avg. order' }, cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDisplayPrice(row.original.average_order_value || 0)}</span> },
            {
                accessorKey: 'account_status',
                header: 'Status',
                meta: { label: 'Status' },
                cell: ({ row }) => {
                    const value = row.original.account_status || 'inactive';
                    return <Badge variant={STATUS_BADGE[value] ?? 'secondary'}>{value.charAt(0).toUpperCase() + value.slice(1)}</Badge>;
                },
            },
            { accessorKey: 'date_joined', header: 'Joined', meta: { label: 'Joined' }, cell: ({ row }) => <span className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(row.original.date_joined) || '-'}</span> },
            {
                id: 'actions',
                header: () => <span className="sr-only">Actions</span>,
                enableSorting: false,
                enableHiding: false,
                meta: { className: 'w-32' },
                cell: ({ row }) => {
                    const customer = row.original;
                    const suspended = customer.account_status === 'suspended';
                    const name = fullName(customer) || customer.email;
                    return (
                        <div className="flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                            <Button asChild variant="outline" size="icon-sm">
                                <Link to={`/admin/customers/${customer.id}`} aria-label={`View ${name}`} title="View details">
                                    <Eye aria-hidden="true" />
                                </Link>
                            </Button>
                            <Button type="button" variant="outline" size="icon-sm" aria-label={`${suspended ? 'Activate' : 'Suspend'} ${name}`} title={suspended ? 'Activate' : 'Suspend'} onClick={() => setSuspendTarget(customer)}>
                                {suspended ? <CheckCircle2 aria-hidden="true" /> : <Ban aria-hidden="true" />}
                            </Button>
                            <Button type="button" variant="destructive" size="icon-sm" aria-label={`Delete ${name}`} title="Delete customer" onClick={() => setDeleteTarget(customer)}>
                                <Trash2 aria-hidden="true" />
                            </Button>
                        </div>
                    );
                },
            },
        ],
        [formatDisplayPrice]
    );

    const hasFilters = Boolean(search) || status !== 'all';

    return (
        <div className="space-y-4">
            <PageHeader
                title="Customers"
                description="Manage customer accounts and relationships."
                className="pb-0"
                actions={
                    <>
                        <Button type="button" variant="outline" onClick={() => void refreshAll()} disabled={isValidating}>
                            <RefreshCw className={cn(isValidating && 'animate-spin')} aria-hidden="true" />
                            Refresh
                        </Button>
                        <Button asChild>
                            <Link to="/admin/customers/new">
                                <Plus aria-hidden="true" />
                                Add customer
                            </Link>
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatCard label="Total customers" value={(allCount?.count ?? 0).toLocaleString()} icon={Users} isLoading={allLoading} />
                <StatCard label="Active customers" value={(activeCount?.count ?? 0).toLocaleString()} isLoading={activeLoading} />
            </div>

            <DataTable
                columns={columns}
                data={data?.rows ?? []}
                total={data?.count ?? 0}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(next) => {
                    setPageSize(next);
                    setPage(1);
                }}
                sort={sort}
                onSortChange={(next) => {
                    setSort(next);
                    setPage(1);
                }}
                search={search}
                onSearchChange={(value) => {
                    setSearch(value);
                    setPage(1);
                }}
                searchPlaceholder="Search name, email or phone"
                isLoading={isLoading}
                error={error}
                onRetry={() => void mutate()}
                getRowId={(row) => String(row.id)}
                toolbar={
                    <Select
                        value={status}
                        onValueChange={(value) => {
                            setStatus(value as AccountStatus | 'all');
                            setPage(1);
                        }}
                    >
                        <SelectTrigger aria-label="Filter by status" className="w-full sm:w-44">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
                emptyState={
                    hasFilters ? (
                        <EmptyState icon={Users} title="No customers match your filters" description="Try a different search or clear your filters." />
                    ) : (
                        <EmptyState icon={Users} title="No customers yet" description="Customer accounts will appear here once they register." />
                    )
                }
            />

            <SuspendDialog customer={suspendTarget} onClose={() => setSuspendTarget(null)} onDone={() => void refreshAll()} />
            <DeleteDialog customer={deleteTarget} onClose={() => setDeleteTarget(null)} onDone={() => void refreshAll()} />
        </div>
    );
}
