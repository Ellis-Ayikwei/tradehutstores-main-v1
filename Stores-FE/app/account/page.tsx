"use client";

/**
 * Account overview — /account
 *
 * Data (all existing endpoints via lib/accountApi):
 *   - profile:               GET users/{id}/profile/
 *   - orders:                GET users/{id}/my_orders/
 *   - unread notifications:  GET notifications/unread_count/
 *   - wishlist count:        Redux wishlist slice
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CreditCard,
  FileText,
  Gavel,
  Heart,
  LifeBuoy,
  LogIn,
  MapPin,
  PackageCheck,
  Pencil,
  RotateCcw,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  User,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Badge, SectionHeader } from "@/components/common/marketplace";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useUserAccountId } from "@/hooks/useUserAccountId";
import {
  getUserProfile,
  getMyOrders,
  getNotificationUnreadCount,
  type UserProfileResponse,
} from "@/lib/accountApi";
import {
  mapApiOrdersToListOrders,
  type OrdersListOrder,
  type OrdersListStatus,
} from "@/lib/mapOrderFromApi";
import renderErrorMessage from "@/utils/renderErrorMessage";
import { getWishlist } from "@/store/wishListSlice";
import type { AppDispatch, RootState } from "@/store";

// ---------------------------------------------------------------------------
// Shared look
// ---------------------------------------------------------------------------
const CARD =
  "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

const STATUS_BADGE: Record<
  OrdersListStatus,
  { label: string; variant: "warning" | "info" | "success" | "neutral" | "danger" }
> = {
  processing: { label: "Processing", variant: "warning" },
  shipped: { label: "Shipped", variant: "info" },
  delivered: { label: "Delivered", variant: "success" },
  returned: { label: "Returned", variant: "neutral" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

function memberSinceLabel(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

function accountTypeLabel(userType: string | undefined): string {
  if (userType === "super_admin") return "Admin";
  if (userType === "admin") return "Staff";
  return "Member";
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function OverviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading your account">
      <div className={`${CARD} animate-pulse p-4 sm:p-6`}>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-3.5 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${CARD} h-24 animate-pulse bg-gray-100 dark:bg-gray-800`} />
        ))}
      </div>
      <div className={`${CARD} animate-pulse space-y-3 p-4`}>
        <div className="h-5 w-1/4 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-14 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-14 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

function SignedOutState() {
  return (
    <div className={`${CARD} flex flex-col items-center px-6 py-12 text-center`}>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200">
        <LogIn className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-4 font-syne text-xl font-bold text-gray-900 dark:text-gray-100">
        Sign in to see your account
      </h1>
      <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
        Track orders, manage addresses, bids and requests in one place.
      </p>
      <Link
        href="/auth/login"
        className={`mt-5 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800 ${FOCUS}`}
      >
        Sign in
      </Link>
    </div>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200 sm:flex-row sm:items-center"
    >
      <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">We could not load some of your account details.</p>
        <p className="break-words text-xs">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className={`min-h-[44px] shrink-0 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-900 dark:text-red-100 ${FOCUS}`}
      >
        Try again
      </button>
    </div>
  );
}

function GreetingCard({ profile }: { profile: UserProfileResponse | null }) {
  const displayName =
    profile?.name?.trim() || profile?.username || profile?.email || "there";
  const firstName = displayName.split(/\s+/)[0] || displayName;
  const since = memberSinceLabel(profile?.date_joined);

  return (
    <div className={`${CARD} p-4 sm:p-6`}>
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-700 font-syne text-xl font-bold text-white sm:h-20 sm:w-20 sm:text-2xl"
        >
          {initialsOf(displayName)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-syne text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl">
            Hi, {firstName}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Badge variant="primary" size="md" icon={<User />}>
              {accountTypeLabel(profile?.user_type)}
            </Badge>
            {since ? (
              <span className="text-xs text-gray-600 dark:text-gray-400">Since {since}</span>
            ) : null}
          </div>
          {profile?.email ? (
            <p className="mt-1 truncate text-xs text-gray-600 dark:text-gray-400">{profile.email}</p>
          ) : null}
        </div>
        <Link
          href="/account/profile"
          className={`hidden min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 sm:inline-flex ${FOCUS}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          Edit profile
        </Link>
      </div>
      <Link
        href="/account/profile"
        className={`mt-4 flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 sm:hidden ${FOCUS}`}
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
        Edit profile
      </Link>
    </div>
  );
}

function StatTile({
  Icon,
  label,
  value,
  href,
}: {
  Icon: LucideIcon;
  label: string;
  value: number | null;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`${CARD} group flex min-h-[44px] items-center gap-3 p-3 transition-shadow hover:shadow-md sm:p-4 ${FOCUS}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-2xl font-bold leading-none text-gray-900 dark:text-gray-100">
          {value === null ? "—" : value}
        </span>
        <span className="mt-1 block truncate text-xs font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
      </span>
    </Link>
  );
}

function OrderStatusStrip({ orders }: { orders: OrdersListOrder[] }) {
  const counts = useMemo(() => {
    const c: Record<OrdersListStatus, number> = {
      processing: 0,
      shipped: 0,
      delivered: 0,
      returned: 0,
      cancelled: 0,
    };
    for (const o of orders) c[o.status] += 1;
    return c;
  }, [orders]);

  const steps: { Icon: LucideIcon; label: string; count: number }[] = [
    { Icon: ShoppingBag, label: "Processing", count: counts.processing },
    { Icon: Truck, label: "Shipped", count: counts.shipped },
    { Icon: PackageCheck, label: "Delivered", count: counts.delivered },
    { Icon: RotateCcw, label: "Returns", count: counts.returned },
  ];

  return (
    <section className={`${CARD} p-4`} aria-labelledby="orders-status-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2
          id="orders-status-heading"
          className="font-syne text-base font-bold text-gray-900 dark:text-gray-100 sm:text-lg"
        >
          My orders
        </h2>
        <Link
          href="/account/orders"
          className={`inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-sm font-semibold text-primary-700 hover:text-primary-800 dark:text-primary-300 ${FOCUS}`}
        >
          View all
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {steps.map(({ Icon, label, count }) => (
          <Link
            key={label}
            href="/account/orders"
            className={`flex min-h-[44px] flex-col items-center gap-1 rounded-lg p-2 text-center hover:bg-gray-50 dark:hover:bg-gray-800 ${FOCUS}`}
          >
            <span className="relative">
              <Icon className="h-6 w-6 text-gray-700 dark:text-gray-200" aria-hidden="true" />
              {count > 0 ? (
                <span className="absolute -right-3 -top-2 min-w-[18px] rounded-full bg-primary-700 px-1 text-center font-mono text-[10px] font-bold leading-[18px] text-white">
                  {count}
                </span>
              ) : null}
            </span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function RecentOrders({ orders }: { orders: OrdersListOrder[] }) {
  const { formatDisplayPrice } = useCurrency();
  const recent = orders.slice(0, 3);

  return (
    <section aria-labelledby="recent-orders-heading">
      <SectionHeader title="Recent orders" href="/account/orders" actionLabel="View all" />
      {recent.length === 0 ? (
        <div className={`${CARD} flex flex-col items-center px-6 py-10 text-center`}>
          <ShoppingBag className="h-10 w-10 text-gray-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
            You have not placed any orders yet
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Browse today&apos;s deals and your orders will appear here.
          </p>
          <Link
            href="/deals"
            className={`mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 ${FOCUS}`}
          >
            Shop deals
          </Link>
        </div>
      ) : (
        <ul className={`${CARD} divide-y divide-gray-100 dark:divide-gray-800`}>
          {recent.map((o) => {
            const badge = STATUS_BADGE[o.status];
            const itemCount = o.items.reduce((n, i) => n + i.qty, 0);
            return (
              <li key={o.id}>
                <Link
                  href={`/account/orders/${o.id}`}
                  className={`flex min-h-[64px] items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 sm:p-4 ${FOCUS}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <ShoppingBag className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                        {o.reference}
                      </span>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-400">
                      {o.date} &middot; {itemCount} {itemCount === 1 ? "item" : "items"}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatDisplayPrice(o.total, o.currency)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const SHORTCUTS: { Icon: LucideIcon; label: string; href: string }[] = [
  { Icon: ShoppingBag, label: "Orders", href: "/account/orders" },
  { Icon: Gavel, label: "Bids", href: "/account/bids" },
  { Icon: FileText, label: "Requests", href: "/account/requests" },
  { Icon: Scale, label: "Disputes", href: "/account/disputes" },
  { Icon: Star, label: "Reviews", href: "/account/reviews" },
  { Icon: MapPin, label: "Addresses", href: "/account/addresses" },
  { Icon: CreditCard, label: "Payments", href: "/account/payment-methods" },
  { Icon: ShieldCheck, label: "Security", href: "/account/security" },
  { Icon: ShieldCheck, label: "Verification", href: "/account/verification" },
  { Icon: Bell, label: "Notifications", href: "/account/notifications" },
];

function QuickAccess() {
  return (
    <section>
      <SectionHeader title="Quick access" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {SHORTCUTS.map(({ Icon, label, href }) => (
          <Link
            key={label}
            href={href}
            className={`${CARD} flex min-h-[56px] items-center gap-3 px-3 py-2 text-sm font-semibold text-gray-900 hover:border-primary-300 hover:shadow-md dark:text-gray-100 ${FOCUS}`}
          >
            <Icon className="h-5 w-5 shrink-0 text-primary-700 dark:text-primary-300" aria-hidden="true" />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function TrustPanel() {
  const items: { Icon: LucideIcon; title: string; body: string; href: string }[] = [
    {
      Icon: ShieldCheck,
      title: "Buyer protection",
      body: "Get help if your order does not arrive or is not as described.",
      href: "/buyer-protection",
    },
    {
      Icon: Wallet,
      title: "Secure payment",
      body: "Payment is handled securely by Paystack at checkout. No cards are stored.",
      href: "/account/payment-methods",
    },
    {
      Icon: LifeBuoy,
      title: "Help centre",
      body: "Questions about an order, return or your account.",
      href: "/help",
    },
  ];
  return (
    <section className={`${CARD} divide-y divide-gray-100 dark:divide-gray-800`} aria-label="Trust and support">
      {items.map(({ Icon, title, body, href }) => (
        <Link
          key={title}
          href={href}
          className={`flex min-h-[64px] items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 ${FOCUS}`}
        >
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">{title}</span>
            <span className="block text-xs leading-relaxed text-gray-600 dark:text-gray-400">{body}</span>
          </span>
        </Link>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AccountOverviewPage() {
  const dispatch = useDispatch<AppDispatch>();
  const userId = useUserAccountId();
  const { baseCurrency } = useCurrency();
  const { wishlist } = useSelector((state: RootState) => state.wishlist);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [orders, setOrders] = useState<OrdersListOrder[] | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    dispatch(getWishlist());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setProfile(null);
      setOrders(null);
      setUnreadNotifications(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [p, rawOrders, unread] = await Promise.all([
          getUserProfile(userId),
          getMyOrders(userId),
          getNotificationUnreadCount(),
        ]);
        if (cancelled) return;
        setProfile(p);
        setOrders(mapApiOrdersToListOrders(rawOrders, baseCurrency));
        setUnreadNotifications(unread);
      } catch (e: unknown) {
        if (!cancelled) {
          setProfile(null);
          setOrders(null);
          setError(renderErrorMessage(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, baseCurrency, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  if (!mounted || (userId && loading)) return <OverviewSkeleton />;
  if (!userId) return <SignedOutState />;

  const wishlistCount = wishlist?.item_count ?? wishlist?.items?.length ?? 0;
  const activeOrders = orders
    ? orders.filter((o) => o.status === "processing" || o.status === "shipped").length
    : null;

  return (
    <div className="space-y-5">
      {error ? <ErrorBanner message={error} onRetry={retry} /> : null}

      <GreetingCard profile={profile} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile Icon={ShoppingBag} label="Active orders" value={activeOrders} href="/account/orders" />
        <StatTile Icon={Heart} label="Wishlist" value={wishlistCount} href="/account/wishlist" />
        <StatTile Icon={Bell} label="Unread alerts" value={unreadNotifications} href="/account/notifications" />
        <StatTile Icon={Truck} label="Total orders" value={orders ? orders.length : null} href="/account/orders" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {orders ? <OrderStatusStrip orders={orders} /> : null}
          {orders ? <RecentOrders orders={orders} /> : null}
        </div>
        <aside className="space-y-5">
          <TrustPanel />
        </aside>
      </div>

      <QuickAccess />
    </div>
  );
}
