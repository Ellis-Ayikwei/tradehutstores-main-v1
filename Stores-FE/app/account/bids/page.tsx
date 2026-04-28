"use client";

/**
 * Buyer's Bids & Auctions dashboard — "My Bids"
 * Route: /account/bids
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_bids_auctions/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import MainLayout from "@/components/Layouts/MainLayout";
import {
  LayoutDashboard,
  ShoppingBag,
  Gavel,
  FileText,
  Heart,
  MapPin,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  Store,
  User,
  Zap,
  BellRing,
  Clock,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (from .claude/design-system/bid-rfq-spec.md)
// ---------------------------------------------------------------------------
type BidStatus = "winning" | "outbid" | "closing-soon" | "won" | "lost";

interface DemoBid {
  id: string;
  auctionId: string;
  category: string;
  title: string;
  imageUrl: string;
  imageAlt: string;
  currentBid: number;
  /** your last bid amount (outbid/lost) OR your max bid ceiling (winning) */
  yourBid: number;
  yourBidLabel: string; // "Your Max" | "Your Last" | "Starting"
  currency: string;
  status: BidStatus;
  /** Human-readable countdown e.g. "04h 22m 11s" */
  timeToClose: string;
  /** Whether time is critically short (triggers amber/red accent) */
  timePressure: "normal" | "amber" | "red";
}

interface ClosedAuction {
  id: string;
  auctionId: string;
  title: string;
  imageUrl: string;
  imageAlt: string;
  finalBid: number;
  currency: string;
  outcome: "won" | "lost";
  /** Extra info e.g. "Shipment scheduled for Tomorrow" or "Closed at $3,450.00" */
  outcomeNote: string;
}

// ---------------------------------------------------------------------------
// Demo data
// TODO: fetch from /api/bids/?mine=true&status=... (replace inline data below)
// ---------------------------------------------------------------------------
const DEMO_ACTIVE_BIDS: DemoBid[] = [
  {
    id: "bid-001",
    auctionId: "auction-1001",
    category: "Chronograph Collection",
    title: "Aura Limited Edition v.2",
    imageUrl:
      "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&q=80",
    imageAlt: "High-end designer watch with silver casing and black leather strap",
    currentBid: 2450,
    yourBid: 3200,
    yourBidLabel: "Your Max",
    currency: "USD",
    status: "winning",
    timeToClose: "04h 22m 11s",
    timePressure: "amber",
  },
  {
    id: "bid-002",
    auctionId: "auction-1002",
    category: "Heritage Outerwear",
    title: "Sienna Calfskin Rider",
    imageUrl:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80",
    imageAlt: "Premium leather motorcycle jacket in cognac brown",
    currentBid: 895,
    yourBid: 850,
    yourBidLabel: "Your Last",
    currency: "USD",
    status: "outbid",
    timeToClose: "00h 14m 52s",
    timePressure: "red",
  },
  {
    id: "bid-003",
    auctionId: "auction-1003",
    category: "Performance Gear",
    title: "Aero-V Velocity Core",
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    imageAlt: "Crimson red athletic sneaker with high-performance texture",
    currentBid: 420,
    yourBid: 380,
    yourBidLabel: "Your Last",
    currency: "USD",
    status: "closing-soon",
    timeToClose: "00h 02m 41s",
    timePressure: "red",
  },
  {
    id: "bid-004",
    auctionId: "auction-1004",
    category: "Tech / Mobile",
    title: "Titanium Flux X1",
    imageUrl:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&q=80",
    imageAlt: "High-end smartphone on a marble surface with atmospheric lighting",
    currentBid: 1150,
    yourBid: 900,
    yourBidLabel: "Starting",
    currency: "USD",
    status: "winning",
    timeToClose: "2d 08h 33m",
    timePressure: "normal",
  },
];

const DEMO_CLOSED: ClosedAuction[] = [
  {
    id: "closed-001",
    auctionId: "auction-0901",
    title: "Vintage Film Camera Series-04",
    imageUrl:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&q=80",
    imageAlt: "Vintage 35mm film camera on rustic wooden surface",
    finalBid: 1420,
    currency: "USD",
    outcome: "won",
    outcomeNote:
      "Your winning bid has been processed. Shipment is scheduled for Tomorrow.",
  },
  {
    id: "closed-002",
    auctionId: "auction-0902",
    title: "Modular Synth Deck",
    imageUrl:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80",
    imageAlt: "Electronic music modular synthesizer with patch cables",
    finalBid: 3450,
    currency: "USD",
    outcome: "lost",
    outcomeNote: "Sold to another bidder.",
  },
];

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------
type TabValue = "all" | "winning" | "outbid" | "closing-soon";

