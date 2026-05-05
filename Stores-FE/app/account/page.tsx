"use client";

/**
 * Account Overview — landing page for /account
 *
 * Ported from two Stitch sources (merged):
 *   - PRIMARY layout + KPI cards + activity feed + security panel:
 *       stitch_full_website_redesign_expansion/tradehut_account_overview/code.html
 *   - Greeting hero (avatar + name) + order-fulfillment shortcut grid
 *     + recommended products strip + wallet/credits stat:
 *       stitch_full_website_redesign_expansion/tradehut_account_central/code.html
 *
 * TODO: fetch from /api/account/summary to replace all mock data below.
 *
 * Layout: shared AccountShell via app/account/layout.tsx
 */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useUserAccountId } from "@/hooks/useUserAccountId";
import {
  getUserProfile,
  getMyOrders,
  getNotificationUnreadCount,
  type UserProfileResponse,
} from "@/lib/accountApi";
import { getWishlist } from "@/store/wishListSlice";
import type { AppDispatch, RootState } from "@/store";
import {
  ShoppingBag,
  Gavel,
  FileText,
  Heart,
  MapPin,
  CreditCard,
  Bell,
  Shield,
  Star,
  ArrowRight,
  Pencil,
  Share2,
  Truck,
  PiggyBank,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock data — replace with API call
// TODO: fetch from /api/account/summary
// ---------------------------------------------------------------------------
const MOCK_USER = {
  name: "Ellis Armahayikwei",
  memberSince: "March 2022",
  tier: "Platinum",
  avatarUrl: "https://i.pravatar.cc/96?img=3",
  avatarAlt: "Account avatar",
};

const MOCK_SNAPSHOT = {
  activeOrders: 3,
  openRFQs: 1,
  activeBids: 2,
  wishlistCount: 12,
  unreadMessages: 4,
  lifetimeSavings: 1240,
  storeCredits: 4200,
};

type ActivityType = "order" | "bid" | "rfq" | "review";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  detail: string;
  timeLabel: string;
  href: string;
}

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: "act-1",
    type: "order",
    title: "Order #99284 shipped",
    detail: "The logistics provider has updated the status to in-transit.",
    timeLabel: "2h ago",
    href: "/account/orders",
  },
  {
    id: "act-2",
    type: "bid",
    title: "Outbid on Sony WH-1000XM5",
    detail: "A new bid of $285.00 was placed by another buyer.",
    timeLabel: "5h ago",
    href: "/account/bids",
  },
  {
    id: "act-3",
    type: "rfq",
    title: "New offer on RFQ #721",
    detail: "Supplier ElectronicsHub submitted a bulk quote for 50 units.",
    timeLabel: "Yesterday",
    href: "/account/requests",
  },
  {
    id: "act-4",
    type: "review",
    title: "Leave a review for Order #99201",
    detail: "Share your experience with the seller to earn loyalty points.",
    timeLabel: "2 days ago",
    href: "/account/orders",
  },
];

interface RecommendedProduct {
  id: string;
  title: string;
  price: number;
  badge?: string;
  badgeColor?: "primary" | "tertiary";
  rating?: number;
  imageUrl: string;
  imageAlt: string;
  href: string;
}

const MOCK_PRODUCTS: RecommendedProduct[] = [
  {
    id: "prod-1",
    title: "Heritage Leather Shell",
    price: 1280,
    badge: "Limited Edition",
    badgeColor: "primary",
    imageUrl:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80",
    imageAlt: "Heritage leather jacket",
    href: "/product/heritage-leather-shell",
  },
  {
    id: "prod-2",
    title: "Low-Form Sneakers",
    price: 450,
    rating: 4.9,
    imageUrl:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80",
    imageAlt: "Minimalist sneakers",
    href: "/product/low-form-sneakers",
  },
  {
    id: "prod-3",
    title: "Prism Dial Chrono",
    price: 890,
    badge: "Low Stock",
    badgeColor: "primary",
    imageUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80",
    imageAlt: "Minimalist wrist watch",
    href: "/product/prism-dial-chrono",
  },
  {
    id: "prod-4",
    title: "Studio Knit Layer",
    price: 320,
    badge: "Bestseller",
    badgeColor: "tertiary",
    imageUrl:
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&q=80",
    imageAlt: "Wool knit sweater",
    href: "/product/studio-knit-layer",
  },
];

