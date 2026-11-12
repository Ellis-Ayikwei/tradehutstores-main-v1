/**
 * Per-user in-app inbox. Built against the frozen contract in `.claude/plans/25-notifications.md`
 * (all IsAuthenticated, every queryset scoped to the caller):
 *   GET    notifications/?page=&page_size=&unread=true&kind=<prefix>   paginated
 *   GET    notifications/unread_count/                                 {count}
 *   GET    notifications/<id>/
 *   POST   notifications/<id>/read/                                    idempotent, returns the Notification
 *   POST   notifications/read-all/                                     {updated}
 *   DELETE notifications/<id>/                                         204
 * Errors are DRF defaults (401 unauthenticated, 404 not found).
 */
import axios from 'axios';
import axiosInstance from './axiosInstance';

export interface Notification {
    id: string | number;
    /** Free-form slug, e.g. `auction.outbid`, `order.shipped`. */
    kind: string;
    title: string;
    body: string;
    /** Admin-relative path only; empty when there is nowhere to go. */
    link: string;
    data: Record<string, unknown>;
    is_read: boolean;
    /** ISO 8601 or null. */
    read_at: string | null;
    /** ISO 8601. */
    created_at: string;
}

export interface Paginated<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}

export interface NotificationListParams {
    page?: number;
    page_size?: number;
    unread?: boolean;
    kind?: string;
}

export const notificationApi = {
    list: 'notifications/',
    unreadCount: 'notifications/unread_count/',
    readAll: 'notifications/read-all/',
    detail: (id: string | number) => `notifications/${id}/`,
    read: (id: string | number) => `notifications/${id}/read/`,
};

/** Plain message from a DRF error body or a network failure. */
export function notificationErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (axios.isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail;
        if (typeof detail === 'string' && detail) return detail;
        if (err.response?.status === 404) return 'This notification no longer exists.';
        if (err.response?.status === 401) return 'Your session has expired. Please sign in again.';
    }
    return fallback;
}

/** True when `link` is an in-app path (starts with a single `/`, no scheme). */
export const isInternalLink = (link: string | null | undefined): link is string => !!link && link.startsWith('/') && !link.startsWith('//');

export const fetchNotifications = async (params: NotificationListParams = {}): Promise<Paginated<Notification>> => {
    const query: Record<string, string | number> = {};
    if (params.page) query.page = params.page;
    if (params.page_size) query.page_size = params.page_size;
    if (params.unread) query.unread = 'true';
    if (params.kind) query.kind = params.kind;
    const res = await axiosInstance.get<Paginated<Notification>>(notificationApi.list, { params: query });
    return res.data;
};

export const fetchUnreadCount = async (): Promise<number> => {
    const res = await axiosInstance.get<{ count: number }>(notificationApi.unreadCount);
    return res.data.count;
};

export const fetchNotification = async (id: string | number): Promise<Notification> => {
    const res = await axiosInstance.get<Notification>(notificationApi.detail(id));
    return res.data;
};

export const markNotificationRead = async (id: string | number): Promise<Notification> => {
    const res = await axiosInstance.post<Notification>(notificationApi.read(id), {});
    return res.data;
};

export const markAllNotificationsRead = async (): Promise<number> => {
    const res = await axiosInstance.post<{ updated: number }>(notificationApi.readAll, {});
    return res.data.updated;
};

export const deleteNotification = async (id: string | number): Promise<void> => {
    await axiosInstance.delete(notificationApi.detail(id));
};
