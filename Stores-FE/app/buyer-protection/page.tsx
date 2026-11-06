/**
 * Buyer protection: /buyer-protection
 *
 * Static, server-rendered policy page. It explains the problems a buyer can raise and how the dispute
 * process works. It does not state refund percentages, time limits, insurance or escrow terms because
 * those are not defined in the platform settings. Add them once the business confirms them.
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Camera,
  ChevronDown,
  CreditCard,
  FileSearch,
  Flag,
  Gavel,
  MapPin,
  MessageCircle,
  PackageX,
  Phone,
  SearchX,
  ShieldCheck,
  Truck,
} from "lucide-react";
import MainLayout from "@/components/Layouts/MainLayout";

export const metadata: Metadata = {
  title: "Buyer Protection | TradeHut Stores",
  description:
    "What you can raise if something goes wrong with an order on TradeHut, and how the dispute process works.",
};

const COVERED: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Truck,
    title: "Item not received",
    text: "Your order has not arrived and the seller cannot show it was delivered.",
  },
  {
    icon: SearchX,
    title: "Not as described",
    text: "The item is clearly different from the listing, such as the wrong model, size or condition.",
  },
  {
    icon: PackageX,
    title: "Damaged or faulty",
    text: "The item arrives broken, or does not work when used as intended.",
  },
  {
    icon: CreditCard,
    title: "Incorrect charge",
    text: "You were charged a different amount from the one you agreed to at checkout.",
  },
];

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: CreditCard,
    title: "Buy and pay through TradeHut",
    text: "Complete payment in the TradeHut checkout. Do not pay a seller outside the platform.",
  },
  {
    icon: Flag,
    title: "Raise the problem",
    text: "If something is wrong, open a dispute on the order from your account and describe what happened.",
  },
  {
    icon: Camera,
    title: "Add evidence",
    text: "Attach photos, documents or messages that show the problem.",
  },
  {
    icon: FileSearch,
    title: "Both sides are heard",
    text: "The seller is asked to respond. If you cannot agree, TradeHut can review the evidence.",
  },
  {
    icon: Gavel,
    title: "You are told the outcome",
    text: "You are notified of the decision, such as a refund, a replacement or no action.",
  },
];

const TIPS: string[] = [
  "Read the full listing and the seller's return policy before you buy.",
  "Keep all conversations with the seller on TradeHut so they can be used as evidence.",
  "Check the item soon after it arrives and raise any problem straight away.",
  "Never share your password or one-time codes with anyone.",
];

const FAQS: { question: string; answer: string }[] = [
  {
    question: "Who decides the outcome of a dispute?",
    answer:
      "The seller is asked to respond first. If you and the seller cannot agree, TradeHut can review the evidence from both sides and decide the outcome.",
  },
  {
    question: "Is there a time limit for raising a problem?",
    answer:
      "Raise it as soon as you notice it. Any time limits are set out in the Terms of Service. If you are unsure about your order, contact us.",
  },
  {
    question: "What if I paid a seller outside TradeHut?",
    answer:
      "Dispute and refund help applies to orders paid through the TradeHut checkout. We cannot help with payments made outside the platform, so always pay through checkout.",
  },
  {
    question: "How do I report a suspicious seller or listing?",
    answer: "Use the reports page in your account to flag it, or contact us directly if it is urgent.",
  },
];

const LINK_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950";

export default function BuyerProtectionPage() {
  return (
    <MainLayout>
      <main className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {/* Header */}
        <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto py-8 sm:py-12 lg:py-16">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Buyer protection
            </p>
            <h1 className="mt-2 font-syne text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              Shop with confidence
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-700 dark:text-gray-300">
              If something goes wrong with an order you paid for through TradeHut, you can raise it and we will help
              resolve it. This page explains what you can raise and how the process works.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/account/disputes"
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 ${LINK_FOCUS}`}
              >
                Open the dispute centre
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/returns"
                className={`inline-flex min-h-[48px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-bold text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 ${LINK_FOCUS}`}
              >
                How returns work
              </Link>
            </div>
          </div>
        </section>

        {/* What you can raise */}
        <section className="container mx-auto py-10 sm:py-14" aria-labelledby="bp-covered">
          <div className="mb-6 max-w-2xl">
            <h2 id="bp-covered" className="font-syne text-2xl font-bold sm:text-3xl">
              Problems you can raise
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              Open a dispute if any of these happen on an order paid through TradeHut.
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4">
            {COVERED.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-base font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto py-10 sm:py-14">
            <div className="mb-6 max-w-2xl">
              <h2 className="font-syne text-2xl font-bold sm:text-3xl">How it works</h2>
            </div>
            <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
              {STEPS.map(({ icon: Icon, title, text }, i) => (
                <li
                  key={title}
                  className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950"
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
          </div>
        </section>

        {/* Tips + FAQ */}
        <section className="container mx-auto grid gap-10 py-10 sm:py-14 lg:grid-cols-2">
          <div>
            <h2 className="font-syne text-2xl font-bold sm:text-3xl">Tips for a safe purchase</h2>
            <ul className="mt-4 space-y-3">
              {TIPS.map((tip) => (
                <li key={tip} className="flex gap-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  <span
                    className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-700 dark:bg-primary-300"
                    aria-hidden="true"
                  />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="font-syne text-2xl font-bold sm:text-3xl">Questions</h2>
            <div className="mt-4 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
              {FAQS.map((f) => (
                <details key={f.question} className="group">
                  <summary
                    className={`flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left text-base font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 [&::-webkit-details-marker]:hidden ${LINK_FOCUS}`}
                  >
                    <span>{f.question}</span>
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-primary-700 transition-transform group-open:rotate-180 dark:text-primary-300"
                      aria-hidden="true"
                    />
                  </summary>
                  <p className="px-4 pb-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{f.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto py-8 sm:py-10">
            <h2 className="font-syne text-xl font-bold sm:text-2xl">Talk to us</h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <li>
                <a
                  href="tel:+233248138722"
                  className={`flex min-h-[48px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold hover:border-primary-300 dark:border-gray-700 dark:bg-gray-950 ${LINK_FOCUS}`}
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
                  className={`flex min-h-[48px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold hover:border-primary-300 dark:border-gray-700 dark:bg-gray-950 ${LINK_FOCUS}`}
                >
                  <MessageCircle className="h-5 w-5 text-green-700 dark:text-green-300" aria-hidden="true" />
                  Message us on WhatsApp
                </a>
              </li>
              <li className="flex min-h-[48px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-sm font-bold dark:border-gray-700 dark:bg-gray-950">
                <MapPin className="h-5 w-5 text-primary-700 dark:text-primary-300" aria-hidden="true" />
                La Trade Fair, Accra, Ghana
              </li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-5">
              <Link
                href="/help"
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${LINK_FOCUS}`}
              >
                Help centre
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/trust"
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${LINK_FOCUS}`}
              >
                Trust &amp; safety
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
          </div>
        </section>
      </main>
    </MainLayout>
  );
}
