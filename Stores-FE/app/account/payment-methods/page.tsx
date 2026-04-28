"use client";

/**
 * Payment Methods page
 * Route: /account/payment-methods
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_payment_methods/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingBag,
  Gavel,
  FileText,
  Heart,
  MapPin,
  CreditCard,
  BellRing,
  Shield,
  ShieldCheck,
  LogOut,
  Store,
  User,
  Wallet,
  Landmark,
  Plus,
  PlusCircle,
  Star,
  Trash2,
  ArrowRight,
  X,
  Smartphone,
  Menu,
} from "lucide-react";
import MainLayout from "@/components/Layouts/MainLayout";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type PaymentMethodType = "card" | "mobile-money" | "bank";
type CardBrand = "visa" | "mastercard" | "amex" | "other";
type MobileMoneyProvider = "mtn" | "vodafone" | "airteltigo";

interface SavedCard {
  id: string;
  brand: CardBrand;
  label: string;
  maskedPan: string;
  expiry: string;
  isDefault: boolean;
}

interface MobileMoneyAccount {
  id: string;
  provider: MobileMoneyProvider;
  label: string;
  maskedNumber: string;
  isDefault: boolean;
}

interface BankAccount {
  id: string;
  bankName: string;
  maskedAccount: string;
  accountType: string;
  isDefault: boolean;
}

interface Transaction {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  detail: string;
  amount: string;
  amountPositive: boolean;
}

// ---------------------------------------------------------------------------
// Demo data
// TODO: fetch /api/account/payment-methods/
// ---------------------------------------------------------------------------
const DEMO_CARDS: SavedCard[] = [
  {
    id: "card-001",
    brand: "visa",
    label: "Visa Credit",
    maskedPan: "**** **** **** 4242",
    expiry: "08/26",
    isDefault: true,
  },
  {
    id: "card-002",
    brand: "mastercard",
    label: "Mastercard Debit",
    maskedPan: "**** **** **** 8810",
    expiry: "11/24",
    isDefault: false,
  },
];

const DEMO_MOBILE_MONEY: MobileMoneyAccount[] = [
  {
    id: "mm-001",
    provider: "mtn",
    label: "MTN MoMo",
    maskedNumber: "+233 ** *** 7890",
    isDefault: false,
  },
  {
    id: "mm-002",
    provider: "vodafone",
    label: "Vodafone Cash",
    maskedNumber: "+233 ** *** 3412",
    isDefault: false,
  },
];

const DEMO_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: "bank-001",
    bankName: "GCB Bank",
    maskedAccount: "**** **** 5678",
    accountType: "Current Account",
    isDefault: false,
  },
];

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: "tx-001",
    icon: <Wallet className="w-4 h-4" />,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    title: "Wallet Top-up",
    detail: "Oct 24, 2023 · Visa **** 4242",
    amount: "+ $5,000.00",
    amountPositive: true,
  },
  {
    id: "tx-002",
    icon: <Gavel className="w-4 h-4" />,
    iconBg: "bg-tertiary/10",
    iconColor: "text-tertiary",
    title: "Auction Payment — Vintage Watch",
    detail: "Oct 22, 2023 · TradeHut Wallet",
    amount: "- $1,250.00",
    amountPositive: false,
  },
  {
    id: "tx-003",
    icon: <ShoppingBag className="w-4 h-4" />,
    iconBg: "bg-secondary-green/10",
    iconColor: "text-secondary-green",
    title: "Order #TH-98210",
    detail: "Oct 19, 2023 · MTN MoMo",
    amount: "- $340.00",
    amountPositive: false,
  },
];

// ---------------------------------------------------------------------------
// Add Payment Method drawer tabs
// ---------------------------------------------------------------------------
const ADD_METHOD_TABS: { id: PaymentMethodType; label: string; icon: React.ReactNode }[] =
  [
    { id: "card", label: "Card", icon: <CreditCard className="w-4 h-4" /> },
    { id: "mobile-money", label: "Mobile Money", icon: <Smartphone className="w-4 h-4" /> },
    { id: "bank", label: "Bank Transfer", icon: <Landmark className="w-4 h-4" /> },
  ];

// Provider display config
const PROVIDER_CONFIG: Record<
  MobileMoneyProvider,
  { label: string; color: string; textColor: string }
> = {
  mtn: {
    label: "MTN",
    color: "bg-warning-light",
    textColor: "text-warning",
  },
  vodafone: {
    label: "VOD",
    color: "bg-error-container",
    textColor: "text-error",
  },
  airteltigo: {
    label: "AT",
    color: "bg-tertiary-fixed",
    textColor: "text-tertiary",
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Brand chip for a card — shows initials in a color chip */
function CardBrandChip({ brand }: { brand: CardBrand }) {
  const map: Record<CardBrand, { label: string; cls: string }> = {
    visa: { label: "VISA", cls: "bg-tertiary text-on-tertiary" },
    mastercard: {
      label: "MC",
      cls: "bg-on-surface text-surface-container-lowest",
    },
    amex: { label: "AMEX", cls: "bg-secondary-green text-on-secondary" },
    other: { label: "CARD", cls: "bg-surface-container text-on-surface-variant" },
  };
  const cfg = map[brand];
  return (
    <span
      className={`inline-flex items-center justify-center w-12 h-8 rounded text-[10px] font-black tracking-widest ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

/** Mobile money provider chip */
function ProviderChip({ provider }: { provider: MobileMoneyProvider }) {
  const cfg = PROVIDER_CONFIG[provider];
  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-8 rounded text-[10px] font-black ${cfg.color} ${cfg.textColor}`}
    >
      {cfg.label}
    </span>
  );
}

