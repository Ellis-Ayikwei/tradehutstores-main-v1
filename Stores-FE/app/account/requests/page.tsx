"use client";

/**
 * Buyer's RFQ dashboard — "My Requests"
 * Route: /account/requests
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_my_requests/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import {
  Gavel,
  FileText,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (from .claude/design-system/bid-rfq-spec.md)
// ---------------------------------------------------------------------------
type RFQStatus = "open" | "reviewing" | "awarded" | "closed";

interface DemoRFQ {
  id: string;
  reference: string;
  title: string;
  description: string;
  category: string;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  status: RFQStatus;
  quoteCount: number;
  timeLabel: string; // e.g. "4D REMAINING" or "EXPIRED"
  postedDate: string;
  /** placeholder image URL — replace with real asset once API is wired */
  imageUrl: string;
  imageAlt: string;
  supplierAvatars: { src: string; alt: string }[];
  hasActiveOffers: boolean;
}

// ---------------------------------------------------------------------------
// Demo data
// TODO: fetch from /api/rfqs/?mine=true&status=... (replace inline data below)
// ---------------------------------------------------------------------------
const DEMO_RFQS: DemoRFQ[] = [
  {
    id: "rfq-001",
    reference: "RFQ-9921",
    title: "Bulk Order: Quantum-Ready Motherboards",
    description:
      "Seeking 500 units of custom-spec industrial motherboards with redundant power supply compatibility.",
    category: "Tech / Sourcing",
    budgetMin: 12000,
    budgetMax: 15000,
    currency: "USD",
    status: "open",
    quoteCount: 12,
    timeLabel: "4D REMAINING",
    postedDate: "Apr 10, 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
    imageAlt: "Electronic circuit boards",
    supplierAvatars: [
      {
        src: "https://i.pravatar.cc/32?img=11",
        alt: "Supplier A",
      },
      {
        src: "https://i.pravatar.cc/32?img=12",
        alt: "Supplier B",
      },
    ],
    hasActiveOffers: true,
  },
  {
    id: "rfq-002",
    reference: "RFQ-9845",
    title: "Luxury Leather Goods Sample Batch",
    description:
      "Niche designer brand seeking artisan workshop for initial 20-piece prototype run of vegetable-tanned bags.",
    category: "Fashion / Retail",
    budgetMin: 2500,
    budgetMax: 4000,
    currency: "USD",
    status: "reviewing",
    quoteCount: 3,
    timeLabel: "EXPIRED",
    postedDate: "Mar 28, 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80",
    imageAlt: "Premium leather bags",
    supplierAvatars: [
      {
        src: "https://i.pravatar.cc/32?img=21",
        alt: "Supplier C",
      },
    ],
    hasActiveOffers: false,
  },
  {
    id: "rfq-003",
    reference: "RFQ-9899",
    title: "Precision CNC Aluminum Components",
    description:
      "Aerospace-grade tolerance requirements for high-stress structural joints. Total 150 pieces with anodized finish.",
    category: "Manufacturing",
    budgetMin: 8000,
    budgetMax: 10000,
    currency: "USD",
    status: "open",
    quoteCount: 24,
    timeLabel: "12H REMAINING",
    postedDate: "Apr 18, 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1565043589221-1a6fd9ae45c7?w=600&q=80",
    imageAlt: "CNC machining workshop",
    supplierAvatars: [
      {
        src: "https://i.pravatar.cc/32?img=31",
        alt: "Supplier D",
      },
      {
        src: "https://i.pravatar.cc/32?img=32",
        alt: "Supplier E",
      },
    ],
    hasActiveOffers: true,
  },
  {
    id: "rfq-004",
    reference: "RFQ-9876",
    title: "Eco-Friendly Shipping Solutions",
    description:
      "Seeking a logistics partner specialized in zero-carbon warehousing and recycled packaging fulfillment for EU market.",
    category: "Service / Logistics",
    budgetMin: 5000,
    budgetMax: 7500,
    currency: "USD",
    status: "open",
    quoteCount: 8,
    timeLabel: "2D REMAINING",
    postedDate: "Apr 15, 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&q=80",
    imageAlt: "Eco-friendly logistics warehouse",
    supplierAvatars: [],
    hasActiveOffers: true,
  },
  {
    id: "rfq-005",
    reference: "RFQ-9801",
    title: "Industrial Safety Equipment — PPE Batch",
    description:
      "Need 1,000 units of EN ISO 20345 compliant safety boots and helmets for construction site crew.",
    category: "Industrial / Safety",
    budgetMin: 18000,
    budgetMax: 22000,
    currency: "USD",
    status: "awarded",
    quoteCount: 6,
    timeLabel: "AWARDED",
    postedDate: "Mar 5, 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80",
    imageAlt: "Industrial safety equipment",
    supplierAvatars: [
      {
        src: "https://i.pravatar.cc/32?img=41",
        alt: "Supplier F",
      },
    ],
    hasActiveOffers: false,
  },
  {
    id: "rfq-006",
    reference: "RFQ-9750",
    title: "Office Furniture Fit-Out — 50 Workstations",
    description:
      "Modern ergonomic desks and chairs for new 50-person office expansion in Berlin.",
    category: "Office / Interiors",
    budgetMin: 30000,
    budgetMax: 45000,
    currency: "USD",
    status: "closed",
    quoteCount: 0,
    timeLabel: "CLOSED",
    postedDate: "Feb 12, 2026",
    imageUrl:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80",
    imageAlt: "Modern office workspace",
    supplierAvatars: [],
    hasActiveOffers: false,
  },
];

