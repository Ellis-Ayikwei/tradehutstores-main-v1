"use client";

/**
 * My Orders — buyer order history
 * Route: /account/orders
 *
 * Layout: shared AccountShell via app/account/layout.tsx
 *
 * Theming: every surface/text/border carries a light class and a `dark:` pair (class-based dark mode).
 * Do not use the fixed design tokens (surface-container-*, on-surface*, primary) here: they never flip.
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
  Package,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Theme classes (light + dark pair, solid colours only)
// ---------------------------------------------------------------------------
const TEXT = "text-gray-900 dark:text-gray-100";
const TEXT_MUTED = "text-gray-600 dark:text-gray-400";
const TEXT_FAINT = "text-gray-400 dark:text-gray-500";
const TEXT_BRAND = "text-orange-600 dark:text-orange-400";
const CARD = "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800";
const SUBTLE = "bg-gray-50 dark:bg-gray-800";
const HOVER_SUBTLE = "hover:bg-gray-100 dark:hover:bg-gray-800";

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
    dot: "bg-blue-600 dark:bg-blue-400",
    badge: "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100",
  },
  shipped: {
    label: "Shipped",
    dot: "bg-green-600 dark:bg-green-400",
    badge: "bg-green-100 text-green-900 dark:bg-green-900 dark:text-green-100",
  },
  delivered: {
    label: "Delivered",
    dot: "bg-gray-500 dark:bg-gray-400",
    badge: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
  },
  returned: {
    label: "Returned",
    dot: "bg-amber-600 dark:bg-amber-400",
    badge: "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-red-600 dark:bg-red-400",
    badge: "bg-red-100 text-red-900 dark:bg-red-900 dark:text-red-100",
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
      <tr className={`hidden md:table-row group ${HOVER_SUBTLE} transition-colors`}>
        <td className="px-6 py-6 lg:px-8">
          <span className={`font-mono text-sm font-bold ${TEXT_BRAND}`}>
            {order.reference}
          </span>
        </td>
        <td className="px-6 py-6 lg:px-8">
          <span className={`text-sm font-medium ${TEXT}`}>{order.date}</span>
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
                className="w-9 h-9 rounded-lg border-2 border-white dark:border-gray-900 overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 relative"
              >
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.imageAlt}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <Package className={`absolute inset-0 m-auto w-4 h-4 ${TEXT_MUTED}`} aria-label={item.imageAlt} />
                )}
              </div>
            ))}
            {order.items.length > 3 && (
              <div className={`w-9 h-9 rounded-lg border-2 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold ${TEXT_MUTED} flex-shrink-0`}>
                +{order.items.length - 3}
              </div>
            )}
          </div>
        </td>
        <td className="px-6 py-6 lg:px-8 text-right">
          <span className={`font-mono text-base font-bold ${TEXT}`}>
            {formatAmount(order.total)}
          </span>
        </td>
        <td className="px-6 py-6 lg:px-8 text-right">
          <Link
            href={`/account/orders/${order.id}`}
            className={`inline-flex items-center justify-center p-2 rounded-lg ${HOVER_SUBTLE} transition-colors active:scale-95`}
            aria-label={`View details for order ${order.reference}`}
          >
            <ChevronRight className={`w-4 h-4 ${TEXT_MUTED}`} />
          </Link>
        </td>
      </tr>

      {/* Mobile card */}
      <tr className="md:hidden">
        <td colSpan={6} className="px-3 py-1.5">
          <div className={`${CARD} rounded-2xl p-5 flex items-center gap-4`}>
            {/* Thumbnail stack */}
            <div className="flex -space-x-2 flex-shrink-0">
              {order.items.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="w-12 h-12 rounded-xl border-2 border-white dark:border-gray-900 overflow-hidden bg-gray-100 dark:bg-gray-800 relative"
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  ) : (
                    <Package className={`absolute inset-0 m-auto w-5 h-5 ${TEXT_MUTED}`} aria-label={item.imageAlt} />
                  )}
                </div>
              ))}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`font-mono text-xs font-bold ${TEXT_BRAND} truncate`}>
                  {order.reference}
                </span>
                <StatusPill status={order.status} />
              </div>
              <p className={`text-xs ${TEXT_MUTED}`}>{order.date}</p>
              <p className={`font-mono text-sm font-bold mt-1 ${TEXT}`}>
                {formatAmount(order.total)}
              </p>
            </div>
            {/* CTA */}
            <Link
              href={`/account/orders/${order.id}`}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 active:scale-95 transition-all"
              aria-label={`View order ${order.reference}`}
            >
              <ChevronRight className={`w-4 h-4 ${TEXT_MUTED}`} />
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
          <ShoppingBag className={`w-16 h-16 ${TEXT_FAINT} mb-6`} strokeWidth={1} />
          <h3 className={`font-headline font-bold text-xl ${TEXT} mb-2`}>
            No {label} found
          </h3>
          <p className={`text-sm ${TEXT_MUTED} max-w-xs`}>
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
        <h1 className={`font-syne text-3xl md:text-4xl font-bold tracking-tight ${TEXT} mb-2`}>
          Order History
        </h1>
        <p className={`${TEXT_MUTED} text-sm`}>
          Review and track your recent procurement activities.
        </p>
      </header>

      {fetchError && (
        <div
          className="mb-4 rounded-xl border border-red-300 bg-red-100 dark:border-red-800 dark:bg-red-900 px-4 py-3 text-sm text-red-900 dark:text-red-100"
          role="alert"
        >
          {fetchError}
        </div>
      )}

      {loading && (
        <p className={`text-sm ${TEXT_MUTED} mb-4`}>
          Loading orders…
        </p>
      )}

      {/* Filters bar — sticky at lg+ below the site header (matches the sidebar offset) */}
      <div className="z-10 bg-white dark:bg-gray-900 pt-2 pb-3 -mx-4 px-4 md:-mx-0 md:px-0 mb-4 lg:sticky lg:top-28">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl overflow-x-auto no-scrollbar flex-shrink-0">
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
                        ? "bg-white dark:bg-gray-900 text-orange-700 dark:text-orange-300 border border-gray-200 dark:border-gray-700"
                        : `${TEXT_MUTED} hover:bg-white dark:hover:bg-gray-900 border border-transparent`
                    }
                  `}
                >
                  {tab.label}
                  {tabCount(tab.value) > 0 && (
                    <span
                      className={`ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black
                        ${isActive ? "bg-orange-100 text-orange-900 dark:bg-orange-900 dark:text-orange-100" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"}`}
                    >
                      {tabCount(tab.value)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Date-range picker (static, TODO: wire) */}
          <div className={`${CARD} px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer ${HOVER_SUBTLE} transition-all active:scale-95 flex-shrink-0`}>
            <Calendar className={`w-4 h-4 ${TEXT_MUTED}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${TEXT}`}>
              {dateRange}
            </span>
            <ChevronDown className={`w-4 h-4 ${TEXT_MUTED}`} />
          </div>
        </div>{/* end flex-wrap row */}
      </div>{/* end sticky bar */}

      {/* Orders table */}
      <div className={`${CARD} rounded-3xl overflow-hidden`}>
        <table className="w-full text-left border-collapse">
          <thead className="hidden md:table-header-group">
            <tr className={SUBTLE}>
              {["Order ID", "Date", "Status", "Items"].map((h) => (
                <th key={h} className={`px-6 py-5 lg:px-8 text-[10px] uppercase tracking-[0.2em] font-black ${TEXT_MUTED}`}>
                  {h}
                </th>
              ))}
              <th className={`px-6 py-5 lg:px-8 text-[10px] uppercase tracking-[0.2em] font-black ${TEXT_MUTED} text-right`}>
                Total
              </th>
              <th className="px-6 py-5 lg:px-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
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
          <div className={`px-6 py-6 lg:px-8 ${SUBTLE} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
            <p className={`text-xs font-bold ${TEXT_MUTED} uppercase tracking-widest`}>
              Showing {filteredOrders.length} of {filteredOrders.length} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                className={`w-10 h-10 flex items-center justify-center rounded-xl bg-gray-200 dark:bg-gray-700 ${TEXT_FAINT} cursor-not-allowed`}
                disabled
                aria-label="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-sm">
                1
              </button>
              <button className={`w-10 h-10 flex items-center justify-center rounded-xl ${TEXT} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-sm active:scale-95`}>
                2
              </button>
              <button className={`w-10 h-10 flex items-center justify-center rounded-xl ${TEXT} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-sm active:scale-95`}>
                3
              </button>
              <span className={`px-2 ${TEXT_MUTED}`}>…</span>
              <button className={`w-10 h-10 flex items-center justify-center rounded-xl ${TEXT} hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-sm active:scale-95`}>
                12
              </button>
              <button
                className={`w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 ${TEXT} hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95`}
                aria-label="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contextual insight cards */}
      <div className="mt-10 md:mt-12 grid grid-cols-1 gap-6">
        {/* Support card */}
        <div className="bg-orange-50 dark:bg-gray-900 p-8 rounded-3xl flex flex-col justify-between border border-orange-200 dark:border-orange-900">
          <div>
            <Headphones className={`${TEXT_BRAND} mb-4 w-6 h-6`} />
            <h4 className={`font-syne font-bold text-lg mb-2 ${TEXT}`}>Need Help?</h4>
            <p className={`text-xs ${TEXT_MUTED} leading-relaxed mb-6`}>
              Call or WhatsApp us on 024 813 8722 for help with order
              tracking or disputes.
            </p>
          </div>
          <a
            href="tel:+233248138722"
            className={`min-h-[44px] ${TEXT_BRAND} font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 group/btn hover:underline transition-colors active:scale-95`}
          >
            Call 024 813 8722
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </>
  );
}