// ---------------------------------------------------------------------------
// Activity icon + color by type
// ---------------------------------------------------------------------------
function activityConfig(type: ActivityType): {
  IconComponent: React.ElementType;
  bg: string;
  fg: string;
} {
  switch (type) {
    case "order":
      return {
        IconComponent: Truck,
        bg: "bg-secondary-container/20",
        fg: "text-secondary-green",
      };
    case "bid":
      return {
        IconComponent: Gavel,
        bg: "bg-error-container/20",
        fg: "text-error",
      };
    case "rfq":
      return {
        IconComponent: FileText,
        bg: "bg-tertiary-container/20",
        fg: "text-tertiary",
      };
    case "review":
      return {
        IconComponent: Star,
        bg: "bg-primary-fixed/40",
        fg: "text-primary-container",
      };
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function memberSinceLabel(iso: string | undefined): string {
  if (!iso) return MOCK_USER.memberSince;
  try {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
      new Date(iso)
    );
  } catch {
    return MOCK_USER.memberSince;
  }
}

/** Greeting hero — from account_central */
function GreetingHero({ profile }: { profile: UserProfileResponse | null }) {
  const displayName = profile?.name?.trim() || MOCK_USER.name;
  const firstName = displayName.split(/\s+/)[0] || displayName;
  const tier =
    profile?.user_type === "super_admin"
      ? "Admin"
      : profile?.user_type === "admin"
        ? "Staff"
        : profile
          ? "Member"
          : MOCK_USER.tier;
  const since = memberSinceLabel(profile?.date_joined);

  return (
    <div className="bg-surface-container-lowest dark:bg-gray-900 dark:border dark:border-gray-800 rounded-2xl shadow-card p-6 md:p-8 relative overflow-hidden">
      {/* Decorative circle */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -mr-20 -mt-20 pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {/* Avatar */}
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-surface-container-low shadow-md flex-shrink-0 overflow-hidden relative">
          <Image
            src={MOCK_USER.avatarUrl}
            alt={profile?.name ?? MOCK_USER.avatarAlt}
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>

        {/* Identity */}
        <div className="flex-1 text-center sm:text-left">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant dark:text-gray-400 mb-1">
            Welcome back
          </p>
          <h1 className="font-syne text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface dark:text-gray-50">
            Hi, {firstName}
          </h1>
          <p className="text-sm text-on-surface-variant dark:text-gray-400 mt-1">
            {tier} &middot; since {since}
          </p>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center sm:justify-start">
            <Link
              href="/account/profile"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-high dark:bg-gray-800 rounded-xl text-sm font-medium hover:bg-surface-variant dark:hover:bg-gray-700 transition-colors active:scale-95"
            >
              <Pencil className="w-4 h-4" />
              Edit Profile
            </Link>
            {/* TODO: route pending — sharing feature */}
            <button className="inline-flex items-center gap-1.5 p-2 bg-primary-container text-on-primary rounded-xl hover:opacity-90 transition-opacity active:scale-95">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live status pill — from account_overview */}
        <div className="flex-shrink-0 hidden md:flex px-4 py-2 bg-surface-container-low dark:bg-gray-800 rounded-xl text-xs font-mono flex items-center gap-2 border border-outline-variant/10 dark:border-gray-700 self-start dark:text-gray-300">
          <span className="w-2 h-2 rounded-full bg-secondary-green flex-shrink-0" />
          LIVE NETWORK: ACTIVE
        </div>
      </div>
    </div>
  );
}

/** Snapshot cards — 5-card KPI bar from account_overview spec */
function SnapshotCards({
  activeOrders,
  wishlistCount,
  unreadMessages,
}: {
  activeOrders: number;
  wishlistCount: number;
  unreadMessages: number;
}) {
  const cards = [
    {
      IconComponent: ShoppingBag,
      iconBg: "bg-surface-container-high dark:bg-gray-800",
      iconFg: "text-primary-container dark:text-orange-400",
      label: "Active Orders",
      value: String(activeOrders),
      badge: "+12%",
      badgeClasses: "bg-secondary-container/60 text-secondary-green",
      href: "/account/orders",
    },
    {
      IconComponent: Gavel,
      iconBg: "bg-secondary-container/30",
      iconFg: "text-bid-green",
      label: "Active Bids",
      value: String(MOCK_SNAPSHOT.activeBids),
      badge: "LIVE",
      badgeClasses: "bg-primary-fixed text-primary",
      href: "/account/bids",
    },
    {
      IconComponent: FileText,
      iconBg: "bg-tertiary-container/20",
      iconFg: "text-tertiary",
      label: "Open RFQs",
      value: String(MOCK_SNAPSHOT.openRFQs),
      badge: "PENDING",
      badgeClasses: "bg-surface-container-high text-on-surface-variant",
      href: "/account/requests",
    },
    {
      IconComponent: Heart,
      iconBg: "bg-error-container/30",
      iconFg: "text-error",
      label: "Wishlist",
      value: String(wishlistCount),
      badge: null,
      badgeClasses: "",
      href: "/account/wishlist",
    },
    {
      IconComponent: Bell,
      iconBg: "bg-tertiary-fixed/40",
      iconFg: "text-tertiary",
      label: "Messages",
      value: String(unreadMessages),
      badge: "UNREAD",
      badgeClasses: "bg-tertiary-container/20 text-tertiary",
      href: "/account/messages",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <Link
          key={c.label}
          href={c.href}
          className="bg-surface-container-lowest dark:bg-gray-900 dark:border dark:border-gray-800 p-5 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 group flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <c.IconComponent
              className={`${c.iconFg} ${c.iconBg} p-2 rounded-xl w-9 h-9`}
            />
            {c.badge && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.badgeClasses}`}
              >
                {c.badge}
              </span>
            )}
          </div>
          <div>
            <p className="text-on-surface-variant dark:text-gray-400 text-xs font-medium">
              {c.label}
            </p>
            <p className="font-mono text-3xl font-bold text-on-surface dark:text-gray-100 group-hover:text-primary-container dark:group-hover:text-orange-400 transition-colors">
              {c.value}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Activity feed — from account_overview */
function ActivityFeed() {
  return (
    <section>
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-syne text-2xl font-bold text-on-surface">
          Recent Activity
        </h2>
        <Link
          href="/account/activity"
          className="text-primary text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="bg-surface-container-low rounded-2xl overflow-hidden">
        <div className="divide-y divide-outline-variant/10">
          {MOCK_ACTIVITY.map((item) => {
            const cfg = activityConfig(item.type);
            return (
              <Link
                key={item.id}
                href={item.href}
                className="p-5 flex items-center gap-4 hover:bg-surface-container-lowest transition-colors cursor-pointer group"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center ${cfg.fg} flex-shrink-0`}
                >
                  <cfg.IconComponent className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-on-surface group-hover:text-primary-container transition-colors truncate">
                    {item.title}
                  </p>
                  <p className="text-sm text-on-surface-variant line-clamp-1">
                    {item.detail}
                  </p>
                </div>
                <p className="font-mono text-xs text-on-surface-variant flex-shrink-0">
                  {item.timeLabel}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Order fulfillment shortcut grid — from account_central */
function OrderFulfillmentGrid() {
  const steps = [
    {
      IconComponent: CreditCard,
      label: "Unpaid",
      count: 2,
      // TODO: route pending — sub-filter for unpaid orders
      href: "/account/orders",
    },
    {
      IconComponent: ShoppingBag,
      label: "To Ship",
      count: 1,
      href: "/account/orders",
    },
    {
      IconComponent: Truck,
      label: "Shipped",
      count: 4,
      href: "/account/orders",
    },
    {
      IconComponent: Star,
      label: "To Review",
      count: 0,
      href: "/account/reviews",
    },
  ];

  return (
    <section>
      <div className="flex items-end justify-between mb-4 px-1">
        <h3 className="font-headline text-lg font-bold text-on-surface">
          Orders &amp; Fulfillment
        </h3>
        <Link
          href="/account/orders"
          className="text-xs font-bold text-primary uppercase tracking-wider hover:underline flex items-center gap-1"
        >
          Full History
          <ArrowRight className="w-3 h-3 ml-1 align-middle inline" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {steps.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-surface-container-lowest p-5 rounded-2xl shadow-card flex flex-col items-center gap-3 border border-transparent hover:border-primary/10 hover:shadow-card-hover transition-all"
          >
            <s.IconComponent className="text-primary w-8 h-8" />
            <span className="text-sm font-medium text-on-surface">
              {s.label}
            </span>
            <div className="px-2 py-0.5 bg-primary/10 text-primary-container rounded-full font-mono text-[10px] font-bold">
              {s.count}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Shortcut / navigation grid — full account section list */
function ShortcutGrid() {
  const shortcuts = [
    { IconComponent: ShoppingBag, label: "Orders", href: "/account/orders" },
    { IconComponent: Gavel, label: "Bids", href: "/account/bids" },
    { IconComponent: FileText, label: "Requests", href: "/account/requests" },
    { IconComponent: MapPin, label: "Addresses", href: "/account/addresses" },
    { IconComponent: CreditCard, label: "Payment Methods", href: "/account/payment-methods" },
    { IconComponent: Shield, label: "Security", href: "/account/security" },
    { IconComponent: Bell, label: "Messages", href: "/account/messages" },
    { IconComponent: Shield, label: "Verification", href: "/account/verification" },
    { IconComponent: Gavel, label: "Disputes", href: "/account/disputes" },
    { IconComponent: Star, label: "Reviews", href: "/account/reviews" },
  ];

  return (
    <section>
      <h3 className="font-headline text-lg font-bold text-on-surface mb-4 px-1">
        Quick Access
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {shortcuts.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="bg-surface-container-lowest rounded-2xl shadow-card p-4 flex flex-col items-center gap-2 hover:shadow-card-hover hover:bg-surface-container-low transition-all group active:scale-95"
          >
            <s.IconComponent className="w-6 h-6 text-on-surface-variant group-hover:text-primary-container transition-colors" />
            <span className="text-xs font-bold text-on-surface text-center leading-tight">
              {s.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Security snapshot — from account_overview right rail */
function SecuritySnapshot() {
  return (
    <section>
      <h2 className="font-syne text-xl font-bold text-on-surface mb-4">
        Security
      </h2>
      <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card border border-outline-variant/10">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-secondary-green flex items-center justify-center text-on-secondary flex-shrink-0">
            <Shield className="w-6 h-6 fill-current" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
              Status
            </p>
            <p className="text-xl font-syne font-bold text-secondary-green">
              Strong
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">2FA</span>
            <span className="text-secondary-green font-bold">Enabled</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">Last Login</span>
            <span className="font-mono text-xs">Today, 08:42</span>
          </div>
        </div>

        <Link
          href="/account/security"
          className="block w-full py-3 bg-surface-container text-center rounded-xl font-bold text-on-surface hover:bg-surface-container-high transition-colors text-sm"
        >
          Security Settings
        </Link>
      </div>
    </section>
  );
}

/** Wallet / credits promo card — from account_central */
function WalletPromoCard() {
  const { formatDisplayPrice } = useCurrency();
  const creditsLabel = formatDisplayPrice(MOCK_SNAPSHOT.storeCredits);

  return (
    <section className="relative overflow-hidden bg-inverse-surface text-inverse-on-surface p-6 rounded-2xl min-h-[180px]">
      {/* Decorative icon watermark */}
      <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none select-none">
        <PiggyBank className="w-[120px] h-[120px]" />
      </div>

      <div className="relative z-10">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">
          TradeHut Wallet
        </p>
        <h3 className="font-syne text-xl font-bold mb-1">
          {creditsLabel} Credits
        </h3>
        <p className="text-sm opacity-70 mb-5">
          Use credits at checkout for instant savings across the marketplace.
        </p>
        {/* TODO: route pending — wallet/credits page */}
        <Link
          href="/account/wallet"
          className="inline-flex items-center gap-2 px-5 py-2 bg-inverse-on-surface text-on-surface rounded-xl font-bold text-sm hover:opacity-90 transition-opacity active:scale-95"
        >
          View Wallet
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

/** Recommended products strip — from account_central */
function RecommendedStrip() {
  const { formatDisplayPrice } = useCurrency();

  return (
    <section>
      <div className="flex items-center gap-4 mb-6">
        <h3 className="font-syne text-2xl font-extrabold italic text-on-surface whitespace-nowrap">
          More to love
        </h3>
        <div className="h-px flex-1 bg-surface-container-high" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {MOCK_PRODUCTS.map((p) => (
          <Link
            key={p.id}
            href={p.href}
            className="group relative"
          >
            {/* Product image */}
            <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl bg-surface-container-low mb-3 relative">
              <Image
                src={p.imageUrl}
                alt={p.imageAlt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* Wishlist button */}
              <button
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center shadow-card hover:bg-primary-container hover:text-on-primary transition-all active:scale-95"
                onClick={(e) => {
                  e.preventDefault();
                  // TODO: dispatch wishlist toggle action
                }}
                aria-label="Add to wishlist"
              >
                <Heart className="w-4 h-4" />
              </button>
              {/* Quick View hover overlay */}
              <div className="absolute bottom-0 left-0 p-3 w-full translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <div className="w-full py-2 bg-primary text-on-primary rounded-xl text-xs font-bold uppercase tracking-widest text-center shadow-lg">
                  Quick View
                </div>
              </div>
            </div>

            <h4 className="font-headline text-sm font-bold text-on-surface truncate">
              {p.title}
            </h4>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono text-base font-medium text-primary-container">
                {formatDisplayPrice(p.price)}
              </span>
              {p.badge ? (
                <span
                  className={`text-[10px] uppercase tracking-tighter px-2 py-0.5 rounded font-bold ${
                    p.badgeColor === "tertiary"
                      ? "bg-tertiary-container/20 text-on-tertiary-container"
                      : "bg-surface-container-highest text-on-surface-variant"
                  }`}
                >
                  {p.badge}
                </span>
              ) : p.rating ? (
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-secondary-green fill-current" />
                  <span className="font-mono text-xs font-bold">{p.rating}</span>
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AccountOverviewPage() {
  const dispatch = useDispatch<AppDispatch>();
  const userId = useUserAccountId();
  const { wishlist } = useSelector((state: RootState) => state.wishlist);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState<number | null>(null);

  useEffect(() => {
    dispatch(getWishlist());
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setProfile(null);
      setOrderCount(null);
      setUnreadNotifications(null);
      return;
    }
    (async () => {
      try {
        const [p, orders, unread] = await Promise.all([
          getUserProfile(userId),
          getMyOrders(userId),
          getNotificationUnreadCount(),
        ]);
        if (cancelled) return;
        setProfile(p);
        setOrderCount(orders.length);
        setUnreadNotifications(unread);
      } catch {
        if (!cancelled) {
          setProfile(null);
          setOrderCount(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const activeOrders = orderCount ?? MOCK_SNAPSHOT.activeOrders;
  const wlCount = wishlist?.item_count ?? wishlist?.items?.length ?? MOCK_SNAPSHOT.wishlistCount;
  const unread =
    unreadNotifications !== null && unreadNotifications !== undefined
      ? unreadNotifications
      : MOCK_SNAPSHOT.unreadMessages;

  return (
    <>
      <AccountMobileHeader title="My Account" />

      {/* Greeting hero — account_central */}
      <GreetingHero profile={profile} />

      {/* KPI snapshot cards — account_overview */}
      <SnapshotCards
        activeOrders={activeOrders}
        wishlistCount={wlCount}
        unreadMessages={unread}
      />

      {/* Two-column section: activity feed + right rail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity feed (2/3 width on lg+) — account_overview */}
        <div className="lg:col-span-2 space-y-8">
          <ActivityFeed />

          {/* Order fulfillment shortcuts — account_central */}
          <OrderFulfillmentGrid />
        </div>

        {/* Right rail — account_overview */}
        <aside className="flex flex-col gap-6">
          <SecuritySnapshot />
          <WalletPromoCard />
        </aside>
      </div>

      {/* Quick-access shortcut grid */}
      <ShortcutGrid />

      {/* Recommended products — account_central */}
      <RecommendedStrip />
    </>
  );
}
