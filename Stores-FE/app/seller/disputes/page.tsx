"use client";

/**
 * Seller Dispute Queue — /seller/disputes
 *
 * Ported from:
 *   stitch_full_website_redesign_expansion/tradehut_ds_center/code.html
 *   (structural / visual inspiration; content is seller-specific per spec)
 *
 * Layout: MainLayout (nav/footer) + inner Account / dashboard shell — sidebar + main content.
 *   Sidebar: hidden md:flex, sticky.
 *   Mobile: bottom nav replaces sidebar (< md).
 *
 * Features:
 *   - KPI strip (open cases, avg response time, resolution rate)
 *   - Status tabs: Awaiting Response / In Review / Escalated / Resolved
 *   - Dispute rows: buyer name, order #, reason, opened date, SLA countdown,
 *     amount at stake, "Respond" CTA
 *   - Respond panel: evidence messages, textarea + evidence upload via <UploadModal>
 *
 * // TODO: fetch /api/seller/disputes/ to replace DEMO_SELLER_DISPUTES
 * // TODO: POST /api/seller/disputes/{id}/respond/ on respond submit
 */

import { useState, useRef } from "react";
import Link from "next/link";
import UploadModal from "@/components/Modal/UploadModal";
import {
  Gavel,
  Timer,
  ShieldCheck,
  Paperclip,
  Shield,
  X,
  CreditCard,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Bell,
  LayoutDashboard,
  ShoppingBag,
  Package,
  TrendingUp,
  Mail,
  Settings,
  Send,
  Upload,
  CheckCircle,
  Inbox,
  Clock,
  BadgeCheck,
  MessageCircle,
  MessageSquare,
  Headphones,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SellerDisputeStatus =
  | "awaiting_response"
  | "in_review"
  | "escalated"
  | "resolved";

interface SellerDispute {
  id: string;
  reference: string;
  orderRef: string;
  buyerName: string;
  reason: string;
  openedDate: string;
  /** ISO date-string for SLA deadline */
  slaDeadline: string;
  amount: string;
  status: SellerDisputeStatus;
  evidence: EvidenceMessage[];
}

interface EvidenceMessage {
  id: string;
  author: "buyer" | "seller" | "tradehut";
  authorName: string;
  body: string;
  timestamp: string;
  attachments: string[];
}

// ---------------------------------------------------------------------------
// Demo data
// TODO: replace with GET /api/seller/disputes/
// ---------------------------------------------------------------------------
const now = new Date("2026-04-24T12:00:00");

function slaFromNow(hoursLeft: number): string {
  const d = new Date(now.getTime() + hoursLeft * 3_600_000);
  return d.toISOString();
}

const DEMO_SELLER_DISPUTES: SellerDispute[] = [
  {
    id: "sd-001",
    reference: "TH-8829-QX",
    orderRef: "ORD-4421",
    buyerName: "Marcus Webb",
    reason: "Item Not as Described",
    openedDate: "Apr 21, 2026",
    slaDeadline: slaFromNow(12),
    amount: "$4,250.00",
    status: "awaiting_response",
    evidence: [
      {
        id: "ev-1",
        author: "buyer",
        authorName: "Marcus Webb",
        body: "The lens I received has visible fungus that was not disclosed in the listing. I have photos showing the issue clearly.",
        timestamp: "Apr 21, 2026 · 09:14",
        attachments: ["lens-fungus-01.jpg", "lens-fungus-02.jpg"],
      },
      {
        id: "ev-2",
        author: "tradehut",
        authorName: "TradeHut Mediation",
        body: "We have received this dispute. The seller has 48 hours to respond. Funds are held in escrow until resolution.",
        timestamp: "Apr 21, 2026 · 09:30",
        attachments: [],
      },
    ],
  },
  {
    id: "sd-002",
    reference: "TH-7741-RK",
    orderRef: "ORD-3891",
    buyerName: "Sophia Lindqvist",
    reason: "Item Not Received",
    openedDate: "Apr 19, 2026",
    slaDeadline: slaFromNow(36),
    amount: "$1,899.00",
    status: "in_review",
    evidence: [
      {
        id: "ev-3",
        author: "buyer",
        authorName: "Sophia Lindqvist",
        body: "Package tracking shows delivered but I have not received the item. Please provide shipping documentation.",
        timestamp: "Apr 19, 2026 · 14:02",
        attachments: ["tracking-screenshot.png"],
      },
      {
        id: "ev-4",
        author: "seller",
        authorName: "You",
        body: "I have uploaded the signed proof of delivery from the courier. The item was delivered to the confirmed address on Apr 18.",
        timestamp: "Apr 20, 2026 · 08:45",
        attachments: ["proof-of-delivery.pdf"],
      },
    ],
  },
  {
    id: "sd-003",
    reference: "TH-6612-BN",
    orderRef: "ORD-2201",
    buyerName: "Amara Osei",
    reason: "Damaged on Arrival",
    openedDate: "Apr 10, 2026",
    slaDeadline: slaFromNow(-48),
    amount: "$3,100.00",
    status: "escalated",
    evidence: [
      {
        id: "ev-5",
        author: "buyer",
        authorName: "Amara Osei",
        body: "The camera body arrived with a cracked LCD screen. Packaging was intact so this damage was pre-existing.",
        timestamp: "Apr 10, 2026 · 11:30",
        attachments: ["damage-front.jpg", "damage-side.jpg"],
      },
    ],
  },
  {
    id: "sd-004",
    reference: "TH-5509-ZL",
    orderRef: "ORD-1100",
    buyerName: "Lena Fischer",
    reason: "Wrong Item Received",
    openedDate: "Mar 28, 2026",
    slaDeadline: slaFromNow(-200),
    amount: "$890.00",
    status: "resolved",
    evidence: [],
  },
];

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<
  SellerDisputeStatus,
  { label: string; pillClasses: string; dot: string; accentBar: string }
> = {
  awaiting_response: {
    label: "Awaiting Response",
    pillClasses: "bg-primary/10 text-primary",
    dot: "bg-primary animate-pulse",
    accentBar: "bg-primary",
  },
  in_review: {
    label: "In Review",
    pillClasses: "bg-bid-amber/10 text-bid-amber",
    dot: "bg-bid-amber animate-pulse",
    accentBar: "bg-bid-amber",
  },
  escalated: {
    label: "Escalated",
    pillClasses: "bg-error-container text-error",
    dot: "bg-error",
    accentBar: "bg-error",
  },
  resolved: {
    label: "Resolved",
    pillClasses: "bg-bid-green/10 text-bid-green",
    dot: "bg-bid-green",
    accentBar: "bg-secondary-green",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseSla(isoStr: string): { hoursLeft: number; label: string; urgent: boolean } {
  const diffMs = new Date(isoStr).getTime() - now.getTime();
  const hoursLeft = Math.round(diffMs / 3_600_000);
  const urgent = hoursLeft <= 24 && hoursLeft > 0;
  const overdue = hoursLeft <= 0;
  const label = overdue
    ? `${Math.abs(hoursLeft)}h overdue`
    : hoursLeft < 24
    ? `${hoursLeft}h left`
    : `${Math.round(hoursLeft / 24)}d left`;
  return { hoursLeft, label, urgent: urgent || overdue };
}

// ---------------------------------------------------------------------------
// StatusPill
// ---------------------------------------------------------------------------
function StatusPill({ status }: { status: SellerDisputeStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.pillClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// SLA badge
// ---------------------------------------------------------------------------
function SlaBadge({ deadline, status }: { deadline: string; status: SellerDisputeStatus }) {
  if (status === "resolved") return null;
  const { label, urgent } = parseSla(deadline);
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
        urgent
          ? "bg-error-container text-error"
          : "bg-surface-container text-on-surface-variant"
      }`}
    >
      <Timer className="w-3 h-3" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// EvidenceThread
// ---------------------------------------------------------------------------
function EvidenceThread({ messages }: { messages: EvidenceMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant text-center py-6 italic">
        No messages yet.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const isSeller = msg.author === "seller";
        const isSystem = msg.author === "tradehut";
        return (
          <div
            key={msg.id}
            className={`flex gap-3 ${isSeller ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${
                isSystem
                  ? "bg-tertiary text-on-tertiary"
                  : isSeller
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {isSystem ? (
                <Shield className="w-4 h-4" />
              ) : (
                msg.authorName.charAt(0).toUpperCase()
              )}
            </div>

            {/* Bubble */}
            <div className={`flex-1 max-w-[80%] ${isSeller ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                  {msg.authorName}
                </span>
                <span className="text-[10px] text-outline">{msg.timestamp}</span>
              </div>
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  isSystem
                    ? "bg-tertiary-fixed text-on-tertiary-fixed rounded-tl-sm"
                    : isSeller
                    ? "bg-primary/10 text-on-surface rounded-tr-sm"
                    : "bg-surface-container-low text-on-surface rounded-tl-sm"
                }`}
              >
                {msg.body}
              </div>
              {msg.attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {msg.attachments.map((att) => (
                    <span
                      key={att}
                      className="inline-flex items-center gap-1 bg-surface-container-lowest px-2.5 py-1 rounded-lg text-xs font-medium text-on-surface-variant border border-outline-variant/20"
                    >
                      <Paperclip className="w-3 h-3" />
                      {att}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// RespondPanel — stacked detail view that opens below the row
// ---------------------------------------------------------------------------
interface RespondPanelProps {
  dispute: SellerDispute;
  onClose: () => void;
}

function RespondPanel({ dispute, onClose }: RespondPanelProps) {
  const [responseText, setResponseText] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = responseText.trim().length >= 10;

  function handleSubmit() {
    if (!canSubmit) return;
    // TODO: POST /api/seller/disputes/{dispute.id}/respond/
    console.log("Seller responding to dispute", dispute.id, {
      message: responseText,
      attachments: evidenceFiles.map((f) => f.name),
    });
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
        <div className="w-16 h-16 rounded-full bg-bid-green/10 flex items-center justify-center">
          <CheckCircle className="w-9 h-9 text-bid-green" />
        </div>
        <div>
          <h4 className="font-headline font-bold text-lg text-on-surface mb-1">
            Response Submitted
          </h4>
          <p className="text-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
            Your response has been sent to the TradeHut mediation team. You
            will be notified of any updates by email.
          </p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 bg-surface-container-low text-on-surface px-6 py-3 rounded-xl font-bold text-sm hover:bg-surface-container transition-colors active:scale-95"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusPill status={dispute.status} />
              <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
                {dispute.reference}
              </span>
            </div>
            <h3 className="font-headline font-bold text-lg text-on-surface leading-tight">
              Order {dispute.orderRef} — {dispute.reason}
            </h3>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Opened by <span className="font-bold text-on-surface">{dispute.buyerName}</span> · {dispute.openedDate}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <SlaBadge deadline={dispute.slaDeadline} status={dispute.status} />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-surface-container-low flex items-center justify-center transition-colors active:scale-95"
              aria-label="Close respond panel"
            >
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl">
          <CreditCard className="w-5 h-5 text-on-surface-variant" />
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant">
              Amount at Stake
            </p>
            <p className="font-mono text-xl font-bold text-on-surface">{dispute.amount}</p>
          </div>
          <div className="ml-auto flex items-start gap-1 text-xs text-on-surface-variant bg-surface-container px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-secondary-green mt-0.5" />
            <span>Held in escrow</span>
          </div>
        </div>

        {/* Evidence thread */}
        <div>
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant mb-4">
            Evidence &amp; Messages
          </h4>
          <EvidenceThread messages={dispute.evidence} />
        </div>

        {/* Divider */}
        <div className="h-px bg-outline-variant/20" />

        {/* Response textarea */}
        {dispute.status !== "resolved" && (
          <div className="space-y-4">
            <h4 className="font-headline font-bold text-base text-on-surface">
              Your Response
            </h4>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              rows={4}
              placeholder="Provide a clear, factual response to the buyer's claim. Include shipping details, product condition at dispatch, or any other relevant evidence..."
              className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 resize-none transition-all font-body"
            />
            <p
              className={`text-xs text-right ${
                responseText.trim().length < 10
                  ? "text-on-surface-variant/50"
                  : "text-secondary-green"
              }`}
            >
              {responseText.trim().length} characters
              {responseText.trim().length < 10 && " (minimum 10)"}
            </p>

            {/* Upload button */}
            <button
              onClick={() => setUploadOpen(true)}
              className="w-full border-2 border-dashed border-outline-variant/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center group hover:border-primary/40 hover:bg-surface-container-low transition-all"
            >
              <div className="w-12 h-12 bg-surface-container-low rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <p className="font-bold text-on-surface text-sm">
                Attach Supporting Evidence
              </p>
              <p className="text-on-surface-variant text-xs mt-1 max-w-xs">
                Photos, tracking info, invoices, or videos. Up to 50 MB per file.
              </p>
              <span className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-on-surface text-surface rounded-lg text-xs font-bold hover:bg-on-surface-variant transition-colors active:scale-95">
                Select Files
              </span>
            </button>

            {evidenceFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant">
                  Attached ({evidenceFiles.length})
                </p>
                {evidenceFiles.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-surface-container-lowest px-4 py-3 rounded-xl shadow-card"
                  >
                    <Paperclip className="w-5 h-5 text-secondary-green" />
                    <span className="flex-1 text-sm text-on-surface font-medium truncate">
                      {f.name}
                    </span>
                    <button
                      onClick={() =>
                        setEvidenceFiles(evidenceFiles.filter((_, j) => j !== i))
                      }
                      className="text-outline hover:text-error transition-colors active:scale-95"
                      aria-label="Remove file"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-low transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-3 rounded-xl font-bold shadow-card hover:shadow-card-hover transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                Submit Response
              </button>
            </div>
          </div>
        )}

        {dispute.status === "resolved" && (
          <div className="flex items-center gap-3 p-4 bg-bid-green/10 rounded-2xl text-sm text-secondary-green font-bold">
            <CheckCircle className="w-5 h-5" />
            This dispute has been resolved.
          </div>
        )}
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUpload={(files) => setEvidenceFiles((prev) => [...prev, ...files])}
        title="Upload Evidence"
        accept="image/*,application/pdf,video/*"
        maxFiles={10}
        maxSize="50 MB"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// DisputeRow
// ---------------------------------------------------------------------------
interface DisputeRowProps {
  dispute: SellerDispute;
  isOpen: boolean;
  onRespond: () => void;
  onClose: () => void;
}

function DisputeRow({ dispute, isOpen, onRespond, onClose }: DisputeRowProps) {
  const cfg = STATUS_CONFIG[dispute.status];

  return (
    <article className="bg-surface-container-lowest rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden">
      {/* Status accent bar */}
      <div className={`h-1 w-full ${cfg.accentBar}`} />

      <div className="p-5 md:p-6">
        {/* Main row */}
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Icon */}
          <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
            <Gavel className="w-5 h-5 text-on-surface-variant" />
          </div>

          {/* Middle content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <StatusPill status={dispute.status} />
              <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
                {dispute.reference}
              </span>
              <SlaBadge deadline={dispute.slaDeadline} status={dispute.status} />
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-0.5">
              <h4 className="font-bold text-on-surface leading-tight">
                Order {dispute.orderRef}
              </h4>
              <span className="text-on-surface-variant text-xs">·</span>
              <span className="text-sm text-on-surface-variant">{dispute.buyerName}</span>
            </div>
            <p className="text-xs text-on-surface-variant">
              {dispute.reason} · Opened {dispute.openedDate}
            </p>
          </div>

          {/* Right side */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
            <span className="font-mono font-bold text-on-surface">{dispute.amount}</span>
            {dispute.status !== "resolved" ? (
              <button
                onClick={isOpen ? onClose : onRespond}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  isOpen
                    ? "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    : dispute.status === "awaiting_response"
                    ? "bg-primary text-on-primary hover:shadow-card-hover"
                    : "bg-surface-container-low text-primary hover:bg-surface-container border border-primary/20"
                }`}
              >
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
                {isOpen ? "Collapse" : dispute.status === "awaiting_response" ? "Respond" : "View"}
              </button>
            ) : (
              <button
                onClick={isOpen ? onClose : onRespond}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-all active:scale-95"
              >
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {isOpen ? "Collapse" : "View"}
              </button>
            )}
          </div>
        </div>

        {/* Stacked respond panel */}
        {isOpen && (
          <div className="mt-6 pt-6 border-t border-outline-variant/15">
            <RespondPanel dispute={dispute} onClose={onClose} />
          </div>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// KPI strip
// ---------------------------------------------------------------------------
function KpiStrip() {
  // TODO: replace with live data from /api/seller/disputes/stats/
  const kpis = [
    {
      icon: <Inbox className="w-6 h-6" />,
      label: "Open Cases",
      value: "3",
      note: "2 require action",
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      label: "Avg Response Time",
      value: "14h",
      note: "vs. 24h SLA",
      accent: "text-secondary-green",
      bg: "bg-secondary-green/10",
    },
    {
      icon: <BadgeCheck className="w-6 h-6" />,
      label: "Resolution Rate",
      value: "87%",
      note: "Last 90 days",
      accent: "text-tertiary",
      bg: "bg-tertiary/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 md:mb-10">
      {kpis.map((k) => (
        <div
          key={k.label}
          className="bg-surface-container-lowest rounded-2xl shadow-card p-5 flex items-center gap-4"
        >
          <div className={`w-12 h-12 rounded-xl ${k.bg} flex items-center justify-center flex-shrink-0 ${k.accent}`}>
            {k.icon}
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant">
              {k.label}
            </p>
            <p className={`font-mono text-2xl font-bold ${k.accent}`}>{k.value}</p>
            <p className="text-xs text-on-surface-variant mt-0.5">{k.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status tabs
// ---------------------------------------------------------------------------
function StatusTabs({
  active,
  counts,
  onChange,
}: {
  active: SellerDisputeStatus | "all";
  counts: Record<SellerDisputeStatus | "all", number>;
  onChange: (s: SellerDisputeStatus | "all") => void;
}) {
  const tabs: { key: SellerDisputeStatus | "all"; label: string }[] = [
    { key: "all", label: "All" },
    { key: "awaiting_response", label: "Awaiting Response" },
    { key: "in_review", label: "In Review" },
    { key: "escalated", label: "Escalated" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 mb-6">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all active:scale-95 ${
              isActive
                ? "bg-on-surface text-surface"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span
                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  isActive ? "bg-surface/20 text-surface" : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {counts[t.key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Seller sidebar nav
// ---------------------------------------------------------------------------
function SellerSidebar() {
  const navLinks: { href: string; icon: React.ReactNode; label: string; active?: boolean }[] = [
    { href: "/seller",           icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
    { href: "/seller/orders",    icon: <ShoppingBag className="w-5 h-5" />,     label: "Orders" },
    { href: "/seller/listings",  icon: <Package className="w-5 h-5" />,         label: "Listings" },
    { href: "/seller/disputes",  icon: <Gavel className="w-5 h-5" />,           label: "Disputes", active: true },
    { href: "/seller/analytics", icon: <TrendingUp className="w-5 h-5" />,      label: "Analytics" },
    { href: "/seller/messages",  icon: <Mail className="w-5 h-5" />,            label: "Messages" },
    { href: "/seller/payments",  icon: <CreditCard className="w-5 h-5" />,      label: "Payments" },
    { href: "/seller/settings",  icon: <Settings className="w-5 h-5" />,        label: "Settings" },
  ];

  return (
    <aside className="hidden md:flex h-screen w-64 sticky left-0 top-0 flex-col py-8 px-4 bg-surface-container-low flex-shrink-0">
      {/* Brand */}
      <div className="px-4 mb-8">
        <Link href="/" className="font-syne text-xl font-black text-on-surface tracking-tighter">
          TradeHut
        </Link>
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant mt-1">
          Seller Portal
        </p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        {navLinks.map((link) =>
          link.active ? (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 text-primary-container font-bold border-r-4 border-primary-container bg-surface-container-lowest rounded-l-xl"
            >
              {link.icon}
              <span className="text-sm">{link.label}</span>
            </Link>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-3 text-on-surface opacity-70 hover:opacity-100 hover:bg-surface-container-lowest rounded-xl transition-all duration-200"
            >
              {link.icon}
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          )
        )}
      </nav>

      {/* Upgrade CTA */}
      <div className="px-4 mt-6">
        <button className="w-full primary-gradient text-on-primary py-3 rounded-xl font-bold text-sm shadow-card hover:shadow-card-hover transition-all active:scale-[0.98]">
          Upgrade Plan
        </button>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Mobile bottom nav
// ---------------------------------------------------------------------------
function MobileBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest shadow-[0_-4px_20px_0_rgba(38,24,19,0.06)] px-6 py-3 flex justify-around items-center z-50">
      <Link
        href="/seller"
        className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
      >
        <LayoutDashboard className="w-6 h-6" />
        <span className="text-[10px] font-bold">Dashboard</span>
      </Link>
      <Link
        href="/seller/orders"
        className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
      >
        <ShoppingBag className="w-6 h-6" />
        <span className="text-[10px] font-bold">Orders</span>
      </Link>
      <Link
        href="/seller/disputes"
        className="flex flex-col items-center gap-1 text-primary min-w-[44px] py-1"
      >
        <Gavel className="w-6 h-6" fill="currentColor" />
        <span className="text-[10px] font-bold">Disputes</span>
      </Link>
      <Link
        href="/seller/settings"
        className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
      >
        <Settings className="w-6 h-6" />
        <span className="text-[10px] font-bold">Settings</span>
      </Link>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function SellerDisputesPage() {
  const [activeTab, setActiveTab] = useState<SellerDisputeStatus | "all">("all");
  const [openDisputeId, setOpenDisputeId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function handleRespond(id: string) {
    setOpenDisputeId((prev) => (prev === id ? null : id));
    // Scroll to panel after a tick for layout paint
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  // Filter by tab
  const filtered =
    activeTab === "all"
      ? DEMO_SELLER_DISPUTES
      : DEMO_SELLER_DISPUTES.filter((d) => d.status === activeTab);

  // Counts
  const counts = {
    all: DEMO_SELLER_DISPUTES.length,
    awaiting_response: DEMO_SELLER_DISPUTES.filter((d) => d.status === "awaiting_response").length,
    in_review: DEMO_SELLER_DISPUTES.filter((d) => d.status === "in_review").length,
    escalated: DEMO_SELLER_DISPUTES.filter((d) => d.status === "escalated").length,
    resolved: DEMO_SELLER_DISPUTES.filter((d) => d.status === "resolved").length,
  };

  return (
    <div className="flex min-h-screen bg-surface text-on-surface font-body">
      {/* Sidebar */}
      <SellerSidebar />

      {/* Main */}
      <main className="flex-1 min-w-0 pb-24 md:pb-12">
        {/* Sticky header */}
        <header className="sticky top-0 z-40 glass-header h-16 px-4 md:px-8 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile: show brand */}
            <Link
              href="/"
              className="md:hidden font-syne text-lg font-black text-on-surface tracking-tighter"
            >
              TradeHut
            </Link>
            {/* Breadcrumb */}
            <span className="hidden md:flex items-center gap-2 text-sm text-on-surface-variant">
              <Link href="/seller" className="hover:text-primary transition-colors">
                Seller
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="font-bold text-on-surface">Disputes</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-surface-container-low rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-on-surface-variant" />
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary text-sm font-black">
              S
            </div>
          </div>
        </header>

        {/* Page body */}
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-0">

          {/* Page title */}
          <div className="mb-8 md:mb-10">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-primary/10 text-primary px-2.5 py-1 rounded">
                Resolution Center
              </span>
              {counts.awaiting_response > 0 && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-tight">
                    {counts.awaiting_response} Require Action
                  </span>
                </>
              )}
            </div>
            <h1 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2">
              Dispute Queue
            </h1>
            <p className="text-on-surface-variant text-sm max-w-2xl leading-relaxed">
              Respond promptly to open disputes. TradeHut holds funds in escrow until
              each case is resolved. Sellers with a response rate above 90% within SLA
              receive priority placement.
            </p>
          </div>

          {/* KPI strip */}
          <KpiStrip />

          {/* Tabs + list */}
          <div>
            <StatusTabs active={activeTab} counts={counts} onChange={setActiveTab} />

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-surface-container-lowest rounded-3xl shadow-card">
                <Gavel className="w-10 h-10 text-on-surface-variant mb-4" />
                <h4 className="font-headline font-bold text-lg text-on-surface mb-1">
                  No disputes in this category
                </h4>
                <p className="text-sm text-on-surface-variant max-w-xs">
                  {activeTab === "resolved"
                    ? "Resolved disputes will appear here once cases are closed."
                    : "You're all caught up."}
                </p>
              </div>
            ) : (
              <div className="space-y-4" ref={panelRef}>
                {filtered.map((dispute) => (
                  <DisputeRow
                    key={dispute.id}
                    dispute={dispute}
                    isOpen={openDisputeId === dispute.id}
                    onRespond={() => handleRespond(dispute.id)}
                    onClose={() => setOpenDisputeId(null)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Support CTA */}
          <div className="mt-10 md:mt-14 flex flex-col items-center justify-center p-8 md:p-10 bg-surface-container-low rounded-3xl text-center">
            <Headphones className="w-10 h-10 text-primary mb-4" />
            <h3 className="text-xl font-headline font-bold mb-2">
              Need mediation support?
            </h3>
            <p className="text-on-surface-variant text-sm mb-6 max-w-md leading-relaxed">
              Our seller success team can guide you through the dispute process,
              help with evidence collection, and advise on resolution strategies.
            </p>
            <button className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-4 rounded-xl font-headline font-bold tracking-wide shadow-card hover:shadow-card-hover transition-all active:scale-[0.98]">
              <MessageSquare className="w-4 h-4" />
              Contact Seller Support
            </button>
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}
