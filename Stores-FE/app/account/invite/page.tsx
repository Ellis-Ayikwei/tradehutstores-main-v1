"use client";

/**
 * Invite Friends page
 * Route: /account/invite
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_invite_friends/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 *
 * // TODO: fetch /api/account/referrals/ — all data below is mocked
 */

import { useState, useEffect } from "react";
import Link from "next/link";
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
  Share2,
  User,
  Gift,
  Send,
  UserPlus,
  Download,
  Copy,
  Check,
  Mail,
  Store,
  Menu,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ReferralStatus = "completed" | "pending";

interface ReferralEntry {
  id: string;
  name: string;
  handle: string;
  role: string;
  status: ReferralStatus;
  joinedDate: string;
  rewardAmount: number;
  /** null = use person icon placeholder */
  avatarUrl: string | null;
}

// ---------------------------------------------------------------------------
// Demo data
// TODO: replace with fetch from /api/account/referrals/
// ---------------------------------------------------------------------------
const DEMO_REFERRALS: ReferralEntry[] = [
  {
    id: "ref-001",
    name: "Julian V.",
    handle: "@jvx_art",
    role: "Art Collector",
    status: "completed",
    joinedDate: "Oct 12, 2023",
    rewardAmount: 50,
    avatarUrl: "https://i.pravatar.cc/40?img=11",
  },
  {
    id: "ref-002",
    name: "Elena Rose",
    handle: "@elena_collects",
    role: "Marketplace Buyer",
    status: "completed",
    joinedDate: "Oct 08, 2023",
    rewardAmount: 50,
    avatarUrl: "https://i.pravatar.cc/40?img=20",
  },
  {
    id: "ref-003",
    name: "Marcus Chen",
    handle: "",
    role: "Invite Pending Action",
    status: "pending",
    joinedDate: "Oct 02, 2023",
    rewardAmount: 0,
    avatarUrl: null,
  },
];

const REFERRAL_CODE = "TRADEHUT-X92F";

// Icon map for how-it-works steps — resolved as Lucide components below
const HOW_IT_WORKS = [
  {
    step: "01",
    icon: "share",
    title: "Share Your Code",
    body: "Send your personal referral code to friends via email, message, or social media.",
  },
  {
    step: "02",
    icon: "account_circle",
    title: "Friend Signs Up",
    body: "Your friend creates a TradeHut account using your referral code.",
  },
  {
    step: "03",
    icon: "card_giftcard",
    title: "Both Earn Credit",
    body: "Once they complete their first trade, you both receive $50 in TradeHut Credit.",
  },
];

// ---------------------------------------------------------------------------
// Referral status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: ReferralStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/40 text-secondary-green text-[10px] font-bold uppercase tracking-widest">
        <span className="w-1.5 h-1.5 bg-secondary-green rounded-full" />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
      <span className="w-1.5 h-1.5 bg-outline rounded-full" />
      Pending
    </span>
  );
}

// ---------------------------------------------------------------------------
// Copy-to-clipboard button (needs client state)
// ---------------------------------------------------------------------------
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  return (
    <button
      onClick={handleCopy}
      aria-label="Copy referral code"
      className="bg-primary-container text-on-primary p-4 rounded-lg hover:shadow-lg transition-all active:scale-90 flex items-center gap-2 min-w-[52px] min-h-[52px] justify-center"
    >
      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Share button component
// ---------------------------------------------------------------------------
interface ShareButtonProps {
  label: string;
  href: string;
  children: React.ReactNode;
}

function ShareButton({ label, href, children }: ShareButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 bg-surface-container-lowest px-6 py-4 rounded-2xl shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all active:scale-95"
    >
      {children}
      <span className="font-bold text-sm text-on-surface">{label}</span>
    </a>
  );
}

