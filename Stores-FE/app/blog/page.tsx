// TODO: fetch /api/blog/posts/ — replace mock data with real API calls
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/Layouts/MainLayout';
import BlogNewsletterSignup from '@/components/Blog/BlogNewsletterSignup';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Author {
  name: string;
  initials: string;
  role?: string;
}

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  categoryColor: 'primary' | 'tertiary' | 'secondary-green';
  date: string;
  readTime: string;
  image: string;
  imageAlt: string;
  author: Author;
  /** Optional vertical offset class for the staggered grid layout */
  gridOffset?: string;
}

// ---------------------------------------------------------------------------
// Mock data (replace with API fetch)
// ---------------------------------------------------------------------------

const FEATURED_POST = {
  slug: 'real-time-bidding-reshaped-logistics',
  title: 'The Velocity Shift: How Real-Time Bidding Reshaped Logistics.',
  excerpt:
    'A deep-dive into how live auction mechanics are transforming industrial procurement — and what it means for your margins.',
  author: {
    name: 'Marcus Thorne',
    initials: 'MT',
    role: 'Chief Market Strategist',
  },
  image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcn16ECnouWOXb3YuWH78XlLJjshsGvDwck6QjjNRwkDDeN40aBYEbetTBDI2hHeP_P0YgaJHw4jL3Cys74OIGC6IYgKb4YMsnqJy9qHY1kEgHyFGaLibA1OxEkRA0RCGTDIP00OZORKR_hB-8mHrDeWP0WVyF8nJaRa40bTC7z3sJsWOY6GCazAhAQZN_qgNCRDOnNVByHjzSDEAOnD5Yr2kdEYKCuEm6a59B06juFUkXiwCMNUv343YlPnvarYaH7i4dzlD21EE',
  imageAlt: 'Cinematic view of a futuristic trading floor with warm amber lighting',
};

