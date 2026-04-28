"use client";

/**
 * Deals / Flash Sales — /deals
 *
 * Ported from stitch_full_website_redesign_expansion/tradehut_deals_flash_sales/code.html
 * Design-system tokens: Kinetic Material-3 derived (see .claude/design-system/tokens.md).
 *
 * Layout sections:
 *  1. Hero — dark (gray-900) full-bleed, hero countdown timer, product image
 *  2. Filter tabs — Flash Sales / Daily Deals / Weekly Specials / Clearance
 *  3. Flash Sale card grid — discount badge, per-product countdown, stock bar, CTA
 *  4. Daily Deals strip — 4-col image + save label cards
 *  5. Weekly Specials bento — large highlight card + 2 stacked secondary cards
 *  6. Footer — 4-col grid, newsletter input, copyright
 *
 * TODO: fetch /api/deals/?active=true (replace FLASH_DEALS, DAILY_DEALS, WEEKLY_SPECIALS mock data)
 * TODO: fetch /api/deals/?type=daily (replace DAILY_DEALS mock data)
 * TODO: fetch /api/deals/?type=weekly (replace WEEKLY_SPECIALS mock data)
 * TODO: wire "Claim Now" button to POST /api/deals/:id/claim/
 * TODO: replace hero countdown with live data from /api/deals/next-batch/
 * TODO: replace per-product countdown with real expiry timestamps
 * TODO: implement filter tab state → API query params (?type=flash|daily|weekly|clearance)
 * TODO: implement pagination / "Load More" on all grids
 * TODO: replace placeholder images with Next.js <Image> once real CDN URLs are available
 */

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MainLayout from "@/components/Layouts/MainLayout";
import { Clock, Zap, Flame, ArrowRight, Send } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DealType = "flash" | "daily" | "weekly" | "clearance";
type StockStatus = "limited" | "in_stock" | "almost_gone";

interface FlashDeal {
  id: string;
  title: string;
  imageUrl: string;
  imageAlt: string;
  originalPrice: number;
  salePrice: number;
  discountPct: number;
  claimedPct: number;
  stockStatus: StockStatus;
  /** ISO countdown string — in real data this is an expiry timestamp */
  countdownHms: string;
}

interface DailyDeal {
  id: string;
  title: string;
  imageUrl: string;
  imageAlt: string;
  price: number;
  saveAmount: number;
}

interface WeeklySpecial {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  discountLabel: string;
  featured: boolean;
  ctaLabel: string;
}

// ---------------------------------------------------------------------------
// Mock data — TODO: replace with /api/deals/
// ---------------------------------------------------------------------------
const FLASH_DEALS: FlashDeal[] = [
  {
    id: "fd-1",
    title: "Precision Elite Runner",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBiZQrc22QDA1X9rrpml-7iyE26sAizW9e2UEs4iSEtkve0xRXSj-0daaMLN2CiOmIOWWktYSBmJ_2ah_1-ujWliUuzEi1isDRXKNMvQpmiAIoJQW79w9YWL6e4FO5r9SkIimL7BfEx-pGwJCAAaX8RyflRPwVq_LY24xVTxewHNmAIQBTrLqs1LdPkVedeNvvF-KxqjvNnpGkYXjBUEvvO5NWvk1i30TaQs3NBGqjOxug0-ZJraelH2RVqgkh4C4kpNKNvLXuVTwY",
    imageAlt: "Vibrant red luxury sneaker on a clean minimalist background",
    originalPrice: 178,
    salePrice: 89,
    discountPct: 50,
    claimedPct: 85,
    stockStatus: "limited",
    countdownHms: "00:45:12",
  },
  {
    id: "fd-2",
    title: "Chronos Series 01",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDm3UaXxz6antrjXt7wzBMDq3AYcTKUpq95gbSeUNlwaYFZeVJw5jaa70YDHCv4gkL57qqRfGBBRVp3UjWYlrRnl8V7BMPj4n-YVXFwnOd4HiPpAGEgGyzq_9Y-5Mi4SADL3epejzHLtBFrnCmTigEob6L4d4Aapni1hr2QTwBFEzVWWy10uHkqOw4SiX3AXYEnXq-cJUjqKIXKBz89sfXoKNxtKzHWMYESf5d4ci86oUaV5KjZopYd4qm93mIEZhVzoK5P7n2dYd8",
    imageAlt: "Minimalist wrist watch with white face and tan leather strap",
    originalPrice: 380,
    salePrice: 245,
    discountPct: 35,
    claimedPct: 42,
    stockStatus: "in_stock",
    countdownHms: "01:12:05",
  },
  {
    id: "fd-3",
    title: "Vibe Studio ANC",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuC9k5iLXwNEOdK8IuhrTC_ri-B2VXxhf9_0_ZM7lkYL6noSqtNPINJnRzPjeMl1hQObAIYxNfoXMnabGpUu0FxsdufnyUwzXUgNqZIx1Zv4zooaQriSv-k7oXb-1LqtuEbVUJDPGkoImrQH8MAj4i8P0QC42JKdy8oIQnRdKWeZTcrtx9GPTrOkiVy9ftrYuTKEIcD_F6Pqzn0OAgppALwotaKuAukGCh1QjKk9XCYzpcJyKKv2UhegEBNZ2as_4nrH__Kek0Oc1Lw",
    imageAlt: "Studio quality over-ear headphones with soft cinematic lighting",
    originalPrice: 300,
    salePrice: 120,
    discountPct: 60,
    claimedPct: 92,
    stockStatus: "almost_gone",
    countdownHms: "00:15:59",
  },
];

