"use client";

/**
 * Verification Status page — "Trust & Verification"
 * Route: /account/verification
 *
 * Ported from:
 *   stitch_full_website_redesign_expansion/tradehut_verification_status/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 *
 * Data: fully mocked.
 * // TODO: fetch /api/account/verification/ on mount, replace DEMO_VERIFICATION.
 * // TODO: POST /api/account/verification/{step}/ for document upload.
 */

import { useState } from "react";
import Link from "next/link";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import {
  FileText,
  ShieldCheck,
  ArrowRight,
  Mail,
  Smartphone,
  IdCard,
  Home,
  Store,
  Landmark,
  TrendingUp,
  CheckCircle,
  Circle,
  Check,
  Lock,
  X,
  BadgeCheck,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type VerificationStatus = "complete" | "in_review" | "required" | "locked";
type VerificationTier = "unverified" | "basic" | "verified" | "premium";

interface VerificationStep {
  id: string;
  /** Lucide icon component for this step */
  IconComponent: React.ElementType;
  title: string;
  subtitle: string;
  status: VerificationStatus;
  /** Shown in the pill badge */
  statusLabel: string;
  /** CTA button label — null means no CTA */
  ctaLabel: string | null;
  /** href for the CTA (upload flow, view doc, etc.) */
  ctaHref: string | null;
}

interface SecurityScoreItem {
  /** Lucide component */
  IconComponent: React.ElementType;
  label: string;
  points: number;
  achieved: boolean;
}

interface BenefitItem {
  label: string;
  detail: string;
  unlocked: boolean;
}

// ---------------------------------------------------------------------------
// Demo data
// TODO: fetch from /api/account/verification/ and replace below.
// ---------------------------------------------------------------------------
const DEMO_TIER: VerificationTier = "verified";

const DEMO_STEPS: VerificationStep[] = [
  {
    id: "email",
    IconComponent: Mail,
    title: "Email Verification",
    subtitle: "Verified on Jan 12, 2024",
    status: "complete",
    statusLabel: "COMPLETE",
    ctaLabel: null,
    ctaHref: null,
  },
  {
    id: "phone",
    IconComponent: Smartphone,
    title: "Phone Verification",
    subtitle: "Verified on Jan 13, 2024",
    status: "complete",
    statusLabel: "COMPLETE",
    ctaLabel: null,
    ctaHref: null,
  },
  {
    id: "identity",
    IconComponent: IdCard,
    title: "Identity Verification",
    subtitle: "Document processed, pending final check.",
    status: "in_review",
    statusLabel: "IN REVIEW",
    ctaLabel: "View Document",
    ctaHref: "#identity-details",
  },
  {
    id: "address",
    IconComponent: Home,
    title: "Address Proof",
    subtitle: "Upload a recent utility bill or bank statement.",
    status: "required",
    statusLabel: "REQUIRED",
    ctaLabel: "Upload Proof",
    ctaHref: "#upload-address",
  },
  {
    id: "business",
    IconComponent: Store,
    title: "Business Registration",
    subtitle: "For sellers only. Unlock after ID verification.",
    status: "locked",
    statusLabel: "LOCKED",
    ctaLabel: null,
    ctaHref: null,
  },
  {
    id: "bank",
    IconComponent: Landmark,
    title: "Bank Verification",
    subtitle: "Link and verify your bank account for withdrawals.",
    status: "locked",
    statusLabel: "LOCKED",
    ctaLabel: null,
    ctaHref: null,
  },
];

const DEMO_SCORE = 84;

const DEMO_SCORE_ITEMS: SecurityScoreItem[] = [
  { IconComponent: CheckCircle, label: "2FA Active (App)", points: 20, achieved: true },
  { IconComponent: CheckCircle, label: "Biometric Login", points: 15, achieved: true },
  {
    IconComponent: Circle,
    label: "Hardware Security Key",
    points: 16,
    achieved: false,
  },
];

const DEMO_BENEFITS: BenefitItem[] = [
  {
    label: "Standard Marketplace Access",
    detail: "Buy and sell from vetted merchants.",
    unlocked: true,
  },
  {
    label: "Increased Withdrawal Limits",
    detail: "Up to GHS 250,000 / day",
    unlocked: true,
  },
  {
    label: "High-Value Auction Entry",
    detail: "Requires Business Verification.",
    unlocked: false,
  },
  {
    label: "Priority RFQ Settlement",
    detail: "Unlock dedicated trade support.",
    unlocked: false,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TIER_CONFIG: Record<
  VerificationTier,
  { label: string; IconComponent: React.ElementType; classes: string }
> = {
  unverified: {
    label: "Unverified",
    IconComponent: X,
    classes: "bg-error-container text-on-error-container",
  },
  basic: {
    label: "Basic Member",
    IconComponent: ShieldCheck,
    classes: "bg-surface-container text-on-surface-variant",
  },
  verified: {
    label: "Tier 2: Verified Member",
    IconComponent: BadgeCheck,
    classes: "bg-surface-container-low text-secondary-green",
  },
  premium: {
    label: "Tier 3: Business Pro",
    IconComponent: Sparkles,
    classes: "bg-primary-fixed text-on-primary-container",
  },
};

const STATUS_CONFIG: Record<
  VerificationStatus,
  { pillClasses: string; borderClass: string; cardBg: string; dimmed: boolean }
> = {
  complete: {
    pillClasses: "bg-secondary-container text-on-secondary-container",
    borderClass: "border-secondary-green",
    cardBg: "bg-surface-container-lowest",
    dimmed: false,
  },
  in_review: {
    pillClasses: "bg-primary-container text-on-primary",
    borderClass: "border-primary",
    cardBg: "bg-surface-container-lowest",
    dimmed: false,
  },
  required: {
    pillClasses: "bg-bid-amber/10 text-bid-amber",
    borderClass: "border-bid-amber",
    cardBg: "bg-surface-container-lowest",
    dimmed: false,
  },
  locked: {
    pillClasses: "bg-surface-container-highest text-on-surface-variant",
    borderClass: "border-outline-variant",
    cardBg: "bg-surface-container-low",
    dimmed: true,
  },
};

// Map status to icon colour for step card icons
const STATUS_ICON_COLOR: Record<VerificationStatus, string> = {
  complete: "text-secondary-green",
  in_review: "text-primary",
  required: "text-bid-amber",
  locked: "text-on-surface-variant",
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Verification step card — used in the top bento grid */
function StepCard({ step }: { step: VerificationStep }) {
  const cfg = STATUS_CONFIG[step.status];
  const iconColor = STATUS_ICON_COLOR[step.status];

  return (
    <div
      className={`
        ${cfg.cardBg} p-6 rounded-xl shadow-card border-l-4 ${cfg.borderClass}
        flex flex-col justify-between
        ${cfg.dimmed ? "opacity-60 grayscale" : ""}
      `}
    >
      <div className="flex justify-between items-start">
        <step.IconComponent className={`w-8 h-8 ${iconColor}`} />
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${cfg.pillClasses}`}
        >
          {step.statusLabel}
        </span>
      </div>
      <div className="mt-4">
        <h3 className="font-bold text-base md:text-lg leading-tight">
          {step.title}
        </h3>
        <p className="text-sm text-on-surface-variant mt-1 leading-snug">
          {step.subtitle}
        </p>
        {step.ctaLabel && step.ctaHref && (
          <Link
            href={step.ctaHref}
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline underline-offset-2 transition-colors active:scale-95"
          >
            {step.ctaLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

/** Identity document panel — full-detail card for the in-review step */
function IdentityDetailsPanel() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      id="identity-details"
      className="bg-surface-container-lowest rounded-xl p-6 md:p-8 shadow-card space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h3 className="font-headline text-xl md:text-2xl font-bold">
          Identity Verification
        </h3>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg self-start sm:self-auto">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Pending Review
          </span>
        </div>
      </div>

      <p className="text-on-surface-variant text-sm leading-relaxed">
        We are currently verifying your government-issued ID. This process
        typically takes 24–48 hours. Once verified, you will gain access to
        high-frequency trading tools and elevated withdrawal limits.
      </p>

      {/* Document preview */}
      <div
        className="relative group cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {hovered && (
          <div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center z-10 transition-opacity">
            <span className="bg-surface-container-lowest px-4 py-2 rounded-full font-bold text-sm shadow-card">
              View Original
            </span>
          </div>
        )}
        <div className="aspect-video rounded-lg overflow-hidden bg-surface-container-low relative">
          {/* Placeholder — replace with actual secure document preview */}
          <div className="w-full h-full flex items-center justify-center bg-surface-container">
            <IdCard className="w-20 h-20 text-outline/30" strokeWidth={0.75} />
          </div>
          {/* Document label bar */}
          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-on-surface/60 backdrop-blur-sm p-3 rounded-lg text-surface-container-lowest">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="font-mono text-xs tracking-wider">
                PASSPORT_SCAN_2024.PDF
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Uploaded Jan 15
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {/* TODO: POST /api/account/verification/identity/ for re-upload */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button className="flex-1 py-3 px-5 bg-surface-container-low rounded-lg font-bold text-sm hover:bg-surface-container-high transition-colors active:scale-95">
          Replace Document
        </button>
        <button className="flex-1 py-3 px-5 bg-primary text-on-primary rounded-lg font-bold text-sm shadow-md hover:opacity-90 transition-opacity active:scale-95">
          Submit Additional Info
        </button>
      </div>
    </div>
  );
}

/** Security score card */
function SecurityScoreCard() {
  const progressPct = DEMO_SCORE;

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 md:p-8 shadow-card relative overflow-hidden">
      {/* Decorative orb */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-green/5 rounded-full -translate-y-16 translate-x-16 pointer-events-none" />

      <h3 className="font-headline text-lg md:text-xl font-bold mb-6">
        Security Score
      </h3>

      <div className="flex items-end gap-4 mb-6">
        <span className="font-mono text-5xl md:text-6xl font-bold text-secondary-green leading-none">
          {DEMO_SCORE}
        </span>
        <span className="text-on-surface-variant font-bold mb-1.5">/ 100</span>
        <div className="ml-auto flex items-center gap-1 text-secondary-green">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-bold font-mono">+12 PTS</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-secondary-green rounded-full transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Score breakdown */}
      <ul className="space-y-3">
        {DEMO_SCORE_ITEMS.map((item) => (
          <li
            key={item.label}
            className={`flex items-center justify-between text-sm ${
              item.achieved ? "" : "text-on-surface-variant/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <item.IconComponent
                className={`w-5 h-5 ${
                  item.achieved ? "text-secondary-green" : "text-outline"
                }`}
              />
              <span>{item.label}</span>
            </div>
            <span className="font-mono text-xs">+{item.points}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Verification benefits card */
function BenefitsCard() {
  return (
    <div className="bg-on-surface text-surface-container-lowest rounded-xl p-6 md:p-8 shadow-card">
      <h3 className="font-headline text-lg md:text-xl font-bold mb-6">
        Verification Benefits
      </h3>

      <ul className="space-y-4">
        {DEMO_BENEFITS.map((benefit) => (
          <li key={benefit.label} className={`flex items-start gap-4 ${benefit.unlocked ? "" : "opacity-40"}`}>
            <div
              className={`mt-1 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${
                benefit.unlocked
                  ? "bg-secondary-green/20"
                  : "bg-surface-container-lowest/10"
              }`}
            >
              {benefit.unlocked ? (
                <Check
                  className="w-3 h-3 text-secondary-green"
                />
              ) : (
                <Lock
                  className="w-3 h-3 text-surface-container-lowest"
                />
              )}
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{benefit.label}</p>
              <p className="text-xs text-surface-variant/60 mt-0.5 font-mono leading-snug">
                {benefit.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* Upgrade CTA */}
      {/* TODO: wire to upgrade/business-pro flow */}
      <button className="mt-8 w-full py-3 primary-gradient text-on-primary rounded-lg font-bold text-sm transition-transform active:scale-95 hover:opacity-90">
        Upgrade to Business Pro
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function VerificationPage() {
  const tier = DEMO_TIER;
  const tierCfg = TIER_CONFIG[tier];

  return (
    <>
      <AccountMobileHeader title="Trust & Verification" />

      <section className="flex-1 min-w-0 space-y-10 text-on-surface font-body">
              {/* ---- Page header ---- */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <span className="text-primary font-mono font-bold tracking-widest text-xs uppercase">
                    Account Integrity
                  </span>
                  <h2 className="font-syne text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-1">
                    Trust &amp; Verification
                  </h2>
                </div>
                {/* Tier badge */}
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full self-start md:self-auto flex-shrink-0 ${tierCfg.classes}`}
                >
                  <tierCfg.IconComponent className="w-5 h-5" />
                  <span className="font-bold text-sm">{tierCfg.label}</span>
                </div>
              </div>

              {/* ---- Progress bento grid ---- */}
              {/*
               * Mobile: 1 column
               * md: 2 columns
               * lg: 3 columns
               */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {DEMO_STEPS.map((step) => (
                  <StepCard key={step.id} step={step} />
                ))}
              </div>

              {/* ---- Two-column detail section ---- */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Identity verification details panel (left, wider col) */}
                <div className="lg:col-span-7">
                  <IdentityDetailsPanel />
                </div>

                {/* Score + benefits (right, narrower col) */}
                <div className="lg:col-span-5 space-y-6">
                  <SecurityScoreCard />
                  <BenefitsCard />
                </div>
              </div>

              {/* ---- Footer context ---- */}
              <footer className="pt-8 border-t border-outline-variant/10 flex flex-col sm:flex-row justify-between gap-4 items-center opacity-60">
                <p className="text-xs font-medium">
                  TradeHut Verification Engine v4.2.1
                </p>
                <div className="flex gap-6">
                  <Link
                    href="/privacy"
                    className="text-xs font-bold hover:text-primary transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/terms"
                    className="text-xs font-bold hover:text-primary transition-colors"
                  >
                    Terms of Trust
                  </Link>
                  <Link
                    href="/contact"
                    className="text-xs font-bold hover:text-primary transition-colors"
                  >
                    Contact Compliance
                  </Link>
                </div>
              </footer>
      </section>
    </>
  );
}
