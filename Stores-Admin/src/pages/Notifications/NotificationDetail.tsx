import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useSWR from 'swr';
import { AlertCircle, ArrowLeft, ExternalLink, Trash2 } from 'lucide-react';

import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Skeleton } from '@/components/shadcn/skeleton';
import { toast } from '@/components/shadcn/sonner';
import { deleteNotification, fetchNotification, isInternalLink, markNotificationRead, notificationErrorMessage } from '@/services/notificationService';
import { ConfirmDeleteDialog, NOTIFICATION_KEY, formatAbsolute, kindIcon, useRefreshNotifications } from './notificationUi';

const NotificationDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const refresh = useRefreshNotifications();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const markedFor = useRef<string | null>(null);

    const { data: notification, error, isLoading, mutate } = useSWR(id ? [NOTIFICATION_KEY, 'detail', id] : null, () => fetchNotification(id as string));

    // Opening the detail marks it read once per id.
    useEffect(() => {
        if (!id || !notification || notification.is_read || markedFor.current === id) return;
        markedFor.current = id;
        markNotificationRead(id)
            .then((updated) => {
                void mutate(updated, { revalidate: false });
                void refresh();
            })
            .catch(() => {
                markedFor.current = null;
            });
    }, [id, notification, mutate, refresh]);

    const confirmDelete = async () => {
        if (!id) return;
        setDeleting(true);
        try {
            await deleteNotification(id);
            void refresh();
            toast.success('Notification deleted');
            navigate('/notifications', { replace: true });
        } catch (err) {
            toast.error(notificationErrorMessage(err, 'Could not delete the notification.'));
            setDeleting(false);
        }
    };

    const Icon = notification ? kindIcon(notification.kind) : null;

    return (
        <div className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6">
            <Button variant="ghost" asChild>
                <Link to="/notifications">
                    <ArrowLeft className="h-4 w-4" />
                    All notifications
                </Link>
            </Button>

            {isLoading ? (
                <div className="space-y-3" aria-busy="true">
                    <Skeleton className="h-8 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : error || !notification ? (
                <EmptyState
                    icon={AlertCircle}
                    title="Could not load this notification"
                    description={notificationErrorMessage(error, 'Check your connection and try again.')}
                    action={
                        <Button variant="outline" onClick={() => mutate()}>
                            Retry
                        </Button>
                    }
                />
            ) : (
                <Card>
                    <CardContent className="space-y-4 p-4 sm:p-6">
                        <div className="flex items-start gap-3">
                            {Icon ? (
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </span>
                            ) : null}
                            <div className="min-w-0 flex-1 space-y-1">
                                <h1 className="break-words text-lg font-semibold text-foreground sm:text-xl">{notification.title}</h1>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="secondary">{notification.kind}</Badge>
                                    <span>{formatAbsolute(notification.created_at)}</span>
                                </div>
                            </div>
                        </div>

                        {notification.body ? <p className="whitespace-pre-wrap break-words text-sm text-foreground">{notification.body}</p> : null}

                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                            {isInternalLink(notification.link) ? (
                                <Button asChild>
                                    <Link to={notification.link}>
                                        <ExternalLink className="h-4 w-4" />
                                        Open
                                    </Link>
                                </Button>
                            ) : null}
                        </div>
                    </CardContent>
                </Card>
            )}

            <ConfirmDeleteDialog open={confirmOpen} busy={deleting} onOpenChange={setConfirmOpen} onConfirm={confirmDelete} />
        </div>
    );
};

export default NotificationDetail;
