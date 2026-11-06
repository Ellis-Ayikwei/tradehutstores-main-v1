"use client";

/**
 * Reports & suggestions — /account/reports
 *
 * There are no report/suggestion endpoints, and the previous form only
 * pretended to submit. This version composes the message and sends it to the
 * official WhatsApp number (the same channel support uses), so nothing is
 * "submitted" that nobody receives. No submission history is shown because
 * nothing is stored.
 */

import Link from "next/link";
import { useState } from "react";
import { Flag, Lightbulb, MessageCircle, Phone, Scale } from "lucide-react";
import { AccountMobileHeader } from "@/components/account/AccountShell";
import { SectionHeader } from "@/components/common/marketplace";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const FIELD = `w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 placeholder:text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 sm:text-sm ${FOCUS}`;
const LABEL = "mb-1 block text-sm font-semibold text-gray-800 dark:text-gray-200";

type Kind = "report" | "suggestion";

const KINDS: { id: Kind; label: string; Icon: typeof Flag }[] = [
  { id: "report", label: "Report an issue", Icon: Flag },
  { id: "suggestion", label: "Suggestion", Icon: Lightbulb },
];

const CATEGORIES: Record<Kind, string[]> = {
  report: ["Product", "Seller", "Listing", "Payment", "Order or delivery", "Other"],
  suggestion: ["Shopping experience", "Bidding", "Shipping", "Seller tools", "Other"],
};

export default function ReportsPage() {
  const [kind, setKind] = useState<Kind>("report");
  const [category, setCategory] = useState(CATEGORIES.report[0]);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [touched, setTouched] = useState(false);

  const subjectMissing = subject.trim() === "";
  const detailsMissing = details.trim() === "";

  function selectKind(next: Kind) {
    setKind(next);
    setCategory(CATEGORIES[next][0]);
  }

  const whatsappHref = (() => {
    const heading = kind === "report" ? "Issue report" : "Suggestion";
    const text = [
      `${heading} - ${category}`,
      `Subject: ${subject.trim()}`,
      "",
      details.trim(),
    ].join("\n");
    return `https://wa.me/233248138722?text=${encodeURIComponent(text)}`;
  })();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    if (subjectMissing || detailsMissing) return;
    window.open(whatsappHref, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <AccountMobileHeader title="Reports & suggestions" />

      <div className="space-y-5">
        <SectionHeader
          as="h1"
          title="Reports & suggestions"
          subtitle="Tell us about a problem or an idea to improve TradeHut Stores."
          className="mb-0 sm:mb-0"
        />

        <div className="grid gap-5 lg:grid-cols-3">
          <form
            onSubmit={handleSubmit}
            noValidate
            className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-6 lg:col-span-2"
          >
            <fieldset>
              <legend className={LABEL}>What would you like to send?</legend>
              <div className="grid grid-cols-2 gap-2">
                {KINDS.map(({ id, label, Icon }) => {
                  const active = kind === id;
                  return (
                    <label
                      key={id}
                      className={`flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-sm font-bold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary ${
                        active
                          ? "border-primary-700 bg-primary-700 text-white"
                          : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <input
                        type="radio"
                        name="kind"
                        value={id}
                        checked={active}
                        onChange={() => selectKind(id)}
                        className="sr-only"
                      />
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label htmlFor="report-category" className={LABEL}>
                Category
              </label>
              <select
                id="report-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`${FIELD} min-h-[44px]`}
              >
                {CATEGORIES[kind].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="report-subject" className={LABEL}>
                Subject
              </label>
              <input
                id="report-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={120}
                aria-invalid={touched && subjectMissing}
                aria-describedby={touched && subjectMissing ? "report-subject-error" : undefined}
                placeholder="A short summary"
                className={`${FIELD} min-h-[44px]`}
              />
              {touched && subjectMissing ? (
                <p id="report-subject-error" role="alert" className="mt-1 text-sm font-semibold text-red-700 dark:text-red-400">
                  Please add a subject.
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="report-details" className={LABEL}>
                Details
              </label>
              <textarea
                id="report-details"
                rows={6}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={1000}
                aria-invalid={touched && detailsMissing}
                aria-describedby={touched && detailsMissing ? "report-details-error" : undefined}
                placeholder={
                  kind === "report"
                    ? "What happened? Include the product, seller or order if you can."
                    : "Describe your idea and how it would help."
                }
                className={`${FIELD} py-2`}
              />
              {touched && detailsMissing ? (
                <p id="report-details-error" role="alert" className="mt-1 text-sm font-semibold text-red-700 dark:text-red-400">
                  Please add some details.
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              className={`inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-primary-700 px-5 text-sm font-bold text-white hover:bg-primary-800 sm:w-auto ${FOCUS}`}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Send on WhatsApp
            </button>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              This opens WhatsApp with your message ready to send to TradeHut support. Nothing
              is sent until you press send there.
            </p>
          </form>

          <aside className="space-y-3 self-start rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
            <h2 className="font-syne text-base font-bold text-gray-900 dark:text-gray-100">
              Other ways to reach us
            </h2>
            <a
              href="tel:+233248138722"
              className={`flex min-h-[44px] items-center gap-3 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS}`}
            >
              <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
              Call 024 813 8722
            </a>
            <Link
              href="/account/disputes"
              className={`flex min-h-[44px] items-center gap-3 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-100 dark:hover:bg-gray-800 ${FOCUS}`}
            >
              <Scale className="h-4 w-4 shrink-0" aria-hidden="true" />
              Open an order dispute
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
