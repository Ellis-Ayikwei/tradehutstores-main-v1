import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Loader2, MessageSquare, Send } from 'lucide-react';

import { Badge, type BadgeProps } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { PageHeader } from '@/components/shadcn/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Textarea } from '@/components/shadcn/textarea';
import { toast } from '@/components/shadcn/sonner';
import { cn } from '@/lib/utils';
import axiosInstance from '@/services/axiosInstance';
import { setPageTitle } from '@/store/themeConfigSlice';
import { ErrorPanel } from '@/pages/seller/components/ErrorPanel';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface SupportTicket {
    id: string;
    subject: string;
    description: string;
    category: string;
    priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
    status: TicketStatus;
    contact_name?: string | null;
    contact_email?: string | null;
    created_at: string;
    updated_at: string;
}

interface SupportMessage {
    id: string;
    sender: string;
    message: string;
    created_at: string;
}

const STATUS_OPTIONS: { value: TicketStatus; label: string; badge: BadgeProps['variant'] }[] = [
    { value: 'open', label: 'Open', badge: 'warning' },
    { value: 'in_progress', label: 'In progress', badge: 'info' },
    { value: 'resolved', label: 'Resolved', badge: 'success' },
    { value: 'closed', label: 'Closed', badge: 'outline' },
];

const PRIORITY_BADGE: Record<string, BadgeProps['variant']> = {
    low: 'secondary',
    normal: 'info',
    medium: 'info',
    high: 'warning',
    urgent: 'destructive',
};

const replySchema = z.object({ message: z.string().trim().min(1, 'Write a reply first') });
type ReplyValues = z.infer<typeof replySchema>;

