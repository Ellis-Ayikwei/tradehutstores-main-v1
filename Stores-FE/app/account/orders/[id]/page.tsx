"use client";

/**
 * Order Detail
 * Route: /account/orders/[id]
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_order_detail/code.html
 *
 * Layout: shared AccountShell via app/account/layout.tsx
 * Sidebar is provided by AccountShell; not duplicated here.
 *
 * // TODO: fetch from /api/orders/{id}/  — currently uses demo data.
 */

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useUserAccountId } from "@/hooks/useUserAccountId";
import { getMyOrders } from "@/lib/accountApi";
import { mapApiOrderToDetail } from "@/lib/mapOrderFromApi";
import renderErrorMessage from "@/utils/renderErrorMessage";
import {
  ShoppingBag,
  Gavel,
  MapPin,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Truck,
  Download,
  CornerDownLeft,
  Check,
  Star,
  Lock,
  Headphones,
  Package,
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
// Demo fallback when API has no match (offline/dev)
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
  const { formatDisplayPrice } = useCurrency();
  const formatAmount = (n: number) => formatDisplayPrice(n);
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
  const userId = useUserAccountId();
  const { formatDisplayPrice, baseCurrency } = useCurrency();
  const formatAmount = (n: number) => formatDisplayPrice(n);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setOrder(getDemoOrder(id));
      setFetchError(null);
      return;
    }

    setFetchError(null);
    (async () => {
      try {
        const list = await getMyOrders(userId);
        const found = list.find((o) => String(o.id) === id);
        if (cancelled) return;
        if (found) {
          setOrder(mapApiOrderToDetail(found, baseCurrency) as OrderDetail);
        } else {
          setOrder(getDemoOrder(id));
          setFetchError("Order not found in your account. Showing sample data.");
        }
      } catch (e) {
        if (!cancelled) {
          setFetchError(renderErrorMessage(e));
          setOrder(getDemoOrder(id));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, userId, baseCurrency]);

  if (!order) {
    return (
      <>
        <AccountMobileHeader title="Order Details" />
        <p className="text-on-surface-variant dark:text-gray-400 text-sm">Loading…</p>
      </>
    );
  }

  return (
    <>
      <AccountMobileHeader title="Order Details" />

              {fetchError && (
                <div
                  className="mb-4 rounded-xl border border-error/30 bg-error-container/20 dark:bg-red-950/30 px-4 py-3 text-sm text-on-error-container dark:text-red-200"
                  role="alert"
                >
                  {fetchError}
                </div>
              )}

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
    </>
  );
}
