import Link from "next/link";
import FaqAccordion from "./FaqAccordion";
import MainLayout from "@/components/Layouts/MainLayout";
import {
  ShieldCheck,
  Wallet,
  Gavel,
  RotateCcw,
  Truck,
  BadgeCheck,
  ArrowRight,
  ShoppingCart,
  Lock,
  ClipboardCheck,
  CreditCard,
  Shield,
} from "lucide-react";

export const metadata = {
  title: "Buyer Protection | TradeHut",
  description:
    "Every transaction on TradeHut is secured by a multi-signature escrow protocol. Trade with absolute certainty.",
};

// ─── Pillar data ──────────────────────────────────────────────────────────────

interface Pillar {
  icon: React.ReactNode;
  iconBg: string;
  iconText: string;
  dotColor: string;
  title: string;
  description: string;
  badges: string[];
}

const PILLARS: Pillar[] = [
  {
    icon: <BadgeCheck className="w-7 h-7" />,
    iconBg: "bg-bid-green/10",
    iconText: "text-bid-green",
    dotColor: "bg-bid-green",
    title: "Authenticity Guarantee",
    description:
      "Our proprietary verification engine cross-references serial numbers, chain history, and physical condition reports before any listing goes live.",
    badges: ["AIS-7 COMPLIANT", "PHYSICAL ASSET TRACKING"],
  },
  {
    icon: <Wallet className="w-7 h-7" />,
    iconBg: "bg-request/10",
    iconText: "text-request",
    dotColor: "bg-request",
    title: "Secure Payments",
    description:
      "Your capital is held in a bankruptcy-remote, insured escrow account. We support major fiat currencies with instant settlement.",
    badges: ["256-BIT ENCRYPTION", "SOC2 TYPE II CERTIFIED"],
  },
  {
    icon: <Gavel className="w-7 h-7" />,
    iconBg: "bg-primary/10",
    iconText: "text-primary",
    dotColor: "bg-primary",
    title: "Dispute Resolution",
    description:
      "If an asset doesn't match the description, our institutional-grade arbitration panel intervenes within 24 hours to ensure a fair resolution.",
    badges: ["24H RESPONSE TIME", "FULL REFUND PROTECTION"],
  },
  {
    icon: <RotateCcw className="w-7 h-7" />,
    iconBg: "bg-error/10",
    iconText: "text-error",
    dotColor: "bg-error",
    title: "Money-Back Guarantee",
    description:
      "Not satisfied? We offer a no-questions-asked refund within the inspection window. Buyer protection starts the moment funds enter escrow.",
    badges: ["5-DAY INSPECTION WINDOW", "ZERO BUYER RISK"],
  },
  {
    icon: <Truck className="w-7 h-7" />,
    iconBg: "bg-tertiary/10",
    iconText: "text-tertiary",
    dotColor: "bg-tertiary",
    title: "Item-Not-Received Protection",
    description:
      "If your item never arrives, TradeHut initiates an immediate investigation and holds all seller funds until the matter is resolved in full.",
    badges: ["REAL-TIME TRACKING", "CARRIER INTEGRATION"],
  },
  {
    icon: <BadgeCheck className="w-7 h-7" />,
    iconBg: "bg-secondary-container/40",
    iconText: "text-on-secondary-container",
    dotColor: "bg-on-secondary-container",
    title: "Verified Sellers",
    description:
      "Every seller on TradeHut undergoes identity verification and compliance checks. Only approved accounts can list high-value assets.",
    badges: ["ID VERIFIED", "COMPLIANCE SCREENED"],
  },
];

// ─── How-it-works steps ───────────────────────────────────────────────────────

interface Step {
  stage: string;
  icon: React.ReactNode;
  iconBg: string;
  iconText: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    stage: "01",
    icon: <ShoppingCart className="w-10 h-10" />,
    iconBg: "bg-surface-container-highest",
    iconText: "text-primary",
    title: "Commit Order",
    description: "Buyer commits funds to the secure escrow vault.",
  },
  {
    stage: "02",
    icon: <Lock className="w-10 h-10" />,
    iconBg: "bg-surface-container-highest",
    iconText: "text-primary",
    title: "Escrow Lock",
    description: "Funds are cryptographically locked until verification.",
  },
  {
    stage: "03",
    icon: <ClipboardCheck className="w-10 h-10" />,
    iconBg: "bg-surface-container-highest",
    iconText: "text-primary",
    title: "Buyer Verify",
    description: "Buyer receives asset and confirms technical specs.",
  },
  {
    stage: "04",
    icon: <CreditCard className="w-10 h-10" />,
    iconBg: "bg-bid-green",
    iconText: "text-white",
    title: "Payout Release",
    description: "Seller receives payment upon final confirmation.",
  },
];

