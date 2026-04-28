"use client";

/**
 * RFQ Board — /rfq
 *
 * Ported from stitch_full_website_redesign_expansion/tradehut_rfq_board/code.html
 * Design system: Kinetic (Material 3 derived tokens).
 *
 * Layout: 12-col grid at lg: 3-col filter sidebar + 9-col RFQ feed.
 * Mobile-first: sidebar collapses into a top "Filters" drawer trigger on <lg.
 *
 * TODOs:
 * - TODO: fetch from /api/rfqs/?status=open  (replace SAMPLE_RFQS with real data)
 * - TODO: wire category / budget filter state to API query params
 * - TODO: implement pagination / infinite scroll for "Load More"
 * - TODO: create /rfq/new page for the "Post a Request" tab
 */

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import MainLayout from "@/components/Layouts/MainLayout";
import { Clock, FileText, MapPin, BadgeCheck, SlidersHorizontal, ChevronDown, SearchX, Share2, Terminal, Rss } from "lucide-react";

// ---------------------------------------------------------------------------
// Types (mirrors apps/rfqs/models.py RFQ shape used in list responses)
// ---------------------------------------------------------------------------
interface RFQItem {
  id: string;
  reference: string;
  title: string;
  description: string;
  budget_min: number;
  budget_max: number;
  currency: string;
  location_city: string;
  location_country: string;
  closes_in_days: number;
  quote_count: number;
  is_sustainable: boolean;
  requires_verification: boolean;
  image_url?: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Sample data
// TODO: fetch from /api/rfqs/?status=open
// ---------------------------------------------------------------------------
const SAMPLE_RFQS: RFQItem[] = [
  {
    id: "1",
    reference: "RFQ-9921",
    title: "Precision Milling for Prototype V2",
    description:
      "Seeking a specialized machining partner for low-volume production of V2 internal components. Material: 7075 Aluminum. Lead time: 14 business days. Detailed CAD files available upon quote request.",
    budget_min: 12500,
    budget_max: 18000,
    currency: "USD",
    location_city: "Berlin",
    location_country: "DE",
    closes_in_days: 5,
    quote_count: 4,
    is_sustainable: false,
    requires_verification: true,
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD5t06HAZh6eL8LYpqfb14Fs_w3VAIbuCR2AHCbIp8jSubo2crCCg1ILVkMkdg06S6wCafZEdvqt3WSO3EgdAWm5pPEj2ahMdxWsg7gnBBt8Zdin6i7YCJxggaJsuRVAxC2S6Ob1VnWIZyM0j53OjRn1He4a86OMhdRkWH8ArkvbpNnZfynqPWVKCmzCiohPAMAqfpW1A_Fl_AFc6Ftx23l3i7PPQK2aVOw1Zr-AwZYvvI8m1q2ezCxUP_v3xshkmlUlaLXfV_Rd4M",
    category: "Precision Tooling",
  },
  {
    id: "2",
    reference: "RFQ-8847",
    title: "High-Frequency Data Center Infrastructure",
    description:
      "Bulk procurement for Tier-3 data center expansion. Requires specific cooling manifolds and rack-mount hardware for high-density compute nodes. Tier-1 suppliers preferred.",
    budget_min: 145000,
    budget_max: 220000,
    currency: "USD",
    location_city: "Austin",
    location_country: "US",
    closes_in_days: 12,
    quote_count: 12,
    is_sustainable: false,
    requires_verification: false,
    image_url:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuClMBNCtGx9j0BdJQdTe3dDodtKroZwiS-7USzVtBcKtT7W4gvPxDUWGgqMYdiQjTqLM-ea08H19eBdWkWujaczk-z9kHjSbuwE-ljfYs7kxIWTzkpsG6fLhlj4eK-wsQqObJ3KwJA2vBosZUidHL0evtfoLhScDbMLy4xmtGmLKsTxgl7Bzh5PWNjLKARmaIai_OrZFx_zWjdHa3UcISRuN-MJSUorOchPPwlS-WK9qOKa-9R9BfeygCMBjnuIFn-h4uoiBDO0eSg",
    category: "Electronics Assembly",
  },
  {
    id: "3",
    reference: "RFQ-7703",
    title: "Biodegradable Packaging Prototype Lot",
    description:
      "Small-scale production of mushroom-based eco-packaging for retail electronics brand launch. Custom mold fabrication required.",
    budget_min: 3200,
    budget_max: 4500,
    currency: "USD",
    location_city: "Amsterdam",
    location_country: "NL",
    closes_in_days: 3,
    quote_count: 2,
    is_sustainable: true,
    requires_verification: false,
    image_url: undefined,
    category: "Raw Materials",
  },
  {
    id: "4",
    reference: "RFQ-6612",
    title: "Cold-Rolled Steel Coil Supply — Q2 Lot",
    description:
      "Quarterly procurement for 120 metric tons of ASTM A1008 cold-rolled steel coil. Certificate of conformance required. Delivery to Gdansk port.",
    budget_min: 78000,
    budget_max: 94000,
    currency: "USD",
    location_city: "Gdansk",
    location_country: "PL",
    closes_in_days: 8,
    quote_count: 7,
    is_sustainable: false,
    requires_verification: true,
    image_url: undefined,
    category: "Raw Materials",
  },
  {
    id: "5",
    reference: "RFQ-5501",
    title: "SMT PCB Assembly — Low Volume Pilot",
    description:
      "50-unit pilot run of a 6-layer PCB with fine-pitch QFN packages. IPC Class 3 workmanship required. Gerbers and BOM provided.",
    budget_min: 8500,
    budget_max: 12000,
    currency: "USD",
    location_city: "Shenzhen",
    location_country: "CN",
    closes_in_days: 10,
    quote_count: 9,
    is_sustainable: false,
    requires_verification: false,
    image_url: undefined,
    category: "Electronics Assembly",
  },
  {
    id: "6",
    reference: "RFQ-4490",
    title: "FSC-Certified Timber Cladding — Eco Build",
    description:
      "Sourcing 800 linear metres of FSC-certified Siberian larch cladding for a low-carbon residential development. Supplier must hold valid chain-of-custody certificate.",
    budget_min: 18000,
    budget_max: 24000,
    currency: "USD",
    location_city: "Oslo",
    location_country: "NO",
    closes_in_days: 14,
    quote_count: 5,
    is_sustainable: true,
    requires_verification: false,
    image_url: undefined,
    category: "Logistics & Supply",
  },
];

const CATEGORIES = [
  "Precision Tooling",
  "Raw Materials",
  "Electronics Assembly",
  "Logistics & Supply",
];

const BUDGET_FLOORS = [
  { label: "$5k",   value: 5000 },
  { label: "$25k",  value: 25000 },
  { label: "$100k", value: 100000 },
  { label: "$500k+",value: 500000 },
];

// ---------------------------------------------------------------------------
// Pill helper (matches components.md recipe)
// ---------------------------------------------------------------------------
function Pill({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-full">
      {icon && icon}
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Format currency
// ---------------------------------------------------------------------------
function formatBudget(min: number, max: number, currency: string) {
  const fmt = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : n >= 1000
      ? `$${(n / 1000).toFixed(0)}k`
      : `$${n}`;
  return `${fmt(min)} – ${fmt(max)}`;
}

// ---------------------------------------------------------------------------
// RFQ Card
// ---------------------------------------------------------------------------
function RFQCard({ rfq }: { rfq: RFQItem }) {
  const isSustainable = rfq.is_sustainable;

  return (
    <article
      className={[
        "bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-card ghost-border",
        "flex flex-col md:flex-row gap-6 md:gap-8 group transition-all duration-300",
        "hover:shadow-card-hover",
        isSustainable ? "border-l-4 border-l-secondary-green" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Image — only rendered when url is provided; hidden on sustainable text-only variant */}
      {rfq.image_url && (
        <div className="w-full aspect-video md:aspect-auto md:w-48 md:h-48 bg-surface-container-low rounded-xl overflow-hidden flex-shrink-0 relative">
          <Image
            src={rfq.image_url}
            alt={rfq.title}
            fill
            sizes="(max-width: 768px) 100vw, 192px"
            className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
            unoptimized
          />
          {rfq.requires_verification && (
            <div className="absolute top-2 right-2 bg-tertiary text-on-tertiary text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter">
              Verified Buyer
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className="flex-grow flex flex-col justify-between gap-4">
        <div>
          {/* Sustainable badge row */}
          {isSustainable && (
            <div className="flex items-center gap-3 mb-3">
              <span className="bg-secondary-container text-on-secondary-container text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Sustainable Source
              </span>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                {rfq.reference}
              </span>
            </div>
          )}

          {/* Title + budget */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
            <h2
              className={[
                "font-syne font-bold text-xl md:text-2xl transition-colors",
                isSustainable
                  ? "group-hover:text-secondary-green"
                  : "group-hover:text-tertiary",
              ].join(" ")}
            >
              {rfq.title}
            </h2>
            <div className="text-right flex-shrink-0">
              <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">
                Budget Range
              </div>
              <div
                className={[
                  "font-mono text-xl font-bold",
                  isSustainable ? "text-secondary-green" : "text-tertiary",
                ].join(" ")}
              >
                {formatBudget(rfq.budget_min, rfq.budget_max, rfq.currency)}
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-on-surface-variant text-sm line-clamp-2 leading-relaxed mb-4 md:mb-6">
            {rfq.description}
          </p>
        </div>

        {/* Footer row: pills + CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Pill icon={<Clock className="w-3.5 h-3.5" aria-hidden />}>
              {rfq.closes_in_days} day{rfq.closes_in_days !== 1 ? "s" : ""} left
            </Pill>
            <Pill icon={<FileText className="w-3.5 h-3.5" aria-hidden />}>{rfq.quote_count} Quotes</Pill>
            <Pill icon={<MapPin className="w-3.5 h-3.5" aria-hidden />}>
              {rfq.location_city}, {rfq.location_country}
            </Pill>
          </div>

          {isSustainable ? (
            <button className="bg-surface-container-lowest text-secondary-green outline outline-1 outline-secondary-green px-6 md:px-8 py-3 rounded-md font-bold hover:bg-secondary-container/10 active:scale-95 transition-all min-h-[44px]">
              View Specs
            </button>
          ) : (
            <button className="bg-tertiary text-on-tertiary px-6 md:px-8 py-3 rounded-md font-bold shadow-lg hover:shadow-md active:scale-95 transition-all min-h-[44px] whitespace-nowrap">
              Submit Quote
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Filter Sidebar (desktop sticky / mobile sheet)
// ---------------------------------------------------------------------------
interface FilterState {
  categories: string[];
  budgetFloor: number | null;
}

function FilterSidebar({
  filters,
  onToggleCategory,
  onSetBudgetFloor,
  onReset,
}: {
  filters: FilterState;
  onToggleCategory: (cat: string) => void;
  onSetBudgetFloor: (v: number | null) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Refine Search card */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card ghost-border">
        <h3 className="font-syne font-bold text-lg mb-6 text-on-surface">
          Refine Search
        </h3>

        <div className="space-y-6">
          {/* Category checkboxes */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">
              Category
            </label>
            <div className="space-y-2">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat}
                  className="flex items-center gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    className="rounded border-outline-variant text-tertiary focus:ring-tertiary"
                    checked={filters.categories.includes(cat)}
                    onChange={() => onToggleCategory(cat)}
                  />
                  <span className="text-sm group-hover:text-tertiary transition-colors text-on-surface">
                    {cat}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Budget floor pills */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">
              Budget Floor
            </label>
            <div className="grid grid-cols-2 gap-2">
              {BUDGET_FLOORS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() =>
                    onSetBudgetFloor(filters.budgetFloor === value ? null : value)
                  }
                  className={[
                    "p-2 rounded-md text-xs font-mono transition-all active:scale-95 min-h-[44px]",
                    filters.budgetFloor === value
                      ? "bg-tertiary text-on-tertiary"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={onReset}
            className="w-full py-3 rounded-md bg-tertiary-container/10 text-tertiary font-bold text-sm hover:bg-tertiary-container/20 transition-colors active:scale-95 min-h-[44px]"
          >
            Reset All
          </button>
        </div>
      </div>

      {/* Promo block */}
      <div className="bg-tertiary p-6 rounded-xl relative overflow-hidden text-on-tertiary shadow-card">
        <div className="relative z-10">
          <h4 className="font-syne font-bold text-xl mb-2">Verified Pro</h4>
          <p className="text-sm text-tertiary-fixed-dim mb-4">
            Get early access to high-value RFQs over $250k.
          </p>
          <button className="bg-surface-container-lowest text-tertiary px-4 py-2 rounded-md font-bold text-xs hover:bg-surface-container-low active:scale-95 transition-all min-h-[44px]">
            Learn More
          </button>
        </div>
        <BadgeCheck
          className="absolute -right-4 -bottom-4 opacity-10 w-24 h-24"
          aria-hidden
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component — "use client" for tab toggle + filter state
// ---------------------------------------------------------------------------
export default function RFQBoardPage() {
  const [activeTab, setActiveTab] = useState<"browse" | "post">("browse");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    budgetFloor: null,
  });

  function toggleCategory(cat: string) {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  }

  function setBudgetFloor(v: number | null) {
    setFilters((prev) => ({ ...prev, budgetFloor: v }));
  }

  function resetFilters() {
    setFilters({ categories: [], budgetFloor: null });
  }

  // Client-side filter (TODO: move to server-side query params once API is wired)
  const visibleRFQs = SAMPLE_RFQS.filter((rfq) => {
    if (
      filters.categories.length > 0 &&
      !filters.categories.includes(rfq.category)
    )
      return false;
    if (filters.budgetFloor !== null && rfq.budget_max < filters.budgetFloor)
      return false;
    return true;
  });

  return (
    <MainLayout>
    <div className="min-h-screen bg-surface text-on-surface">
      <main>
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 lg:py-24">
          {/* ----------------------------------------------------------------
              Hero + Tab Toggle
          ---------------------------------------------------------------- */}
          <section className="mb-12 md:mb-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8">
              {/* Headline */}
              <div className="max-w-2xl">
                <h1 className="font-syne text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-on-surface">
                  RFQ Board{" "}
                  <span className="text-tertiary">Portal</span>
                </h1>
                <p className="text-on-surface-variant text-base md:text-lg leading-relaxed">
                  Bridge the gap between vision and execution. Browse active
                  requests for custom production or post your own industrial
                  specifications.
                </p>
              </div>

              {/* Tab toggle */}
              <div className="overflow-x-auto no-scrollbar self-start w-full md:w-auto">
              <div className="bg-surface-container-low p-1.5 rounded-xl flex items-center ghost-border min-w-max">
                <button
                  onClick={() => setActiveTab("browse")}
                  className={[
                    "px-5 md:px-6 py-3 rounded-lg font-bold text-sm transition-all active:scale-95 min-h-[44px]",
                    activeTab === "browse"
                      ? "bg-surface-container-lowest shadow-sm text-tertiary"
                      : "text-on-surface-variant hover:text-on-surface",
                  ].join(" ")}
                >
                  Browse Requests
                </button>
                {/* TODO: create post flow at /rfq/new */}
                <Link
                  href="/rfq/new"
                  onClick={() => setActiveTab("post")}
                  className={[
                    "px-5 md:px-6 py-3 rounded-lg font-bold text-sm transition-all min-h-[44px] inline-flex items-center",
                    activeTab === "post"
                      ? "bg-surface-container-lowest shadow-sm text-tertiary"
                      : "text-on-surface-variant hover:text-on-surface",
                  ].join(" ")}
                >
                  Post a Request
                </Link>
              </div>
              </div>
            </div>
          </section>

          {/* ----------------------------------------------------------------
              Mobile: Filters drawer trigger
          ---------------------------------------------------------------- */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-3 bg-surface-container-lowest rounded-xl shadow-card ghost-border font-bold text-sm text-on-surface w-full justify-between min-h-[44px]"
              aria-expanded={filtersOpen}
              aria-controls="mobile-filter-panel"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-on-surface-variant" aria-hidden />
                Filters
                {(filters.categories.length > 0 ||
                  filters.budgetFloor !== null) && (
                  <span className="ml-1 bg-tertiary text-on-tertiary text-[10px] font-bold w-5 h-5 rounded-full inline-flex items-center justify-center">
                    {filters.categories.length +
                      (filters.budgetFloor !== null ? 1 : 0)}
                  </span>
                )}
              </span>
              <ChevronDown
                className={[
                  "w-4 h-4 text-on-surface-variant transition-transform duration-200",
                  filtersOpen ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden
              />
            </button>

            {/* Mobile filter panel */}
            {filtersOpen && (
              <div
                id="mobile-filter-panel"
                className="mt-2 bg-surface-container-lowest rounded-xl shadow-card ghost-border overflow-hidden"
              >
                <div className="p-4">
                  <FilterSidebar
                    filters={filters}
                    onToggleCategory={toggleCategory}
                    onSetBudgetFloor={setBudgetFloor}
                    onReset={resetFilters}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------------
              12-col grid: sidebar (lg) + feed
          ---------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar — desktop sticky, hidden on mobile (handled above) */}
            <aside
              className="hidden lg:block lg:col-span-3 lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto no-scrollbar"
            >
              <FilterSidebar
                filters={filters}
                onToggleCategory={toggleCategory}
                onSetBudgetFloor={setBudgetFloor}
                onReset={resetFilters}
              />
            </aside>

            {/* Feed */}
            <div className="lg:col-span-9 space-y-6">
              {/* Sort header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
                <span className="text-sm text-on-surface-variant font-medium">
                  Showing{" "}
                  <span className="text-on-surface font-bold">
                    {visibleRFQs.length}
                  </span>{" "}
                  active request{visibleRFQs.length !== 1 ? "s" : ""}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-on-surface-variant">Sort by:</span>
                  <select className="bg-transparent border-none text-sm font-bold text-on-surface focus:ring-0 cursor-pointer">
                    <option>Newest First</option>
                    <option>Highest Budget</option>
                    <option>Expiring Soon</option>
                  </select>
                </div>
              </div>

              {/* Cards */}
              {visibleRFQs.length > 0 ? (
                visibleRFQs.map((rfq) => <RFQCard key={rfq.id} rfq={rfq} />)
              ) : (
                <div className="bg-surface-container-lowest rounded-2xl p-12 text-center ghost-border">
                  <SearchX className="w-12 h-12 text-on-surface-variant mb-4 mx-auto" aria-hidden />
                  <p className="text-on-surface-variant font-medium">
                    No requests match your filters.
                  </p>
                  <button
                    onClick={resetFilters}
                    className="mt-4 text-tertiary font-bold text-sm hover:underline active:scale-95 transition-all"
                  >
                    Clear filters
                  </button>
                </div>
              )}

              {/* Load more */}
              {visibleRFQs.length > 0 && (
                <div className="py-8 flex justify-center">
                  {/* TODO: implement pagination / infinite scroll */}
                  <button className="flex items-center gap-2 text-on-surface-variant font-bold hover:text-on-surface transition-colors active:scale-95 min-h-[44px] px-6">
                    Load More Requests
                    <ChevronDown className="w-5 h-5" aria-hidden />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------------
          Footer
      ------------------------------------------------------------------ */}
      <footer className="w-full rounded-t-3xl bg-stone-50 mt-20">
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16 grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <span className="text-xl font-bold text-on-surface block mb-6">
              TradeHut
            </span>
            <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
              Architectural precision in commerce. The world's first industrial
              bidding environment designed for the kinetic era.
            </p>
            <div className="flex gap-4">
              <Share2 className="w-5 h-5 text-on-surface-variant hover:text-primary cursor-pointer transition-colors" aria-hidden />
              <Terminal className="w-5 h-5 text-on-surface-variant hover:text-primary cursor-pointer transition-colors" aria-hidden />
              <Rss className="w-5 h-5 text-on-surface-variant hover:text-primary cursor-pointer transition-colors" aria-hidden />
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h5 className="font-bold text-sm mb-6 uppercase tracking-widest text-on-surface">
              Marketplace
            </h5>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/products"
                  className="text-on-surface-variant text-sm hover:text-on-surface transition-all underline-offset-4 hover:underline"
                >
                  All Categories
                </Link>
              </li>
              <li>
                <Link
                  href="/auctions"
                  className="text-on-surface-variant text-sm hover:text-on-surface transition-all underline-offset-4 hover:underline"
                >
                  Auctions
                </Link>
              </li>
              <li>
                <Link
                  href="/rfq"
                  className="text-primary-container text-sm font-bold"
                >
                  RFQ Portal
                </Link>
              </li>
              <li>
                <Link
                  href="/sell"
                  className="text-on-surface-variant text-sm hover:text-on-surface transition-all underline-offset-4 hover:underline"
                >
                  Seller Hub
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h5 className="font-bold text-sm mb-6 uppercase tracking-widest text-on-surface">
              Support
            </h5>
            <ul className="space-y-4">
              {["Help Center", "Verification", "Dispute Resolution", "API Docs"].map(
                (item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-on-surface-variant text-sm hover:text-on-surface transition-all underline-offset-4 hover:underline"
                    >
                      {item}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h5 className="font-bold text-sm mb-6 uppercase tracking-widest text-on-surface">
              Legal
            </h5>
            <ul className="space-y-4">
              {["Terms of Service", "Privacy Policy", "Global Compliance"].map(
                (item) => (
                  <li key={item}>
                    <Link
                      href="#"
                      className="text-on-surface-variant text-sm hover:text-on-surface transition-all underline-offset-4 hover:underline"
                    >
                      {item}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        {/* Copyright bar */}
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-8 border-t border-outline-variant/20 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-on-surface-variant text-xs">
            © 2024 TradeHut Stores. Architectural Precision in Commerce.
          </span>
          <div className="flex gap-6 md:gap-8">
            <span className="text-outline text-xs font-mono">
              SYSTEM_STATUS: STABLE
            </span>
            <span className="text-outline text-xs font-mono">
              VER: 2.1.0-KINETIC
            </span>
          </div>
        </div>
      </footer>
    </div>
    </MainLayout>
  );
}
