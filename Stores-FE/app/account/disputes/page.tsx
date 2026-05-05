"use client";

/**
 * Dispute Resolution Center — 3-step wizard + existing disputes list.
 * Route: /account/disputes
 *
 * Ported from:
 *   stitch_full_website_redesign_expansion/tradehut_dispute_resolution_center_1/code.html
 *   stitch_full_website_redesign_expansion/tradehut_dispute_resolution_center_2/code.html
 *   stitch_full_website_redesign_expansion/tradehut_dispute_resolution_center_3/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline.
 * // TODO: extract to shared <AccountSidebar>
 *
 * // TODO: POST /api/disputes/ on final submit (handleSubmitDispute).
 * // TODO: GET /api/disputes/?mine=true to replace DEMO_DISPUTES list.
 */

import { useState, useRef } from "react";
import Link from "next/link";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import UploadModal from "@/components/Modal/UploadModal";
import {
  ShoppingBag,
  Gavel,
  Check,
  ArrowRight,
  ArrowLeft,
  Truck,
  ArrowLeftRight,
  ImageOff,
  FileSearch,
  RefreshCw,
  MoreHorizontal,
  CheckCircle,
  ExternalLink,
  Clock,
  Upload,
  Paperclip,
  X,
  ShieldCheck,
  PlusCircle,
  Headphones,
  MessageSquare,
  Send,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DisputeStatus = "open" | "in_review" | "resolved" | "escalated";

type DisputeReason =
  | "item_not_received"
  | "wrong_item"
  | "damaged"
  | "not_as_described"
  | "refund_not_received"
  | "other";

type DesiredResolution =
  | "full_refund"
  | "partial_refund"
  | "replacement"
  | "return_and_refund"
  | "other";

interface DemoDispute {
  id: string;
  reference: string;
  orderRef: string;
  itemTitle: string;
  status: DisputeStatus;
  reason: string;
  amount: string;
  openedDate: string;
  expectedDecision?: string;
}

interface DemoOrder {
  id: string;
  reference: string;
  title: string;
  seller: string;
  amount: string;
  date: string;
}

// ---------------------------------------------------------------------------
// Demo data
// TODO: replace with /api/disputes/?mine=true
// ---------------------------------------------------------------------------
const DEMO_DISPUTES: DemoDispute[] = [
  {
    id: "dsp-001",
    reference: "TH-8829-QX",
    orderRef: "ORD-4421",
    itemTitle: "Vintage 1960s Leica M2 Camera",
    status: "in_review",
    reason: "Item Not as Described",
    amount: "$4,250.00",
    openedDate: "Oct 18, 2023",
    expectedDecision: "Oct 24, 2023",
  },
  {
    id: "dsp-002",
    reference: "TH-7741-RK",
    orderRef: "ORD-3891",
    itemTitle: "Carbon Fibre Bicycle Frame — Pro Series",
    status: "open",
    reason: "Item Not Received",
    amount: "$1,899.00",
    openedDate: "Nov 2, 2023",
  },
  {
    id: "dsp-003",
    reference: "TH-6612-BN",
    orderRef: "ORD-2201",
    itemTitle: 'Sony A7R V Mirrorless Camera Kit (24–70mm)',
    status: "resolved",
    reason: "Damaged on Arrival",
    amount: "$3,100.00",
    openedDate: "Sep 5, 2023",
    expectedDecision: "Sep 15, 2023",
  },
  {
    id: "dsp-004",
    reference: "TH-5509-ZL",
    orderRef: "ORD-1100",
    itemTitle: "Rolex Submariner Replica Watch",
    status: "escalated",
    reason: "Wrong Item Received",
    amount: "$890.00",
    openedDate: "Aug 22, 2023",
  },
];

// TODO: replace with /api/orders/?eligible=dispute
const DEMO_ORDERS: DemoOrder[] = [
  {
    id: "ord-4421",
    reference: "ORD-4421",
    title: "Vintage 1960s Leica M2 Camera",
    seller: "LuxOptics Store",
    amount: "$4,250.00",
    date: "Oct 10, 2023",
  },
  {
    id: "ord-3891",
    reference: "ORD-3891",
    title: "Carbon Fibre Bicycle Frame — Pro Series",
    seller: "VeloTech Supplies",
    amount: "$1,899.00",
    date: "Oct 28, 2023",
  },
  {
    id: "ord-7712",
    reference: "ORD-7712",
    title: "Handmade Ceramic Tea Set (8pc)",
    seller: "ArtisanCraft Co.",
    amount: "$320.00",
    date: "Nov 5, 2023",
  },
];

const DISPUTE_REASONS: { value: DisputeReason; label: string; Icon: React.ElementType }[] =
  [
    { value: "item_not_received", label: "Item Not Received", Icon: Truck },
    { value: "wrong_item", label: "Wrong Item Sent", Icon: ArrowLeftRight },
    { value: "damaged", label: "Item Damaged", Icon: ImageOff },
    { value: "not_as_described", label: "Not as Described", Icon: FileSearch },
    {
      value: "refund_not_received",
      label: "Refund Not Received",
      Icon: RefreshCw,
    },
    { value: "other", label: "Other", Icon: MoreHorizontal },
  ];

const RESOLUTION_OPTIONS: {
  value: DesiredResolution;
  label: string;
  description: string;
}[] = [
  {
    value: "full_refund",
    label: "Full Refund",
    description: "Receive a complete refund to your original payment method.",
  },
  {
    value: "partial_refund",
    label: "Partial Refund",
    description:
      "Receive a partial refund reflecting the item's actual condition.",
  },
  {
    value: "replacement",
    label: "Replacement",
    description: "Seller sends a correct replacement item.",
  },
  {
    value: "return_and_refund",
    label: "Return & Refund",
    description: "Return the item and receive a full refund.",
  },
  {
    value: "other",
    label: "Other",
    description: "Describe your preferred outcome in the notes below.",
  },
];

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------
const STATUS_CONFIG: Record<
  DisputeStatus,
  { label: string; classes: string; dot: string }
> = {
  open: {
    label: "Open",
    classes: "bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  in_review: {
    label: "In Review",
    classes: "bg-bid-amber/10 text-bid-amber",
    dot: "bg-bid-amber animate-pulse",
  },
  resolved: {
    label: "Resolved",
    classes: "bg-bid-green/10 text-bid-green",
    dot: "bg-bid-green",
  },
  escalated: {
    label: "Escalated",
    classes: "bg-error-container text-error",
    dot: "bg-error animate-pulse",
  },
};

function StatusPill({ status }: { status: DisputeStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${cfg.classes}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------
function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  const labels = ["Select Order", "Describe Issue", "Review & Submit"];
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0 mb-8 md:mb-10">
      {labels.map((label, i) => {
        const step = i + 1;
        const isActive = step === currentStep;
        const isDone = step < currentStep;
        return (
          <div key={step} className="flex sm:items-center sm:flex-1 sm:last:flex-none">
            {/* Connector — horizontal on sm+, hidden on mobile */}
            {i > 0 && (
              <div
                className={`hidden sm:block flex-1 h-0.5 mx-2 transition-colors duration-300 ${
                  isDone ? "bg-primary" : "bg-outline-variant/30"
                }`}
              />
            )}
            {/* Node */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-on-primary shadow-card"
                    : isDone
                    ? "bg-primary/15 text-primary"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {isDone ? (
                  <Check className="w-4 h-4" />
                ) : (
                  step
                )}
              </div>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isActive
                    ? "text-primary"
                    : isDone
                    ? "text-primary/60"
                    : "text-on-surface-variant/50"
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1 — Select order + dispute reason
// ---------------------------------------------------------------------------
interface Step1Props {
  selectedOrder: string;
  setSelectedOrder: (id: string) => void;
  selectedReason: DisputeReason | "";
  setSelectedReason: (r: DisputeReason) => void;
  onNext: () => void;
}

function Step1({
  selectedOrder,
  setSelectedOrder,
  selectedReason,
  setSelectedReason,
  onNext,
}: Step1Props) {
  const canProceed = selectedOrder !== "" && selectedReason !== "";

  return (
    <div className="space-y-8">
      {/* Select order */}
      <div>
        <h3 className="font-headline font-bold text-lg text-on-surface mb-1">
          Which order is this about?
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Select the order from your purchase history that you want to raise a
          dispute for.
        </p>
        <div className="space-y-3">
          {DEMO_ORDERS.map((order) => {
            const isSelected = selectedOrder === order.id;
            return (
              <button
                key={order.id}
                onClick={() => setSelectedOrder(order.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 active:scale-[0.99] ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant/20 bg-surface-container-lowest hover:border-primary/30 hover:bg-surface-container-low"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                        {order.reference}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">
                        {order.date}
                      </span>
                    </div>
                    <p className="font-bold text-on-surface text-sm leading-tight truncate">
                      {order.title}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {order.seller}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono font-bold text-sm text-on-surface">
                      {order.amount}
                    </span>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-outline-variant"
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-on-primary" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Select reason */}
      <div>
        <h3 className="font-headline font-bold text-lg text-on-surface mb-1">
          What is the reason for your dispute?
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Choose the option that best describes your issue.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {DISPUTE_REASONS.map((r) => {
            const isSelected = selectedReason === r.value;
            return (
              <button
                key={r.value}
                onClick={() => setSelectedReason(r.value)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 active:scale-[0.98] ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-outline-variant/20 bg-surface-container-lowest hover:border-primary/30 hover:bg-surface-container-low"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  <r.Icon className="w-5 h-5" />
                </div>
                <span
                  className={`font-bold text-sm transition-colors ${
                    isSelected ? "text-primary" : "text-on-surface"
                  }`}
                >
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Next CTA */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-xl font-bold shadow-card hover:shadow-card-hover transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-card"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Describe issue, desired resolution, evidence uploads
// ---------------------------------------------------------------------------
interface Step2Props {
  description: string;
  setDescription: (v: string) => void;
  desiredResolution: DesiredResolution | "";
  setDesiredResolution: (v: DesiredResolution) => void;
  evidenceFiles: File[];
  setEvidenceFiles: (files: File[]) => void;
  onNext: () => void;
  onBack: () => void;
}

function Step2({
  description,
  setDescription,
  desiredResolution,
  setDesiredResolution,
  evidenceFiles,
  setEvidenceFiles,
  onNext,
  onBack,
}: Step2Props) {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const canProceed = description.trim().length >= 20 && desiredResolution !== "";

  function handleUpload(files: File[]) {
    setEvidenceFiles([...evidenceFiles, ...files]);
  }

  function removeFile(index: number) {
    setEvidenceFiles(evidenceFiles.filter((_, i) => i !== index));
  }

  return (
    <>
      <div className="space-y-8">
        {/* Description */}
        <div>
          <h3 className="font-headline font-bold text-lg text-on-surface mb-1">
            Describe the issue
          </h3>
          <p className="text-sm text-on-surface-variant mb-4">
            Provide a clear, detailed description of what went wrong. Include
            dates, packaging condition, and any communication with the seller.
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. I received the item on Oct 18 but found significant damage to the lens element that was not disclosed in the listing description or photos..."
            className="w-full px-4 py-3 rounded-xl bg-surface-container-low border border-outline-variant/20 text-on-surface text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 resize-none transition-all font-body min-h-[120px] md:min-h-[160px]"
          />
          <p
            className={`text-xs mt-1.5 text-right ${
              description.trim().length < 20
                ? "text-on-surface-variant/50"
                : "text-secondary-green"
            }`}
          >
            {description.trim().length} characters
            {description.trim().length < 20 && " (minimum 20)"}
          </p>
        </div>

        {/* Desired resolution */}
        <div>
          <h3 className="font-headline font-bold text-lg text-on-surface mb-1">
            What outcome are you seeking?
          </h3>
          <p className="text-sm text-on-surface-variant mb-4">
            Select your preferred resolution. The TradeHut mediation team will
            work towards this outcome.
          </p>
          <div className="space-y-3">
            {RESOLUTION_OPTIONS.map((opt) => {
              const isSelected = desiredResolution === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDesiredResolution(opt.value)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 active:scale-[0.99] ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant/20 bg-surface-container-lowest hover:border-primary/30 hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                        isSelected
                          ? "border-primary bg-primary"
                          : "border-outline-variant"
                      }`}
                    >
                      {isSelected && (
                        <Check className="w-3 h-3 text-on-primary" />
                      )}
                    </div>
                    <div>
                      <p
                        className={`font-bold text-sm ${
                          isSelected ? "text-primary" : "text-on-surface"
                        }`}
                      >
                        {opt.label}
                      </p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Evidence uploads */}
        <div>
          <h3 className="font-headline font-bold text-lg text-on-surface mb-1">
            Supporting Evidence
            <span className="ml-2 text-on-surface-variant text-sm font-body font-normal">
              (optional but recommended)
            </span>
          </h3>
          <p className="text-sm text-on-surface-variant mb-4">
            Attach photos, screenshots, or documents that support your claim.
            Strong evidence improves resolution speed.
          </p>

          {/* Trigger button / drop zone */}
          <button
            onClick={() => setUploadModalOpen(true)}
            className="w-full border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 md:p-10 flex flex-col items-center justify-center text-center group hover:border-primary/40 hover:bg-surface-container-low transition-all"
          >
            <div className="w-14 h-14 bg-surface-container-low rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Upload className="w-7 h-7 text-primary" />
            </div>
            <p className="font-bold text-on-surface text-base">
              Upload Supporting Documents
            </p>
            <p className="text-on-surface-variant text-sm mt-1 max-w-sm">
              Drag photos, videos, or PDF shipping labels here. Up to 50 MB per
              file.
            </p>
            <span className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-on-surface text-surface rounded-lg text-sm font-bold hover:bg-on-surface-variant transition-colors active:scale-95">
              Select Files
            </span>
          </button>

          {/* Attached file chips */}
          {evidenceFiles.length > 0 && (
            <div className="mt-4 space-y-2">
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
                    onClick={() => removeFile(i)}
                    className="text-outline hover:text-error transition-colors active:scale-95"
                    aria-label="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-low transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={onNext}
            disabled={!canProceed}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-xl font-bold shadow-card hover:shadow-card-hover transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-card"
          >
            Review Dispute
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleUpload}
        title="Upload Evidence"
        accept="image/*,application/pdf,video/*"
        maxFiles={10}
        maxSize="50 MB"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Step 3 — Review & submit + confirmation screen
// ---------------------------------------------------------------------------
interface Step3Props {
  selectedOrder: DemoOrder | undefined;
  selectedReason: DisputeReason | "";
  desiredResolution: DesiredResolution | "";
  description: string;
  evidenceFiles: File[];
  submitted: boolean;
  onBack: () => void;
  onSubmit: () => void;
}

function Step3({
  selectedOrder,
  selectedReason,
  desiredResolution,
  description,
  evidenceFiles,
  submitted,
  onBack,
  onSubmit,
}: Step3Props) {
  const reasonLabel =
    DISPUTE_REASONS.find((r) => r.value === selectedReason)?.label ?? "—";
  const resolutionLabel =
    RESOLUTION_OPTIONS.find((r) => r.value === desiredResolution)?.label ?? "—";

  const ReasonIcon =
    DISPUTE_REASONS.find((r) => r.value === selectedReason)?.Icon ?? MoreHorizontal;

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-bid-green/10 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-bid-green" />
        </div>
        <div>
          <h3 className="font-headline font-extrabold text-2xl text-on-surface mb-2">
            Dispute Submitted
          </h3>
          <p className="text-on-surface-variant text-sm max-w-md mx-auto leading-relaxed">
            Your case has been opened and our mediation team has been notified.
            You will receive an email confirmation shortly. Funds are secured in
            escrow until a resolution is reached.
          </p>
        </div>
        <div className="bg-surface-container-low rounded-2xl p-6 w-full max-w-sm text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Order</span>
            <span className="font-bold font-mono text-on-surface">
              {selectedOrder?.reference}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Reason</span>
            <span className="font-bold text-on-surface">{reasonLabel}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-on-surface-variant">Evidence files</span>
            <span className="font-bold text-on-surface">
              {evidenceFiles.length}
            </span>
          </div>
        </div>
        <Link
          href="/account/disputes"
          className="inline-flex items-center gap-2 bg-primary text-on-primary px-8 py-3 rounded-xl font-bold shadow-card hover:shadow-card-hover transition-all active:scale-95"
        >
          View My Disputes
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-headline font-bold text-xl text-on-surface mb-1">
          Review your dispute
        </h3>
        <p className="text-sm text-on-surface-variant">
          Please verify the details below before submitting. Once submitted, the
          TradeHut mediation team will review your case within 48 hours.
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-surface-container-low rounded-2xl p-6 space-y-5">
        {/* Order */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-outline-variant/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-5 h-5 text-on-surface-variant" />
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant">
                Order
              </p>
              <p className="font-bold text-on-surface text-sm">
                {selectedOrder?.title}
              </p>
              <p className="text-xs text-on-surface-variant">
                {selectedOrder?.reference} — {selectedOrder?.seller}
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-on-surface">
            {selectedOrder?.amount}
          </span>
        </div>

        {/* Reason + Resolution */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Dispute Reason
            </p>
            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-bold">
              <ReasonIcon className="w-4 h-4" />
              {reasonLabel}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant mb-1">
              Desired Resolution
            </p>
            <span className="inline-flex items-center gap-2 bg-surface-container text-on-surface px-3 py-1.5 rounded-lg text-sm font-bold">
              {resolutionLabel}
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant mb-2">
            Issue Description
          </p>
          <p className="text-sm text-on-surface-variant leading-relaxed bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/15">
            {description}
          </p>
        </div>

        {/* Evidence */}
        {evidenceFiles.length > 0 && (
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant mb-2">
              Evidence Files ({evidenceFiles.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {evidenceFiles.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-surface-container-lowest px-3 py-1.5 rounded-lg text-xs font-medium text-on-surface border border-outline-variant/15"
                >
                  <Paperclip className="w-3 h-3 text-secondary-green" />
                  {f.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Escrow notice */}
      <div className="flex items-start gap-4 p-5 bg-surface-container-low rounded-2xl border border-secondary-green/20">
        <ShieldCheck className="w-6 h-6 text-secondary-green flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-on-surface text-sm mb-0.5">
            Your funds are protected
          </p>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Once your dispute is submitted, the transaction amount will be held
            in secure escrow until our mediation team reaches a decision.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container-low transition-all active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onSubmit}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-3 rounded-xl font-bold shadow-card hover:shadow-card-hover transition-all active:scale-95"
        >
          <Gavel className="w-4 h-4" />
          Submit Dispute
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Existing disputes list
// ---------------------------------------------------------------------------
function DisputesList() {
  return (
    <div className="space-y-4">
      {DEMO_DISPUTES.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Gavel className="w-16 h-16 text-outline/40 mb-4" />
          <h4 className="font-headline font-bold text-lg text-on-surface mb-1">
            No disputes yet
          </h4>
          <p className="text-sm text-on-surface-variant max-w-xs">
            If you have an issue with an order, raise a dispute using the form
            above.
          </p>
        </div>
      ) : (
        DEMO_DISPUTES.map((dispute) => (
          <article
            key={dispute.id}
            className="bg-surface-container-lowest rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden"
          >
            {/* Status bar accent */}
            <div
              className={`h-1 w-full ${
                dispute.status === "in_review"
                  ? "bg-bid-amber"
                  : dispute.status === "resolved"
                  ? "bg-bid-green"
                  : dispute.status === "escalated"
                  ? "bg-error"
                  : "bg-primary"
              }`}
            />
            <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-start gap-4">
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
                <Gavel className="w-5 h-5 text-on-surface-variant" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <StatusPill status={dispute.status} />
                  <span className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
                    {dispute.reference}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    Opened {dispute.openedDate}
                  </span>
                </div>
                <h4 className="font-bold text-on-surface leading-tight mb-0.5">
                  {dispute.itemTitle}
                </h4>
                <p className="text-xs text-on-surface-variant">
                  {dispute.reason} — Order {dispute.orderRef}
                </p>
              </div>

              {/* Right side */}
              <div className="flex flex-row sm:flex-col items-start sm:items-end gap-3 flex-shrink-0">
                <span className="font-mono font-bold text-on-surface">
                  {dispute.amount}
                </span>
                {dispute.expectedDecision && (
                  <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                    <Clock className="w-3 h-3" />
                    Decision by {dispute.expectedDecision}
                  </div>
                )}
                <Link
                  href={`/account/disputes/${dispute.id}`}
                  className="text-xs font-bold text-primary hover:text-primary-container flex items-center gap-1 transition-colors"
                >
                  View Case
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function DisputesPage() {
  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 state
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedReason, setSelectedReason] = useState<DisputeReason | "">("");

  // Step 2 state
  const [description, setDescription] = useState("");
  const [desiredResolution, setDesiredResolution] = useState<
    DesiredResolution | ""
  >("");
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

  const wizardRef = useRef<HTMLDivElement>(null);

  function scrollToWizard() {
    wizardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goToStep(s: 1 | 2 | 3) {
    setStep(s);
    scrollToWizard();
  }

  function handleSubmitDispute() {
    // TODO: POST /api/disputes/ with { orderId, reason, description, desiredResolution, evidenceFiles }
    console.log("Submitting dispute:", {
      orderId: selectedOrderId,
      reason: selectedReason,
      description,
      desiredResolution,
      evidenceFileCount: evidenceFiles.length,
    });
    setSubmitted(true);
  }

  const selectedOrder = DEMO_ORDERS.find((o) => o.id === selectedOrderId);

  return (
    <>
      <AccountMobileHeader title="Dispute Resolution" />

      <section className="flex-1 min-w-0 text-on-surface font-body">

              {/* Page header */}
              <div className="mb-8 md:mb-12">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest bg-primary/10 text-primary px-2.5 py-1 rounded">
                    Resolution Center
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs font-bold text-primary uppercase tracking-tight">
                    Active
                  </span>
                </div>
                <h1 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-2">
                  Dispute Resolution
                </h1>
                <p className="text-on-surface-variant text-sm max-w-2xl leading-relaxed">
                  Our mediation team handles all disputes fairly and transparently.
                  Funds are held in secure escrow until a resolution is reached.
                </p>
              </div>

              {/* ── 3-step wizard ─────────────────────────────────────────── */}
              <div
                ref={wizardRef}
                className="bg-surface-container-lowest rounded-3xl shadow-card p-6 md:p-8 mb-10 md:mb-14"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <PlusCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-headline font-bold text-lg text-on-surface leading-tight">
                      Raise a New Dispute
                    </h2>
                    <p className="text-xs text-on-surface-variant">
                      Complete all steps to submit your case
                    </p>
                  </div>
                </div>

                <StepIndicator currentStep={step} totalSteps={3} />

                {step === 1 && (
                  <Step1
                    selectedOrder={selectedOrderId}
                    setSelectedOrder={setSelectedOrderId}
                    selectedReason={selectedReason}
                    setSelectedReason={setSelectedReason}
                    onNext={() => goToStep(2)}
                  />
                )}
                {step === 2 && (
                  <Step2
                    description={description}
                    setDescription={setDescription}
                    desiredResolution={desiredResolution}
                    setDesiredResolution={setDesiredResolution}
                    evidenceFiles={evidenceFiles}
                    setEvidenceFiles={setEvidenceFiles}
                    onNext={() => goToStep(3)}
                    onBack={() => goToStep(1)}
                  />
                )}
                {step === 3 && (
                  <Step3
                    selectedOrder={selectedOrder}
                    selectedReason={selectedReason}
                    desiredResolution={desiredResolution}
                    description={description}
                    evidenceFiles={evidenceFiles}
                    submitted={submitted}
                    onBack={() => goToStep(2)}
                    onSubmit={handleSubmitDispute}
                  />
                )}
              </div>

              {/* ── Existing disputes list ─────────────────────────────────── */}
              {!submitted && (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="font-headline font-bold text-xl text-on-surface">
                        My Disputes
                      </h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {DEMO_DISPUTES.length} active or past cases
                      </p>
                    </div>
                    {/* Divider */}
                    <div className="flex-1 mx-6 h-px bg-outline-variant/20" />
                  </div>
                  <DisputesList />
                </>
              )}

              {/* ── Support CTA ────────────────────────────────────────────── */}
              <div className="mt-10 md:mt-14 flex flex-col items-center justify-center p-8 md:p-10 bg-surface-container-low rounded-3xl text-center">
                <Headphones className="w-10 h-10 text-primary mb-4" />
                <h3 className="text-xl font-headline font-bold mb-2">
                  Need immediate assistance?
                </h3>
                <p className="text-on-surface-variant text-sm mb-6 max-w-md leading-relaxed">
                  Our live support agents are available to help clarify the
                  dispute process or answer procedural questions.
                </p>
                <button className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-4 rounded-xl font-headline font-bold tracking-wide shadow-card hover:shadow-card-hover transition-all active:scale-[0.98]">
                  <MessageSquare className="w-5 h-5" />
                  Open Live Support Chat
                </button>
              </div>
      </section>
    </>
  );
}