function humanize(value: string): string {
    const text = value.replace(/[_-]/g, ' ').trim();
    return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function formatDate(value?: string | null): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function errorMessage(error: unknown, fallback: string): string {
    const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    const message = (error as { message?: unknown })?.message;
    return typeof message === 'string' && message ? message : fallback;
}

const isStaffSender = (sender: string) => /admin|staff|support/i.test(sender);

function DetailSkeleton() {
    return (
        <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
    );
}

export default function SupportTicketDetail() {
    const { ticketId } = useParams<{ ticketId: string }>();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [newStatus, setNewStatus] = useState<TicketStatus | ''>('');
    const [updating, setUpdating] = useState(false);
    const [closeOpen, setCloseOpen] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Support ticket'));
    }, [dispatch]);

    const {
        data: ticket,
        error: ticketError,
        isLoading,
        mutate: mutateTicket,
    } = useSWR<SupportTicket>(ticketId ? `/support/tickets/${ticketId}/` : null, async (url: string) => (await axiosInstance.get(url)).data, { shouldRetryOnError: false, revalidateOnFocus: false });

    const { data: messages, error: messagesError, mutate: mutateMessages } = useSWR<SupportMessage[]>(
        ticketId ? `/support/tickets/${ticketId}/messages/` : null,
        async (url: string) => {
            const data = (await axiosInstance.get(url)).data;
            return (Array.isArray(data) ? data : data?.results ?? []) as SupportMessage[];
        },
        { refreshInterval: 15000, shouldRetryOnError: false }
    );

    useEffect(() => {
        if (ticket) setNewStatus(ticket.status);
    }, [ticket]);

    const form = useForm<ReplyValues>({ resolver: zodResolver(replySchema), defaultValues: { message: '' } });

    const sendReply = form.handleSubmit(async (values) => {
        if (!ticketId) return;
        try {
            await axiosInstance.post(`/support/tickets/${ticketId}/add_message/`, { message: values.message });
            form.reset({ message: '' });
            await mutateMessages();
            toast.success('Reply sent');
        } catch (error) {
            toast.error(errorMessage(error, 'Could not send the reply. Please try again.'));
        }
    });

    const updateStatus = async (status: TicketStatus) => {
        if (!ticketId) return;
        setUpdating(true);
        try {
            await axiosInstance.patch(`/support/tickets/${ticketId}/`, { status });
            await mutateTicket();
            toast.success('Ticket status updated');
        } catch (error) {
            toast.error(errorMessage(error, 'Could not update the ticket. Please try again.'));
        } finally {
            setUpdating(false);
        }
    };

    const backButton = (
        <Button type="button" variant="outline" onClick={() => navigate('/admin/support-tickets')}>
            <ArrowLeft aria-hidden="true" />
            Back to all tickets
        </Button>
    );

    if (isLoading) return <DetailSkeleton />;

    if (ticketError || !ticket) {
        return (
            <div className="space-y-4">
                {backButton}
                <ErrorPanel title="Could not load this ticket" message={ticket === undefined && !ticketError ? 'Ticket not found.' : errorMessage(ticketError, 'Ticket not found.')} onRetry={() => void mutateTicket()} />
            </div>
        );
    }

    const statusMeta = STATUS_OPTIONS.find((option) => option.value === ticket.status);
    const customerName = ticket.contact_name?.trim() || '';
    const customerEmail = ticket.contact_email?.trim() || '';

    return (
        <div className="space-y-4">
            <Link to="/admin/support-tickets" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to all tickets
            </Link>

            <PageHeader
                title={ticket.subject}
                description={`Ticket #${ticket.id} · Created ${formatDate(ticket.created_at)}`}
                className="pb-0"
                actions={
                    <>
                        <Badge variant={PRIORITY_BADGE[ticket.priority] ?? 'outline'}>{humanize(ticket.priority)} priority</Badge>
                        <Badge variant={statusMeta?.badge ?? 'outline'}>{statusMeta?.label ?? humanize(ticket.status)}</Badge>
                    </>
                }
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>Customer</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        {customerName || customerEmail ? (
                            <>
                                {customerName ? <p className="font-medium text-foreground">{customerName}</p> : null}
                                {customerEmail ? <p className="break-all text-muted-foreground">{customerEmail}</p> : null}
                            </>
                        ) : (
                            <p className="text-muted-foreground">No contact details on this ticket.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                        <p>
                            <span className="font-medium text-foreground">Category:</span> <span className="text-muted-foreground">{humanize(ticket.category)}</span>
                        </p>
                        <p>
                            <span className="font-medium text-foreground">Last updated:</span> <span className="text-muted-foreground">{formatDate(ticket.updated_at)}</span>
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>Update status</CardTitle>
                    </CardHeader>
                    <CardContent className="flex gap-2">
                        <Select value={newStatus} onValueChange={(value) => setNewStatus(value as TicketStatus)}>
                            <SelectTrigger aria-label="Ticket status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUS_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button type="button" disabled={!newStatus || newStatus === ticket.status || updating} onClick={() => newStatus && void updateStatus(newStatus)}>
                            {updating ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                            Update
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Original request</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="whitespace-pre-line text-sm text-foreground">{ticket.description}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Conversation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {messagesError ? (
                        <ErrorPanel title="Could not load the conversation" message={errorMessage(messagesError, 'Please try again.')} onRetry={() => void mutateMessages()} />
                    ) : messages === undefined ? (
                        <div className="space-y-3" aria-busy="true">
                            <Skeleton className="h-16 w-3/4" />
                            <Skeleton className="ml-auto h-16 w-3/4" />
                        </div>
                    ) : messages.length === 0 ? (
                        <EmptyState icon={MessageSquare} title="No replies yet" description="Replies on this ticket will appear here." />
                    ) : (
                        <ul className="space-y-3">
                            {messages.map((message) => {
                                const staff = isStaffSender(message.sender);
                                return (
                                    <li key={message.id} className={cn('flex', staff ? 'justify-end' : 'justify-start')}>
                                        <div className={cn('max-w-3xl rounded-lg border p-3', staff ? 'bg-primary-subtle text-primary-subtle-foreground' : 'bg-muted text-foreground')}>
                                            <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 text-xs">
                                                <span className="font-semibold">{humanize(message.sender)}</span>
                                                <span>{formatDate(message.created_at)}</span>
                                            </div>
                                            <p className="whitespace-pre-line text-sm">{message.message}</p>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <Form {...form}>
                        <form onSubmit={sendReply} noValidate className="space-y-3 border-t pt-4">
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reply to customer</FormLabel>
                                        <FormControl>
                                            <Textarea rows={4} placeholder="Type your reply here" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button type="button" variant="outline" disabled={ticket.status === 'closed' || updating} onClick={() => setCloseOpen(true)}>
                                    <CheckCircle2 aria-hidden="true" />
                                    Close ticket
                                </Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                                    Send reply
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Close ticket #{ticket.id}?</DialogTitle>
                        <DialogDescription>The ticket is marked as closed. You can reopen it later by changing its status.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setCloseOpen(false)}>
                            Keep open
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setCloseOpen(false);
                                void updateStatus('closed');
                            }}
                        >
                            Close ticket
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
