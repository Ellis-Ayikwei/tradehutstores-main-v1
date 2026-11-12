"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import type { ApiNotification } from "@/lib/accountApi";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

/** Short relative time, falling back to a date for anything older than a week. */
function formatWhen(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const diffSec = Math.max(0, Math.round((Date.now() - then.getTime()) / 1000));
  if (diffSec < 60) return "Just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} ${day === 1 ? "day" : "days"} ago`;
  return then.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Only storefront-relative paths are navigable; anything else is ignored. */
function safeHref(link: string): string | null {
  return link.startsWith("/") && !link.startsWith("//") ? link : null;
}

export default function NotificationRow({
  item,
  onOpen,
  onDelete,
  busy,
}: {
  item: ApiNotification;
  /** Called when the row is opened; the parent marks it read. */
  onOpen: (item: ApiNotification) => void;
  onDelete: (item: ApiNotification) => void;
  busy: boolean;
}) {
  const href = safeHref(item.link);
  const unread = !item.is_read;

  const content = (
    <>
      <span
        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
          unread ? "bg-primary-700 dark:bg-primary-400" : ""
        }`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span
            className={`line-clamp-2 text-sm leading-snug text-zinc-900 dark:text-zinc-100 ${
              unread ? "font-bold" : "font-medium"
            }`}
          >
            {item.title}
          </span>
          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            {formatWhen(item.created_at)}
          </span>
        </span>
        {item.body ? (
          <span
            className={`mt-0.5 line-clamp-2 block text-[13px] leading-snug ${
              unread
                ? "text-zinc-700 dark:text-zinc-300"
                : "text-zinc-600 dark:text-zinc-400"
            }`}
          >
            {item.body}
          </span>
        ) : null}
        {unread ? <span className="sr-only">Unread</span> : null}
      </span>
    </>
  );

  const mainClass = `flex min-h-[44px] min-w-0 flex-1 items-start gap-3 px-3 py-3 text-left sm:px-4 ${FOCUS}`;

  return (
    <li
      className={`flex items-stretch border-b border-zinc-200 last:border-b-0 dark:border-zinc-800 ${
        unread
          ? "bg-primary-50 dark:bg-zinc-800"
          : "bg-white dark:bg-zinc-900"
      }`}
    >
      {href ? (
        <Link href={href} onClick={() => onOpen(item)} className={mainClass}>
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(item)}
          disabled={!unread}
          className={`${mainClass} disabled:cursor-default`}
        >
          {content}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDelete(item)}
        disabled={busy}
        aria-label={`Delete notification: ${item.title}`}
        className={`flex w-11 shrink-0 items-center justify-center text-zinc-500 hover:text-red-700 disabled:cursor-not-allowed disabled:text-zinc-400 dark:text-zinc-400 dark:hover:text-red-400 dark:disabled:text-zinc-600 ${FOCUS}`}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}
