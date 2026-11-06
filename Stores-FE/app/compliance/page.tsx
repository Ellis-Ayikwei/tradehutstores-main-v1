/**
 * Safety and compliance: /compliance
 *
 * Static, server-rendered trust page. Contains no live statistics or downloadable documents;
 * policy links point at existing pages. If compliance metrics or PDFs are published later,
 * add them from an API rather than hard-coding numbers here.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  ChevronDown,
  FileText,
  Flag,
  Gavel,
  Globe,
  Headphones,
  Leaf,
  Lock,
  OctagonAlert,
  Shield,
  ShieldCheck,
} from "lucide-react";
import MainLayout from "@/components/Layouts/MainLayout";

export const metadata: Metadata = {
  title: "Safety & Compliance | TradeHut Stores",
  description:
    "How TradeHut keeps the marketplace safe: prohibited items, seller requirements, how to report a problem and our policies.",
};

// ─── Content ──────────────────────────────────────────────────────────────────

const TRUST_POINTS: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldCheck, label: "Clear seller standards" },
  { icon: Gavel, label: "Prohibited goods removed" },
  { icon: Flag, label: "Report any listing" },
  { icon: Lock, label: "Anonymous tips accepted" },
];

const PROHIBITED_ITEMS: { icon: LucideIcon; label: string; description: string }[] = [
  { icon: OctagonAlert, label: "Hazardous materials", description: "Explosives, flammable chemicals and regulated gases." },
  { icon: Ban, label: "Counterfeit goods", description: "Replicas and unauthorised brand reproductions." },
  { icon: ShieldCheck, label: "Unlicensed pharmaceuticals", description: "Prescription medicines without a verified supply chain." },
  { icon: AlertTriangle, label: "Illegal weapons", description: "Unlicensed firearms, prohibited blades and components." },
  { icon: Ban, label: "Age-restricted products", description: "Age-gated items sold without age verification." },
  { icon: Globe, label: "Sanctioned items", description: "Goods restricted by international trade sanctions." },
  { icon: Leaf, label: "Protected wildlife", description: "CITES-listed species and products made from them." },
  { icon: Shield, label: "Malware and exploits", description: "Software designed to compromise or damage systems." },
];

const SELLER_REQUIREMENTS: { id: string; title: string; badge: string; badgeClass: string; description: string }[] = [
  {
    id: "kyc",
    title: "Identity verification (KYC)",
    badge: "Required",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    description:
      "Sellers may be asked to complete identity verification. This can include a government-issued ID, proof of address and, for businesses, company registration documents.",
  },
  {
    id: "tax",
    title: "Tax and VAT registration",
    badge: "Required",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    description:
      "Sellers above the turnover threshold provide a valid tax identification number. Cross-border sellers may need to register for VAT in the destination country.",
  },
  {
    id: "licensing",
    title: "Category licensing",
    badge: "Depends on category",
    badgeClass: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    description:
      "Some categories, such as pharmaceuticals, chemicals and heavy machinery, require a government-issued trading licence to be uploaded and verified before activation.",
  },
  {
    id: "aml",
    title: "Anti-money laundering checks",
    badge: "Required",
    badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    description:
      "Accounts are screened against global watchlists. Unusual transaction patterns may trigger a temporary hold while a person reviews the account.",
  },
  {
    id: "insurance",
    title: "Liability insurance",
    badge: "Recommended",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
    description:
      "For high-value goods, product liability insurance is recommended. You can attach proof of cover to your seller profile to build buyer confidence.",
  },
];

const COMMITMENTS: { title: string; text: string }[] = [
  {
    title: "Reports are reviewed",
    text: "Every report on a listing or seller is reviewed by our moderation team, and violating listings are removed.",
  },
  {
    title: "Fair appeals",
    text: "Sellers can appeal account penalties through the dispute centre, and appeals are reviewed by a person.",
  },
  {
    title: "Clear policy changes",
    text: "When our policies change we publish the updated version on the legal pages so buyers and sellers can read it.",
  },
];

const REPORT_OPTIONS: { icon: LucideIcon; title: string; description: string; action: string; href: string }[] = [
  {
    icon: Flag,
    title: "Report a listing or seller",
    description: "Open your reports page to flag a listing, seller or message that breaks our rules.",
    action: "Report a problem",
    href: "/account/reports",
  },
  {
    icon: Headphones,
    title: "Talk to support",
    description: "For urgent or complex matters, contact our support team through the help centre.",
    action: "Visit help centre",
    href: "/help",
  },
  {
    icon: ShieldCheck,
    title: "Dispute an order",
    description: "Use the dispute process when an order does not arrive, is not as described or you were charged wrongly.",
    action: "Open dispute centre",
    href: "/account/disputes",
  },
];

const POLICY_LINKS: { title: string; description: string; href: string }[] = [
  { title: "Terms of service", description: "The rules for buyers and sellers.", href: "/legal/terms" },
  { title: "Privacy policy", description: "How we collect and use your data.", href: "/legal/privacy" },
  { title: "Cookie policy", description: "How cookies are used on the site.", href: "/legal/cookies" },
  { title: "Buyer protection", description: "What is covered when you buy.", href: "/buyer-protection" },
  { title: "Returns and refunds", description: "How returns work.", href: "/returns" },
  { title: "Trust and safety", description: "How we keep payments and accounts secure.", href: "/trust" },
];

const LINK_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  return (
    <MainLayout>
      <main className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {/* Header */}
        <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto py-8 sm:py-12 lg:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
              Platform integrity
            </p>
            <h1 className="mt-2 font-syne text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              Safety &amp; compliance
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-700 dark:text-gray-300">
              TradeHut is built to be a safe, transparent and legal marketplace. Here is what we do not allow, what we
              expect from sellers and how to report a problem.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {TRUST_POINTS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold dark:border-gray-700 dark:bg-gray-950"
                >
                  <Icon className="h-5 w-5 shrink-0 text-primary-700 dark:text-primary-300" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Prohibited items */}
        <section className="container mx-auto py-10 sm:py-14">
          <div className="mb-6 max-w-2xl">
            <h2 className="font-syne text-2xl font-bold sm:text-3xl">Prohibited items</h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              These categories are not allowed on TradeHut. Listings in them are removed and the seller&apos;s account
              is reviewed.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
            {PROHIBITED_ITEMS.map(({ icon: Icon, label, description }) => (
              <li
                key={label}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-900 dark:text-red-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-base font-bold">{label}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{description}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/legal/terms"
            className={`mt-5 inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${LINK_FOCUS}`}
          >
            Read the full terms
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        {/* Seller requirements */}
        <section className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto grid gap-8 py-10 sm:py-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <h2 className="font-syne text-2xl font-bold sm:text-3xl">Seller requirements</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                These are the standards we ask sellers to meet. We may ask you to
                re-verify when your situation changes.
              </p>
              <Link
                href="/help"
                className={`mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${LINK_FOCUS}`}
              >
                Seller help articles
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="space-y-2 lg:col-span-8">
              {SELLER_REQUIREMENTS.map((req) => (
                <details
                  key={req.id}
                  className="group rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950"
                >
                  <summary
                    className={`flex min-h-[56px] cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 [&::-webkit-details-marker]:hidden ${LINK_FOCUS}`}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="text-base font-bold">{req.title}</span>
                      <span
                        className={`w-fit rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${req.badgeClass}`}
                      >
                        {req.badge}
                      </span>
                    </span>
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-gray-500 transition-transform duration-200 group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{req.description}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Commitments */}
        <section className="container mx-auto py-10 sm:py-14">
          <h2 className="font-syne text-2xl font-bold sm:text-3xl">Our commitments</h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-3">
            {COMMITMENTS.map((c) => (
              <li
                key={c.title}
                className="rounded-xl border-l-4 border-primary bg-gray-50 p-4 dark:bg-gray-900"
              >
                <h3 className="text-base font-bold">{c.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{c.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Report */}
        <section className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto py-10 sm:py-14">
            <h2 className="font-syne text-2xl font-bold sm:text-3xl">How to report a problem</h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-3">
              {REPORT_OPTIONS.map(({ icon: Icon, title, description, action, href }) => (
                <li
                  key={title}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-base font-bold">{title}</h3>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{description}</p>
                  <Link
                    href={href}
                    className={`mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${LINK_FOCUS}`}
                  >
                    {action}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Policies */}
        <section className="container mx-auto py-10 sm:py-14">
          <h2 className="font-syne text-2xl font-bold sm:text-3xl">Policies</h2>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {POLICY_LINKS.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  className={`flex min-h-[64px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 hover:border-primary dark:border-gray-700 dark:bg-gray-900 ${LINK_FOCUS}`}
                >
                  <FileText className="h-5 w-5 shrink-0 text-primary-700 dark:text-primary-300" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{p.title}</span>
                    <span className="block text-xs text-gray-600 dark:text-gray-400">{p.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </MainLayout>
  );
}
