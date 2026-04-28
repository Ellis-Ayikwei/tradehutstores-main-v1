/**
 * Market Reports  —  /market-reports
 *
 * Ported from stitch_full_website_redesign_expansion/tradehut_market_reports/code.html
 * React Server Component (no client state needed on this page).
 *
 * TODO: fetch /api/market-reports/ to replace static REPORTS / DEEP_DIVES data.
 * TODO: wire subscribe form to /api/newsletter/ (currently a no-op form).
 * TODO: Download PDF hrefs are placeholder "#" links.
 */

import Link from "next/link";
import Image from "next/image";
import MainLayout from "@/components/Layouts/MainLayout";
import {
  BarChart3,
  TrendingUp,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Download,
  Globe,
  ArrowUpRight,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   Static placeholder data — replace with API fetch when backend is ready.
───────────────────────────────────────────────────────────────────────────── */

const SENTIMENT_INDICATORS = [
  {
    label: "Heavy Metals [HME]",
    value: "14,202.50",
    change: "+1.24%",
    positive: true,
    neutral: false,
  },
  {
    label: "Energy Grid [ENY]",
    value: "8,944.12",
    change: "-0.45%",
    positive: false,
    neutral: false,
  },
  {
    label: "Global Logistics [LOG]",
    value: "31,040.80",
    change: "+2.15%",
    positive: true,
    neutral: false,
  },
  {
    label: "Raw Materials [RAW]",
    value: "5,212.00",
    change: "0.00%",
    positive: false,
    neutral: true,
  },
];

const FEATURED_REPORTS = [
  {
    id: "trans-pacific-logistical-squeeze",
    type: "QUARTERLY OUTLOOK",
    typeColor: "text-primary-container",
    title: "The Trans-Pacific Logistical Squeeze: 2024–2025 Prediction Model",
    description:
      "A comprehensive audit of bottleneck risk across major Pacific shipping lanes, featuring proprietary IoT sensor data from TradeHut's maritime partners.",
    meta: "PDF  •  4.2 MB  •  86 Pages",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDV1ey5WUOgXVfWU7ClXKjIHjWgJ_BJQ-8a2AsUW59saqZdY3_jAX762yQ7g_zOostkBggolCbwG2Ka8yGdQdOjSF3Fa256JYKJTwQkd01Id7l-T6rYJwsvETD6hw9hFJrGXWX_qulQdE9eXPIVpyWyDC2FeG6N0PxIpMhNnTS8F9rg3xpCR77MqHndZjliFr1MUi4Q8h7Lgy89Gnq0PY6Gp8ARFuvBCMIFJN5v0l2jKoSjCIlnxqmN_Qiu-ZB7pQHrlo0xHZqXhNg",
    imgAlt: "Interior view of a massive modern shipping port at night",
    featured: true,
  },
];

const SMALL_REPORTS = [
  {
    id: "sustainability-vs-scalability",
    type: "WHITE PAPER",
    typeColor: "text-tertiary",
    title: "Sustainability vs. Scalability in Steel Manufacturing",
    description:
      "Analyzing the CAPEX requirements for green hydrogen transitions in smelting plants.",
    actionLabel: "Get White Paper",
    actionIcon: "download",
    bg: "bg-surface-container",
  },
  {
    id: "vietnam-industrial-land-surge",
    type: "EMERGING MARKET",
    typeColor: "text-secondary-green",
    title: "Vietnam's Industrial Land Surge: Hub Analysis",
    description:
      "Satellite mapping reveals rapid expansion in Haiphong industrial zones.",
    actionLabel: "Read Online",
    actionIcon: "globe",
    bg: "bg-surface-container-low",
  },
];

const DEEP_DIVES = [
  {
    id: "heavy-machinery",
    title: "Heavy Machinery",
    description:
      "Auction volatility analysis for Tier-1 excavators and boring equipment.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDrQZOcSOWs9yW3hAq5vGXtGpwOYFYTmFcH8WP-1e9rgkpZx0c0O7k5mydBzR5OmBjnfGYLXzB12370W1MHv0tP3ugk3tdRyZRaLl2Uh7XprWlvf5SH_ARCLN1sVkNiMBbz3f27vTcmPC4ZZqmOMGr_aFFX6YF80mpyCCqIgzrgG79i8DlnzYutKJXRYY0dOjfJqOSgvdZCUAlGHNTuuX7-ODY_agBQt1groQc5Ca9kQ7D8Am6u28H644Em8pO4xHAzFuoFaVklvcU",
    imgAlt: "Technical architectural blueprints of a refinery plant",
  },
  {
    id: "rare-earth-elements",
    title: "Rare Earth Elements",
    description:
      "Tracking the supply-chain shifts in Neodymium and Dysprosium mining.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD97kSqdqwmvcK_oFhVujFwR4jXbqrapYuMu-hPy_zv1CC3a7Yv58_lRIMC9BmXWDKBfAgELakVepB-eLcnNbPQiOKSnxeFmrBHidM7PGT6ISs8hB5S7P4Z5Lit1Uk8_888faAG7XXo7RxYwYXpXQ-EE8pAxEyJJJPqxB_PHeVk4RD4Aav6VcfHLeDHswpkD39p_QedRMVFOPE4mH7ddGIjl7DWEPtxl-6dTGs59aH3XC310E_WxlZMod__JoYX4S1hba5PJJ9XYcU",
    imgAlt: "Molten steel pouring in a dark industrial foundry",
  },
  {
    id: "renewable-assets",
    title: "Renewable Assets",
    description: "Secondary market pricing for large-scale photovoltaic arrays.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAK9vcV6O5fY1V2o-T7En3MwPIC1RK4AeWPE-kzRL64MrFzT4kGeweAThhX_VREawFFy4RlpLPlGAmTPNTEtokuRik-1UGW4LGSyZCVjBaADAZiW6jUPYjr9wgHha9E9F5iDSnF-sWMObKl3ZbOdQKdDzRCIkLFEB0G5ihvJtywPNXq6NLQr5os3QELuYdH_t1T7PuOdFlH0eOWCesXvA6aWFgllpcdgjIarG7DugDdhiGz0taBGAiHmRu1pc0oC3tjNi3wyd_7row",
    imgAlt: "Solar farm in a desert landscape at midday",
  },
  {
    id: "industrial-real-estate",
    title: "Industrial Real Estate",
    description: "Yield analysis for automated fulfillment centers in EU hubs.",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD9GKyfcmCFFhh9_2jcrCdaOKuDvuJoxUR5_pgh6u5qK6APb6BNkPel140_gKcOpveMe7dZ00ToV28yp6f30E2YMtEb5K8x6ak93DAlaq8ajS6m9BLQlna1X6rkaRHUsyxt-XSw8BBN7KT1qcXjkVjBPpKR90VvmKvBAtOWtj93lhaYhJN0b-AbMLt02ycqD9RY7_EH722qy8yTwWrMrdlwJbghzhrHZyqtqA8pra4phvZFOY_BwIvnt-LY1M6oZ8nrCt4vrEnAU_w",
    imgAlt: "Colorful shipping containers stacked in a geometric pattern",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Page Component (Server Component)
───────────────────────────────────────────────────────────────────────────── */

export const metadata = {
  title: "Market Reports | TradeHut",
  description:
    "Access high-frequency data, technical cross-sections, and institutional-grade forecasting for global heavy industry markets.",
};

export default function MarketReportsPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface font-body">
        <main className="pt-24">

          {/* ── Hero ───────────────────────────────────────────────────── */}
          <section className="max-w-screen-2xl mx-auto px-4 md:px-6 py-12 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Left: headline + stats */}
            <div className="lg:col-span-7 space-y-6">
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-low rounded-full text-[10px] font-bold tracking-widest text-primary-container uppercase">
                <BarChart3 className="w-4 h-4" />
                Market Intelligence
              </div>

              <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter text-on-background leading-[0.9]">
                Industrial Intelligence{" "}
                <span className="text-primary-container italic">Refined.</span>
              </h1>

              <p className="text-base md:text-xl text-on-surface-variant max-w-xl font-body leading-relaxed">
                Access high-frequency data, technical cross-sections, and
                institutional-grade forecasting for global heavy industry markets.
              </p>

              {/* Stats row */}
              <div className="flex flex-wrap gap-6 pt-4">
                <div className="flex flex-col">
                  <span className="font-mono text-2xl font-bold text-on-surface">1.2B+</span>
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">Data Points</span>
                </div>
                <div className="w-px h-12 bg-outline-variant/30 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="font-mono text-2xl font-bold text-on-surface">42</span>
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">Global Hubs</span>
                </div>
                <div className="w-px h-12 bg-outline-variant/30 hidden sm:block" />
                <div className="flex flex-col">
                  <span className="font-mono text-2xl font-bold text-secondary-green">98.2%</span>
                  <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-medium">Forecast Accuracy</span>
                </div>
              </div>
            </div>

            {/* Right: hero image card */}
            <div className="lg:col-span-5 relative">
              <div className="aspect-square rounded-2xl bg-surface-container shadow-card overflow-hidden group">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCyizvaO91kiHIBO_u_FUnIk6mZpeytzPXvrtTbgykBc1Yh56l1ektjqssZfiGAizUroR1m5EFsiyX_hnjuu8qT0oJdBPU9KbY6jx4h2yA41inldov8mKWWxZFhfgBQXwsEAzBVLOVRI328_P2QyThq7pp3LqmN1xf-Z5-KXFKh2xkMLKe60M1nIyu-ev66V_Wru2hMnD0EsvkeEsxEU0cI1StmZgGelolVUk_CQdLGhph956Ick6uv6CTTP2gC1xgTW7FdDqUIsK4"
                  alt="High-precision industrial robotic arm in a sterile factory environment"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  unoptimized
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/60 to-transparent" />
                {/* Glass badge */}
                <div className="absolute bottom-6 left-6 right-6 p-5 backdrop-blur-xl bg-white/10 rounded-xl border border-white/20">
                  <p className="text-white font-mono text-xs mb-2 uppercase tracking-widest">
                    LIVE SENSITIVITY INDEX
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-headline font-bold text-base md:text-xl">
                      Market Sentiment: Bullish
                    </span>
                    <TrendingUp className="w-8 h-8 text-secondary-container" />
                  </div>
                </div>
              </div>
              {/* Decorative glow */}
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary-container/20 rounded-full blur-3xl pointer-events-none" />
            </div>
          </section>

          {/* ── Market Sentiment Ticker ────────────────────────────────── */}
          <section className="bg-surface-container-low py-10">
            <div className="max-w-screen-2xl mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
              {SENTIMENT_INDICATORS.map((item) => (
                <div key={item.label} className="space-y-1">
                  <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-widest">
                    {item.label}
                  </p>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xl md:text-2xl font-mono font-bold text-on-surface">
                      {item.value}
                    </span>
                    <span
                      className={`text-sm font-mono ${
                        item.neutral
                          ? "text-on-surface-variant"
                          : item.positive
                          ? "text-secondary-green"
                          : "text-error"
                      }`}
                    >
                      {item.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Featured Research ─────────────────────────────────────── */}
          <section className="max-w-screen-2xl mx-auto px-4 md:px-6 py-16 md:py-24">
            {/* Section header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
              <div className="max-w-2xl">
                <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight mb-3">
                  Featured Research
                </h2>
                <p className="text-on-surface-variant font-body text-sm md:text-base">
                  Deep-dive analysis into the trends defining the next decade of
                  industrial evolution.
                </p>
              </div>
              <Link
                href="/market-reports/all"
                className="inline-flex items-center gap-2 font-headline font-bold text-primary-container group whitespace-nowrap hover:gap-3 transition-all"
              >
                View All Reports
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Bento grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

              {/* Large featured card */}
              <div className="md:col-span-8 bg-surface-container-lowest p-6 md:p-8 rounded-xl shadow-card hover:-translate-y-1 transition-transform duration-300 flex flex-col md:flex-row gap-6 md:gap-8">
                <div className="md:w-1/2 overflow-hidden rounded-lg aspect-video md:aspect-auto relative min-h-[200px]">
                  <Image
                    src={FEATURED_REPORTS[0].img}
                    alt={FEATURED_REPORTS[0].imgAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 40vw"
                    unoptimized
                  />
                </div>
                <div className="md:w-1/2 flex flex-col justify-between">
                  <div>
                    <span className={`text-[10px] font-mono font-bold mb-2 block ${FEATURED_REPORTS[0].typeColor}`}>
                      {FEATURED_REPORTS[0].type}
                    </span>
                    <h3 className="font-headline text-xl md:text-2xl font-bold mb-4 leading-tight">
                      {FEATURED_REPORTS[0].title}
                    </h3>
                    <p className="text-on-surface-variant text-sm line-clamp-3">
                      {FEATURED_REPORTS[0].description}
                    </p>
                  </div>
                  <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-[10px] font-mono text-on-surface-variant">
                      {FEATURED_REPORTS[0].meta}
                    </span>
                    {/* TODO: Replace href with real PDF URL */}
                    <a
                      href="#"
                      className="px-4 py-2 bg-primary-fixed text-on-primary-fixed font-bold text-sm rounded-md hover:bg-primary-container hover:text-on-primary transition-colors active:scale-95 text-center"
                    >
                      Download PDF
                    </a>
                  </div>
                </div>
              </div>

              {/* Small report cards */}
              {SMALL_REPORTS.map((report) => (
                <div
                  key={report.id}
                  className={`md:col-span-4 ${report.bg} p-6 rounded-xl shadow-card hover:-translate-y-1 transition-transform duration-300 flex flex-col`}
                >
                  <span className={`text-[10px] font-mono font-bold mb-2 block ${report.typeColor}`}>
                    {report.type}
                  </span>
                  <h3 className="font-headline text-lg md:text-xl font-bold mb-4 leading-tight">
                    {report.title}
                  </h3>
                  <p className="text-on-surface-variant text-sm mb-8 flex-1">
                    {report.description}
                  </p>
                  {/* TODO: Replace href with real PDF/article URL */}
                  <a
                    href="#"
                    className="w-full py-2.5 border border-outline-variant/30 font-bold text-sm rounded-md hover:bg-surface-container-lowest transition-colors flex justify-center items-center gap-2 active:scale-95"
                  >
                    {report.actionIcon === "download" ? (
                      <Download className="w-4 h-4" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                    {report.actionLabel}
                  </a>
                </div>
              ))}

              {/* Expert quote card */}
              <div className="md:col-span-8 bg-inverse-surface p-8 rounded-xl flex flex-col justify-center relative overflow-hidden">
                {/* Decorative quote mark — plain text fallback */}
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none select-none font-headline text-[10rem] text-surface leading-none">
                  &ldquo;
                </div>
                <p className="text-xl md:text-3xl font-headline font-medium text-surface mb-6 italic leading-tight relative z-10">
                  &ldquo;The decoupling of heavy manufacturing from centralized power
                  grids is no longer a luxury&mdash;it&rsquo;s the 2025 survival baseline.&rdquo;
                </p>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden flex-shrink-0 relative">
                    <Image
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZQz-9a9pMIFu9Lexv7u1PtXdB8Fwd8-11SD0oiBqOU45U_ih_MU75v0-NXv_oHxiKmJ6KDmNQ9pHdnfkmAhGiRIQ4V0_pBh-hF-dLf1lzcltChrTetdyDQnhWO8xM1OCz0vliv87y4dLo_ESY84ARDKpkdGtzVKkgkp150h8lRpQZiBJ4tjD1tAIHRPlL8grTY1DoQY7FfIZfunrz9hq0D9BA2RxIchV3rR7Ujn2B2_NAtq0dq_882FftF_IwKwnuIFR3r8yqeX4"
                      alt="Portrait of a business executive"
                      fill
                      className="object-cover"
                      sizes="40px"
                      unoptimized
                    />
                  </div>
                  <div>
                    <p className="text-surface font-bold text-sm">Dr. Aris Vond</p>
                    <p className="text-surface/60 text-[10px] uppercase tracking-widest font-mono">
                      Chief Strategist, TradeHut
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Asset Class Deep-Dives ────────────────────────────────── */}
          <section className="bg-surface py-16 md:py-24">
            <div className="max-w-screen-2xl mx-auto px-4 md:px-6">
              <div className="flex items-center justify-between mb-12 md:mb-16">
                <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">
                  Asset Class Deep-Dives
                </h2>
                {/* Navigation arrows — decorative; no client state needed (static page) */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Previous"
                    className="w-11 h-11 rounded-md bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors active:scale-95"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next"
                    className="w-11 h-11 rounded-md bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors active:scale-95"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Card grid — 1 col → 2 col → 4 col */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                {DEEP_DIVES.map((item) => (
                  <div key={item.id} className="space-y-4 group">
                    <div className="aspect-[4/5] bg-surface-container-low rounded-lg overflow-hidden relative">
                      <Image
                        src={item.img}
                        alt={item.imgAlt}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        unoptimized
                      />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-headline font-bold text-lg">{item.title}</h4>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        {item.description}
                      </p>
                      {/* TODO: link to real sector report page */}
                      <Link
                        href={`/market-reports/${item.id}`}
                        className="inline-flex items-center gap-1 text-primary-container text-sm font-bold mt-2 hover:gap-2 transition-all"
                      >
                        Explore Sector
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Subscribe CTA ─────────────────────────────────────────── */}
          <section className="max-w-screen-2xl mx-auto px-4 md:px-6 pb-16 md:pb-24">
            <div className="bg-primary rounded-2xl p-8 md:p-12 lg:p-20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-10 md:gap-12">
              {/* Grid SVG watermark */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
                <svg
                  width="100%"
                  height="100%"
                  preserveAspectRatio="none"
                  fill="none"
                  viewBox="0 0 100 100"
                >
                  <defs>
                    <pattern id="mrgrid" width="10" height="10" patternUnits="userSpaceOnUse">
                      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100" height="100" fill="url(#mrgrid)" />
                </svg>
              </div>

              {/* Copy */}
              <div className="relative z-10 max-w-xl text-center md:text-left">
                <h2 className="font-headline text-3xl md:text-5xl font-extrabold text-white tracking-tighter leading-none mb-6">
                  Stay ahead of the{" "}
                  <span className="text-primary-fixed">market curve.</span>
                </h2>
                <p className="text-white/80 text-base md:text-lg">
                  Join 12,000+ industry leaders who receive our weekly technical
                  digest and market movement alerts.
                </p>
              </div>

              {/* Subscribe form */}
              {/* TODO: wire action to /api/newsletter/ */}
              <div className="relative z-10 w-full max-w-md">
                <form className="flex flex-col sm:flex-row gap-3" action="#" method="POST">
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Institutional Email"
                    className="flex-grow bg-white/10 border border-white/20 rounded-md px-5 py-4 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all font-body text-sm"
                  />
                  <button
                    type="submit"
                    className="bg-white text-primary font-bold px-6 md:px-8 py-4 rounded-md hover:bg-primary-fixed transition-colors whitespace-nowrap active:scale-95"
                  >
                    Subscribe Now
                  </button>
                </form>
                <p className="text-white/40 text-[10px] mt-4 text-center sm:text-left uppercase tracking-widest font-mono">
                  No spam. Only high-frequency data. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </section>

        </main>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="bg-surface-container-low w-full py-12 md:py-16 px-4 md:px-8 mt-8">
          <div className="max-w-screen-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 md:gap-12">
            {/* Brand column */}
            <div className="sm:col-span-2 md:col-span-1">
              <Link
                href="/"
                className="font-headline font-black text-on-surface text-2xl mb-6 block tracking-tight"
              >
                TradeHut
              </Link>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6 font-body">
                The premier marketplace for industrial assets and technical
                intelligence. Engineered for professionals, built for precision.
              </p>
              <div className="flex gap-4">
                {(["globe", "hub", "share"] as const).map((icon) => (
                  <a
                    key={icon}
                    href="#"
                    className="w-9 h-9 rounded-full bg-on-surface/5 flex items-center justify-center hover:bg-primary-container hover:text-white transition-all"
                    aria-label={icon}
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Marketplace links */}
            <div className="space-y-4">
              <h4 className="font-headline font-bold uppercase tracking-widest text-[10px] text-on-surface/40">
                Marketplace
              </h4>
              <ul className="space-y-3 text-sm font-body tracking-wide">
                {[
                  ["Market Insights", "/market-reports"],
                  ["Live Auctions", "/auctions"],
                  ["Direct RFQ", "/rfq"],
                  ["Inventory Search", "/products"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-on-surface-variant hover:text-primary-container hover:translate-x-1 transition-all inline-block"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Technical links */}
            <div className="space-y-4">
              <h4 className="font-headline font-bold uppercase tracking-widest text-[10px] text-on-surface/40">
                Technical
              </h4>
              <ul className="space-y-3 text-sm font-body tracking-wide">
                {[
                  "API Documentation",
                  "Security Protocol",
                  "System Status",
                  "Open Data Initiative",
                ].map((label) => (
                  <li key={label}>
                    <a
                      href="#"
                      className="text-on-surface-variant hover:text-primary-container hover:translate-x-1 transition-all inline-block"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company links */}
            <div className="space-y-4">
              <h4 className="font-headline font-bold uppercase tracking-widest text-[10px] text-on-surface/40">
                Company
              </h4>
              <ul className="space-y-3 text-sm font-body tracking-wide">
                {[
                  ["Sustainability", "#"],
                  ["Terms of Service", "/legal/terms"],
                  ["Trust Center", "/trust"],
                  ["Contact Support", "#"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-on-surface-variant hover:text-primary-container hover:translate-x-1 transition-all inline-block"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Copyright bar */}
          <div className="max-w-screen-2xl mx-auto mt-16 pt-8 border-t border-on-background/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm font-body tracking-wide text-on-surface/40">
              &copy; 2024 TradeHut Industrial. Engineered for Precision.
            </p>
            <div className="flex gap-6 md:gap-8">
              <span className="font-mono text-[10px] text-on-surface/30">V.4.2.0-STABLE</span>
              <span className="font-mono text-[10px] text-on-surface/30 uppercase tracking-[0.2em]">
                All Rights Reserved
              </span>
            </div>
          </div>
        </footer>
      </div>
    </MainLayout>
  );
}
