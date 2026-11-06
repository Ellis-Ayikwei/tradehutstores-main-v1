/**
 * Returns and refunds: /returns
 *
 * Static, server-rendered policy page. It describes the process only. It does not state a return
 * window, refund time or fee because those are not defined in the platform settings. Add them here
 * once the business confirms them (see the hand-off note for the list of facts to confirm).
 */

import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Camera,
  ClipboardList,
  FileSearch,
  MapPin,
  MessageCircle,
  PackageCheck,
  PackageX,
  Phone,
  ReceiptText,
  Store,
  Undo2,
  Wallet,
} from "lucide-react";
import MainLayout from "@/components/Layouts/MainLayout";

export const metadata: Metadata = {
  title: "Returns & Refunds | TradeHut Stores",
  description:
    "How to return an item you bought on TradeHut, what to prepare, and how refunds and disputes work.",
};

const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: ReceiptText,
    title: "Check the seller's return policy",
    text: "Sellers can state their return policy on their store and listings. Read it before you buy, and again before you ask for a return.",
  },
  {
    icon: ClipboardList,
    title: "Tell us what is wrong",
    text: "Open the order from My orders and start a dispute or return request. Say what the problem is and what you would like, such as a refund or a replacement.",
  },
  {
    icon: Camera,
    title: "Add your evidence",
    text: "Attach clear photos or documents, for example the item, the packaging and any damage. This helps the request get reviewed faster.",
  },
  {
    icon: FileSearch,
    title: "The request is reviewed",
    text: "The seller is asked to respond. If you and the seller cannot agree, TradeHut can review the evidence from both sides.",
  },
  {
    icon: Undo2,
    title: "Send the item back if asked",
    text: "If your return is approved you will be told how and where to send the item. Keep any proof of postage or hand-over.",
  },
  {
    icon: Wallet,
    title: "Receive your refund",
    text: "Once the return is confirmed, the refund is issued. How and when it reaches you depends on how you paid.",
  },
];

const PREPARE: string[] = [
  "Keep the item, its packaging and any accessories together.",
  "Take photos of the item and of any damage or fault.",
  "Keep your order number and any messages with the seller.",
  "Do not send the item back until the request is approved and you have return instructions.",
];

const ELIGIBLE: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: PackageX,
    title: "Damaged, faulty or wrong item",
    text: "If your item arrives damaged, does not work or is not what you ordered, raise it with us as soon as you notice.",
  },
  {
    icon: Store,
    title: "Not as described",
    text: "If the item is clearly different from the listing, open a dispute and include photos that show the difference.",
  },
  {
    icon: PackageCheck,
    title: "Changed your mind",
    text: "Whether a change-of-mind return is accepted depends on the seller's return policy for that item.",
  },
];

const LINK_FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950";

export default function ReturnsPage() {
  return (
    <MainLayout>
      <main className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {/* Header */}
        <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto py-8 sm:py-12 lg:py-16">
            <p className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
              Buyer policies
            </p>
            <h1 className="mt-2 font-syne text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              Returns &amp; refunds
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-700 dark:text-gray-300">
              If something is wrong with your order, here is how a return works and what to prepare. Return
              eligibility depends on the item and on the seller&apos;s return policy.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/account/orders"
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 ${LINK_FOCUS}`}
              >
                Go to My orders
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/account/disputes"
                className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-sm font-bold text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 ${LINK_FOCUS}`}
              >
                Open the dispute centre
              </Link>
            </div>
          </div>
        </section>

        {/* How a return works */}
        <section className="container mx-auto py-10 sm:py-14" aria-labelledby="how-returns-work">
          <div className="mb-6 max-w-2xl">
            <h2 id="how-returns-work" className="font-syne text-2xl font-bold sm:text-3xl">
              How a return works
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              Follow these steps from start to refund.
            </p>
          </div>
          <ol className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li
                key={title}
                className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-mono text-xs font-bold text-gray-600 dark:text-gray-400">Step {i + 1}</p>
                  <h3 className="text-base font-bold leading-snug">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* When you can return */}
        <section className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
          <div className="container mx-auto py-10 sm:py-14">
            <div className="mb-6 max-w-2xl">
              <h2 className="font-syne text-2xl font-bold sm:text-3xl">Common reasons for a return</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                Each request is looked at on its own evidence.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {ELIGIBLE.map(({ icon: Icon, title, text }) => (
                <li
                  key={title}
                  className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-950"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-3 text-base font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Prepare + contact */}
        <section className="container mx-auto grid gap-8 py-10 sm:py-14 lg:grid-cols-2">
          <div>
            <h2 className="font-syne text-2xl font-bold sm:text-3xl">Before you send anything back</h2>
            <ul className="mt-4 space-y-3">
              {PREPARE.map((item) => (
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

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="font-syne text-xl font-bold">Need help with a return?</h2>
            <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              Contact us with your order number and we will point you to the next step.
            </p>
            <ul className="mt-4 space-y-2">
              <li>
                <a
                  href="tel:+233248138722"
                  className={`flex min-h-[48px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold hover:border-primary-300 dark:border-gray-700 dark:bg-gray-950 ${LINK_FOCUS}`}
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
                  className={`flex min-h-[48px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold hover:border-primary-300 dark:border-gray-700 dark:bg-gray-950 ${LINK_FOCUS}`}
                >
                  <MessageCircle className="h-5 w-5 text-green-700 dark:text-green-300" aria-hidden="true" />
                  Message us on WhatsApp
                </a>
              </li>
              <li className="flex min-h-[48px] items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 text-sm font-bold dark:border-gray-700 dark:bg-gray-950">
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
                href="/buyer-protection"
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${LINK_FOCUS}`}
              >
                Buyer protection
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
