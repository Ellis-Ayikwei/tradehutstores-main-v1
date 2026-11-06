"use client";

/**
 * Invite friends — /account/invite
 *
 * There is no referral backend for buyers (no personal code, tracking or
 * rewards), so this page only offers what really works today: share a link to
 * the store via the device share sheet, WhatsApp, email, or copy the link.
 */

import { useEffect, useState } from "react";
import { Check, Copy, Mail, MessageCircle, Share2 } from "lucide-react";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import { SectionHeader } from "@/components/common/marketplace";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const BTN_SECONDARY = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-5 text-sm font-bold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS}`;
const BTN_PRIMARY = `inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 ${FOCUS}`;

const SHARE_TEXT = "Check out TradeHut Stores";

export default function InviteFriendsPage() {
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setShareUrl(window.location.origin);
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  async function handleCopy() {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
    }
  }

  async function handleNativeShare() {
    try {
      await navigator.share({ title: "TradeHut Stores", text: SHARE_TEXT, url: shareUrl });
    } catch {
      /* user dismissed the share sheet */
    }
  }

  const encodedMessage = encodeURIComponent(`${SHARE_TEXT}: ${shareUrl}`);
  const ready = shareUrl !== "";

  return (
    <>
      <AccountMobileHeader title="Invite friends" />

      <div className="space-y-5">
        <SectionHeader
          as="h1"
          title="Invite friends"
          subtitle="Tell friends and fellow traders about TradeHut Stores."
          className="mb-0 sm:mb-0"
        />

        <section
          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-6"
          aria-labelledby="invite-link-heading"
        >
          <h2
            id="invite-link-heading"
            className="font-syne text-base font-bold text-gray-900 dark:text-gray-100 sm:text-lg"
          >
            Share the store link
          </h2>
          <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
            Send this link to anyone you think would like to shop or sell here.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="invite-link" className="sr-only">
              Store link
            </label>
            <input
              id="invite-link"
              type="text"
              readOnly
              value={shareUrl}
              placeholder="Loading link..."
              onFocus={(e) => e.currentTarget.select()}
              className={`min-h-[44px] min-w-0 flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 font-mono text-base text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:text-sm ${FOCUS}`}
            />
            <button
              type="button"
              onClick={handleCopy}
              disabled={!ready}
              className={`${BTN_PRIMARY} disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600`}
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="sr-only" role="status">
            {copied ? "Link copied to clipboard" : ""}
          </p>
          {copyError ? (
            <p role="alert" className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400">
              Could not copy automatically. Select the link above and copy it manually.
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <a
              href={ready ? `https://wa.me/?text=${encodedMessage}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!ready}
              className={BTN_SECONDARY}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              WhatsApp
            </a>
            <a
              href={
                ready
                  ? `mailto:?subject=${encodeURIComponent("TradeHut Stores")}&body=${encodedMessage}`
                  : undefined
              }
              aria-disabled={!ready}
              className={BTN_SECONDARY}
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Email
            </a>
            {canNativeShare ? (
              <button type="button" onClick={handleNativeShare} className={BTN_SECONDARY}>
                <Share2 className="h-4 w-4" aria-hidden="true" />
                More options
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </>
  );
}
