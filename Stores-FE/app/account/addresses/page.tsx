"use client";

/**
 * Saved Addresses page
 * Route: /account/addresses
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_saved_addresses/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 */

import { useState } from "react";
import Link from "next/link";
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
  Home,
  Building2,
  Phone,
  Pencil,
  Trash2,
  Plus,
  X,
  Store,
  User,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AddressType = "home" | "work" | "custom";

interface Address {
  id: string;
  label: AddressType;
  /** Custom label text when type === "custom" */
  customLabel?: string;
  recipient: string;
  street: string;
  street2?: string;
  city: string;
  region: string;
  country: string;
  postalCode?: string;
  landmark?: string;
  phone: string;
  isDefault: boolean;
}

// Form state shape (mirrors the drawer fields)
interface AddressFormState {
  id?: string;
  label: AddressType;
  customLabel: string;
  recipient: string;
  phone: string;
  country: string;
  region: string;
  city: string;
  street: string;
  street2: string;
  landmark: string;
  postalCode: string;
}

const EMPTY_FORM: AddressFormState = {
  label: "home",
  customLabel: "",
  recipient: "",
  phone: "",
  country: "",
  region: "",
  city: "",
  street: "",
  street2: "",
  landmark: "",
  postalCode: "",
};

// ---------------------------------------------------------------------------
// Demo data
// TODO: fetch from /api/account/addresses/
// ---------------------------------------------------------------------------
const DEMO_ADDRESSES: Address[] = [
  {
    id: "addr-001",
    label: "home",
    recipient: "Alex Rivera",
    street: "1288 Silicon Valley Blvd",
    street2: "Suite 400, Floor 12",
    city: "San Francisco",
    region: "CA 94105",
    country: "United States",
    phone: "+1 (555) 012-3456",
    isDefault: true,
  },
  {
    id: "addr-002",
    label: "work",
    recipient: "Alex Rivera",
    street: "420 Innovation Dr",
    city: "Austin",
    region: "TX 78701",
    country: "United States",
    phone: "+1 (555) 987-6543",
    isDefault: false,
  },
  {
    id: "addr-003",
    label: "custom",
    customLabel: "Studio",
    recipient: "The Loft Studio",
    street: "77 Art District Alley",
    street2: "Studio 3B",
    city: "Brooklyn",
    region: "NY 11201",
    country: "United States",
    phone: "+1 (555) 234-5678",
    isDefault: false,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function addressTypeIconComponent(label: AddressType): React.ElementType {
  if (label === "home") return Home;
  if (label === "work") return Building2;
  return MapPin;
}

function addressTypeIconColor(label: AddressType): string {
  if (label === "home") return "text-primary";
  if (label === "work") return "text-tertiary";
  return "text-primary";
}

function addressLabel(addr: Address): string {
  if (addr.label === "custom") return addr.customLabel || "Custom";
  return addr.label === "home" ? "Home" : "Work";
}

// ---------------------------------------------------------------------------
// AddressCard
// ---------------------------------------------------------------------------
function AddressCard({
  addr,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  addr: Address;
  onEdit: (addr: Address) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}) {
  const isDefault = addr.isDefault;
  const bgBase = isDefault
    ? "bg-surface-container-lowest"
    : "bg-surface-container-low hover:bg-surface-container-lowest";

  const AddrIcon = addressTypeIconComponent(addr.label);

  return (
    <div
      className={`group relative ${bgBase} p-6 md:p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300`}
    >
      {/* Default badge */}
      {isDefault && (
        <div className="absolute top-6 right-6 md:top-8 md:right-8">
          <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Default
          </span>
        </div>
      )}

      <div className="flex items-start gap-4 md:gap-6">
        {/* Icon chip */}
        <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
          <AddrIcon className={`w-5 h-5 ${addressTypeIconColor(addr.label)}`} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Recipient + label */}
          <h3 className="font-headline font-bold text-lg md:text-xl text-on-surface leading-tight">
            {addr.recipient}
            {addr.label !== "home" && (
              <span className="text-on-surface-variant/50 font-normal ml-2 text-base">
                — {addressLabel(addr)}
              </span>
            )}
          </h3>

          {/* Address lines */}
          <div className="mt-3 space-y-0.5 text-on-surface-variant text-sm font-medium">
            <p>{addr.street}</p>
            {addr.street2 && <p>{addr.street2}</p>}
            <p>
              {addr.city}, {addr.region}
            </p>
            <p>{addr.country}</p>
            {addr.landmark && (
              <p className="text-on-surface-variant/60 text-xs italic">
                Near {addr.landmark}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="mt-4 flex items-center gap-1.5 text-on-surface/60">
            <Phone className="w-4 h-4" />
            <span className="font-mono text-sm tracking-tight">{addr.phone}</span>
          </div>
        </div>
      </div>

      {/* Action row — always visible on touch, hover-reveal on desktop */}
      <div className="mt-6 pt-5 border-t border-outline-variant/20 flex items-center gap-3 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={() => onEdit(addr)}
          className="text-sm font-bold text-primary flex items-center gap-1 hover:underline active:scale-95 transition-transform py-1"
        >
          <Pencil className="w-4 h-4" />
          Edit
        </button>

        <div className="h-4 w-px bg-outline-variant/30" />

        <button
          onClick={() => onDelete(addr.id)}
          className="text-sm font-bold text-on-surface-variant flex items-center gap-1 hover:text-error transition-colors active:scale-95 py-1"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>

        {!isDefault && (
          <div className="ml-auto">
            <button
              onClick={() => onSetDefault(addr.id)}
              className="text-xs font-bold text-on-surface-variant/60 hover:text-primary transition-colors py-1 active:scale-95"
            >
              Make Default
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-new placeholder tile
// ---------------------------------------------------------------------------
function AddNewTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group border-2 border-dashed border-outline-variant/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/40 hover:bg-surface-container-low transition-all duration-300 min-h-[240px] w-full active:scale-95"
    >
      <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center group-hover:scale-110 transition-transform">
        <Plus className="w-7 h-7 text-primary" />
      </div>
      <div className="text-center">
        <span className="font-headline font-bold text-lg text-on-surface block">
          Add New Location
        </span>
        <span className="text-sm text-on-surface-variant">
          Store unlimited shipping addresses
        </span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Address form drawer
// ---------------------------------------------------------------------------
function AddressDrawer({
  open,
  form,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  form: AddressFormState;
  onClose: () => void;
  onChange: (field: keyof AddressFormState, value: string) => void;
  onSubmit: () => void;
}) {
  const isEditing = Boolean(form.id);

  if (!open) return null;

  // Icons and labels for address type radio
  const typeConfig: Record<AddressType, { IconComponent: React.ElementType; label: string }> = {
    home: { IconComponent: Home, label: "Home" },
    work: { IconComponent: Building2, label: "Work" },
    custom: { IconComponent: MapPin, label: "Other" },
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-inverse-surface/40 z-modal backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit address" : "Add new address"}
        className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-surface-container-lowest z-modal shadow-xl overflow-y-auto"
      >
        {/* Drawer header */}
        <div className="sticky top-0 bg-surface-container-lowest/90 backdrop-blur-sm border-b border-outline-variant/20 px-6 py-5 flex items-center justify-between z-10">
          <h2 className="font-headline font-bold text-xl text-on-surface">
            {isEditing ? "Edit Address" : "Add New Address"}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-high transition-colors active:scale-95"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-6 space-y-5">
          {/* Address type radio */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">
              Address Type
            </label>
            <div className="flex gap-3">
              {(["home", "work", "custom"] as AddressType[]).map((type) => {
                const { IconComponent, label } = typeConfig[type];
                const active = form.label === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onChange("label", type)}
                    className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all active:scale-95 ${
                      active
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-outline-variant/30 text-on-surface-variant hover:border-primary/30"
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-xs font-bold">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom label (only for "custom" type) */}
          {form.label === "custom" && (
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                Location Name
              </label>
              <input
                type="text"
                value={form.customLabel}
                onChange={(e) => onChange("customLabel", e.target.value)}
                placeholder="e.g. Studio, Warehouse"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
          )}

          {/* Recipient */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">
              Recipient Name
            </label>
            <input
              type="text"
              value={form.recipient}
              onChange={(e) => onChange("recipient", e.target.value)}
              placeholder="Full name"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Country */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">
              Country
            </label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => onChange("country", e.target.value)}
              placeholder="United States"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Region + City (side-by-side on sm+) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                State / Region
              </label>
              <input
                type="text"
                value={form.region}
                onChange={(e) => onChange("region", e.target.value)}
                placeholder="California"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => onChange("city", e.target.value)}
                placeholder="San Francisco"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
          </div>

          {/* Street address */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">
              Street Address
            </label>
            <input
              type="text"
              value={form.street}
              onChange={(e) => onChange("street", e.target.value)}
              placeholder="123 Main Street"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Apt / Suite / Floor */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">
              Apt / Suite / Floor{" "}
              <span className="text-outline/60 normal-case tracking-normal font-medium">
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={form.street2}
              onChange={(e) => onChange("street2", e.target.value)}
              placeholder="Suite 400, Floor 12"
              className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
            />
          </div>

          {/* Landmark + Postal (side-by-side on sm+) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                Landmark{" "}
                <span className="text-outline/60 normal-case tracking-normal font-medium">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                value={form.landmark}
                onChange={(e) => onChange("landmark", e.target.value)}
                placeholder="Near city hall"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">
                Postal Code
              </label>
              <input
                type="text"
                value={form.postalCode}
                onChange={(e) => onChange("postalCode", e.target.value)}
                placeholder="94105"
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline/60 focus:outline-none focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>
          </div>
        </div>

        {/* Drawer footer */}
        <div className="sticky bottom-0 bg-surface-container-lowest/90 backdrop-blur-sm border-t border-outline-variant/20 px-6 py-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container-low transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 py-3 primary-gradient text-on-primary font-bold text-sm rounded-xl shadow-card hover:shadow-card-hover transition-all active:scale-95"
          >
            {isEditing ? "Save Changes" : "Add Address"}
          </button>
        </div>
      </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation dialog
// ---------------------------------------------------------------------------
function DeleteConfirmDialog({
  open,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-inverse-surface/40 z-modal backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-sm bg-surface-container-lowest rounded-2xl shadow-xl p-8 z-modal flex flex-col gap-6"
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-error-container flex items-center justify-center">
            <Trash2 className="w-7 h-7 text-error" />
          </div>
          <h3 className="font-headline font-bold text-xl text-on-surface">
            Remove Address?
          </h3>
          <p className="text-sm text-on-surface-variant max-w-xs">
            This address will be permanently removed from your account. This
            action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant font-bold text-sm hover:bg-surface-container-low transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-error text-on-error font-bold text-sm hover:opacity-90 transition-all active:scale-95"
          >
            Remove
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function SavedAddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>(DEMO_ADDRESSES);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<AddressFormState>(EMPTY_FORM);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // -- Form helpers --
  function openAddDrawer() {
    setForm(EMPTY_FORM);
    setDrawerOpen(true);
  }

  function openEditDrawer(addr: Address) {
    setForm({
      id: addr.id,
      label: addr.label,
      customLabel: addr.customLabel ?? "",
      recipient: addr.recipient,
      phone: addr.phone,
      country: addr.country,
      region: addr.region,
      city: addr.city,
      street: addr.street,
      street2: addr.street2 ?? "",
      landmark: addr.landmark ?? "",
      postalCode: addr.postalCode ?? "",
    });
    setDrawerOpen(true);
  }

  function handleFormChange(field: keyof AddressFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleFormSubmit() {
    // TODO: POST /api/account/addresses/ for new, PATCH /api/account/addresses/:id for edit
    if (form.id) {
      // Edit existing
      setAddresses((prev) =>
        prev.map((a) =>
          a.id === form.id
            ? {
                ...a,
                label: form.label,
                customLabel: form.customLabel || undefined,
                recipient: form.recipient,
                phone: form.phone,
                country: form.country,
                region: form.region,
                city: form.city,
                street: form.street,
                street2: form.street2 || undefined,
                landmark: form.landmark || undefined,
                postalCode: form.postalCode || undefined,
              }
            : a
        )
      );
    } else {
      // Create new
      const newAddr: Address = {
        id: `addr-${Date.now()}`,
        label: form.label,
        customLabel: form.customLabel || undefined,
        recipient: form.recipient,
        phone: form.phone,
        country: form.country,
        region: form.region,
        city: form.city,
        street: form.street,
        street2: form.street2 || undefined,
        landmark: form.landmark || undefined,
        postalCode: form.postalCode || undefined,
        isDefault: addresses.length === 0,
      };
      setAddresses((prev) => [...prev, newAddr]);
    }
    setDrawerOpen(false);
    setForm(EMPTY_FORM);
  }

  // -- Delete helpers --
  function handleDeleteRequest(id: string) {
    setDeleteTargetId(id);
  }

  function handleDeleteConfirm() {
    // TODO: DELETE /api/account/addresses/:id
    setAddresses((prev) => prev.filter((a) => a.id !== deleteTargetId));
    setDeleteTargetId(null);
  }

  // -- Set default --
  function handleSetDefault(id: string) {
    // TODO: PATCH /api/account/addresses/:id with { isDefault: true }
    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === id }))
    );
  }

  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface font-body">
        {/*
         * NOTE: The global <TopNav> is rendered by MainLayout and
         * must NOT be modified here. pt-20 clears the fixed nav.
         */}
        <div className="pt-20 pb-24 lg:pb-12 px-4 md:px-8 max-w-screen-2xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* ----------------------------------------------------------------
             * SIDEBAR — account nav
             * TODO: extract to shared <AccountSidebar>
             * ---------------------------------------------------------------- */}
            <aside className="hidden lg:flex lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] w-72 flex-shrink-0 flex-col gap-2 p-6 bg-surface-container-low rounded-2xl overflow-y-auto no-scrollbar">
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

                {/* Orders */}
                <Link
                  href="/account/orders"
                  className="text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                >
                  <ShoppingBag className="w-5 h-5" />
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

                {/* Addresses — ACTIVE */}
                <Link
                  href="/account/addresses"
                  className="bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all"
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
                  className="w-full bg-surface-container text-on-surface-variant font-bold py-3 rounded-xl hover:bg-error-container hover:text-error transition-all flex items-center justify-center gap-2 active:scale-95"
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

              {/* Page header */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 md:mb-12">
                <div>
                  <h1 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
                    Saved Addresses
                  </h1>
                  <p className="text-on-surface-variant mt-2 text-sm max-w-md">
                    Manage your shipping destinations for a faster checkout
                    experience across the TradeHut marketplace.
                  </p>
                </div>
                <button
                  onClick={openAddDrawer}
                  className="inline-flex items-center gap-2 primary-gradient text-on-primary px-5 py-3 rounded-xl font-bold shadow-card hover:shadow-card-hover transition-all active:scale-95 whitespace-nowrap flex-shrink-0"
                >
                  <MapPin className="w-4 h-4" />
                  Add New Address
                </button>
              </div>

              {/* Address card grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6">
                {addresses.map((addr) => (
                  <AddressCard
                    key={addr.id}
                    addr={addr}
                    onEdit={openEditDrawer}
                    onDelete={handleDeleteRequest}
                    onSetDefault={handleSetDefault}
                  />
                ))}

                {/* Add new placeholder tile */}
                <AddNewTile onClick={openAddDrawer} />
              </div>

              {/* Info banner */}
              <div className="mt-12 md:mt-16 p-8 md:p-10 bg-surface-container-low rounded-2xl relative overflow-hidden">
                {/* Decorative map overlay — hidden on mobile to save space */}
                <div className="hidden md:block absolute right-0 top-0 w-1/3 h-full opacity-10 pointer-events-none select-none">
                  <svg
                    viewBox="0 0 200 200"
                    className="w-full h-full object-cover"
                    aria-hidden="true"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Abstract globe / map lines */}
                    <circle cx="100" cy="100" r="80" stroke="currentColor" strokeWidth="1" />
                    <ellipse cx="100" cy="100" rx="40" ry="80" stroke="currentColor" strokeWidth="1" />
                    <ellipse cx="100" cy="100" rx="80" ry="40" stroke="currentColor" strokeWidth="1" />
                    <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="1" />
                    <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" strokeWidth="1" />
                  </svg>
                </div>

                <div className="relative z-10 max-w-xl">
                  <h4 className="font-headline font-bold text-xl md:text-2xl text-on-surface tracking-tight">
                    Global Logistics Support
                  </h4>
                  <p className="mt-3 text-sm text-on-surface-variant leading-relaxed">
                    TradeHut partners with premium freight services to ensure
                    your high-value assets arrive safely. Default addresses are
                    automatically synchronised with our Auction and RFQ engines
                    for instant shipping estimates.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-6 md:gap-8">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-primary font-bold">100%</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant opacity-60">
                        Insured Shipping
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-primary font-bold">24/7</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant opacity-60">
                        Asset Tracking
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-primary font-bold">Priority</span>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant opacity-60">
                        Handling
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ------------------------------------------------------------------
         * MOBILE BOTTOM NAV
         * Replaces the sidebar on small screens (< lg).
         * TODO: extract to a shared <AccountBottomNav> or replace with the
         * global mobile nav once that component exists.
         * ------------------------------------------------------------------ */}
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
            href="/account/addresses"
            className="flex flex-col items-center gap-1 text-primary min-w-[44px] py-1"
          >
            <MapPin className="w-6 h-6" />
            <span className="text-[10px] font-bold">Addresses</span>
          </Link>
          <Link
            href="/account"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <User className="w-6 h-6" />
            <span className="text-[10px] font-bold">Profile</span>
          </Link>
        </nav>

        {/* ------------------------------------------------------------------
         * ADD / EDIT DRAWER
         * ------------------------------------------------------------------ */}
        <AddressDrawer
          open={drawerOpen}
          form={form}
          onClose={() => setDrawerOpen(false)}
          onChange={handleFormChange}
          onSubmit={handleFormSubmit}
        />

        {/* ------------------------------------------------------------------
         * DELETE CONFIRMATION DIALOG
         * ------------------------------------------------------------------ */}
        <DeleteConfirmDialog
          open={deleteTargetId !== null}
          onCancel={() => setDeleteTargetId(null)}
          onConfirm={handleDeleteConfirm}
        />
      </div>
    </MainLayout>
  );
}
