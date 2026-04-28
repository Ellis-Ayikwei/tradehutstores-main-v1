"use client";

/**
 * Order Detail
 * Route: /account/orders/[id]
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_order_detail/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 *
 * // TODO: fetch from /api/orders/{id}/  — currently uses demo data.
 */

import { useState, useEffect, use } from "react";
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
  LogOut,
  ArrowLeft,
  ArrowRight,
  Truck,
  Download,
  CornerDownLeft,
  Check,
  Star,
  Lock,
  Headphones,
  Store,
  User,
  Package,
  Menu,
  X,
  MessageCircle,
} from "lucide-react";


// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type OrderDetailStatus =
  | "processing"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "reviewed";

interface OrderLineItem {
  id: string;
  name: string;
  variant: string;
  qty: number;
  unitPrice: number;
  imageUrl: string;
  imageAlt: string;
  productSlug: string;
}

interface OrderDetail {
  id: string;
  reference: string;
  placedDate: string;
  status: OrderDetailStatus;
  /** 0-indexed index of the CURRENT step in TIMELINE_STEPS */
  timelineStep: number;
  items: OrderLineItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  paymentMethod: string;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    phone?: string;
  };
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  /** Whether this order is in a state where a seller review can be submitted */
  canReview: boolean;
}

// ---------------------------------------------------------------------------
// Timeline steps definition
// ---------------------------------------------------------------------------
type TimelineStep = {
  key: OrderDetailStatus;
  label: string;
  Icon: React.ElementType;
};

const TIMELINE_STEPS: TimelineStep[] = [
  { key: "processing",  label: "Placed",    Icon: ShoppingBag },
  { key: "confirmed",   label: "Confirmed", Icon: Check },
  { key: "shipped",     label: "Shipped",   Icon: Truck },
  { key: "delivered",   label: "Delivered", Icon: Package },
  { key: "reviewed",    label: "Reviewed",  Icon: Star },
];

