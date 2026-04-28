import type { Metadata } from 'next';
import Link from 'next/link';
import MainLayout from '@/components/Layouts/MainLayout';
import {
  Info,
  Cookie,
  BarChart2,
  Settings,
  Lock,
  Palette,
  Target,
  Gavel,
  Globe,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Cookie Policy | TradeHut',
  description:
    'TradeHut Cookie Policy — how we use cookies and similar tracking technologies to power your marketplace experience.',
};

const tocItems = [
  { href: '#introduction',     Icon: Info,     label: 'Introduction' },
  { href: '#what-are-cookies', Icon: Cookie,   label: 'What Are Cookies' },
  { href: '#usage',            Icon: BarChart2, label: 'Our Usage' },
  { href: '#choices',          Icon: Settings, label: 'Your Choices' },
];

// Each cookie category uses a Lucide icon component
const cookieCategories = [
  {
    Icon: Lock,
    iconFill: true,
    title: 'Essential',
    description: 'Strictly necessary for site security and core trading functions.',
    token: 'TH_SESSION_ID | 24h',
  },
  {
    Icon: BarChart2,
    iconFill: false,
    title: 'Analytics',
    description: 'Helps us understand how users interact with the platform layout.',
    token: 'TH_ANALYTICS_V2 | 30d',
  },
  {
    Icon: Palette,
    iconFill: false,
    title: 'Functional',
    description: 'Remembers your preferences for display mode or list-view layouts.',
    token: 'TH_UI_PREF | 365d',
  },
  {
    Icon: Target,
    iconFill: false,
    title: 'Targeting',
    description: 'Used to suggest items that align with your historical bid patterns.',
    token: 'TH_ADS_INTENT | Session',
  },
];

