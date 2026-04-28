"use client";

/**
 * Feedback & Reviews page
 * Route: /account/reviews
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_feedback_reviews/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import MainLayout from "@/components/Layouts/MainLayout";
import {
  LayoutDashboard,
  ShoppingBag,
  Gavel,
  FileText,
  Heart,
  MapPin,
  CreditCard,
  Bell,
  Shield,
  Star,
  LogOut,
  ArrowRight,
  Pencil,
  Trash2,
  MessageCircle,
  Reply,
  ArrowUpDown,
  CheckCircle,
  Store,
  User,
  Menu,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ReviewTab = "to-write" | "written" | "received";

interface PendingReview {
  id: string;
  productTitle: string;
  productImageUrl: string;
  productImageAlt: string;
  sellerName: string;
  purchasedAgo: string;
}

interface WrittenReview {
  id: string;
  sellerName: string;
  sellerAvatarUrl: string;
  transactionRef: string;
  rating: number; // 1-5
  reviewText: string;
  date: string;
}

interface ReceivedReview {
  id: string;
  buyerName: string;
  buyerAvatarUrl: string;
  rating: number; // 1-5
  comment: string;
  date: string;
  hasReply: boolean;
}

// ---------------------------------------------------------------------------
// Demo data
// TODO: fetch /api/reviews/?type=to-write|written|received
// ---------------------------------------------------------------------------
const DEMO_PENDING: PendingReview[] = [
  {
    id: "pr-001",
    productTitle: "Ethereal Fragments #04",
    productImageUrl:
      "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&q=80",
    productImageAlt: "Vibrant abstract oil painting",
    sellerName: "Studio Nova",
    purchasedAgo: "2d ago",
  },
  {
    id: "pr-002",
    productTitle: "Leica M3 Replica (Pristine)",
    productImageUrl:
      "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=400&q=80",
    productImageAlt: "Vintage film camera on wooden table",
    sellerName: "Vintage Vault",
    purchasedAgo: "5d ago",
  },
  {
    id: "pr-003",
    productTitle: "Hand-Thrown Ceramic Bowl Set",
    productImageUrl:
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400&q=80",
    productImageAlt: "Artisan ceramic bowls",
    sellerName: "Clay & Craft",
    purchasedAgo: "1w ago",
  },
  {
    id: "pr-004",
    productTitle: "Limited Edition Screen Print — Vol. 3",
    productImageUrl:
      "https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?w=400&q=80",
    productImageAlt: "Colourful screen print artwork",
    sellerName: "Pixel & Print",
    purchasedAgo: "10d ago",
  },
];

const DEMO_WRITTEN: WrittenReview[] = [
  {
    id: "wr-001",
    sellerName: "Gallery.Eth",
    sellerAvatarUrl: "https://i.pravatar.cc/80?img=47",
    transactionRef: "#A8821",
    rating: 5,
    reviewText:
      "Excellent shipping speed and the packaging was museum-grade. The piece looks even better in person than the high-res scans suggested.",
    date: "Oct 12, 2023",
  },
  {
    id: "wr-002",
    sellerName: "Timeless Curations",
    sellerAvatarUrl: "https://i.pravatar.cc/80?img=52",
    transactionRef: "#B1092",
    rating: 4,
    reviewText:
      "Very honest description about the minor patina. Great communication throughout the customs process. Recommended seller.",
    date: "Sep 28, 2023",
  },
  {
    id: "wr-003",
    sellerName: "Pixel & Print",
    sellerAvatarUrl: "https://i.pravatar.cc/80?img=33",
    transactionRef: "#X7761",
    rating: 5,
    reviewText:
      "The limited edition print arrived with a personalized note. High attention to detail. Will definitely bid on their future lots.",
    date: "Aug 15, 2023",
  },
];

const DEMO_RECEIVED: ReceivedReview[] = [
  {
    id: "rr-001",
    buyerName: "Marcus T.",
    buyerAvatarUrl: "https://i.pravatar.cc/80?img=12",
    rating: 5,
    comment:
      "Seller was very responsive and shipped fast. Product exactly as described. Would buy again.",
    date: "Apr 18, 2026",
    hasReply: false,
  },
  {
    id: "rr-002",
    buyerName: "Priya S.",
    buyerAvatarUrl: "https://i.pravatar.cc/80?img=21",
    rating: 4,
    comment:
      "Good quality overall. Minor scuff on one corner but the seller offered a partial refund immediately.",
    date: "Apr 10, 2026",
    hasReply: true,
  },
  {
    id: "rr-003",
    buyerName: "James O.",
    buyerAvatarUrl: "https://i.pravatar.cc/80?img=58",
    rating: 3,
    comment:
      "Item took longer than expected to arrive. Packaging was fine though and product matched description.",
    date: "Mar 30, 2026",
    hasReply: false,
  },
];

// ---------------------------------------------------------------------------
// Star rating display helper
// ---------------------------------------------------------------------------
function StarRating({
  rating,
  max = 5,
}: {
  rating: number;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of ${max} stars`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < Math.floor(rating)
              ? "text-primary-container fill-current"
              : "text-primary-container"
          }`}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interactive star picker (for "Write Review" inline interaction)
// ---------------------------------------------------------------------------
function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rate this item">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star`}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 text-on-surface-variant hover:text-primary-container transition-colors active:scale-90"
        >
          <Star
            className={`w-5 h-5 ${
              star <= display ? "text-primary-container fill-current" : ""
            }`}
          />
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending review item
// ---------------------------------------------------------------------------
function PendingReviewItem({ item }: { item: PendingReview }) {
  const [pickedRating, setPickedRating] = useState(0);

  return (
    <div className="group flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 rounded-2xl hover:bg-surface-container-low transition-all border border-transparent hover:border-outline-variant/20">
      {/* Thumbnail */}
      <div className="w-full sm:w-28 h-28 sm:h-28 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 relative">
        <Image
          src={item.productImageUrl}
          alt={item.productImageAlt}
          fill
          sizes="(max-width: 640px) 100vw, 112px"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Info */}
      <div className="flex-grow min-w-0">
        <div className="flex flex-col xs:flex-row xs:items-start xs:justify-between gap-1 mb-2">
          <div className="min-w-0">
            <h4 className="font-bold text-base text-on-surface truncate">
              {item.productTitle}
            </h4>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Purchased from{" "}
              <span className="text-primary font-medium">{item.sellerName}</span>
            </p>
          </div>
          <span className="font-mono text-xs bg-surface-container px-2 py-1 rounded self-start flex-shrink-0">
            {item.purchasedAgo}
          </span>
        </div>

        {/* Star picker */}
        <div className="mb-4">
          <StarPicker value={pickedRating} onChange={setPickedRating} />
        </div>

        <Link
          href={`/account/reviews/write/${item.id}`}
          className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-container transition-colors group/btn"
        >
          Write Review
          <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Written review card
