import type { Metadata } from 'next';
import Link from 'next/link';
import MainLayout from '@/components/Layouts/MainLayout';
import { Info, Gavel, Lock, FileText, Cookie } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | TradeHut',
  description:
    'Read the TradeHut Terms of Service. By using our platform you agree to these terms and all terms incorporated by reference.',
};

const tocItems = [
  { href: '#introduction',          Icon: Info,     label: 'Introduction' },
  { href: '#user-conduct',          Icon: Gavel,    label: 'User Conduct' },
  { href: '#account-security',      Icon: Lock,     label: 'Account Security' },
  { href: '#intellectual-property', Icon: FileText, label: 'Intellectual Property' },
  { href: '#liability',             Icon: FileText, label: 'Liability' },
];

export default function TermsOfServicePage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface">
        {/* ── Page body ── */}
        <main className="pt-24 pb-8 md:pb-12 px-4 md:px-6 max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-[256px_1fr] gap-8 lg:gap-16 lg:max-w-screen-xl">

          {/* ── Sticky TOC sidebar (lg+) ── */}
          <aside className="hidden lg:block">
            <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar">
              <div className="mb-8">
                <h3 className="font-syne font-bold text-on-surface text-lg">
                  Table of Contents
                </h3>
                <p className="text-on-surface-variant/60 text-xs mt-1">
                  Last updated Oct 2023
                </p>
              </div>

              <nav className="flex flex-col gap-y-1 py-2">
                {tocItems.map((item, idx) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className={[
                      'flex items-center gap-3 py-2 pl-4 border-l-4 rounded-r-lg transition-all duration-200 text-sm font-medium',
                      idx === 0
                        ? 'text-primary-container border-primary-container font-bold'
                        : 'text-on-surface/50 border-transparent hover:bg-surface-container-low hover:text-on-surface group',
                    ].join(' ')}
                  >
                    <item.Icon
                      className={[
                        'w-4 h-4',
                        idx !== 0 && 'group-hover:text-primary-container',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    />
                    <span>{item.label}</span>
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* ── Main article ── */}
          <article className="max-w-3xl mx-auto w-full">

            {/* Header */}
            <header className="mb-12 md:mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary text-xs font-mono mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                VERSION P3-26
              </div>

              <h1 className="font-syne text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface mb-6 leading-[0.95]">
                Terms of Service
              </h1>

              <p className="text-base md:text-lg text-on-surface-variant leading-relaxed font-body">
                Please read these terms carefully before using TradeHut. By
                accessing or using our platform, you agree to be bound by these
                terms and all terms incorporated by reference.
              </p>
            </header>

            {/* Prose sections */}
            <div className="space-y-16 md:space-y-20 font-body text-on-surface-variant leading-relaxed">

              {/* 1. Introduction */}
              <section className="scroll-mt-28" id="introduction">
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface mb-6 tracking-tight font-syne">
                  1. Introduction
                </h2>
                <div className="p-6 md:p-8 bg-surface-container-low rounded-xl mb-6">
                  <p className="mb-4">
                    Welcome to{' '}
                    <span className="font-bold text-on-surface">TradeHut</span>.
                    These Terms of Service (&ldquo;Terms&rdquo;) govern your
                    access to and use of the TradeHut website, mobile
                    applications, and any other software or services provided by
                    TradeHut (collectively, the &ldquo;Services&rdquo;).
                  </p>
                  <p>
                    By clicking &ldquo;Accept&rdquo; or by using the Services,
                    you confirm that you have read, understood, and agreed to
                    these Terms. If you do not agree to these Terms, you may not
                    access or use the Services.
                  </p>
                </div>
              </section>

              {/* 2. User Conduct */}
              <section className="scroll-mt-28" id="user-conduct">
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface mb-6 tracking-tight font-syne">
                  2. User Conduct
                </h2>
                <p className="mb-6">
                  TradeHut is a community built on trust. We expect all users to
                  act with integrity and respect. You agree that you will not:
                </p>
                <ul className="space-y-5">
                  {[
                    'Use the Services for any illegal purpose or in violation of any local, state, national, or international law.',
                    'Violate or encourage others to violate any right of or obligation to a third party, including by infringing, misappropriating, or violating intellectual property.',
                    'Post, upload, or distribute any User Content that is unlawful, defamatory, libelous, or that a reasonable person could deem to be objectionable.',
                  ].map((item, idx) => (
                    <li key={idx} className="flex gap-4">
                      <span className="font-mono text-primary font-bold shrink-0">
                        {String(idx + 1).padStart(2, '0')}/
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* 3. Account Security */}
              <section className="scroll-mt-28" id="account-security">
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface mb-6 tracking-tight font-syne">
                  3. Account Security
                </h2>
                <div className="relative overflow-hidden bg-on-surface text-surface p-6 md:p-8 rounded-xl">
                  <div className="relative z-10">
                    <p className="mb-4 opacity-90">
                      You are responsible for safeguarding the password that you
                      use to access the Services and for any activities or actions
                      under your password.
                    </p>
                    <p className="opacity-90">
                      We encourage you to use &ldquo;strong&rdquo; passwords
                      (passwords that use a combination of upper and lower case
                      letters, numbers and symbols) with your account. TradeHut
                      cannot and will not be liable for any loss or damage arising
                      from your failure to comply with the above.
                    </p>
                  </div>
                  <div className="absolute -right-12 -bottom-12 opacity-10 select-none" aria-hidden>
                    <Lock className="w-48 h-48" />
                  </div>
                </div>
              </section>

              {/* 4. Intellectual Property */}
              <section className="scroll-mt-28" id="intellectual-property">
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface mb-6 tracking-tight font-syne">
                  4. Intellectual Property
                </h2>
                <p className="mb-6">
                  The Services and their entire contents, features, and
                  functionality (including but not limited to all information,
                  software, text, displays, images, video, and audio, and the
                  design, selection, and arrangement thereof) are owned by
                  TradeHut, its licensors, or other providers of such material
                  and are protected by United States and international copyright,
                  trademark, patent, trade secret, and other intellectual
                  property or proprietary rights laws.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      title: 'Our License to You',
                      body: 'We grant you a limited, non-exclusive, non-transferable, and revocable license to use our Services strictly for personal, non-commercial purposes.',
                    },
                    {
                      title: 'Your Feedback',
                      body: 'Any feedback, comments, or suggestions you may provide regarding TradeHut is entirely voluntary and we will be free to use such feedback as we see fit.',
                    },
                  ].map(({ title, body }) => (
                    <div
                      key={title}
                      className="border border-outline-variant/30 p-5 md:p-6 rounded-lg"
                    >
                      <h4 className="font-bold text-on-surface mb-2 font-syne">
                        {title}
                      </h4>
                      <p className="text-sm">{body}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 5. Liability */}
              <section className="scroll-mt-28" id="liability">
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface mb-6 tracking-tight font-syne">
                  5. Limitation of Liability
                </h2>
                <p className="mb-4 text-xs uppercase tracking-widest font-bold opacity-60">
                  Legal Disclaimer
                </p>
                <div className="font-mono text-sm bg-surface-container p-6 md:p-8 rounded-lg border-l-4 border-primary leading-relaxed">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRADEHUT SHALL NOT BE
                  LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR
                  PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER
                  INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE,
                  GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (I) YOUR
                  ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICES;
                  (II) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICES;
                  (III) ANY CONTENT OBTAINED FROM THE SERVICES; OR (IV)
                  UNAUTHORIZED ACCESS, USE OR ALTERATION OF YOUR TRANSMISSIONS OR
                  CONTENT.
                </div>
              </section>
            </div>

            {/* CTA footer */}
            <footer className="mt-20 md:mt-24 pt-10 md:pt-12 border-t border-outline-variant/20 flex flex-col items-center text-center">
              <h3 className="font-syne text-xl md:text-2xl font-bold mb-4 text-on-surface">
                Have questions about our terms?
              </h3>
              <p className="text-on-surface-variant mb-8 max-w-md text-sm md:text-base">
                Our legal team is here to help you understand your rights and
                responsibilities on the TradeHut platform.
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
            <div className="mt-12 pt-8 border-t border-outline-variant/15">
              <p className="text-xs uppercase tracking-widest text-on-surface-variant/60 font-bold mb-4">
                Related Legal Documents
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/legal/privacy"
                  className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:text-primary-container underline underline-offset-4 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Privacy Policy
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

        {/* ── Page-level footer ── */}
        <footer className="w-full py-10 md:py-12 bg-surface-container-low">
          <div className="flex flex-col md:flex-row justify-between items-center px-4 md:px-8 max-w-screen-2xl mx-auto gap-6 md:gap-8">
            <div className="flex flex-col items-center md:items-start gap-1">
              <span className="text-on-surface font-black font-syne text-lg">
                TradeHut
              </span>
              <p className="font-body text-xs uppercase tracking-widest text-on-surface/60">
                &copy; {new Date().getFullYear()} TradeHut Ltd. All rights reserved.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 font-body text-xs uppercase tracking-widest">
              <Link
                href="/legal/privacy"
                className="text-on-surface/60 hover:text-primary-container underline underline-offset-4 transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/legal/cookies"
                className="text-on-surface/60 hover:text-primary-container underline underline-offset-4 transition-colors"
              >
                Cookie Policy
              </Link>
              <Link
                href="/trust"
                className="text-on-surface/60 hover:text-primary-container underline underline-offset-4 transition-colors"
              >
                Trust &amp; Safety
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </MainLayout>
  );
}
