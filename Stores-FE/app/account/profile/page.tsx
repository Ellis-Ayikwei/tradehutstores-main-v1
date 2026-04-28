"use client";

/**
 * Profile Settings page
 * Route: /account/profile
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_profile_settings/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 */

import { useState, useRef, useEffect } from "react";
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
  ShieldCheck,
  User,
  LogOut,
  Camera,
  CheckCircle,
  ChevronDown,
  Store,
  Menu,
  X,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ProfileFormState {
  displayName: string;
  username: string;
  bio: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  companyName: string;
  taxId: string;
  language: string;
  timezone: string;
  currency: string;
}

// ---------------------------------------------------------------------------
// Demo / placeholder state
// TODO: PATCH /api/account/profile/ — replace stub with real RTK mutation
// ---------------------------------------------------------------------------
const INITIAL_PROFILE: ProfileFormState = {
  displayName: "Alexander Thorne",
  username: "alex_thorne",
  bio: "Industrial collector and vintage enthusiast. Specialized in 20th-century machinery and maritime artifacts.",
  fullName: "Alexander Julian Thorne",
  email: "alex.thorne@example.com",
  phone: "+1 (555) 012-3456",
  dob: "1988-05-24",
  companyName: "Thorne Heritage Collections",
  taxId: "US-129384756",
  language: "English (US)",
  timezone: "(GMT-05:00) Eastern Time",
  currency: "USD ($)",
};

// ---------------------------------------------------------------------------
// Sidebar nav items
// ---------------------------------------------------------------------------
type NavItem = {
  href: string;
  Icon: React.ElementType;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/account", Icon: LayoutDashboard, label: "Overview" },
  { href: "/account/orders", Icon: ShoppingBag, label: "Orders" },
  { href: "/account/bids", Icon: Gavel, label: "Bids & Auctions" },
  { href: "/account/requests", Icon: FileText, label: "My Requests" },
  { href: "/account/wishlist", Icon: Heart, label: "Wishlist" },
  { href: "/account/addresses", Icon: MapPin, label: "Addresses" },
  { href: "/account/payment-methods", Icon: CreditCard, label: "Payment Methods" },
  { href: "/account/profile", Icon: User, label: "Profile" },
  { href: "/account/security", Icon: Shield, label: "Security" },
  { href: "/account/notifications", Icon: Bell, label: "Notifications" },
];

