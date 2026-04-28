"use client";

/**
 * Auction Hub — /auctions
 *
 * Ported from stitch_full_website_redesign_expansion/tradehut_auction_hub/code.html
 * Design-system tokens: Kinetic Material-3 derived (see .claude/design-system/tokens.md).
 *
 * Layout sections:
 *  1. Hero strip — dark bg-inverse-surface, live badge, "My Active Bids" widget
 *  2. Live Now — 12-col bento grid (featured card 8-col + two secondary cards 4-col)
 *  3. Starting Soon — horizontal snap-scroll rail
 *  4. Newsletter / CTA block — bg-primary-container accent
 *  5. Footer — 4-col grid, copyright bar
 *
 * Token note: `secondary` on Stores-FE is the legacy charcoal object.
 *   The bid-green flat token is `secondary-green` (#006c4b).
 *   `secondary-fixed-dim` (#3fdfa5) is a flat key — used for current-bid displays.
 *   `secondary-container` (#60f9bd) / `on-secondary-container` (#00714f) — flat keys.
 *
 * TODOs:
 * - TODO: fetch from /api/auctions/?status=live  (replace LIVE_AUCTIONS / UPCOMING with real data)
 * - TODO: fetch from /api/auctions/?status=scheduled  (replace UPCOMING with real data)
 * - TODO: websocket subscribe to /ws/auctions for live bid updates (update currentBid + bidCount)
 * - TODO: wire "Place Bid" / "Bid Now" to POST /api/auctions/:id/bids/
 * - TODO: wire "Set Reminder" to POST /api/auctions/:id/watch/
 * - TODO: replace My Active Bids widget with data from /api/bids/?mine=true&status=live
 * - TODO: implement filter state → API query params (category, ending_soon, price range)
 * - TODO: implement pagination / infinite scroll on the "Load More" button
 */

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import MainLayout from "@/components/Layouts/MainLayout";
import {
  Gavel,
  MapPin,
  Users,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Share2,
  Mail,
  SlidersHorizontal,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (mirrors apps/bids/models.py Auction / Bid shapes)
// ---------------------------------------------------------------------------
type BidStatus = "winning" | "outbid" | "live";

interface ActiveBidItem {
  id: string;
  title: string;
  currentBid: number;
  status: "winning" | "outbid";
  imageUrl: string;
  imageAlt: string;
}

interface LiveAuction {
  id: string;
  title: string;
  category: string;
  location: string;
  bidderCount: number;
  currentBid: number;
  currency: string;
  imageUrl: string;
  imageAlt: string;
  closingIn?: string; // e.g. "04:12"
  featured?: boolean;
}

interface UpcomingAuction {
  id: string;
  title: string;
  category: string;
  startingBid: number;
  currency: string;
  startsIn: string; // e.g. "02h : 15m : 44s"
  imageUrl: string;
  imageAlt: string;
}

// ---------------------------------------------------------------------------
// Demo data — TODO: replace with real API calls
// ---------------------------------------------------------------------------
const MY_ACTIVE_BIDS: ActiveBidItem[] = [
  {
    id: "bid-1",
    title: "Zenith Chronomaster",
    currentBid: 12450,
    status: "winning",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBDrL8e-35oTEIE4kRjl_xwUpG0auNpMuJX1q4Ae-lLf_Vy56ya3AF9Xpm-qaPvVYgB9neytDW3VyfzVFyVBZzMcvMaVeI3w1zfTTSfeeCAPVs8g-sARkEpylzjMRDz9GupopAHuZy1ab8Nw8o7uV9xJ2QPMcNlREyC3U-j7sC8RiJz5vEL-_0DniN2PbApd1Xb4KClAXsBcwl1ZNcehYpHNlzkIIYTS6aPNp4UW4pM9IQaqwlXJ7swYSjHB9Y0-A3wfuykeL_OoNg",
    imageAlt: "Minimalist white designer watch on a marble surface",
  },
  {
    id: "bid-2",
    title: "H-Series Prototype",
    currentBid: 2100,
    status: "outbid",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCCAc_hSjE_doDvqcNF7d3rfIHnv5YoV0mQWe-ZZr0ETxhyvlBM48S00iTvZNS5osNfXmKa5twRTaA5gVcswLWVyvzBOAVe1bJSNb9A21t-dqwAZY7UFZCuVBwHWt8JJL1BvqX_zeQEs4T8wg8ZZaKq4W0d0-32Bz28Q-cmhki-8DhbEav768fHXdzf1CUVkomebzMmyt7B2VIS8LMBGituEfkY4-S3OFIBjg5PuENcaEAQmGl2_S3vYqS4XvnFFJOVbn13RAiM2pk",
    imageAlt: "Premium black headphones with metallic accents",
  },
];

const LIVE_AUCTIONS: LiveAuction[] = [
  {
    id: "live-1",
    title: "Metropolitan Industrial Complex #04",
    category: "Industrial Real Estate",
    location: "Berlin, DE",
    bidderCount: 142,
    currentBid: 842000,
    currency: "USD",
    featured: true,
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBLUCpTIFtvB5HbNWg2YuIeyuvk4lAETW8iwOL53Da9tSKPfCs1dS5y0O1bpL-tRz9z2cSvxBOpb0s13mV6msdyRZAIIrtyJ1pdpT3P_KrzJH5vqQUdwWU270j6uymICUvSHH-8JtldgjH0n4Dh6oR6uPsTyElKXtugahVEKijg38lUjetbLOPutLRt0T0e9CRuHC_H1oJpMjOK8hALRicNJWNo9i8JcXDvQUqWH7ndcYSpz9-zLxvfhysWjdQ8zH5m2OZ2EN5PUoI",
    imageAlt:
      "Modern architectural interior with a grand concrete staircase and minimalist lighting",
  },
  {
    id: "live-2",
    title: "Kinetica Sculpture Series",
    category: "Art & Design",
    location: "Paris, FR",
    bidderCount: 28,
    currentBid: 4500,
    currency: "USD",
    closingIn: "04:12",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDlA-g7EnjzDflwnx_iY6gAG3p-Tvy1Kh_nqgMx3vPZ18It82F_sY9VIzEUcFsGauywZf8ZtTbm6me_qgS2k-C8PKbHteXBDqw-w6KDFtFryPi9Y1oNGQQIj3S3oT5-ANSdk0SC5vvYT5L-QwTjzj8Lx6_rDtr8NslW-lXDufsrEGmOb96EMhF62iAZ7ttxeezGvLJml7mlUKG-swtjBqwjxbiKorXS4zd9H4KlwB2gLhQS9QH2AW4YV0k-ZibJmLxT4bX9gwWvtyg",
    imageAlt: "Abstract modern sculpture with copper and glass elements",
  },
  {
    id: "live-3",
    title: "Precision Unit XL-9",
    category: "Industrial Equipment",
    location: "Stuttgart, DE",
    bidderCount: 61,
    currentBid: 12800,
    currency: "USD",
    closingIn: "12:45",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBmmuVRapvEai4ZHNQ4mwyHXFNMpI7awMppniqDO1vQMTgzJeL-YPADMX0RqfaJoGNzH3-KkXLiXWYAsp490kaErv7lYuFA0Fx1MMdhSPoAJkmc1Q0BlpzYHcui5j2ctUxmwvGwRl0l2OletGLDOJHPU3Sm6bLKfs4HarHI832AchlXtvjCwgofFBPVs6LqSNpRDQ2QMIv2A2pnm3zV6zHeJxd-L1I2WV-e38Ix1Y70GYmDP0jgXEYWdqgX6zW4zZGuoJ1WV_qT45g",
    imageAlt: "Industrial robotic arm working on precision engineering part",
  },
];

const UPCOMING_AUCTIONS: UpcomingAuction[] = [
  {
    id: "up-1",
    title: "Cloud Infrastructure Node B",
    category: "Enterprise Data Clusters",
    startingBid: 45000,
    currency: "USD",
    startsIn: "02h : 15m : 44s",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDbET4YyAoSTLSBTCHfYUYqMnR7juRA0GG1fwZvjTzb_oh8aGe-9eNrbGQ59YsRIOP1HYxTaNZ0-V8VGRFZVFNdUWbj-WRqN_ab7UMX9jIqAvO90ko3EDxtgje4Zo99_E6bk4dVA5Q14NW_vadozemmHc7KYK7_vsgPBwMu6euLf-YQIpestgZyuKP3-lernUkXS-yqYT4YOBzPdIKTM9AM485uj_oEdmxvuIAW2cXpmH1UgJnUvI07uV1gBxKGzcRnFALwuqpl-g8",
    imageAlt: "Cyberpunk style glowing blue and purple server racks in a dark data center",
  },
  {
    id: "up-2",
    title: "Skyline Loft Residence",
    category: "Luxury Residential Real Estate",
    startingBid: 1200000,
    currency: "USD",
    startsIn: "05h : 22m : 10s",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCYoVbZoYi18ij92FoDUcRpDFu9meYQb-2sLKYRVfRdKPZsnK6xrojCWr6RxlJHp2JbOgvUJkYdrknH0Ox23VAxhhR78zCCkve5QLi3A4fFh3U4j74MlA-r0W5DABSDH7Wv1DchtEjrLBSGHXh8LdEO04hbNgx5H8RRatQ7Tazd1Ctlf0qIw32uLYikgmmsluXO_zZMerAJ2lWklS-LEcsP5XY1lijslro85hOaAo62UgOMdDfEV2a2bUPzLBvdQpqP9hwMyW0IO3w",
    imageAlt: "Interior of a luxury modern apartment with floor to ceiling windows at dusk",
  },
  {
    id: "up-3",
    title: "Neural Engine v2.0",
    category: "Hardware Research Prototypes",
    startingBid: 8500,
    currency: "USD",
    startsIn: "10h : 05m : 00s",
    imageUrl:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAdBKOJIqNqLW0EJOuyvF2jrg8HElLPEyw4nW0e-1H_hkEmLEqV6KjcmJKKzCPmIXr-gXejBE4mZd39bIGMKEVZwLgyeAHZU1ZNN44jOUOqLUQbQUUzE5rjE94W7E6-ZFlRfvcn-l2MuldrEw46v0wmP6kANX5LXnfGp4yKQmGkbSvbnlGfWjJIB-y-KoDWnd2f26Eu6yz7c7CnaPPNLWgqQxwwf_7RIo4jK57yxdG-v0yfGq54SCjhTvOaExvPUBGT2790kqyvcc24",
    imageAlt: "Close up of a motherboard with futuristic glowing gold circuits",
  },
];

const AUCTION_CATEGORIES = [
  "All Categories",
  "Industrial Real Estate",
  "Industrial Equipment",
  "Art & Design",
  "Enterprise Technology",
  "Hardware Prototypes",
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
function formatPrice(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}k`;
  return `$${n.toLocaleString()}`;
}

function formatPriceFull(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---------------------------------------------------------------------------
// Pill (same recipe as rfq/page.tsx)
// ---------------------------------------------------------------------------
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-full">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Bid status badge
// ---------------------------------------------------------------------------
function BidStatusBadge({ status }: { status: "winning" | "outbid" }) {
  if (status === "winning") {
    return (
      <span className="bg-bid-green/10 text-bid-green px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
        Winning
      </span>
    );
  }
  return (
    <span className="bg-bid-red/10 text-bid-red px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
      Outbid
    </span>
  );
}

// ---------------------------------------------------------------------------
// My Active Bids Widget (hero right column)
// ---------------------------------------------------------------------------
function MyActiveBidsWidget() {
  return (
    <div className="bg-surface-container-lowest/10 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-white font-syne font-bold text-xl">My Active Bids</h3>
        <span className="text-secondary-fixed-dim font-mono text-sm">
          {MY_ACTIVE_BIDS.length} Active
        </span>
      </div>

      <div className="space-y-4">
        {MY_ACTIVE_BIDS.map((bid) => (
          <div
            key={bid.id}
            className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/5"
          >
            {/* Thumbnail */}
            <div className="w-12 h-12 rounded-lg bg-surface-variant/20 overflow-hidden flex-shrink-0 relative">
              <Image
                src={bid.imageUrl}
                alt={bid.imageAlt}
                fill
                sizes="48px"
                className="object-cover"
                unoptimized
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm truncate">{bid.title}</p>
              <p
                className={
                  bid.status === "winning"
                    ? "text-secondary-fixed-dim font-mono text-xs"
                    : "text-error font-mono text-xs"
                }
              >
                {formatPriceFull(bid.currentBid)}
              </p>
            </div>

            {/* Status */}
            <div className="text-right flex-shrink-0">
              <span className="block text-[10px] text-white/40 uppercase font-bold mb-0.5">
                Status
              </span>
              <span
                className={
                  bid.status === "winning"
                    ? "text-secondary-fixed-dim text-xs font-bold"
                    : "text-error text-xs font-bold"
                }
              >
                {bid.status === "winning" ? "Winning" : "Outbid"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button className="w-full mt-6 py-3 min-h-[44px] border border-secondary-fixed-dim/30 text-secondary-fixed-dim rounded-lg font-bold text-sm hover:bg-secondary-fixed-dim/10 transition-colors active:scale-95">
        Manage All Bids
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Featured Live Auction Card (wide, 8-col)
// ---------------------------------------------------------------------------
function FeaturedAuctionCard({ auction }: { auction: LiveAuction }) {
  return (
    <div className="md:col-span-8 group relative overflow-hidden rounded-2xl bg-surface-container-low shadow-card hover:shadow-card-hover transition-all duration-300">
      <div className="aspect-video overflow-hidden">
        <Image
          src={auction.imageUrl}
          alt={auction.imageAlt}
          width={900}
          height={506}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          unoptimized
        />
      </div>

      {/* Live badge */}
      <div className="absolute top-6 left-6 flex flex-col gap-2">
        <span className="bg-secondary-green text-on-secondary px-4 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Live Bid
        </span>
      </div>

      {/* Info footer */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 justify-between items-end">
        <div className="space-y-2">
          <h3 className="font-syne text-2xl md:text-3xl font-bold text-on-surface">
            {auction.title}
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-on-surface-variant text-sm">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {auction.location}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {auction.bidderCount} Bidders
            </span>
          </div>
        </div>

        {/* Bid box */}
        <div className="bg-surface-container-lowest p-5 md:p-6 rounded-xl shadow-lg min-w-[180px] md:min-w-[200px] flex-shrink-0 w-full md:w-auto">
          <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-1">
            Current Price
          </p>
          <p className="font-mono text-2xl md:text-3xl font-bold text-secondary-green mb-4">
            {formatPriceFull(auction.currentBid)}
          </p>
          <button className="w-full bg-secondary-green text-on-secondary py-3 min-h-[44px] rounded-lg font-syne font-extrabold hover:bg-on-secondary-container transition-colors shadow-lg active:scale-95 uppercase tracking-wide">
            Place Bid
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Secondary Live Card (sidebar stack, 4-col)
// ---------------------------------------------------------------------------
function SecondaryLiveCard({ auction }: { auction: LiveAuction }) {
  return (
    <div className="bg-surface-container-lowest p-5 md:p-6 rounded-2xl shadow-card hover:shadow-card-hover border-l-4 border-secondary-green transition-all duration-300">
      <div className="flex gap-4 mb-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 relative">
          <Image
            src={auction.imageUrl}
            alt={auction.imageAlt}
            fill
            sizes="80px"
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="min-w-0">
          {auction.closingIn && (
            <span className="text-[10px] text-secondary-green font-bold uppercase tracking-tighter block mb-0.5">
              Closing in {auction.closingIn}
            </span>
          )}
          <h4 className="font-syne font-bold text-on-surface leading-tight truncate">
            {auction.title}
          </h4>
          <p className="font-mono font-bold text-lg text-secondary-green">
            {formatPrice(auction.currentBid)}
          </p>
        </div>
      </div>

      <button className="w-full py-2 min-h-[44px] bg-secondary-container/30 text-secondary-green rounded-lg font-bold text-sm hover:bg-secondary-container/50 transition-colors active:scale-95">
        Bid Now
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upcoming Auction Card (horizontal rail)
// ---------------------------------------------------------------------------
function UpcomingCard({ auction }: { auction: UpcomingAuction }) {
  return (
    <div className="min-w-[320px] sm:min-w-[400px] bg-surface-container-lowest rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover group snap-start flex-shrink-0 transition-all duration-300">
      {/* Image */}
      <div className="h-56 md:h-64 relative">
        <Image
          src={auction.imageUrl}
          alt={auction.imageAlt}
          fill
          sizes="(max-width: 640px) 320px, 400px"
          className="object-cover group-hover:scale-110 transition-transform duration-500"
          unoptimized
        />
        {/* Countdown badge */}
        <div className="absolute bottom-4 left-4 bg-tertiary text-on-tertiary px-3 py-1 rounded-md text-xs font-bold font-syne">
          {auction.startsIn}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 md:p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="min-w-0 pr-4">
            <h3 className="font-syne font-bold text-xl text-on-surface leading-tight">
              {auction.title}
            </h3>
            <p className="text-on-surface-variant text-sm">{auction.category}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase block mb-0.5">
              Starting at
            </span>
            <p className="font-mono font-bold text-primary-container">
              {formatPrice(auction.startingBid)}
            </p>
          </div>
        </div>

        <button className="w-full py-3 md:py-4 min-h-[44px] border border-outline-variant rounded-lg font-bold text-sm text-on-surface-variant hover:bg-on-surface hover:text-white transition-all active:scale-95">
          Set Reminder
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar (category pills — mobile-friendly horizontal scroll)
// ---------------------------------------------------------------------------
function CategoryFilterBar({
  active,
  onChange,
}: {
  active: string;
  onChange: (cat: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {AUCTION_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={[
            "whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 min-h-[36px]",
            active === cat
              ? "bg-secondary-green text-on-secondary shadow-sm"
              : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
          ].join(" ")}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AuctionHubPage() {
  const [activeCategory, setActiveCategory] = useState("All Categories");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // Close drawer on ESC key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && filterDrawerOpen) setFilterDrawerOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filterDrawerOpen]);

  // Client-side filter — TODO: replace with server query params once API is wired
  const filteredLive =
    activeCategory === "All Categories"
      ? LIVE_AUCTIONS
      : LIVE_AUCTIONS.filter((a) => a.category === activeCategory);

  const [featured, ...secondaryLive] = filteredLive;

  return (
    <MainLayout>
    <div className="min-h-screen bg-surface text-on-surface">

      {/* ── Filter drawer (mobile only) ─────────────────────────────────────── */}
      {filterDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-inverse-surface/40 backdrop-blur-sm md:hidden"
          onClick={() => setFilterDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed left-0 top-0 h-full w-80 z-50 bg-surface-container-lowest shadow-card flex flex-col p-6 overflow-y-auto no-scrollbar transition-transform duration-300 md:hidden ${
          filterDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Auction filters"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-syne text-lg font-bold text-on-surface">Filters</h2>
          <button
            onClick={() => setFilterDrawerOpen(false)}
            aria-label="Close filters"
            className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2">
          {AUCTION_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setFilterDrawerOpen(false); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                activeCategory === cat
                  ? "bg-secondary-green text-on-secondary"
                  : "text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <main>
        {/* ====================================================================
            1. HERO — dark strip with live badge + My Active Bids widget
        ==================================================================== */}
        <section className="relative min-h-[640px] md:min-h-[716px] flex items-center overflow-hidden bg-inverse-surface">
          {/* Background image */}
          <div className="absolute inset-0 z-0">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDds4aJw3SmuxkYU7EmcB2I1ibZUev1zEroRL2bhQQWz5WmVRnnR7KkEFKFcn7z6oSV0-mlB7aFUKv2Ctk-UBYcBisGy34o6VbGKoo0gS2U3tSAlpDV6s7FuY_pyyJ2To1I8ECfhKx5CXDTOuV4y9ed7SBZMXhpDMl9sZaqIF_DFjA4wQ8x2s_By1n3A4wAgWoz0JD2DF-MYQAIUXym6aWHtBNC3kGjxeMCIEp5baRTuan1LR88Pw95eChSLo7q1zH07HQXa0usXU4"
              alt="Abstract architectural render with flowing organic shapes in deep copper tones"
              fill
              className="object-cover opacity-40"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-inverse-surface via-inverse-surface/80 to-transparent" />
          </div>

          {/* Content */}
          <div className="relative z-10 max-w-screen-2xl mx-auto px-4 md:px-8 py-16 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-12 items-center w-full">
            {/* Left — headline */}
            <div className="space-y-6 md:space-y-8">
              {/* Live badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold tracking-widest uppercase">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-green opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary-green" />
                </span>
                Live Auction Hub
              </div>

              <h1 className="font-syne text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white leading-[0.9] tracking-tighter">
                TRADE WITH{" "}
                <br />
                <span className="text-secondary-fixed-dim">PRECISION</span>
              </h1>

              <p className="text-base md:text-lg lg:text-xl text-surface-variant/80 max-w-lg font-body leading-relaxed">
                High-frequency digital auctions meets architectural commerce.
                Experience the pulse of the market in our live bidding gallery.
              </p>

              <div className="flex flex-wrap gap-3 md:gap-4">
                <button className="px-6 md:px-8 py-3 md:py-4 min-h-[44px] bg-primary-container text-on-primary-container rounded-lg font-syne font-bold text-base md:text-lg hover:scale-105 transition-transform shadow-lg active:scale-95">
                  Explore Live Bids
                </button>
                <button className="px-6 md:px-8 py-3 md:py-4 min-h-[44px] bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-lg font-syne font-bold text-base md:text-lg hover:bg-white/20 transition-all active:scale-95">
                  View Schedule
                </button>
              </div>
            </div>

            {/* Right — My Active Bids widget (hidden on small mobile, visible md+) */}
            <div className="hidden sm:block lg:justify-self-end w-full max-w-md">
              <MyActiveBidsWidget />
            </div>
          </div>
        </section>

        {/* ====================================================================
            2. LIVE NOW — bento grid
        ==================================================================== */}
        <section className="py-16 md:py-24 bg-surface">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-12">
              <div className="space-y-2">
                <h2 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
                  LIVE NOW
                </h2>
                <p className="text-on-surface-variant font-medium text-sm md:text-base">
                  Global high-frequency auctions currently in progress.
                </p>
              </div>

              <Link
                href="#"
                className="group flex items-center gap-2 text-primary-container font-bold text-sm md:text-base shrink-0"
              >
                View Live Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Category filter bar — trigger on mobile, pill bar on md+ */}
            <div className="mb-6 md:mb-8">
              {/* Mobile: single "Filters" button that opens the drawer */}
              <div className="flex items-center gap-3 md:hidden">
                <button
                  onClick={() => setFilterDrawerOpen(true)}
                  aria-label="Open filters"
                  className="flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-full bg-surface-container-low text-on-surface-variant font-bold text-sm hover:bg-surface-container transition-colors active:scale-95"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeCategory !== "All Categories" && (
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-secondary-green text-on-secondary text-[10px] font-black">
                      1
                    </span>
                  )}
                </button>
                {activeCategory !== "All Categories" && (
                  <span className="text-xs font-medium text-on-surface-variant truncate">
                    {activeCategory}
                  </span>
                )}
              </div>
              {/* Desktop: full horizontal pill bar */}
              <div className="hidden md:block">
                <CategoryFilterBar
                  active={activeCategory}
                  onChange={setActiveCategory}
                />
              </div>
            </div>

            {/* Bento grid */}
            {filteredLive.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                {/* Featured card */}
                {featured && <FeaturedAuctionCard auction={featured} />}

                {/* Secondary cards */}
                {secondaryLive.length > 0 && (
                  <div className="md:col-span-4 space-y-6 md:space-y-8">
                    {secondaryLive.map((a) => (
                      <SecondaryLiveCard key={a.id} auction={a} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-surface-container-lowest rounded-2xl p-12 text-center ghost-border">
                <Gavel className="w-12 h-12 text-on-surface-variant mb-4 mx-auto" />
                <p className="text-on-surface-variant font-medium">
                  No live auctions in this category right now.
                </p>
                <button
                  onClick={() => setActiveCategory("All Categories")}
                  className="mt-4 text-secondary-green font-bold text-sm hover:underline active:scale-95 transition-all"
                >
                  Show all categories
                </button>
              </div>
            )}
          </div>
        </section>

        {/* ====================================================================
            3. STARTING SOON — horizontal snap-scroll rail
        ==================================================================== */}
        <section className="bg-surface-container-low py-16 md:py-24 overflow-hidden">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8 mb-8 md:mb-12 flex items-center justify-between">
            <h2 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight italic text-on-surface">
              STARTING SOON
            </h2>

            {/* Carousel nav (decorative on mobile — scroll handles it natively) */}
            <div className="hidden sm:flex gap-2">
              <button
                aria-label="Scroll left"
                className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container-lowest transition-colors active:scale-95"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                aria-label="Scroll right"
                className="w-12 h-12 rounded-full border border-outline-variant flex items-center justify-center hover:bg-surface-container-lowest transition-colors active:scale-95"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Snap-scroll rail */}
          <div className="flex gap-6 md:gap-8 px-4 md:px-8 overflow-x-auto no-scrollbar pb-8 md:pb-10 snap-x snap-mandatory">
            {UPCOMING_AUCTIONS.map((auction) => (
              <UpcomingCard key={auction.id} auction={auction} />
            ))}
          </div>
        </section>

        {/* ====================================================================
            4. NEWSLETTER / CTA block
        ==================================================================== */}
        <section className="py-16 md:py-24 bg-surface">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
            <div className="bg-primary-container rounded-[2rem] p-8 sm:p-12 md:p-20 relative overflow-hidden">
              {/* Decorative skew band */}
              <div className="absolute top-0 right-0 w-1/3 h-full bg-white/5 skew-x-12 translate-x-20 pointer-events-none" />

              <div className="relative z-10 max-w-2xl">
                <h2 className="font-syne text-3xl sm:text-4xl md:text-6xl font-extrabold text-on-primary-container leading-tight mb-4 md:mb-6">
                  NEVER MISS AN
                  <br />
                  AUCTION OPPORTUNITY.
                </h2>
                <p className="text-on-primary-container/80 text-base md:text-lg mb-8 md:mb-10 leading-relaxed">
                  Join 25,000+ high-frequency traders receiving real-time
                  notifications on premium assets and unique opportunities.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                  <input
                    type="email"
                    placeholder="Enter your business email"
                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-xl px-5 md:px-6 py-3 md:py-4 focus:ring-2 focus:ring-white/40 text-sm md:text-base min-h-[44px]"
                  />
                  <button className="bg-on-primary-container text-white px-6 md:px-8 py-3 md:py-4 min-h-[44px] rounded-xl font-bold font-syne hover:scale-105 transition-transform active:scale-95 whitespace-nowrap">
                    Join TradeHut
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
    </MainLayout>
  );
}