const DAILY_DEALS: DailyDeal[] = [
  {
    id: "dd-1",
    title: "Retro Frame Shades",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAMuyE0bFgIIAZjuk0z-grmhovkjjxqPG7izpUVF4SUBi9brbkoypULZrSob59Vjjy19kKLtfxO4VIEC9ckL4lYgEH-De2z5lg2pkqTsTP4vG9EOpKUuK7vACoqHaUt4h9wrjNuCPBMxhvaPshIuKSKB6TgVu8T8JOTQeDCdXiCHHHqNhN1i5q3pdBB78QJrkxem7y5U5PMqY4-2qw4HDYbYyCi2Anrrp1E-70BWXezcobrwpRT15d7T2PMrGjMhZnJHDHCYEnBHiY",
    imageAlt: "Modern designer sunglasses with high contrast architectural shadows",
    price: 129,
    saveAmount: 45,
  },
  {
    id: "dd-2",
    title: 'Pro Slate 12"',
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAQqiXwI5OKhfxGNJf8I_o72_982BnMk5KqXhDjoaHjb2-VNq-hw7pHh5OqZ77tfbk3zKdrS-Ii--fm7pgvouk8b1XqjL1v-6GBbAil_uDIbA2LenHLZIWDSgtNARRGBJiPJJNbc16-0FymITrFLhoGvj0ATqs9oixFxfv-hKIen5ZFEUtXMAyKySELHQLsvugJuCSRepLe1Y4IQ0JZWutajnhoi5YEYXJTNnhuSJiD-QNVsuccBGI4ySHDl3_Vx1YECysCEGdhDpI",
    imageAlt: "Sleek silver tablet showing a minimalist creative app interface",
    price: 849,
    saveAmount: 120,
  },
  {
    id: "dd-3",
    title: "Optic X-7 Camera",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCshTJo1fwuyPEiAKdOJrwFnoSE19iNLPRJ9ugpBA7IX6fseRugyKOpDYm3h-w01T3RhtXXKI-f19aiT9DBE7-tBxTNAcnQr42WoySXG7peEg5qwkdGr0OcEdKjVg3XzDrVIRbG7crmc-6t7YE184MDsj0BADSPbjYkHLoml7KbKDJu0ydP1TFh7cOxiEvFOiAaVCEu5FU3-B42pR-K-Gp5fBh-yOMYCxgfsRUr8u8xug18SQdbmJDOeok4js1aqhAmP9k5SCKam_U",
    imageAlt: "Classic vintage film camera on a wooden desk with soft natural window lighting",
    price: 315,
    saveAmount: 80,
  },
  {
    id: "dd-4",
    title: "Nexus Prime Pro",
    imageUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCAi1Qnolxodi60eZwTaw6kjCmHmMr3t1vSLzDZTCzKyRPlV4O_9i1hkE1fIPzjne4aCP-YQYGFQK53SCCEPY9QujyrmSREjWqQLw7Wx1zS4dLGHDb6mrcDMxMamfCxMXvUTEVFRhbzFDR9dGwlwtASZCv5Tna2sX8YP-Z32DW3kUv8MK3BPUSHB5sQBInRpbwPU4uUXjGEk2VaV23-GodCPFDqwyiFX2aGVfpDHSI9lOLoi_P241iqLBu2wSb-RdsL0nwKPtBZ26k",
    imageAlt: "Elegant luxury smartphone on a marble surface with dramatic overhead lighting",
    price: 999,
    saveAmount: 200,
  },
];

