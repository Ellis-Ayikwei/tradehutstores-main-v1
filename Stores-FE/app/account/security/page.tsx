"use client";

/**
 * Security Settings page
 * Route: /account/security
 *
 * Ported from: stitch_full_website_redesign_expansion/tradehut_security_settings/code.html
 *
 * Layout: Account / dashboard shell (see .claude/design-system/layouts.md)
 * Sidebar is intentionally inline in this file.
 * // TODO: extract to shared <AccountSidebar>
 */

import { useState } from "react";
import Link from "next/link";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import {
  Lock,
  ShieldCheck,
  Monitor,
  Smartphone,
  Key,
  History,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Info,
  Trash2,
  X,
  Bell,
  LogOut,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
  /** Lucide icon component to use */
  DeviceIcon: React.ElementType;
}

interface SecurityLogEntry {
  id: string;
  event: string;
  detail: string;
  timestamp: string;
  risk: "low" | "medium" | "high";
}

// ---------------------------------------------------------------------------
// Demo data
// TODO: fetch from GET /api/account/security/sessions
// TODO: fetch from GET /api/account/security/log
// ---------------------------------------------------------------------------
const DEMO_SESSIONS: Session[] = [
  {
    id: "sess-001",
    device: 'MacBook Pro 16"',
    browser: "Chrome",
    ip: "192.168.1.45",
    location: "San Francisco, CA, USA",
    lastActive: "Just now",
    isCurrent: true,
    DeviceIcon: Monitor,
  },
  {
    id: "sess-002",
    device: "iPhone 15 Pro",
    browser: "TradeHut App",
    ip: "Cellular Network",
    location: "Austin, TX, USA",
    lastActive: "2 hours ago",
    isCurrent: false,
    DeviceIcon: Smartphone,
  },
  {
    id: "sess-003",
    device: "iPad Air",
    browser: "Safari",
    ip: "104.16.24.5",
    location: "London, UK",
    lastActive: "Mar 12, 2024",
    isCurrent: false,
    DeviceIcon: Monitor,
  },
];

const DEMO_SECURITY_LOG: SecurityLogEntry[] = [
  {
    id: "log-001",
    event: "Password Changed",
    detail: 'Password updated from MacBook Pro 16" · Chrome',
    timestamp: "Apr 21, 2026 at 14:32",
    risk: "low",
  },
  {
    id: "log-002",
    event: "New Login",
    detail: "iPhone 15 Pro · Austin, TX, USA",
    timestamp: "Apr 20, 2026 at 09:11",
    risk: "low",
  },
  {
    id: "log-003",
    event: "Failed Login Attempt",
    detail: "Unknown device · Moscow, Russia",
    timestamp: "Apr 19, 2026 at 03:44",
    risk: "high",
  },
  {
    id: "log-004",
    event: "2FA Enabled",
    detail: "Authenticator app configured",
    timestamp: "Apr 18, 2026 at 11:05",
    risk: "low",
  },
];