const POSTS: BlogPost[] = [
  {
    slug: 'maximizing-margins-hardware-auctions',
    title: 'Maximizing Margins in High-Frequency Hardware Auctions.',
    excerpt:
      'Learn the strategic pacing required to dominate hardware auctions without over-leveraging your operational capital.',
    category: 'Seller Guide',
    categoryColor: 'primary',
    date: '04.12.2024',
    readTime: '8 MIN READ',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBszLSsr8lM-xz24r4cYJ4eZ5NIg_dwOc9XBdxskBZmFHrvzxoGGJULAxoW4lcYhwGl_LbwYdtYxgF1w77GQR5-E2omb6G4FROAYc_wscP_ergfyo-fGJY5AgIGPB9oviJ4QuEWL5K3NrthHwtpxDmzV-i1Pk85ASsgrl-oV9wjC-A3XpH9LIwWBFY1107t0-XoSs5cIkPXDV9mumE2unM79uqT5GCISgGLnYV3P0gkqR4nD2HACjFT-wDG9LUoLEuXtmfMl1ZHQS4',
    imageAlt: 'Minimalist dashboard UI with growth charts and green accents',
    author: { name: 'Elena Rodriguez', initials: 'ER' },
  },
  {
    slug: 'rfq-2-structural-logic-complex-tenders',
    title: 'Introducing RFQ 2.0: Structural Logic for Complex Tenders.',
    excerpt:
      'The latest update brings modular specifications and auto-matching vendor protocols to our core bidding engine.',
    category: 'Product Update',
    categoryColor: 'tertiary',
    date: '04.10.2024',
    readTime: '4 MIN READ',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDKXy5wGQTY-mE4-xbLV8jnxSa0Wr8peLqipqjwH1Ygh3_rKvCzx9GsmnY02mSXjXbDPwCOWGUDIloDxmc_M6HGVwfsdS95TVgn-J70n-7M3JLpgiFpvM-0Md8uKCNPbLlJsVUPwBOGeZywcSSZnUIhhAhs79yi0bcq4ohUrJIm--uxenxqtHipGjj5SfptmBmwP94wUN1lGMUgAytSFWz1m7FrpzpqklUt1a4PemcZEVRTRRCI5dnbddFLucft4iZOqZMDm2rlivs',
    imageAlt: 'Industrial warehouse with blue LED lighting and symmetrical rack rows',
    author: { name: 'Dave Chen', initials: 'DC' },
    gridOffset: 'lg:mt-12',
  },
  {
    slug: 'q1-transparency-report-global-trade-flows',
    title: 'Q1 Transparency Report: Global Trade Flows and Friction Points.',
    excerpt:
      'An architectural deep-dive into the current state of industrial supply chains and emerging trade corridors.',
    category: 'Market Report',
    categoryColor: 'primary',
    date: '04.08.2024',
    readTime: '12 MIN READ',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBas0urq9GIcV_PsgkmW0p_41FzD2eOA9DJdB_I0kEGykRouw5-58Xo5yeEUjwtV6o2Ql4TXJZ1Z4oe1iqe3xamERt60SxD-v-RpKtmpVW--ToX9ifmkjDQffz9j1a0Bo9QXOM1MHDonPoQh6MlcQP7jUhWsfJYemcxEpB-lbNJzrZpHfrTQOzOqWG6GfOROXRp1h1hFTKxns0Y-JShQPhtyfxY66bV5ejL8YJ1QktPGmXZbWQT01cwjutx-Wib7oI-0uZeADVH3wg',
    imageAlt: 'Extreme close-up of paper edges stacked with dramatic shadows',
    author: { name: 'Sarah Jenkins', initials: 'SJ' },
    gridOffset: 'lg:mt-6',
  },
  {
    slug: 'algorithmic-trust-industrial-b2b',
    title: 'Algorithmic Trust: The New Currency of Industrial B2B.',
    excerpt:
      'How verified transaction history is becoming more valuable than raw liquidity in high-end trade circles.',
    category: 'Analysis',
    categoryColor: 'primary',
    date: '04.05.2024',
    readTime: '6 MIN READ',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBlSrbdpI2GzuGPfYHwog0CDjMF8fY5-y3HLYQmYBgb3yN6ZM2pHrlB-DZPhhl0tG44YcdlIofIv_vBCfdmwhyjCQDc7_XV4WZWscDqJJXb3mEuWdiaPRB9vEbc71_IAVVg7RhzNkByyFdiwkeYacFOcT_vsOtuHaq2RF88vXdmt79IOJBaw0ck2kuXeNlOovkh7OHs8XHZ4frla-dhGkjmUjtlHHQLajO0v38buvG43VZqEzuJk972T-KnA6-dyf7A2UZURvg_z_o',
    imageAlt: 'Computer screen showing mathematical graphs with orange data points',
    author: { name: 'James Wilson', initials: 'JW' },
  },
];