// ---------------------------------------------------------------------------
// Demo data
// TODO: replace with real fetch from /api/orders/{id}/
// ---------------------------------------------------------------------------
function getDemoOrder(id: string): OrderDetail {
  return {
    id,
    reference: `#${id}`,
    placedDate: "October 24, 2023",
    status: "shipped",
    timelineStep: 2, // 0=Placed, 1=Confirmed, 2=Shipped (active), 3=Delivered, 4=Reviewed
    items: [
      {
        id: "item-1",
        name: "Velocity Max G2 Runner",
        variant: "Neon Orange / US 10.5",
        qty: 1,
        unitPrice: 189.0,
        imageUrl:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
        imageAlt: "Modern athletic sneaker in bright orange",
        productSlug: "/products/velocity-max-g2-runner",
      },
      {
        id: "item-2",
        name: "Metric Chrono Minimalist",
        variant: "Silver Mesh / 42mm",
        qty: 1,
        unitPrice: 345.0,
        imageUrl:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80",
        imageAlt: "Minimalist wrist watch with white face and silver mesh band",
        productSlug: "/products/metric-chrono-minimalist",
      },
    ],
    subtotal: 534.0,
    shipping: 12.5,
    tax: 42.72,
    total: 589.22,
    paymentMethod: "VISA ending in •••• 9284",
    shippingAddress: {
      name: "Jonathan Sterling",
      line1: "4829 Westfield Boulevard",
      line2: "Tech District, Suite 402",
      city: "Palo Alto",
      state: "CA",
      zip: "94301",
      country: "US",
      phone: "+1 (555) 092-8472",
    },
    trackingNumber: "1Z999AA10123456784",
    carrier: "UPS Ground",
    estimatedDelivery: "Oct 28, 2023",
    canReview: false,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatAmount(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

// ---------------------------------------------------------------------------
// Status pill
// ---------------------------------------------------------------------------
const STATUS_PILL: Record<
  OrderDetailStatus,
  { label: string; classes: string }
> = {
  processing: {
    label: "Processing",
    classes: "bg-tertiary/10 text-tertiary",
  },
  confirmed: {
    label: "Confirmed",
    classes: "bg-secondary-container text-on-secondary-fixed-variant",
  },
  shipped: {
    label: "Shipped",
    classes: "bg-primary-fixed text-on-primary-container",
  },
  delivered: {
    label: "Delivered",
    classes: "bg-surface-container-highest text-on-surface-variant",
  },
  reviewed: {
    label: "Reviewed",
    classes: "bg-surface-container-highest text-on-surface-variant",
  },
};

function StatusPill({ status }: { status: OrderDetailStatus }) {
  const cfg = STATUS_PILL[status];
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Order Timeline
// ---------------------------------------------------------------------------
function OrderTimeline({
  activeStep,
}: {
  activeStep: number; // 0-indexed
}) {
  // Progress bar width: each step is 1/(total-1) of the bar
  const totalSteps = TIMELINE_STEPS.length;
  const pct = Math.min(100, Math.round((activeStep / (totalSteps - 1)) * 100));

  return (
    <div className="bg-surface-container-low rounded-3xl p-6 md:p-8 mb-8 md:mb-12 shadow-sm overflow-x-auto no-scrollbar">
      <div className="relative flex justify-between items-start w-full min-w-[360px]">
        {/* Progress bar track */}
        <div className="absolute top-5 left-0 w-full h-[2px] bg-outline-variant/20">
          <div
            className="h-full bg-primary-container transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        {TIMELINE_STEPS.map((step, i) => {
          const isCompleted = i < activeStep;
          const isActive = i === activeStep;
          const isPending = i > activeStep;

          return (
            <div
              key={step.key}
              className="relative z-10 flex flex-col items-center gap-3 flex-1"
            >
              {/* Step circle */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                  ${isCompleted || isActive
                    ? "bg-primary-container text-on-primary"
                    : "bg-surface-container-highest text-on-surface-variant"
                  }
                  ${isActive ? "ring-8 ring-primary-container/10" : ""}
                `}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <step.Icon className="w-4 h-4" />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-bold uppercase tracking-widest text-center
                  ${isActive ? "text-primary-container" : ""}
                  ${isCompleted ? "text-on-surface" : ""}
                  ${isPending ? "text-on-surface-variant/60" : ""}
                `}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line item row
// ---------------------------------------------------------------------------
function LineItem({ item }: { item: OrderLineItem }) {
  const subtotal = item.unitPrice * item.qty;

  return (
    <div className="flex gap-4 md:gap-6 group">
      {/* Thumbnail */}
      <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-surface-container-low overflow-hidden flex-shrink-0 group-hover:scale-[1.02] transition-transform duration-500 relative">
        <Image
          src={item.imageUrl}
          alt={item.imageAlt}
          fill
          sizes="(max-width: 768px) 96px, 128px"
          className="object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex flex-col justify-center flex-grow min-w-0">
        <div className="flex justify-between items-start mb-1 gap-2">
          <h4 className="font-bold text-base md:text-lg text-on-surface leading-tight">
            {item.name}
          </h4>
          <span className="font-mono text-base md:text-lg font-bold text-on-surface flex-shrink-0">
            {formatAmount(subtotal)}
          </span>
        </div>

        <p className="text-sm text-on-surface-variant mb-3 md:mb-4">
          {item.variant}
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-tighter bg-surface-container text-on-surface-variant px-3 py-1 rounded-full">
            Qty: {item.qty}
          </span>
          {item.qty > 1 && (
            <span className="text-xs text-on-surface-variant">
              {formatAmount(item.unitPrice)} ea.
            </span>
          )}
          <Link
            href={item.productSlug}
            className="text-xs font-bold text-primary flex items-center gap-1 hover:underline active:scale-95 transition-transform"
          >
            View Specifications
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  // TODO: fetch from /api/orders/{id}/
  const order = getDemoOrder(id);
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
         * NOTE: The global <TopNav> is rendered by MainLayout.
         * pt-20 clears the sticky nav bar.
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
          {/* Drawer header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="font-syne text-xl font-bold text-on-surface tracking-tight">
                Account Settings
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
            <Link href="/account" onClick={() => setDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Overview</span>
            </Link>
            <Link href="/account/orders" onClick={() => setDrawerOpen(false)}
              className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200">
              <ShoppingBag className="w-5 h-5 fill-current" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Orders</span>
            </Link>
            <Link href="/account/bids" onClick={() => setDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <Gavel className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Bids &amp; Auctions</span>
            </Link>
            <Link href="/account/requests" onClick={() => setDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <FileText className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">My Requests</span>
            </Link>
            <Link href="/account/wishlist" onClick={() => setDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <Heart className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Wishlist</span>
            </Link>
            <Link href="/account/addresses" onClick={() => setDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <MapPin className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Addresses</span>
            </Link>
            <Link href="/account/payment-methods" onClick={() => setDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <CreditCard className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Payment Methods</span>
            </Link>
            <Link href="/account/notifications" onClick={() => setDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <Bell className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Notifications</span>
            </Link>
            <Link href="/account/security" onClick={() => setDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <Shield className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Security</span>
            </Link>
          </nav>
          <div className="mt-auto pt-6 border-t border-surface-container-highest/30">
            <Link href="/auth/login"
              className="w-full bg-surface-container-low text-on-surface-variant font-bold py-3 rounded-xl hover:bg-error-container hover:text-error transition-all flex items-center justify-center gap-2 active:scale-95">
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
                {/* Overview */}
                <Link
                  href="/account"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Overview
                  </span>
                </Link>

                {/* Orders — ACTIVE */}
                <Link
                  href="/account/orders"
                  className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
                >
                  <ShoppingBag className="w-5 h-5 fill-current" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Orders
                  </span>
                </Link>

                {/* Bids & Auctions */}
                <Link
                  href="/account/bids"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <Gavel className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Bids &amp; Auctions
                  </span>
                </Link>

                {/* My Requests */}
                <Link
                  href="/account/requests"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <FileText className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    My Requests
                  </span>
                </Link>

                {/* Wishlist */}
                <Link
                  href="/account/wishlist"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <Heart className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Wishlist
                  </span>
                </Link>

                {/* Addresses */}
                <Link
                  href="/account/addresses"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <MapPin className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Addresses
                  </span>
                </Link>

                {/* Payment Methods */}
                <Link
                  href="/account/payment-methods"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Payment Methods
                  </span>
                </Link>

                <div className="my-2 border-t border-outline-variant/10" />

                {/* Notifications */}
                <Link
                  href="/account/notifications"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <Bell className="w-5 h-5" />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    Notifications
                  </span>
                </Link>

                {/* Security */}
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

            {/* ----------------------------------------------------------------
             * MAIN CONTENT
             * ---------------------------------------------------------------- */}
            <section className="flex-1 min-w-0">

              {/* Mobile menu trigger — shown at <lg */}
              <div className="lg:hidden flex items-center gap-3 mb-4">
                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open account menu"
                  className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface h-10 w-10 flex items-center justify-center"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="font-syne font-bold text-sm text-on-surface-variant uppercase tracking-widest">
                  Order Details
                </span>
              </div>

              {/* ── Back breadcrumb ── */}
              <div className="mb-6">
                <Link
                  href="/account/orders"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary active:scale-95 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Order History
                </Link>
              </div>

              {/* ── Order header ── */}
              <div className="mb-6 md:mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1 className="font-syne text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-on-surface mb-2">
                    Order Details
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-on-surface-variant">
                    <span className="font-mono text-base md:text-lg font-bold text-on-surface">
                      {order.reference}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/30 flex-shrink-0" />
                    <span className="text-sm">Placed on {order.placedDate}</span>
                    <StatusPill status={order.status} />
                  </div>
                </div>

                {/* Header actions */}
                <div className="flex items-center gap-3 flex-wrap">
                  {order.trackingNumber && (
                    <button className="inline-flex items-center gap-2 px-5 py-3 bg-surface-container-low text-on-surface rounded-xl font-bold text-sm hover:bg-surface-container active:scale-95 transition-all">
                      <Truck className="w-[18px] h-[18px] text-primary-container" />
                      Track Package
                    </button>
                  )}
                  <button className="inline-flex items-center gap-2 px-5 py-3 bg-surface-container-lowest text-on-surface rounded-xl font-bold text-sm shadow-card hover:shadow-card-hover transition-all active:scale-95">
                    <Download className="w-[18px] h-[18px] text-primary-container" />
                    Download Invoice
                  </button>
                  <button className="inline-flex items-center gap-2 px-5 py-3 bg-surface-container-lowest text-on-surface-variant rounded-xl font-bold text-sm shadow-card hover:shadow-card-hover transition-all active:scale-95">
                    <CornerDownLeft className="w-[18px] h-[18px]" />
                    Request Return
                  </button>
                </div>
              </div>

              {/* ── Status timeline ── */}
              <OrderTimeline activeStep={order.timelineStep} />

              {/* ── Asymmetric content grid ── */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* ── Left / primary column ── */}
                <div className="lg:col-span-8 space-y-6">

                  {/* Order items card */}
                  <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-card">
                    <h3 className="font-headline text-xl font-bold mb-6 md:mb-8">
                      Order Items ({order.items.length})
                    </h3>
                    <div className="space-y-6 md:space-y-8">
                      {order.items.map((item, idx) => (
                        <div key={item.id}>
                          <LineItem item={item} />
                          {idx < order.items.length - 1 && (
                            <div className="mt-6 md:mt-8 border-t border-outline-variant/10" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tracking info (conditional) */}
                  {order.trackingNumber && (
                    <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-card">
                      <div className="flex items-center gap-3 mb-6">
                        <Truck className="w-5 h-5 text-primary-container" />
                        <h3 className="font-headline text-xl font-bold">
                          Tracking Information
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">
                            Tracking Number
                          </p>
                          <p className="font-mono text-sm font-bold text-on-surface">
                            {order.trackingNumber}
                          </p>
                        </div>
                        {order.carrier && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">
                              Carrier
                            </p>
                            <p className="font-bold text-sm text-on-surface">
                              {order.carrier}
                            </p>
                          </div>
                        )}
                        {order.estimatedDelivery && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1">
                              Est. Delivery
                            </p>
                            <p className="font-bold text-sm text-on-surface">
                              {order.estimatedDelivery}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rate seller card */}
                  <div className="bg-gradient-to-br from-secondary-container to-surface-container-low rounded-3xl p-6 md:p-8 shadow-card relative overflow-hidden group">
                    {/* Decorative icon */}
                    <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                      <Star className="w-[120px] h-[120px]" />
                    </div>

                    <div className="relative z-10 max-w-md">
                      <h3 className="font-headline text-xl font-bold mb-2 text-on-secondary-container">
                        Satisfied with your items?
                      </h3>
                      <p className="text-sm text-on-secondary-container/80 mb-6 leading-relaxed">
                        Your feedback helps our community of traders find the best
                        sellers. Rate this transaction once delivered.
                      </p>
                      <button
                        className="px-6 py-3 bg-secondary-green text-on-secondary rounded-xl font-bold flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!order.canReview}
                      >
                        Rate this Seller
                        {!order.canReview && (
                          <Lock className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Right / sidebar column ── */}
                <div className="lg:col-span-4 space-y-6 md:space-y-8">

                  {/* Payment summary */}
                  <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 shadow-card border border-outline-variant/10">
                    <h3 className="font-headline text-xl font-bold mb-6">
                      Payment Summary
                    </h3>

                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center text-on-surface-variant">
                        <span className="text-sm">Subtotal</span>
                        <span className="font-mono">{formatAmount(order.subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-on-surface-variant">
                        <span className="text-sm">Shipping</span>
                        <span className="font-mono">{formatAmount(order.shipping)}</span>
                      </div>
                      <div className="flex justify-between items-center text-on-surface-variant">
                        <span className="text-sm">Tax (HST)</span>
                        <span className="font-mono">{formatAmount(order.tax)}</span>
                      </div>
                      <div className="pt-4 mt-4 border-t border-outline-variant/10 flex justify-between items-center">
                        <span className="font-bold text-on-surface">Order Total</span>
                        <span className="font-mono text-2xl font-bold text-primary-container">
                          {formatAmount(order.total)}
                        </span>
                      </div>
                    </div>

                    {/* Payment method chip */}
                    <div className="p-4 bg-surface-container rounded-xl flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-primary-container" />
                      <div className="text-xs">
                        <p className="font-bold uppercase tracking-tighter opacity-60">
                          Payment Method
                        </p>
                        <p className="text-on-surface font-medium">
                          {order.paymentMethod}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Shipping address */}
                  <div className="bg-surface-container-low rounded-3xl p-6 md:p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <MapPin className="w-5 h-5 text-primary-container" />
                      <h3 className="font-bold text-on-surface">
                        Delivery Address
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-on-surface">
                        {order.shippingAddress.name}
                      </p>
                      <p className="text-on-surface-variant text-sm">
                        {order.shippingAddress.line1}
                      </p>
                      {order.shippingAddress.line2 && (
                        <p className="text-on-surface-variant text-sm">
                          {order.shippingAddress.line2}
                        </p>
                      )}
                      <p className="text-on-surface-variant text-sm">
                        {order.shippingAddress.city},{" "}
                        {order.shippingAddress.state}{" "}
                        {order.shippingAddress.zip}
                      </p>
                      {order.shippingAddress.phone && (
                        <p className="text-on-surface-variant text-sm mt-3">
                          {order.shippingAddress.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Secondary actions */}
                  <div className="flex flex-col gap-3">
                    <button className="w-full py-4 text-center text-on-surface-variant font-bold hover:bg-surface-container rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                      <Gavel className="w-5 h-5" />
                      Dispute Center
                    </button>
                    <button className="w-full py-4 text-center text-on-surface-variant font-bold hover:bg-surface-container rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                      <CornerDownLeft className="w-5 h-5" />
                      Initiate Return
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Support CTA ── */}
              <div className="mt-10 md:mt-12 bg-surface-container-low p-6 md:p-8 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-primary/5">
                <div className="flex items-start gap-4">
                  <Headphones className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-syne font-bold text-base mb-1">
                      Need Help with This Order?
                    </h4>
                    <p className="text-xs text-on-surface-variant/70 leading-relaxed">
                      Our dedicated trade managers are available 24/7 to assist
                      with tracking, disputes, or returns.
                    </p>
                  </div>
                </div>
                <button className="flex-shrink-0 text-primary font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 group/btn hover:opacity-70 transition-all active:scale-95 whitespace-nowrap">
                  Contact Support
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </section>
          </div>
        </div>

        {/* ----------------------------------------------------------------
         * MOBILE BOTTOM NAV
         * Replaces the sidebar on small screens (< lg).
         * TODO: extract to a shared <AccountBottomNav> once the component exists.
         * ---------------------------------------------------------------- */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest shadow-[0_-4px_20px_0_rgba(38,24,19,0.06)] px-6 py-3 flex justify-around items-center z-50">
          <Link
            href="/"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <Store className="w-6 h-6" />
            <span className="text-[10px] font-bold">Home</span>
          </Link>
          {/* Orders — ACTIVE (order detail is a sub-page of orders) */}
          <Link
            href="/account/orders"
            className="flex flex-col items-center gap-1 text-primary min-w-[44px] py-1"
          >
            <ShoppingBag className="w-6 h-6 fill-current" />
            <span className="text-[10px] font-bold">Orders</span>
          </Link>
          <Link
            href="/account/bids"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <Gavel className="w-6 h-6" />
            <span className="text-[10px] font-bold">Bids</span>
          </Link>
          <Link
            href="/account/messages"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="text-[10px] font-bold">Messages</span>
          </Link>
          <Link
            href="/account"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold">Account</span>
          </Link>
        </nav>
      </div>
    </MainLayout>
  );
}