// ---------------------------------------------------------------------------
function WrittenReviewCard({ review }: { review: WrittenReview }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all">
      {/* Seller row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-primary-fixed overflow-hidden flex-shrink-0 relative">
          <Image
            src={review.sellerAvatarUrl}
            alt={review.sellerName}
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <h5 className="font-bold text-sm truncate">{review.sellerName}</h5>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">
            Transaction: {review.transactionRef}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1 flex-shrink-0">
          <Star className="w-4 h-4 text-primary-container fill-current" />
          <span className="font-mono text-xs font-bold">{review.rating}.0</span>
        </div>
      </div>

      {/* Stars */}
      <div className="mb-3">
        <StarRating rating={review.rating} />
      </div>

      {/* Review text */}
      <p className="text-sm text-on-surface leading-relaxed line-clamp-3 mb-4">
        {review.reviewText}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-2 pt-4 border-t border-outline-variant/10">
        <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase">
          {review.date}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-tertiary hover:bg-surface-container transition-all active:scale-95"
            aria-label="Edit review"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-all active:scale-95"
            aria-label="Delete review"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Received review card
// ---------------------------------------------------------------------------
function ReceivedReviewCard({ review }: { review: ReceivedReview }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all">
      {/* Buyer row */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden flex-shrink-0 relative">
          <Image
            src={review.buyerAvatarUrl}
            alt={review.buyerName}
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <h5 className="font-bold text-sm truncate">{review.buyerName}</h5>
          <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">
            {review.date}
          </p>
        </div>
        {review.hasReply && (
          <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-green/10 text-secondary-green text-[10px] font-black uppercase tracking-widest">
            <CheckCircle className="w-3 h-3" />
            Replied
          </span>
        )}
      </div>

      {/* Stars */}
      <div className="mb-3">
        <StarRating rating={review.rating} />
      </div>

      {/* Comment */}
      <p className="text-sm text-on-surface leading-relaxed line-clamp-3 mb-4">
        {review.comment}
      </p>

      {/* Footer */}
      <div className="pt-4 border-t border-outline-variant/10">
        {review.hasReply ? (
          <button className="w-full inline-flex items-center justify-center gap-2 text-sm font-bold text-on-surface-variant hover:text-primary transition-colors active:scale-95 py-2">
            <MessageCircle className="w-4 h-4" />
            View Your Reply
          </button>
        ) : (
          <button className="w-full py-2.5 border border-primary/20 text-primary hover:bg-primary/5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95">
            <Reply className="w-4 h-4" />
            Reply to Review
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overall score bento card
// ---------------------------------------------------------------------------
function ScoreBentoCard() {
  return (
    <div className="bg-surface-container-low rounded-3xl p-8 relative overflow-hidden group">
      {/* decorative glow */}
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary-fixed-dim/20 rounded-full blur-3xl group-hover:bg-primary-container/10 transition-colors pointer-events-none" />

      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4">
          Overall Score
        </p>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-5xl font-bold text-on-surface">
            4.92
          </span>
          <span className="text-on-surface-variant font-medium">/ 5.0</span>
        </div>

        <div className="flex gap-1 mt-4">
          {[1, 2, 3, 4].map((i) => (
            <Star key={i} className="w-5 h-5 text-primary-container fill-current" />
          ))}
          <Star className="w-5 h-5 text-primary-container" />
        </div>

        <p className="text-sm text-on-surface-variant mt-6 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-secondary-green flex-shrink-0" />
          Top 2% of community members
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trust metrics card
// ---------------------------------------------------------------------------
function TrustMetricsCard() {
  const metrics = [
    { label: "Buyer Honesty", value: 98, color: "bg-secondary-green" },
    { label: "Prompt Payments", value: 100, color: "bg-secondary-green" },
    { label: "Review Quality", value: 84, color: "bg-primary-container" },
  ];

  return (
    <div className="bg-inverse-surface text-inverse-on-surface rounded-3xl p-8 shadow-card">
      <h3 className="font-syne text-xl font-bold mb-6">Trust Metrics</h3>
      <div className="space-y-6">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2">
              <span>{m.label}</span>
              <span className="font-mono text-inverse-on-surface">{m.value}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full ${m.color} rounded-full`}
                style={{ width: `${m.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
        <p className="text-xs leading-relaxed text-inverse-on-surface/70 italic">
          "Consistently provides constructive, high-detail feedback that helps
          sellers improve."
        </p>
        <p className="text-[10px] font-bold text-secondary-green mt-2">
          — Community Badge: Master Reviewer
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verified status CTA card
// ---------------------------------------------------------------------------
function VerifiedCTACard() {
  return (
    <div className="bg-primary-container rounded-3xl p-8 text-on-primary relative overflow-hidden">
      <div className="absolute bottom-0 right-0 opacity-20 pointer-events-none">
        <Shield className="w-24 h-24 translate-y-4 translate-x-4" />
      </div>
      <h4 className="font-syne text-xl font-bold mb-2">Verified Status</h4>
      <p className="text-on-primary/80 text-sm mb-4">
        Complete 5 more reviews to earn your verified badge and unlock a 2% fee
        reduction.
      </p>
      <button className="bg-surface-container-lowest text-primary px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:shadow-card transition-all active:scale-95">
        Learn More
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------
const TABS: { label: string; value: ReviewTab; count: number }[] = [
  { label: "Reviews to Write", value: "to-write", count: DEMO_PENDING.length },
  { label: "Reviews Written", value: "written", count: DEMO_WRITTEN.length },
  { label: "Reviews Received", value: "received", count: DEMO_RECEIVED.length },
];

// ---------------------------------------------------------------------------
// Page component (client — needs useState for active tab)
// ---------------------------------------------------------------------------
export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState<ReviewTab>("to-write");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on ESC
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [drawerOpen]);

  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface font-body">
        {/*
         * NOTE: Global <TopNav> is rendered by MainLayout — do NOT add
         * another nav here. pt-20 clears the sticky nav bar.
         */}

        {/* Mobile sidebar drawer overlay */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-inverse-surface/40 backdrop-blur-sm lg:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
        )}
        {/* Mobile sidebar drawer panel */}
        <div
          className={`fixed left-0 top-0 h-full w-72 z-50 bg-surface-container-lowest shadow-card flex flex-col gap-2 p-6 overflow-y-auto no-scrollbar transition-transform duration-300 lg:hidden ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Account navigation drawer"
        >
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-syne text-xl font-bold text-on-surface tracking-tight">
                My Account
              </h2>
              <p className="text-xs text-on-surface-variant font-medium mt-1 opacity-60">
                Manage your TradeHut profile
              </p>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            {[
              { href: "/account", Icon: LayoutDashboard, label: "Overview" },
              { href: "/account/orders", Icon: ShoppingBag, label: "Orders" },
              { href: "/account/bids", Icon: Gavel, label: "Bids & Auctions" },
              { href: "/account/requests", Icon: FileText, label: "My Requests" },
              { href: "/account/messages", Icon: Bell, label: "Messages" },
              { href: "/account/wishlist", Icon: Heart, label: "Wishlist" },
              { href: "/account/addresses", Icon: MapPin, label: "Addresses" },
              { href: "/account/payment-methods", Icon: CreditCard, label: "Payment Methods" },
              { href: "/account/notifications", Icon: Bell, label: "Notifications" },
              { href: "/account/security", Icon: Shield, label: "Security" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setDrawerOpen(false)}
                className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
              >
                <link.Icon className="w-5 h-5" />
                <span className="font-body uppercase tracking-widest text-[10px] font-bold">{link.label}</span>
              </Link>
            ))}
            <Link
              href="/account/reviews"
              onClick={() => setDrawerOpen(false)}
              className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
            >
              <Star className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Feedback &amp; Reviews</span>
            </Link>
          </nav>
          <div className="mt-auto pt-6 border-t border-surface-container-highest/30">
            <Link
              href="/auth/login"
              className="w-full bg-surface-container-low text-on-surface-variant font-bold py-3 rounded-xl hover:bg-error-container hover:text-error transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Link>
          </div>
        </div>

        <div className="pt-20 pb-24 md:pb-12 px-4 md:px-6 lg:px-8 max-w-screen-2xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4 md:gap-6 lg:gap-8">

            {/* ----------------------------------------------------------------
             * SIDEBAR — account nav
             * TODO: extract to shared <AccountSidebar>
             * ---------------------------------------------------------------- */}
            <aside className="hidden lg:flex md:sticky md:top-24 md:h-[calc(100vh-6rem)] w-72 flex-shrink-0 flex-col gap-2 p-6 bg-surface-container-low rounded-2xl overflow-y-auto no-scrollbar">
              <div className="mb-8">
                <h2 className="font-syne text-xl font-bold text-on-surface tracking-tight">
                  Account Settings
                </h2>
                <p className="text-xs text-on-surface-variant font-medium mt-1 opacity-60">
                  Manage your TradeHut profile
                </p>
              </div>

              <nav className="flex flex-col gap-1 flex-1">
                <Link
                  href="/account"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Overview
                  </span>
                </Link>

                <Link
                  href="/account/orders"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Orders
                  </span>
                </Link>

                <Link
                  href="/account/bids"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <Gavel className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Bids &amp; Auctions
                  </span>
                </Link>

                <Link
                  href="/account/requests"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    My Requests
                  </span>
                </Link>

                {/* Feedback & Reviews — ACTIVE */}
                <Link
                  href="/account/reviews"
                  className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
                >
                  <Star className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Feedback &amp; Reviews
                  </span>
                </Link>

                <Link
                  href="/account/wishlist"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <Heart className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Wishlist
                  </span>
                </Link>

                <Link
                  href="/account/addresses"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <MapPin className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Addresses
                  </span>
                </Link>

                <Link
                  href="/account/payment-methods"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Payment Methods
                  </span>
                </Link>

                <Link
                  href="/account/notifications"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <Bell className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Notifications
                  </span>
                </Link>

                <Link
                  href="/account/security"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Security
                  </span>
                </Link>
              </nav>

              {/* Logout */}
              <div className="mt-auto pt-6 border-t border-surface-container-highest/30">
                <Link
                  href="/auth/login"
                  className="w-full bg-surface-container text-on-surface-variant font-bold py-3 rounded-xl hover:bg-error-container hover:text-error transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Link>
              </div>
            </aside>

            {/* ----------------------------------------------------------------
             * MAIN CONTENT
             * ---------------------------------------------------------------- */}
            <section className="flex-1 min-w-0">

              {/* Mobile menu trigger */}
              <div className="lg:hidden flex items-center gap-3 pb-4">
                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open account menu"
                  className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface h-10 w-10 flex items-center justify-center"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="font-syne font-bold text-sm text-on-surface-variant uppercase tracking-widest">
                  Reviews
                </span>
              </div>

              {/* ── Page header + hero stats row ─────────────────────────── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                {/* Title + CTAs */}
                <div className="lg:col-span-2">
                  <h1 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2">
                    Reputation{" "}
                    <span className="text-primary-container">Insights</span>
                  </h1>
                  <p className="text-on-surface-variant text-base max-w-xl">
                    Monitor your community standing, manage pending reviews, and
                    analyse your feedback trends across the ecosystem.
                  </p>

                  <div className="flex flex-wrap gap-3 mt-6">
                    <button
                      onClick={() => setActiveTab("to-write")}
                      className="bg-primary text-on-primary px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-card hover:shadow-card-hover transition-all active:scale-95"
                    >
                      <Pencil className="w-4 h-4" />
                      Pending Reviews ({DEMO_PENDING.length})
                    </button>
                    <button className="bg-surface-container-lowest text-on-surface px-5 py-3 rounded-xl font-bold border border-outline-variant/15 flex items-center gap-2 hover:bg-surface-container transition-all active:scale-95">
                      <Star className="w-4 h-4" />
                      Archived Feedback
                    </button>
                  </div>
                </div>

                {/* Overall score card */}
                <ScoreBentoCard />
              </div>

              {/* ── Tab bar ──────────────────────────────────────────────── */}
              <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-8 pt-2">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={`
                        inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold
                        whitespace-nowrap transition-all duration-200 active:scale-95
                        ${
                          isActive
                            ? "bg-primary text-on-primary"
                            : "text-on-surface-variant hover:bg-surface-container"
                        }
                      `}
                    >
                      {tab.label}
                      <span
                        className={`
                          inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black
                          ${
                            isActive
                              ? "bg-on-primary/20 text-on-primary"
                              : "bg-surface-container text-on-surface-variant"
                          }
                        `}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              </div>

              {/* ── Tab panels ──────────────────────────────────────────── */}

              {/* TO WRITE */}
              {activeTab === "to-write" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Pending list — wide column */}
                  <div className="md:col-span-8 bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-card border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-6 md:mb-8">
                      <h3 className="font-syne text-xl md:text-2xl font-bold">
                        Awaiting Your Word
                      </h3>
                      <span className="bg-primary-container/10 text-primary-container px-3 py-1 rounded-full text-xs font-bold">
                        Action Required
                      </span>
                    </div>

                    {DEMO_PENDING.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Star className="w-12 h-12 text-outline/40 mb-4" />
                        <h4 className="font-headline font-bold text-lg text-on-surface mb-1">
                          All caught up
                        </h4>
                        <p className="text-sm text-on-surface-variant max-w-xs">
                          No pending reviews. Keep shopping to share more feedback.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {DEMO_PENDING.map((item) => (
                          <PendingReviewItem key={item.id} item={item} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sidebar stats — narrow column */}
                  <div className="md:col-span-4 flex flex-col gap-6">
                    <TrustMetricsCard />
                    <VerifiedCTACard />
                  </div>
                </div>
              )}

              {/* WRITTEN */}
              {activeTab === "written" && (
                <div>
                  {/* Filter row */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 p-6 bg-surface-container-low rounded-2xl">
                    <div>
                      <h3 className="font-syne text-xl font-bold">
                        Feedback History
                      </h3>
                      <p className="text-sm text-on-surface-variant mt-0.5">
                        Detailed breakdown of the reviews you've shared.
                      </p>
                    </div>
                    <div className="flex bg-surface-container-lowest rounded-xl p-1 shadow-sm border border-outline-variant/10">
                      {["All", "Sellers", "Items"].map((f) => (
                        <button
                          key={f}
                          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 ${
                            f === "All"
                              ? "bg-primary-container text-on-primary"
                              : "text-on-surface-variant hover:text-primary"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {DEMO_WRITTEN.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <Star className="w-12 h-12 text-outline/40 mb-4" />
                      <h4 className="font-headline font-bold text-lg text-on-surface mb-1">
                        No reviews written yet
                      </h4>
                      <p className="text-sm text-on-surface-variant max-w-xs">
                        Once you write a review it will appear here.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {DEMO_WRITTEN.map((review) => (
                          <WrittenReviewCard key={review.id} review={review} />
                        ))}
                      </div>

                      <div className="mt-8 flex justify-center">
                        <button className="bg-surface-container-high text-on-surface-variant px-8 py-3 rounded-xl font-bold hover:bg-surface-container-highest transition-colors active:scale-95">
                          View All History
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* RECEIVED */}
              {activeTab === "received" && (
                <div>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 p-6 bg-surface-container-low rounded-2xl">
                    <div>
                      <h3 className="font-syne text-xl font-bold">
                        Reviews From Buyers
                      </h3>
                      <p className="text-sm text-on-surface-variant mt-0.5">
                        Feedback your buyers have left on your listings.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-full">
                        <ArrowUpDown className="w-4 h-4" />
                        Newest first
                      </span>
                    </div>
                  </div>

                  {DEMO_RECEIVED.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <MessageCircle className="w-12 h-12 text-outline/40 mb-4" />
                      <h4 className="font-headline font-bold text-lg text-on-surface mb-1">
                        No reviews received yet
                      </h4>
                      <p className="text-sm text-on-surface-variant max-w-xs">
                        Buyers will leave feedback on your listings here once they
                        complete a purchase.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {DEMO_RECEIVED.map((review) => (
                        <ReceivedReviewCard key={review.id} review={review} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* ----------------------------------------------------------------
         * MOBILE BOTTOM NAV
         * Replaces the sidebar on small screens (< lg).
         * TODO: extract to a shared <AccountBottomNav> or replace with the
         * global mobile nav once that component exists.
         * ---------------------------------------------------------------- */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest shadow-[0_-4px_20px_0_rgba(38,24,19,0.06)] px-6 py-3 flex justify-around items-center z-50">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <Store className="w-6 h-6" />
            <span className="text-[10px] font-bold">Home</span>
          </Link>
          <Link
            href="/account/bids"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <Gavel className="w-6 h-6" />
            <span className="text-[10px] font-bold">Bids</span>
          </Link>
          <Link
            href="/account/reviews"
            className="flex flex-col items-center gap-1 text-primary min-w-[44px] py-1"
          >
            <Star className="w-6 h-6 fill-current" />
            <span className="text-[10px] font-bold">Reviews</span>
          </Link>
          <Link
            href="/account"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold">Profile</span>
          </Link>
        </nav>
      </div>
    </MainLayout>
  );
}
