'use client'

import Link from 'next/link'
import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useSellerProfile } from '@/hooks/useSellerProfile'
import { DOCUMENT_KIND_LABELS } from '@/lib/seller/profile'
import { btnSecondary } from '@/components/seller-central/ui'

const PROFILE_TAB = '/seller-central/settings?tab=profile'
const VERIFICATION_TAB = '/seller-central/settings?tab=verification'

const SURFACE = {
    warning: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
    danger: 'border-red-300 bg-red-50 text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100',
} as const

const linkInline = 'font-semibold underline underline-offset-2'

/**
 * Persistent notice on every Seller Central page while the store is not verified.
 * Shows nothing when verified, while loading, or when the profile could not be read. Never dismissible.
 */
export default function VerificationBanner() {
    const { profile } = useSellerProfile()
    if (!profile || profile.verification_status === 'verified') return null

    const { verification_status: status, verification_notes: notes } = profile
    const missingCategories = profile.missing_fields.includes('selling_categories')
    const docLabels = profile.missing_documents.map((k) => DOCUMENT_KIND_LABELS[k] ?? k)
    const missingList = [...(missingCategories ? ['Selling categories'] : []), ...docLabels].join(', ')
    const onlyCategories = missingCategories && docLabels.length === 0
    // Categories live in the Profile tab, so they come first when both are missing.
    const ctaHref = missingCategories ? PROFILE_TAB : VERIFICATION_TAB

    if (status === 'suspended') {
        return (
            <div role="alert" className={`mb-3 flex items-start gap-2.5 rounded-md border px-3 py-2.5 ${SURFACE.danger}`}>
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0 text-sm">
                    <p className="font-bold">Your store is suspended. Your products are not visible and this area is read-only.</p>
                    <p>
                        Contact us to find out why and what to do next:{' '}
                        <a href="tel:+233248138722" className={linkInline}>
                            024 813 8722
                        </a>{' '}
                        or{' '}
                        <a href="https://wa.me/233248138722" target="_blank" rel="noopener noreferrer" className={linkInline}>
                            WhatsApp
                        </a>
                        .
                    </p>
                </div>
            </div>
        )
    }

    const rejected = status === 'rejected'
    const Icon = rejected ? AlertTriangle : ShieldCheck
    const ctaLabel = rejected
        ? 'Update and resubmit'
        : missingCategories
          ? 'Add categories'
          : docLabels.length
            ? 'Upload documents'
            : 'View application'

    return (
        <div
            role="status"
            className={`mb-3 flex flex-col gap-2 rounded-md border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${
                rejected ? SURFACE.danger : SURFACE.warning
            }`}
        >
            <div className="flex min-w-0 items-start gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0 space-y-0.5 text-sm">
                    <p className="font-bold">
                        {!rejected && onlyCategories
                            ? 'Tell us what you sell so we can review your application'
                            : "Your store isn't verified yet. Your products won't be live until it's verified."}
                    </p>
                    {rejected ? (
                        <p className="break-words">
                            <span className="font-semibold">Reason:</span>{' '}
                            {notes?.trim() || 'Your application was not approved. Update your details and resubmit.'}
                        </p>
                    ) : onlyCategories ? (
                        <p>Your products won&apos;t be live until your store is verified. You can keep preparing your listings.</p>
                    ) : missingList ? (
                        <p>We can&apos;t start reviewing until everything we need is added. You can keep preparing your listings.</p>
                    ) : (
                        <p>We&apos;re reviewing your application. You can keep preparing your listings.</p>
                    )}
                    {missingList ? (
                        <p className="break-words">
                            <span className="font-semibold">Still needed:</span> {missingList}.
                        </p>
                    ) : null}
                </div>
            </div>
            <Link href={ctaHref} className={`${btnSecondary} w-full shrink-0 sm:w-auto`}>
                {ctaLabel}
            </Link>
        </div>
    )
}
