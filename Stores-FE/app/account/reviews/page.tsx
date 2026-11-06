"use client";

/**
 * Reviews — /account/reviews
 *
 * The backend only exposes the public product-review list (`reviews/?product=`),
 * with no "my reviews", "awaiting review" or "received" endpoints. Until those
 * exist this page is an honest empty state that points to where reviews are
 * written (the product page) rather than showing sample reviews.
 */

import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import AccountEmptyState from "@/components/account/AccountEmptyState";
import { SectionHeader } from "@/components/common/marketplace";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export default function ReviewsPage() {
  return (
    <>
      <AccountMobileHeader title="Reviews" />

      <div className="space-y-5">
        <SectionHeader
          as="h1"
          title="Reviews"
          subtitle="Your product reviews and feedback."
          className="mb-0 sm:mb-0"
        />

        <AccountEmptyState
          Icon={Star}
          title="No reviews to show yet"
          actions={
            <>
              <Link
                href="/account/orders"
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 ${FOCUS}`}
              >
                View my orders
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/products"
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-bold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS}`}
              >
                Browse products
              </Link>
            </>
          }
        >
          Reviews you write on a product page will be listed here once this view is
          connected to your account. For now, open an item from your orders to read or
          leave a review on its product page.
        </AccountEmptyState>
      </div>
    </>
  );
}
