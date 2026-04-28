// TODO: fetch /api/blog/posts/{slug}/ — replace mock data with real API call
// TODO: wire comments API — currently rendering a static comment list
// TODO: wire newsletter signup to /api/newsletter/subscribe
// TODO: generateStaticParams() from API when SSG is needed
import Link from 'next/link';
import Image from 'next/image';
import MainLayout from '@/components/Layouts/MainLayout';
import { Share2, Bookmark, ThumbsUp, ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Author {
  name: string;
  role: string;
  bio: string;
  image: string;
  imageAlt: string;
}

interface TocItem {
  id: string;
  label: string;
}

interface RelatedArticle {
  slug: string;
  category: string;
  title: string;
  image: string;
  imageAlt: string;
}

interface Comment {
  id: string;
  author: string;
  authorInitials: string;
  date: string;
  body: string;
}

interface ArticleData {
  slug: string;
  category: string;
  readTime: string;
  title: string;
  publishDate: string;
  author: Author;
  coverImage: string;
  coverImageAlt: string;
  toc: TocItem[];
  relatedArticles: RelatedArticle[];
  comments: Comment[];
}

// ---------------------------------------------------------------------------
// Mock data (replace with API fetch)
// ---------------------------------------------------------------------------

const MOCK_ARTICLE: ArticleData = {
  slug: 'the-shift-in-heavy-machinery-markets',
  category: 'Industrial Outlook 2024',
  readTime: '8 MIN READ',
  title: 'The Shift in Heavy Machinery Markets',
  publishDate: 'April 18, 2024',
  author: {
    name: 'Marcus Thorne',
    role: 'Lead Market Strategist',
    bio: 'Marcus has spent two decades at the intersection of heavy industry and digital logistics. His research focuses on the impact of real-time bidding architectures on global supply chain stability.',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDzpmNj4NfvvAnFT_08W6pgkIN1kmQ5HZOBz1TwSfizzHNuephni4IcLpiWL-OfBj8vzvE1VVoWJd41U49BMsKBWqTAKpTa6KHiKHGFA_MME0hncO6yhKnWZOz1O2uYYqCWtn5AKOwmWfXnEt4dliL8CmORIEcr2rVzuPARcafiaGvuu10mm_yfLCuD9YVIaRKgMjLqvw7W3LS4uY31gLdse2ey2P1eyQFhXBY8xB9VP3vAEdN806xcq0QNtAxNqyMwTTz3-aLYp-A',
    imageAlt: 'Portrait of Marcus Thorne, Lead Market Strategist',
  },
  coverImage:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuChDJobd8oEEC8wqc0fs8kxc3sPL--U-qyNso-mzTGg3sYaJX2HltmU1vwUvMdpe7-V7S-vmEdgzk9XtU1PdGGGU6RCRl6CZiJdi-bVUhU-nsl3J-VmTcrFO7gC7F4Ti4WpI-rTCHwTCPSSRYLBldg69u-x_Vp61fYe5gHzjObS21Jqbbfjf18OqfuFq24_x_0sII6O5YH50foEGN7D6n_eWWao3vXjYkB_1rjXYrfFDbTZZGdYcRl31JNkZJxoe21CMluyiXGc3Kw',
  coverImageAlt:
    'Cinematic close-up of high-tech industrial machinery parts with metallic sheen',
  toc: [
    { id: 'death-of-static-inventory', label: 'The Death of the Static Inventory' },
    { id: 'transparency-as-tool', label: 'Transparency as a Tool' },
  ],
  relatedArticles: [
    {
      slug: 'excavation-equipment-global-pricing-q3',
      category: 'Analysis',
      title: 'Excavation Equipment: Global Pricing Indices Q3',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBccBRc6OOIOo9Mg1QziK9dSQ5yRA0ksRsm_8uSxkEakTEgflzG0W8MpVY4sAOudt0fctCdLpXUKaVktVNd27FThTBQ04q4ZZbqTKauRuWbLMgcLVaDRrsZTXWwnVpbhMaTDI_75Krgn4MwpNWbpiEGf7OrXHmEPNXccHrXwVHvZB6g213xskUv0hszBNHevZcmKwyvLklj7QRzARnUxm_j4Cx1ZfFKVkmi8n613Llk7X5KG45HquoFt1IealzE44-Hz8H_QWbaYtc',
      imageAlt: 'Abstract close-up of yellow construction vehicle details',
    },
    {
      slug: 'port-congestion-paradox-rfq-study',
      category: 'Logistics',
      title: 'The Port Congestion Paradox: An RFQ Study',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDWNpWiuE9ATAXym8V4FNpMG1Zso5liUi9A7wjfd9eSny1uVfaodp5RG24ud1WDRPUe-zU8XuIImT_ftBTsfupFdMRf9b4dxK1k_scbrv9bkrsIlIhIwkT-6qbeUWSdAmXrPH-jcBlXud4rPzUd4ig0SHt51zFhvVJZJu-jWAO_S9PbH9FXtGbMx9ZvBsstr3jOsIZpQ_85T437yFG3Mxf5HKbcoxHadXAG2Drj205WjkTZcDRDvX52lUrK9bwJeHLRKQJhSRaziVE',
      imageAlt: 'Shipping containers in a port at twilight with glowing industrial lights',
    },
    {
      slug: 'decarbonizing-heavy-assets-eu-market',
      category: 'Sustainability',
      title: 'Decarbonizing Heavy Assets in the EU Market',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC9WPAQdGbvByIOCPPtQBT4VkyLnOQETiIKcWEHQfqg4Eo7_8mCFGIrdCmfsPtaqtDeqeqJr3f5Ns23PoIGvHPon6OkZFuVa1iqM_1SOTSKpuX3NJDWKK4hMBn9T10KFNmj10BRYKC5nKcjsWv_YWdt-Y0RdGTAfX70q8R5PPqn6dB8HXIdyflHoFBOIr4GqnhYLvTL_wIzHbi-hJSWju14GTbMRsC-SHwQSiWfTkJQHV0FGZWzB7OmCDB1mmjjtFRIuTLodf3AHDo',
      imageAlt: 'Solar panels in a vast desert landscape with geometric lines',
    },
  ],
  comments: [
    {
      id: 'c1',
      author: 'Priya Nair',
      authorInitials: 'PN',
      date: 'April 20, 2024',
      body: 'Excellent framing of the procurement velocity problem. The 24% RFQ increase stat is remarkable — would love a breakdown by sector.',
    },
    {
      id: 'c2',
      author: 'Stefan Koch',
      authorInitials: 'SK',
      date: 'April 21, 2024',
      body: "The \"Trust Layer\" section resonates deeply with what we’re seeing in EU industrial tenders. Transparency is genuinely becoming the differentiator.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Sub-components (all pure / server-renderable)
// ---------------------------------------------------------------------------

/** Inline share / action buttons — kept as server-renderable static UI.
 *  "use client" would only be needed if clipboard copy were wired. */
function ArticleSidebar({ toc }: { toc: TocItem[] }) {
  return (
    <aside className="hidden lg:block lg:col-span-1">
      <div className="md:sticky md:top-24 flex flex-col items-center gap-6">
        {/* Action icons */}
        <button
          aria-label="Share article"
          className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors active:scale-95"
        >
          <Share2 className="w-5 h-5" />
        </button>
        <button
          aria-label="Bookmark article"
          className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors active:scale-95"
        >
          <Bookmark className="w-5 h-5" />
        </button>

        <div className="h-px w-8 bg-outline-variant/30" />

        <button
          aria-label="Like article"
          className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-surface-container-low text-tertiary transition-colors active:scale-95"
        >
          <ThumbsUp className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}

/** Sticky TOC sidebar (lg+) */
function TocSidebar({ toc }: { toc: TocItem[] }) {
  return (
    <aside className="hidden xl:block xl:col-span-3">
      <nav
        aria-label="Table of contents"
        className="md:sticky md:top-24 space-y-2"
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">
          In This Article
        </p>
        {toc.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="block text-sm text-on-surface-variant hover:text-primary transition-colors py-1.5 border-l-2 border-outline-variant/30 pl-3 hover:border-primary"
          >
            {item.label}
          </a>
        ))}
      </nav>
    </aside>
  );
}

/** Pull-quote block */
function PullQuote({
  quote,
  attribution,
}: {
  quote: string;
  attribution: string;
}) {
  return (
    <div className="my-12 md:my-16 p-6 md:p-8 bg-surface-container-low rounded-xl border-l-4 border-primary">
      <p className="italic text-xl md:text-2xl text-on-surface mb-4 font-body leading-relaxed">
        &ldquo;{quote}&rdquo;
      </p>
      <cite className="text-sm font-mono uppercase tracking-widest text-primary not-italic">
        — {attribution}
      </cite>
    </div>
  );
}

/** Author bio card */
function AuthorBio({ author }: { author: Author }) {
  return (
    <div className="mt-16 md:mt-24 p-8 md:p-12 bg-surface-container-low rounded-xl flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start text-center md:text-left shadow-card">
      <div className="w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden shrink-0 shadow-card">
        <Image
          src={author.image}
          alt={author.imageAlt}
          width={128}
          height={128}
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
      <div>
        <h4 className="font-headline text-xl md:text-2xl text-on-background mb-2">
          About {author.name}
        </h4>
        <p className="text-on-surface-variant mb-6 leading-relaxed text-sm md:text-base">
          {author.bio}
        </p>
        <div className="flex justify-center md:justify-start gap-4 flex-wrap">
          <Link
            href="#"
            className="text-primary font-bold hover:underline text-sm active:opacity-70"
          >
            Follow Research
          </Link>
          <Link
            href="#"
            className="text-primary font-bold hover:underline text-sm active:opacity-70"
          >
            Connect on LinkedIn
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Related articles grid */
function RelatedArticles({
  articles,
}: {
  articles: RelatedArticle[];
}) {
  return (
    <aside className="mt-16 md:mt-24">
      <div className="flex justify-between items-end mb-8 md:mb-12 border-b border-outline-variant/20 pb-6">
        <h3 className="font-headline text-2xl md:text-3xl text-on-background">
          Related Market Reports
        </h3>
        <Link
          href="/blog"
          className="text-primary font-bold flex items-center gap-2 text-sm hover:underline active:opacity-70"
        >
          View All Reports{' '}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/blog/${article.slug}`}
            className="group cursor-pointer block"
          >
            <div className="aspect-[16/10] bg-surface-container-low rounded-xl overflow-hidden mb-4 md:mb-6 shadow-card transition-transform group-hover:-translate-y-1">
              <Image
                src={article.image}
                alt={article.imageAlt}
                width={480}
                height={300}
                className="w-full h-full object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
                unoptimized
              />
            </div>
            <span className="text-xs font-mono text-primary font-bold mb-2 block tracking-widest uppercase">
              {article.category}
            </span>
            <h4 className="font-headline text-lg md:text-xl group-hover:text-primary transition-colors leading-tight text-on-background">
              {article.title}
            </h4>
          </Link>
        ))}
      </div>
    </aside>
  );
}

/** Static comments section */
function CommentsSection({ comments }: { comments: Comment[] }) {
  // TODO: wire comments API — fetch /api/blog/posts/{slug}/comments/
  return (
    <section className="mt-16 md:mt-24">
      <h3 className="font-headline text-2xl md:text-3xl text-on-background mb-8 border-b border-outline-variant/20 pb-6">
        Discussion{' '}
        <span className="font-mono text-base text-on-surface-variant ml-2">
          ({comments.length})
        </span>
      </h3>

      {/* Comment list */}
      <ul className="space-y-6 mb-12">
        {comments.map((comment) => (
          <li key={comment.id} className="flex gap-4">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant font-mono text-xs shrink-0">
              {comment.authorInitials}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="font-bold text-sm text-on-background">
                  {comment.author}
                </span>
                <span className="text-xs text-on-surface-variant font-mono">
                  {comment.date}
                </span>
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                {comment.body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* Add comment form — static; TODO: wire submit */}
      <div className="bg-surface-container-low rounded-xl p-6 md:p-8">
        <h4 className="font-headline text-lg text-on-background mb-6">
          Leave a Comment
        </h4>
        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Your name"
              className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
            <input
              type="email"
              placeholder="work@company.com"
              className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            />
          </div>
          <textarea
            rows={4}
            placeholder="Share your thoughts…"
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
          />
          <button
            type="submit"
            className="px-8 py-3 primary-gradient text-on-primary rounded-lg font-bold text-sm hover:shadow-lg active:scale-95 transition-all"
          >
            Post Comment
          </button>
        </form>
      </div>
    </section>
  );
}

/** Newsletter signup block */
function NewsletterBlock() {
  // TODO: wire submit to /api/newsletter/subscribe
  return (
    <section className="mt-16 md:mt-24">
      <div className="bg-primary-container rounded-3xl p-8 md:p-16 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-40 pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-primary mb-4 opacity-70">
            TradeHut Intelligence
          </p>
          <h3 className="font-syne text-2xl md:text-4xl font-extrabold text-on-primary leading-tight mb-4">
            Never miss a pulse.
            <br />
            Market intelligence delivered weekly.
          </h3>
          <p className="text-on-primary opacity-80 text-sm mb-8 leading-relaxed">
            Join over 15,000 procurement leads and trade specialists who receive
            our curated analysis every Tuesday morning.
          </p>
          <form
            className="flex flex-col sm:flex-row gap-3"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="work@company.com"
              className="bg-on-primary/10 border border-on-primary/20 rounded-lg px-6 py-4 text-on-primary placeholder:text-on-primary/40 focus:ring-2 focus:ring-on-primary focus:border-transparent outline-none transition-all w-full text-sm"
            />
            <button
              type="submit"
              className="bg-on-primary text-primary-container px-8 py-4 rounded-lg font-bold text-sm whitespace-nowrap hover:bg-surface-container-lowest transition-colors active:scale-95"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page (Server Component)
// ---------------------------------------------------------------------------

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // TODO: fetch /api/blog/posts/{slug}/ — replace MOCK_ARTICLE
  const article = MOCK_ARTICLE;

  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface antialiased">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <header className="max-w-screen-xl mx-auto px-4 md:px-6 pt-8 md:pt-12 mb-10 md:mb-16">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12 items-start md:items-end">

            {/* Left: meta + title + author row */}
            <div className="flex-1">
              {/* Category badge + read time */}
              <div className="flex items-center gap-3 mb-5 md:mb-6 flex-wrap">
                <span className="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                  {article.category}
                </span>
                <span className="text-outline text-xs font-mono">
                  {article.readTime}
                </span>
              </div>

              {/* Title */}
              <h1 className="font-syne text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-on-background leading-[1.05] mb-6 md:mb-8 tracking-tighter">
                {article.title}
              </h1>

              {/* Author row */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container shrink-0">
                  <Image
                    src={article.author.image}
                    alt={article.author.imageAlt}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <p className="font-bold text-on-background leading-none">
                    {article.author.name}
                  </p>
                  <p className="text-outline text-sm">{article.author.role}</p>
                </div>
                <span className="hidden sm:block h-4 w-px bg-outline-variant mx-1" />
                <span className="hidden sm:block font-mono text-xs text-on-surface-variant">
                  {article.publishDate}
                </span>
              </div>
            </div>

            {/* Right: cover image */}
            <div className="w-full md:w-1/3 aspect-[4/3] bg-surface-container-low overflow-hidden rounded-xl shadow-card shrink-0">
              <Image
                src={article.coverImage}
                alt={article.coverImageAlt}
                width={480}
                height={360}
                priority
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                unoptimized
              />
            </div>
          </div>
        </header>

        {/* ── Body grid: sidebar | article | TOC ─────────────────────── */}
        <div className="max-w-screen-xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-8 md:gap-12 relative pb-12 md:pb-24">

          {/* Left action rail (lg+) */}
          <ArticleSidebar toc={article.toc} />

          {/* Main article body */}
          <article
            className="lg:col-span-8 lg:col-start-3 xl:col-span-6 xl:col-start-3 max-w-3xl w-full"
            aria-label="Article body"
          >
            {/* Lead paragraph */}
            <p className="text-lg md:text-2xl font-medium leading-relaxed mb-10 md:mb-12 text-on-surface-variant font-body">
              In the rapidly evolving landscape of industrial procurement, the
              traditional boundaries between local supply chains and global
              high-frequency trading are blurring. We are entering an era where
              precision is the only currency that matters.
            </p>

            {/* Article body — prose with token overrides */}
            <div className="prose prose-lg max-w-none text-on-surface prose-headings:font-headline prose-headings:text-on-background prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-on-background prose-blockquote:border-primary prose-blockquote:text-on-surface-variant">

              <h2 id="death-of-static-inventory">
                The Death of the Static Inventory
              </h2>
              <p>
                For decades, industrial manufacturing relied on the safety net of
                excess inventory. However, the current economic climate demands a
                more agile approach. At TradeHut, we&rsquo;ve observed a 24% increase
                in Request for Quote (RFQ) velocity within the heavy machinery
                sector over the last quarter alone.
              </p>

              <PullQuote
                quote="The interface of the future doesn't just list products; it facilitates trust at the speed of light."
                attribution="TradeHut Intelligence Unit"
              />

              <p>
                Precision isn&rsquo;t just about the measurement of a gear; it&rsquo;s about
                the timing of the acquisition. The approach we&rsquo;ve pioneered at
                TradeHut focuses on removing the friction between discovery and
                commitment. By leveraging real-time data streams, procurement
                officers can now bid on assets with a level of mathematical
                honesty previously reserved for quantitative finance.
              </p>

              <h2 id="transparency-as-tool">Transparency as a Tool</h2>
              <p>
                As we navigate the complexities of 2024, the &ldquo;Trust Layer&rdquo; becomes
                the most critical component of the trade. Every SKU, every bid
                amount, and every historical performance metric must be vertically
                aligned and mathematically clear. This is why we&rsquo;ve adopted a
                typography-first approach, utilizing monospaced fonts for all
                critical data points.
              </p>

              {/* In-article image */}
              <figure className="mt-12 md:mt-16 overflow-hidden rounded-xl shadow-card not-prose">
                <Image
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAD9_E4-0aW5xQqiipUOmIxojopDup2eNjaps7FfLXjPxX1iAIGfnf_eL-4DTBmmciC2uhHmFOY_7FMT7y6448Jnhdinf9NHuiJzhYfw31bXZOqnF4fO7gdvsUvKVR_MO9rZ06OkmYqtzbTdlbhuhg4uN0EQl7_kY80nlfepjh6CnwjG8BdT8saIkhriOWZv8ZTuZPVUqa3WwLLtt_3DeQ71W337kjISrC3QKkUesx3FhADFnBICSqMkKTSfupjbck-g8oZmucU5JM"
                  alt="Interior of a modern industrial warehouse with architectural precision and cool blue lighting"
                  width={768}
                  height={432}
                  className="w-full aspect-video object-cover"
                  unoptimized
                />
                <div className="px-4 py-3 bg-surface-container text-xs text-outline font-mono italic">
                  Figure 1.1: The shift towards decentralized industrial storage
                  hubs.
                </div>
              </figure>

            </div>

            {/* Author bio */}
            <AuthorBio author={article.author} />

            {/* Related articles */}
            <RelatedArticles articles={article.relatedArticles} />

            {/* Comments */}
            <CommentsSection comments={article.comments} />

            {/* Newsletter CTA */}
            <NewsletterBlock />

          </article>

          {/* Right TOC (xl+) */}
          <TocSidebar toc={article.toc} />

        </div>
      </div>
    </MainLayout>
  );
}
