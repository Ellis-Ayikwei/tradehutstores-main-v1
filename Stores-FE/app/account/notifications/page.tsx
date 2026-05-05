"use client";

/**
 * Notification Settings page
 * Route: /account/notifications
 *
 * Ported from:
 *   stitch_full_website_redesign_expansion/tradehut_notification_settings/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 *
 * // TODO: PATCH /api/account/notification-preferences/ on save
 */

import { useState, useCallback } from "react";
import {
  Gavel,
  FileText,
  BellRing,
  Bell,
  Mail,
  MessageSquare,
  Inbox,
  Package,
  TrendingDown,
  Megaphone,
  Moon,
  Info,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { AccountMobileHeader } from "@/components/account/AccountShell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Channel = "email" | "push" | "sms" | "inapp";

interface NotifRow {
  id: string;
  label: string;
  description: string;
  /** badge text shown on the right — optional */
  badge?: string;
  /** initial toggle state per channel */
  defaults: Record<Channel, boolean>;
}

interface NotifGroup {
  id: string;
  icon: React.ReactNode;
  iconColor: string;
  title: string;
  /** bg class for the group card */
  bgClass: string;
  rows: NotifRow[];
}

// ---------------------------------------------------------------------------
// Channel definitions — drives both the header row and each toggle column
// ---------------------------------------------------------------------------

const CHANNELS: { id: Channel; label: string; icon: React.ReactNode }[] = [
  { id: "email", label: "Email",  icon: <Mail className="w-4 h-4" /> },
  { id: "push",  label: "Push",   icon: <Bell className="w-4 h-4" /> },
  { id: "sms",   label: "SMS",    icon: <MessageSquare className="w-4 h-4" /> },
  { id: "inapp", label: "In-app", icon: <Inbox className="w-4 h-4" /> },
];

// ---------------------------------------------------------------------------
// Notification matrix data
// Groups → rows → per-channel defaults
// ---------------------------------------------------------------------------

const NOTIF_GROUPS: NotifGroup[] = [
  {
    id: "trading",
    icon: <Gavel className="w-5 h-5" />,
    iconColor: "text-primary-container",
    title: "Trading & Bids",
    bgClass: "bg-surface-container-low",
    rows: [
      {
        id: "outbid",
        label: "Outbid Alerts",
        description: "Instantly notified when someone places a higher bid on your items.",
        badge: "PRIORITY",
        defaults: { email: true, push: true, sms: false, inapp: true },
      },
      {
        id: "auction_ending",
        label: "Auction Ending Soon",
        description: "Reminders when an auction you're following has 15 minutes left.",
        defaults: { email: true, push: true, sms: false, inapp: true },
      },
      {
        id: "bid_won",
        label: "Bid Won",
        description: "Confirmation when you win an auction or your bid is accepted.",
        defaults: { email: true, push: true, sms: true, inapp: true },
      },
    ],
  },
  {
    id: "orders",
    icon: <Package className="w-5 h-5" />,
    iconColor: "text-tertiary",
    title: "Order Updates",
    bgClass: "bg-surface-container-lowest",
    rows: [
      {
        id: "payment",
        label: "Payment Confirmations",
        description: "Receipts and successful payment verifications.",
        defaults: { email: true, push: false, sms: false, inapp: true },
      },
      {
        id: "shipping",
        label: "Shipping Status",
        description: "Real-time tracking updates and delivery confirmations.",
        defaults: { email: true, push: true, sms: true, inapp: true },
      },
      {
        id: "delivered",
        label: "Delivered",
        description: "Notification when your order has been delivered.",
        defaults: { email: true, push: true, sms: false, inapp: true },
      },
    ],
  },
  {
    id: "rfq",
    icon: <FileText className="w-5 h-5" />,
    iconColor: "text-tertiary",
    title: "RFQ Portal",
    bgClass: "bg-surface-container-low",
    rows: [
      {
        id: "new_quote",
        label: "New Quote Received",
        description: "A supplier has submitted a quote on one of your sourcing requests.",
        badge: "PRIORITY",
        defaults: { email: true, push: true, sms: false, inapp: true },
      },
      {
        id: "rfq_awarded",
        label: "Request Awarded",
        description: "Your sourcing request has been awarded to a supplier.",
        defaults: { email: true, push: true, sms: true, inapp: true },
      },
      {
        id: "rfq_expiring",
        label: "Request Expiring Soon",
        description: "Your open sourcing request is about to expire.",
        defaults: { email: true, push: false, sms: false, inapp: true },
      },
    ],
  },
  {
    id: "messages",
    icon: <MessageSquare className="w-5 h-5" />,
    iconColor: "text-secondary-green",
    title: "Messages",
    bgClass: "bg-surface-container-lowest",
    rows: [
      {
        id: "new_message",
        label: "New Message",
        description: "A buyer or supplier has sent you a direct message.",
        defaults: { email: true, push: true, sms: false, inapp: true },
      },
    ],
  },
  {
    id: "price",
    icon: <TrendingDown className="w-5 h-5" />,
    iconColor: "text-bid-green",
    title: "Price Drops & Saved Searches",
    bgClass: "bg-surface-container-low",
    rows: [
      {
        id: "price_drop",
        label: "Price Drop Alerts",
        description: "An item on your wishlist has dropped in price.",
        defaults: { email: true, push: true, sms: false, inapp: true },
      },
      {
        id: "saved_search",
        label: "Saved Search Matches",
        description: "New listings match a search you've saved.",
        defaults: { email: false, push: true, sms: false, inapp: true },
      },
    ],
  },
  {
    id: "marketing",
    icon: <Megaphone className="w-5 h-5" />,
    iconColor: "text-on-surface-variant",
    title: "Marketing & Insights",
    bgClass: "bg-surface-container-low/50",
    rows: [
      {
        id: "market_wrap",
        label: "Weekly Market Wrap",
        description: "Trends, price drops, and curated collection drops.",
        defaults: { email: true, push: false, sms: false, inapp: false },
      },
      {
        id: "promotions",
        label: "Promotions & Offers",
        description: "Special deals and platform-wide promotional events.",
        defaults: { email: false, push: false, sms: false, inapp: false },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Toggle component — pure Tailwind, no external library
// ---------------------------------------------------------------------------

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-container
        focus-visible:ring-offset-2
        ${checked ? "bg-primary-container" : "bg-surface-container-highest"}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 rounded-full bg-white
          shadow ring-0 transition-transform duration-200 ease-in-out
          ${checked ? "translate-x-5" : "translate-x-0"}
        `}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Type for the preferences state map
// ---------------------------------------------------------------------------

type PrefsState = Record<string, Record<Channel, boolean>>;

function buildInitialPrefs(): PrefsState {
  const state: PrefsState = {};
  for (const group of NOTIF_GROUPS) {
    for (const row of group.rows) {
      state[row.id] = { ...row.defaults };
    }
  }
  return state;
}

// ---------------------------------------------------------------------------
// Notification Group Card
// ---------------------------------------------------------------------------

interface GroupCardProps {
  group: NotifGroup;
  prefs: PrefsState;
  onToggle: (rowId: string, channel: Channel, val: boolean) => void;
}

function GroupCard({ group, prefs, onToggle }: GroupCardProps) {
  return (
    <div
      className={`${group.bgClass} rounded-2xl p-6 md:p-8 shadow-card border border-outline-variant/10`}
    >
      {/* Group header */}
      <div className="flex items-center gap-3 mb-6">
        <span className={group.iconColor}>{group.icon}</span>
        <h3 className="font-headline text-lg font-bold uppercase tracking-wider text-on-surface">
          {group.title}
        </h3>
      </div>

      {/* Channel header row — desktop only */}
      <div className="hidden lg:grid lg:grid-cols-12 mb-4 px-0">
        <div className="col-span-4" />
        {CHANNELS.map((ch) => (
          <div
            key={ch.id}
            className="col-span-2 text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50"
          >
            {ch.label}
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-0 divide-y divide-outline-variant/10">
        {group.rows.map((row) => {
          const rowPrefs = prefs[row.id];
          return (
            <div key={row.id} className="py-5 first:pt-0 last:pb-0">
              {/* Mobile: label above, toggles below */}
              <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-4">
                {/* Label */}
                <div className="lg:col-span-4 mb-4 lg:mb-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-on-surface">{row.label}</h4>
                    {row.badge && (
                      <span className="font-mono text-[10px] font-bold text-primary-container bg-primary-fixed px-2 py-0.5 rounded">
                        {row.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant/60 mt-0.5 leading-relaxed">
                    {row.description}
                  </p>
                </div>

                {/* Toggles — mobile: horizontal flex row with labels */}
                <div className="flex items-center justify-between gap-2 lg:contents">
                  {CHANNELS.map((ch) => (
                    <div
                      key={ch.id}
                      className="lg:col-span-2 flex flex-col items-center gap-1.5"
                    >
                      {/* Channel label visible on mobile only */}
                      <span className="lg:hidden text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
                        {ch.label}
                      </span>
                      <Toggle
                        checked={rowPrefs[ch.id]}
                        onChange={(val) => onToggle(row.id, ch.id, val)}
                        label={`${row.label} — ${ch.label}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quiet Hours section
// ---------------------------------------------------------------------------

interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
}

interface QuietHoursSectionProps {
  value: QuietHours;
  onChange: (v: QuietHours) => void;
}

function QuietHoursSection({ value, onChange }: QuietHoursSectionProps) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-card border border-outline-variant/10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Moon className="w-5 h-5 text-on-surface-variant" />
          <div>
            <h3 className="font-headline text-lg font-bold uppercase tracking-wider text-on-surface">
              Quiet Hours
            </h3>
            <p className="text-xs text-on-surface-variant/60 mt-0.5">
              Suppress all non-priority notifications during this window.
            </p>
          </div>
        </div>
        <Toggle
          checked={value.enabled}
          onChange={(enabled) => onChange({ ...value, enabled })}
          label="Enable quiet hours"
        />
      </div>

      {value.enabled && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4 p-4 bg-surface-container-low rounded-xl border border-outline-variant/10">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              Start
            </label>
            <input
              type="time"
              value={value.start}
              onChange={(e) => onChange({ ...value, start: e.target.value })}
              className="
                form-input rounded-xl bg-surface-container-lowest border border-outline-variant/30
                text-on-surface text-sm font-mono font-bold px-4 py-2.5 w-full
                focus:ring-2 focus:ring-primary-container focus:border-primary-container
                transition-colors
              "
            />
          </div>
          <span className="hidden sm:block text-on-surface-variant/40 font-bold self-end mb-3">
            —
          </span>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
              End
            </label>
            <input
              type="time"
              value={value.end}
              onChange={(e) => onChange({ ...value, end: e.target.value })}
              className="
                form-input rounded-xl bg-surface-container-lowest border border-outline-variant/30
                text-on-surface text-sm font-mono font-bold px-4 py-2.5 w-full
                focus:ring-2 focus:ring-primary-container focus:border-primary-container
                transition-colors
              "
            />
          </div>
          <div className="self-end mb-0.5 sm:mb-3 flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full text-xs font-bold text-on-surface-variant">
              <Info className="w-4 h-4" />
              Priority alerts still go through
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function SavedToast({ visible }: { visible: boolean }) {
  return (
    <div
      aria-live="polite"
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2 z-toast
        bg-inverse-surface text-inverse-on-surface
        px-6 py-3 rounded-full flex items-center gap-3 shadow-xl
        transition-all duration-300
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}
      `}
    >
      <CheckCircle className="w-5 h-5 text-bid-green" />
      <span className="font-bold text-sm tracking-wide">Preferences saved</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component (client — needs useState for toggles, quiet hours, toast)
// ---------------------------------------------------------------------------

export default function NotificationSettingsPage() {
  const [prefs, setPrefs] = useState<PrefsState>(buildInitialPrefs);

  const [quietHours, setQuietHours] = useState<QuietHours>({
    enabled: false,
    start: "22:00",
    end: "08:00",
  });

  const [toastVisible, setToastVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = useCallback(
    (rowId: string, channel: Channel, val: boolean) => {
      setPrefs((prev) => ({
        ...prev,
        [rowId]: { ...prev[rowId], [channel]: val },
      }));
    },
    []
  );

  const handleSave = async () => {
    setIsSaving(true);
    // TODO: PATCH /api/account/notification-preferences/
    await new Promise((r) => setTimeout(r, 400)); // simulated latency
    setIsSaving(false);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2800);
  };

  const handleCancel = () => {
    setPrefs(buildInitialPrefs());
    setQuietHours({ enabled: false, start: "22:00", end: "08:00" });
  };

  return (
    <>
      <AccountMobileHeader title="Notifications" />

      <section className="flex-1 min-w-0 text-on-surface font-body">
              {/* Page header */}
              <div className="mb-6 md:mb-10 lg:mb-12">
                <h1 className="font-syne text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface">
                  Notification Settings
                </h1>
                <p className="text-on-surface-variant/70 text-sm mt-2 max-w-xl leading-relaxed">
                  Configure how you receive updates about your trades, bids, and the
                  TradeHut marketplace. Select your preferred channels for each event
                  type.
                </p>
              </div>

              {/* Notification groups */}
              <div className="space-y-6">
                {NOTIF_GROUPS.map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    prefs={prefs}
                    onToggle={handleToggle}
                  />
                ))}

                {/* Quiet Hours */}
                <QuietHoursSection value={quietHours} onChange={setQuietHours} />

                {/* Save / Cancel actions */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="
                      px-6 py-3 rounded-xl border border-outline-variant
                      font-bold text-on-surface
                      hover:bg-surface-container-low
                      active:scale-95 transition-all duration-200
                    "
                  >
                    Cancel Changes
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="
                      px-8 py-3 rounded-xl
                      bg-gradient-to-r from-primary to-primary-container
                      text-on-primary font-bold
                      shadow-card hover:shadow-card-hover
                      active:scale-95 transition-all duration-200
                      disabled:opacity-60 disabled:pointer-events-none
                      flex items-center justify-center gap-2
                    "
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save Preferences"
                    )}
                  </button>
                </div>
              </div>
      </section>

      {/* Success toast */}
      <SavedToast visible={toastVisible} />

      {/* Decorative ambient glow — desktop only */}
      <div className="hidden xl:block fixed right-0 bottom-0 w-64 h-64 opacity-10 pointer-events-none">
        <div className="w-full h-full bg-primary-container blur-[100px] rounded-full" />
      </div>
    </>
  );
}
