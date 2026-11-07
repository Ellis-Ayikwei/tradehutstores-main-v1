/**
 * Trust and verification — /account/verification
 *
 * Informational page. There is no verification-status API yet, so this page
 * does not show per-user pass/fail states or upload forms; it explains what
 * TradeHut will ask for and why. Wire real statuses here once the backend
 * exposes them.
 */

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Gavel,
  Home,
  IdCard,
  Info,
  Landmark,
  Mail,
  Smartphone,
  Store,
  type LucideIcon,
} from "lucide-react";
import { Badge, SectionHeader } from "@/components/common/marketplace";

const CARD =
  "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

type Audience = "all" | "sellers";

interface VerificationItem {
  id: string;
  Icon: LucideIcon;
  title: string;
  body: string;
  audience: Audience;
}

const ITEMS: VerificationItem[] = [
  {
    id: "email",
    Icon: Mail,
    title: "Email address",
    body: "Confirms you can receive order updates, receipts and security alerts.",
    audience: "all",
  },
  {
    id: "phone",
    Icon: Smartphone,
    title: "Phone number",
    body: "Used for delivery contact and to protect your account.",
    audience: "all",
  },
  {
    id: "identity",
    Icon: IdCard,
    title: "Identity",
    body: "A government-issued ID confirms you are who you say you are.",
    audience: "all",
  },
  {
    id: "address",
    Icon: Home,
    title: "Address proof",
    body: "A recent utility bill or bank statement showing your name and address.",
    audience: "all",
  },
  {
    id: "business",
    Icon: Store,
    title: "Business registration",
    body: "Registration documents for your business. Needed to sell on TradeHut.",
    audience: "sellers",
  },
  {
    id: "bank",
    Icon: Landmark,
    title: "Payout account",
    body: "The bank or mobile money account where your sales payouts are sent.",
    audience: "sellers",
  },
];

const BENEFITS: { Icon: LucideIcon; title: string; body: string; href: string; cta: string }[] = [
  {
    Icon: Gavel,
    title: "Bid in auctions",
    body: "Bidders must be verified before placing bids.",
    href: "/auctions",
    cta: "Browse auctions",
  },
  {
    Icon: Store,
    title: "Sell on TradeHut",
    body: "Sellers complete business and payout checks before listing.",
    href: "/sell",
    cta: "Start selling",
  },
];

export default function VerificationPage() {
  return (
    <div className="space-y-5">
      <SectionHeader
        as="h1"
        title="Trust & verification"
        subtitle="Verified members make TradeHut safer for buyers and sellers."
        className="mb-0 sm:mb-0"
      />

      <div
        role="status"
        className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100"
      >
        <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Verification status is coming to your account</p>
          <p className="mt-0.5 text-sm leading-relaxed">
            Document upload and live status are not available in your account yet. Below is what we
            check and why. If you need to be verified now, contact support.
          </p>
          <Link
            href="/help"
            className={`mt-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg text-sm font-bold underline underline-offset-2 ${FOCUS}`}
          >
            Contact support
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <section aria-labelledby="verif-checks-heading">
        <h2 id="verif-checks-heading" className="mb-3 font-syne text-lg font-bold text-gray-900 dark:text-gray-100">
          What we check
        </h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ITEMS.map(({ id, Icon, title, body, audience }) => (
            <li key={id} className={`${CARD} flex gap-3 p-4`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</h3>
                  <Badge variant={audience === "sellers" ? "dark" : "neutral"}>
                    {audience === "sellers" ? "Sellers" : "All members"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="verif-why-heading">
        <h2 id="verif-why-heading" className="mb-3 font-syne text-lg font-bold text-gray-900 dark:text-gray-100">
          Why it matters
        </h2>
        <ul className={`${CARD} divide-y divide-gray-100 dark:divide-gray-800`}>
          {BENEFITS.map(({ Icon, title, body, href, cta }) => (
            <li key={title}>
              <Link
                href={href}
                className={`flex min-h-[64px] items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 ${FOCUS}`}
              >
                <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-bold text-gray-900 dark:text-gray-100">
                    <Icon className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                    {title}
                  </span>
                  <span className="block text-xs text-gray-600 dark:text-gray-400">{body}</span>
                </span>
                <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary-700 dark:text-primary-300 sm:inline-flex">
                  {cta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Read how we handle your documents in our{" "}
        <Link href="/legal/privacy" className={`font-semibold underline underline-offset-2 ${FOCUS}`}>
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/legal/terms" className={`font-semibold underline underline-offset-2 ${FOCUS}`}>
          Terms
        </Link>
        .
      </p>
    </div>
  );
}
