import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Eye, Info, LifeBuoy, MoreHorizontal, Plus, Reply, Trash2, UserCheck } from 'lucide-react';

import { Badge, type BadgeProps } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { DataTable } from '@/components/shadcn/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/shadcn/dropdown-menu';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { PageHeader } from '@/components/shadcn/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Textarea } from '@/components/shadcn/textarea';
import { toast } from '@/components/shadcn/sonner';
import { setPageTitle } from '@/store/themeConfigSlice';
import { useDispatch } from 'react-redux';

type TicketStatus = 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketCategory = 'general' | 'technical' | 'billing' | 'account' | 'order' | 'seller' | 'other';

interface SupportTicket {
    id: string;
    subject: string;
    description: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: TicketCategory;
    customerName: string;
    customerEmail: string;
    assignedTo: string;
    createdAt: string;
    updatedAt: string;
    lastResponseAt: string;
    lastResponseBy: 'customer' | 'support';
    responseCount: number;
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: TicketStatus; label: string; badge: BadgeProps['variant'] }[] = [
    { value: 'open', label: 'Open', badge: 'warning' },
    { value: 'in_progress', label: 'In progress', badge: 'info' },
    { value: 'waiting_customer', label: 'Waiting on customer', badge: 'secondary' },
    { value: 'resolved', label: 'Resolved', badge: 'success' },
    { value: 'closed', label: 'Closed', badge: 'outline' },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string; badge: BadgeProps['variant'] }[] = [
    { value: 'low', label: 'Low', badge: 'secondary' },
    { value: 'medium', label: 'Medium', badge: 'info' },
    { value: 'high', label: 'High', badge: 'warning' },
    { value: 'urgent', label: 'Urgent', badge: 'destructive' },
];

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
    { value: 'general', label: 'General' },
    { value: 'technical', label: 'Technical' },
    { value: 'billing', label: 'Billing' },
    { value: 'account', label: 'Account' },
    { value: 'order', label: 'Order' },
    { value: 'seller', label: 'Seller' },
    { value: 'other', label: 'Other' },
];

const statusMeta = (value: TicketStatus) => STATUS_OPTIONS.find((option) => option.value === value);
const priorityMeta = (value: TicketPriority) => PRIORITY_OPTIONS.find((option) => option.value === value);
const categoryLabel = (value: TicketCategory) => CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;

