import Link from "next/link";
import Image from "next/image";
import FaqAccordion from "./FaqAccordion";
import MainLayout from "@/components/Layouts/MainLayout";
import {
  ShieldCheck,
  Shield,
  Lock,
  CreditCard,
  ScanLine,
  Key,
  Network,
  Scale,
  ArrowRight,
  Wallet,
  Cpu,
  BadgeCheck,
  Medal,
  FileCheck,
  AlertTriangle,
  Flag,
  Check,
} from "lucide-react";

export const metadata = {
  title: "Trust & Security | TradeHut",
  description:
    "Discover how TradeHut protects every industrial transaction with escrow infrastructure, AES-256 encryption, rigorous seller verification, and institutional-grade compliance.",
};

// ─── Static data ──────────────────────────────────────────────────────────────

type PillarIconKey =
  | "lock"
  | "payments"
  | "radar"
  | "verified_user"
  | "shield"
  | "gavel";

const PILLAR_ICON_MAP: Record<PillarIconKey, React.ReactNode> = {
  lock: <Lock className="w-5 h-5 text-primary" />,
  payments: <CreditCard className="w-5 h-5 text-primary" />,
  radar: <ScanLine className="w-5 h-5 text-primary" />,
  verified_user: <ShieldCheck className="w-5 h-5 text-primary" />,
  shield: <Shield className="w-5 h-5 text-primary" />,
  gavel: <Scale className="w-5 h-5 text-primary" />,
};

const TRUST_PILLARS = [
  {
    icon: "lock" as PillarIconKey,
    title: "AES-256 Encryption",
    body: "All trade data is encrypted at rest and in transit. Your commercial terms stay private — even from us.",
    stat: "Military-grade",
    statLabel: "encryption standard",
  },
  {
    icon: "payments" as PillarIconKey,
    title: "Secure Payments",
    body: "Milestone-based escrow holds funds until delivery conditions are met. No capital at risk.",
    stat: "$4.2B+",
    statLabel: "assets secured",
  },
  {
    icon: "radar" as PillarIconKey,
    title: "Fraud Prevention",
    body: "Real-time anti-fraud engine monitors every transaction for anomalous behaviour.",
    stat: "0.0%",
    statLabel: "default rate",
  },
  {
    icon: "verified_user" as PillarIconKey,
    title: "Seller Verification",
    body: "14-point KYC/KYB checks including UBO identification and international sanctions screening.",
    stat: "3,000+",
    statLabel: "global inspectors",
  },
  {
    icon: "shield" as PillarIconKey,
    title: "Buyer Protection",
    body: "Every transaction is insured up to $50M through our comprehensive underwriting collective.",
    stat: "$50M",
    statLabel: "per transaction",
  },
  {
    icon: "gavel" as PillarIconKey,
    title: "Compliance",
    body: "SOC 2 Type II, ISO 27001, and GDPR compliant. Independently audited on a continuous basis.",
    stat: "SOC2",
    statLabel: "type II certified",
  },
];

type CertIconKey = "verified" | "military_tech" | "policy" | "credit_card";

const CERT_ICON_MAP: Record<CertIconKey, React.ReactNode> = {
  verified: <BadgeCheck className="w-5 h-5 text-secondary-green" />,
  military_tech: <Medal className="w-5 h-5 text-secondary-green" />,
  policy: <FileCheck className="w-5 h-5 text-secondary-green" />,
  credit_card: <CreditCard className="w-5 h-5 text-secondary-green" />,
};

