"use client";

/**
 * Notifications — /account/notifications
 *
 * Only `GET notifications/unread_count/` exists on the backend (and it
 * currently always answers 0). There is no notification feed and no
 * preferences endpoint, so the per-channel toggle matrix that used to live
 * here (which never saved anything) has been removed.
 */

import Link from "next/link";
import useSWR from "swr";
import { Bell, BellRing, RefreshCw } from "lucide-react";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import AccountEmptyState from "@/components/account/AccountEmptyState";
import { SectionHeader } from "@/components/common/marketplace";
import { getNotificationUnreadCount } from "@/lib/accountApi";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const BTN_PRIMARY = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 ${FOCUS}`;
const BTN_SECONDARY = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-bold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS}`;

export default function NotificationsPage() {
  const { data: unread, isLoading, isValidating, mutate } = useSWR(
    "account/notifications/unread-count",
    getNotificationUnreadCount,
    { revalidateOnFocus: true },
  );

  return (
    <>
      <AccountMobileHeader title="Notifications" />

      <div className="space-y-5">
        <SectionHeader
          as="h1"
          title="Notifications"
          subtitle="Updates about your orders, bids and requests."
          className="mb-0 sm:mb-0"
        />

        {isLoading ? (
          <div
            className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
            aria-busy="true"
            aria-label="Loading notifications"
          >
            <div className="mx-auto h-14 w-14 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="mx-auto mt-4 h-4 w-40 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="mx-auto mt-2 h-3 w-64 max-w-full rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        ) : (unread ?? 0) > 0 ? (
          <AccountEmptyState
            Icon={BellRing}
            title={`You have ${unread} unread ${unread === 1 ? "notification" : "notifications"}`}
            actions={
              <>
                <Link href="/account/orders" className={BTN_PRIMARY}>
                  View orders
                </Link>
                <Link href="/account/bids" className={BTN_SECONDARY}>
                  View bids
                </Link>
              </>
            }
          >
            A full notification list is not available yet. Check your orders, bids
            and requests for the latest status.
          </AccountEmptyState>
        ) : (
          <AccountEmptyState
            Icon={Bell}
            title="You are all caught up"
            actions={
              <button
                type="button"
                onClick={() => void mutate()}
                disabled={isValidating}
                className={`${BTN_SECONDARY} disabled:opacity-60`}
              >
                <RefreshCw
                  className={`h-4 w-4${isValidating ? " animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Check again
              </button>
            }
          >
            No unread notifications. Order, bid and request updates will be counted
            here as they arrive.
          </AccountEmptyState>
        )}
      </div>
    </>
  );
}