// ---------------------------------------------------------------------------
// Field label helper
// ---------------------------------------------------------------------------
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Section card wrapper
// ---------------------------------------------------------------------------
function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-card border border-outline-variant/5 ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section meta (left column title + description)
// ---------------------------------------------------------------------------
function SectionMeta({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <h2 className="font-syne font-bold text-xl text-on-surface">{title}</h2>
      <p className="font-body text-sm text-on-surface-variant leading-relaxed">
        {description}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Primary save button (per-card)
// ---------------------------------------------------------------------------
function SaveButton({ label = "Save Changes" }: { label?: string }) {
  return (
    <button
      type="submit"
      className="mt-6 px-8 py-3 bg-primary text-on-primary rounded-xl font-syne font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function ProfileSettingsPage() {
  const [form, setForm] = useState<ProfileFormState>(INITIAL_PROFILE);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAvatarFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleAvatarFile(file);
  }

  // TODO: PATCH /api/account/profile/ — wire real mutation here
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
  }

  function handleGlobalSave() {
    // TODO: PATCH /api/account/profile/ with full `form` state
  }

  const currentAvatar =
    avatarPreview ||
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAAvL0_AYJxb0E2JLfGhWukt4WuQHQEA_SlMKpfQBZq6P2n-0ybb81NcU8MYQEwrYUb-B_Vwa_jWzlITH0fvtA3g9W2sNgbXRi_wnZoxpMTxITlhogQFNs3lDxJUu7yLxbkpyf_gz02VnHvj92tGfaUrunNUNq8shxAh_J7fDiznzg17Ov-yTTjHelLRfHIeg2m27TSPN7gxy0HuEYpBDmPLVngJ9zJTQOu3SSmV6FpDawcWEP3owoTa4JYPTV6P6EeLLLreRNG6yY";

  return (
    <MainLayout>
      <div className="min-h-screen bg-surface text-on-surface font-body">
        {/*
         * NOTE: The global <TopNav> is rendered by MainLayout.
         * pt-20 clears its height on all viewports.
         */}

        {/* Decorative background glows (pointer-events-none, behind content) */}
        <div className="fixed bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
        <div className="fixed top-20 left-0 lg:left-64 w-64 h-64 bg-secondary-green/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

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
            {NAV_ITEMS.map(({ href, Icon, label }) => {
              const isActive = href === "/account/profile";
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setDrawerOpen(false)}
                  className={
                    isActive
                      ? "bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
                      : "text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                  }
                >
                  <Icon className={`w-5 h-5${isActive ? " fill-current" : ""}`} />
                  <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto pt-6 border-t border-surface-container-highest/30">
            <Link href="/auth/login"
              className="w-full bg-surface-container-low text-on-surface-variant font-bold py-3 rounded-xl hover:bg-error-container hover:text-error transition-all flex items-center justify-center gap-2 active:scale-95">
              <LogOut className="w-4 h-4" />
              Logout
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
                {NAV_ITEMS.map(({ href, Icon, label }) => {
                  const isActive = href === "/account/profile";
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={
                        isActive
                          ? "bg-surface-container-lowest text-primary-container shadow-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all hover:translate-x-1 duration-200"
                          : "text-on-surface px-4 py-3 flex items-center gap-3 opacity-70 hover:opacity-100 hover:translate-x-1 transition-all duration-200 rounded-xl"
                      }
                    >
                      <Icon className={`w-5 h-5${isActive ? " fill-current" : ""}`} />
                      <span className="font-body uppercase tracking-widest text-[10px] font-bold">
                        {label}
                      </span>
                    </Link>
                  );
                })}
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
            <div className="flex-1 min-w-0 space-y-8 md:space-y-10 lg:space-y-12">

              {/* Mobile menu trigger — shown at <lg */}
              <div className="lg:hidden flex items-center gap-3">
                <button
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open account menu"
                  className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors text-on-surface h-10 w-10 flex items-center justify-center"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <span className="font-syne font-bold text-sm text-on-surface-variant uppercase tracking-widest">
                  Profile Settings
                </span>
              </div>

              {/* Page title row */}
              <div>
                <h1 className="font-syne font-bold text-2xl md:text-3xl text-on-surface tracking-tight">
                  Profile Settings
                </h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  Update your public presence, personal details, and account preferences.
                </p>
              </div>

              {/* ============================================================
               * SECTION 1: Public Profile
               * ============================================================ */}
              <section
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
                aria-labelledby="section-public-profile"
              >
                <SectionMeta
                  title="Public Profile"
                  description="This information will be displayed publicly to other traders and auction participants."
                />

                <form
                  className="md:col-span-2"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  <SectionCard>
                    {/* Avatar upload row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
                      {/* Avatar with camera overlay */}
                      <div
                        className={`relative group flex-shrink-0 ${
                          isDragging ? "ring-4 ring-primary/40 rounded-2xl" : ""
                        }`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                      >
                        <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-surface-container-low group-hover:scale-[1.02] transition-transform relative">
                          <Image
                            src={currentAvatar}
                            alt="Profile photo"
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          aria-label="Change profile photo"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute -bottom-2 -right-2 bg-primary text-on-primary p-2 rounded-xl shadow-lg hover:bg-primary-container transition-colors active:scale-95"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Upload instructions */}
                      <div className="space-y-1.5">
                        <h4 className="font-syne font-bold text-on-surface">
                          Profile Photo
                        </h4>
                        <p className="text-xs text-on-surface-variant">
                          JPG, GIF or PNG. Max size 2 MB.
                          <br className="hidden sm:block" />
                          Drop a file here or click the camera icon.
                        </p>
                        <div className="flex gap-4 mt-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-bold text-primary hover:underline active:scale-95 transition-transform"
                          >
                            Upload New
                          </button>
                          <button
                            type="button"
                            onClick={() => setAvatarPreview(null)}
                            className="text-xs font-bold text-error/70 hover:underline active:scale-95 transition-transform"
                          >
                            Remove
                          </button>
                        </div>
                      </div>

                      {/* Hidden file input */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAvatarFile(file);
                        }}
                      />
                    </div>

                    {/* Form grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Display Name */}
                      <div>
                        <FieldLabel>Display Name</FieldLabel>
                        <input
                          type="text"
                          name="displayName"
                          value={form.displayName}
                          onChange={handleChange}
                          className="form-input w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 transition"
                        />
                      </div>

                      {/* Username */}
                      <div>
                        <FieldLabel>Username / Slug</FieldLabel>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 text-on-surface-variant/40 font-mono text-sm select-none">
                            @
                          </span>
                          <input
                            type="text"
                            name="username"
                            value={form.username}
                            onChange={handleChange}
                            className="form-input w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl pl-8 pr-4 py-3 font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 transition"
                          />
                        </div>
                      </div>

                      {/* Bio */}
                      <div className="sm:col-span-2">
                        <FieldLabel>Bio</FieldLabel>
                        <textarea
                          name="bio"
                          value={form.bio}
                          onChange={handleChange}
                          rows={3}
                          placeholder="Tell the TradeHut community about yourself..."
                          className="form-textarea w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl px-4 py-3 font-body text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none transition"
                        />
                      </div>
                    </div>

                    <SaveButton />
                  </SectionCard>
                </form>
              </section>

              {/* ============================================================
               * SECTION 2: Personal Information
               * ============================================================ */}
              <section
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
                aria-labelledby="section-personal-info"
              >
                <SectionMeta
                  title="Personal Information"
                  description="Private details used for shipping, billing, and identity management."
                />

                <form
                  className="md:col-span-2"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  <SectionCard>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Full Name */}
                      <div>
                        <FieldLabel>Full Name</FieldLabel>
                        <input
                          type="text"
                          name="fullName"
                          value={form.fullName}
                          onChange={handleChange}
                          className="form-input w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl px-4 py-3 font-body text-sm text-on-surface transition"
                        />
                      </div>

                      {/* Email + Verified badge */}
                      <div>
                        <FieldLabel>Email Address</FieldLabel>
                        <div className="relative">
                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            className="form-input w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl px-4 py-3 pr-24 font-body text-sm text-on-surface transition"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-secondary-green/10 text-secondary-green px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter whitespace-nowrap">
                            <CheckCircle className="w-3 h-3 fill-current" />
                            Verified
                          </span>
                        </div>
                      </div>

                      {/* Phone */}
                      <div>
                        <FieldLabel>Phone Number</FieldLabel>
                        <input
                          type="tel"
                          name="phone"
                          value={form.phone}
                          onChange={handleChange}
                          className="form-input w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl px-4 py-3 font-body text-sm text-on-surface transition"
                        />
                      </div>

                      {/* Date of Birth */}
                      <div>
                        <FieldLabel>Date of Birth</FieldLabel>
                        <input
                          type="date"
                          name="dob"
                          value={form.dob}
                          onChange={handleChange}
                          className="form-input w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl px-4 py-3 font-body text-sm text-on-surface transition"
                        />
                      </div>
                    </div>

                    <SaveButton />
                  </SectionCard>
                </form>
              </section>

              {/* ============================================================
               * SECTION 3: Account Verification
               * ============================================================ */}
              <section
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
                aria-labelledby="section-verification"
              >
                <SectionMeta
                  title="Account Verification"
                  description="Maintain your trust status and manage institutional credentials."
                />

                <div className="md:col-span-2 space-y-6">
                  {/* Identity verified badge card */}
                  <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-card border-l-4 border-secondary-green flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-secondary-green/10 text-secondary-green rounded-full flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-6 h-6 fill-current" />
                      </div>
                      <div>
                        <h4 className="font-syne font-bold text-on-surface">
                          Identity Verified
                        </h4>
                        <p className="text-xs text-on-surface-variant font-body">
                          Verified on October 12, 2023
                        </p>
                      </div>
                    </div>
                    <button className="px-4 py-2 text-xs font-bold border border-outline-variant/30 rounded-xl hover:bg-surface-container-low transition-colors font-syne whitespace-nowrap flex-shrink-0 active:scale-95">
                      View Badge
                    </button>
                  </div>

                  {/* Company information */}
                  <form onSubmit={handleSubmit} noValidate>
                    <SectionCard>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                        <h4 className="font-syne font-bold text-on-surface">
                          Company Information
                        </h4>
                        <span className="inline-flex items-center text-[10px] bg-tertiary-container/30 text-tertiary px-3 py-1 rounded-full font-bold uppercase tracking-tighter whitespace-nowrap self-start sm:self-auto">
                          Institutional Partner
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {/* Company Name */}
                        <div>
                          <FieldLabel>Company Name</FieldLabel>
                          <input
                            type="text"
                            name="companyName"
                            value={form.companyName}
                            onChange={handleChange}
                            className="form-input w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl px-4 py-3 font-body text-sm text-on-surface transition"
                          />
                        </div>

                        {/* Tax ID / VAT */}
                        <div>
                          <FieldLabel>Tax ID / VAT</FieldLabel>
                          <input
                            type="text"
                            name="taxId"
                            value={form.taxId}
                            onChange={handleChange}
                            className="form-input w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl px-4 py-3 font-mono text-sm text-on-surface transition"
                          />
                        </div>
                      </div>

                      <SaveButton />
                    </SectionCard>
                  </form>
                </div>
              </section>

              {/* ============================================================
               * SECTION 4: Preferences
               * ============================================================ */}
              <section
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
                aria-labelledby="section-preferences"
              >
                <SectionMeta
                  title="Preferences"
                  description="Customize your localized trading experience and interface language."
                />

                <form
                  className="md:col-span-2"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  <SectionCard>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Language */}
                      <div>
                        <FieldLabel>Language</FieldLabel>
                        <div className="relative">
                          <select
                            name="language"
                            value={form.language}
                            onChange={handleChange}
                            className="form-select w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl px-4 py-3 font-body text-sm text-on-surface appearance-none transition"
                          >
                            <option>English (US)</option>
                            <option>German</option>
                            <option>Japanese</option>
                            <option>French</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
                        </div>
                      </div>

                      {/* Timezone */}
                      <div>
                        <FieldLabel>Timezone</FieldLabel>
                        <div className="relative">
                          <select
                            name="timezone"
                            value={form.timezone}
                            onChange={handleChange}
                            className="form-select w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl px-4 py-3 font-body text-sm text-on-surface appearance-none transition"
                          >
                            <option>(GMT-05:00) Eastern Time</option>
                            <option>(GMT+00:00) UTC</option>
                            <option>(GMT+01:00) CET</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
                        </div>
                      </div>

                      {/* Currency */}
                      <div>
                        <FieldLabel>Currency</FieldLabel>
                        <div className="relative">
                          <select
                            name="currency"
                            value={form.currency}
                            onChange={handleChange}
                            className="form-select w-full bg-surface-container-low border-transparent focus:border-primary/20 focus:ring focus:ring-primary/10 rounded-xl px-4 py-3 font-body text-sm text-on-surface appearance-none transition"
                          >
                            <option>USD ($)</option>
                            <option>EUR (€)</option>
                            <option>GBP (£)</option>
                            <option>JPY (¥)</option>
                          </select>
                          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/60" />
                        </div>
                      </div>
                    </div>

                    <SaveButton />
                  </SectionCard>
                </form>
              </section>

              {/* ============================================================
               * GLOBAL SAVE / DISCARD ROW
               * ============================================================ */}
              <div className="pt-10 flex items-center justify-end gap-6 border-t border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => setForm(INITIAL_PROFILE)}
                  className="text-on-surface-variant font-syne font-bold text-sm hover:text-on-surface transition-colors active:scale-95"
                >
                  Discard Changes
                </button>
                <button
                  type="button"
                  onClick={handleGlobalSave}
                  className="px-10 py-4 bg-primary text-on-primary rounded-xl font-syne font-bold text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Save All Changes
                </button>
              </div>
            </div>
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
            href="/account/requests"
            className="flex flex-col items-center gap-1 text-on-surface-variant opacity-60 hover:opacity-100 transition-opacity min-w-[44px] py-1"
          >
            <FileText className="w-6 h-6" />
            <span className="text-[10px] font-bold">RFQs</span>
          </Link>
          <Link
            href="/account/profile"
            className="flex flex-col items-center gap-1 text-primary min-w-[44px] py-1"
          >
            <User className="w-6 h-6 fill-current" />
            <span className="text-[10px] font-bold">Profile</span>
          </Link>
        </nav>
      </div>
    </MainLayout>
  );
}
