import Link from "next/link";
import Image from "next/image";
import {
  Quote,
  ArrowLeft,
  ArrowRight,
  Globe,
  Share2,
} from "lucide-react";
import MainLayout from "@/components/Layouts/MainLayout";

// Static marketing page — no client state needed.
export const metadata = {
  title: "About Us | TradeHut",
  description:
    "Learn about TradeHut — the global industrial exchange built on real-time liquidity, intentional design, and transparent trust.",
};

/* ─── Data ─────────────────────────────────────────────────────────────── */

const TIMELINE = [
  {
    year: "2020",
    title: "The Genesis",
    body: "Founded in London with the vision to digitise heavy-asset liquidity and connect industrial buyers and sellers worldwide.",
  },
  {
    year: "2021",
    title: "Seed Launch",
    body: "Closed $12 M Series A to build the core RFQ engine and real-time auction infrastructure.",
  },
  {
    year: "2022",
    title: "Platform Redesign",
    body: "Launched the Gallery UI system, winning multiple international design awards for B2B fintech.",
  },
  {
    year: "2023",
    title: "Global Scale",
    body: "TradeHut expands to Singapore and New York, facilitating $2.4 B in private auctions.",
  },
  {
    year: "2024",
    title: "Horizon V2",
    body: "Release of the full TradeHut Suite, integrating AI-driven price discovery and smart compliance tooling.",
  },
];