const ticketSchema = z.object({
    customerName: z.string().trim().min(1, 'Enter the customer name'),
    customerEmail: z.string().trim().email('Enter a valid email address'),
    category: z.enum(['general', 'technical', 'billing', 'account', 'order', 'seller', 'other']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    status: z.enum(['open', 'in_progress']),
    assignedTo: z.string().trim(),
    subject: z.string().trim().min(1, 'Enter a subject'),
    description: z.string().trim().min(1, 'Describe the issue'),
});
type TicketValues = z.infer<typeof ticketSchema>;

const TICKET_DEFAULTS: TicketValues = {
    customerName: '',
    customerEmail: '',
    category: 'general',
    priority: 'medium',
    status: 'open',
    assignedTo: '',
    subject: '',
    description: '',
};

const replySchema = z.object({ message: z.string().trim().min(1, 'Write a response') });
type ReplyValues = z.infer<typeof replySchema>;

const assignSchema = z.object({ assignee: z.string().trim() });
type AssignValues = z.infer<typeof assignSchema>;

function formatDate(value: string): string {
    if (!value) return 'Never';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function ticketAge(ticket: SupportTicket): string {
    if (ticket.status === 'resolved' || ticket.status === 'closed') return 'Completed';
    const hours = Math.floor(Math.abs(Date.now() - new Date(ticket.createdAt).getTime()) / 3_600_000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
}

function StatusBadge({ status }: { status: TicketStatus }) {
    const meta = statusMeta(status);
    return <Badge variant={meta?.badge ?? 'outline'}>{meta?.label ?? status}</Badge>;
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
    const meta = priorityMeta(priority);
    return <Badge variant={meta?.badge ?? 'outline'}>{meta?.label ?? priority}</Badge>;
}

function SelectInput<T extends string>({ value, onChange, options, label, className }: { value: T; onChange: (value: T) => void; options: { value: T; label: string }[]; label: string; className?: string }) {
    return (
        <Select value={value} onValueChange={(next) => onChange(next as T)}>
            <SelectTrigger aria-label={label} className={className}>
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function CreateTicketDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (values: TicketValues) => void }) {
    const form = useForm<TicketValues>({ resolver: zodResolver(ticketSchema), defaultValues: TICKET_DEFAULTS });

    useEffect(() => {
        if (!open) form.reset(TICKET_DEFAULTS);
    }, [open, form]);

    const submit = form.handleSubmit((values) => {
        onCreate(values);
        onOpenChange(false);
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Create support ticket</DialogTitle>
                    <DialogDescription>Log an issue raised by a customer.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={submit} noValidate className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormField
                                control={form.control}
                                name="customerName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Customer name</FormLabel>
                                        <FormControl>
                                            <Input {...field} autoComplete="off" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="customerEmail"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Customer email</FormLabel>
                                        <FormControl>
                                            <Input {...field} type="email" inputMode="email" autoComplete="off" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {CATEGORY_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {PRIORITY_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="open">Open</SelectItem>
                                                <SelectItem value="in_progress">In progress</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="assignedTo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assign to (optional)</FormLabel>
                                        <FormControl>
                                            <Input {...field} autoComplete="off" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea rows={5} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit">Create ticket</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function ReplyDialog({ ticket, onClose, onSend }: { ticket: SupportTicket | null; onClose: () => void; onSend: (ticketId: string) => void }) {
    const form = useForm<ReplyValues>({ resolver: zodResolver(replySchema), defaultValues: { message: '' } });

    useEffect(() => {
        if (!ticket) form.reset({ message: '' });
    }, [ticket, form]);

    const submit = form.handleSubmit(() => {
        if (!ticket) return;
        onSend(ticket.id);
        onClose();
    });

    return (
        <Dialog open={Boolean(ticket)} onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Reply to ticket {ticket?.id}</DialogTitle>
                    <DialogDescription>The ticket moves to Waiting on customer after you reply.</DialogDescription>
                </DialogHeader>
                {ticket ? (
                    <div className="space-y-1 rounded-lg border bg-muted p-3 text-sm">
                        <p className="font-semibold text-foreground">{ticket.subject}</p>
                        <p className="whitespace-pre-line text-muted-foreground">{ticket.description}</p>
                        <p className="pt-1 text-xs text-muted-foreground">
                            From {ticket.customerName} ({ticket.customerEmail}) on {formatDate(ticket.createdAt)}
                        </p>
                    </div>
                ) : null}
                <Form {...form}>
                    <form onSubmit={submit} noValidate className="space-y-4">
                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Response</FormLabel>
                                    <FormControl>
                                        <Textarea rows={6} placeholder="Write your response to the customer" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit">Send reply</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function AssignDialog({ ticket, onClose, onAssign }: { ticket: SupportTicket | null; onClose: () => void; onAssign: (ticketId: string, assignee: string) => void }) {
    const form = useForm<AssignValues>({ resolver: zodResolver(assignSchema), defaultValues: { assignee: '' } });

    useEffect(() => {
        form.reset({ assignee: ticket?.assignedTo ?? '' });
    }, [ticket, form]);

    const submit = form.handleSubmit((values) => {
        if (!ticket) return;
        onAssign(ticket.id, values.assignee);
        onClose();
    });

    return (
        <Dialog open={Boolean(ticket)} onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign ticket {ticket?.id}</DialogTitle>
                    <DialogDescription>Leave the name empty to unassign the ticket.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={submit} noValidate className="space-y-4">
                        <FormField
                            control={form.control}
                            name="assignee"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Assignee</FormLabel>
                                    <FormControl>
                                        <Input {...field} autoComplete="off" autoFocus />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button type="submit">Save</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteDialog({ ticket, onClose, onConfirm }: { ticket: SupportTicket | null; onClose: () => void; onConfirm: (ticketId: string) => void }) {
    return (
        <Dialog open={Boolean(ticket)} onOpenChange={(open) => (open ? undefined : onClose())}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Delete ticket {ticket?.id}?</DialogTitle>
                    <DialogDescription>This removes the ticket from the list. This cannot be undone.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Keep ticket
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                            if (ticket) onConfirm(ticket.id);
                            onClose();
                        }}
                    >
                        Delete ticket
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function SupportTickets() {
    const dispatch = useDispatch();
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
    const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
    const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
    const [page, setPage] = useState(1);
    const [createOpen, setCreateOpen] = useState(false);
    const [replyTicket, setReplyTicket] = useState<SupportTicket | null>(null);
    const [assignTicket, setAssignTicket] = useState<SupportTicket | null>(null);
    const [deleteTicket, setDeleteTicket] = useState<SupportTicket | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Support tickets'));
    }, [dispatch]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        return tickets.filter((ticket) => {
            if (term && ![ticket.subject, ticket.description, ticket.customerName, ticket.customerEmail].some((value) => value.toLowerCase().includes(term))) return false;
            if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
            if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
            if (categoryFilter !== 'all' && ticket.category !== categoryFilter) return false;
            return true;
        });
    }, [tickets, search, statusFilter, priorityFilter, categoryFilter]);

    const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(page, lastPage);
    const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const updateTicket = (ticketId: string, patch: Partial<SupportTicket>) => {
        const now = new Date().toISOString();
        setTickets((prev) => prev.map((ticket) => (ticket.id === ticketId ? { ...ticket, ...patch, updatedAt: now } : ticket)));
    };

    const createTicket = (values: TicketValues) => {
        const now = new Date().toISOString();
        const ticket: SupportTicket = {
            id: `T-${Date.now().toString(36).toUpperCase()}`,
            subject: values.subject,
            description: values.description,
            status: values.status,
            priority: values.priority,
            category: values.category,
            customerName: values.customerName,
            customerEmail: values.customerEmail,
            assignedTo: values.assignedTo,
            createdAt: now,
            updatedAt: now,
            lastResponseAt: now,
            lastResponseBy: 'customer',
            responseCount: 1,
        };
        setTickets((prev) => [ticket, ...prev]);
        toast.success(`Ticket ${ticket.id} created`);
    };

    const sendReply = (ticketId: string) => {
        const now = new Date().toISOString();
        setTickets((prev) =>
            prev.map((ticket) => (ticket.id === ticketId ? { ...ticket, status: 'waiting_customer', updatedAt: now, lastResponseAt: now, lastResponseBy: 'support', responseCount: ticket.responseCount + 1 } : ticket))
        );
        toast.success('Reply sent');
    };

    const columns = useMemo<ColumnDef<SupportTicket>[]>(
        () => [
            {
                id: 'ticket',
                header: 'Ticket',
                enableSorting: false,
                enableHiding: false,
                meta: { label: 'Ticket', cardTitle: true, className: 'max-w-[18rem]' },
                cell: ({ row }) => (
                    <div className="min-w-0 space-y-1">
                        <p className="flex items-center gap-1.5 font-semibold text-foreground">
                            {row.original.priority === 'high' || row.original.priority === 'urgent' ? <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-label="High priority" /> : null}
                            <span className="min-w-0 truncate">{row.original.subject}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{row.original.id}</p>
                        <PriorityBadge priority={row.original.priority} />
                    </div>
                ),
            },
            { id: 'status', header: 'Status', enableSorting: false, meta: { label: 'Status' }, cell: ({ row }) => <StatusBadge status={row.original.status} /> },
            { id: 'category', header: 'Category', enableSorting: false, meta: { label: 'Category' }, cell: ({ row }) => <span className="text-sm">{categoryLabel(row.original.category)}</span> },
            {
                id: 'customer',
                header: 'Customer',
                enableSorting: false,
                meta: { label: 'Customer', className: 'max-w-[14rem]' },
                cell: ({ row }) => (
                    <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{row.original.customerName}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.original.customerEmail}</p>
                    </div>
                ),
            },
            { id: 'assigned', header: 'Assigned to', enableSorting: false, meta: { label: 'Assigned to' }, cell: ({ row }) => <span className="text-sm">{row.original.assignedTo || 'Unassigned'}</span> },
            {
                id: 'lastResponse',
                header: 'Last response',
                enableSorting: false,
                meta: { label: 'Last response' },
                cell: ({ row }) => (
                    <div className="text-sm">
                        <p className="whitespace-nowrap text-foreground">{formatDate(row.original.lastResponseAt)}</p>
                        <p className="text-xs text-muted-foreground">
                            by {row.original.lastResponseBy === 'customer' ? 'Customer' : 'Support'} · {row.original.responseCount} response{row.original.responseCount === 1 ? '' : 's'}
                        </p>
                    </div>
                ),
            },
            { id: 'age', header: 'Age', enableSorting: false, meta: { label: 'Age' }, cell: ({ row }) => <span className="whitespace-nowrap text-sm">{ticketAge(row.original)}</span> },
            {
                id: 'actions',
                header: () => <span className="sr-only">Actions</span>,
                enableSorting: false,
                enableHiding: false,
                meta: { className: 'w-12 text-right' },
                cell: ({ row }) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="icon-sm" aria-label={`Actions for ticket ${row.original.id}`}>
                                <MoreHorizontal aria-hidden="true" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem asChild>
                                <Link to={`/admin/support-tickets/${row.original.id}`}>
                                    <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                                    View details
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setReplyTicket(row.original)}>
                                <Reply className="mr-2 h-4 w-4" aria-hidden="true" />
                                Reply
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setAssignTicket(row.original)}>
                                <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                                Assign
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuLabel>Change status</DropdownMenuLabel>
                            {STATUS_OPTIONS.filter((option) => option.value !== row.original.status).map((option) => (
                                <DropdownMenuItem key={option.value} onSelect={() => updateTicket(row.original.id, { status: option.value })}>
                                    Mark as {option.label.toLowerCase()}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => setDeleteTicket(row.original)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                Delete ticket
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
            },
        ],
        []
    );

    const hasFilters = Boolean(search.trim()) || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all';

    return (
        <div className="space-y-3">
            <PageHeader
                title="Support tickets"
                description="Track and answer customer issues."
                className="pb-0"
                actions={
                    <Button type="button" onClick={() => setCreateOpen(true)}>
                        <Plus aria-hidden="true" />
                        Create ticket
                    </Button>
                }
            />

            <div role="note" className="flex items-start gap-2.5 rounded-lg border border-info-subtle bg-info-subtle p-3 text-sm text-info-subtle-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>Tickets on this page are not connected to the support API yet. Tickets you create here live in this browser session only.</p>
            </div>

            <DataTable
                columns={columns}
                data={pageRows}
                total={filtered.length}
                page={currentPage}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                search={search}
                onSearchChange={(value) => {
                    setSearch(value);
                    setPage(1);
                }}
                searchPlaceholder="Search subject, description or customer"
                getRowId={(row) => row.id}
                enableColumnVisibility={false}
                toolbar={
                    <>
                        <SelectInput
                            label="Filter by status"
                            value={statusFilter}
                            onChange={(value) => {
                                setStatusFilter(value);
                                setPage(1);
                            }}
                            options={[{ value: 'all', label: 'All statuses' }, ...STATUS_OPTIONS.map(({ value, label }) => ({ value, label }))]}
                            className="w-full sm:w-44"
                        />
                        <SelectInput
                            label="Filter by priority"
                            value={priorityFilter}
                            onChange={(value) => {
                                setPriorityFilter(value);
                                setPage(1);
                            }}
                            options={[{ value: 'all', label: 'All priorities' }, ...PRIORITY_OPTIONS.map(({ value, label }) => ({ value, label }))]}
                            className="w-full sm:w-40"
                        />
                        <SelectInput
                            label="Filter by category"
                            value={categoryFilter}
                            onChange={(value) => {
                                setCategoryFilter(value);
                                setPage(1);
                            }}
                            options={[{ value: 'all', label: 'All categories' }, ...CATEGORY_OPTIONS]}
                            className="w-full sm:w-40"
                        />
                    </>
                }
                emptyState={
                    hasFilters ? (
                        <EmptyState icon={LifeBuoy} title="No tickets match your filters" description="Try a different search or clear your filters." />
                    ) : (
                        <EmptyState
                            icon={LifeBuoy}
                            title="No tickets yet"
                            description="Tickets you create will be listed here."
                            action={
                                <Button type="button" onClick={() => setCreateOpen(true)}>
                                    <Plus aria-hidden="true" />
                                    Create ticket
                                </Button>
                            }
                        />
                    )
                }
            />

            <CreateTicketDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={createTicket} />
            <ReplyDialog ticket={replyTicket} onClose={() => setReplyTicket(null)} onSend={sendReply} />
            <AssignDialog ticket={assignTicket} onClose={() => setAssignTicket(null)} onAssign={(ticketId, assignee) => updateTicket(ticketId, { assignedTo: assignee })} />
            <DeleteDialog
                ticket={deleteTicket}
                onClose={() => setDeleteTicket(null)}
                onConfirm={(ticketId) => {
                    setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
                    toast.success('Ticket deleted');
                }}
            />
        </div>
    );
}
