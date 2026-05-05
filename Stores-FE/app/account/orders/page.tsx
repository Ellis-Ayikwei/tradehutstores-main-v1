"use client";

/**
 * My Orders — buyer order history
 * Route: /account/orders
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_my_orders/code.html
 *
 * Layout: shared AccountShell via app/account/layout.tsx
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useUserAccountId } from "@/hooks/useUserAccountId";
import { getMyOrders } from "@/lib/accountApi";
import { mapApiOrdersToListOrders } from "@/lib/mapOrderFromApi";
import renderErrorMessage from "@/utils/renderErrorMessage";
import {
  ShoppingBag,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown,
  Headphones,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type OrderStatus =
  | "all"
  | "processing"
  | "shipped"
  | "delivered"
  | "returned"
  | "cancelled";

interface OrderItem {
  id: string;
  name: string;
  imageUrl: string;
  imageAlt: string;
  qty: number;
  unitPrice: number;
}

interface Order {
  id: string;
  reference: string;
  date: string;
  total: number;
  currency: string;
  status: Exclude<OrderStatus, "all">;
  items: OrderItem[];
}

// ---------------------------------------------------------------------------
// Status tab definitions
// ---------------------------------------------------------------------------
const STATUS_TABS: { label: string; value: OrderStatus }[] = [
  { label: "All Orders", value: "all" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Returned", value: "returned" },
  { label: "Cancelled", value: "cancelled" },
];

// ---------------------------------------------------------------------------
// Status pill config
// ---------------------------------------------------------------------------
type ConcreteStatus = Exclude<OrderStatus, "all">;

const STATUS_CONFIG: Record<
  ConcreteStatus,
  { label: string; dot: string; badge: string }
> = {
  processing: {
    label: "Processing",
    dot: "bg-tertiary",
    badge: "bg-tertiary-container/20 text-tertiary",
  },
  shipped: {
    label: "Shipped",
    dot: "bg-secondary-green",
    badge: "bg-secondary-container text-on-secondary-fixed-variant",
  },
  delivered: {
    label: "Delivered",
    dot: "bg-on-surface-variant",
    badge: "bg-surface-container-highest text-on-surface-variant",
  },
  returned: {
    label: "Returned",
    dot: "bg-bid-amber",
    badge: "bg-bid-amber/10 text-bid-amber",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-error",
    badge: "bg-error-container text-on-error-container",
  },
};

function StatusPill({ status }: { status: ConcreteStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Order row (used in table on md+ and card on mobile)
// ---------------------------------------------------------------------------
function OrderRow({ order }: { order: Order }) {
  const { formatDisplayPrice } = useCurrency();
  const formatAmount = (n: number) =>
    formatDisplayPrice(n, order.currency);

  return (
    <>
      {/* Desktop table row (md+) */}
      <tr className="hidden md:table-row group hover:bg-surface-container-low/30 dark:hover:bg-gray-800/40 transition-colors">
        <td className="px-6 py-6 lg:px-8">
          <span className="font-mono text-sm font-bold text-primary dark:text-orange-400">
            {order.reference}
          </span>
        </td>
        <td className="px-6 py-6 lg:px-8">
          <span className="text-sm font-medium text-on-surface dark:text-gray-100">{order.date}</span>
        </td>
        <td className="px-6 py-6 lg:px-8">
          <StatusPill status={order.status} />
        </td>
        <td className="px-6 py-6 lg:px-8">
          {/* Item thumbnails (up to 3) */}
          <div className="flex -space-x-2">
            {order.items.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="w-9 h-9 rounded-lg border-2 border-surface-container-lowest overflow-hidden bg-surface-container-low flex-shrink-0 relative"
              >
                <Image
                  src={item.imageUrl}
                  alt={item.imageAlt}
                  fill
                  sizes="36px"
                  className="object-cover"
                />
              </div>
            ))}
            {order.items.length > 3 && (
              <div className="w-9 h-9 rounded-lg border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center text-[10px] font-bold text-on-surface-variant flex-shrink-0">
                +{order.items.length - 3}
              </div>
            )}
          </div>
        </td>
        <td className="px-6 py-6 lg:px-8 text-right">
          <span className="font-mono text-base font-bold text-on-surface dark:text-gray-100">
            {formatAmount(order.total)}
          </span>
        </td>
        <td className="px-6 py-6 lg:px-8 text-right">
          <Link
            href={`/account/orders/${order.id}`}
            className="inline-flex items-center justify-center p-2 rounded-lg hover:bg-surface-container-high transition-colors active:scale-95"
            aria-label={`View details for order ${order.reference}`}
          >
            <ChevronRight className="w-4 h-4 text-on-surface-variant" />
          </Link>
        </td>
      </tr>

      {/* Mobile card */}
      <tr className="md:hidden">
        <td colSpan={6} className="px-0 py-0">
          <div className="bg-surface-container-lowest dark:bg-gray-900 rounded-2xl shadow-card dark:border dark:border-gray-800 p-5 mb-3 flex items-center gap-4">
            {/* Thumbnail stack */}
            <div className="flex -space-x-2 flex-shrink-0">
              {order.items.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="w-12 h-12 rounded-xl border-2 border-surface-container-lowest overflow-hidden bg-surface-container-low relative"
                >
                  <Image
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-primary dark:text-orange-400 truncate">
                  {order.reference}
                </span>
                <StatusPill status={order.status} />
              </div>
              <p className="text-xs text-on-surface-variant">{order.date}</p>
              <p className="font-mono text-sm font-bold mt-1">
                {formatAmount(order.total)}
              </p>
            </div>
            {/* CTA */}
            <Link
              href={`/account/orders/${order.id}`}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-low hover:bg-surface-container active:scale-95 transition-all"
              aria-label={`View order ${order.reference}`}
            >
              <ChevronRight className="w-4 h-4 text-on-surface-variant" />
            </Link>
          </div>
        </td>
      </tr>
    </>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ status }: { status: OrderStatus }) {
  const label = status === "all" ? "orders" : `${status} orders`;
  return (
    <tr>
      <td colSpan={6}>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <ShoppingBag className="w-16 h-16 text-outline/40 mb-6" strokeWidth={1} />
          <h3 className="font-headline font-bold text-xl text-on-surface mb-2">
            No {label} found
          </h3>
          <p className="text-sm text-on-surface-variant max-w-xs">
            {status === "all"
              ? "Your order history will appear here once you make your first purchase."
              : `You have no ${status} orders right now.`}
          </p>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Page component (client — needs useState for active tab / date filter)
// ---------------------------------------------------------------------------
export default function MyOrdersPage() {
  const userId = useUserAccountId();
  const { baseCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<OrderStatus>("all");
  const [dateRange] = useState<string>("Last 3 Months");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      setFetchError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFetchError(null);
    (async () => {
      try {
        const raw = await getMyOrders(userId);
        if (cancelled) return;
        setOrders(mapApiOrdersToListOrders(raw, baseCurrency));
      } catch (e: unknown) {
        if (!cancelled) {
          setFetchError(renderErrorMessage(e));
          setOrders([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, baseCurrency]);

  const filteredOrders =
    activeTab === "all"
      ? orders
      : orders.filter((o) => o.status === activeTab);

  const tabCount = (v: OrderStatus) =>
    v === "all"
      ? orders.length
      : orders.filter((o) => o.status === v).length;

  return (
    <>
      <AccountMobileHeader title="Order History" />

      {/* Page header */}
              <header className="mb-6 md:mb-10">
                <h1 className="font-syne text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-2">
                  Order History
                </h1>
                <p className="text-on-surface-variant text-sm">
                  Review and track your recent procurement activities.
                </p>
              </header>

              {fetchError && (
                <div
                  className="mb-4 rounded-xl border border-error/30 bg-error-container/20 dark:bg-red-950/30 px-4 py-3 text-sm text-on-error-container dark:text-red-200"
                  role="alert"
                >
                  {fetchError}
                </div>
              )}

              {loading && (
                <p className="text-sm text-on-surface-variant dark:text-gray-400 mb-4">
                  Loading orders…
                </p>
              )}

              {/* Filters bar — sticky so tabs are always reachable while scrolling */}
              <div className="sticky top-0 z-10 bg-surface/90 dark:bg-gray-950/90 backdrop-blur pt-2 pb-4 -mx-4 px-4 md:-mx-0 md:px-0 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Status tabs */}
                <div className="flex items-center gap-1 bg-surface-container-low p-1.5 rounded-xl overflow-x-auto no-scrollbar flex-shrink-0">
                  {STATUS_TABS.map((tab) => {
                    const isActive = activeTab === tab.value;
                    return (
                      <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`
                          px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider
                          whitespace-nowrap transition-all duration-200 active:scale-95
                          ${
                            isActive
                              ? "bg-surface-container-lowest shadow-sm text-primary"
                              : "text-on-surface-variant hover:bg-surface-container-lowest/50"
                          }
                        `}
                      >
                        {tab.label}
                        {tabCount(tab.value) > 0 && (
                          <span
                            className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black
                              ${isActive ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant"}`}
                          >
                            {tabCount(tab.value)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Date-range picker (static, TODO: wire) */}
                <div className="bg-surface-container-lowest shadow-card px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer hover:shadow-card-hover transition-all active:scale-95 flex-shrink-0">
                  <Calendar className="w-4 h-4 text-on-surface-variant" />
                  <span className="text-xs font-bold uppercase tracking-wider text-on-surface">
                    {dateRange}
                  </span>
                  <ChevronDown className="w-4 h-4 text-on-surface-variant" />
                </div>
                </div>{/* end flex-wrap row */}
              </div>{/* end sticky bar */}

              {/* Orders table */}
              <div className="bg-surface-container-lowest dark:bg-gray-900 dark:border dark:border-gray-800 rounded-3xl shadow-card overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="hidden md:table-header-group">
                    <tr className="bg-surface-container-low/50">
                      <th className="px-6 py-5 lg:px-8 text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant/60">
                        Order ID
                      </th>
                      <th className="px-6 py-5 lg:px-8 text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant/60">
                        Date
                      </th>
                      <th className="px-6 py-5 lg:px-8 text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant/60">
                        Status
                      </th>
                      <th className="px-6 py-5 lg:px-8 text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant/60">
                        Items
                      </th>
                      <th className="px-6 py-5 lg:px-8 text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant/60 text-right">
                        Total
                      </th>
                      <th className="px-6 py-5 lg:px-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low md:divide-y">
                    {filteredOrders.length === 0 ? (
                      <EmptyState status={activeTab} />
                    ) : (
                      filteredOrders.map((order) => (
                        <OrderRow key={order.id} order={order} />
                      ))
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                {filteredOrders.length > 0 && (
                  <div className="px-6 py-6 lg:px-8 bg-surface-container-low/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <p className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
                      Showing {filteredOrders.length} of {filteredOrders.length} orders
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-lowest shadow-sm opacity-50 cursor-not-allowed"
                        disabled
                        aria-label="Previous page"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-on-primary shadow-card font-bold text-sm">
                        1
                      </button>
                      <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container-high transition-colors font-bold text-sm active:scale-95">
                        2
                      </button>
                      <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container-high transition-colors font-bold text-sm active:scale-95">
                        3
                      </button>
                      <span className="px-2 text-on-surface-variant">…</span>
                      <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-surface-container-high transition-colors font-bold text-sm active:scale-95">
                        12
                      </button>
                      <button
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container-lowest shadow-sm hover:bg-surface-container-high transition-all active:scale-95"
                        aria-label="Next page"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Contextual insight cards */}
              <div className="mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Procurement insights CTA */}
                <div className="md:col-span-2 bg-gradient-to-br from-primary to-primary-container p-8 rounded-3xl relative overflow-hidden text-on-primary group">
                  <div className="relative z-10">
                    <h3 className="font-syne text-2xl font-bold mb-4">
                      Procurement Insights
                    </h3>
                    <p className="text-on-primary/80 max-w-md mb-6 leading-relaxed text-sm">
                      Your spending has increased by 14% compared to last quarter.
                      You have 3 open RFQs requiring immediate attention to secure
                      bulk discounts.
                    </p>
                    <Link
                      href="/account/requests"
                      className="inline-block bg-surface-container-lowest text-primary px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform active:scale-95"
                    >
                      Review Open RFQs
                    </Link>
                  </div>
                  {/* Decorative icon */}
                  <div className="absolute -right-8 -bottom-8 opacity-20 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                    <ArrowRight className="w-[200px] h-[200px]" />
                  </div>
                </div>

                {/* Support card */}
                <div className="bg-surface-container-low p-8 rounded-3xl flex flex-col justify-between border border-primary/5">
                  <div>
                    <Headphones className="text-primary mb-4 w-6 h-6" />
                    <h4 className="font-syne font-bold text-lg mb-2">Need Help?</h4>
                    <p className="text-xs text-on-surface-variant/70 leading-relaxed mb-6">
                      Our dedicated trade managers are available 24/7 to assist with
                      order tracking or disputes.
                    </p>
                  </div>
                  <button className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 group/btn hover:opacity-70 transition-opacity active:scale-95">
                    Contact Support
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
    </>
  );
}
