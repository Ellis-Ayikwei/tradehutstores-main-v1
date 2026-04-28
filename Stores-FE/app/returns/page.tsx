"use client";

/**
 * Returns & Refunds — static marketing + active-claims dashboard
 * Route: /returns
 *
 * Ported from:
 *   stitch_full_website_redesign_expansion/tradehut_returns_refunds/code.html
 *
 * Layout: MainLayout (nav/footer) + account-style shell with sticky sidebar
 * (lg+), mobile bottom nav.
 * Needs "use client" for the FAQ accordion useState.
 */

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import MainLayout from "@/components/Layouts/MainLayout";
import {
  LayoutDashboard,
  ShoppingBag,
  RotateCcw,
  Gavel,
  FileText,
  Mail,
  Star,
  Bell,
  Shield,
  HelpCircle,
  Plus,
  Calendar,
  Truck,
  Clock,
  Sparkles,
  CheckCircle,
  XCircle,
  ChevronDown,
  ArrowRight,
  Store,
  User,
  Package,
  Wallet,
  Download,
  Headphones,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ReturnRequest {
  id: string;
  caseRef: string;
  productName: string;
  imageUrl: string;
  imageAlt: string;
  initiatedDate: string;
  refundAmount: number;
  status: "in_transit" | "processing" | "completed";
  statusLabel: string;
  statusBadge: string;
  secondaryLabel: string;
  secondaryValue: string;
}

interface CompletedRefund {
  ref: string;
  item: string;
  amount: number;
  completedDate: string;
  method: string;
  /** lucide icon component key */
  methodIconKey: "wallet" | "star";
}

interface ReturnableItem {
  name: string;
  imageUrl: string;
  imageAlt: string;
  price: number;
  purchasedDate: string;
  daysLeft: number;
}

interface FaqItem {
  question: string;
  answer: string;
}

// ---------------------------------------------------------------------------
// Static data
// TODO: Replace with /api/returns/ and /api/refunds/ fetching
// ---------------------------------------------------------------------------
const ACTIVE_REQUESTS: ReturnRequest[] = [
  {
    id: "TH-88291",
    caseRef: "Case #TH-88291",
    productName: "Chronos Series 7 Watch",
    imageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80",
    imageAlt: "Minimalist wrist watch with white face and leather strap",
    initiatedDate: "Oct 12, 2023",
    refundAmount: 249.0,
    status: "in_transit",
    statusLabel: "In Transit",
    statusBadge: "bg-secondary-container text-on-secondary-container",
    secondaryLabel: "Est. Completion",
    secondaryValue: "Oct 24",
  },
  {
    id: "TH-90122",
    caseRef: "Case #TH-90122",
    productName: "HyperFlow Mesh Trainers",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80",
    imageAlt: "Red athletic running shoe on a textured surface",
    initiatedDate: "Oct 18, 2023",
    refundAmount: 120.0,
    status: "processing",
    statusLabel: "Refund Processing",
    statusBadge: "bg-tertiary-container text-on-tertiary",
    secondaryLabel: "Status",
    secondaryValue: "Inspecting Item",
  },
];

const COMPLETED_REFUNDS: CompletedRefund[] = [
  {
    ref: "#RF-11200",
    item: "Nomad Travel Backpack",
    amount: 185.0,
    completedDate: "Sept 12, 2023",
    method: "Original Payment",
    methodIconKey: "wallet",
  },
  {
    ref: "#RF-10992",
    item: "Ergo-Fit Keyboard v2",
    amount: 210.0,
    completedDate: "Aug 28, 2023",
    method: "Store Credit",
    methodIconKey: "star",
  },
];

const RETURNABLE_ITEMS: ReturnableItem[] = [
  {
    name: "Audio-Technica Pro Series",
    imageUrl:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80",
    imageAlt: "Professional studio headphones with leather ear cups",
    price: 299.0,
    purchasedDate: "Oct 5",
    daysLeft: 14,
  },
  {
    name: "RetroSnap Instant Camera",
    imageUrl:
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&q=80",
    imageAlt: "Vintage-style polaroid camera in mint green",
    price: 89.0,
    purchasedDate: "Oct 14",
    daysLeft: 22,
  },
  {
    name: "Linear LED Desk Lamp",
    imageUrl:
      "https://images.unsplash.com/photo-1513506003901-1e6a35afe04e?w=400&q=80",
    imageAlt: "Minimalist desk lamp on a clean white tabletop",
    price: 150.0,
    purchasedDate: "Oct 20",
    daysLeft: 28,
  },
  {
    name: "Zenith Z-Phone 12",
    imageUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&q=80",
    imageAlt: "High-end smartphone with multi-lens camera module",
    price: 999.0,
    purchasedDate: "Sept 28",
    daysLeft: 3,
  },
];

// HOW_IT_WORKS maps Lucide icon components directly
const HOW_IT_WORKS = [
  {
    step: "01",
    Icon: ShoppingBag,
    title: "Find Your Order",
    description:
      "Go to your order history and select the item you want to return. Returns must be initiated within 30 days of delivery.",
  },
  {
    step: "02",
    Icon: RotateCcw,
    title: "Submit Your Request",
    description:
      "Select a return reason, attach photos if needed, and confirm your preferred refund method — original payment or store credit.",
  },
  {
    step: "03",
    Icon: Truck,
    title: "Ship the Item",
    description:
      "Print your free prepaid shipping label and drop the package at any authorised courier location. No cost to you.",
  },
  {
    step: "04",
    Icon: Wallet,
    title: "Receive Your Refund",
    description:
      "Once we inspect the item, your refund is issued within 3–5 business days. VIP members receive instant store credit.",
  },
];

// REFUND_TIMELINE with Lucide icon components
const REFUND_TIMELINE = [
  { label: "Day 1",     event: "Return request submitted",        Icon: CheckCircle },
  { label: "Days 2–3", event: "Prepaid label issued & item shipped", Icon: Truck },
  { label: "Days 4–6", event: "Item received & inspected",        Icon: Package },
  { label: "Days 7–9", event: "Refund approved & processed",      Icon: CheckCircle },
  { label: "Days 9–11",event: "Funds appear in your account",     Icon: Wallet },
];

const RETURNABLE_CATEGORIES = [
  "Electronics & gadgets",
  "Fashion & apparel",
  "Home & furniture",
  "Books & media",
  "Sports & outdoor",
  "Toys & hobbies",
];

const NON_RETURNABLE_CATEGORIES = [
  "Perishable food & beverages",
  "Personalised / custom-made items",
  "Downloaded digital products",
  "Unsealed health & hygiene products",
  "Live plants & animals",
  "Auction lots (unless damaged)",
];

const FAQ_ITEMS: FaqItem[] = [
  {
    question: "How long do I have to initiate a return?",
    answer:
      "You have 30 days from the delivery date to start a return. For marketplace sellers outside TradeHut's fulfilment network, the seller may set a shorter window — check the product listing for details.",
  },
  {
    question: "Who pays for return shipping?",
    answer:
      "TradeHut provides a free prepaid shipping label for all eligible returns. Simply print the label from your dashboard and attach it to the package.",
  },
  {
    question: "How will I receive my refund?",
    answer:
      "Refunds are issued to your original payment method by default. You can choose store credit instead, which is credited instantly once the return is approved. VIP members always receive instant store credit regardless of item inspection.",
  },
  {
    question: "What condition must the item be in?",
    answer:
      "Items must be in their original, unused condition with all original packaging and accessories. Items showing signs of use beyond what is needed to assess them may only qualify for a partial refund.",
  },
  {
    question: "What if my item arrived damaged or faulty?",
    answer:
      "Damaged or faulty items are handled under our Buyer Protection programme. Go to your order, select 'Report a Problem', and our team will resolve the issue — typically within 24 hours.",
  },
  {
    question: "Can I return an auction win?",
    answer:
      "Auction lots are generally non-returnable unless the item arrives significantly not as described or is damaged in transit. Open a dispute via the Resolution Centre within 48 hours of delivery.",
  },
];

// Quick stats icons
const QUICK_STATS = [
  { value: "30",   label: "Day window",      Icon: Calendar },
  { value: "Free", label: "Return shipping", Icon: Truck },
  { value: "3–5",  label: "Days for refund", Icon: Clock },
  { value: "VIP",  label: "Instant credit",  Icon: Sparkles },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatAmount(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function daysLeftBadge(days: number): string {
  if (days <= 5) return "bg-error-container text-on-error-container";
  if (days <= 14) return "bg-bid-amber/10 text-bid-amber";
  return "bg-surface-container text-on-surface-variant";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Sidebar nav link — now uses a Lucide icon component */
function SideLink({
  href,
  Icon,
  label,
  active = false,
}: {
  href: string;
  Icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "bg-surface-container-lowest text-primary shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
          : "text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
      }
    >
      <Icon className={`w-5 h-5${active ? " fill-current" : ""}`} />
      <span className="font-body uppercase tracking-widest text-[10px] font-bold">
        {label}
      </span>
    </Link>
  );
}

/** Active return request card */
function RequestCard({ req }: { req: ReturnRequest }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 md:p-6 shadow-card border border-outline-variant/15 flex flex-col md:flex-row gap-5 md:gap-6 relative overflow-hidden group">
      {/* Decorative blob */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-green/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700 pointer-events-none" />

      {/* Product image */}
      <div className="w-full md:w-32 h-32 rounded-xl bg-surface-container-low overflow-hidden flex-shrink-0 relative">
        <Image
          src={req.imageUrl}
          alt={req.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 128px"
          className="object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-grow flex flex-col justify-between z-10">
        <div>
          <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
            <h3 className="font-headline font-bold text-lg text-on-surface">
              {req.productName}
            </h3>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider flex-shrink-0 ${req.statusBadge}`}
            >
              {req.statusLabel}
            </span>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">
            {req.caseRef} &bull; Initiated {req.initiatedDate}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-6 md:gap-8">
          <div className="flex flex-col">
            <span className="text-[10px] text-outline font-bold uppercase tracking-wider">
              Refund Amount
            </span>
            <span className="font-mono text-lg text-primary">
              {formatAmount(req.refundAmount)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-outline font-bold uppercase tracking-wider">
              {req.secondaryLabel}
            </span>
            <span className="font-mono text-lg text-on-surface">
              {req.secondaryValue}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-row md:flex-col items-center justify-end md:justify-center gap-2 self-end md:self-auto">
        <button
          className="p-3 min-h-[44px] min-w-[44px] rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors active:scale-95 flex items-center justify-center"
          aria-label={req.status === "in_transit" ? "Track package" : "Contact support"}
        >
          {req.status === "in_transit" ? (
            <Truck className="w-5 h-5" />
          ) : (
            <Headphones className="w-5 h-5" />
          )}
        </button>
        <Link
          href="/account/orders"
          className="p-3 min-h-[44px] min-w-[44px] rounded-lg hover:bg-surface-container-low text-on-surface-variant transition-colors active:scale-95 flex items-center justify-center"
          aria-label="View details"
        >
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

/** Returnable item card */
function ReturnableCard({ item }: { item: ReturnableItem }) {
  return (
    <div className="group cursor-pointer">
      <div className="bg-surface-container-low aspect-[4/5] rounded-3xl overflow-hidden relative mb-4">
        <Image
          src={item.imageUrl}
          alt={item.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Return CTA — slides up on hover */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
          <Link
            href="/account/orders"
            className="block w-full bg-surface-container-lowest/90 backdrop-blur-md text-on-surface py-3 rounded-xl font-bold text-center shadow-lg text-sm active:scale-95 transition-transform"
          >
            Return This Item
          </Link>
        </div>
        {/* Days left badge */}
        <div
          className={`absolute top-4 right-4 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold ${daysLeftBadge(item.daysLeft)}`}
        >
          {item.daysLeft} DAYS LEFT
        </div>
      </div>
      <h4 className="font-bold text-on-surface truncate text-sm">
        {item.name}
      </h4>
      <div className="flex justify-between items-center mt-1">
        <span className="font-mono text-sm text-outline">
          {formatAmount(item.price)}
        </span>
        <span className="text-xs text-on-surface-variant italic">
          Purchased {item.purchasedDate}
        </span>
      </div>
    </div>
  );
}

/** FAQ accordion item */
function FaqRow({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-outline-variant/20 last:border-none">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-5 min-h-12 text-left gap-4 group active:scale-[0.99] transition-transform"
        aria-expanded={open}
      >
        <span className="font-headline font-bold text-base text-on-surface group-hover:text-primary transition-colors">
          {item.question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-on-surface-variant flex-shrink-0 transition-transform duration-300 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm text-on-surface-variant leading-relaxed">
          {item.answer}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ReturnsPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface font-body">
        {/*
         * NOTE: Global <TopNav> is rendered by MainLayout.
         * pt-20 below clears it.
         */}
        <div className="pt-20 pb-24 md:pb-12 px-4 md:px-8 max-w-screen-2xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ==============================================================
             * SIDEBAR
             * ============================================================== */}
            <aside className="hidden lg:flex md:sticky md:top-24 md:h-[calc(100vh-6rem)] w-72 flex-shrink-0 flex-col gap-2 p-6 bg-surface rounded-2xl overflow-y-auto no-scrollbar">
              <div className="mb-8">
                <h2 className="font-syne text-xl font-bold text-on-surface tracking-tight">
                  Support Centre
                </h2>
                <p className="text-xs text-on-surface-variant font-medium mt-1 opacity-60">
                  Manage your TradeHut account
                </p>
              </div>

              <nav className="flex flex-col gap-1 flex-1">
                <SideLink href="/account" Icon={LayoutDashboard} label="Overview" />
                <SideLink href="/account/orders" Icon={ShoppingBag} label="Orders" />
                <SideLink
                  href="/returns"
                  Icon={RotateCcw}
                  label="Returns & Refunds"
                  active
                />
                <SideLink href="/account/bids" Icon={Gavel} label="Bids & Auctions" />
                <SideLink href="/account/requests" Icon={FileText} label="My Requests" />
                <SideLink href="/account/messages" Icon={Mail} label="Messages" />
                <SideLink href="/account/reviews" Icon={Star} label="Feedback" />
                <div className="my-2 border-t border-outline-variant/10" />
                <SideLink href="/account/notifications" Icon={Bell} label="Notifications" />
                <SideLink href="/account/security" Icon={Shield} label="Security" />
                <SideLink href="/help" Icon={HelpCircle} label="Help Centre" />
              </nav>

              {/* Upgrade CTA */}
              <div className="mt-auto pt-6 border-t border-surface-container-highest/30">
                <button className="w-full primary-gradient text-on-primary font-bold py-3 rounded-xl text-sm font-syne hover:scale-[1.02] transition-transform duration-200 shadow-card active:scale-95">
                  Upgrade to VIP
                </button>
              </div>
            </aside>

            {/* ==============================================================
             * MAIN CONTENT
             * ============================================================== */}
            <main className="flex-1 min-w-0 space-y-12 md:space-y-16">

              {/* ------------------------------------------------------------
               * HERO SECTION
               * ------------------------------------------------------------ */}
              <section>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
                  <div className="space-y-2">
                    <h1 className="font-syne text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-on-surface">
                      Returns &amp;{" "}
                      <span className="text-primary italic">Refunds</span>
                    </h1>
                    <p className="text-on-surface-variant text-sm max-w-lg leading-relaxed">
                      Track your active claims or start a return for items
                      purchased within the last{" "}
                      <strong className="text-on-surface">30 days</strong>.
                      Platform-fulfilled orders are covered automatically.
                    </p>
                  </div>
                  <Link
                    href="/account/orders"
                    className="inline-flex items-center gap-3 px-6 py-4 primary-gradient text-on-primary rounded-xl font-headline font-bold shadow-card hover:shadow-card-hover transition-all duration-300 active:scale-95 group text-sm flex-shrink-0"
                  >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                    Start a Return
                  </Link>
                </div>

                {/* Quick-stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {QUICK_STATS.map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-surface-container-lowest rounded-2xl p-5 shadow-card flex flex-col gap-2 border border-outline-variant/10"
                    >
                      <stat.Icon className="w-5 h-5 text-primary" />
                      <span className="font-mono text-2xl font-bold text-on-surface">
                        {stat.value}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ------------------------------------------------------------
               * ACTIVE REQUESTS + POLICY PANEL (12-col bento)
               * ------------------------------------------------------------ */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Active requests */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="font-headline text-xl font-bold text-on-surface">
                      Active Requests
                    </h2>
                    <span className="text-xs font-mono bg-surface-container-high px-2 py-1 rounded text-on-surface-variant">
                      {ACTIVE_REQUESTS.length} ACTIVE
                    </span>
                  </div>
                  <div className="space-y-4">
                    {ACTIVE_REQUESTS.map((req) => (
                      <RequestCard key={req.id} req={req} />
                    ))}
                  </div>
                </div>

                {/* Policy + stats panel */}
                <div className="lg:col-span-4 space-y-6">
                  {/* Quick stats */}
                  <div className="bg-surface-container-low rounded-3xl p-6 md:p-8 space-y-6">
                    <h2 className="font-headline text-lg font-bold text-on-surface">
                      Your Returns At a Glance
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface-container-lowest p-4 rounded-2xl">
                        <span className="text-2xl font-mono block mb-1 text-on-surface">
                          08
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                          Total Returns
                        </span>
                      </div>
                      <div className="bg-surface-container-lowest p-4 rounded-2xl">
                        <span className="text-2xl font-mono block mb-1 text-secondary-green">
                          $1.2k
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-outline">
                          Refunded
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-outline-variant/20">
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Most refunds are processed within{" "}
                        <strong className="text-on-surface">
                          3–5 business days
                        </strong>{" "}
                        after the item reaches our fulfilment centre.
                      </p>
                    </div>
                  </div>

                  {/* Policy highlight */}
                  <div className="bg-inverse-surface text-inverse-on-surface rounded-3xl p-6 md:p-8 relative overflow-hidden">
                    <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                      <Shield className="w-[120px] h-[120px]" fill="currentColor" />
                    </div>
                    <h3 className="font-headline font-bold mb-4 text-lg">
                      Easy Return Policy
                    </h3>
                    <ul className="space-y-4 relative z-10">
                      {[
                        "30-day no-questions-asked window",
                        "Free prepaid shipping labels",
                        "Instant credit for VIP members",
                      ].map((point) => (
                        <li key={point} className="flex gap-3 text-sm">
                          <CheckCircle className="w-4 h-4 text-primary-fixed-dim flex-shrink-0 mt-0.5" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* ------------------------------------------------------------
               * HOW IT WORKS
               * ------------------------------------------------------------ */}
              <section>
                <div className="mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Process
                  </span>
                  <h2 className="font-syne text-3xl md:text-4xl font-bold tracking-tight text-on-surface mt-1">
                    How it Works
                  </h2>
                  <p className="text-on-surface-variant text-sm mt-2 max-w-lg">
                    Four simple steps — from finding your order to receiving your
                    money back.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {HOW_IT_WORKS.map((step) => (
                    <div
                      key={step.step}
                      className="bg-surface-container-lowest rounded-2xl p-6 shadow-card border border-outline-variant/10 hover:shadow-card-hover transition-all duration-300 group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <step.Icon className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-mono text-3xl font-bold text-outline/20 group-hover:text-primary/20 transition-colors">
                          {step.step}
                        </span>
                      </div>
                      <h3 className="font-headline font-bold text-base text-on-surface mb-2">
                        {step.title}
                      </h3>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-8 flex justify-center">
                  <Link
                    href="/account/orders"
                    className="inline-flex items-center gap-3 px-8 py-4 primary-gradient text-on-primary rounded-xl font-bold shadow-card hover:shadow-card-hover transition-all duration-300 active:scale-95 group"
                  >
                    Go to My Orders to Start a Return
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </section>

              {/* ------------------------------------------------------------
               * ELIGIBILITY GRID
               * ------------------------------------------------------------ */}
              <section>
                <div className="mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Policy
                  </span>
                  <h2 className="font-syne text-3xl md:text-4xl font-bold tracking-tight text-on-surface mt-1">
                    What Can &amp; Can&apos;t Be Returned
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Returnable */}
                  <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-card border border-outline-variant/10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-secondary-green/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-secondary-green" fill="currentColor" />
                      </div>
                      <h3 className="font-headline font-bold text-lg text-on-surface">
                        Eligible for Return
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {RETURNABLE_CATEGORIES.map((cat) => (
                        <li
                          key={cat}
                          className="flex items-center gap-3 text-sm text-on-surface-variant"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-secondary-green flex-shrink-0" />
                          {cat}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Non-returnable */}
                  <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-card border border-outline-variant/10">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                        <XCircle className="w-5 h-5 text-error" fill="currentColor" />
                      </div>
                      <h3 className="font-headline font-bold text-lg text-on-surface">
                        Non-Returnable
                      </h3>
                    </div>
                    <ul className="space-y-3">
                      {NON_RETURNABLE_CATEGORIES.map((cat) => (
                        <li
                          key={cat}
                          className="flex items-center gap-3 text-sm text-on-surface-variant"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-error flex-shrink-0" />
                          {cat}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* ------------------------------------------------------------
               * REFUND TIMELINE
               * ------------------------------------------------------------ */}
              <section>
                <div className="mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Timeline
                  </span>
                  <h2 className="font-syne text-3xl md:text-4xl font-bold tracking-tight text-on-surface mt-1">
                    Refund Timeline
                  </h2>
                  <p className="text-on-surface-variant text-sm mt-2 max-w-lg">
                    From the moment you submit your return to money back in your
                    account — typically under 11 days.
                  </p>
                </div>

                {/* Horizontal steps on md+, vertical on mobile */}
                <div className="relative">
                  {/* Connector line — desktop */}
                  <div className="hidden md:block absolute top-8 left-[calc(10%+1.5rem)] right-[calc(10%+1.5rem)] h-0.5 bg-outline-variant/30 z-0" />

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6 md:gap-4 relative z-10">
                    {REFUND_TIMELINE.map((step, idx) => (
                      <div
                        key={step.label}
                        className="flex md:flex-col items-center md:items-center gap-4 md:gap-3"
                      >
                        {/* Mobile connector */}
                        {idx > 0 && (
                          <div className="md:hidden w-0.5 h-8 bg-outline-variant/30 -mt-2 ml-5 self-start" />
                        )}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                            idx === 0
                              ? "bg-primary text-on-primary"
                              : idx === REFUND_TIMELINE.length - 1
                              ? "bg-secondary-green text-on-primary"
                              : "bg-surface-container text-on-surface-variant"
                          }`}
                        >
                          <step.Icon className="w-5 h-5" />
                        </div>
                        <div className="md:text-center">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-outline block">
                            {step.label}
                          </span>
                          <span className="text-sm text-on-surface font-medium leading-snug">
                            {step.event}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* ------------------------------------------------------------
               * RETURNABLE ITEMS GALLERY (from active orders)
               * ------------------------------------------------------------ */}
              <section>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Your Purchases
                    </span>
                    <h2 className="font-syne text-2xl md:text-3xl font-bold tracking-tight text-on-surface mt-1">
                      Returnable Items
                    </h2>
                  </div>
                  <Link
                    href="/account/orders"
                    className="text-sm font-bold text-primary hover:underline active:scale-95 transition-transform whitespace-nowrap"
                  >
                    View All Purchases
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                  {RETURNABLE_ITEMS.map((item) => (
                    <ReturnableCard key={item.name} item={item} />
                  ))}
                </div>
              </section>

              {/* ------------------------------------------------------------
               * COMPLETED REFUNDS TABLE
               * ------------------------------------------------------------ */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="font-headline text-xl font-bold text-on-surface whitespace-nowrap">
                    Recent Completed Refunds
                  </h2>
                  <div className="h-px flex-grow bg-outline-variant/30" />
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-3">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-widest text-outline">
                        <th className="px-6 pb-2">Reference</th>
                        <th className="px-6 pb-2">Item</th>
                        <th className="px-6 pb-2 text-right">Amount</th>
                        <th className="px-6 pb-2">Completed</th>
                        <th className="px-6 pb-2">Method</th>
                        <th className="px-6 pb-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {COMPLETED_REFUNDS.map((r) => (
                        <tr
                          key={r.ref}
                          className="bg-surface-container-lowest/60 hover:bg-surface-container-lowest transition-colors group"
                        >
                          <td className="px-6 py-4 rounded-l-2xl font-mono text-sm text-on-surface">
                            {r.ref}
                          </td>
                          <td className="px-6 py-4 font-bold text-sm text-on-surface">
                            {r.item}
                          </td>
                          <td className="px-6 py-4 text-right font-mono text-sm text-on-surface">
                            {formatAmount(r.amount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-on-surface-variant">
                            {r.completedDate}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                              {r.methodIconKey === "wallet" ? (
                                <Wallet className="w-4 h-4" />
                              ) : (
                                <Star className="w-4 h-4" />
                              )}
                              {r.method}
                            </div>
                          </td>
                          <td className="px-6 py-4 rounded-r-2xl text-right">
                            <button
                              className="p-2 text-outline group-hover:text-primary transition-colors active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center ml-auto"
                              aria-label={`Download receipt for ${r.ref}`}
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {COMPLETED_REFUNDS.map((r) => (
                    <div
                      key={r.ref}
                      className="bg-surface-container-lowest rounded-2xl shadow-card p-5 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center flex-shrink-0">
                        {r.methodIconKey === "wallet" ? (
                          <Wallet className="w-4 h-4 text-on-surface-variant" />
                        ) : (
                          <Star className="w-4 h-4 text-on-surface-variant" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-on-surface truncate">
                          {r.item}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-xs text-primary font-bold">
                            {r.ref}
                          </span>
                          <span className="text-[10px] text-on-surface-variant">
                            &bull; {r.completedDate}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {r.method}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-on-surface flex-shrink-0">
                        {formatAmount(r.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* ------------------------------------------------------------
               * FAQ ACCORDION
               * ------------------------------------------------------------ */}
              <section>
                <div className="mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    Questions
                  </span>
                  <h2 className="font-syne text-3xl md:text-4xl font-bold tracking-tight text-on-surface mt-1">
                    Frequently Asked Questions
                  </h2>
                </div>

                <div className="max-w-3xl bg-surface-container-lowest rounded-2xl shadow-card p-6 md:p-8">
                  {FAQ_ITEMS.map((faq) => (
                    <FaqRow key={faq.question} item={faq} />
                  ))}
                </div>

                <p className="mt-6 text-sm text-on-surface-variant">
                  Still have questions?{" "}
                  <Link
                    href="/help"
                    className="font-bold text-primary hover:underline"
                  >
                    Visit our Help Centre
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/account/messages"
                    className="font-bold text-primary hover:underline"
                  >
                    contact support
                  </Link>
                  .
                </p>
              </section>

              {/* ------------------------------------------------------------
               * BOTTOM CTA ACCENT BLOCK
               * ------------------------------------------------------------ */}
              <section>
                <div className="bg-primary-container rounded-3xl p-8 md:p-12 relative overflow-hidden text-on-primary">
                  {/* Glow blob */}
                  <div className="absolute -left-10 -top-10 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-40 pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div className="max-w-lg">
                      <h2 className="font-syne text-2xl md:text-3xl font-bold mb-3">
                        Ready to start a return?
                      </h2>
                      <p className="text-on-primary/80 text-sm leading-relaxed">
                        Head to your order history, select the item, and we&apos;ll
                        guide you through the rest. Most returns are resolved
                        within 11 days.
                      </p>
                    </div>
                    <Link
                      href="/account/orders"
                      className="inline-flex items-center gap-3 px-8 py-4 bg-surface-container-lowest text-primary rounded-xl font-bold text-sm shadow-card hover:scale-105 transition-transform active:scale-95 flex-shrink-0"
                    >
                      Go to My Orders
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                </div>
              </section>

            </main>
          </div>
        </div>

        {/* ================================================================
         * MOBILE BOTTOM NAV — replaces sidebar on < lg
         * ================================================================ */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest shadow-[0_-4px_20px_0_rgba(38,24,19,0.06)] px-6 py-3 flex justify-around items-center z-50">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <Store className="w-6 h-6" />
            <span className="text-[10px] font-bold">Home</span>
          </Link>
          <Link
            href="/account/orders"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <ShoppingBag className="w-6 h-6" />
            <span className="text-[10px] font-bold">Orders</span>
          </Link>
          <Link
            href="/returns"
            className="flex flex-col items-center gap-1 text-primary min-w-[44px] py-1"
          >
            <RotateCcw className="w-6 h-6" fill="currentColor" />
            <span className="text-[10px] font-bold">Returns</span>
          </Link>
          <Link
            href="/account/bids"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <Gavel className="w-6 h-6" />
            <span className="text-[10px] font-bold">Bids</span>
          </Link>
          <Link
            href="/account"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold">Account</span>
          </Link>
        </nav>
      </div>
    </MainLayout>
  );
}
