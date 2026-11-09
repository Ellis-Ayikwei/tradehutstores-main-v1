/**
 * Payment methods — /account/payment-methods
 *
 * Static by design: TradeHut never stores card or wallet details.
 * Payment is collected by the payment gateway at checkout, so there is nothing to add,
 * edit or remove here (and no card, expiry or CVC fields).
 */

import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  LifeBuoy,
  Lock,
  ReceiptText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Badge, SectionHeader } from "@/components/common/marketplace";

const CARD =
  "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

const STEPS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: CreditCard,
    title: "Choose how to pay",
    body: "Pick your payment option at checkout when you place an order.",
  },
  {
    Icon: Lock,
    title: "Pay securely by card or mobile money",
    body: "Your card or wallet details go straight to our secure payment partner. TradeHut never sees or stores them. Or pay cash when your order arrives.",
  },
  {
    Icon: ReceiptText,
    title: "Get your confirmation",
    body: "Your order and payment status appear in your order history right away.",
  },
];

const LINKS: { Icon: LucideIcon; label: string; body: string; href: string }[] = [
  {
    Icon: ReceiptText,
    label: "View my orders",
    body: "See payment status for every order you have placed.",
    href: "/account/orders",
  },
  {
    Icon: ShieldCheck,
    label: "Buyer protection",
    body: "How we protect your purchases.",
    href: "/buyer-protection",
  },
  {
    Icon: LifeBuoy,
    label: "Payment help",
    body: "Charged but no order, or a payment question.",
    href: "/help",
  },
];

export default function PaymentMethodsPage() {
  return (
    <div className="space-y-5">
      <SectionHeader
        as="h1"
        title="Payment methods"
        subtitle="How payment works on TradeHut."
        className="mb-0 sm:mb-0"
      />

      <section
        className={`${CARD} flex flex-col gap-4 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950 sm:flex-row sm:items-center sm:p-6`}
        aria-labelledby="pm-secure-heading"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="pm-secure-heading"
              className="font-syne text-base font-bold text-emerald-950 dark:text-emerald-100 sm:text-lg"
            >
              Nothing to save here
            </h2>
            <Badge variant="success" icon={<Lock />}>
              No cards stored
            </Badge>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-emerald-900 dark:text-emerald-200">
            Card and mobile money payments are handled securely at checkout; no cards are stored.
          </p>
        </div>
      </section>

      <section aria-labelledby="pm-how-heading">
        <h2 id="pm-how-heading" className="sr-only">
          How payment works
        </h2>
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {STEPS.map(({ Icon, title, body }, i) => (
            <li key={title} className={`${CARD} flex gap-3 p-4`}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Step {i + 1}
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Related links" className={`${CARD} divide-y divide-gray-100 dark:divide-gray-800`}>
        {LINKS.map(({ Icon, label, body, href }) => (
          <Link
            key={label}
            href={href}
            className={`flex min-h-[64px] items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 ${FOCUS}`}
          >
            <Icon className="h-5 w-5 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">{label}</span>
              <span className="block text-xs text-gray-600 dark:text-gray-400">{body}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          </Link>
        ))}
      </section>
    </div>
  );
}