// ─── Trust-signal partners ────────────────────────────────────────────────────

const TRUST_SIGNALS = [
  { icon: <Shield className="text-primary w-5 h-5" />, label: "SECURE PAY" },
  { icon: <ShieldCheck className="text-primary w-5 h-5" />, label: "LLOYDS INSURED" },
  { icon: <Gavel className="text-primary w-5 h-5" />, label: "GLOBAL ARBITRATION" },
  { icon: <Shield className="text-primary w-5 h-5" />, label: "PROTOCOL SAFE" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BuyerProtectionPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface font-body">
        <main className="pt-20 md:pt-24">
          {/* ── Hero ── */}
          <section className="relative overflow-hidden px-4 md:px-8 py-16 md:py-24 lg:py-32 bg-surface">
            {/* Decorative blobs */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 md:w-96 md:h-96 bg-primary/5 blur-3xl rounded-full" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 md:w-96 md:h-96 bg-tertiary/5 blur-3xl rounded-full" />

            <div className="relative z-10 max-w-screen-2xl mx-auto">
              <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                {/* Eyebrow badge */}
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-mono text-xs mb-8 tracking-wider uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  Institutional Escrow Active
                </div>

                <h1 className="font-syne text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-on-surface mb-6 md:mb-8 leading-[1.1]">
                  Trade with Absolute{" "}
                  <br className="hidden sm:block" />
                  <span className="text-primary-container">
                    Mathematical Certainty.
                  </span>
                </h1>

                <p className="text-base md:text-xl text-on-surface-variant max-w-2xl mb-10 md:mb-12 leading-relaxed">
                  Every transaction on TradeHut is secured by a multi-signature
                  escrow protocol. Funds are only released when you verify the
                  asset meets the exact technical specifications.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                  <Link
                    href="/account/disputes"
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 primary-gradient text-white rounded-lg font-syne font-bold hover:shadow-lg active:scale-95 transition-all duration-200 min-h-[52px]"
                  >
                    Start Secure Trading
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="/help"
                    className="inline-flex items-center justify-center px-8 py-4 rounded-lg font-syne font-bold text-on-surface hover:bg-surface-container-low transition-all duration-200 border border-outline-variant/25 min-h-[52px]"
                  >
                    View Security Specs
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ── Protection Pillars ── */}
          <section className="px-4 md:px-8 py-16 md:py-24 bg-surface-container-low">
            <div className="max-w-screen-2xl mx-auto">
              {/* Section header */}
              <div className="text-center mb-12 md:mb-16">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                  Why TradeHut
                </p>
                <h2 className="font-syne text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-on-surface">
                  Six Layers of Protection
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {PILLARS.map((pillar) => (
                  <div
                    key={pillar.title}
                    className="bg-surface-container-lowest p-8 rounded-2xl shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300"
                  >
                    <div
                      className={`w-14 h-14 ${pillar.iconBg} ${pillar.iconText} flex items-center justify-center rounded-xl mb-6`}
                    >
                      {pillar.icon}
                    </div>

                    <h3 className="font-syne text-xl md:text-2xl font-bold mb-4 text-on-surface">
                      {pillar.title}
                    </h3>

                    <p className="text-on-surface-variant leading-relaxed mb-6 text-sm md:text-base">
                      {pillar.description}
                    </p>

                    <ul className="space-y-3">
                      {pillar.badges.map((badge) => (
                        <li
                          key={badge}
                          className="flex items-center gap-2 font-mono text-xs text-on-surface-variant"
                        >
                          <span
                            className={`w-1.5 h-1.5 ${pillar.dotColor} rounded-full flex-shrink-0`}
                          />
                          {badge}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── How It Works ── */}
          <section className="px-4 md:px-8 py-16 md:py-24 bg-surface relative">
            <div className="max-w-screen-2xl mx-auto">
              <div className="text-center mb-12 md:mb-20">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                  The Process
                </p>
                <h2 className="font-syne text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-on-surface mb-4">
                  The Escrow Lifecycle
                </h2>
                <p className="text-on-surface-variant text-sm md:text-base">
                  Four stages of institutional-grade security.
                </p>
              </div>

              {/* Steps grid with connector line on desktop */}
              <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12">
                {/* Connector line — desktop only */}
                <div className="hidden lg:block absolute top-12 left-0 w-full h-[2px] bg-outline-variant/20 -z-0 pointer-events-none" />

                {STEPS.map((step, idx) => (
                  <div
                    key={step.stage}
                    className="relative z-10 flex flex-col items-center text-center"
                  >
                    <div
                      className={`w-24 h-24 rounded-full ${step.iconBg} ${step.iconText} border-4 border-surface flex items-center justify-center mb-6 shadow-md`}
                    >
                      {step.icon}
                    </div>

                    <span
                      className={`font-mono text-xs mb-2 font-bold uppercase tracking-wider ${
                        idx === 3 ? "text-bid-green" : "text-primary"
                      }`}
                    >
                      STAGE {step.stage}
                    </span>

                    <h4 className="font-syne font-bold text-lg mb-2 text-on-surface">
                      {step.title}
                    </h4>

                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Trust Signals ── */}
          <section className="px-4 md:px-8 py-12 md:py-16 bg-surface-container-low/50">
            <div className="max-w-screen-2xl mx-auto">
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-8 md:mb-12">
                Trusted Partners &amp; Certifications
              </p>
              <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 lg:gap-24 opacity-60 hover:opacity-100 grayscale hover:grayscale-0 transition-all duration-500">
                {TRUST_SIGNALS.map((signal) => (
                  <div
                    key={signal.label}
                    className="flex items-center gap-2 font-syne font-extrabold text-lg md:text-2xl text-on-surface"
                  >
                    {signal.icon}
                    {signal.label}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="px-4 md:px-8 py-16 md:py-24 bg-surface">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-10 md:mb-12">
                <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                  Coverage Details
                </p>
                <h2 className="font-syne text-3xl md:text-4xl font-bold tracking-tight text-on-surface">
                  Frequently Asked Questions
                </h2>
              </div>

              {/* Client-side accordion */}
              <FaqAccordion />
            </div>
          </section>

          {/* ── Claim CTA ── */}
          <section className="px-4 md:px-8 py-16 md:py-24">
            <div className="max-w-screen-2xl mx-auto">
              <div className="relative bg-inverse-surface text-inverse-on-surface p-10 md:p-16 lg:p-20 rounded-3xl overflow-hidden">
                {/* Decorative gradient overlay on right half */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 right-0 h-full w-full lg:w-1/3 bg-gradient-to-l from-primary/20 to-transparent" />
                </div>

                <div className="relative z-10 max-w-2xl">
                  <h2 className="font-syne text-3xl md:text-4xl lg:text-5xl font-bold mb-6 md:mb-8 leading-tight">
                    Ready for a higher standard of trading?
                  </h2>
                  <p className="text-base md:text-xl opacity-80 mb-8 md:mb-10 leading-relaxed">
                    Join 5,000+ buyers who rely on TradeHut for high-value asset
                    acquisition. Every purchase is backed by our full protection
                    guarantee.
                  </p>

                  <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                    <Link
                      href="/auth/register"
                      className="inline-flex items-center justify-center px-8 py-4 primary-gradient text-white rounded-lg font-syne font-bold hover:shadow-lg active:scale-95 transition-all duration-200 min-h-[52px]"
                    >
                      Open Secure Account
                    </Link>
                    <Link
                      href="/account/disputes"
                      className="inline-flex items-center justify-center px-8 py-4 rounded-lg font-syne font-bold border border-inverse-on-surface/30 text-inverse-on-surface hover:bg-inverse-on-surface/10 active:scale-95 transition-all duration-200 min-h-[52px]"
                    >
                      File a Claim
                    </Link>
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
