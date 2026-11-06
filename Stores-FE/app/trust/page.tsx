/**
 * Trust and safety: /trust
 *
 * Static, server-rendered page. It describes the safeguards and habits that keep buyers and sellers
 * safe, and links to the detailed policy pages. It carries no statistics, certifications or partner
 * names because none are defined in the platform. Add them from a verified source if they are published.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Flag,
  KeyRound,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Scale,
  ShieldCheck,
  Store,
} from "lucide-react";
import MainLayout from "@/components/Layouts/MainLayout";

export const metadata: Metadata = {
  title: "Trust & Safety | TradeHut Stores",
  description:
    "How TradeHut helps keep buying and selling safe: seller verification, secure checkout, disputes and how to report a problem.",
};

const PILLARS: { icon: LucideIcon; title: string; text: string; href: string; action: string }[] = [
  {
    icon: BadgeCheck,
    title: "Seller verification",
    text: "Sellers complete a verification step before they list. Check a seller's profile before you buy.",
    href: "/compliance",
    action: "Seller requirements",
  },
  {
    icon: CreditCard,
    title: "Pay at checkout",
    text: "Paying through the TradeHut checkout keeps your order on record, so there is something to review if a problem comes up.",
    href: "/buyer-protection",
    action: "Buyer protection",
  },
  {
    icon: Scale,
    title: "Dispute process",
    text: "If an order goes wrong, you can open a dispute and add evidence. Both sides are heard before a decision.",
    href: "/account/disputes",
    action: "Dispute centre",
  },
  {
    icon: Flag,
    title: "Report a problem",
    text: "Flag a suspicious listing, seller or message and it will be reviewed.",
    href: "/account/reports",
    action: "Report a problem",
  },
  {
    icon: Lock,
    title: "Account security",
    text: "Keep your account secure with a strong password and review your sign-in settings from your account.",
    href: "/account/security",
    action: "Security settings",
  },
  {
    icon: Store,
    title: "Clear rules for sellers",
    text: "Prohibited items and seller standards are published, and listings that break them are removed.",
    href: "/compliance",
    action: "Safety & compliance",
  },
];

const HABITS: string[] = [
  "Pay only through the TradeHut checkout. Never send money to a seller outside the platform.",
  "Never share your password or one-time codes, even with someone who says they work for TradeHut.",
  "Keep messages with sellers on TradeHut so they can be used as evidence.",
  "Read the listing and the seller's return policy before you buy.",
  "Check your order as soon as it arrives and raise any problem straight away.",
  "If an offer looks too good to be true, report it before you pay.",
];

const LINK_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950";

export default function TrustPage() {
  return (
    <MainLayout>
      <main className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {/* Header */}
        <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto py-8 sm:py-12 lg:py-16">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Trust &amp; safety
            </p>
            <h1 className="mt-2 font-syne text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              Buy and sell with confidence
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-700 dark:text-gray-300">
              Here is how TradeHut helps keep the marketplace safe, and what you can do to protect yourself.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/buyer-protection"
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 ${LINK_FOCUS}`}
              >
                Read buyer protection
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/help"
                className={`inline-flex min-h-[48px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-bold text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 ${LINK_FOCUS}`}
              >
                Visit the help centre
              </Link>
            </div>
          </div>
        </section>

        {/* Pillars */}
        <section className="container mx-auto py-10 sm:py-14" aria-labelledby="trust-pillars">
          <div className="mb-6 max-w-2xl">
            <h2 id="trust-pillars" className="font-syne text-2xl font-bold sm:text-3xl">
              How we help keep you safe
            </h2>
          </div>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text, href, action }) => (
              <li
                key={title}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-base font-bold">{title}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{text}</p>
                <Link
                  href={href}
                  className={`mt-2 inline-flex min-h-[44px] items-center gap-1.5 self-start rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${LINK_FOCUS}`}
                >
                  {action}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Habits */}
        <section className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto grid gap-8 py-10 sm:py-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300">
                <KeyRound className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-3 font-syne text-2xl font-bold sm:text-3xl">Stay safe online</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                A few habits make the biggest difference to your safety.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-8">
              {HABITS.map((habit) => (
                <li
                  key={habit}
                  className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                >
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary-700 dark:text-primary-300" aria-hidden="true" />
                  {habit}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Contact and policies */}
        <section className="container mx-auto py-10 sm:py-14">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="font-syne text-2xl font-bold sm:text-3xl">Something not right?</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                Contact us if you think you have been scammed or have a security concern. Have the order number or
                listing link ready.
              </p>
              <ul className="mt-4 space-y-2">
                <li>
                  <a
                    href="tel:+233248138722"
                    className={`flex min-h-[48px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 ${LINK_FOCUS}`}
                  >
                    <Phone className="h-5 w-5 text-primary-700 dark:text-primary-300" aria-hidden="true" />
                    <span className="font-mono">024 813 8722</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/233248138722"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex min-h-[48px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 ${LINK_FOCUS}`}
                  >
                    <MessageCircle className="h-5 w-5 text-green-700 dark:text-green-300" aria-hidden="true" />
                    Message us on WhatsApp
                  </a>
                </li>
                <li className="flex min-h-[48px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-900">
                  <MapPin className="h-5 w-5 text-primary-700 dark:text-primary-300" aria-hidden="true" />
                  La Trade Fair, Accra, Ghana
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-syne text-2xl font-bold sm:text-3xl">Policies</h2>
              <ul className="mt-4 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
                {[
                  { title: "Buyer protection", href: "/buyer-protection" },
                  { title: "Returns and refunds", href: "/returns" },
                  { title: "Safety and compliance", href: "/compliance" },
                  { title: "Terms of service", href: "/legal/terms" },
                  { title: "Privacy policy", href: "/legal/privacy" },
                  { title: "Cookie policy", href: "/legal/cookies" },
                ].map((p) => (
                  <li key={p.href}>
                    <Link
                      href={p.href}
                      className={`flex min-h-[48px] items-center justify-between gap-3 px-4 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 ${LINK_FOCUS}`}
                    >
                      {p.title}
                      <ArrowRight className="h-4 w-4 text-primary-700 dark:text-primary-300" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
