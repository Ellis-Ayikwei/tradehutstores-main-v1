/**
 * Safety & Compliance — /compliance
 *
 * Ported from stitch_full_website_redesign_expansion/tradehut_safety_compliance/code.html
 * Design-system tokens: Kinetic Material-3 derived (see .claude/design-system/tokens.md).
 *
 * Layout sections:
 *  1. Hero — compliance headline, trust stat pills
 *  2. Compliance Status Grid — 3 KPI cards (penalties, violations, safety recalls)
 *  3. Prohibited Items — category icon grid
 *  4. Seller Requirements — licensing / tax / KYC accordion list
 *  5. Safety Pledge + Security Log bento
 *  6. Regulatory Partners — logo strip
 *  7. Reporting Mechanisms + Anonymous Tip CTA
 *  8. Policy Documents — download list
 *
 * TODOs:
 *  - TODO: replace COMPLIANCE_STATS with data from GET /api/compliance/account-status/
 *  - TODO: replace POLICY_DOCS with data from GET /api/compliance/policy-documents/
 *  - TODO: wire "Submit Anonymous Tip" CTA to POST /api/compliance/tips/
 *  - TODO: "Appeal Penalty" links should route to /account/disputes
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ShieldCheck,
  Shield,
  Gavel,
  Flag,
  OctagonAlert,
  Ban,
  Globe,
  Leaf,
  ChevronDown,
  ArrowRight,
  Headphones,
  Lock,
  FileText,
  Download,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";

// ─── Static data (replace with API calls per TODOs above) ─────────────────────

const PROHIBITED_ITEMS = [
  { icon: "octagon-alert", label: "Hazardous Materials", description: "Explosives, flammable chemicals, and regulated gases." },
  { icon: "ban", label: "Counterfeit Goods", description: "Replica products, unauthorised brand reproductions." },
  { icon: "shield-check", label: "Unlicensed Pharmaceuticals", description: "Prescription medicines without verified supply chain." },
  { icon: "alert-triangle", label: "Illegal Weapons", description: "Unlicensed firearms, prohibited blades, and components." },
  { icon: "ban", label: "Restricted Age Products", description: "Age-gated items sold to unverified buyers." },
  { icon: "globe", label: "Sanctions-Listed Items", description: "Goods restricted by international trade sanctions." },
  { icon: "leaf", label: "Protected Wildlife", description: "CITES-listed species and associated products." },
  { icon: "shield", label: "Malware & Exploits", description: "Software designed to compromise or damage systems." },
];

const SELLER_REQUIREMENTS = [
  {
    id: "kyc",
    icon: "shield-check",
    title: "Know Your Customer (KYC)",
    badge: "Mandatory",
    badgeStyle: "bg-error-container text-on-error-container",
    description:
      "All sellers must complete identity verification before listing. This includes government-issued ID, proof of address, and for businesses, company registration documentation.",
  },
  {
    id: "tax",
    icon: "file-text",
    title: "Tax & VAT Registration",
    badge: "Mandatory",
    badgeStyle: "bg-error-container text-on-error-container",
    description:
      "Sellers operating above threshold turnover must provide a valid tax identification number. Cross-border sellers may need to register for destination-country VAT.",
  },
  {
    id: "licensing",
    icon: "shield",
    title: "Product Category Licensing",
    badge: "Conditional",
    badgeStyle: "bg-surface-container text-on-surface-variant",
    description:
      "Certain categories — pharmaceuticals, chemical compounds, heavy machinery — require government-issued trading licences to be uploaded and verified before activation.",
  },
  {
    id: "aml",
    icon: "gavel",
    title: "Anti-Money Laundering (AML)",
    badge: "Mandatory",
    badgeStyle: "bg-error-container text-on-error-container",
    description:
      "Periodic screening against global watchlists is automated on all accounts. Unusual transaction patterns may trigger a temporary hold pending human review.",
  },
  {
    id: "insurance",
    icon: "shield",
    title: "Liability Insurance",
    badge: "Recommended",
    badgeStyle: "bg-secondary-container text-on-secondary-container",
    description:
      "For high-value industrial goods, product liability insurance is strongly recommended. Coverage proof can be attached to your seller profile for buyer confidence.",
  },
];

const REGULATORS = [
  { name: "ISO", description: "International Organization for Standardization" },
  { name: "REACH", description: "EU Chemical Safety Regulation" },
  { name: "CPSC", description: "Consumer Product Safety Commission" },
  { name: "CE Mark", description: "European Conformity" },
  { name: "RoHS", description: "Restriction of Hazardous Substances" },
  { name: "UL", description: "Underwriters Laboratories" },
];

const POLICY_DOCUMENTS = [
  {
    id: "prohibited-items",
    icon: "gavel",
    title: "Prohibited & Restricted Items Policy",
    updated: "2024-01-15",
    size: "PDF, 284 KB",
    href: "/documents/prohibited-items-policy.pdf",
  },
  {
    id: "seller-conduct",
    icon: "file-text",
    title: "Seller Code of Conduct",
    updated: "2024-02-08",
    size: "PDF, 192 KB",
    href: "/documents/seller-conduct.pdf",
  },
  {
    id: "aml-policy",
    icon: "gavel",
    title: "Anti-Money Laundering Policy",
    updated: "2023-11-30",
    size: "PDF, 340 KB",
    href: "/documents/aml-policy.pdf",
  },
  {
    id: "data-retention",
    icon: "file-text",
    title: "Data Retention & Compliance",
    updated: "2024-03-01",
    size: "PDF, 156 KB",
    href: "/documents/data-retention.pdf",
  },
  {
    id: "sanctions",
    icon: "globe",
    title: "Sanctions & Export Controls",
    updated: "2024-03-19",
    size: "PDF, 228 KB",
    href: "/documents/sanctions-policy.pdf",
  },
];

// ─── Icon resolver ─────────────────────────────────────────────────────────────

function ReqIcon({ name, className }: { name: string; className?: string }) {
  const cls = className ?? "w-5 h-5";
  switch (name) {
    case "shield-check": return <ShieldCheck className={cls} />;
    case "file-text":    return <FileText className={cls} />;
    case "gavel":        return <Gavel className={cls} />;
    default:             return <Shield className={cls} />;
  }
}

function DocIcon({ name, className }: { name: string; className?: string }) {
  const cls = className ?? "w-5 h-5";
  switch (name) {
    case "gavel":     return <Gavel className={cls} />;
    case "file-text": return <FileText className={cls} />;
    case "globe":     return <Globe className={cls} />;
    default:          return <FileText className={cls} />;
  }
}

function ProhibitedIconEl({ name, className }: { name: string; className?: string }) {
  const cls = className ?? "w-6 h-6";
  switch (name) {
    case "octagon-alert":  return <OctagonAlert className={cls} />;
    case "ban":            return <Ban className={cls} />;
    case "shield-check":   return <ShieldCheck className={cls} />;
    case "alert-triangle": return <AlertTriangle className={cls} />;
    case "globe":          return <Globe className={cls} />;
    case "leaf":           return <Leaf className={cls} />;
    default:               return <Shield className={cls} />;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Pill({ icon, children }: { icon?: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-full">
      {icon === "verified_user" && <ShieldCheck className="w-4 h-4" />}
      {icon === "shield" && <Shield className="w-4 h-4" />}
      {icon === "gavel" && <Gavel className="w-4 h-4" />}
      {icon === "flag" && <Flag className="w-4 h-4" />}
      {children}
    </span>
  );
}

function ProhibitedCard({
  icon,
  label,
  description,
}: (typeof PROHIBITED_ITEMS)[number]) {
  return (
    <div className="group bg-surface-container-lowest rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 border border-outline-variant/10">
      <div className="w-12 h-12 bg-error-container/40 rounded-lg flex items-center justify-center mb-4 group-hover:bg-error-container transition-colors duration-300">
        <ProhibitedIconEl name={icon} className="w-6 h-6 text-error" />
      </div>
      <h3 className="font-headline font-bold text-base text-on-surface mb-1">
        {label}
      </h3>
      <p className="text-xs text-on-surface-variant leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function RequirementAccordion() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {SELLER_REQUIREMENTS.map((req) => {
        const isOpen = openId === req.id;
        return (
          <div
            key={req.id}
            className="bg-surface-container-lowest rounded-xl shadow-card overflow-hidden"
          >
            <button
              onClick={() => setOpenId((prev) => (prev === req.id ? null : req.id))}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-4 px-6 py-5 min-h-12 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.99] transition-transform"
            >
              <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center flex-shrink-0">
                <ReqIcon name={req.icon} className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <span className="font-headline font-bold text-base text-on-surface">
                    {req.title}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full w-fit ${req.badgeStyle}`}
                  >
                    {req.badge}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`w-5 h-5 text-outline flex-shrink-0 transition-transform duration-300 ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <p className="px-6 pb-6 text-sm text-on-surface-variant leading-relaxed">
                {req.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

import MainLayout from "@/components/Layouts/MainLayout";

export default function CompliancePage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface">

        {/* ── 1. Hero ────────────────────────────────────────────────────────── */}
        <section className="relative bg-surface py-16 md:py-24 lg:py-32 overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-error/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-screen-2xl mx-auto px-4 md:px-8">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6">
              <span className="px-3 py-1 bg-surface-container text-on-surface-variant text-[10px] font-bold uppercase tracking-widest rounded-full">
                Platform Integrity
              </span>
            </div>

            <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[0.9] text-on-surface mb-6 max-w-4xl">
              Safety &amp; Compliance
            </h1>
            <p className="text-on-surface-variant text-base md:text-lg leading-relaxed max-w-2xl mb-10">
              TradeHut is committed to maintaining a safe, transparent, and legally
              compliant marketplace. Review our policies, seller obligations, and
              reporting mechanisms below.
            </p>

            {/* Trust stat pills */}
            <div className="flex flex-wrap gap-3">
              <Pill icon="verified_user">KYC-verified sellers</Pill>
              <Pill icon="shield">ISO-aligned product standards</Pill>
              <Pill icon="gavel">Zero tolerance for prohibited goods</Pill>
              <Pill icon="flag">Anonymous reporting available</Pill>
            </div>
          </div>
        </section>

        {/* ── 2. Compliance Status Grid — 3 KPI cards ───────────────────────── */}
        <section className="bg-surface-container-low py-12 md:py-16">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Card 1 — Active Enforcement */}
              <div className="bg-surface-container-lowest p-8 rounded-xl shadow-card relative overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <Gavel className="w-10 h-10 text-primary opacity-20" />
                  <span className="bg-surface-container-low px-3 py-1 rounded-full text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                    Enforcement
                  </span>
                </div>
                <div className="font-mono text-5xl font-bold text-on-surface mb-2">
                  40+
                </div>
                <div className="text-sm font-bold font-headline text-on-surface-variant uppercase tracking-widest">
                  Regulatory Bodies
                </div>
                <p className="mt-4 text-xs text-on-surface-variant/70 leading-normal">
                  We aggregate safety data from over 40 global regulators to protect
                  every transaction.
                </p>
              </div>

              {/* Card 2 — Violation Response */}
              <div className="bg-surface-container-lowest p-8 rounded-xl shadow-card">
                <div className="flex justify-between items-start mb-6">
                  <AlertTriangle className="w-10 h-10 text-error opacity-20" />
                  <span className="bg-secondary-container px-3 py-1 rounded-full text-xs font-bold text-on-secondary-container uppercase tracking-widest">
                    Response SLA
                  </span>
                </div>
                <div className="font-mono text-5xl font-bold text-on-surface mb-2">
                  24h
                </div>
                <div className="text-sm font-bold font-headline text-on-surface-variant uppercase tracking-widest">
                  Violation Response Time
                </div>
                <p className="mt-4 text-xs text-on-surface-variant/70 leading-normal">
                  All reported violations are reviewed by our compliance team within
                  one business day.
                </p>
              </div>

              {/* Card 3 — Safety Recalls */}
              <div className="bg-surface-container-lowest p-8 rounded-xl shadow-card">
                <div className="flex justify-between items-start mb-6">
                  <TrendingUp className="w-10 h-10 text-tertiary opacity-20" />
                  <span className="bg-tertiary-container/20 px-3 py-1 rounded-full text-xs font-bold text-tertiary uppercase tracking-widest">
                    Live Monitoring
                  </span>
                </div>
                <div className="font-mono text-5xl font-bold text-on-surface mb-2">
                  99.9%
                </div>
                <div className="text-sm font-bold font-headline text-on-surface-variant uppercase tracking-widest">
                  Platform Uptime
                </div>
                <p className="mt-4 text-xs text-on-surface-variant/70 leading-normal">
                  Our safety monitoring systems run continuously with near-perfect
                  availability.
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── 3. Prohibited Items Grid ──────────────────────────────────────── */}
        <section className="bg-surface py-16 md:py-20 lg:py-24">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">

            {/* Section header */}
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-10 md:mb-14">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  Zero tolerance
                </span>
                <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface">
                  Prohibited Item Categories
                </h2>
                <p className="text-on-surface-variant text-sm mt-2 max-w-xl leading-relaxed">
                  The following categories are strictly forbidden on TradeHut.
                  Listings in these categories are immediately removed and the
                  responsible account reviewed.
                </p>
              </div>
              <Link
                href="/legal/terms"
                className="hidden md:flex items-center gap-2 text-primary font-bold group"
              >
                Full policy
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Grid — 2 cols on mobile, 4 on lg */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {PROHIBITED_ITEMS.map((item) => (
                <ProhibitedCard key={item.label} {...item} />
              ))}
            </div>

            {/* Mobile link */}
            <div className="mt-8 flex justify-center md:hidden">
              <Link
                href="/legal/terms"
                className="flex items-center gap-2 text-primary font-bold"
              >
                Full policy
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        </section>

        {/* ── 4. Seller Compliance Requirements ────────────────────────────── */}
        <section className="bg-surface-container-low py-16 md:py-20 lg:py-24">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

              {/* Left — section header + intro */}
              <div className="lg:col-span-4 lg:sticky lg:top-24">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  Seller obligations
                </span>
                <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-4">
                  Compliance Requirements
                </h2>
                <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                  Every seller on TradeHut must meet these baseline standards before
                  their first listing goes live. Requirements are re-verified
                  annually or when thresholds are crossed.
                </p>
                <Link
                  href="/help"
                  className="inline-flex items-center gap-2 font-bold text-sm text-primary hover:underline active:scale-95 transition-transform"
                >
                  Seller help articles
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Right — accordion list */}
              <div className="lg:col-span-8">
                <RequirementAccordion />
              </div>

            </div>
          </div>
        </section>

        {/* ── 5. Safety Pledge + Security Log bento ────────────────────────── */}
        <section className="bg-surface py-16 md:py-20 lg:py-24">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
            <div className="bg-surface-container-highest/30 rounded-[2rem] p-8 md:p-12 relative overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center relative z-10">

                {/* Left — pledge text */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">
                    Our commitment
                  </span>
                  <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-8">
                    Our Safety Pledge
                  </h2>

                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-1 flex-shrink-0 h-12 bg-primary rounded-full" />
                      <div>
                        <h5 className="font-bold text-base md:text-lg text-on-surface">
                          Real-time Monitoring
                        </h5>
                        <p className="text-on-surface-variant text-sm">
                          We aggregate global safety data from over 40 regulatory
                          bodies to protect your assets.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-1 flex-shrink-0 h-12 bg-primary/40 rounded-full" />
                      <div>
                        <h5 className="font-bold text-base md:text-lg text-on-surface">
                          Fair Adjudication
                        </h5>
                        <p className="text-on-surface-variant text-sm">
                          Human reviews are mandatory for every account penalty
                          appeal, ensuring equitable outcomes.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-1 flex-shrink-0 h-12 bg-primary/20 rounded-full" />
                      <div>
                        <h5 className="font-bold text-base md:text-lg text-on-surface">
                          Transparent Communication
                        </h5>
                        <p className="text-on-surface-variant text-sm">
                          All policy changes are announced 30 days in advance with
                          plain-language summaries for all stakeholders.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right — security log card */}
                <div className="bg-surface-container-lowest/70 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-card-hover border border-outline-variant/20">
                  <div className="font-mono text-xs text-on-surface-variant/60 mb-6 uppercase tracking-widest">
                    Compliance Activity Log
                  </div>
                  <div className="space-y-4">
                    {[
                      { ts: "2024-03-20 09:14", label: "POLICY UPDATED", color: "text-tertiary" },
                      { ts: "2024-03-18 14:02", label: "SELLER VERIFIED", color: "text-secondary-green" },
                      { ts: "2024-03-15 11:37", label: "LISTING REMOVED", color: "text-error" },
                      { ts: "2024-03-12 08:55", label: "KYC PASSED", color: "text-secondary-green" },
                    ].map((entry) => (
                      <div
                        key={entry.ts}
                        className="flex justify-between items-center pb-4 border-b border-outline-variant/10 last:border-0 last:pb-0"
                      >
                        <span className="font-mono text-xs text-on-surface-variant">
                          {entry.ts}
                        </span>
                        <span className={`text-xs font-bold ${entry.color}`}>
                          {entry.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Decorative glow */}
              <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-primary-container/5 rounded-full blur-[100px] pointer-events-none" />
            </div>
          </div>
        </section>

        {/* ── 6. Regulatory Partners ────────────────────────────────────────── */}
        <section className="bg-surface-container-low py-12 md:py-16">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">

            <div className="text-center mb-8 md:mb-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Trusted frameworks
              </span>
              <h2 className="font-headline text-2xl md:text-3xl font-bold tracking-tight text-on-surface">
                Regulatory Partnerships
              </h2>
            </div>

            {/* Logo strip — scrollable on mobile, flex-wrap on lg */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {REGULATORS.map((reg) => (
                <div
                  key={reg.name}
                  className="flex flex-col items-center gap-2 bg-surface-container-lowest rounded-xl px-6 py-4 md:px-8 md:py-5 shadow-card hover:shadow-card-hover transition-all duration-300 min-w-[120px] text-center"
                >
                  <span className="font-headline font-extrabold text-lg md:text-xl text-on-surface tracking-tight">
                    {reg.name}
                  </span>
                  <span className="text-[10px] text-on-surface-variant leading-tight">
                    {reg.description}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── 7. Reporting Mechanisms + Anonymous Tip CTA ───────────────────── */}
        <section className="bg-surface py-16 md:py-20 lg:py-24">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">

              {/* Reporting options */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                  How to report
                </span>
                <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-6">
                  Reporting Mechanisms
                </h2>

                <div className="space-y-4">
                  {[
                    {
                      icon: "flag",
                      title: "Flag a Listing",
                      description:
                        "Use the “Report” button on any product listing page to alert our moderation team to potential violations.",
                      action: "Browse listings",
                      href: "/products",
                      accentBg: "bg-error-container/30",
                    },
                    {
                      icon: "headphones",
                      title: "Contact Compliance Team",
                      description:
                        "For complex or urgent matters, reach our dedicated compliance officers directly.",
                      action: "Open a ticket",
                      href: "/help",
                      accentBg: "bg-surface-container-low",
                    },
                    {
                      icon: "shield-check",
                      title: "Submit a Dispute",
                      description:
                        "Use the formal dispute resolution process for transaction-level compliance concerns.",
                      action: "Dispute center",
                      href: "/account/disputes",
                      accentBg: "bg-surface-container-low",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className={`${item.accentBg} rounded-xl p-5 flex items-start gap-4 border border-outline-variant/10`}
                    >
                      <div className="w-10 h-10 bg-surface-container-lowest rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
                        {item.icon === "flag" && <Flag className="w-5 h-5 text-primary" />}
                        {item.icon === "headphones" && <Headphones className="w-5 h-5 text-primary" />}
                        {item.icon === "shield-check" && <ShieldCheck className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-base text-on-surface mb-1">
                          {item.title}
                        </h4>
                        <p className="text-sm text-on-surface-variant leading-relaxed mb-3">
                          {item.description}
                        </p>
                        <Link
                          href={item.href}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline active:scale-95 transition-transform"
                        >
                          {item.action}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Anonymous tip CTA */}
              <div className="primary-gradient rounded-[2rem] p-8 md:p-10 lg:p-12 relative overflow-hidden flex flex-col justify-between min-h-[320px] text-white">
                {/* Decorative icon */}
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none select-none">
                  <Shield className="w-40 h-40" />
                </div>

                <div className="relative z-10">
                  <span className="inline-flex items-center gap-2 bg-surface-container-lowest/20 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
                    <Lock className="w-3 h-3" />
                    100% Anonymous
                  </span>
                  <h3 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight mb-4">
                    Submit an Anonymous Tip
                  </h3>
                  <p className="text-white/80 text-sm leading-relaxed mb-8 max-w-sm">
                    Observed a prohibited item, fraudulent seller, or policy
                    violation? Submit a confidential tip. Your identity is never
                    recorded or shared with any party.
                  </p>
                </div>

                {/* TODO: wire to POST /api/compliance/tips/ */}
                <Link
                  href="/account/reports"
                  className="relative z-10 bg-surface-container-lowest text-primary font-bold py-3 md:py-4 px-6 md:px-8 rounded-xl transition-all active:scale-95 shadow-lg hover:shadow-xl w-full md:w-auto text-center"
                >
                  Submit Anonymous Tip
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* ── 8. Policy Documents ──────────────────────────────────────────── */}
        <section className="bg-surface-container-low py-16 md:py-20 lg:py-24">
          <div className="max-w-screen-2xl mx-auto px-4 md:px-8">

            <div className="mb-10 md:mb-14">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Downloads
              </span>
              <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight text-on-surface">
                Policy Documents
              </h2>
            </div>

            <div className="space-y-3">
              {POLICY_DOCUMENTS.map((doc) => (
                <a
                  key={doc.id}
                  href={doc.href}
                  download
                  className="flex items-center gap-4 md:gap-6 bg-surface-container-lowest rounded-xl p-4 md:p-6 shadow-card hover:shadow-card-hover transition-all duration-300 group"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 bg-primary-fixed/40 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                    <DocIcon name={doc.icon} className="w-5 h-5 text-primary group-hover:text-white transition-colors duration-300" />
                  </div>

                  {/* Doc info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm md:text-base text-on-surface group-hover:text-primary transition-colors truncate md:whitespace-normal">
                      {doc.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs font-mono text-on-surface-variant">
                        Updated {doc.updated}
                      </span>
                      <span className="text-xs text-outline">{doc.size}</span>
                    </div>
                  </div>

                  {/* Download button */}
                  <div className="flex items-center gap-2 text-on-surface-variant group-hover:text-primary transition-colors flex-shrink-0">
                    <span className="hidden sm:block text-xs font-bold uppercase tracking-widest">
                      Download
                    </span>
                    <Download className="w-5 h-5" />
                  </div>
                </a>
              ))}
            </div>

          </div>
        </section>

        {/* ── Support FAB ─────────────────────────────────────────────────── */}
        {/* Fixed to bottom-right; helps users quickly reach compliance specialists */}
        <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-50">
          <Link
            href="/help"
            className="bg-inverse-surface text-inverse-on-surface px-4 py-3 md:px-5 md:py-4 rounded-xl shadow-xl flex items-center gap-3 active:scale-95 transition-transform hover:opacity-90"
          >
            <Headphones className="w-5 h-5" />
            <span className="font-bold text-xs uppercase tracking-widest hidden sm:block">
              Connect to Specialist
            </span>
          </Link>
        </div>

      </div>
    </MainLayout>
  );
}