// ---------------------------------------------------------------------------
// Status tab definitions
// ---------------------------------------------------------------------------
const STATUS_TABS: { label: string; value: RFQStatus | "all" }[] = [
  { label: "Open", value: "open" },
  { label: "Reviewing", value: "reviewing" },
  { label: "Awarded", value: "awarded" },
  { label: "Closed", value: "closed" },
];

// ---------------------------------------------------------------------------
// Status pill config
// ---------------------------------------------------------------------------
function StatusPill({ status }: { status: RFQStatus }) {
  const map: Record<RFQStatus, { label: string; classes: string }> = {
    open: {
      label: "Open",
      classes: "bg-tertiary-container/20 text-tertiary",
    },
    reviewing: {
      label: "Reviewing",
      classes: "bg-bid-amber/10 text-bid-amber",
    },
    awarded: {
      label: "Awarded",
      classes: "bg-bid-green/10 text-bid-green",
    },
    closed: {
      label: "Closed",
      classes: "bg-surface-container text-on-surface-variant",
    },
  };
  const cfg = map[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Format budget
// ---------------------------------------------------------------------------
function formatBudget(min: number, max: number, currency: string): string {
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `$${n}`;
  return `${fmt(min)} — ${fmt(max)}`;
}

// ---------------------------------------------------------------------------
// RFQ Card
// ---------------------------------------------------------------------------
function RFQCard({ rfq }: { rfq: DemoRFQ }) {
  const isExpiredOrClosed =
    rfq.status === "closed" || rfq.timeLabel === "EXPIRED";

  return (
    <article className="bg-surface-container-lowest rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col group overflow-hidden">
      {/* Card image */}
      <div className="h-48 relative overflow-hidden bg-surface-container-low flex-shrink-0">
        <Image
          src={rfq.imageUrl}
          alt={rfq.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
        />
        {/* Category chip */}
        <div className="absolute top-4 left-4">
          <span className="bg-tertiary/90 backdrop-blur-sm text-on-tertiary px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase">
            {rfq.category}
          </span>
        </div>
        {/* Time remaining badge */}
        <div className="absolute bottom-4 right-4 bg-surface-container-lowest/90 backdrop-blur-sm px-3 py-1 rounded-lg flex items-center gap-1">
          <Clock className="w-4 h-4 text-tertiary" />
          <span className="text-[10px] font-bold font-mono">{rfq.timeLabel}</span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <StatusPill status={rfq.status} />
            <span className="text-[10px] text-on-surface-variant font-medium">
              {rfq.reference}
            </span>
          </div>
          <h3 className="text-lg font-bold font-headline leading-tight group-hover:text-tertiary transition-colors line-clamp-2">
            {rfq.title}
          </h3>
          <p className="text-sm text-on-surface-variant mt-2 line-clamp-2">
            {rfq.description}
          </p>
        </div>

        <div className="mt-auto space-y-4">
          {/* Budget */}
          <div className="bg-surface-container-low p-3 rounded-xl flex justify-between items-center">
            <span className="text-xs text-on-surface-variant font-medium">
              Budget Range
            </span>
            <span className="font-mono font-bold text-tertiary">
              {formatBudget(rfq.budgetMin, rfq.budgetMax, rfq.currency)}
            </span>
          </div>

          {/* Supplier avatars + quote count */}
          <div className="flex justify-between items-center px-1">
            {/* Supplier avatar stack */}
            <div className="flex -space-x-2">
              {rfq.supplierAvatars.slice(0, 2).map((avatar, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-surface-container-lowest overflow-hidden bg-surface-container-low flex-shrink-0 relative"
                >
                  <Image
                    src={avatar.src}
                    alt={avatar.alt}
                    fill
                    sizes="32px"
                    className="object-cover"
                  />
                </div>
              ))}
              {rfq.quoteCount > 2 && (
                <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-tertiary flex items-center justify-center text-[10px] text-on-tertiary font-bold flex-shrink-0">
                  +{rfq.quoteCount - 2}
                </div>
              )}
              {rfq.supplierAvatars.length === 0 && rfq.quoteCount === 0 && (
                <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-on-surface-variant" />
                </div>
              )}
            </div>

            {/* Quote count chip */}
            <span
              className={`text-xs font-bold ${
                rfq.quoteCount > 0
                  ? "bg-tertiary-container text-on-tertiary-container px-2.5 py-1 rounded-full"
                  : "text-on-surface-variant/50"
              }`}
            >
              {rfq.quoteCount > 0
                ? `${rfq.quoteCount} quotes`
                : "No quotes yet"}
            </span>
          </div>

          {/* CTA */}
          {rfq.hasActiveOffers && rfq.status !== "closed" ? (
            <Link
              href={`/account/requests/123`}
              className="w-full py-3 bg-tertiary hover:bg-on-tertiary-fixed-variant text-on-tertiary rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 group/btn"
            >
              View Quotes
              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <Link
              href={`/account/requests/123`}
              className="w-full py-3 border border-tertiary/20 text-tertiary hover:bg-tertiary/5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isExpiredOrClosed ? "View Details" : "Manage Request"}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ status }: { status: RFQStatus }) {
  const messages: Record<RFQStatus, { heading: string; body: string }> = {
    open: {
      heading: "No open requests",
      body: "Post a new sourcing request to start receiving quotes from verified suppliers.",
    },
    reviewing: {
      heading: "Nothing in review",
      body: "Once suppliers submit quotes and you start evaluating them, they'll appear here.",
    },
    awarded: {
      heading: "No awarded requests",
      body: "Requests where you've selected a winning supplier will be shown here.",
    },
    closed: {
      heading: "No closed requests",
      body: "Expired or cancelled sourcing requests will appear here for your records.",
    },
  };
  const msg = messages[status];

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <FileText className="w-16 h-16 text-outline/40 mb-6" />
      <h3 className="font-headline font-bold text-xl text-on-surface mb-2">
        {msg.heading}
      </h3>
      <p className="text-sm text-on-surface-variant max-w-xs">{msg.body}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component (client — needs useState for active tab)
// ---------------------------------------------------------------------------
export default function MyRequestsPage() {
  const [activeTab, setActiveTab] = useState<RFQStatus>("open");

  // TODO: fetch from /api/rfqs/?mine=true&status=... (replace inline data below)
  const filteredRfqs = DEMO_RFQS.filter((r) => r.status === activeTab);

  return (
    <>
      <AccountMobileHeader title="My Requests" />

            <section className="flex-1 min-w-0">

              {/* Page header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-12">
                <div>
                  <h2 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
                    My Requests
                  </h2>
                  <p className="text-on-surface-variant mt-2 text-sm max-w-md">
                    Manage your active sourcing requests and review offers from
                    verified suppliers across the network.
                  </p>
                </div>
                <Link
                  href="/account/requests/new"
                  className="inline-flex items-center gap-2 bg-tertiary hover:bg-on-tertiary-fixed-variant text-on-tertiary px-5 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 whitespace-nowrap flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Post New Request
                </Link>
              </div>

              {/* Status filter tab bar */}
              <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 pt-2 pb-px">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-5">
                {STATUS_TABS.map((tab) => {
                  const isActive = activeTab === tab.value;
                  const count = DEMO_RFQS.filter(
                    (r) => r.status === tab.value
                  ).length;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value as RFQStatus)}
                      className={`
                        inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold
                        whitespace-nowrap transition-all duration-200 active:scale-95
                        ${
                          isActive
                            ? "bg-primary text-on-primary"
                            : "text-on-surface-variant hover:bg-surface-container"
                        }
                      `}
                    >
                      {tab.label}
                      <span
                        className={`
                          inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black
                          ${
                            isActive
                              ? "bg-on-primary/20 text-on-primary"
                              : "bg-surface-container text-on-surface-variant"
                          }
                        `}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              </div>

              {/* RFQ grid or empty state */}
              {filteredRfqs.length === 0 ? (
                <EmptyState status={activeTab} />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredRfqs.map((rfq) => (
                      <RFQCard key={rfq.id} rfq={rfq} />
                    ))}
                  </div>

                  {/* Pagination / load more */}
                  <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 md:p-8 bg-surface-container-low rounded-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-tertiary flex-shrink-0" />
                      <span className="text-sm font-bold text-on-surface uppercase tracking-tighter">
                        Showing {filteredRfqs.length} of{" "}
                        {filteredRfqs.length} {activeTab} requests
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-lowest shadow-card hover:bg-tertiary hover:text-on-tertiary transition-all active:scale-95"
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        className="w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-lowest shadow-card hover:bg-tertiary hover:text-on-tertiary transition-all active:scale-95"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </section>
    </>
  );
}