// ---------------------------------------------------------------------------
// Stock status helpers
// ---------------------------------------------------------------------------
function stockLabel(status: StockStatus): { text: string; className: string } {
  switch (status) {
    case "limited":
      return { text: "Limited Stock", className: "text-primary-container" };
    case "in_stock":
      return { text: "In Stock", className: "text-bid-green" };
    case "almost_gone":
      return { text: "Almost Gone", className: "text-error" };
  }
}

// ---------------------------------------------------------------------------
// Hero countdown — ticks every second from a fixed seed for demo purposes.
// TODO: replace seed with real expiry from /api/deals/next-batch/
// ---------------------------------------------------------------------------
const HERO_SEED_SECONDS = 2 * 3600 + 14 * 60 + 37; // 02:14:37

function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Animated discount badge on the product card image */
function DiscountBadge({ pct }: { pct: number }) {
  return (
    <div className="absolute top-4 left-4 bg-primary-container text-on-primary px-3 py-1 rounded-md font-mono font-bold text-lg animate-pulse z-10">
      -{pct}%
    </div>
  );
}

/** "Ends in HH:MM:SS" overlay at the bottom of the product image */
function TimeOverlay({ hms }: { hms: string }) {
  return (
    <div className="absolute bottom-4 left-4 right-4 bg-gray-900/60 backdrop-blur-md text-white py-2 px-4 rounded-lg flex justify-between items-center z-10">
      <span className="text-xs font-semibold tracking-wider uppercase inline-flex items-center gap-1">
        <Clock className="w-3.5 h-3.5" aria-hidden />
        Remaining
      </span>
      <span className="font-mono text-xs sm:text-sm">{hms}</span>
    </div>
  );
}

/** Stock progress bar with percentage label and status text */
function StockBar({
  claimedPct,
  status,
}: {
  claimedPct: number;
  status: StockStatus;
}) {
  const { text, className } = stockLabel(status);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs font-bold text-on-surface-variant uppercase tracking-wider">
        <span>Claimed: {claimedPct}%</span>
        <span className={className}>{text}</span>
      </div>
      <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-container rounded-full transition-all duration-700"
          style={{ width: `${claimedPct}%` }}
        />
      </div>
    </div>
  );
}

/** Individual flash-sale product card */
function FlashDealCard({ deal }: { deal: FlashDeal }) {
  return (
    <article className="bg-surface-container-lowest rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 group">
      {/* Product image */}
      <div className="relative mb-6 overflow-hidden rounded-lg aspect-square bg-surface-container-low">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={deal.imageUrl}
          alt={deal.imageAlt}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <DiscountBadge pct={deal.discountPct} />
        <TimeOverlay hms={deal.countdownHms} />
      </div>

      {/* Card body */}
      <div className="space-y-4">
        <h3 className="text-xl font-headline font-bold text-on-surface">
          {deal.title}
        </h3>

        {/* Pricing */}
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-2xl font-bold text-primary">
            ${deal.salePrice.toFixed(2)}
          </span>
          <span className="font-mono text-sm text-on-surface-variant line-through">
            ${deal.originalPrice.toFixed(2)}
          </span>
        </div>

        <StockBar claimedPct={deal.claimedPct} status={deal.stockStatus} />

        {/* CTA */}
        <button className="w-full primary-gradient text-on-primary py-4 rounded-lg font-headline font-bold uppercase tracking-widest text-sm active:scale-95 transition-transform hover:shadow-lg inline-flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" aria-hidden />
          Claim Now
        </button>
      </div>
    </article>
  );
}

