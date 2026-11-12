"use client";

/**
 * Notifications - /account/notifications
 *
 * Inbox backed by `notifications/` (contract 25-notifications): paginated
 * list, All / Unread filter, mark read on open, mark all read, delete.
 */

import { useCallback, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { AlertCircle, Bell, BellOff, CheckCheck, RefreshCw } from "lucide-react";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import AccountEmptyState from "@/components/account/AccountEmptyState";
import { SectionHeader } from "@/components/common/marketplace";
import {
  deleteNotification,
  getNotificationUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ApiNotification,
  type NotificationPage,
} from "@/lib/accountApi";
import NotificationRow from "./_components/NotificationRow";

const PAGE_SIZE = 20;
const UNREAD_KEY = "account/notifications/unread-count";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const BTN_SECONDARY = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-bold text-zinc-800 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 ${FOCUS}`;

type Tab = "all" | "unread";

function ListSkeleton() {
  return (
    <ul
      className="animate-pulse overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      aria-busy="true"
      aria-label="Loading notifications"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="flex gap-3 border-b border-zinc-200 px-3 py-3 last:border-b-0 dark:border-zinc-800 sm:px-4"
        >
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("all");
  const [pendingId, setPendingId] = useState<string | number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: unreadCount, mutate: mutateUnread } = useSWR(
    UNREAD_KEY,
    getNotificationUnreadCount,
    { revalidateOnFocus: true },
  );

  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<NotificationPage>(
      (index, previous) =>
        previous && !previous.next ? null : ["account/notifications", tab, index + 1],
      ([, key, page]: [string, Tab, number]) =>
        listNotifications({
          page,
          pageSize: PAGE_SIZE,
          unread: key === "unread",
        }),
      { revalidateOnFocus: true, revalidateFirstPage: true },
    );

  const items: ApiNotification[] = data ? data.flatMap((p) => p.results) : [];
  const total = data?.[0]?.count ?? 0;
  const last = data?.[data.length - 1];
  const hasMore = Boolean(last?.next);
  const isLoadingMore =
    size > 0 && data !== undefined && typeof data[size - 1] === "undefined" && !error;
  const unread = unreadCount ?? 0;

  const patchPages = useCallback(
    (fn: (n: ApiNotification) => ApiNotification | null, countDelta: number) =>
      mutate(
        (pages) =>
          pages?.map((p, i) => ({
            ...p,
            count: i === 0 ? Math.max(0, p.count + countDelta) : p.count,
            results: p.results.flatMap((n) => {
              const next = fn(n);
              return next ? [next] : [];
            }),
          })),
        { revalidate: false },
      ),
    [mutate],
  );

  const handleOpen = (item: ApiNotification) => {
    if (item.is_read) return;
    void patchPages(
      (n) =>
        n.id === item.id
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n,
      0,
    );
    void mutateUnread((c) => Math.max(0, (c ?? 1) - 1), { revalidate: false });
    markNotificationRead(item.id)
      .then(() => mutateUnread())
      .catch(() => {
        void mutate();
        void mutateUnread();
      });
  };

  const handleDelete = async (item: ApiNotification) => {
    setActionError(null);
    setPendingId(item.id);
    try {
      await deleteNotification(item.id);
      await patchPages((n) => (n.id === item.id ? null : n), -1);
      void mutateUnread();
    } catch {
      setActionError("We could not delete that notification. Try again.");
    } finally {
      setPendingId(null);
    }
  };

  const handleMarkAll = async () => {
    setActionError(null);
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      await Promise.all([mutate(), mutateUnread()]);
    } catch {
      setActionError("We could not mark your notifications as read. Try again.");
    } finally {
      setMarkingAll(false);
    }
  };

  const showSkeleton = isLoading && !data;
  const showError = Boolean(error) && items.length === 0;

  return (
    <>
      <AccountMobileHeader title="Notifications" />

      <div className="space-y-3 lg:space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeader
            as="h1"
            title="Notifications"
            subtitle={
              unread > 0
                ? `${unread} unread`
                : "Updates about your orders, bids and requests."
            }
            className="mb-0 sm:mb-0"
          />
          <button
            type="button"
            onClick={() => void handleMarkAll()}
            disabled={markingAll || unread === 0}
            className={BTN_SECONDARY}
          >
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
            Mark all as read
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Filter notifications"
          className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800"
        >
          {(["all", "unread"] as const).map((key) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className={`-mb-px min-h-[44px] border-b-2 px-4 text-sm font-bold ${FOCUS} ${
                  active
                    ? "border-primary-700 text-primary-700 dark:border-primary-400 dark:text-primary-400"
                    : "border-zinc-200 text-zinc-600 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {key === "all" ? "All" : unread > 0 ? `Unread (${unread})` : "Unread"}
              </button>
            );
          })}
        </div>

        {actionError ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-900 dark:border-red-900 dark:bg-zinc-900 dark:text-red-300"
          >
            {actionError}
          </p>
        ) : null}

        {showSkeleton ? <ListSkeleton /> : null}

        {showError ? (
          <div
            role="alert"
            className="flex flex-col items-center rounded-md border border-red-200 bg-red-50 px-4 py-10 text-center dark:border-red-900 dark:bg-zinc-900"
          >
            <AlertCircle
              className="h-10 w-10 text-red-700 dark:text-red-400"
              aria-hidden="true"
            />
            <h2 className="mt-3 font-syne text-lg font-bold text-zinc-900 dark:text-zinc-100">
              We could not load your notifications
            </h2>
            <p className="mt-1 max-w-sm text-sm text-zinc-700 dark:text-zinc-300">
              Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => void mutate()}
              disabled={isValidating}
              className={`${BTN_SECONDARY} mt-4`}
            >
              <RefreshCw
                className={`h-4 w-4${isValidating ? " animate-spin" : ""}`}
                aria-hidden="true"
              />
              Try again
            </button>
          </div>
        ) : null}

        {!showSkeleton && !showError && data && items.length === 0 ? (
          tab === "unread" ? (
            <AccountEmptyState Icon={BellOff} title="No unread notifications">
              You are all caught up.
            </AccountEmptyState>
          ) : (
            <AccountEmptyState Icon={Bell} title="No notifications yet">
              Order, bid and request updates will appear here as they arrive.
            </AccountEmptyState>
          )
        ) : null}

        {items.length > 0 ? (
          <>
            <ul className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
              {items.map((item) => (
                <NotificationRow
                  key={item.id}
                  item={item}
                  onOpen={handleOpen}
                  onDelete={(n) => void handleDelete(n)}
                  busy={pendingId === item.id}
                />
              ))}
            </ul>

            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Showing {items.length} of {total}
              </p>
              {error ? (
                <p
                  role="alert"
                  className="text-sm font-semibold text-red-700 dark:text-red-400"
                >
                  We could not load more notifications.
                </p>
              ) : null}
              {hasMore || error ? (
                <button
                  type="button"
                  onClick={() => (error ? void mutate() : void setSize(size + 1))}
                  disabled={isLoadingMore}
                  className={BTN_SECONDARY}
                >
                  {isLoadingMore ? "Loading..." : error ? "Try again" : "Load more"}
                </button>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
