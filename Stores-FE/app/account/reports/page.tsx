"use client";

/**
 * Reports & Suggestions — "/account/reports"
 *
 * Ported from:
 *   stitch_full_website_redesign_expansion/tradehut_reports_suggestions/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 *
 * // TODO: POST /api/reports/    — wire ReportForm submission
 * // TODO: POST /api/suggestions/ — wire SuggestionForm submission
 * // TODO: GET  /api/reports/?mine=true — replace DEMO_SUBMISSIONS with real data
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
  Flag,
  LogOut,
  Paperclip,
  CheckCircle,
  Flag as FlagIcon,
  Lightbulb,
  List,
  AlertTriangle,
  RefreshCw,
  Store,
  User,
  FileText as DescriptionIcon,
  Menu,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ReportCategory = "Product" | "Seller" | "Listing" | "Payment" | "Other";
type SuggestionCategory =
  | "User Experience (UX)"
  | "Bidding Mechanics"
  | "Shipping & Logistics"
  | "Seller Tools"
  | "Other";
type SubmissionStatus = "pending" | "in_review" | "resolved" | "rejected";
type SubmissionType = "report" | "suggestion";

interface Submission {
  id: string;
  type: SubmissionType;
  subject: string;
  category: string;
  status: SubmissionStatus;
  lastUpdate: string;
}

// ---------------------------------------------------------------------------
// Demo data
// TODO: replace with /api/reports/?mine=true and /api/suggestions/?mine=true
// ---------------------------------------------------------------------------
const DEMO_SUBMISSIONS: Submission[] = [
  {
    id: "rep-001",
    type: "report",
    subject: "Listing Inaccuracy: Solaris #4",
    category: "Listing",
    status: "in_review",
    lastUpdate: "Apr 20, 2026",
  },
  {
    id: "rep-002",
    type: "report",
    subject: "Seller Conduct: Artisan Collective",
    category: "Seller",
    status: "resolved",
    lastUpdate: "Apr 12, 2026",
  },
  {
    id: "sug-001",
    type: "suggestion",
    subject: "Augmented Reality Preview Feature",
    category: "User Experience (UX)",
    status: "in_review",
    lastUpdate: "Apr 15, 2026",
  },
  {
    id: "sug-002",
    type: "suggestion",
    subject: "Dark Mode Editorial View",
    category: "User Experience (UX)",
    status: "pending",
    lastUpdate: "Apr 10, 2026",
  },
  {
    id: "rep-003",
    type: "report",
    subject: "Payment not processed after 48h",
    category: "Payment",
    status: "pending",
    lastUpdate: "Apr 22, 2026",
  },
];

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<
  SubmissionStatus,
  { label: string; classes: string }
> = {
  pending: {
    label: "Pending",
    classes: "bg-bid-amber/10 text-bid-amber",
  },
  in_review: {
    label: "In Review",
    classes: "bg-secondary-green/10 text-secondary-green",
  },
  resolved: {
    label: "Resolved",
    classes: "bg-surface-container text-on-surface-variant",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-error-container text-error",
  },
};

function StatusPill({ status }: { status: SubmissionStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------
type ActiveTab = "report" | "suggestion" | "submissions";

const TABS: { id: ActiveTab; label: string; Icon: React.ElementType }[] = [
  { id: "report", label: "Report an Issue", Icon: Flag },
  { id: "suggestion", label: "Submit Suggestion", Icon: Lightbulb },
  { id: "submissions", label: "My Submissions", Icon: List },
];

// ---------------------------------------------------------------------------
// Report form
// ---------------------------------------------------------------------------
const REPORT_CATEGORIES: ReportCategory[] = [
  "Product",
  "Seller",
  "Listing",
  "Payment",
  "Other",
];

function ReportForm() {
  const [category, setCategory] = useState<ReportCategory>("Product");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [fileCount, setFileCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: POST /api/reports/  { category, subject, description, files }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
        <div className="w-16 h-16 rounded-full bg-secondary-green/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-secondary-green" />
        </div>
        <div>
          <h3 className="font-syne font-bold text-xl text-on-surface mb-2">
            Report Submitted
          </h3>
          <p className="text-sm text-on-surface-variant max-w-xs">
            We have received your report and will review it within 2 business
            days. You can track its status in My Submissions.
          </p>
        </div>
        <button
          onClick={() => {
            setSubmitted(false);
            setSubject("");
            setDescription("");
            setFileCount(0);
          }}
          className="text-sm font-bold text-primary hover:underline transition-all"
        >
          Submit another report
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      {/* Category */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2 ml-1">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {REPORT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                category === cat
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2 ml-1">
          Subject
        </label>
        <input
          type="text"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief title for your report…"
          className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/20 placeholder:text-outline"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2 ml-1">
          Description
        </label>
        <textarea
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue in detail…"
          rows={5}
          className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/20 resize-none placeholder:text-outline"
        />
      </div>

      {/* Evidence uploads */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2 ml-1">
          Evidence (optional)
        </label>
        <label className="flex flex-col items-center justify-center gap-3 w-full h-32 bg-surface-container-low rounded-xl border-2 border-dashed border-outline-variant/40 cursor-pointer hover:border-primary/30 hover:bg-surface-container transition-all">
          <Paperclip className="w-8 h-8 text-outline/60" />
          <span className="text-xs text-on-surface-variant">
            {fileCount > 0
              ? `${fileCount} file${fileCount > 1 ? "s" : ""} selected`
              : "Click to attach screenshots or documents"}
          </span>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            className="sr-only"
            onChange={(e) => setFileCount(e.target.files?.length ?? 0)}
          />
        </label>
      </div>

      <button
        type="submit"
        className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95"
      >
        Submit Report
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Suggestion form
// ---------------------------------------------------------------------------
const SUGGESTION_CATEGORIES: SuggestionCategory[] = [
  "User Experience (UX)",
  "Bidding Mechanics",
  "Shipping & Logistics",
  "Seller Tools",
  "Other",
];

const COMMUNITY_IDEAS = [
  {
    title: "Augmented Reality Preview",
    status: "Under Consideration",
    Icon: Lightbulb,
  },
  { title: "Dark Mode Editorial View", status: "Planned for Q2", Icon: Lightbulb },
  {
    title: "One-click re-order",
    status: "In Development",
    Icon: RefreshCw,
  },
];

function SuggestionForm() {
  const [category, setCategory] = useState<SuggestionCategory>(
    "User Experience (UX)"
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: POST /api/suggestions/  { category, title, description }
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
      {/* Form column */}
      <div className="flex-1 min-w-0">
        {submitted ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
            <div className="w-16 h-16 rounded-full bg-secondary-green/10 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-secondary-green" />
            </div>
            <div>
              <h3 className="font-syne font-bold text-xl text-on-surface mb-2">
                Suggestion Sent
              </h3>
              <p className="text-sm text-on-surface-variant max-w-xs">
                Thank you for helping us improve TradeHut. Your idea has been
                logged and will be reviewed by our product team.
              </p>
            </div>
            <button
              onClick={() => {
                setSubmitted(false);
                setTitle("");
                setDescription("");
              }}
              className="text-sm font-bold text-primary hover:underline transition-all"
            >
              Submit another idea
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
            {/* Idea title */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2 ml-1">
                Idea Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Name your idea in a few words…"
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/20 placeholder:text-outline"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2 ml-1">
                Description
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the improvement or feature you'd like to see…"
                rows={5}
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/20 resize-none placeholder:text-outline"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant block mb-2 ml-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as SuggestionCategory)
                }
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/20 appearance-none"
              >
                {SUGGESTION_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-on-primary font-bold py-4 rounded-xl shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-95"
            >
              Submit Suggestion
            </button>
          </form>
        )}
      </div>

      {/* Community ideas sidebar */}
      <aside className="w-full lg:w-80 flex-shrink-0">
        <div className="bg-surface-container-low rounded-2xl p-6 ghost-border">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-5">
            Top Community Ideas
          </h4>
          <div className="flex flex-col gap-4">
            {COMMUNITY_IDEAS.map((idea) => (
              <div key={idea.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-secondary-green/10 flex items-center justify-center flex-shrink-0">
                  <idea.Icon className="w-4 h-4 text-secondary-green" />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">
                    {idea.title}
                  </p>
                  <p className="text-[10px] text-on-surface-variant/70 mt-0.5">
                    {idea.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submissions list
// ---------------------------------------------------------------------------
function SubmissionsList() {
  const [filter, setFilter] = useState<SubmissionType | "all">("all");

  const filtered =
    filter === "all"
      ? DEMO_SUBMISSIONS
      : DEMO_SUBMISSIONS.filter((s) => s.type === filter);

  return (
    <div className="flex flex-col gap-6">
      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { value: "all", label: "All" },
            { value: "report", label: "Reports" },
            { value: "suggestion", label: "Suggestions" },
          ] as { value: SubmissionType | "all"; label: string }[]
        ).map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
              filter === opt.value
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table shell — responsive card list on mobile */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <FileText className="w-12 h-12 text-outline/40" />
          <p className="text-sm text-on-surface-variant">No submissions found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table header — hidden on mobile */}
          <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 pb-2 border-b border-outline-variant/20">
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Subject
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant w-24 text-center">
              Type
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant w-28 text-center">
              Status
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant w-28 text-right">
              Last Update
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {filtered.map((submission) => (
              <div
                key={submission.id}
                className="bg-surface-container-lowest rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 p-5 flex flex-col md:grid md:grid-cols-[1fr_auto_auto_auto] md:items-center gap-3 md:gap-4"
              >
                {/* Subject + category */}
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      submission.type === "report"
                        ? "bg-error-container/50"
                        : "bg-secondary-green/10"
                    }`}
                  >
                    {submission.type === "report" ? (
                      <FlagIcon className="w-4 h-4 text-error" />
                    ) : (
                      <Lightbulb className="w-4 h-4 text-secondary-green" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">
                      {submission.subject}
                    </p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">
                      {submission.category}
                    </p>
                  </div>
                </div>

                {/* Type badge */}
                <div className="md:w-24 md:text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      submission.type === "report"
                        ? "bg-error-container/60 text-error"
                        : "bg-secondary-green/10 text-secondary-green"
                    }`}
                  >
                    {submission.type}
                  </span>
                </div>

                {/* Status */}
                <div className="md:w-28 md:text-center">
                  <StatusPill status={submission.status} />
                </div>

                {/* Last update */}
                <div className="md:w-28 md:text-right">
                  <span className="text-xs text-on-surface-variant font-medium">
                    {submission.lastUpdate}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stats bar
// ---------------------------------------------------------------------------
const STATS = [
  {
    label: "Total Submissions",
    value: `${DEMO_SUBMISSIONS.length.toString().padStart(3, "0")}`,
    color: "text-primary",
    bg: "bg-surface-container-low",
    border: "",
  },
  {
    label: "In Review",
    value: `${DEMO_SUBMISSIONS.filter((s) => s.status === "in_review")
      .length.toString()
      .padStart(3, "0")}`,
    color: "text-secondary-green",
    bg: "bg-surface-container-low",
    border: "",
  },
  {
    label: "Resolved",
    value: `${DEMO_SUBMISSIONS.filter((s) => s.status === "resolved")
      .length.toString()
      .padStart(3, "0")}`,
    color: "text-on-surface",
    bg: "bg-surface-container-low",
    border: "",
  },
  {
    label: "Pending",
    value: `${DEMO_SUBMISSIONS.filter((s) => s.status === "pending")
      .length.toString()
      .padStart(3, "0")}`,
    color: "text-bid-amber",
    bg: "bg-bid-amber/5",
    border: "border border-bid-amber/15",
  },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("report");
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
         * NOTE: MainLayout renders <TopNav> in its sticky header.
         * pt-20 clears it; pb-20 clears the mobile bottom nav.
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
              href="/account/reports"
              onClick={() => setDrawerOpen(false)}
              className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
            >
              <Flag className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Reports &amp; Suggestions</span>
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

                <Link
                  href="/account/security"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <Shield className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Security
                  </span>
                </Link>

                {/* Reports & Suggestions — ACTIVE */}
                <Link
                  href="/account/reports"
                  className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
                >
                  <Flag className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Reports &amp; Suggestions
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

            {/* ----------------------------------------------------------------
             * MAIN CONTENT
             * ---------------------------------------------------------------- */}
            <section className="flex-1 min-w-0">

              {/* Mobile menu trigger */}
              <div className="lg:hidden flex items-center gap-3 mb-6">
                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open account menu"
                  className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface h-10 w-10 flex items-center justify-center"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="font-syne font-bold text-sm text-on-surface-variant uppercase tracking-widest">
                  Reports &amp; Suggestions
                </span>
              </div>

              {/* Page header */}
              <div className="relative mb-10 md:mb-12 overflow-hidden">
                {/* Decorative glow */}
                <div className="absolute -top-12 -left-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none -z-10" />
                <h1 className="font-syne text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tighter text-on-surface mb-3">
                  Reports &amp; Suggestions
                </h1>
                <p className="text-on-surface-variant text-sm md:text-base leading-relaxed max-w-2xl">
                  Track your issue reports, submit new ones, and share ideas to
                  help improve the TradeHut marketplace.
                </p>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className={`${stat.bg} ${stat.border} p-5 rounded-xl shadow-card`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 block mb-2">
                      {stat.label}
                    </span>
                    <div className={`font-mono text-3xl font-bold ${stat.color}`}>
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tab bar */}
              <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-8 pt-2 border-b border-outline-variant/20">
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-all duration-200 active:scale-95 border-b-2 -mb-px ${
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-on-surface-variant hover:text-on-surface hover:border-outline-variant/40"
                      }`}
                    >
                      <tab.Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
              </div>

              {/* Tab panels */}
              <div className="min-h-[400px]">
                {activeTab === "report" && <ReportForm />}
                {activeTab === "suggestion" && <SuggestionForm />}
                {activeTab === "submissions" && <SubmissionsList />}
              </div>

              {/* Support guidelines section */}
              <div className="my-12 h-px w-full bg-gradient-to-r from-transparent via-on-surface-variant/10 to-transparent" />

              <section className="mb-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="col-span-1">
                    <h2 className="font-syne text-2xl md:text-3xl font-bold tracking-tight mb-3 text-on-surface">
                      Support Guidelines
                    </h2>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Our commitment to safety and transparency is built on direct
                      user feedback.
                    </p>
                  </div>
                  <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-card">
                      <Gavel className="w-6 h-6 text-primary mb-3" />
                      <h5 className="font-bold mb-2 text-on-surface">
                        Fair Usage Policy
                      </h5>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Understand how we evaluate reports and ensure unbiased
                        mediation for all TradeHut members.
                      </p>
                    </div>
                    <div className="p-6 rounded-2xl bg-surface-container-lowest shadow-card">
                      <FileText className="w-6 h-6 text-primary mb-3" />
                      <h5 className="font-bold mb-2 text-on-surface">
                        Mediation Process
                      </h5>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        A step-by-step guide on what happens after you file a
                        report and how we reach resolutions.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </section>
          </div>
        </div>

        {/* ----------------------------------------------------------------
         * MOBILE BOTTOM NAV
         * Replaces sidebar on screens < lg.
         * TODO: extract to a shared <AccountBottomNav>
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
            href="/account/requests"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <FileText className="w-6 h-6" />
            <span className="text-[10px] font-bold">RFQs</span>
          </Link>
          <Link
            href="/account/reports"
            className="flex flex-col items-center gap-1 text-primary min-w-[44px] py-1"
          >
            <Flag className="w-6 h-6" />
            <span className="text-[10px] font-bold">Reports</span>
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
