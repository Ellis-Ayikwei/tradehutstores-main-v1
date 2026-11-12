import { useCallback } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Bell, Gavel, Package, Tag, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { fetchUnreadCount } from '@/services/notificationService';

/** SWR key prefix shared by every notification list/detail cache entry. */
export const NOTIFICATION_KEY = 'notifications';
export const UNREAD_COUNT_KEY = 'notifications/unread_count';
export const UNREAD_POLL_MS = 60_000;

/**
 * Unread badge count. SWR pauses interval polling while the tab is hidden
 * (`refreshWhenHidden` is false) and revalidates when it becomes visible again.
 */
export function useUnreadCount() {
    return useSWR<number>(UNREAD_COUNT_KEY, fetchUnreadCount, {
        refreshInterval: UNREAD_POLL_MS,
        refreshWhenHidden: false,
        revalidateOnFocus: true,
    });
}

/** Revalidates the unread badge plus every cached list and detail entry. */
export function useRefreshNotifications() {
    const { mutate } = useSWRConfig();
    return useCallback(
        () =>
            mutate((key) => key === UNREAD_COUNT_KEY || (Array.isArray(key) && key[0] === NOTIFICATION_KEY)),
        [mutate]
    );
}

export function kindIcon(kind: string): LucideIcon {
    if (kind.startsWith('auction')) return Gavel;
    if (kind.startsWith('order')) return Package;
    if (kind.startsWith('catalog')) return Tag;
    return Bell;
}

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
];

export function formatRelative(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const seconds = Math.round((then - Date.now()) / 1000);
    for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size) return rtf.format(Math.trunc(seconds / size), unit);
    }
    return 'just now';
}

export function formatAbsolute(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

interface ConfirmDeleteDialogProps {
    open: boolean;
    busy: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function ConfirmDeleteDialog({ open, busy, onOpenChange, onConfirm }: ConfirmDeleteDialogProps) {
    return (
        <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete this notification?</DialogTitle>
                    <DialogDescription>It will be removed from your inbox. This cannot be undone.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} disabled={busy}>
                        {busy ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