/** Saved card tile */
function CardTile({
  card,
  onSetDefault,
  onRemove,
}: {
  card: SavedCard;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all group border border-transparent hover:border-outline-variant/20 relative">
      {/* top row */}
      <div className="flex justify-between items-start mb-10">
        <CardBrandChip brand={card.brand} />
        {card.isDefault && (
          <span className="bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            Default
          </span>
        )}
      </div>

      {/* PAN */}
      <div className="mb-5">
        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">
          {card.label}
        </p>
        <p className="font-mono text-lg text-on-surface tracking-widest">
          {card.maskedPan}
        </p>
      </div>

      {/* expiry + actions */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
            Expires
          </p>
          <p className="font-mono text-sm">{card.expiry}</p>
        </div>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!card.isDefault && (
            <button
              onClick={() => onSetDefault(card.id)}
              title="Set as default"
              className="p-2 hover:bg-surface-container rounded-lg transition-colors active:scale-95"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onRemove(card.id)}
            title="Remove card"
            className="p-2 hover:bg-error-container text-error rounded-lg transition-colors active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Mobile money account tile */
function MobileMoneyTile({
  account,
  onSetDefault,
  onRemove,
}: {
  account: MobileMoneyAccount;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all group border border-transparent hover:border-outline-variant/20">
      <div className="flex justify-between items-start mb-10">
        <ProviderChip provider={account.provider} />
        {account.isDefault && (
          <span className="bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            Default
          </span>
        )}
      </div>

      <div className="mb-5">
        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">
          {account.label}
        </p>
        <p className="font-mono text-lg text-on-surface tracking-widest">
          {account.maskedNumber}
        </p>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
            Mobile Money
          </p>
          <p className="text-xs font-medium text-on-surface-variant">
            Ghana Network
          </p>
        </div>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!account.isDefault && (
            <button
              onClick={() => onSetDefault(account.id)}
              title="Set as default"
              className="p-2 hover:bg-surface-container rounded-lg transition-colors active:scale-95"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onRemove(account.id)}
            title="Remove account"
            className="p-2 hover:bg-error-container text-error rounded-lg transition-colors active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Bank account tile */
function BankAccountTile({
  account,
  onSetDefault,
  onRemove,
}: {
  account: BankAccount;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all group border border-transparent hover:border-outline-variant/20">
      <div className="flex justify-between items-start mb-10">
        <div className="w-10 h-8 bg-surface-container flex items-center justify-center rounded">
          <Landmark className="w-4 h-4 text-on-surface-variant" />
        </div>
        {account.isDefault && (
          <span className="bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
            Default
          </span>
        )}
      </div>

      <div className="mb-5">
        <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-1">
          {account.bankName} · {account.accountType}
        </p>
        <p className="font-mono text-lg text-on-surface tracking-widest">
          {account.maskedAccount}
        </p>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest">
            Bank Transfer
          </p>
          <p className="text-xs font-medium text-on-surface-variant">Ghana</p>
        </div>

        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!account.isDefault && (
            <button
              onClick={() => onSetDefault(account.id)}
              title="Set as default"
              className="p-2 hover:bg-surface-container rounded-lg transition-colors active:scale-95"
            >
              <Star className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onRemove(account.id)}
            title="Remove bank account"
            className="p-2 hover:bg-error-container text-error rounded-lg transition-colors active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** "Add payment method" empty-state tile */
function AddMethodTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border-2 border-dashed border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center p-6 hover:bg-surface-container-low hover:border-primary/50 transition-all cursor-pointer group min-h-[220px] w-full active:scale-95"
    >
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Plus className="w-5 h-5 text-primary" />
      </div>
      <p className="font-headline font-bold text-sm">Add Payment Method</p>
      <p className="text-[10px] text-on-surface-variant mt-1 text-center">
        Cards, Mobile Money &amp; Bank Transfer
      </p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Add-method drawer
// ---------------------------------------------------------------------------
function AddMethodDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<PaymentMethodType>("card");

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-modal bg-inverse-surface/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed bottom-0 right-0 top-0 z-modal w-full max-w-md bg-surface-container-lowest shadow-xl flex flex-col overflow-hidden">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-outline-variant/20">
          <h2 className="font-headline font-bold text-xl">Add Payment Method</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container rounded-xl transition-colors active:scale-95"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 py-4 border-b border-outline-variant/15">
          {ADD_METHOD_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                activeTab === tab.id
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === "card" && <CardForm />}
          {activeTab === "mobile-money" && <MobileMoneyForm />}
          {activeTab === "bank" && <BankForm />}
        </div>

        {/* Drawer footer */}
        <div className="px-6 py-5 border-t border-outline-variant/20">
          <button className="w-full py-3.5 primary-gradient text-on-primary font-bold rounded-xl hover:shadow-card-hover transition-all active:scale-95 flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Save Payment Method
          </button>
        </div>
      </div>
    </>
  );
}

/** Card add form */
function CardForm() {
  return (
    <div className="space-y-5">
      <p className="text-xs text-on-surface-variant leading-relaxed">
        Visa, Mastercard and American Express are supported. Your card details
        are encrypted with PCI-DSS compliant processing.
      </p>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Card Number
        </label>
        <div className="relative flex items-center bg-surface-container-low rounded-xl border border-outline-variant/20 px-4 py-3 gap-3">
          <CreditCard className="w-4 h-4 text-outline" />
          <input
            type="text"
            inputMode="numeric"
            placeholder="0000 0000 0000 0000"
            maxLength={19}
            className="bg-transparent flex-1 border-none focus:ring-0 text-sm font-mono placeholder:text-outline outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
            Expiry
          </label>
          <input
            type="text"
            placeholder="MM / YY"
            maxLength={7}
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-mono placeholder:text-outline focus:ring-1 focus:ring-primary/50 outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
            CVC
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="•••"
            maxLength={4}
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-mono placeholder:text-outline focus:ring-1 focus:ring-primary/50 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Cardholder Name
        </label>
        <input
          type="text"
          placeholder="As printed on card"
          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm placeholder:text-outline focus:ring-1 focus:ring-primary/50 outline-none"
        />
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="rounded border-outline-variant text-primary focus:ring-primary"
        />
        <span className="text-sm text-on-surface-variant">
          Set as default payment method
        </span>
      </label>
    </div>
  );
}

/** Mobile money add form */
function MobileMoneyForm() {
  const providers: { id: MobileMoneyProvider; label: string }[] = [
    { id: "mtn", label: "MTN MoMo" },
    { id: "vodafone", label: "Vodafone Cash" },
    { id: "airteltigo", label: "AirtelTigo Money" },
  ];
  const [selected, setSelected] = useState<MobileMoneyProvider>("mtn");

  return (
    <div className="space-y-5">
      <p className="text-xs text-on-surface-variant leading-relaxed">
        Link a Ghana mobile money wallet for fast checkout and instant payouts.
      </p>

      {/* Provider selector */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">
          Network Provider
        </label>
        <div className="grid grid-cols-3 gap-3">
          {providers.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={`py-3 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                selected === p.id
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Mobile Number
        </label>
        <div className="relative flex items-center bg-surface-container-low rounded-xl border border-outline-variant/20 px-4 py-3 gap-3">
          <Smartphone className="w-4 h-4 text-outline" />
          <input
            type="tel"
            placeholder="+233 XX XXX XXXX"
            className="bg-transparent flex-1 border-none focus:ring-0 text-sm font-mono placeholder:text-outline outline-none"
          />
        </div>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="rounded border-outline-variant text-primary focus:ring-primary"
        />
        <span className="text-sm text-on-surface-variant">
          Set as default payment method
        </span>
      </label>
    </div>
  );
}

/** Bank account add form */
function BankForm() {
  return (
    <div className="space-y-5">
      <p className="text-xs text-on-surface-variant leading-relaxed">
        Link a Ghanaian bank account for direct transfers. Verification may take
        1–2 business days.
      </p>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Bank Name
        </label>
        <div className="relative flex items-center bg-surface-container-low rounded-xl border border-outline-variant/20 px-4 py-3 gap-3">
          <Landmark className="w-4 h-4 text-outline" />
          <input
            type="text"
            placeholder="e.g. GCB Bank, Ecobank…"
            className="bg-transparent flex-1 border-none focus:ring-0 text-sm placeholder:text-outline outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Account Number
        </label>
        <input
          type="text"
          inputMode="numeric"
          placeholder="Account number"
          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-mono placeholder:text-outline focus:ring-1 focus:ring-primary/50 outline-none"
        />
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
          Account Type
        </label>
        <select className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-primary/50 outline-none">
          <option>Current Account</option>
          <option>Savings Account</option>
        </select>
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="rounded border-outline-variant text-primary focus:ring-primary"
        />
        <span className="text-sm text-on-surface-variant">
          Set as default payment method
        </span>
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component (client — needs useState for drawer + method state)
// ---------------------------------------------------------------------------
export default function PaymentMethodsPage() {
  const [cards, setCards] = useState<SavedCard[]>(DEMO_CARDS);
  const [mobileMoneyAccounts, setMobileMoneyAccounts] =
    useState<MobileMoneyAccount[]>(DEMO_MOBILE_MONEY);
  const [bankAccounts, setBankAccounts] =
    useState<BankAccount[]>(DEMO_BANK_ACCOUNTS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarDrawerOpen, setSidebarDrawerOpen] = useState(false);

  // Close sidebar drawer on ESC
  useEffect(() => {
    if (!sidebarDrawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarDrawerOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [sidebarDrawerOpen]);

  // TODO: POST /api/account/payment-methods/ to persist
  function handleSetDefaultCard(id: string) {
    setCards((prev) =>
      prev.map((c) => ({ ...c, isDefault: c.id === id }))
    );
  }

  // TODO: DELETE /api/account/payment-methods/<id>/
  function handleRemoveCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  function handleSetDefaultMM(id: string) {
    setMobileMoneyAccounts((prev) =>
      prev.map((m) => ({ ...m, isDefault: m.id === id }))
    );
  }

  function handleRemoveMM(id: string) {
    setMobileMoneyAccounts((prev) => prev.filter((m) => m.id !== id));
  }

  function handleSetDefaultBank(id: string) {
    setBankAccounts((prev) =>
      prev.map((b) => ({ ...b, isDefault: b.id === id }))
    );
  }

  function handleRemoveBank(id: string) {
    setBankAccounts((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface font-body">
        {/*
         * NOTE: The global <TopNav> is rendered by MainLayout and
         * must NOT be modified here. The pt-20 below clears it.
         */}

        {/* Mobile sidebar drawer overlay */}
        {sidebarDrawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-inverse-surface/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarDrawerOpen(false)}
            aria-hidden="true"
          />
        )}
        {/* Mobile sidebar drawer panel */}
        <div
          className={`fixed left-0 top-0 h-full w-72 z-50 bg-surface-container-lowest shadow-card flex flex-col gap-2 p-6 overflow-y-auto no-scrollbar transition-transform duration-300 lg:hidden ${
            sidebarDrawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          aria-label="Account navigation drawer"
        >
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
              onClick={() => setSidebarDrawerOpen(false)}
              aria-label="Close menu"
              className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 flex-1">
            <Link href="/account" onClick={() => setSidebarDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <LayoutDashboard className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Overview</span>
            </Link>
            <Link href="/account/orders" onClick={() => setSidebarDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Orders</span>
            </Link>
            <Link href="/account/bids" onClick={() => setSidebarDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <Gavel className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Bids &amp; Auctions</span>
            </Link>
            <Link href="/account/requests" onClick={() => setSidebarDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <FileText className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">My Requests</span>
            </Link>
            <Link href="/account/wishlist" onClick={() => setSidebarDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <Heart className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Wishlist</span>
            </Link>
            <Link href="/account/addresses" onClick={() => setSidebarDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <MapPin className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Addresses</span>
            </Link>
            <Link href="/account/payment-methods" onClick={() => setSidebarDrawerOpen(false)}
              className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200">
              <CreditCard className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Payment Methods</span>
            </Link>
            <Link href="/account/notifications" onClick={() => setSidebarDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <BellRing className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Notifications</span>
            </Link>
            <Link href="/account/security" onClick={() => setSidebarDrawerOpen(false)}
              className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl">
              <Shield className="w-5 h-5" />
              <span className="font-body uppercase tracking-widest text-[10px] font-bold">Security</span>
            </Link>
          </nav>
          <div className="mt-auto pt-6 border-t border-surface-container-highest/30">
            <Link href="/auth/login"
              className="w-full bg-surface-container-low text-on-surface-variant font-bold py-3 rounded-xl hover:bg-error-container hover:text-error transition-all flex items-center justify-center gap-2 active:scale-95">
              <LogOut className="w-4 h-4" />
              Logout
            </Link>
          </div>
        </div>

        <div className="pt-20 pb-24 lg:pb-12 px-4 md:px-6 lg:px-8 max-w-screen-2xl mx-auto">
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

                {/* Payment Methods — ACTIVE */}
                <Link
                  href="/account/payment-methods"
                  className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
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
                  <BellRing className="w-5 h-5" />
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
              </nav>

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
                  onClick={() => setSidebarDrawerOpen(true)}
                  aria-label="Open account menu"
                  className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface h-10 w-10 flex items-center justify-center"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="font-syne font-bold text-sm text-on-surface-variant uppercase tracking-widest">
                  Payment Methods
                </span>
              </div>

              {/* Page header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 md:mb-10 lg:mb-12">
                <div>
                  <h1 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
                    Payment Methods
                  </h1>
                  <p className="text-on-surface-variant mt-2 text-sm max-w-md">
                    Manage your digital wallet and secure transaction preferences.
                  </p>
                </div>

                <button
                  onClick={() => setDrawerOpen(true)}
                  className="inline-flex items-center gap-2 primary-gradient text-on-primary px-5 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 whitespace-nowrap flex-shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  Add Payment Method
                </button>
              </div>

              {/* ── Bento: Wallet balance + Security status ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

                {/* Wallet bento */}
                <div className="lg:col-span-2 bg-surface-container-low p-8 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-[280px]">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <Wallet className="w-5 h-5 text-primary" />
                      <span className="font-headline font-bold uppercase tracking-widest text-[10px] text-on-surface-variant">
                        TradeHut Wallet
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-on-surface-variant">
                        Available Balance
                      </span>
                      <span className="flex items-start gap-1 font-headline font-black text-on-surface leading-none">
                        <span className="text-3xl mt-1">$</span>
                        <span className="font-mono text-4xl sm:text-5xl md:text-6xl">
                          12,450.00
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 relative z-10 mt-8">
                    <button className="primary-gradient text-on-primary px-6 py-3 rounded-xl font-bold text-sm shadow-card hover:shadow-card-hover transition-all flex items-center gap-2 active:scale-95">
                      <PlusCircle className="w-4 h-4" />
                      Top-Up Balance
                    </button>
                    <button className="bg-surface-container-lowest text-on-surface px-6 py-3 rounded-xl font-bold text-sm border border-outline-variant/20 hover:bg-white transition-all active:scale-95">
                      Withdraw Funds
                    </button>
                  </div>

                  {/* Decorative elements */}
                  <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-4">
                    <CreditCard className="w-44 h-44" />
                  </div>
                </div>

                {/* Security bento */}
                <div className="bg-surface-container-high p-8 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h3 className="font-headline font-bold text-lg mb-4">
                      Security Status
                    </h3>
                    <div className="flex items-center gap-3 p-4 bg-surface-container-lowest/50 rounded-xl mb-4">
                      <ShieldCheck className="w-5 h-5 text-secondary-green" />
                      <div>
                        <p className="text-xs font-bold text-on-surface">
                          PCI-DSS Compliant
                        </p>
                        <p className="text-[10px] text-on-surface-variant">
                          Your data is encrypted
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      For your protection, TradeHut uses multi-factor
                      authentication for all transactions exceeding $2,500.00.
                    </p>
                  </div>
                  <Link
                    href="/account/security"
                    className="text-xs font-bold text-primary flex items-center gap-1 group mt-4"
                  >
                    Privacy Settings
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* ── Saved Cards ── */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-headline font-bold text-2xl">
                    Saved Cards
                  </h2>
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="flex items-center gap-2 text-primary font-bold text-sm hover:opacity-80 transition-opacity active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Card
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cards.map((card) => (
                    <CardTile
                      key={card.id}
                      card={card}
                      onSetDefault={handleSetDefaultCard}
                      onRemove={handleRemoveCard}
                    />
                  ))}
                  <AddMethodTile onClick={() => setDrawerOpen(true)} />
                </div>
              </div>

              {/* ── Mobile Money ── */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-headline font-bold text-2xl">
                    Mobile Money
                  </h2>
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="flex items-center gap-2 text-primary font-bold text-sm hover:opacity-80 transition-opacity active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Link Account
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mobileMoneyAccounts.map((acc) => (
                    <MobileMoneyTile
                      key={acc.id}
                      account={acc}
                      onSetDefault={handleSetDefaultMM}
                      onRemove={handleRemoveMM}
                    />
                  ))}
                  {mobileMoneyAccounts.length === 0 && (
                    <AddMethodTile onClick={() => setDrawerOpen(true)} />
                  )}
                </div>
              </div>

              {/* ── Bank Accounts ── */}
              <div className="mb-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-headline font-bold text-2xl">
                    Bank Accounts
                  </h2>
                  <button
                    onClick={() => setDrawerOpen(true)}
                    className="flex items-center gap-2 text-primary font-bold text-sm hover:opacity-80 transition-opacity active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Link Bank
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bankAccounts.map((acc) => (
                    <BankAccountTile
                      key={acc.id}
                      account={acc}
                      onSetDefault={handleSetDefaultBank}
                      onRemove={handleRemoveBank}
                    />
                  ))}
                  {bankAccounts.length === 0 && (
                    <AddMethodTile onClick={() => setDrawerOpen(true)} />
                  )}
                </div>
              </div>

              {/* ── Recent Activity ── */}
              <div className="bg-surface-container-low rounded-2xl p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-headline font-bold text-xl">
                    Recent Activity
                  </h2>
                </div>

                <div className="space-y-3">
                  {DEMO_TRANSACTIONS.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10 hover:shadow-card transition-all"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl ${tx.iconBg} flex items-center justify-center flex-shrink-0`}
                        >
                          <span className={tx.iconColor}>{tx.icon}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{tx.title}</p>
                          <p className="text-[10px] text-on-surface-variant truncate">
                            {tx.detail}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-mono text-sm font-bold ml-4 flex-shrink-0 ${
                          tx.amountPositive
                            ? "text-secondary-green"
                            : "text-on-surface"
                        }`}
                      >
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/account/transactions"
                  className="mt-6 w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors group"
                >
                  View Full Transaction History
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </section>
          </div>
        </div>

        {/* ----------------------------------------------------------------
         * ADD PAYMENT METHOD DRAWER
         * ---------------------------------------------------------------- */}
        <AddMethodDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

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
            href="/account/payment-methods"
            className="flex flex-col items-center gap-1 text-primary min-w-[44px] py-1"
          >
            <CreditCard className="w-6 h-6" />
            <span className="text-[10px] font-bold">Payments</span>
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
