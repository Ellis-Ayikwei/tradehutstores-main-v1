import type { Metadata } from 'next';
import Link from 'next/link';
import MainLayout from '@/components/Layouts/MainLayout';
import {
  Info,
  Database,
  Settings,
  ShieldCheck,
  Shield,
  Mail,
  Clock,
  CheckCircle,
  Gavel,
  Cookie,
  Lock,
  Globe,
  Headphones,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | TradeHut',
  description:
    'TradeHut Privacy Policy — how we collect, use, and protect your personal information.',
};

const tocItems = [
  { href: '#intro',      Icon: Info,        label: 'Introduction' },
  { href: '#collection', Icon: Database,    label: 'Information We Collect' },
  { href: '#usage',      Icon: Settings,    label: 'How We Use Data' },
  { href: '#rights',     Icon: ShieldCheck, label: 'Your Privacy Rights' },
  { href: '#security',   Icon: Shield,      label: 'Security Measures' },
  { href: '#contact',    Icon: Mail,        label: 'Contact Information' },
];

export default function PrivacyPolicyPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface">
        <main className="max-w-4xl mx-auto pt-24 px-4 md:px-6 pb-8 md:pb-12 flex flex-col lg:flex-row gap-8 lg:gap-16 lg:max-w-screen-xl">

          {/* ── Sticky TOC sidebar (lg+) ── */}
          <aside className="hidden lg:flex flex-col lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar w-72 p-6 gap-2 bg-surface-container-low rounded-xl shadow-card shrink-0">
            <div className="mb-6 px-2">
              <h3 className="font-syne font-bold text-on-surface text-lg">
                Table of Contents
              </h3>
              <p className="text-xs text-on-surface-variant/60 font-body mt-1">
                Last updated Oct 2023
              </p>
            </div>

            <nav className="flex flex-col gap-1">
              {tocItems.map((item, idx) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={[
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm uppercase tracking-wide font-medium transition-all duration-200 hover:translate-x-1',
                    idx === 0
                      ? 'bg-surface-container-lowest text-primary-container font-bold shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary-container',
                  ].join(' ')}
                >
                  <item.Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* ── Prose content ── */}
          <article className="flex-1 max-w-3xl space-y-14 md:space-y-16">

            {/* Header */}
            <section>
              <div className="inline-block px-3 py-1 bg-surface-container-highest rounded-full text-xs font-mono mb-4 text-primary-container">
                DOCUMENT ID: P3-26
              </div>

              <h1 className="font-syne text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.05] mb-6">
                Privacy Policy
              </h1>

              <p className="text-base md:text-xl font-body text-on-surface-variant leading-relaxed max-w-2xl">
                Transparency is the foundation of the TradeHut ecosystem. This
                policy outlines how we handle your information with care and
                honesty.
              </p>

              <div className="mt-6 flex items-center gap-2 text-xs font-mono text-on-surface-variant/60">
                <Clock className="w-4 h-4" />
                LAST MODIFIED: 2023-10-24
              </div>
            </section>

            {/* 1. Introduction */}
            <section className="scroll-mt-28" id="intro">
              <div className="mb-4 flex items-center gap-4">
                <span className="h-[2px] w-10 bg-primary-container shrink-0" aria-hidden />
                <h2 className="font-syne text-xl md:text-2xl font-bold uppercase tracking-widest text-primary-container">
                  Introduction
                </h2>
              </div>
              <div className="space-y-5 font-body text-base md:text-lg leading-relaxed text-on-surface">
                <p>
                  At TradeHut we believe privacy is a fundamental right, not a
                  checkbox. Our platform is designed to facilitate trading and
                  marketplace experiences while maintaining total data integrity.
                </p>
                <p>
                  This Privacy Policy describes how TradeHut collects, uses, and
                  shares personal information of users of our website and
                  services. By using our platform, you consent to the data
                  practices described in this statement.
                </p>
              </div>
            </section>

            {/* 2. Information We Collect */}
            <section
              className="scroll-mt-28 p-6 md:p-8 bg-surface-container-low rounded-2xl"
              id="collection"
            >
              <div className="mb-6 md:mb-8 flex items-center gap-4">
                <span className="h-[2px] w-10 bg-primary-container shrink-0" aria-hidden />
                <h2 className="font-syne text-xl md:text-2xl font-bold uppercase tracking-widest text-primary-container">
                  Information We Collect
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {[
                  {
                    title: 'Personal Identifiers',
                    body: 'Full name, business address, professional email, and encrypted financial credentials for transaction processing.',
                  },
                  {
                    title: 'Behavioural Data',
                    body: 'Interaction patterns within our marketplace interface, including browsing behaviour, bidding speed, and viewing duration.',
                  },
                ].map(({ title, body }) => (
                  <div
                    key={title}
                    className="bg-surface-container-lowest p-5 md:p-6 rounded-xl shadow-card"
                  >
                    <h4 className="font-syne font-bold mb-3 text-base md:text-lg text-on-surface">
                      {title}
                    </h4>
                    <p className="text-sm font-body text-on-surface-variant">
                      {body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="bg-surface-container-lowest/50 backdrop-blur-sm p-5 md:p-6 rounded-xl">
                <h3 className="text-xs font-mono uppercase tracking-tighter text-on-surface-variant/70 mb-4">
                  Technical Specification
                </h3>
                <ul className="space-y-4 font-body text-on-surface-variant">
                  {[
                    'Standard metadata: IP address, browser type, and domain names.',
                    'Log files: All high-value transactions are logged with timestamp precision.',
                  ].map((item) => (
                    <li key={item} className="flex gap-4 text-sm md:text-base">
                      <CheckCircle className="w-5 h-5 text-primary-container shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 3. How We Use Data */}
            <section className="scroll-mt-28" id="usage">
              <div className="mb-4 flex items-center gap-4">
                <span className="h-[2px] w-10 bg-primary-container shrink-0" aria-hidden />
                <h2 className="font-syne text-xl md:text-2xl font-bold uppercase tracking-widest text-primary-container">
                  How We Use Data
                </h2>
              </div>
              <div className="font-body text-base md:text-lg leading-relaxed space-y-6">
                <p>
                  Your data helps power the TradeHut marketplace engine. We
                  process information to:
                </p>
                <ul className="space-y-6">
                  {[
                    {
                      num: '01',
                      title: 'Execute Transactions',
                      body: 'Facilitating the auction process, RFQ requests, and asset transfers between validated entities.',
                    },
                    {
                      num: '02',
                      title: 'Interface Optimisation',
                      body: 'Adjusting the UI based on user accessibility needs and interaction density.',
                    },
                  ].map(({ num, title, body }) => (
                    <li key={num} className="flex items-start gap-5 md:gap-6">
                      <div className="bg-surface-variant w-11 h-11 md:w-12 md:h-12 shrink-0 flex items-center justify-center rounded-lg">
                        <span className="font-mono text-lg md:text-xl font-bold text-on-surface">
                          {num}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-syne font-bold text-base md:text-lg mb-1 text-on-surface">
                          {title}
                        </h4>
                        <p className="text-on-surface-variant text-sm md:text-base">
                          {body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Visual break */}
            <div className="relative h-56 md:h-64 overflow-hidden rounded-2xl group">
              <div className="absolute inset-0 bg-surface-container" aria-hidden />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-transparent flex items-center p-8 md:p-12">
                <h3 className="text-on-primary font-syne text-2xl md:text-3xl font-bold max-w-xs">
                  Engineered for absolute trust.
                </h3>
              </div>
            </div>

            {/* 4. Your Privacy Rights */}
            <section className="scroll-mt-28" id="rights">
              <div className="mb-4 flex items-center gap-4">
                <span className="h-[2px] w-10 bg-primary-container shrink-0" aria-hidden />
                <h2 className="font-syne text-xl md:text-2xl font-bold uppercase tracking-widest text-primary-container">
                  Your Privacy Rights
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Right to Access',
                    body: 'Request a full export of all personal data held within our systems, including log fragments.',
                  },
                  {
                    title: 'Right to Erasure',
                    body: 'The &ldquo;Right to be Forgotten&rdquo; applies to all non-transactional metadata after account closure.',
                  },
                ].map(({ title, body }) => (
                  <div
                    key={title}
                    className="border-l-4 border-primary-container pl-5 md:pl-6 py-4"
                  >
                    <h4 className="font-syne font-bold text-base md:text-lg mb-2 text-on-surface">
                      {title}
                    </h4>
                    <p
                      className="text-sm font-body text-on-surface-variant"
                      dangerouslySetInnerHTML={{ __html: body }}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* 5. Security Measures */}
            <section
              className="scroll-mt-28 p-6 md:p-8 border-2 border-primary/10 rounded-2xl bg-surface-container-lowest"
              id="security"
            >
              <div className="mb-6 md:mb-8 flex items-center gap-4">
                <span className="h-[2px] w-10 bg-primary-container shrink-0" aria-hidden />
                <h2 className="font-syne text-xl md:text-2xl font-bold uppercase tracking-widest text-primary-container">
                  Security Measures
                </h2>
              </div>
              <p className="font-body text-base md:text-lg mb-8 text-on-surface-variant">
                We secure your personal information from unauthorised access, use,
                or disclosure. TradeHut secures the personally identifiable
                information you provide on computer servers in a controlled,
                secure environment.
              </p>
              <div className="grid grid-cols-1 gap-3 font-mono text-sm">
                {[
                  { label: 'ENCRYPTION TYPE', value: 'AES-256-GCM' },
                  { label: 'SESSION TIMEOUT', value: '15 MINUTES' },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex justify-between items-center p-4 bg-surface-container-low rounded-lg"
                  >
                    <span className="text-on-surface-variant">{label}</span>
                    <span className="text-primary-container font-bold">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. Contact Information */}
            <section className="scroll-mt-28 pb-8 md:pb-12" id="contact">
              <div className="mb-4 flex items-center gap-4">
                <span className="h-[2px] w-10 bg-primary-container shrink-0" aria-hidden />
                <h2 className="font-syne text-xl md:text-2xl font-bold uppercase tracking-widest text-primary-container">
                  Contact Information
                </h2>
              </div>
              <div className="bg-surface-container-low p-6 md:p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <p className="font-body text-base md:text-lg text-on-surface">
                    Questions about this Privacy Policy?
                  </p>
                  <p className="text-on-surface-variant text-sm mt-1">
                    Our legal team responds within 24 business hours.
                  </p>
                </div>
                <button className="shrink-0 bg-tertiary text-on-tertiary px-6 md:px-8 py-3 rounded-md font-bold hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
                  <Headphones className="w-4 h-4" />
                  Open Privacy Ticket
                </button>
              </div>
            </section>

            {/* Download CTA */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button className="bg-primary text-on-primary px-8 py-3 rounded-md font-bold hover:shadow-lg active:scale-95 transition-all">
                Contact Legal
              </button>
              <button className="bg-transparent border border-outline px-8 py-3 rounded-md font-bold hover:bg-surface-container-low active:scale-95 transition-all">
                Download PDF
              </button>
            </div>

            {/* Cross-links */}
            <div className="pt-8 border-t border-outline-variant/15">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant/60 font-bold mb-4">
                Related Legal Documents
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/legal/terms"
                  className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary-container underline underline-offset-4 transition-colors"
                >
                  <Gavel className="w-4 h-4" />
                  Terms of Service
                </Link>
                <Link
                  href="/legal/cookies"
                  className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary-container underline underline-offset-4 transition-colors"
                >
                  <Cookie className="w-4 h-4" />
                  Cookie Policy
                </Link>
              </div>
            </div>
          </article>
        </main>

        {/* ── Page footer ── */}
        <footer className="w-full py-10 md:py-12 px-4 md:px-8 bg-surface-container-low">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 md:gap-8 max-w-screen-2xl mx-auto">
            <div className="flex flex-col items-center md:items-start gap-1">
              <div className="font-syne text-lg font-bold text-primary-container">
                TradeHut
              </div>
              <p className="font-body text-xs text-on-surface-variant">
                &copy; {new Date().getFullYear()} TradeHut Ltd. All rights reserved.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6">
              {[
                { href: '/legal/privacy', label: 'Privacy Center' },
                { href: '/legal/terms',   label: 'Global Terms' },
                { href: '/legal/cookies', label: 'Cookie Policy' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="font-body text-xs text-on-surface-variant/70 hover:text-on-surface transition-colors"
                >
                  {label}
                </Link>
              ))}
            </div>
            <div className="flex gap-4">
              <Lock className="w-5 h-5 text-on-surface-variant cursor-pointer hover:text-primary-container transition-colors" />
              <Globe className="w-5 h-5 text-on-surface-variant cursor-pointer hover:text-primary-container transition-colors" />
            </div>
          </div>
        </footer>
      </div>
    </MainLayout>
  );
}