const CERTIFICATIONS = [
  { label: "SOC 2 Type II", icon: "verified" as CertIconKey },
  { label: "ISO 27001", icon: "military_tech" as CertIconKey },
  { label: "GDPR Compliant", icon: "policy" as CertIconKey },
  { label: "PCI-DSS", icon: "credit_card" as CertIconKey },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrustPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface font-body">
        <main className="pt-24 md:pt-28">

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <section className="max-w-screen-2xl mx-auto px-4 md:px-8 py-12 md:py-20 lg:py-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* Left copy */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold mb-6">
                  <ShieldCheck className="w-4 h-4" />
                  INSTITUTIONAL-GRADE PROTECTION
                </div>

                <h1 className="font-syne text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter text-on-background leading-[0.9] mb-6 md:mb-8">
                  The Architecture of{" "}
                  <span className="text-primary-container">Certainty.</span>
                </h1>

                <p className="text-lg md:text-xl text-on-surface-variant max-w-xl mb-8 md:mb-10 leading-relaxed">
                  In high-stakes industrial trade, trust isn&apos;t a feeling — it&apos;s
                  an engineering requirement. TradeHut provides the structural
                  integrity for million-dollar transactions.
                </p>

                {/* Live stats row */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-3 px-5 py-4 bg-surface-container-lowest shadow-card rounded-xl">
                    <span className="font-mono text-2xl font-bold text-secondary-green">
                      $4.2B+
                    </span>
                    <span className="text-xs uppercase tracking-widest font-bold text-on-surface-variant leading-tight">
                      Assets
                      <br />
                      Secured
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-4 bg-surface-container-lowest shadow-card rounded-xl">
                    <span className="font-mono text-2xl font-bold text-secondary-green">
                      0.0%
                    </span>
                    <span className="text-xs uppercase tracking-widest font-bold text-on-surface-variant leading-tight">
                      Default
                      <br />
                      Rate
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-5 py-4 bg-surface-container-lowest shadow-card rounded-xl">
                    <span className="font-mono text-2xl font-bold text-secondary-green">
                      12K+
                    </span>
                    <span className="text-xs uppercase tracking-widest font-bold text-on-surface-variant leading-tight">
                      Industrial
                      <br />
                      Firms
                    </span>
                  </div>
                </div>
              </div>

              {/* Right image */}
              <div className="relative hidden md:block">
                <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl relative z-10">
                  <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAoLWbJL1TCVZC3teq3sO6PKYbDVcoxwA7F9K4dUW3-TXoS_Wlr4UZpRPO8efETFAsvuUrv2nZRmycCYEvGfUPe5n1RbpdK_z-rT3Qy5Hp3Mfo4JJ08blVMZrkLDmZ8_C5aUewj-GwFdFZjXgQBEQr_cCLWc3pOGe1OxUR5R3brsjfLNZ8lZgitauGcNwM1R_Tv0yap3zAfQmcRpXtUWqBuC7m1rSXdHZEuQrTfgbGoNoLTPyLRUPYWRkdI2Qp6FPCybZZIkcVKvLE"
                    alt="Modern high-tech data center with glowing server racks"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 0px, 50vw"
                    priority
                  />
                </div>
                {/* Decorative shapes */}
                <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-surface-container-highest rounded-3xl -z-10" />
                <div className="absolute -top-10 -right-10 w-32 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
              </div>
            </div>
          </section>

          {/* ── Trust Pillars Grid ────────────────────────────────────────── */}
          <section className="bg-surface-container-low py-16 md:py-20 lg:py-24">
            <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
              {/* Section header */}
              <div className="text-center mb-12 md:mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container text-on-surface-variant rounded-full text-xs font-bold mb-4">
                  <Shield className="w-4 h-4" />
                  PLATFORM PROTECTION
                </div>
                <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight mb-4">
                  Six Layers of Security
                </h2>
                <p className="text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                  Every transaction on TradeHut passes through independently
                  audited, multi-layer protection systems built for
                  industrial-scale commerce.
                </p>
              </div>

              {/* Pillars grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {TRUST_PILLARS.map((pillar, idx) => (
                  <article
                    key={idx}
                    className="bg-surface-container-lowest rounded-2xl p-7 shadow-card hover:shadow-card-hover transition-all duration-300 group"
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center mb-5 group-hover:bg-primary/10 transition-colors">
                      {PILLAR_ICON_MAP[pillar.icon]}
                    </div>

                    <h3 className="font-headline font-bold text-lg mb-2">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed mb-5">
                      {pillar.body}
                    </p>

                    {/* Stat footer */}
                    <div className="pt-4 border-t border-outline-variant/15 flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-tighter text-on-surface-variant">
                        {pillar.statLabel}
                      </span>
                      <span className="text-xs font-mono font-bold text-secondary-green">
                        {pillar.stat}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── Escrow Infrastructure ─────────────────────────────────────── */}
          <section className="py-16 md:py-20 lg:py-24 px-4 md:px-8">
            <div className="max-w-screen-2xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-16 gap-6">
                <div className="max-w-2xl">
                  <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight mb-4">
                    Escrow Infrastructure
                  </h2>
                  <p className="text-lg text-on-surface-variant leading-relaxed">
                    Automated milestone-based payments that protect capital until
                    delivery conditions are met. No manual intervention, no
                    ambiguity.
                  </p>
                </div>
                <div className="font-mono text-secondary-green text-xs bg-secondary-container/30 px-4 py-2 rounded-lg flex-shrink-0">
                  PROTOCOL_VERSION: 3.21.0
                </div>
              </div>

              {/* Three-card grid with centre card offset up on desktop */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {/* Card 1 */}
                <div className="bg-surface-container-lowest p-7 md:p-8 rounded-2xl shadow-card group transition-all hover:shadow-card-hover">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-headline text-xl font-bold mb-3">
                    Tier-1 Custody
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                    Funds are held in segregated, bankruptcy-remote accounts with
                    global banking partners.
                  </p>
                  <div className="pt-5 border-t border-outline-variant/15 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-tighter text-on-surface-variant">
                      Availability
                    </span>
                    <span className="text-xs font-mono font-bold text-secondary-green">
                      99.99%
                    </span>
                  </div>
                </div>

                {/* Card 2 — offset up on md+ */}
                <div className="bg-surface-container-lowest p-7 md:p-8 rounded-2xl shadow-card group transition-all hover:shadow-card-hover md:-translate-y-8">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                    <Cpu className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-headline text-xl font-bold mb-3">
                    Smart Triggers
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                    Funds release automatically upon Bill of Lading verification
                    and IoT-confirmed delivery stamps.
                  </p>
                  <div className="pt-5 border-t border-outline-variant/15 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-tighter text-on-surface-variant">
                      Latency
                    </span>
                    <span className="text-xs font-mono font-bold text-secondary-green">
                      &lt;200ms
                    </span>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="bg-surface-container-lowest p-7 md:p-8 rounded-2xl shadow-card group transition-all hover:shadow-card-hover">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-headline text-xl font-bold mb-3">
                    Loss Protection
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                    Every transaction is insured up to $50M through our
                    comprehensive underwriting collective.
                  </p>
                  <div className="pt-5 border-t border-outline-variant/15 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-tighter text-on-surface-variant">
                      Coverage
                    </span>
                    <span className="text-xs font-mono font-bold text-secondary-green">
                      FULL
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Seller Verification Bento ─────────────────────────────────── */}
          <section className="bg-surface-container-low py-16 md:py-20 lg:py-24 px-4 md:px-8">
            <div className="max-w-screen-2xl mx-auto">
              <div className="text-center mb-12 md:mb-16">
                <h2 className="font-syne text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter mb-4">
                  Rigorous Verification
                </h2>
                <p className="text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
                  We don&apos;t just check IDs. We audit supply chains, financial
                  health, and operational capacity.
                </p>
              </div>

              {/* Bento grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Large feature tile */}
                <div className="md:col-span-2 md:row-span-2 bg-surface-container-highest rounded-2xl p-8 md:p-10 flex flex-col justify-between relative overflow-hidden group min-h-[280px] md:min-h-[360px]">
                  <div className="relative z-10">
                    <span className="text-xs font-bold uppercase tracking-widest text-primary mb-3 block">
                      Primary Protocol
                    </span>
                    <h3 className="font-syne text-2xl md:text-3xl font-bold mb-4">
                      Seller KYC/KYB Elite
                    </h3>
                    <p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">
                      A 14-point background check including UBO identification,
                      sanctions screening, and credit line analysis.
                    </p>
                  </div>
                  <div className="relative z-10 mt-6">
                    <button className="bg-on-background text-surface px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary transition-colors active:scale-95">
                      View Protocol Details
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Decorative fade-in image */}
                  <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCovTb1RO2fQcn4mWPnxbZ7rDYm2H5iqmankN-Z8LGlFSu4k7EJyrt6wrq2glf3bAF4NhvmU53d0DamNhnO_FBUzKLxaD5EISgRx3x_4BfDqhX4SLK1Jj9toRyxuMaF-0gDbNKO-zgu66t_HOGrl1MrM0vz915fauPk7EbUcqvh-ctwHO6fOM-gn9DJjCS6VHfy4HDc99RHL25vnf2VjhTx72s-SmrT-MZ7ZRj3TRHUxo3hILjKXsUBIy88LyLsOTDLFqPZBUBpR2Q"
                    alt="Security biometric fingerprint overlay"
                    width={300}
                    height={300}
                    className="absolute bottom-0 right-0 w-1/2 opacity-20 group-hover:opacity-40 transition-opacity object-cover"
                    aria-hidden="true"
                  />
                </div>

                {/* On-site audits tile */}
                <div className="md:col-span-2 bg-surface-container-lowest rounded-2xl p-7 md:p-8 flex items-center justify-between shadow-card">
                  <div className="max-w-[60%]">
                    <h4 className="font-headline text-xl font-bold mb-2">
                      On-Site Audits
                    </h4>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Global network of 3,000+ inspectors for physical facility
                      verification.
                    </p>
                  </div>
                  <div className="font-syne text-6xl font-black text-on-surface/10 italic select-none">
                    01
                  </div>
                </div>

                {/* Anti-Fraud Engine tile */}
                <div className="md:col-span-1 bg-surface-container-lowest rounded-2xl p-7 md:p-8 shadow-card flex flex-col justify-between border border-outline-variant/10 min-h-[160px]">
                  <h4 className="font-headline text-lg font-bold">
                    Anti-Fraud Engine
                  </h4>
                  <ScanLine className="w-10 h-10 text-secondary-green" />
                </div>

                {/* History Analysis tile */}
                <div className="md:col-span-1 bg-secondary-green text-surface rounded-2xl p-7 md:p-8 shadow-card flex flex-col justify-between min-h-[160px]">
                  <h4 className="font-headline text-lg font-bold">
                    History Analysis
                  </h4>
                  <p className="text-xs opacity-80 leading-relaxed">
                    Previous trade performance tracking and delivery reliability
                    scores.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Data Sovereignty ─────────────────────────────────────────── */}
          <section className="bg-on-background text-surface py-16 md:py-20 lg:py-24 px-4 md:px-8 overflow-hidden relative">
            {/* Dot-grid background */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 2px 2px, #FFF1EC 1px, transparent 0)",
                backgroundSize: "40px 40px",
              }}
            />

            <div className="max-w-screen-2xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-20 items-center">
              {/* Left copy */}
              <div>
                <h2 className="font-syne text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter mb-8">
                  Data Sovereignty
                </h2>

                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-container flex items-center justify-center rounded-xl">
                      <Key className="w-5 h-5 text-surface" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">AES-256 Standard</h4>
                      <p className="text-surface-variant leading-relaxed text-sm">
                        Your proprietary trade data is encrypted at rest and in
                        transit using military-grade AES-256 protocols.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-tertiary flex items-center justify-center rounded-xl">
                      <Network className="w-5 h-5 text-surface" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">
                        Zero-Knowledge Architecture
                      </h4>
                      <p className="text-surface-variant leading-relaxed text-sm">
                        Even we can&apos;t see your sensitive commercial terms. Only the
                        authorised parties hold the decryption keys.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-secondary-green flex items-center justify-center rounded-xl">
                      <Scale className="w-5 h-5 text-surface" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold mb-2">
                        GDPR &amp; SOC2 Type II
                      </h4>
                      <p className="text-surface-variant leading-relaxed text-sm">
                        Fully compliant with international data protection laws and
                        rigorously audited for operational security.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right — terminal mock */}
              <div className="bg-surface-container-low/10 p-4 rounded-2xl backdrop-blur-sm border border-surface/10">
                <div className="bg-on-background rounded-xl p-6 md:p-8 font-mono text-xs md:text-sm leading-relaxed overflow-hidden border border-surface/5">
                  {/* Window chrome dots */}
                  <div className="flex gap-2 mb-4 border-b border-surface/10 pb-4">
                    <div className="w-3 h-3 rounded-full bg-error" />
                    <div className="w-3 h-3 rounded-full bg-bid-amber" />
                    <div className="w-3 h-3 rounded-full bg-bid-green" />
                  </div>

                  <p className="text-primary-fixed-dim">
                    INITIALIZING SECURITY_TUNNEL...
                  </p>
                  <p className="text-surface/60">
                    HANDSHAKE [AES_256_GCM] -&gt; SUCCESS
                  </p>
                  <p className="text-surface/60">
                    ENCRYPTING PAYLOAD_ID: TH-882-991
                  </p>
                  <p className="text-secondary-fixed-dim">
                    Sovereignty Check: VALID
                  </p>
                  <div className="mt-4 p-3 md:p-4 bg-surface/5 rounded border border-surface/10 break-all text-[10px] md:text-xs">
                    0x4A6F686E20446F65202D20536563757265205472616E73616374696F6E20426C6F636B2031303239333834373536
                  </div>
                  <p className="mt-4 text-primary-fixed-dim animate-pulse">
                    _LISTENING FOR PEER_RESPONSE
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── Dispute Resolution ───────────────────────────────────────── */}
          <section className="py-16 md:py-20 lg:py-24 px-4 md:px-8">
            <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row gap-12 lg:gap-20 items-center">
              {/* Image */}
              <div className="w-full md:w-1/2">
                <div className="relative aspect-video rounded-2xl overflow-hidden shadow-card">
                  <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBY9wzAvPlnxmn8_p3HIkeffp7TUgMMCulA146f22tp89YjDiZywF-_cbXSq9D0jJvd8Nj6_S1LF2OY7nM8dSkZrCEgPkNxF95etfx95SAT9Crxmf0AH_rbMDAwSMlr-534Ji9OxlriK1dQXoOE7EhFhSKbdK6ky3ddX5Jx5QmAmTspjapYDdkrc-zZwDb0TiB16q3M5bFo58DjOoVZ36nzZojSfcC-neFPlOMV87T0YU3Wxru_is8wtomh4MjOSw5xPnRYnHFeeQA"
                    alt="Professional arbitration meeting room"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>

              {/* Copy */}
              <div className="w-full md:w-1/2">
                <h2 className="font-syne text-4xl md:text-5xl font-bold tracking-tight mb-6">
                  Dispute Resolution
                </h2>
                <p className="text-lg text-on-surface-variant mb-8 leading-relaxed">
                  Even the best plans can face hurdles. Our dispute resolution
                  policy is designed for speed and fairness, moderated by
                  industry-specific technical experts.
                </p>

                <ul className="space-y-6">
                  {[
                    {
                      title: "48-Hour Response Window",
                      desc: "Every claim is triaged by a human expert within two business days.",
                    },
                    {
                      title: "Technical Arbitration",
                      desc: "Experts from your specific sector (Oil, Steel, AgTech) judge quality disputes.",
                    },
                    {
                      title: "Automated Re-Escrow",
                      desc: "Contested funds are locked in a separate high-security sub-account until resolved.",
                    },
                  ].map((item, idx) => (
                    <li key={idx} className="flex items-start gap-4">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <div>
                        <h5 className="font-bold text-on-surface">{item.title}</h5>
                        <p className="text-sm text-on-surface-variant mt-0.5 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* ── Certifications / Compliance Badges ──────────────────────── */}
          <section className="bg-surface-container-low py-12 md:py-16 px-4 md:px-8">
            <div className="max-w-screen-2xl mx-auto">
              <p className="text-center text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-8">
                Certified &amp; Compliant
              </p>
              <div className="flex flex-wrap justify-center gap-4 md:gap-6">
                {CERTIFICATIONS.map((cert, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-6 py-3 bg-surface-container-lowest rounded-2xl shadow-card border border-outline-variant/15"
                  >
                    {CERT_ICON_MAP[cert.icon]}
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface">
                      {cert.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── FAQ Accordion ────────────────────────────────────────────── */}
          <section className="py-16 md:py-20 lg:py-24 px-4 md:px-8">
            <div className="max-w-screen-2xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left heading */}
                <div className="lg:col-span-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-4">
                    FAQ
                  </span>
                  <h2 className="font-syne text-4xl font-bold tracking-tight mb-4">
                    Common Questions
                  </h2>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Can&apos;t find what you&apos;re looking for?{" "}
                    <Link
                      href="/help"
                      className="text-primary font-medium hover:underline"
                    >
                      Visit the Help Centre
                    </Link>{" "}
                    or{" "}
                    <Link
                      href="/account/reports"
                      className="text-primary font-medium hover:underline"
                    >
                      report a concern
                    </Link>
                    .
                  </p>
                </div>

                {/* Right accordion */}
                <div className="lg:col-span-8">
                  <FaqAccordion />
                </div>
              </div>
            </div>
          </section>

          {/* ── Report Fraud CTA ─────────────────────────────────────────── */}
          <section className="px-4 md:px-8 mb-16 md:mb-24 lg:mb-32">
            <div className="max-w-screen-2xl mx-auto">
              <div className="bg-surface-container-low rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 border border-outline-variant/15">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-error-container flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-on-error-container" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-lg">
                      Spotted something suspicious?
                    </h3>
                    <p className="text-sm text-on-surface-variant mt-0.5">
                      Help keep TradeHut safe. Our team reviews every report
                      within 48 hours.
                    </p>
                  </div>
                </div>
                <Link
                  href="/account/reports"
                  className="flex-shrink-0 inline-flex items-center gap-2 px-7 py-3 bg-error text-on-error font-bold rounded-xl shadow-md hover:bg-on-error-container active:scale-95 transition-all"
                >
                  <Flag className="w-4 h-4" />
                  Report Fraud
                </Link>
              </div>
            </div>
          </section>

          {/* ── Final CTA ────────────────────────────────────────────────── */}
          <section className="max-w-screen-xl mx-auto px-4 md:px-8 mb-16 md:mb-24 lg:mb-32">
            <div className="bg-gradient-to-br from-primary to-primary-container rounded-3xl p-10 md:p-16 lg:p-24 text-center text-on-primary relative overflow-hidden">
              {/* Decorative glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-on-primary/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />

              <div className="relative z-10 max-w-2xl mx-auto">
                <h2 className="font-syne text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter mb-6 md:mb-8">
                  Build on the World&apos;s Most Trusted Layer.
                </h2>
                <p className="text-lg md:text-xl mb-10 md:mb-12 opacity-90">
                  Join 12,000+ industrial firms executing trade with architectural
                  precision.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/auth/register"
                    className="px-8 py-4 bg-surface-container-lowest text-primary font-bold rounded-xl shadow-lg hover:bg-surface-container-low active:scale-95 transition-all"
                  >
                    Open Account
                  </Link>
                  <Link
                    href="/help"
                    className="px-8 py-4 bg-primary text-on-primary border border-on-primary/20 font-bold rounded-xl hover:bg-on-primary/10 active:scale-95 transition-all"
                  >
                    Speak to Security Lead
                  </Link>
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>
    </MainLayout>
  );
}