const TEAM = [
  {
    name: "Elena Vance",
    role: "Chief Vision Officer",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDxbd9583wWIrlKxuuCZm6TV3mL0FXtI6_z9LR6YtxWQhLPk8TOmZ_B5CkNkfN7lI6yiPx2kvN5Rhbc82lxUhka4pC_elU7v-47EAG8N5NBzzMs2osIyy1ebZy3uZNrtBRLSGR4-28o30f83F0B0duYFsa8f-agb537sOocDZZKo9XEd42sn34cWn7J28L29GwqFwggsC_GL9r_Lgv3-quFlcw62eqwVOKeWvnQvqEpYMQCk8lZngUxZhEr_sxPwRVZDL1y8fOr2sQ",
    alt: "Elena Vance, Chief Vision Officer",
  },
  {
    name: "Marcus Thorne",
    role: "Head of Engineering",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuD6gxHWY6Gakb2QbB01-9YSxy38bEm8HgQcJNxa68yOxAxkuslIf1_Wzf1UZTQqiQ-RAvhLH43vYlLltxsyTRKkCCJ0HJT0RhlUmvpOO75wNYsySWYuyc_6XJJ45OiEZqlp6DIXHyaIHdMAXdlwtsOWBoaQYdhdS8GDyh95o5nmP0tUKTd0Vut444qq994kowHIy1zh7wgGIOxDj2B9syZ5DQfduwP0d_LjAisvWY6NmqXcpLJZpJ05gUfyD9oSvBTas5EkScLluZ4",
    alt: "Marcus Thorne, Head of Engineering",
  },
  {
    name: "Sasha Chen",
    role: "Design Director",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuC11oE_hw7AcWCtPvE6a3pslyU_F8a9eBmSLHPEAA-W3noGAbPqh8tltyyfPpf1rBsMWVZ9vH2Npk_jerFKwZgThd03c14NY-ljGeQkUUzZoKLkW6NpeVbjSQNLjZaWvEma3vlzoOJ_JHDbFbbzxgQ58qTDL6CCESKo5HZwCr5bs5XYdhWeEVwJx93aXi1lt6O_N2XAwkZHWn1XwBhUSclKAlXbC5zekgeu_rStn3p2xJMeLP16ku44xvoRHuKyO3MrqnAVPArCpT8",
    alt: "Sasha Chen, Design Director",
  },
  {
    name: "Julian Rossi",
    role: "Operations Lead",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAS0ZcmZA0UrxRt7YyoOYGaMWGSQBfa1Mg4avg8gmYfbZfwHTssYp6bozBXJiu3XJONMq1yAzC0XCTkWXTN3KWjrxL8Nu64pQ5PyXgm-ZAW8AZANHCKMlomDOzz8yB8lXYZenKOIXqGu7DtuB2936B42JGBgD-5gSKJwwdcaKKBOu8tdEVbFH5UoxTor3YBptDb5urT2uDGZP_u_FBk6N680KhKVP91F2ukM_PCBXd2jGyoTXmtjaNKsfns_sJUKogcAcnEr4x_Umk",
    alt: "Julian Rossi, Operations Lead",
  },
];

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <MainLayout>
      <div className="bg-surface text-on-surface font-body antialiased">
        <main className="overflow-x-hidden">

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <section className="relative px-4 md:px-8 max-w-screen-2xl mx-auto pt-12 pb-20 md:pt-16 md:pb-32">
            {/* Headline + subhead */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-end mb-10 md:mb-16">
              <div className="lg:col-span-8">
                <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-on-surface tracking-tighter leading-[0.9]">
                  Architecture for{" "}
                  <br className="hidden sm:block" />
                  <span className="text-primary-container">
                    Global Commerce
                  </span>
                </h1>
              </div>
              <div className="lg:col-span-4 pb-0 lg:pb-4">
                <p className="text-base md:text-lg text-on-surface-variant leading-relaxed font-medium">
                  Redefining the industrial exchange through intentional design,
                  real-time liquidity, and transparent trust.
                </p>
              </div>
            </div>

            {/* Hero image */}
            <div className="w-full aspect-[4/3] sm:aspect-[16/7] md:aspect-[21/9] rounded-2xl overflow-hidden relative group">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7FMqfCwN-ZnLhYxIMPaNHnIUcXsz2i6tw4yEnv5d-1YF8vz4sZ1kLWQC6-YGe2g9ffclTcF6jWy06aMi4clNQAV4M0fdHRxCM5cK8ej0g4IXsWFz009i97aaytOY5x429T6U4YHuLvqLZ6esAETZ4rNjz7LSOcif1GRYSc4hZEPUwjwYCbWZrZ7sYphdwcm8G_KzQlb5y_dFRdoR8E3P8wrOk1HHtoNPG18ck-MEkkvLue6TbvXHIXipNcPgkOvzO89jh5PXPdq8"
                alt="Modern architectural building — TradeHut global headquarters"
                fill
                className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                sizes="(max-width: 768px) 100vw, (max-width: 1536px) 100vw, 1536px"
                priority
              />
              {/* Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-on-surface/40 to-transparent pointer-events-none" />
            </div>
          </section>

          {/* ── Mission Pull Quote ───────────────────────────────────────── */}
          <section className="bg-primary-fixed-dim py-16 md:py-24 lg:py-32 mb-16 md:mb-24 lg:mb-32">
            <div className="max-w-5xl mx-auto px-4 md:px-8">
              <div className="flex flex-col items-center text-center">
                <Quote
                  className="text-primary mb-6 md:mb-8 w-14 h-14"
                  strokeWidth={1.5}
                />
                <blockquote className="font-headline text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-on-primary-fixed leading-tight tracking-tight">
                  &ldquo;We believe markets shouldn&rsquo;t just be efficient;
                  they should be beautiful. Our mission is to transform
                  high-frequency industrial trading into a living gallery of
                  opportunity.&rdquo;
                </blockquote>
                <p className="mt-8 md:mt-12 font-mono text-primary font-bold uppercase tracking-widest text-xs md:text-sm">
                  Our Core Mandate — 2024
                </p>
              </div>
            </div>
          </section>

          {/* ── Milestone Timeline ───────────────────────────────────────── */}
          <section className="max-w-screen-2xl mx-auto px-4 md:px-8 mb-20 md:mb-32 lg:mb-40 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between mb-10 md:mb-16">
              <h2 className="font-headline text-3xl md:text-4xl font-bold tracking-tight">
                Company Evolution
              </h2>
              {/* Nav arrows — decorative on static page; kept for visual parity */}
              <div className="flex gap-3 md:gap-4">
                <button
                  aria-label="Previous milestone"
                  className="w-11 h-11 md:w-12 md:h-12 rounded-full border border-outline-variant flex items-center justify-center hover:bg-primary-container hover:text-white transition-colors active:scale-95 duration-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <button
                  aria-label="Next milestone"
                  className="w-11 h-11 md:w-12 md:h-12 rounded-full border border-outline-variant flex items-center justify-center hover:bg-primary-container hover:text-white transition-colors active:scale-95 duration-200"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Horizontal scroll rail */}
            <div className="flex overflow-x-auto no-scrollbar gap-8 md:gap-12 pb-6 snap-x snap-mandatory">
              {TIMELINE.map(({ year, title, body }) => (
                <div
                  key={year}
                  className="min-w-[260px] sm:min-w-[300px] flex-shrink-0 group snap-start"
                >
                  <span className="font-mono text-primary text-xl md:text-2xl font-bold">
                    {year}
                  </span>
                  <div className="h-px w-full bg-outline-variant my-4 md:my-6 group-hover:bg-primary transition-colors duration-300" />
                  <h3 className="font-headline text-lg md:text-xl font-bold mb-2 md:mb-3">
                    {title}
                  </h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Team Grid ────────────────────────────────────────────────── */}
          <section className="bg-surface-container-low py-16 md:py-24 lg:py-32 mb-16 md:mb-24 lg:mb-32">
            <div className="max-w-screen-2xl mx-auto px-4 md:px-8">
              {/* Header */}
              <div className="mb-12 md:mb-20 text-center">
                <h2 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tighter mb-3 md:mb-4">
                  The TradeHut Team
                </h2>
                <p className="text-on-surface-variant max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
                  A multi-disciplinary group of engineers, economists, and
                  designers building the future of industrial trade.
                </p>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12 md:gap-x-12 md:gap-y-20">
                {TEAM.map(({ name, role, img, alt }) => (
                  <div key={name} className="flex flex-col items-center">
                    {/* Portrait */}
                    <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-full overflow-hidden mb-4 md:mb-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-2 relative">
                      <Image
                        src={img}
                        alt={alt}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 128px, (max-width: 768px) 160px, 192px"
                      />
                    </div>
                    <h4 className="font-headline font-bold text-base md:text-lg text-center">
                      {name}
                    </h4>
                    <p className="font-mono text-primary text-[10px] uppercase tracking-widest mt-1 text-center">
                      {role}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Careers CTA ──────────────────────────────────────────────── */}
          <section className="max-w-screen-2xl mx-auto px-4 md:px-8 mb-12 md:mb-20">
            <div className="bg-on-surface rounded-3xl p-10 sm:p-16 md:p-24 relative overflow-hidden">
              {/* Gradient accent */}
              <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary-container/20 to-transparent pointer-events-none" />
              {/* Glow blob — decorative */}
              <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-20 pointer-events-none" />

              <div className="relative z-10 max-w-2xl">
                <p className="font-mono text-primary-fixed-dim text-[10px] uppercase tracking-widest font-bold mb-4">
                  Join Our Team
                </p>
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-surface-container-lowest tracking-tighter leading-none mb-6 md:mb-8">
                  The Next Era <br /> Needs You.
                </h2>
                <p className="text-surface-variant text-base md:text-xl mb-8 md:mb-12 leading-relaxed">
                  We are looking for bold thinkers and precision builders to join
                  our mission in London, New York, and remote environments
                  globally.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/auth/register"
                    className="inline-block bg-primary-container text-white px-8 py-4 md:px-10 md:py-5 rounded-lg font-headline font-extrabold text-base md:text-lg hover:bg-primary transition-all duration-300 active:scale-95 shadow-lg"
                  >
                    Join Us
                  </Link>
                  <Link
                    href="/blog"
                    className="inline-block border border-primary-container text-primary-container px-8 py-4 md:px-10 md:py-5 rounded-lg font-headline font-extrabold text-base md:text-lg hover:bg-primary-container/10 transition-all duration-300 active:scale-95"
                  >
                    Read Our Blog
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
