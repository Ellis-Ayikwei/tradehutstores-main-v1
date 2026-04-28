"use client";

/**
 * My Orders — buyer order history
 * Route: /account/orders
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_my_orders/code.html
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
  LogOut,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ChevronDown,
  Headphones,
  Store,
  User,
  Menu,
  X,
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
// Demo data
// TODO: fetch from /api/orders/?mine=true&status=...
// ---------------------------------------------------------------------------
const DEMO_ORDERS: Order[] = [
  {
    id: "TH-90210-XB",
    reference: "#TH-90210-XB",
    date: "Oct 24, 2023",
    total: 12450.0,
    currency: "USD",
    status: "shipped",
    items: [
      {
        id: "i1",
        name: "Velocity Max G2 Runner",
        imageUrl:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80",
        imageAlt: "Running shoe",
        qty: 2,
        unitPrice: 189,
      },
      {
        id: "i2",
        name: "Metric Chrono Minimalist Watch",
        imageUrl:
          "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80",
        imageAlt: "Minimalist watch",
        qty: 1,
        unitPrice: 345,
      },
    ],
  },
  {
    id: "TH-88432-ML",
    reference: "#TH-88432-ML",
    date: "Oct 21, 2023",
    total: 3120.45,
    currency: "USD",
    status: "processing",
    items: [
      {
        id: "i3",
        name: "Pro Wireless Earbuds",
        imageUrl:
          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80",
        imageAlt: "Wireless earbuds",
        qty: 3,
        unitPrice: 1040.15,
      },
    ],
  },
  {
    id: "TH-77219-ZA",
    reference: "#TH-77219-ZA",
    date: "Oct 15, 2023",
    total: 890.0,
    currency: "USD",
    status: "delivered",
    items: [
      {
        id: "i4",
        name: "Ergonomic Laptop Stand",
        imageUrl:
          "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=200&q=80",
        imageAlt: "Laptop stand",
        qty: 1,
        unitPrice: 890,
      },
    ],
  },
  {
    id: "TH-66504-KP",
    reference: "#TH-66504-KP",
    date: "Oct 09, 2023",
    total: 45200.0,
    currency: "USD",
    status: "delivered",
    items: [
      {
        id: "i5",
        name: "Industrial Grade Server Rack",
        imageUrl:
          "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&q=80",
        imageAlt: "Server rack",
        qty: 4,
        unitPrice: 11300,
      },
    ],
  },
  {
    id: "TH-55102-RK",
    reference: "#TH-55102-RK",
    date: "Sep 30, 2023",
    total: 620.0,
    currency: "USD",
    status: "returned",
    items: [
      {
        id: "i6",
        name: "Smart Home Hub",
        imageUrl:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&q=80",
        imageAlt: "Smart home hub",
        qty: 1,
        unitPrice: 620,
      },
    ],
  },
  {
    id: "TH-44891-VD",
    reference: "#TH-44891-VD",
    date: "Sep 22, 2023",
    total: 1780.0,
    currency: "USD",
    status: "cancelled",
    items: [
      {
        id: "i7",
        name: "Premium Coffee Maker",
        imageUrl:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&q=80",
        imageAlt: "Coffee maker",
        qty: 2,
        unitPrice: 890,
      },
    ],
  },
];

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
// Format currency
// ---------------------------------------------------------------------------
function formatAmount(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

// ---------------------------------------------------------------------------
// Order row (used in table on md+ and card on mobile)
// ---------------------------------------------------------------------------
function OrderRow({ order }: { order: Order }) {
  return (
    <>
      {/* Desktop table row (md+) */}
      <tr className="hidden md:table-row group hover:bg-surface-container-low/30 transition-colors">
        <td className="px-6 py-6 lg:px-8">
          <span className="font-mono text-sm font-bold text-primary">
            {order.reference}
          </span>
        </td>
        <td className="px-6 py-6 lg:px-8">
          <span className="text-sm font-medium text-on-surface">{order.date}</span>
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
          <span className="font-mono text-base font-bold text-on-surface">
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
          <div className="bg-surface-container-lowest rounded-2xl shadow-card p-5 mb-3 flex items-center gap-4">
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
                <span className="font-mono text-xs font-bold text-primary truncate">
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
  const [activeTab, setActiveTab] = useState<OrderStatus>("all");
  // TODO: wire date-range filter to API query
  const [dateRange] = useState<string>("Last 3 Months");
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

  // TODO: fetch from /api/orders/?mine=true&status=...
  const filteredOrders =
    activeTab === "all"
      ? DEMO_ORDERS
      : DEMO_ORDERS.filter((o) => o.status === activeTab);

  const tabCount = (v: OrderStatus) =>
    v === "all"
      ? DEMO_ORDERS.length
      : DEMO_ORDERS.filter((o) => o.status === v).length;

  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface font-body">
        {/*
         * NOTE: The global <TopNav> is rendered by MainLayout and
         * must NOT be modified here. The pt-20 below clears it.
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

        <div className="pt-20 pb-20 md:pb-12 px-4 md:px-8 max-w-screen-2xl mx-auto">
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

              {/* Sign out */}
              <div className="mt-auto pt-6 border-t border-surface-container-highest/30">
                <Link
                  href="/auth/login"
                  className="w-full bg-surface-container-low text-on-surface-variant font-bold py-3 rounded-xl hover:bg-error-container hover:text-error transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
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
                  Order History
                </span>
              </div>

              {/* Page header */}
              <header className="mb-6 md:mb-10">
                <h1 className="font-syne text-3xl md:text-4xl font-bold tracking-tight text-on-surface mb-2">
                  Order History
                </h1>
                <p className="text-on-surface-variant text-sm">
                  Review and track your recent procurement activities.
                </p>
              </header>

              {/* Filters bar — sticky so tabs are always reachable while scrolling */}
              <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur pt-2 pb-4 -mx-4 px-4 md:-mx-0 md:px-0 mb-4">
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
              <div className="bg-surface-container-lowest rounded-3xl shadow-card overflow-hidden">
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
            href="/account/orders"
            className="flex flex-col items-center gap-1 text-primary min-w-[44px] py-1"
          >
            <ShoppingBag className="w-6 h-6 fill-current" />
            <span className="text-[10px] font-bold">Orders</span>
          </Link>
          <Link
            href="/account/requests"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <FileText className="w-6 h-6" />
            <span className="text-[10px] font-bold">RFQs</span>
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