const CATEGORIES = [
  'All Insights',
  'Seller Guides',
  'Market Reports',
  'Product Updates',
  'Interviews',
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Category badge overlay on article card images */
function CategoryBadge({
  label,
  color,
}: {
  label: string;
  color: 'primary' | 'tertiary' | 'secondary-green';
}) {
  const colorClass =
    color === 'tertiary'
      ? 'text-tertiary'
      : color === 'secondary-green'
        ? 'text-secondary-green'
        : 'text-primary';

  return (
    <span
      className={`px-3 py-1 rounded-full bg-surface/90 backdrop-blur-sm ${colorClass} text-[10px] font-bold uppercase tracking-wider`}
    >
      {label}
    </span>
  );
}

/** Individual article card */
function ArticleCard({ post }: { post: BlogPost }) {
  return (
    <article className={`flex flex-col group cursor-pointer ${post.gridOffset ?? ''}`}>
      {/* Cover image */}
      <Link href={`/blog/${post.slug}`} className="block aspect-[4/5] overflow-hidden rounded-xl bg-surface-container-low mb-6 relative">
        <Image
          src={post.image}
          alt={post.imageAlt}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          unoptimized
        />
        <div className="absolute top-4 left-4">
          <CategoryBadge label={post.category} color={post.categoryColor} />
        </div>
      </Link>

      {/* Body */}
      <div className="flex-grow">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono text-[10px] text-on-surface-variant">{post.date}</span>
          <span className="w-1 h-1 rounded-full bg-outline-variant" />
          <span className="font-mono text-[10px] text-on-surface-variant">{post.readTime}</span>
        </div>
        <h3 className="font-syne text-2xl font-bold text-on-surface leading-tight mb-4 group-hover:text-primary transition-colors">
          {post.title}
        </h3>
        <p className="text-on-surface-variant text-sm leading-relaxed mb-6 line-clamp-2">
          {post.excerpt}
        </p>
      </div>

      {/* Footer row */}
      <Link
        href={`/blog/${post.slug}`}
        className="flex items-center justify-between pt-4 border-t border-outline-variant/10"
      >
        <span className="text-xs font-bold text-on-surface">{post.author.name}</span>
        <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
      </Link>
    </article>
  );
}

/** Pagination row */
function Pagination() {
  return (
    <div className="flex justify-center items-center gap-2">
      <button
        aria-label="Previous page"
        className="w-10 h-10 rounded-lg ghost-border flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-95"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Active page */}
      <button className="w-10 h-10 rounded-lg bg-primary-container text-on-primary font-bold text-sm active:scale-95">
        1
      </button>

      {[2, 3].map((page) => (
        <button
          key={page}
          className="w-10 h-10 rounded-lg ghost-border flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors text-sm font-bold active:scale-95"
        >
          {page}
        </button>
      ))}

      <span className="text-on-surface-variant px-2 select-none">…</span>

      <button className="w-10 h-10 rounded-lg ghost-border flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors text-sm font-bold active:scale-95">
        12
      </button>

      <button
        aria-label="Next page"
        className="w-10 h-10 rounded-lg ghost-border flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors active:scale-95"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default function BlogIndexPage() {
  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface antialiased">

        {/* ── Hero: Featured Post ─────────────────────────────────────── */}
        <section className="py-8 md:py-12">
          <div className="max-w-screen-xl mx-auto px-4 md:px-8">
            <div className="relative group overflow-hidden rounded-2xl bg-surface-container-low h-[400px] sm:h-[500px] md:h-[600px] flex items-end">
              {/* Background image */}
              <div className="absolute inset-0 z-0">
                <Image
                  src={FEATURED_POST.image}
                  alt={FEATURED_POST.imageAlt}
                  fill
                  priority
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 100vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/40 to-transparent" />
              </div>

              {/* Content overlay */}
              <div className="relative z-10 p-6 md:p-16 max-w-3xl">
                <span className="inline-block px-3 py-1 rounded-full bg-primary-container text-on-primary text-[10px] font-bold uppercase tracking-widest mb-4 md:mb-6">
                  Featured Analysis
                </span>
                <h1 className="font-syne text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold text-surface-container-lowest tracking-tighter leading-[0.95] mb-6 md:mb-8">
                  {FEATURED_POST.title}
                </h1>
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                  <Link
                    href={`/blog/${FEATURED_POST.slug}`}
                    className="primary-gradient text-on-primary px-8 py-3 md:py-4 rounded-lg font-syne font-bold text-base md:text-lg hover:shadow-xl transition-all active:scale-95"
                  >
                    Read Full Report
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant font-mono text-xs shrink-0">
                      {FEATURED_POST.author.initials}
                    </div>
                    <div className="text-surface-container-lowest">
                      <p className="text-sm font-bold">{FEATURED_POST.author.name}</p>
                      <p className="text-xs opacity-70">{FEATURED_POST.author.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Category Filter Bar ─────────────────────────────────────── */}
        <nav
          aria-label="Blog categories"
          className="max-w-screen-xl mx-auto px-4 md:px-8 mb-10 md:mb-12"
        >
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
            {CATEGORIES.map((cat, i) => (
              <button
                key={cat}
                className={`px-5 py-2 min-h-10 rounded-full text-sm font-medium whitespace-nowrap transition-colors active:scale-95 ${
                  i === 0
                    ? 'bg-primary-fixed text-on-primary-fixed font-bold'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </nav>

        {/* ── Article Grid ────────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 md:px-8 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
            {POSTS.map((post) => (
              <ArticleCard key={post.slug} post={post} />
            ))}

            {/* Newsletter bento — spans 2 cols on md+, full col on mobile */}
            <BlogNewsletterSignup />
          </div>
        </section>

        {/* ── Pagination ──────────────────────────────────────────────── */}
        <section className="max-w-screen-xl mx-auto px-4 md:px-8 py-12 md:py-16 md:mt-4">
          <Pagination />
        </section>

      </div>
    </MainLayout>
  );
}