// ---------------------------------------------------------------------------
// Password strength helper
// ---------------------------------------------------------------------------
function StrengthBar({ value }: { value: 0 | 1 | 2 | 3 | 4 }) {
  const segments = [
    value >= 1
      ? value <= 1
        ? "bg-bid-red"
        : value === 2
        ? "bg-bid-amber"
        : "bg-bid-green"
      : "bg-surface-container-high",
    value >= 2
      ? value === 2
        ? "bg-bid-amber"
        : "bg-bid-green"
      : "bg-surface-container-high",
    value >= 3 ? "bg-bid-green" : "bg-surface-container-high",
    value >= 4 ? "bg-bid-green" : "bg-surface-container-high",
  ];
  const label =
    value === 0
      ? ""
      : value === 1
      ? "Weak"
      : value === 2
      ? "Fair"
      : value === 3
      ? "Strong"
      : "Very Strong";
  const labelColor =
    value <= 1
      ? "text-bid-red"
      : value === 2
      ? "text-bid-amber"
      : "text-bid-green";

  return (
    <div className="space-y-1.5 mt-1.5">
      <div className="flex gap-1">
        {segments.map((cls, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${cls}`} />
        ))}
      </div>
      {label && (
        <span className={`text-[10px] font-bold font-mono uppercase tracking-wide ${labelColor}`}>
          Strength: {label}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2FA method pill
// ---------------------------------------------------------------------------
function TwoFAMethodPill({
  Icon,
  label,
  active,
  onClick,
}: {
  Icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
        active
          ? "bg-bid-green/10 text-bid-green ring-1 ring-bid-green/30"
          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Security log risk badge
// ---------------------------------------------------------------------------
function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const map = {
    low: "bg-bid-green/10 text-bid-green",
    medium: "bg-bid-amber/10 text-bid-amber",
    high: "bg-bid-red/10 text-bid-red",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${map[risk]}`}
    >
      {risk}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Delete account confirmation modal
// ---------------------------------------------------------------------------
function DeleteAccountModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const confirmed = confirmText === "DELETE";

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-inverse-surface/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-container-lowest rounded-2xl shadow-card-hover w-full max-w-md p-8 relative">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="w-14 h-14 bg-error-container rounded-2xl flex items-center justify-center mb-6">
          <AlertTriangle className="w-7 h-7 text-error" />
        </div>

        <h2
          id="delete-modal-title"
          className="font-syne text-xl font-bold text-on-surface mb-2"
        >
          Delete Account
        </h2>
        <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
          This action is permanent and irreversible. All your orders, bids, RFQs, and
          saved preferences will be permanently deleted. Your active listings will be
          removed from the marketplace.
        </p>

        <div className="bg-error-container/30 border border-error/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-error mt-0.5" />
          <p className="text-sm text-on-error-container">
            Type <strong className="font-mono">DELETE</strong> below to confirm.
          </p>
        </div>

        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
          placeholder="Type DELETE to confirm"
          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-error/40 focus:bg-surface-container-lowest transition-all mb-6 font-mono placeholder:text-outline/50 placeholder:font-body"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold text-sm bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all active:scale-95"
          >
            Cancel
          </button>
          <button
            disabled={!confirmed}
            className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
              confirmed
                ? "bg-error text-on-error hover:brightness-110"
                : "bg-error/30 text-on-error/50 cursor-not-allowed"
            }`}
          >
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function SecuritySettingsPage() {
  // ── Password form state ──
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Simple strength scorer
  const strength: 0 | 1 | 2 | 3 | 4 = (() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 8) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s as 0 | 1 | 2 | 3 | 4;
  })();

  // ── 2FA state ──
  const [twoFAEnabled, setTwoFAEnabled] = useState(true);
  const [twoFAMethod, setTwoFAMethod] = useState<"sms" | "app">("app");

  // ── Sessions ──
  const [sessions, setSessions] = useState<Session[]>(DEMO_SESSIONS);

  const signOutSession = (id: string) => {
    // TODO: PATCH /api/account/security/sessions/{id}/revoke
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const terminateAllOtherSessions = () => {
    // TODO: DELETE /api/account/security/sessions?except=current
    setSessions((prev) => prev.filter((s) => s.isCurrent));
  };

  // ── Login alerts ──
  const [loginAlertsEnabled, setLoginAlertsEnabled] = useState(true);

  // ── Delete account modal ──
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  return (
    <>
      <AccountMobileHeader title="Security Settings" />

      <section className="flex-1 min-w-0 text-on-surface font-body">

              {/* Page header */}
              <div className="mb-8 md:mb-10 lg:mb-12">
                <h1 className="font-syne text-3xl md:text-4xl lg:text-5xl font-black text-on-surface tracking-tight mb-2">
                  Security
                </h1>
                <p className="text-on-surface-variant text-sm max-w-xl leading-relaxed">
                  Safeguard your assets and manage your account authentication settings
                  with high-precision security tools.
                </p>
              </div>

              {/* Bento grid */}
              <div className="grid grid-cols-12 gap-6">

                {/* ── Change Password ─────────────────────────────────────── */}
                <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-card">
                  {/* Section header */}
                  <div className="flex items-center gap-4 mb-8">
                    <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
                      <Lock className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="font-syne text-xl font-bold text-on-surface">
                        Update Password
                      </h2>
                      <p className="text-sm text-on-surface-variant">
                        Ensure your account uses a complex, unique password.
                      </p>
                    </div>
                  </div>

                  {/* Form */}
                  {/* TODO: PATCH /api/account/security/password */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      // TODO: wire up real mutation
                    }}
                    className="space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Current password */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant px-1">
                          Current Password
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                          autoComplete="current-password"
                          className="bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/25 focus:bg-surface-container-lowest transition-all placeholder:text-outline/50"
                        />
                      </div>

                      {/* New password */}
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant px-1">
                          New Password
                        </label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          autoComplete="new-password"
                          className="bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/25 focus:bg-surface-container-lowest transition-all placeholder:text-outline/50"
                        />
                        {/* Strength indicator */}
                        <StrengthBar value={strength} />
                      </div>
                    </div>

                    {/* Confirm new password — full width */}
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant px-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        autoComplete="new-password"
                        className={`bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 transition-all placeholder:text-outline/50 ${
                          confirmPassword && confirmPassword !== newPassword
                            ? "ring-1 ring-bid-red/40 focus:ring-bid-red/40"
                            : "focus:ring-primary/25 focus:bg-surface-container-lowest"
                        }`}
                      />
                      {confirmPassword && confirmPassword !== newPassword && (
                        <span className="text-[10px] font-bold text-bid-red">
                          Passwords do not match.
                        </span>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-3 rounded-xl font-bold text-sm tracking-wide shadow-card hover:shadow-card-hover transition-all active:scale-95"
                      >
                        Update Credentials
                      </button>
                    </div>
                  </form>
                </div>

                {/* ── 2FA Toggle Card ──────────────────────────────────────── */}
                <div className="col-span-12 lg:col-span-4 bg-primary text-on-primary rounded-2xl p-6 md:p-8 shadow-card flex flex-col justify-between relative overflow-hidden">
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="h-12 w-12 rounded-xl bg-on-primary/20 flex items-center justify-center mb-6">
                      <ShieldCheck className="w-7 h-7 fill-current" />
                    </div>
                    <h2 className="font-syne text-xl font-bold mb-2">
                      Two-Factor Auth
                    </h2>
                    <p className="text-sm text-on-primary/80 leading-relaxed mb-6">
                      Add an extra layer of security by requiring a code from your
                      phone or authenticator app to log in.
                    </p>

                    {/* Method selector — only shown when enabled */}
                    {twoFAEnabled && (
                      <div className="flex flex-col gap-2 mb-6">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-on-primary/60">
                          Method
                        </span>
                        <div className="flex gap-2">
                          <TwoFAMethodPill
                            Icon={Smartphone}
                            label="SMS"
                            active={twoFAMethod === "sms"}
                            onClick={() => {
                              setTwoFAMethod("sms");
                              // TODO: PATCH /api/account/security/2fa {method: "sms"}
                            }}
                          />
                          <TwoFAMethodPill
                            Icon={Key}
                            label="Authenticator"
                            active={twoFAMethod === "app"}
                            onClick={() => {
                              setTwoFAMethod("app");
                              // TODO: PATCH /api/account/security/2fa {method: "totp"}
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Toggle row */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-bold uppercase tracking-wider">
                        Status:
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest ${
                          twoFAEnabled ? "text-bid-green" : "text-bid-red"
                        }`}
                      >
                        {twoFAEnabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    {/* Toggle switch */}
                    {/* TODO: PATCH /api/account/security/2fa {enabled: boolean} */}
                    <button
                      onClick={() => setTwoFAEnabled((v) => !v)}
                      aria-label={twoFAEnabled ? "Disable 2FA" : "Enable 2FA"}
                      className={`w-14 h-8 rounded-full p-1 flex transition-all duration-300 active:scale-95 ${
                        twoFAEnabled ? "justify-end bg-bid-green/30" : "justify-start bg-on-primary/20"
                      }`}
                    >
                      <div className="h-6 w-6 bg-on-primary rounded-full shadow-lg" />
                    </button>
                  </div>

                  {/* Decorative glow */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary-container rounded-full blur-3xl opacity-50 pointer-events-none" />
                </div>

                {/* ── Active Sessions ──────────────────────────────────────── */}
                <div className="col-span-12 bg-surface-container-low rounded-2xl p-6 md:p-8">
                  {/* Section header */}
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <Monitor className="w-5 h-5 text-on-surface-variant" />
                        <h2 className="font-syne text-2xl font-bold tracking-tight">
                          Active Sessions
                        </h2>
                      </div>
                      <p className="text-on-surface-variant text-sm">
                        Manage logged-in devices and terminate suspicious activity.
                      </p>
                    </div>
                    {sessions.filter((s) => !s.isCurrent).length > 0 && (
                      <button
                        onClick={terminateAllOtherSessions}
                        className="text-[10px] uppercase tracking-widest font-bold text-error bg-error-container/30 px-4 py-2.5 rounded-xl hover:bg-error-container/60 transition-all active:scale-95 whitespace-nowrap"
                      >
                        Terminate All Other Sessions
                      </button>
                    )}
                  </div>

                  {/* Session list */}
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div
                        key={session.id}
                        className="bg-surface-container-lowest px-5 py-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-card transition-shadow"
                      >
                        {/* Device info */}
                        <div className="flex items-center gap-5 flex-1 min-w-0">
                          <div className="h-12 w-12 flex-shrink-0 flex items-center justify-center text-on-surface-variant/60">
                            <session.DeviceIcon className="w-8 h-8" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-0.5">
                              <h3 className="font-bold text-on-surface text-sm">
                                {session.device} &bull; {session.browser}
                              </h3>
                              {session.isCurrent && (
                                <span className="px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase tracking-wide">
                                  Current Session
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant font-mono truncate">
                              {session.ip} &bull; {session.location}
                            </p>
                          </div>
                        </div>

                        {/* Last active + action */}
                        <div className="flex items-center gap-6 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                              Last Active
                            </p>
                            <p className="text-sm font-medium">{session.lastActive}</p>
                          </div>

                          {session.isCurrent ? (
                            <div className="h-10 w-10 flex items-center justify-center rounded-xl text-bid-green">
                              <CheckCircle className="w-5 h-5 fill-current" />
                            </div>
                          ) : (
                            <button
                              onClick={() => signOutSession(session.id)}
                              aria-label={`Sign out ${session.device}`}
                              className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-error-container/30 text-error transition-colors active:scale-95"
                            >
                              <LogOut className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {sessions.length === 0 && (
                      <p className="text-center text-sm text-on-surface-variant py-8">
                        No active sessions found.
                      </p>
                    )}
                  </div>
                </div>

                {/* ── API Access Tokens ────────────────────────────────────── */}
                <div className="col-span-12 lg:col-span-6 bg-surface-container-high rounded-2xl p-6 md:p-8 border-l-4 border-tertiary">
                  <div className="flex items-center gap-3 mb-4">
                    <Key className="w-5 h-5 text-tertiary" />
                    <h3 className="font-headline font-bold text-on-surface">
                      API Access Tokens
                    </h3>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                    Generating a Personal Access Token allows you to interact with
                    the TradeHut RFQ engine programmatically. Keep these keys secure
                    and never share them.
                  </p>
                  {/* TODO: POST /api/account/security/api-tokens */}
                  <button className="bg-tertiary text-on-tertiary px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all active:scale-95">
                    Generate New Token
                  </button>
                </div>

                {/* ── Recovery Codes ───────────────────────────────────────── */}
                <div className="col-span-12 lg:col-span-6 bg-surface-container-high rounded-2xl p-6 md:p-8 border-l-4 border-secondary-green">
                  <div className="flex items-center gap-3 mb-4">
                    <History className="w-5 h-5 text-secondary-green" />
                    <h3 className="font-headline font-bold text-on-surface">
                      Recovery Codes
                    </h3>
                  </div>
                  <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
                    If you lose access to your 2FA device, recovery codes are the
                    only way to regain access to your trade history and active bids.
                  </p>
                  {/* TODO: GET /api/account/security/recovery-codes */}
                  <button className="bg-secondary-green text-on-secondary px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all active:scale-95">
                    View Secure Codes
                  </button>
                </div>

                {/* ── Security Log ─────────────────────────────────────────── */}
                <div className="col-span-12 bg-surface-container-lowest rounded-2xl p-6 md:p-8 shadow-card">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant">
                        <History className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="font-syne text-xl font-bold text-on-surface">
                          Security Log
                        </h2>
                        <p className="text-xs text-on-surface-variant">
                          Recent account security events.
                        </p>
                      </div>
                    </div>
                    {/* TODO: link to full log page */}
                    <button className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                      View All
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {DEMO_SECURITY_LOG.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-4 bg-surface-container-low rounded-xl"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {entry.risk === "high" ? (
                            <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 text-bid-red`} />
                          ) : entry.risk === "medium" ? (
                            <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 text-bid-amber`} />
                          ) : (
                            <CheckCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 text-bid-green`} />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-on-surface">
                              {entry.event}
                            </p>
                            <p className="text-xs text-on-surface-variant truncate">
                              {entry.detail}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 pl-8 sm:pl-0">
                          <RiskBadge risk={entry.risk} />
                          <span className="text-xs text-on-surface-variant font-mono whitespace-nowrap">
                            {entry.timestamp}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Login Alerts Toggle ──────────────────────────────────── */}
                <div className="col-span-12 md:col-span-6 bg-surface-container-low rounded-2xl p-6 md:p-8 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant">
                      <Bell className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-syne font-bold text-on-surface">
                        Login Alerts
                      </h3>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Get notified via email whenever a new device logs in to your
                        account.
                      </p>
                    </div>
                  </div>
                  {/* TODO: PATCH /api/account/security/login-alerts */}
                  <button
                    onClick={() => setLoginAlertsEnabled((v) => !v)}
                    aria-label={loginAlertsEnabled ? "Disable login alerts" : "Enable login alerts"}
                    className={`flex-shrink-0 w-14 h-8 rounded-full p-1 flex transition-all duration-300 active:scale-95 ${
                      loginAlertsEnabled
                        ? "justify-end bg-bid-green/20"
                        : "justify-start bg-surface-container-high"
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-full shadow-md transition-colors ${
                        loginAlertsEnabled ? "bg-bid-green" : "bg-outline"
                      }`}
                    />
                  </button>
                </div>

                {/* ── Delete Account ───────────────────────────────────────── */}
                <div className="col-span-12 md:col-span-6 bg-error-container/20 border border-error/15 rounded-2xl p-6 md:p-8 flex items-center justify-between gap-6">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-error-container flex items-center justify-center text-error">
                      <Trash2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-syne font-bold text-on-surface">
                        Delete Account
                      </h3>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Permanently remove your account and all associated data from
                        TradeHut.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="flex-shrink-0 text-error bg-error-container px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-error hover:text-on-error transition-all active:scale-95"
                  >
                    Delete
                  </button>
                </div>

              </div>
              {/* /bento grid */}
      </section>

      <DeleteAccountModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
      />
    </>
  );
}
