"use client";

/**
 * Help centre body: search, topic filters, FAQ accordion and the contact block.
 *
 * Content is static. Contact details are the official business details only
 * (AGENTS.md section 1b): phone 024 813 8722 and La Trade Fair, Accra, Ghana.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ChevronDown,
  CreditCard,
  Gavel,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  RotateCcw,
  Search,
  Store,
  UserCog,
  X,
} from "lucide-react";

type TopicKey = "orders" | "payments" | "returns" | "account" | "selling" | "bidding";

interface Topic {
  key: TopicKey;
  label: string;
  description: string;
  icon: LucideIcon;
}

interface Faq {
  topic: TopicKey;
  question: string;
  answer: string;
  href?: string;
  hrefLabel?: string;
}

const TOPICS: Topic[] = [
  { key: "orders", label: "Orders & delivery", description: "Track an order or report a problem.", icon: Package },
  { key: "payments", label: "Payments", description: "Paying safely at checkout.", icon: CreditCard },
  { key: "returns", label: "Returns & refunds", description: "Send an item back.", icon: RotateCcw },
  { key: "account", label: "Account & security", description: "Sign in, verify, stay safe.", icon: UserCog },
  { key: "selling", label: "Selling", description: "Start selling and handle disputes.", icon: Store },
  { key: "bidding", label: "Auctions & RFQs", description: "Bidding and request for quotes.", icon: Gavel },
];

const FAQS: Faq[] = [
  {
    topic: "orders",
    question: "How do I track my order?",
    answer:
      "Sign in and open My orders in your account. Each order shows its current status and the items in it.",
    href: "/account/orders",
    hrefLabel: "Go to My orders",
  },
  {
    topic: "orders",
    question: "Can I cancel an order?",
    answer:
      "Contact us as soon as possible and have your order number ready. Whether an order can still be cancelled depends on whether the seller has already shipped it.",
  },
  {
    topic: "orders",
    question: "My order has not arrived, or it is not what I ordered. What should I do?",
    answer:
      "Open a dispute from your account and describe what happened. You can attach photos or documents as evidence. You can also contact us using the details on this page.",
    href: "/account/disputes",
    hrefLabel: "Open the dispute centre",
  },
  {
    topic: "payments",
    question: "Which payment methods can I use?",
    answer:
      "The payment methods available to you are shown at checkout. Methods you have saved are listed in your account.",
    href: "/account/payment-methods",
    hrefLabel: "View saved payment methods",
  },
  {
    topic: "payments",
    question: "How do I stay safe when paying?",
    answer:
      "Pay only through the TradeHut checkout. Do not send money to a seller outside the platform, and never share your password or one-time codes with anyone, including people who say they work for TradeHut.",
    href: "/buyer-protection",
    hrefLabel: "Read about buyer protection",
  },
  {
    topic: "returns",
    question: "How do I return an item?",
    answer:
      "Start from your order, tell us what is wrong and why you want to return it. The seller and TradeHut review the request, and if it is approved you will be told how to send the item back. The returns page walks through each step.",
    href: "/returns",
    hrefLabel: "How returns work",
  },
  {
    topic: "returns",
    question: "When will I get my refund?",
    answer:
      "Refund timing depends on how you paid and on the outcome of the return review. You will be told what to expect when your return is approved. If you are unsure, contact us.",
  },
  {
    topic: "account",
    question: "I forgot my password. How do I reset it?",
    answer:
      "Use the password reset page and follow the steps. If you do not receive what you expect, contact us.",
    href: "/auth/forgot-password",
    hrefLabel: "Reset password",
  },
  {
    topic: "account",
    question: "Why do I need to verify my identity?",
    answer:
      "Verification helps keep buyers and sellers safe and may be needed before you can bid or sell. You can complete it from your account.",
    href: "/account/verification",
    hrefLabel: "Go to verification",
  },
  {
    topic: "account",
    question: "How do I report a suspicious listing, seller or message?",
    answer:
      "Use the reports page in your account to flag it. For anything urgent, contact us directly.",
    href: "/account/reports",
    hrefLabel: "Report a problem",
  },
  {
    topic: "selling",
    question: "How do I start selling on TradeHut?",
    answer:
      "Start from the Sell page. Seller accounts go through verification before they can list items.",
    href: "/sell",
    hrefLabel: "Start selling",
  },
  {
    topic: "selling",
    question: "A buyer opened a dispute on my order. What happens next?",
    answer:
      "You will be asked for your side of the story and any evidence. The seller disputes page explains the process.",
    href: "/seller/disputes",
    hrefLabel: "How seller disputes work",
  },
  {
    topic: "bidding",
    question: "How do auctions work?",
    answer:
      "Each bid has to beat the current price by the minimum increment shown on the auction page. The auction page also shows the end time and any reserve or buy-now option.",
    href: "/auctions",
    hrefLabel: "Browse auctions",
  },
  {
    topic: "bidding",
    question: "What is an RFQ?",
    answer:
      "A request for quotation lets you describe what you need, such as the item and quantity. Suppliers can then send you their quotes, and you choose the one you want.",
    href: "/rfq",
    hrefLabel: "Go to RFQs",
  },
];

const PHONE_DISPLAY = "024 813 8722";
const PHONE_TEL = "tel:+233248138722";
const WHATSAPP_URL = "https://wa.me/233248138722";
const LOCATION = "La Trade Fair, Accra, Ghana";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950";

export default function HelpCenter() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<TopicKey | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => {
      if (topic && f.topic !== topic) return false;
      if (!q) return true;
      return f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    });
  }, [query, topic]);

  const activeTopic = TOPICS.find((t) => t.key === topic);
  const filtered = query.trim().length > 0 || topic !== null;

  function reset() {
    setQuery("");
    setTopic(null);
  }

  return (
    <main className="bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      {/* Header + search */}
      <section className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="container mx-auto py-8 sm:py-12 lg:py-14">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
            Help centre
          </p>
          <h1 className="mt-2 font-syne text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
            How can we help?
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-700 dark:text-gray-300">
            Search the answers below or pick a topic. If you cannot find what you need, call or message us.
          </p>

          <form
            role="search"
            onSubmit={(e) => e.preventDefault()}
            className="mt-6 flex max-w-2xl items-center gap-2"
          >
            <label htmlFor="help-search" className="sr-only">
              Search help articles
            </label>
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500"
                aria-hidden="true"
              />
              <input
                id="help-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search, e.g. refund, track order, bid"
                autoComplete="off"
                className={`h-12 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-10 text-base text-gray-900 placeholder:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 ${FOCUS}`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className={`absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 ${FOCUS}`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      {/* Topics */}
      <section className="container mx-auto py-8 sm:py-10" aria-labelledby="help-topics">
        <h2 id="help-topics" className="font-syne text-xl font-bold sm:text-2xl">
          Browse by topic
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {TOPICS.map(({ key, label, description, icon: Icon }) => {
            const active = topic === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTopic(active ? null : key)}
                  className={`flex h-full min-h-[44px] w-full flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors sm:p-4 ${FOCUS} ${
                    active
                      ? "border-primary-700 bg-primary-50 dark:border-primary-300 dark:bg-gray-800"
                      : "border-gray-200 bg-white hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-300"
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold leading-snug">{label}</span>
                  <span className="text-xs leading-snug text-gray-600 dark:text-gray-400">{description}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* FAQ */}
      <section
        className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
        aria-labelledby="help-faq"
      >
        <div className="container mx-auto py-8 sm:py-12">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="help-faq" className="font-syne text-xl font-bold sm:text-2xl">
                {activeTopic ? activeTopic.label : "Frequently asked questions"}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400" role="status" aria-live="polite">
                {results.length} {results.length === 1 ? "answer" : "answers"}
                {filtered ? " found" : ""}
              </p>
            </div>
            {filtered && (
              <button
                type="button"
                onClick={reset}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${FOCUS}`}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>

          {results.length === 0 ? (
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-950">
              <h3 className="text-base font-bold">No answers match your search</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-gray-600 dark:text-gray-400">
                Try a different word, or contact us and we will help you directly.
              </p>
              <div className="mt-4 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={reset}
                  className={`inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-900 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS}`}
                >
                  Show all answers
                </button>
                <a
                  href={PHONE_TEL}
                  className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary-700 px-4 text-sm font-bold text-white hover:bg-primary-800 ${FOCUS}`}
                >
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  Call {PHONE_DISPLAY}
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-5 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-950">
              {results.map((f) => (
                <details key={f.question} className="group">
                  <summary
                    className={`flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-left text-base font-semibold hover:bg-gray-50 dark:hover:bg-gray-900 sm:px-5 [&::-webkit-details-marker]:hidden ${FOCUS}`}
                  >
                    <span>{f.question}</span>
                    <ChevronDown
                      className="h-5 w-5 shrink-0 text-primary-700 transition-transform group-open:rotate-180 dark:text-primary-300"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="px-4 pb-4 sm:px-5">
                    <p className="max-w-3xl text-sm leading-relaxed text-gray-700 dark:text-gray-300">{f.answer}</p>
                    {f.href && (
                      <Link
                        href={f.href}
                        className={`mt-2 inline-flex min-h-[44px] items-center gap-1.5 rounded text-sm font-bold text-primary-700 hover:underline dark:text-primary-300 ${FOCUS}`}
                      >
                        {f.hrefLabel}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contact */}
      <section className="container mx-auto py-10 sm:py-14" aria-labelledby="help-contact">
        <div className="max-w-2xl">
          <h2 id="help-contact" className="font-syne text-2xl font-bold sm:text-3xl">
            Contact us
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            Speak to our team by phone or WhatsApp, or visit us at La Trade Fair. Please have your order number ready if
            your question is about an order.
          </p>
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
          <li>
            <a
              href={PHONE_TEL}
              className={`flex min-h-[72px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 ${FOCUS}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300">
                <Phone className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  Call us
                </span>
                <span className="block font-mono text-base font-bold">{PHONE_DISPLAY}</span>
              </span>
            </a>
          </li>
          <li>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex min-h-[72px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 ${FOCUS}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700 dark:bg-gray-800 dark:text-green-300">
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  WhatsApp
                </span>
                <span className="block text-base font-bold">Message us on WhatsApp</span>
              </span>
            </a>
          </li>
          <li className="flex min-h-[72px] items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-gray-800 dark:text-primary-300">
              <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                Find us
              </span>
              <span className="block text-base font-bold">{LOCATION}</span>
            </span>
          </li>
        </ul>

        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/returns"
            className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 ${FOCUS}`}
          >
            Returns &amp; refunds
            <ArrowRight className="h-4 w-4 text-primary-700 dark:text-primary-300" aria-hidden="true" />
          </Link>
          <Link
            href="/buyer-protection"
            className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 ${FOCUS}`}
          >
            Buyer protection
            <ArrowRight className="h-4 w-4 text-primary-700 dark:text-primary-300" aria-hidden="true" />
          </Link>
          <Link
            href="/account/disputes"
            className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold hover:border-primary-300 dark:border-gray-700 dark:bg-gray-900 ${FOCUS}`}
          >
            Dispute centre
            <ArrowRight className="h-4 w-4 text-primary-700 dark:text-primary-300" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