const STATUS_TABS: { label: string; value: TabValue }[] = [
  { label: "All Active", value: "all" },
  { label: "Winning", value: "winning" },
  { label: "Outbid", value: "outbid" },
  { label: "Closing Soon", value: "closing-soon" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

// Resolve the time icon component based on pressure + status
function TimeIcon({ pressure, isClosingSoon }: { pressure: DemoBid["timePressure"]; isClosingSoon: boolean }) {
  if (pressure === "red" && isClosingSoon) return <Zap className="w-4 h-4" />;
  if (pressure === "red") return <BellRing className="w-4 h-4" />;
  return <Clock className="w-4 h-4" />;
}

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------
function BidStatusPill({ status }: { status: BidStatus }) {
  const map: Record<BidStatus, { label: string; classes: string; showStar?: boolean; showWarn?: boolean }> = {
    winning: {
      label: "Winning",
      classes: "bg-bid-green/10 text-bid-green",
      showStar: true,
    },
    outbid: {
      label: "Outbid",
      classes: "bg-bid-red/10 text-bid-red",
      showWarn: true,
    },
    "closing-soon": {
      label: "Closing Soon",
      classes: "bg-bid-red text-white",
    },
    won: {
      label: "Auction Won",
      classes: "bg-on-surface text-white",
    },
    lost: {
      label: "Sold Elsewhere",
      classes: "bg-outline-variant/30 text-on-surface-variant",
    },
  };
  const cfg = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.classes}`}
    >
      {cfg.showStar && <Gavel className="w-3 h-3" fill="currentColor" />}
      {cfg.showWarn && <Zap className="w-3 h-3" />}
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Active Bid Card
// ---------------------------------------------------------------------------
function BidCard({ bid }: { bid: DemoBid }) {
  const isOutbidOrClosing =
    bid.status === "outbid" || bid.status === "closing-soon";
  const isClosingSoon = bid.status === "closing-soon";

  const timeColor =
    bid.timePressure === "red"
      ? "text-bid-red"
      : bid.timePressure === "amber"
      ? "text-bid-amber"
      : "text-on-surface-variant";

  return (
    <article
      className={`bg-surface-container-lowest rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-6 flex flex-col md:flex-row gap-6 group overflow-hidden relative${
        isClosingSoon ? " border-l-4 border-bid-red" : ""
      }`}
    >
      {/* Status pill — top-right */}
      <div className="absolute top-4 right-4 z-10">
        <BidStatusPill status={bid.status} />
      </div>

      {/* Thumbnail */}
      <div className="w-full md:w-40 h-40 rounded-xl overflow-hidden flex-shrink-0 bg-surface-container-low relative">
        <Image
          src={bid.imageUrl}
          alt={bid.imageAlt}
          fill
          sizes="(max-width: 768px) 100vw, 160px"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Body */}
      <div className="flex flex-col justify-between flex-1 min-w-0">
        <div>
          <span className="text-[10px] font-bold text-primary tracking-widest uppercase">
            {bid.category}
          </span>
          <h3 className="text-xl font-headline font-bold text-on-surface mt-1 truncate pr-20">
            {bid.title}
          </h3>

          {/* Bid figures */}
          <div className="flex items-center gap-4 mt-4">
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter opacity-60">
                Current Bid
              </p>
              <p
                className={`text-2xl font-mono font-bold mt-0.5 ${
                  isOutbidOrClosing ? "text-bid-red" : "text-on-surface"
                }`}
              >
                {formatCurrency(bid.currentBid, bid.currency)}
              </p>
            </div>
            <div className="w-px h-8 bg-outline-variant/20 flex-shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter opacity-60">
                {bid.yourBidLabel}
              </p>
              <p className="text-lg font-mono font-medium text-on-surface-variant mt-0.5">
                {formatCurrency(bid.yourBid, bid.currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Footer row: countdown + action */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-outline-variant/10 gap-3 flex-wrap">
          <div className={`flex items-center gap-2 ${timeColor}`}>
            <TimeIcon pressure={bid.timePressure} isClosingSoon={isClosingSoon} />
            <span className="font-mono text-sm font-bold">{bid.timeToClose}</span>
          </div>
          {isOutbidOrClosing ? (
            <Link
              href={`/auctions/${bid.auctionId}`}
              className="bg-bid-green text-white font-bold text-[10px] uppercase tracking-widest px-6 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-bid-green/20"
            >
              {isClosingSoon ? "Bid Now" : "Counter Bid"}
            </Link>
          ) : (
            <Link
              href={`/auctions/${bid.auctionId}`}
              className="bg-surface-container-low text-on-surface font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg hover:bg-surface-container-high active:scale-95 transition-all"
            >
              View Auction
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Closed Auction Bento Section
// ---------------------------------------------------------------------------
function ClosedSection() {
  const won = DEMO_CLOSED.filter((c) => c.outcome === "won");
  const lost = DEMO_CLOSED.filter((c) => c.outcome === "lost");

  return (
    <div className="mt-12">
      <h2 className="font-headline text-2xl font-bold text-on-surface mb-6">
        Recently Closed
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Won — wide tile (col-span-2) */}
        {won.map((item) => (
          <div
            key={item.id}
            className="md:col-span-2 bg-surface-container-low rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 border border-outline-variant/5"
          >
            <div className="flex-1 order-2 md:order-1">
              <BidStatusPill status="won" />
              <h3 className="text-3xl font-headline font-black text-on-surface mt-4 leading-tight">
                {item.title}
              </h3>
              <p className="text-on-surface-variant mt-2 text-sm font-body">
                Your winning bid of{" "}
                <span className="font-mono font-bold text-on-surface">
                  {formatCurrency(item.finalBid, item.currency)}
                </span>{" "}
                has been processed. {item.outcomeNote}
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link
                  href={`/account/orders`}
                  className="bg-primary text-on-primary font-bold text-[10px] uppercase tracking-widest px-8 py-3 rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
                >
                  Track Shipping
                </Link>
                <Link
                  href={`/auctions/${item.auctionId}`}
                  className="bg-surface-container-lowest text-on-surface font-bold text-[10px] uppercase tracking-widest px-8 py-3 rounded-lg border border-outline-variant/20 hover:bg-surface-container active:scale-95 transition-all"
                >
                  View Invoice
                </Link>
              </div>
            </div>
            <div className="w-full md:w-64 h-64 rounded-2xl overflow-hidden order-1 md:order-2 shadow-card-hover flex-shrink-0 relative">
              <Image
                src={item.imageUrl}
                alt={item.imageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 256px"
                className="object-cover"
              />
            </div>
          </div>
        ))}

        {/* Lost — narrow tile */}
        {lost.map((item) => (
          <div
            key={item.id}
            className="bg-surface-container-low rounded-2xl p-8 flex flex-col justify-between border border-outline-variant/5"
          >
            <div>
              <BidStatusPill status="lost" />
              <h3 className="text-xl font-headline font-bold text-on-surface mt-4">
                {item.title}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Closed at {formatCurrency(item.finalBid, item.currency)}
              </p>
            </div>
            <div className="mt-8 flex justify-center">
              <div className="w-32 h-32 rounded-xl overflow-hidden rotate-3 grayscale opacity-60 relative">
                <Image
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </div>
            </div>
            <Link
              href="/auctions"
              className="w-full mt-6 py-3 border border-outline-variant/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-lowest active:scale-95 transition-all text-center"
            >
              Find Similar
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ tab }: { tab: TabValue }) {
  const map: Record<TabValue, { heading: string; body: string }> = {
    all: {
      heading: "No active bids",
      body: "Browse live auctions to start bidding on items.",
    },
    winning: {
      heading: "Not winning anything yet",
      body: "Place a bid on a live auction to appear here.",
    },
    outbid: {
      heading: "No outbid items",
      body: "When someone beats your bid you'll see it here.",
    },
    "closing-soon": {
      heading: "Nothing closing imminently",
      body: "Items with under an hour remaining will appear here.",
    },
  };
  const msg = map[tab];
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <Gavel className="w-16 h-16 text-outline/40 mb-6" strokeWidth={1} />
      <h3 className="font-headline font-bold text-xl text-on-surface mb-2">
        {msg.heading}
      </h3>
      <p className="text-sm text-on-surface-variant max-w-xs">{msg.body}</p>
      <Link
        href="/auctions"
        className="mt-6 inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-xl font-bold hover:opacity-90 active:scale-95 transition-all"
      >
        Browse Auctions
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component (client — needs useState for active tab)
// ---------------------------------------------------------------------------
export default function MyBidsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // TODO: fetch from /api/bids/?mine=true&status=... (replace inline data below)
  const filteredBids =
    activeTab === "all"
      ? DEMO_ACTIVE_BIDS
      : DEMO_ACTIVE_BIDS.filter((b) => b.status === activeTab);

  const winningCount = DEMO_ACTIVE_BIDS.filter(
    (b) => b.status === "winning"
  ).length;
  const outbidCount = DEMO_ACTIVE_BIDS.filter(
    (b) => b.status === "outbid" || b.status === "closing-soon"
  ).length;

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface font-body">
        {/*
         * NOTE: The global <TopNav> is rendered by MainLayout and
         * must NOT be modified here. The pt-20 below clears it.
         */}

        {/* Mobile sidebar drawer overlay */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-inverse-surface/40 backdrop-blur-sm lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        )}
        {/* Mobile sidebar drawer panel */}
        <div
          className={`fixed left-0 top-0 h-full w-72 z-50 bg-surface-container-lowest shadow-card flex flex-col gap-2 p-6 overflow-y-auto no-scrollbar transition-transform duration-300 lg:hidden ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Account navigation drawer"
        >
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-syne text-xl font-bold text-on-surface tracking-tight">
                My Account
              </h2>
              <p className="text-xs text-on-surface-variant font-medium mt-1 opacity-60">
                Manage your TradeHut profile
              </p>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            {[
              { href: "/account", Icon: LayoutDashboard, label: "Overview" },
              { href: "/account/orders", Icon: ShoppingBag, label: "Orders" },
              { href: "/account/requests", Icon: FileText, label: "My Requests" },
              { href: "/account/messages", Icon: Bell, label: "Messages" },
              { href: "/account/wishlist", Icon: Heart, label: "Wishlist" },
              { href: "/account/addresses", Icon: MapPin, label: "Addresses" },
              { href: "/account/payment-methods", Icon: CreditCard, label: "Payment Methods" },
              { href: "/account/notifications", Icon: Bell, label: "Notifications" },
              { href: "/account/security", Icon: Shield, label: "Security" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setDrawerOpen(false)}
                className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
              >
                <link.Icon className="w-5 h-5" />
                <span className="font-body uppercase tracking-widest text-[10px] font-bold">{link.label}</span>
              </Link>
            ))}
            <Link
              href="/account/bids"
              onClick={() => setDrawerOpen(false)}
              className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
            >
              <Gavel className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Bids &amp; Auctions</span>
            </Link>
          </nav>
          <div className="mt-auto pt-6 border-t border-surface-container-highest/30">
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-full bg-surface-container-low text-on-surface-variant font-bold py-3 rounded-xl hover:bg-error-container hover:text-error transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>

        <div className="pt-20 pb-24 md:pb-12 px-4 md:px-6 lg:px-8 max-w-screen-2xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8">

            {/* ----------------------------------------------------------------
             * SIDEBAR — account nav
             * TODO: extract to shared <AccountSidebar>
             * ---------------------------------------------------------------- */}
            <aside className="hidden lg:flex md:sticky md:top-24 md:h-[calc(100vh-6rem)] w-72 flex-shrink-0 flex-col gap-2 p-6 bg-surface rounded-2xl overflow-y-auto no-scrollbar">
              <div className="mb-8">
                <h2 className="font-syne text-xl font-bold text-on-surface tracking-tight">
                  Account Settings
                </h2>
                <p className="text-xs text-on-surface-variant font-medium mt-1 opacity-60">
                  Manage your TradeHut profile
                </p>
              </div>

              <nav className="flex flex-col gap-1 flex-1">
                {/* Overview */}
                <Link
                  href="/account"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Overview
                  </span>
                </Link>

                {/* Orders */}
                <Link
                  href="/account/orders"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Orders
                  </span>
                </Link>

                {/* Bids & Auctions — ACTIVE */}
                <Link
                  href="/account/bids"
                  className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
                >
                  <Gavel className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Bids &amp; Auctions
                  </span>
                </Link>

                {/* My Requests */}
                <Link
                  href="/account/requests"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    My Requests
                  </span>
                </Link>

                {/* Wishlist */}
                <Link
                  href="/account/wishlist"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <Heart className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Wishlist
                  </span>
                </Link>

                {/* Addresses */}
                <Link
                  href="/account/addresses"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <MapPin className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Addresses
                  </span>
                </Link>

                {/* Payment Methods */}
                <Link
                  href="/account/payment-methods"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Payment Methods
                  </span>
                </Link>

                {/* Notifications */}
                <Link
                  href="/account/notifications"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <Bell className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Notifications
                  </span>
                </Link>

                {/* Security */}
                <Link
                  href="/account/security"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Security
                  </span>
                </Link>
              </nav>

              {/* Logout */}
              <div className="mt-auto pt-6 border-t border-surface-container-highest/30">
                <button className="w-full bg-surface-container-low text-on-surface-variant font-bold py-3 rounded-xl hover:bg-error-container hover:text-error transition-all flex items-center justify-center gap-2 active:scale-95">
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </aside>

            {/* ----------------------------------------------------------------
             * MAIN CONTENT
             * ---------------------------------------------------------------- */}
            <section className="flex-1 min-w-0">

              {/* Mobile menu trigger */}
              <div className="lg:hidden flex items-center gap-3 mb-4">
                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open account menu"
                  className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface h-10 w-10 flex items-center justify-center"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="font-syne font-bold text-sm text-on-surface-variant uppercase tracking-widest">
                  Bids &amp; Auctions
                </span>
              </div>

              {/* Page header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-10">
                <div>
                  <h1 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
                    Active Bids
                  </h1>
                  <p className="text-on-surface-variant mt-2 text-sm max-w-md font-medium">
                    You are currently participating in{" "}
                    {DEMO_ACTIVE_BIDS.length} auctions.
                  </p>
                </div>

                {/* Summary badges */}
                <div className="flex gap-3 flex-shrink-0 flex-wrap">
                  <div className="bg-surface-container-low px-4 py-2 rounded-xl flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-bid-green flex-shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Winning: {winningCount}
                    </span>
                  </div>
                  <div className="bg-surface-container-low px-4 py-2 rounded-xl flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-bid-red flex-shrink-0" />
                    <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Outbid: {outbidCount}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status filter tab bar */}
              <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 pt-2 pb-px">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-5">
                {STATUS_TABS.map((tab) => {
                  const isActive = activeTab === tab.value;
                  const count =
                    tab.value === "all"
                      ? DEMO_ACTIVE_BIDS.length
                      : DEMO_ACTIVE_BIDS.filter((b) => b.status === tab.value)
                          .length;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
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

              {/* Bid grid or empty state */}
              {filteredBids.length === 0 ? (
                <EmptyState tab={activeTab} />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredBids.map((bid) => (
                    <BidCard key={bid.id} bid={bid} />
                  ))}
                </div>
              )}

              {/* Recently Closed bento section */}
              {DEMO_CLOSED.length > 0 && <ClosedSection />}
            </section>
          </div>
        </div>

        {/* ----------------------------------------------------------------
         * MOBILE BOTTOM NAV
         * Replaces the sidebar on small screens (< lg).
         * TODO: extract to a shared <AccountBottomNav> or replace with the
         * global mobile nav once that component exists.
         * ---------------------------------------------------------------- */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest shadow-[0_-4px_20px_0_rgba(38,24,19,0.06)] px-6 py-3 flex justify-around items-center z-50">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <Store className="w-6 h-6" />
            <span className="text-[10px] font-bold">Home</span>
          </Link>
          <Link
            href="/account/bids"
            className="flex flex-col items-center gap-1 text-primary min-w-[44px] py-1"
          >
            <Gavel className="w-6 h-6" fill="currentColor" />
            <span className="text-[10px] font-bold">Bids</span>
          </Link>
          <Link
            href="/account/requests"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <FileText className="w-6 h-6" />
            <span className="text-[10px] font-bold">RFQs</span>
          </Link>
          <Link
            href="/account"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold">Profile</span>
          </Link>
        </nav>
      </div>
    </MainLayout>
  );
}
