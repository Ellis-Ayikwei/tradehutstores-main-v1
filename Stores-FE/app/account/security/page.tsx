"use client";

/**
 * Security — /account/security
 *
 * Only wires flows that already exist in the app:
 *   - password reset by email: /auth/forgot-password
 *   - sign out of this device:  logoutUser thunk (same as the account menu)
 * There are no endpoints yet for session lists, 2FA, API tokens or account
 * deletion, so those controls are intentionally not shown.
 */

import Link from "next/link";
import { useState } from "react";
import { useDispatch } from "react-redux";
import useSignOut from "react-auth-kit/hooks/useSignOut";
import {
  AlertCircle,
  ArrowRight,
  KeyRound,
  LifeBuoy,
  LogOut,
  Mail,
  Phone,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { SectionHeader } from "@/components/common/marketplace";
import { logoutUser } from "@/store/authSlice";
import type { AppDispatch } from "@/store";

const CARD =
  "rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

const TIPS: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: KeyRound,
    title: "Use a unique password",
    body: "Do not reuse a password from another site. Longer is stronger.",
  },
  {
    Icon: Mail,
    title: "Watch for phishing",
    body: "TradeHut will never ask for your password or payment details by email, call or chat.",
  },
  {
    Icon: ShieldCheck,
    title: "Pay only through checkout",
    body: "Keep payments and messages on TradeHut so buyer protection applies.",
  },
];

export default function SecuritySettingsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const signOut = useSignOut();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await dispatch(logoutUser({ signOut })).unwrap();
    } catch (e: unknown) {
      setSignOutError(typeof e === "string" && e ? e : "Could not sign you out. Please try again.");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        as="h1"
        title="Security"
        subtitle="Keep your account and orders safe."
        className="mb-0 sm:mb-0"
      />

      <section className={`${CARD} p-4 sm:p-6`} aria-labelledby="sec-password-heading">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="sec-password-heading"
              className="font-syne text-base font-bold text-gray-900 dark:text-gray-100 sm:text-lg"
            >
              Password
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Reset your password with a link sent to your email address.
            </p>
            <Link
              href="/auth/forgot-password"
              className={`mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 ${FOCUS}`}
            >
              Reset password
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className={`${CARD} p-4 sm:p-6`} aria-labelledby="sec-device-heading">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <LogOut className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="sec-device-heading"
              className="font-syne text-base font-bold text-gray-900 dark:text-gray-100 sm:text-lg"
            >
              This device
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Sign out here, especially on a shared or public device.
            </p>
            {signOutError ? (
              <p
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {signOutError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className={`mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-bold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS}`}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </section>

      <section aria-labelledby="sec-tips-heading">
        <h2
          id="sec-tips-heading"
          className="mb-3 font-syne text-lg font-bold text-gray-900 dark:text-gray-100"
        >
          Stay safe
        </h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {TIPS.map(({ Icon, title, body }) => (
            <li key={title} className={`${CARD} flex gap-3 p-4`}>
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${CARD} p-4 sm:p-6`} aria-labelledby="sec-help-heading">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <LifeBuoy className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="sec-help-heading"
              className="font-syne text-base font-bold text-gray-900 dark:text-gray-100 sm:text-lg"
            >
              Suspicious activity or closing your account
            </h2>
            <p className="mt-0.5 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
              Contact us and we will help you secure or close your account.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <a
                href="tel:+233248138722"
                className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 ${FOCUS}`}
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                024 813 8722
              </a>
              <Link
                href="/help"
                className={`inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 bg-white px-5 text-sm font-bold text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS}`}
              >
                Help centre
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
