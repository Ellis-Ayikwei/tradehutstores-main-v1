/**
 * Seller disputes: /seller/disputes
 *
 * Static, server-rendered guide for sellers. Sellers manage live disputes in the seller dashboard
 * (Stores-Admin), not on this storefront site. No Admin URL constant exists in Stores-FE, so this page
 * does not link to it. It lists no cases, counts or response deadlines because none are defined.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Bell,
  Camera,
  FileSearch,
  Flag,
  Gavel,
  MapPin,
  MessageCircle,
  Phone,
  Reply,
} from "lucide-react";
import MainLayout from "@/components/Layouts/MainLayout";

export const metadata: Metadata = {
  title: "Seller Disputes | TradeHut Stores",
  description:
    "How disputes work for sellers on TradeHut: what happens when a buyer raises a problem, how to respond and how to prepare evidence.",
};

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Flag,
    title: "A buyer raises a problem",
    text: "A buyer opens a dispute on an order, for example an item that did not arrive, is damaged or is not as described.",
  },
  {
    icon: Bell,
    title: "You are asked to respond",
    text: "You are notified so you can give your side. Respond promptly, because a missing response can affect the outcome.",
  },
  {
    icon: Camera,
    title: "Share your evidence",
    text: "Add photos, proof of postage or delivery, and messages with the buyer that show what happened.",
  },
  {
    icon: FileSearch,
    title: "The evidence is reviewed",
    text: "If you and the buyer cannot agree, TradeHut can review the evidence from both sides.",
  },
  {
    icon: Gavel,
    title: "A decision is made",
    text: "Both sides are told the outcome, such as a refund, a replacement or no action.",
  },
];

const EVIDENCE: string[] = [
  "Clear photos of the item as it was packed and sent.",
  "Proof of postage, courier receipts or tracking details.",
  "Messages with the buyer, kept on TradeHut.",
  "The original listing details and any agreed changes.",
];

const TIPS: string[] = [
  "Describe items accurately and show real photos in your listings.",
  "State your return policy in your store so buyers know what to expect.",
  "Pack items carefully and keep proof of postage.",
  "Answer buyer messages quickly. Many problems are solved before they become disputes.",
];

const LINK_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950";

export default function SellerDisputesPage() {
  return (
    <MainLayout>
      <main className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {/* Header */}
        <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto py-8 sm:py-12 lg:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
              For sellers
            </p>
            <h1 className="mt-2 font-syne text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              How disputes work
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-700 dark:text-gray-300">
              When a buyer raises a problem with an order, this is what happens and how to prepare. Active disputes
              are handled in your seller dashboard, not on this page.
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="container mx-auto py-10 sm:py-14" aria-labelledby="sd-steps">
          <div className="mb-6 max-w-2xl">
            <h2 id="sd-steps" className="font-syne text-2xl font-bold sm:text-3xl">
              What happens in a dispute
            </h2>
          </div>
          <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li
                key={title}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-400">Step {i + 1}</span>
                </div>
                <h3 className="mt-3 text-base font-bold leading-snug">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Evidence + tips */}
        <section className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto grid gap-8 py-10 sm:py-14 lg:grid-cols-2">
            <div>
              <h2 className="flex items-center gap-2 font-syne text-2xl font-bold sm:text-3xl">
                <Reply className="h-6 w-6 text-primary-700 dark:text-primary-300" aria-hidden="true" />
                Evidence that helps
              </h2>
              <ul className="mt-4 space-y-3">
                {EVIDENCE.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    <span
                      className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-700 dark:bg-primary-300"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="font-syne text-2xl font-bold sm:text-3xl">Avoiding disputes</h2>
              <ul className="mt-4 space-y-3">
                {TIPS.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    <span
                      className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-700 dark:bg-primary-300"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="container mx-auto py-10 sm:py-14">
          <h2 className="font-syne text-2xl font-bold sm:text-3xl">Need help with a dispute?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            Contact us and have the order number ready.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
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
          <div className="mt-4 flex flex-wrap gap-x-5">
            <Link
              href="/buyer-protection"
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${LINK_FOCUS}`}
            >
              Buyer protection
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/compliance"
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${LINK_FOCUS}`}
            >
              Seller requirements
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/legal/terms"
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${LINK_FOCUS}`}
            >
              Terms of service
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