export default function CookiePolicyPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface">
        <main className="max-w-4xl mx-auto pt-24 px-4 md:px-6 pb-8 md:pb-12 flex flex-col lg:flex-row gap-8 lg:gap-16 lg:max-w-screen-xl">

          {/* ── Sticky TOC sidebar (lg+) ── */}
          <aside className="hidden lg:flex flex-col lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar w-72 p-6 gap-2 bg-surface-container-low rounded-xl shadow-card shrink-0">
            <div className="mb-6 px-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">
                Legal Center
              </p>
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
              <span className="inline-block font-mono text-primary text-sm uppercase tracking-widest mb-4">
                Last Updated: Oct 24, 2023
              </span>

              <h1 className="font-syne text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface mb-6 leading-[0.95]">
                Cookie Policy
              </h1>

              <p className="text-base md:text-xl font-body text-on-surface-variant leading-relaxed max-w-2xl">
                At TradeHut, we believe in radical transparency. Our marketplace
                experience is designed to be as seamless and high-fidelity as
                possible. This policy explains how we use cookies to ensure that
                performance.
              </p>
            </section>

            {/* 1. Introduction */}
            <section className="scroll-mt-28" id="introduction">
              <div className="mb-4 flex items-center gap-4">
                <span className="h-[2px] w-10 bg-primary-container shrink-0" aria-hidden />
                <h2 className="font-syne text-xl md:text-2xl font-bold uppercase tracking-widest text-primary-container">
                  Introduction
                </h2>
              </div>
              <div className="p-6 md:p-8 bg-surface-container-low rounded-xl">
                <p className="font-body text-base md:text-lg text-on-surface leading-relaxed">
                  To deliver the TradeHut experience — a platform that bridges
                  the gap between high-frequency trading and editorial curation —
                  we utilise various tracking technologies. These tools are
                  essential for maintaining the precision of our interface and
                  the security of your high-value transactions.
                </p>
              </div>
            </section>

            {/* 2. What Are Cookies */}
            <section className="scroll-mt-28" id="what-are-cookies">
              <div className="mb-4 flex items-center gap-4">
                <span className="h-[2px] w-10 bg-primary-container shrink-0" aria-hidden />
                <h2 className="font-syne text-xl md:text-2xl font-bold uppercase tracking-widest text-primary-container">
                  What Are Cookies?
                </h2>
              </div>
              <div className="p-6 md:p-8 rounded-xl bg-surface-container-lowest shadow-card border border-outline-variant/15">
                <p className="font-body text-base md:text-lg text-on-surface-variant leading-relaxed">
                  Cookies are small text files stored on your device that allow
                  us to &ldquo;remember&rdquo; you. In the context of TradeHut,
                  they function as the session foundation for your data. Think of
                  them as the metadata that allows our platform to render
                  real-time bids without latency —&nbsp;
                  <span className="font-mono text-primary">
                    session state
                  </span>
                  &nbsp;stored client-side so each page transition is instant.
                </p>
              </div>
            </section>

            {/* 3. Our Usage */}
            <section className="scroll-mt-28" id="usage">
              <div className="mb-6 flex items-center gap-4">
                <span className="h-[2px] w-10 bg-primary-container shrink-0" aria-hidden />
                <h2 className="font-syne text-xl md:text-2xl font-bold uppercase tracking-widest text-primary-container">
                  Our Usage
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cookieCategories.map(({ Icon, iconFill, title, description, token }) => (
                  <div
                    key={title}
                    className="p-6 bg-surface-container-lowest rounded-xl shadow-card border border-outline-variant/15"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Icon
                        className="w-5 h-5 text-primary"
                        {...(iconFill ? { fill: 'currentColor' } : {})}
                      />
                      <h3 className="font-syne text-lg font-bold text-on-surface">
                        {title}
                      </h3>
                    </div>
                    <p className="font-body text-on-surface-variant text-sm mb-4 leading-relaxed">
                      {description}
                    </p>
                    <div className="font-mono text-[11px] bg-surface-container-high px-3 py-2 rounded text-on-surface-variant">
                      {token}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Your Choices */}
            <section className="scroll-mt-28" id="choices">
              <div className="mb-6 flex items-center gap-4">
                <span className="h-[2px] w-10 bg-primary-container shrink-0" aria-hidden />
                <h2 className="font-syne text-xl md:text-2xl font-bold uppercase tracking-widest text-primary-container">
                  Your Choices
                </h2>
              </div>

              <div className="space-y-6 font-body text-base md:text-lg text-on-surface-variant leading-relaxed">
                <p>
                  We respect your autonomy. You can manage your cookie
                  preferences at any time through your browser settings or via
                  our centralised{' '}
                  <Link
                    href="/legal/privacy"
                    className="text-primary font-bold underline decoration-primary-fixed underline-offset-2 hover:text-primary-container transition-colors"
                  >
                    Privacy Control Panel
                  </Link>
                  .
                </p>

                {/* Info callout */}
                <div className="flex items-start gap-4 p-5 md:p-6 bg-surface-container-high rounded-lg border border-outline-variant/15">
                  <Info className="w-5 h-5 text-tertiary mt-0.5 shrink-0" />
                  <p className="text-sm text-on-surface-variant">
                    Disabling &ldquo;Essential&rdquo; cookies will prevent you
                    from placing bids or accessing your TradeHut account, as
                    session integrity cannot be maintained.
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-2">
                  <button className="bg-primary text-on-primary px-8 py-3 rounded-md font-bold shadow-sm hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4" />
                    Manage Preferences
                  </button>
                  <button className="bg-surface-container-lowest border border-outline-variant text-on-surface px-8 py-3 rounded-md font-bold hover:bg-surface-container-low active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Cookie className="w-4 h-4" />
                    Clear Local Data
                  </button>
                </div>
              </div>
            </section>

            {/* Visual accent block */}
            <div className="relative h-52 md:h-64 overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-surface-container" aria-hidden />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-transparent flex items-center p-8 md:p-12">
                <h3 className="text-on-primary font-syne text-2xl md:text-3xl font-bold max-w-xs">
                  Transparency built into every session.
                </h3>
              </div>
              {/* Decorative icon */}
              <div
                className="absolute -right-8 -bottom-8 opacity-10 select-none pointer-events-none"
                aria-hidden
              >
                <Cookie className="w-40 h-40" />
              </div>
            </div>

            {/* CTA footer */}
            <footer className="mt-16 md:mt-20 pt-10 md:pt-12 border-t border-outline-variant/20 flex flex-col items-center text-center">
              <h3 className="font-syne text-xl md:text-2xl font-bold mb-4 text-on-surface">
                Questions about our cookie practices?
              </h3>
              <p className="text-on-surface-variant mb-8 max-w-md text-sm md:text-base font-body">
                Our legal team is here to help you understand how TradeHut
                handles your data and session information.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-primary text-on-primary px-8 py-3 rounded-md font-bold hover:shadow-lg active:scale-95 transition-all">
                  Contact Legal
                </button>
                <button className="bg-transparent border border-outline px-8 py-3 rounded-md font-bold hover:bg-surface-container-low active:scale-95 transition-all">
                  Download PDF
                </button>
              </div>
            </footer>

            {/* Cross-links to the other two legal docs */}
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
                  href="/legal/privacy"
                  className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary-container underline underline-offset-4 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Privacy Policy
                </Link>
              </div>
            </div>
          </article>
        </main>

        {/* ── Page-level footer ── */}
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
                { href: '/legal/privacy', label: 'Privacy Policy' },
                { href: '/legal/terms',   label: 'Terms of Service' },
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