/** Individual daily-deal card (compact) */
function DailyDealCard({ deal }: { deal: DailyDeal }) {
  return (
    <article className="bg-surface-container-lowest p-4 rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={deal.imageUrl}
        alt={deal.imageAlt}
        className="w-full aspect-square object-cover rounded-lg mb-4 group-hover:scale-105 transition-transform duration-500"
      />
      <div className="font-mono text-sm text-primary-container font-bold mb-1">
        SAVE ${deal.saveAmount}
      </div>
      <h4 className="font-bold text-on-surface truncate text-sm">{deal.title}</h4>
      <div className="font-mono font-bold text-lg text-on-surface mt-2">
        ${deal.price.toFixed(2)}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Filter tab definitions
// ---------------------------------------------------------------------------
const FILTER_TABS: { id: DealType; label: string }[] = [
  { id: "flash", label: "Flash Sales" },
  { id: "daily", label: "Daily Deals" },
  { id: "weekly", label: "Weekly Specials" },
  { id: "clearance", label: "Clearance" },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function DealsPage() {
  const [activeTab, setActiveTab] = useState<DealType>("flash");
  const heroCountdown = useCountdown(HERO_SEED_SECONDS);

  const handleTabClick = useCallback((tab: DealType) => {
    setActiveTab(tab);
    // TODO: dispatch API fetch with ?type=<tab>
  }, []);

  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface font-body">

        {/* ══════════════════════════════════════════════════════════════════
            1. HERO — dark bg, hero countdown, product image
        ══════════════════════════════════════════════════════════════════ */}
        <section className="bg-gray-900 text-white py-12 md:py-16 lg:py-24 px-4 md:px-6 lg:px-8 relative overflow-hidden">
          <div className="max-w-screen-xl mx-auto relative z-10 grid lg:grid-cols-2 items-center gap-10 lg:gap-12">

            {/* Left: badge + headline + countdown */}
            <div className="space-y-6">
              {/* Live badge */}
              <div className="inline-flex items-center gap-2 bg-primary-container/20 border border-primary-container/30 px-4 py-1.5 rounded-full text-primary-container font-mono text-sm">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                LIVE NOW
              </div>

              {/* Headline */}
              <h1 className="font-syne text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter leading-none">
                FLASH{" "}
                <br />
                <span className="text-primary-container">SALES</span>
              </h1>

              {/* Countdown block */}
              <div className="flex flex-col gap-2">
                <p className="text-on-surface-variant uppercase tracking-widest text-sm font-semibold inline-flex items-center gap-1">
                  <Clock className="w-4 h-4" aria-hidden />
                  Ends in
                </p>
                <div className="text-3xl sm:text-4xl md:text-5xl font-mono font-bold text-primary-container tracking-tighter">
                  {heroCountdown}
                </div>
              </div>
            </div>

            {/* Right: decorative product image (desktop only) */}
            <div className="relative hidden lg:block">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary-container/10 rounded-full blur-3xl pointer-events-none" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD0oJgHdDO5N1wkHxXeC8OG-wBLK_hzmIus1samUOr5VJo1TlYAwsVM3b-dBpjpRM7Fm2RdKZUtj2bSJcHyF4M1UMztTPNM_aWZowIfmLhuFaztnrXD_iGrxzlJmCQNdnxgSmO5VIm0FT-BFT9d8J6eUD9Gzja9QTTJKpyex98jEl2iTP8Od_f0xUFi5D0eKx8JxFmtpLalu9RqREEFj9kAWAuaHJo5RzOu97FMtN9cRblg268Q14HFq0xjlOnFViWn11lAXK29I4o"
                alt="Professional gaming workstation with high-end mechanical peripherals"
                className="w-full h-auto rounded-xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-700"
              />
            </div>
          </div>

          {/* Bottom fade to page background */}
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-surface to-transparent opacity-10 pointer-events-none" />
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            2. FILTER TABS
        ══════════════════════════════════════════════════════════════════ */}
        <section className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 mt-10 mb-6">
          <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant/30 pb-4">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={
                  activeTab === tab.id
                    ? "bg-primary-container text-on-primary px-6 py-3 rounded-lg font-bold text-sm shadow-lg active:scale-95 transition-all"
                    : "bg-surface-container-low text-on-surface-variant px-6 py-3 rounded-lg font-bold text-sm hover:bg-surface-container-highest active:scale-95 transition-all"
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            3. FLASH SALE CARD GRID
        ══════════════════════════════════════════════════════════════════ */}
        <section className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 pb-12 md:pb-16 lg:pb-24">
          {/* Section eyebrow */}
          <div className="flex items-center gap-2 mb-8">
            <Zap className="w-6 h-6 text-primary-container" aria-hidden />
            <span className="font-syne text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
              Flash Sales
            </span>
            <span className="ml-2 px-2 py-0.5 bg-error-container text-error text-[10px] font-bold rounded uppercase tracking-widest">
              Live Now
            </span>
          </div>

          {/* 1 col → 2 col (sm) → 3 col (lg) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {FLASH_DEALS.map((deal) => (
              <FlashDealCard key={deal.id} deal={deal} />
            ))}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            4. DAILY DEALS STRIP
        ══════════════════════════════════════════════════════════════════ */}
        <section className="bg-surface-container-low py-12 md:py-16 lg:py-24 px-4 md:px-6 lg:px-8">
          <div className="max-w-screen-xl mx-auto">
            {/* Section header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-6 h-6 text-primary-container" aria-hidden />
                  <h2 className="font-syne text-3xl md:text-4xl font-extrabold text-on-surface tracking-tighter">
                    Daily Deals
                  </h2>
                </div>
                <p className="text-on-surface-variant text-sm font-medium">
                  Refreshed every 24 hours. Don't miss out.
                </p>
              </div>
              <Link
                href="/products?type=daily"
                className="inline-flex items-center gap-2 text-primary-container font-bold uppercase tracking-widest text-sm group hover:text-primary transition-colors"
              >
                View All
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            </div>

            {/* 1 col → 2 col (sm) → 4 col (lg) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6">
              {DAILY_DEALS.map((deal) => (
                <DailyDealCard key={deal.id} deal={deal} />
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            5. WEEKLY SPECIALS BENTO
        ══════════════════════════════════════════════════════════════════ */}
        <section className="py-12 md:py-16 lg:py-24 px-4 md:px-6 lg:px-8">
          <div className="max-w-screen-xl mx-auto">
            <h2 className="font-syne text-3xl md:text-4xl font-extrabold text-on-surface tracking-tighter mb-10">
              Weekly Specials
            </h2>

            {/* Bento: full-width on mobile; 3-col on md+ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

              {/* Large highlight card — spans 2 cols on md+ */}
              <div className="md:col-span-2 relative bg-surface-container-highest rounded-2xl overflow-hidden min-h-[320px] md:min-h-[400px] flex items-center group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_g2sVCBNj96INTzSJVQ1FS4wGpKZSQ7g-9n6rrdHYH9DynBTONl_kLjqW9zBXuEcEG_P-IMVPrCQMhlsVy5xZRpunCxh3vOffZF78pY5lv6zuN8OZNdeQzAMFaF7vU0O64XNl5whbUiLW2SWCBi3ZeSrw-ix596odYz9DawDd-bs7DVSUkitxYMqDdTTXeGAGwp57tiXSOcdFVYNP3Pk4jfmI8KU1mMGBQn5op1IumiUT83UaIjpw0dyWc8"
                  alt="Modern athletic wear on a curved geometric platform with dynamic lighting"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900/60 to-transparent" />

                {/* Text content */}
                <div className="relative z-10 p-8 md:p-12 max-w-md space-y-5 text-white">
                  <span className="bg-secondary-green text-on-secondary px-4 py-1 rounded-full font-bold text-xs uppercase tracking-widest">
                    Featured Curator Deal
                  </span>
                  <h3 className="font-headline text-3xl md:text-5xl font-bold leading-tight">
                    The Performance Collection
                  </h3>
                  <p className="text-on-surface-variant font-medium text-sm md:text-base">
                    Upgrade your gear with up to 40% off across the entire premium athletic range.
                  </p>
                  <button className="bg-surface-container-lowest text-on-surface px-8 py-3 rounded-lg font-bold hover:bg-primary-container hover:text-on-primary transition-colors duration-300 active:scale-95">
                    Shop Collection
                  </button>
                </div>
              </div>

              {/* Stacked secondary cards */}
              <div className="space-y-6 md:space-y-8">
                {/* Smart Home */}
                <div className="bg-surface-container-low rounded-2xl p-5 md:p-6 flex gap-4 items-center group min-h-[160px]">
                  <div className="flex-1 space-y-2 min-w-0">
                    <span className="text-request font-mono text-xs font-bold">UP TO 20% OFF</span>
                    <h4 className="font-headline font-bold text-lg leading-tight">Smart Home Essentials</h4>
                    <Link
                      href="/products?category=smart-home"
                      className="text-sm font-bold border-b border-on-surface pb-0.5 inline-block hover:text-primary-container hover:border-primary-container transition-colors"
                    >
                      Explore
                    </Link>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRWTzV5f7OshW51mk2FdiqEuTp5OUON_vwqdsXKEZ3ktHdRvnQ9QJCXfg151F-7QzJzBuowFjY_312E7z-04vRkfEqL8q3KcMnZKA45GFf936CaD0iKxHx928sfXLvNKfxv-XLb1E5bdrIcngCGUu71I6u2hJ_okKlTM8kSm6txE8BPtGchVYCS9P3aUo2oOgC7T6gvlNd_2zW4yzsX20aKdfva3OMiUZIPG6ZyYlxfUoE7KHrp5fYG6yk_BHtK_jj6iJkG1v6lkk"
                    alt="Sleek modern smart home hub and speaker on a clean minimal shelf"
                    className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl group-hover:rotate-6 transition-transform duration-300 flex-shrink-0"
                  />
                </div>

                {/* Acoustic Audio */}
                <div className="bg-surface-container-low rounded-2xl p-5 md:p-6 flex gap-4 items-center group min-h-[160px]">
                  <div className="flex-1 space-y-2 min-w-0">
                    <span className="text-request font-mono text-xs font-bold">UP TO 35% OFF</span>
                    <h4 className="font-headline font-bold text-lg leading-tight">Acoustic Audio Gear</h4>
                    <Link
                      href="/products?category=audio"
                      className="text-sm font-bold border-b border-on-surface pb-0.5 inline-block hover:text-primary-container hover:border-primary-container transition-colors"
                    >
                      Explore
                    </Link>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBduO95QymOrXjI7wLbXO3LwdU7GChkt-kN6kwgK0t-Y9Tb3AfeJqBJa2f3Thy3rB4HH7TRDkB_iEFs1KOloX4f06KSUp_vAwVvbjlUIAcIuJmqUlP_8a70b5EAvlofV4SVAIc3gQX5HLyDLA9NIRoUe7AXXAjqcw_wgHZRRkty_A42sbLPaK_YHkITB8yF-Y2KYaA4mp-2u6ykUy36iQACaohwDbL2T0q7gbuxrHQ2z4qbBU85iz0fZQ5VCwTwUOBC7i4zmrQvuMQ"
                    className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl group-hover:-rotate-6 transition-transform duration-300 flex-shrink-0"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            6. FOOTER
        ══════════════════════════════════════════════════════════════════ */}
        <footer className="w-full mt-auto py-12 bg-surface-container-low">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-4 md:px-6 lg:px-8 max-w-screen-xl mx-auto">
            {/* Brand */}
            <div className="space-y-4">
              <div className="text-lg font-bold text-on-surface font-headline">TradeHut</div>
              <p className="text-on-surface-variant font-medium text-sm leading-relaxed">
                The next generation of high-frequency asset trading. Secure, fast, and transparent.
              </p>
            </div>

            {/* Navigation */}
            <div className="space-y-4">
              <h5 className="font-body text-sm uppercase tracking-widest text-primary-container font-bold">
                Navigation
              </h5>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/legal/terms"
                    className="text-on-surface-variant hover:text-primary-container transition-all hover:translate-x-1 inline-block text-sm"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/privacy"
                    className="text-on-surface-variant hover:text-primary-container transition-all hover:translate-x-1 inline-block text-sm"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h5 className="font-body text-sm uppercase tracking-widest text-primary-container font-bold">
                Support
              </h5>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/help"
                    className="text-on-surface-variant hover:text-primary-container transition-all hover:translate-x-1 inline-block text-sm"
                  >
                    Contact Support
                  </Link>
                </li>
                <li>
                  <Link
                    href="/trust"
                    className="text-on-surface-variant hover:text-primary-container transition-all hover:translate-x-1 inline-block text-sm"
                  >
                    Technical Specs
                  </Link>
                </li>
              </ul>
            </div>

            {/* Newsletter */}
            <div className="space-y-4">
              <h5 className="font-body text-sm uppercase tracking-widest text-primary-container font-bold">
                Newsletter
              </h5>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Email"
                  className="bg-surface-container-lowest border-0 rounded-l-lg w-full text-sm focus:ring-1 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant"
                />
                <button className="bg-primary text-on-primary px-4 rounded-r-lg hover:bg-primary-container transition-colors active:scale-95 flex items-center">
                  <Send className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>

          {/* Copyright bar */}
          <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 mt-12 pt-8 border-t border-outline-variant/20 text-center">
            <p className="font-body text-sm uppercase tracking-widest text-on-surface-variant">
              &copy; {new Date().getFullYear()} TradeHut. Built for high-frequency trading.
            </p>
          </div>
        </footer>

      </div>
    </MainLayout>
  );
}
