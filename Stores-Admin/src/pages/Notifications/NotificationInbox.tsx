import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { AlertCircle, Bell, CheckCheck, ChevronLeft, ChevronRight, Check, Trash2 } from 'lucide-react';

import { Button } from '@/components/shadcn/button';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { Skeleton } from '@/components/shadcn/skeleton';
import { toast } from '@/components/shadcn/sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { cn } from '@/lib/utils';
import {
    deleteNotification,
    fetchNotifications,
    isInternalLink,
    markAllNotificationsRead,
    markNotificationRead,
    notificationErrorMessage,
    type Notification,
} from '@/services/notificationService';
import { ConfirmDeleteDialog, NOTIFICATION_KEY, formatAbsolute, formatRelative, kindIcon, useRefreshNotifications, useUnreadCount } from './notificationUi';

const PAGE_SIZE = 20;
type Filter = 'all' | 'unread';

/** The staff member's own inbox. Used by /notifications and /admin/notifications. */
export default function NotificationInbox() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<Filter>('all');
    const [page, setPage] = useState(1);
    const [pendingDelete, setPendingDelete] = useState<Notification | null>(null);
    const [busy, setBusy] = useState(false);
    const [markingAll, setMarkingAll] = useState(false);
    const refresh = useRefreshNotifications();
    const { data: unreadCount = 0 } = useUnreadCount();

    const { data, error, isLoading, mutate } = useSWR(
        [NOTIFICATION_KEY, 'list', filter, page],
        () => fetchNotifications({ page, page_size: PAGE_SIZE, unread: filter === 'unread' }),
        { keepPreviousData: true }
    );

    const results = data?.results ?? [];
    const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

    // Deleting or reading the last row of a later page leaves it empty: step back.
    useEffect(() => {
        if (data && data.results.length === 0 && page > 1) setPage(page - 1);
    }, [data, page]);

    const changeFilter = (next: Filter) => {
        setFilter(next);
        setPage(1);
    };

    const openRow = async (n: Notification) => {
        const target = isInternalLink(n.link) ? n.link : `/notifications/${n.id}`;
        if (!n.is_read) {
            try {
                await markNotificationRead(n.id);
                void refresh();
            } catch (err) {
                toast.error(notificationErrorMessage(err, 'Could not mark as read.'));
            }
        }
        navigate(target);
    };

    const markOneRead = async (n: Notification) => {
        try {
            await markNotificationRead(n.id);
            await refresh();
        } catch (err) {
            toast.error(notificationErrorMessage(err, 'Could not mark as read.'));
        }
    };

    const markAllRead = async () => {
        setMarkingAll(true);
        try {
            const updated = await markAllNotificationsRead();
            toast.success(updated === 1 ? '1 notification marked as read' : `${updated} notifications marked as read`);
            await refresh();
        } catch (err) {
            toast.error(notificationErrorMessage(err, 'Could not mark all as read.'));
        } finally {
            setMarkingAll(false);
        }
    };

    const confirmDelete = async () => {
        if (!pendingDelete) return;
        setBusy(true);
        try {
            await deleteNotification(pendingDelete.id);
            setPendingDelete(null);
            await refresh();
            toast.success('Notification deleted');
        } catch (err) {
            toast.error(notificationErrorMessage(err, 'Could not delete the notification.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mx-auto w-full max-w-3xl space-y-4 p-4 sm:p-6">
            <PageHeader
                title="Notifications"
                description={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
                actions={
                    <Button variant="outline" onClick={markAllRead} disabled={markingAll || unreadCount === 0}>
                        <CheckCheck className="h-4 w-4" />
                        Mark all as read
                    </Button>
                }
            />

            <Tabs value={filter} onValueChange={(v) => changeFilter(v as Filter)}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="unread">Unread</TabsTrigger>
                </TabsList>
            </Tabs>

            {isLoading && !data ? (
                <div className="space-y-2" aria-busy="true">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                    ))}
                </div>
            ) : error && !data ? (
                <EmptyState
                    icon={AlertCircle}
                    title="Could not load notifications"
                    description={notificationErrorMessage(error, 'Check your connection and try again.')}
                    action={
                        <Button variant="outline" onClick={() => mutate()}>
                            Retry
                        </Button>
                    }
                />
            ) : results.length === 0 ? (
                <EmptyState icon={Bell} title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'} description="New activity will appear here." />
            ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                    {results.map((n) => {
                        const Icon = kindIcon(n.kind);
                        return (
                            <li key={n.id} className={cn('flex items-stretch', n.is_read ? 'bg-card' : 'bg-primary-subtle')}>
                                <button
                                    type="button"
                                    onClick={() => openRow(n)}
                                    className="flex min-w-0 flex-1 gap-3 p-3 text-left outline-none hover:bg-muted focus-visible:bg-muted sm:p-4"
                                >
                                    <span
                                        className={cn(
                                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                                            n.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
                                        )}
                                    >
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className={cn('block text-sm text-foreground', !n.is_read && 'font-semibold')}>{n.title}</span>
                                        {n.body ? <span className="mt-0.5 block line-clamp-2 text-sm text-muted-foreground">{n.body}</span> : null}
                                        <span className="mt-1 block text-xs text-muted-foreground" title={formatAbsolute(n.created_at)}>
                                            {formatRelative(n.created_at)}
                                        </span>
                                    </span>
                                    {!n.is_read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
                                </button>
                                <div className="flex shrink-0 flex-col justify-center gap-1 pr-2 sm:flex-row sm:items-center">
                                    {!n.is_read ? (
                                        <Button variant="ghost" size="icon" onClick={() => markOneRead(n)} aria-label="Mark as read" title="Mark as read">
                                            <Check className="h-4 w-4" />
                                        </Button>
                                    ) : null}
                                    <Button variant="ghost" size="icon" onClick={() => setPendingDelete(n)} aria-label="Delete notification" title="Delete">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            {data && data.count > PAGE_SIZE ? (
                <div className="flex items-center justify-between gap-2">
                    <Button variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!data.next}>
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            ) : null}

            <ConfirmDeleteDialog open={pendingDelete !== null} busy={busy} onOpenChange={(open) => !open && setPendingDelete(null)} onConfirm={confirmDelete} />
        </div>
    );
}
