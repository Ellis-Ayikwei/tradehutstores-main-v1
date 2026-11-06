"use client";

/**
 * Messages — /account/messages
 *
 * There is no messaging backend yet (no threads/messages endpoints), so this
 * page shows an empty state with the official contact channels instead of
 * sample conversations.
 */

import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import AccountEmptyState from "@/components/account/AccountEmptyState";
import { SectionHeader } from "@/components/common/marketplace";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export default function MessagesPage() {
  return (
    <>
      <AccountMobileHeader title="Messages" />

      <div className="space-y-5">
        <SectionHeader
          as="h1"
          title="Messages"
          subtitle="Conversations with sellers and TradeHut support."
          className="mb-0 sm:mb-0"
        />

        <AccountEmptyState
          Icon={MessageCircle}
          title="No messages yet"
          actions={
            <>
              <a
                href="https://wa.me/233248138722"
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 ${FOCUS}`}
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Chat on WhatsApp
              </a>
              <a
                href="tel:+233248138722"
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-bold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS}`}
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                024 813 8722
              </a>
            </>
          }
        >
          <p>
            In-app messaging is not available yet. To reach us about an order or a
            listing, use WhatsApp or call us. For a problem with an order, you can also{" "}
            <Link
              href="/account/disputes"
              className={`font-semibold text-primary-700 underline hover:text-primary-800 dark:text-primary-300 ${FOCUS}`}
            >
              open a dispute
            </Link>
            .
          </p>
        </AccountEmptyState>
      </div>
    </>
  );
}
