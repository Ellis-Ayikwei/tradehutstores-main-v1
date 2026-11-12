import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { AlertCircle, Bell, CheckCheck } from 'lucide-react';

import { Button } from '@/components/shadcn/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/shadcn/dropdown-menu';
import { Skeleton } from '@/components/shadcn/skeleton';
import { toast } from '@/components/shadcn/sonner';
import { cn } from '@/lib/utils';
import { fetchNotifications, isInternalLink, markAllNotificationsRead, markNotificationRead, notificationErrorMessage, type Notification } from '@/services/notificationService';
import { NOTIFICATION_KEY, formatRelative, kindIcon, useRefreshNotifications, useUnreadCount } from './notificationUi';

interface NotificationBellProps {
    className?: string;
}

const LATEST = 5;

const NotificationBell = ({ className }: NotificationBellProps) => {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const refresh = useRefreshNotifications();
    const { data: unreadCount = 0 } = useUnreadCount();

    // The latest list is only fetched while the menu is open.
    const { data, error, isLoading, mutate } = useSWR(open ? [NOTIFICATION_KEY, 'latest'] : null, () => fetchNotifications({ page_size: LATEST }));
    const items = data?.results ?? [];

    const openItem = async (n: Notification) => {
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

    const markAll = async () => {
        try {
            await markAllNotificationsRead();
            await refresh();
        } catch (err) {
            toast.error(notificationErrorMessage(err, 'Could not mark all as read.'));
        }
    };

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={cn('relative', className)} aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}>
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-sm p-0 sm:w-96">
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                    <p className="text-sm font-semibold text-foreground">Notifications</p>
                    <Button variant="ghost" size="sm" onClick={markAll} disabled={unreadCount === 0}>
                        <CheckCheck className="h-4 w-4" />
                        Mark all read
                    </Button>
                </div>
                <DropdownMenuSeparator className="my-0" />

                <div className="max-h-[60vh] overflow-y-auto p-1">
                    {isLoading ? (
                        <div className="space-y-2 p-2" aria-busy="true">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                            <AlertCircle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                            <p className="text-sm text-muted-foreground">Could not load notifications.</p>
                            <Button variant="outline" size="sm" onClick={() => mutate()}>
                                Retry
                            </Button>
                        </div>
                    ) : items.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
                    ) : (
                        items.map((n) => {
                            const Icon = kindIcon(n.kind);
                            return (
                                <DropdownMenuItem key={n.id} onSelect={() => openItem(n)} className={cn('items-start gap-3 py-2.5', !n.is_read && 'bg-primary-subtle')}>
                                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', n.is_read ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground')}>
                                        <Icon className="h-4 w-4" aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className={cn('block truncate text-sm text-foreground', !n.is_read && 'font-semibold')}>{n.title}</span>
                                        {n.body ? <span className="block line-clamp-2 text-xs text-muted-foreground">{n.body}</span> : null}
                                        <span className="mt-0.5 block text-xs text-muted-foreground">{formatRelative(n.created_at)}</span>
                                    </span>
                                </DropdownMenuItem>
                            );
                        })
                    )}
                </div>

                <DropdownMenuSeparator className="my-0" />
                <div className="p-1">
                    <DropdownMenuItem onSelect={() => navigate('/notifications')} className="justify-center font-medium">
                        View all notifications
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default NotificationBell;
