"use client";

/**
 * Help Center — /help
 *
 * Ported from stitch_full_website_redesign_expansion/tradehut_help_center/code.html
 * Design-system tokens: Material-3 derived (see .claude/design-system/tokens.md).
 *
 * Layout sections:
 *  1. Hero Search — centered, large search input, popular-search pills
 *  2. Category Grid — 3-col card grid (Buying, Selling, Security, Shipping, Returns, Business/API)
 *  3. Popular Articles — 2-col list of most-viewed help articles
 *  4. FAQ Accordion — expand/collapse (interactive — requires "use client")
 *  5. Contact Block — chat / email / phone cards with response-time badges
 *  6. System Status bento + "Still Need Help?" CTA
 *
 * TODOs:
 * - TODO: fetch /api/help/articles/?popular=true   (replace POPULAR_ARTICLES with real data)
 * - TODO: fetch /api/help/faq/                      (replace FAQ_ITEMS with real data)
 * - TODO: wire search input to GET /api/help/search?q= with debounce
 * - TODO: wire "Contact Support" button to live chat SDK or contact form route
 */

import { useState } from "react";
import Link from "next/link";
import MainLayout from "@/components/Layouts/MainLayout";
import {
  Search,
  ShoppingCart,
  Tag,
  ShieldCheck,
  Truck,
  RefreshCcw,
  Terminal,
  FileText,
  ChevronDown,
  ArrowRight,
  MessageCircle,
  Mail,
  Phone,
  Headphones,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// ─── Static mock data (replace with API calls per TODOs above) ───────────────

interface CategoryLink {
  label: string;
  href: string;
}

interface CategoryItem {
  id: string;
  Icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  iconHoverBg: string;
  title: string;
  description: string;
  links: CategoryLink[];
}

const CATEGORIES: CategoryItem[] = [
  {
    id: "buying",
    Icon: ShoppingCart,
    iconBg: "bg-surface-container-highest",
    iconColor: "text-primary",
    iconHoverBg: "group-hover:bg-primary",
    title: "Buying on TradeHut",
    description:
      "Learn about placing bids, RFQ processes, and making secure payments through our portal.",
    links: [
      { label: "Making your first bid", href: "/help/buying/first-bid" },
      { label: "Understanding RFQ status", href: "/help/buying/rfq-status" },
    ],
  },
  {
    id: "selling",
    Icon: Tag,
    iconBg: "bg-secondary-container",
    iconColor: "text-on-secondary-container",
    iconHoverBg: "group-hover:bg-secondary-green",
    title: "Selling on TradeHut",
    description:
      "Manage your inventory, optimize your listings, and track your commercial sales performance.",
    links: [
      { label: "Creating effective listings", href: "/help/selling/listings" },
      {
        label: "Managing auction reserves",
        href: "/help/selling/auction-reserves",
      },
    ],
  },
  {
    id: "security",
    Icon: ShieldCheck,
    iconBg: "bg-surface-variant",
    iconColor: "text-on-surface-variant",
    iconHoverBg: "group-hover:bg-on-surface-variant",
    title: "Account Security",
    description:
      "Protect your credentials with MFA, manage permissions, and review login history.",
    links: [
      { label: "Enabling 2FA", href: "/help/security/2fa" },
      { label: "Resetting passwords", href: "/help/security/passwords" },
    ],
  },
  {
    id: "shipping",
    Icon: Truck,
    iconBg: "bg-tertiary-fixed",
    iconColor: "text-tertiary",
    iconHoverBg: "group-hover:bg-tertiary",
    title: "Shipping & Logistics",
    description:
      "Carrier integrations, international customs handling, and tracking your global shipments.",
    links: [
      {
        label: "Printing shipping labels",
        href: "/help/shipping/labels",
      },
      {
        label: "Customs documentation",
        href: "/help/shipping/customs",
      },
    ],
  },
  {
    id: "returns",
    Icon: RefreshCcw,
    iconBg: "bg-error-container",
    iconColor: "text-error",
    iconHoverBg: "group-hover:bg-error",
    title: "Returns & Refunds",
    description:
      "Understanding policy frameworks, initiating returns, and monitoring refund status.",
    links: [
      { label: "The refund lifecycle", href: "/help/returns/lifecycle" },
      { label: "Opening a dispute", href: "/help/returns/disputes" },
    ],
  },
  {
    id: "api",
    Icon: Terminal,
    iconBg: "bg-primary-fixed",
    iconColor: "text-on-primary-fixed",
    iconHoverBg: "group-hover:bg-on-primary-fixed",
    title: "Business & API",
    description:
      "Technical documentation for integrating our high-frequency trade engine into your workflow.",
    links: [
      {
        label: "Authentication protocols",
        href: "/help/api/authentication",
      },
      { label: "Webhook documentation", href: "/help/api/webhooks" },
    ],
  },
];

// TODO: fetch /api/help/articles/?popular=true
const POPULAR_ARTICLES = [
  {
    id: 1,
    title: "How to place a bid and win an auction",
    category: "Buying",
    views: "12.4k views",
    href: "/help/buying/first-bid",
  },
  {
    id: 2,
    title: "Setting up your seller profile and first listing",
    category: "Selling",
    views: "9.1k views",
    href: "/help/selling/listings",
  },
  {
    id: 3,
    title: "Submitting an RFQ and reviewing quotes",
    category: "RFQs",
    views: "7.8k views",
    href: "/help/buying/rfq-status",
  },
  {
    id: 4,
    title: "Enabling two-factor authentication (2FA)",
    category: "Security",
    views: "6.5k views",
    href: "/help/security/2fa",
  },
  {
    id: 5,
    title: "Printing international shipping labels",
    category: "Shipping",
    views: "5.9k views",
    href: "/help/shipping/labels",
  },
  {
    id: 6,
    title: "How to initiate a return and track refund status",
    category: "Returns",
    views: "5.3k views",
    href: "/help/returns/lifecycle",
  },
];

// TODO: fetch /api/help/faq/
const FAQ_ITEMS = [
  {
    id: "faq-1",
    question: "How do I get started as a buyer on TradeHut?",
    answer:
      "Create a free account, complete identity verification, and browse our marketplace. You can place bids on auctions, submit RFQs to suppliers, or purchase fixed-price listings immediately. All payment methods are secured via our buyer-protection escrow system.",
  },
  {
    id: "faq-2",
    question: "What is an RFQ and how does it work?",
    answer:
      "A Request for Quotation (RFQ) lets you specify exactly what you need — quantity, specs, delivery window — and invite vetted suppliers to submit competitive quotes. You review all bids in one dashboard and accept the best offer. The process typically takes 24–72 hours.",
  },
  {
    id: "faq-3",
    question: "How are auction reserve prices set?",
    answer:
      "Sellers set a confidential reserve price when creating a listing. If the highest bid at close meets or exceeds that reserve, the auction completes. If not, no sale occurs and buyers are notified automatically. Sellers can lower the reserve at any time before close.",
  },
  {
    id: "faq-4",
    question: "What buyer protections are in place?",
    answer:
      "All transactions are covered by TradeHut Buyer Protection. Funds are held in escrow until you confirm receipt and satisfaction. You have 72 hours post-delivery to raise a dispute. Our resolution team mediates within 5 business days.",
  },
  {
    id: "faq-5",
    question: "How do I integrate with the TradeHut API?",
    answer:
      "Generate an API key in your seller dashboard under Settings → API Access. We support OAuth 2.0 and API-key authentication. Full documentation covering REST endpoints, webhooks, and rate limits is available in the Business & API help category.",
  },
];

interface ContactOption {
  id: string;
  Icon: LucideIcon;
  title: string;
  description: string;
  badge: string;
  badgeBg: string;
  action: string;
  href: string;
  accentBg: string;
  accentBorder: string;
}

const CONTACT_OPTIONS: ContactOption[] = [
  {
    id: "chat",
    Icon: MessageCircle,
    title: "Live Chat",
    description: "Talk to a specialist right now.",
    badge: "< 2 min response",
    badgeBg: "bg-secondary-container text-on-secondary-container",
    action: "Start Chat",
    href: "#chat",
    accentBg: "bg-surface-container-low",
    accentBorder: "border-outline-variant/20",
  },
  {
    id: "email",
    Icon: Mail,
    title: "Email Support",
    description: "Send us a detailed message and we'll reply within 24 hours.",
    badge: "< 24 hr response",
    badgeBg: "bg-tertiary-fixed text-on-tertiary-fixed",
    action: "Send Email",
    href: "mailto:support@tradehut.com",
    accentBg: "bg-surface-container-low",
    accentBorder: "border-outline-variant/20",
  },
  {
    id: "phone",
    Icon: Phone,
    title: "Phone Support",
    description: "Available Mon–Fri 08:00–20:00 UTC for enterprise accounts.",
    badge: "Enterprise only",
    badgeBg: "bg-surface-container text-on-surface-variant",
    action: "Call Us",
    href: "tel:+18005551234",
    accentBg: "bg-surface-container-low",
    accentBorder: "border-outline-variant/20",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryCard({
  Icon,
  iconBg,
  iconColor,
  iconHoverBg,
  title,
  description,
  links,
}: CategoryItem) {
  return (
    <div className="bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer group">
      <div
        className={`w-14 h-14 ${iconBg} rounded-lg flex items-center justify-center mb-6 ${iconColor} ${iconHoverBg} group-hover:text-white transition-colors duration-300`}
      >
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-headline text-xl font-bold mb-3 text-on-surface">
        {title}
      </h3>
      <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
        {description}
      </p>
      <div className="space-y-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center text-sm font-bold text-on-surface hover:text-primary transition-colors"
          >
            <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function FaqAccordion() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div
            key={item.id}
            className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden"
          >
            <button
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between px-6 py-5 min-h-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99] transition-transform"
            >
              <span className="font-headline font-bold text-base md:text-lg text-on-surface pr-4">
                {item.question}
              </span>
              <ChevronDown
                className={`text-outline flex-shrink-0 w-5 h-5 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {/* Animated expand/collapse */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <p className="px-6 pb-6 text-sm text-on-surface-variant leading-relaxed">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContactCard({
  Icon,
  title,
  description,
  badge,
  badgeBg,
  action,
  href,
  accentBg,
  accentBorder,
}: ContactOption) {
  return (
    <div
      className={`${accentBg} border ${accentBorder} rounded-2xl p-6 md:p-8 flex flex-col gap-4 shadow-card hover:shadow-card-hover transition-all duration-300`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="w-12 h-12 bg-surface-container-highest rounded-xl flex items-center justify-center text-primary flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full ${badgeBg} flex-shrink-0`}
        >
          {badge}
        </span>
      </div>
      <div>
        <h3 className="font-headline font-bold text-lg text-on-surface mb-1">
          {title}
        </h3>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {description}
        </p>
      </div>
      <Link
        href={href}
        className="mt-auto inline-flex items-center gap-2 font-bold text-sm text-primary hover:underline active:scale-95 transition-transform"
      >
        {action}
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface">

        {/* ── 1. Hero Search ─────────────────────────────────────────────── */}
        <section className="relative bg-surface py-16 md:py-24 lg:py-32 overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-primary-container/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-tertiary-container/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-3xl mx-auto px-4 md:px-8 text-center">
            <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-bold text-on-surface tracking-tighter leading-[0.95] mb-8">
              How can we help you today?
            </h1>

            {/* Search input */}
            {/* TODO: wire to GET /api/help/search?q= with debounce */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-5 md:left-6 flex items-center pointer-events-none">
                <Search className="text-outline w-6 h-6" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for articles, guides, or troubleshooting..."
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl py-4 md:py-6 pl-14 md:pl-16 pr-4 md:pr-32 text-base md:text-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all shadow-card group-hover:shadow-card-hover placeholder:text-outline outline-none"
              />
              {/* Keyboard hint — hidden on mobile */}
              <div className="absolute inset-y-3 right-3 hidden md:flex items-center">
                <kbd className="bg-surface-container-highest/50 px-3 py-1.5 rounded-md font-mono text-xs text-on-surface-variant uppercase tracking-widest border border-outline-variant/15">
                  Search
                </kbd>
              </div>
            </div>

            {/* Popular search pills */}
            <div className="mt-6 md:mt-8 flex flex-wrap justify-center gap-2 md:gap-3">
              <span className="text-sm font-body text-on-surface-variant">
                Popular searches:
              </span>
              {["Shipping labels", "API integration", "Auction limits"].map(
                (term) => (
                  <Link
                    key={term}
                    href={`/help/search?q=${encodeURIComponent(term)}`}
                    className="text-sm font-body text-primary hover:underline"
                  >
                    {term}
                  </Link>
                )
              )}
            </div>
          </div>
        </section>

        {/* ── 2. Category Grid ────────────────────────────────────────────── */}
        <section className="bg-surface-container-low py-16 md:py-20 lg:py-24">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
            {/* Section header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-10 md:mb-16">
              <div>
                <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-2">
                  Browse by category
                </h2>
                <p className="text-on-surface-variant max-w-md text-sm leading-relaxed">
                  Find specialized assistance across the entire TradeHut
                  ecosystem.
                </p>
              </div>
              <Link
                href="/help/topics"
                className="hidden md:flex items-center gap-2 text-primary font-bold group"
              >
                View all topics
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Cards — 2 col → 3 col → 3 col (tiles benefit from 2 cols at mobile) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {CATEGORIES.map((cat) => (
                <CategoryCard key={cat.id} {...cat} />
              ))}
            </div>

            {/* Mobile "view all" link */}
            <div className="mt-8 flex justify-center md:hidden">
              <Link
                href="/help/topics"
                className="flex items-center gap-2 text-primary font-bold"
              >
                View all topics
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 3. Popular Articles ─────────────────────────────────────────── */}
        {/* TODO: fetch /api/help/articles/?popular=true */}
        <section className="bg-surface py-16 md:py-20 lg:py-24">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
            <div className="mb-10 md:mb-14">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Most viewed
              </span>
              <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface">
                Popular articles
              </h2>
            </div>

            {/* 1 col → 2 col grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {POPULAR_ARTICLES.map((article, idx) => (
                <Link
                  key={article.id}
                  href={article.href}
                  className="flex items-center gap-4 bg-surface-container-lowest rounded-xl p-4 md:p-5 shadow-card hover:shadow-card-hover transition-all duration-300 group"
                >
                  {/* Article number */}
                  <span className="font-mono text-2xl font-bold text-outline/40 w-8 flex-shrink-0 text-center">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm md:text-base text-on-surface group-hover:text-primary transition-colors truncate md:whitespace-normal">
                      {article.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                        {article.category}
                      </span>
                      <span className="text-xs text-outline">{article.views}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-outline group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. FAQ Accordion ────────────────────────────────────────────── */}
        {/* TODO: fetch /api/help/faq/ */}
        <section className="bg-surface-container-low py-16 md:py-20 lg:py-24">
          <div className="max-w-3xl mx-auto px-4 md:px-8">
            <div className="text-center mb-10 md:mb-14">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Quick answers
              </span>
              <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface">
                Frequently asked questions
              </h2>
            </div>
            <FaqAccordion />
          </div>
        </section>

        {/* ── 5. Contact Options ──────────────────────────────────────────── */}
        <section className="bg-surface py-16 md:py-20 lg:py-24">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
            <div className="text-center mb-10 md:mb-14">
              <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-3">
                Still need help?
              </h2>
              <p className="text-on-surface-variant text-sm max-w-md mx-auto leading-relaxed">
                Our specialist support team is available 24/7 to assist with
                complex inquiries or technical disputes.
              </p>
            </div>

            {/* 1 col → 3 col grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
              {CONTACT_OPTIONS.map((opt) => (
                <ContactCard key={opt.id} {...opt} />
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. System Status Bento + "Need Help" CTA ───────────────────── */}
        <section className="py-16 md:py-20 lg:py-24 bg-surface-container-low">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* Status card — spans 2 cols on lg */}
              <div className="lg:col-span-2 bg-surface-container-low p-8 md:p-10 rounded-2xl flex flex-col md:flex-row gap-8 items-start md:items-center border border-outline-variant/10 shadow-card">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container rounded-full text-on-secondary-container text-xs font-bold uppercase tracking-widest mb-4">
                    <span className="w-2 h-2 bg-secondary-green rounded-full" />
                    All Systems Operational
                  </div>
                  <h3 className="font-headline text-2xl md:text-3xl font-bold mb-4 text-on-surface">
                    System Status
                  </h3>
                  <p className="text-on-surface-variant mb-6 leading-relaxed text-sm">
                    Our marketplace and auction engines are performing at peak
                    efficiency. Real-time data sync is active across all global
                    nodes.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-lowest/80 p-4 rounded-xl">
                      <div className="text-xs text-on-surface-variant font-mono uppercase mb-1">
                        Response Time
                      </div>
                      <div className="text-xl font-mono font-bold text-on-surface">
                        42ms
                      </div>
                    </div>
                    <div className="bg-surface-container-lowest/80 p-4 rounded-xl">
                      <div className="text-xs text-on-surface-variant font-mono uppercase mb-1">
                        Uptime
                      </div>
                      <div className="text-xl font-mono font-bold text-on-surface">
                        99.98%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA card — primary gradient */}
              <div className="primary-gradient p-8 md:p-10 rounded-2xl text-white relative overflow-hidden flex flex-col justify-between min-h-[260px]">
                {/* Decorative icon */}
                <div className="absolute top-0 right-0 p-6 opacity-20 translate-x-4 -translate-y-4 pointer-events-none select-none">
                  <Headphones className="w-28 h-28" strokeWidth={0.75} />
                </div>
                <div>
                  <h3 className="font-headline text-2xl md:text-3xl font-bold mb-4 relative z-10">
                    Still need help?
                  </h3>
                  <p className="text-white/80 mb-8 relative z-10 leading-relaxed text-sm">
                    Our specialist support team is available 24/7 to assist with
                    complex inquiries or technical disputes.
                  </p>
                </div>
                <button className="bg-surface-container-lowest text-primary font-bold py-3 md:py-4 px-6 md:px-8 rounded-xl transition-all active:scale-95 shadow-lg hover:shadow-xl w-full md:w-auto">
                  Contact Support
                </button>
              </div>

            </div>
          </div>
        </section>

      </div>
    </MainLayout>
  );
}