// Step icon resolver
function StepIcon({ icon }: { icon: string }) {
  if (icon === "share") return <Share2 className="w-5 h-5 text-primary-container" />;
  if (icon === "account_circle") return <User className="w-5 h-5 text-primary-container" />;
  if (icon === "card_giftcard") return <Gift className="w-5 h-5 text-primary-container" />;
  return <Gift className="w-5 h-5 text-primary-container" />;
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function InviteFriendsPage() {
  // Stats derived from demo data
  // TODO: replace with API totals once /api/account/referrals/ is wired
  const invitesSent = DEMO_REFERRALS.length;
  const signups = DEMO_REFERRALS.filter((r) => r.status === "completed").length;
  const creditsEarned = DEMO_REFERRALS.filter(
    (r) => r.status === "completed"
  ).reduce((sum, r) => sum + r.rewardAmount, 0);

  const [drawerOpen, setDrawerOpen] = useState(false);

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
              href="/account/invite"
              onClick={() => setDrawerOpen(false)}
              className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
            >
              <UserPlus className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Invite Friends</span>
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

            {/* ------------------------------------------------------------------
             * SIDEBAR — account nav (desktop only)
             * TODO: extract to shared <AccountSidebar>
             * ------------------------------------------------------------------ */}
            <aside className="hidden lg:flex md:sticky md:top-24 md:h-[calc(100vh-6rem)] w-72 flex-shrink-0 flex-col gap-2 p-6 bg-surface rounded-2xl overflow-y-auto no-scrollbar">
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

                {/* Invite Friends — ACTIVE */}
                <Link
                  href="/account/invite"
                  className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
                >
                  <UserPlus className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Invite Friends
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
                  className="w-full bg-surface-container-low text-on-surface-variant font-bold py-3 rounded-xl hover:bg-error-container hover:text-error transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Link>
              </div>
            </aside>

            {/* ------------------------------------------------------------------
             * MAIN CONTENT
             * ------------------------------------------------------------------ */}
            <section className="flex-1 min-w-0 space-y-12">

              {/* Mobile menu trigger */}
              <div className="lg:hidden flex items-center gap-3">
                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open account menu"
                  className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface h-10 w-10 flex items-center justify-center"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="font-syne font-bold text-sm text-on-surface-variant uppercase tracking-widest">
                  Invite Friends
                </span>
              </div>

              {/* ── Section 1: Hero ─────────────────────────────────────────── */}
              <div>
                {/* Page header */}
                <div className="mb-8 md:mb-12">
                  <h1 className="font-syne text-3xl md:text-5xl font-extrabold tracking-tighter text-on-surface leading-tight">
                    Grow the{" "}
                    <span className="text-primary-container italic">Community</span>
                    .<br />
                    Earn Credit.
                  </h1>
                  <p className="text-on-surface-variant mt-4 text-base max-w-xl leading-relaxed">
                    Invite your fellow traders to TradeHut. For every friend who
                    completes their first trade, you both receive{" "}
                    <span className="font-bold text-on-surface">
                      $50 in TradeHut Credit
                    </span>
                    .
                  </p>
                </div>

                {/* Referral code card */}
                <div className="bg-surface-container-low p-1 rounded-2xl max-w-sm">
                  <div className="bg-surface-container-lowest p-6 rounded-xl shadow-card flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-outline mb-1">
                        Your Personal Code
                      </p>
                      <p className="font-mono text-xl font-bold tracking-wider text-primary-container">
                        {REFERRAL_CODE}
                      </p>
                    </div>
                    <CopyButton text={REFERRAL_CODE} />
                  </div>
                </div>
              </div>

              {/* ── Section 2: Stats ────────────────────────────────────────── */}
              <div>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h2 className="font-syne text-2xl md:text-3xl font-bold tracking-tight">
                      Your Referral Stats
                    </h2>
                    <p className="text-outline text-sm mt-1">
                      Watch your TradeHut credits grow
                    </p>
                  </div>
                  <span className="bg-surface-container-highest px-4 py-1 rounded-full text-xs font-bold text-on-surface-variant hidden sm:inline-flex">
                    ALL TIME
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Invites sent */}
                  <div className="bg-surface-container-low p-6 rounded-2xl flex flex-col gap-3 group hover:bg-surface-container transition-colors">
                    <Send className="w-5 h-5 text-outline group-hover:scale-110 transition-transform" />
                    <p className="font-mono text-4xl font-bold text-on-surface">
                      {String(invitesSent).padStart(2, "0")}
                    </p>
                    <p className="text-sm font-medium text-outline">
                      Invites Sent
                    </p>
                  </div>

                  {/* Signups */}
                  <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card flex flex-col gap-3 group hover:shadow-card-hover transition-all">
                    <UserPlus className="w-5 h-5 text-secondary-green group-hover:scale-110 transition-transform" />
                    <p className="font-mono text-4xl font-bold text-on-surface">
                      {String(signups).padStart(2, "0")}
                    </p>
                    <p className="text-sm font-medium text-outline">
                      Successful Signups
                    </p>
                  </div>

                  {/* Credits earned */}
                  <div className="bg-primary text-on-primary p-6 rounded-2xl shadow-lg flex flex-col gap-3">
                    <Gift className="w-5 h-5" />
                    <p className="font-mono text-4xl font-bold">
                      ${creditsEarned}
                    </p>
                    <p className="text-sm font-bold opacity-80">
                      Credits Earned
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Section 3: How it works ─────────────────────────────────── */}
              <div>
                <h2 className="font-syne text-2xl md:text-3xl font-bold tracking-tight mb-2">
                  How It Works
                </h2>
                <p className="text-outline text-sm mb-8">
                  Three simple steps to earn TradeHut Credit
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {HOW_IT_WORKS.map(({ step, icon, title, body }) => (
                    <div
                      key={step}
                      className="bg-surface-container-lowest rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all group relative overflow-hidden"
                    >
                      {/* Step number watermark */}
                      <span className="absolute top-4 right-5 font-mono text-5xl font-extrabold text-surface-container-high select-none pointer-events-none leading-none">
                        {step}
                      </span>

                      <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <StepIcon icon={icon} />
                      </div>

                      <h3 className="font-headline font-bold text-lg mb-2 text-on-surface">
                        {title}
                      </h3>
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        {body}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Section 4: Share buttons ────────────────────────────────── */}
              <div>
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest text-center mb-6">
                  Instant Share
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                  {/* Email */}
                  <ShareButton
                    label="Email Invite"
                    href={`mailto:?subject=Join%20me%20on%20TradeHut&body=Use%20my%20code%20${REFERRAL_CODE}%20to%20sign%20up%20and%20we%20both%20earn%20%2450%20credit!`}
                  >
                    <div className="w-8 h-8 rounded-full bg-error flex items-center justify-center text-on-error flex-shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                  </ShareButton>

                  {/* SMS */}
                  <ShareButton
                    label="SMS"
                    href={`sms:?body=Join%20me%20on%20TradeHut!%20Use%20code%20${REFERRAL_CODE}%20for%20%2450%20credit%3A%20https%3A%2F%2Ftradehut.com%2Fjoin`}
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary-green flex items-center justify-center text-on-secondary flex-shrink-0">
                      <Send className="w-4 h-4" />
                    </div>
                  </ShareButton>

                  {/* WhatsApp */}
                  <ShareButton
                    label="WhatsApp"
                    href={`https://wa.me/?text=Join%20me%20on%20TradeHut!%20Use%20code%20${REFERRAL_CODE}%20for%20%2450%20credit%3A%20https%3A%2F%2Ftradehut.com%2Fjoin`}
                  >
                    <div className="w-8 h-8 rounded-full bg-whatsapp flex items-center justify-center text-on-primary flex-shrink-0">
                      {/* WhatsApp SVG kept inline — no img/external asset needed */}
                      <svg
                        className="w-4 h-4 fill-white"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                    </div>
                  </ShareButton>

                  {/* Twitter / X */}
                  <ShareButton
                    label="Twitter / X"
                    href={`https://twitter.com/intent/tweet?text=Join%20me%20on%20%40TradeHut!%20Use%20my%20code%20${REFERRAL_CODE}%20for%20%2450%20credit%20when%20you%20complete%20your%20first%20trade.&url=https%3A%2F%2Ftradehut.com%2Fjoin`}
                  >
                    <div className="w-8 h-8 rounded-full bg-twitter flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 fill-white"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                  </ShareButton>

                  {/* Facebook */}
                  <ShareButton
                    label="Facebook"
                    href={`https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Ftradehut.com%2Fjoin%3Fref%3D${REFERRAL_CODE}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-facebook flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 fill-white"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                  </ShareButton>
                </div>
              </div>

              {/* ── Section 5: Referral history table ───────────────────────── */}
              <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-10 shadow-card">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-headline font-bold text-2xl text-on-surface">
                    Referral History
                  </h2>
                  <button className="text-primary-container font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all active:scale-95">
                    Download Report
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                {/* Table — horizontal scroll on mobile */}
                <div className="overflow-x-auto -mx-2 px-2">
                  <table className="w-full text-left min-w-[520px]">
                    <thead>
                      <tr className="text-outline text-[10px] uppercase tracking-widest border-b border-surface-container-low">
                        <th className="pb-5 font-bold">Member</th>
                        <th className="pb-5 font-bold">Status</th>
                        <th className="pb-5 font-bold">Joined</th>
                        <th className="pb-5 font-bold text-right">
                          Reward Earned
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-low">
                      {DEMO_REFERRALS.map((entry) => (
                        <tr key={entry.id} className="group">
                          {/* Member cell */}
                          <td className="py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-surface-container-highest overflow-hidden flex-shrink-0 flex items-center justify-center">
                                {entry.avatarUrl ? (
                                  /* eslint-disable-next-line @next/next/no-img-element */
                                  <img
                                    src={entry.avatarUrl}
                                    alt={entry.name}
                                    width={40}
                                    height={40}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <User className="w-5 h-5 text-outline" />
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-on-surface leading-tight">
                                  {entry.name}
                                  {entry.handle && (
                                    <span className="font-normal text-on-surface-variant ml-1">
                                      {entry.handle}
                                    </span>
                                  )}
                                </p>
                                <p className="text-xs text-outline mt-0.5">
                                  {entry.role}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Status cell */}
                          <td className="py-5">
                            <StatusBadge status={entry.status} />
                          </td>

                          {/* Date cell */}
                          <td className="py-5">
                            <p className="font-mono text-sm text-on-surface">
                              {entry.joinedDate}
                            </p>
                          </td>

                          {/* Reward cell */}
                          <td className="py-5 text-right">
                            {entry.rewardAmount > 0 ? (
                              <p className="font-mono font-bold text-secondary-green">
                                +${entry.rewardAmount.toFixed(2)}
                              </p>
                            ) : (
                              <p className="font-mono font-bold text-outline opacity-40">
                                $0.00
                              </p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {DEMO_REFERRALS.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <UserPlus className="w-16 h-16 text-outline/40 mb-4" />
                    <h3 className="font-headline font-bold text-xl mb-2">
                      No referrals yet
                    </h3>
                    <p className="text-sm text-on-surface-variant max-w-xs">
                      Share your code above to start earning credit when friends
                      join TradeHut.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* ------------------------------------------------------------------
         * MOBILE BOTTOM NAV — replaces sidebar on < lg
         * TODO: extract to shared <AccountBottomNav>
         * ------------------------------------------------------------------ */}
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
            href="/account/requests"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <FileText className="w-6 h-6" />
            <span className="text-[10px] font-bold">RFQs</span>
          </Link>
          {/* Invite — active in mobile nav */}
          <Link
            href="/account/invite"
            className="flex flex-col items-center gap-1 text-primary-container min-w-[44px] py-1"
          >
            <UserPlus className="w-6 h-6" />
            <span className="text-[10px] font-bold">Invite</span>
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
