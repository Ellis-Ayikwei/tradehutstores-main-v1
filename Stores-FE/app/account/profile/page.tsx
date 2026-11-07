"use client";

/**
 * Profile — /account/profile
 *
 * Reads the signed-in user from the existing profile endpoint
 * (GET users/{id}/profile/). No profile-update endpoint exists yet, so the
 * details are shown read-only. Display currency is a real preference stored
 * by CurrencyContext (localStorage).
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Globe,
  Info,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { Badge, SectionHeader } from "@/components/common/marketplace";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useUserAccountId } from "@/hooks/useUserAccountId";
import { getUserProfile, type UserProfileResponse } from "@/lib/accountApi";
import renderErrorMessage from "@/utils/renderErrorMessage";

const CARD =
  "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    }).format(new Date(iso));
  } catch {
    return iso;
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

function ProfileSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading your profile">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className={`${CARD} animate-pulse p-4 sm:p-6`}>
        <div className="mb-6 flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-800" />
          <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-5 w-3/4 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm text-gray-900 dark:text-gray-100 ${mono ? "font-mono" : ""}`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function CurrencyPreference() {
  const { currency, setCurrency, enabledDisplayCurrencies, exchangeRates, baseCurrency } =
    useCurrency();

  const options = useMemo(() => {
    const set = new Set<string>([baseCurrency, currency]);
    const source =
      enabledDisplayCurrencies && enabledDisplayCurrencies.length > 0
        ? enabledDisplayCurrencies
        : Object.keys(exchangeRates);
    source.forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [baseCurrency, currency, enabledDisplayCurrencies, exchangeRates]);

  return (
    <section className={`${CARD} p-4 sm:p-6`} aria-labelledby="pref-heading">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200">
          <Globe className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="pref-heading" className="font-syne text-base font-bold text-gray-900 dark:text-gray-100 sm:text-lg">
            Display currency
          </h2>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            Prices across TradeHut are shown in this currency. Checkout totals are confirmed before you pay.
          </p>
          <label htmlFor="display-currency" className="sr-only">
            Display currency
          </label>
          <select
            id="display-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={`mt-3 min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-primary-600 focus:ring-primary-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:max-w-xs`}
          >
            {options.map((c) => (
              <option key={c} value={c}>
                {c}
                {c === baseCurrency ? " (store currency)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

export default function ProfileSettingsPage() {
  const userId = useUserAccountId();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const p = await getUserProfile(userId);
        if (!cancelled) setProfile(p);
      } catch (e: unknown) {
        if (!cancelled) {
          setProfile(null);
          setError(renderErrorMessage(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  if (!mounted || (userId && loading)) return <ProfileSkeleton />;

  if (!userId) {
    return (
      <div className={`${CARD} flex flex-col items-center px-6 py-12 text-center`}>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200">
          <LogIn className="h-7 w-7" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-syne text-xl font-bold text-gray-900 dark:text-gray-100">
          Sign in to view your profile
        </h1>
        <Link
          href="/auth/login"
          className={`mt-5 inline-flex min-h-[44px] items-center rounded-lg bg-primary-700 px-6 text-sm font-bold text-white hover:bg-primary-800 ${FOCUS}`}
        >
          Sign in
        </Link>
      </div>
    );
  }

  const displayName = profile?.name?.trim() || profile?.username || "";

  return (
    <div className="space-y-5">
      <SectionHeader
        as="h1"
        title="Profile"
        subtitle="Your TradeHut account details."
        className="mb-0 sm:mb-0"
      />

      {error ? (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200 sm:flex-row sm:items-center"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">We could not load your profile.</p>
            <p className="break-words text-xs">{error}</p>
          </div>
          <button
            type="button"
            onClick={retry}
            className={`min-h-[44px] shrink-0 rounded-lg border border-red-300 bg-white px-4 text-sm font-semibold text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-900 dark:text-red-100 ${FOCUS}`}
          >
            Try again
          </button>
        </div>
      ) : null}

      {profile ? (
        <section className={`${CARD} p-4 sm:p-6`} aria-labelledby="details-heading">
          <div className="mb-6 flex items-center gap-4">
            <span
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-700 font-syne text-xl font-bold text-white"
            >
              {initialsOf(displayName || profile.email)}
            </span>
            <div className="min-w-0">
              <h2
                id="details-heading"
                className="truncate font-syne text-lg font-bold text-gray-900 dark:text-gray-100"
              >
                {displayName || "Your account"}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="primary" size="md">
                  {accountTypeLabel(profile.user_type)}
                </Badge>
                <Badge variant={profile.is_active ? "success" : "danger"} size="md">
                  {profile.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Full name" value={profile.name?.trim() || `${profile.first_name} ${profile.last_name}`.trim()} />
            <Field label="Username" value={profile.username} mono />
            <Field label="Email" value={profile.email} />
            <Field label="Member since" value={formatDate(profile.date_joined)} />
            <Field label="Last sign-in" value={formatDate(profile.last_login, true)} />
          </dl>

          <div className="mt-6 flex items-start gap-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              Editing profile details is not available yet. To change your name or email, contact{" "}
              <Link href="/help" className={`font-semibold text-primary-700 underline underline-offset-2 dark:text-primary-300 ${FOCUS}`}>
                support
              </Link>
              .
            </p>
          </div>
        </section>
      ) : null}

      <CurrencyPreference />

      <section className={`${CARD} divide-y divide-gray-100 dark:divide-gray-800`} aria-label="Related settings">
        <Link
          href="/account/verification"
          className={`flex min-h-[64px] items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 ${FOCUS}`}
        >
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">Trust &amp; verification</span>
            <span className="block text-xs text-gray-600 dark:text-gray-400">What we check and why.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </Link>
        <Link
          href="/account/security"
          className={`flex min-h-[64px] items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 ${FOCUS}`}
        >
          <ShieldCheck className="h-5 w-5 shrink-0 text-gray-700 dark:text-gray-200" aria-hidden="true" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">Security</span>
            <span className="block text-xs text-gray-600 dark:text-gray-400">Password and sign-in protection.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
