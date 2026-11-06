import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/shadcn/button';
import { cn } from '@/lib/utils';
import { DOCUMENT_KIND_LABELS } from '@/services/sellerProfileService';
import { useSellerProfile } from '../hooks/useSellerProfile';

const SURFACE = {
    warning: 'border-warning-subtle bg-warning-subtle text-warning-subtle-foreground',
    destructive: 'border-destructive-subtle bg-destructive-subtle text-destructive-subtle-foreground',
} as const;

const VERIFICATION_TAB = '/seller/settings?tab=verification';
const PROFILE_TAB = '/seller/settings?tab=profile';

/**
 * Persistent notice at the top of every seller page while the store is not verified.
 * Renders nothing when verified, while loading, or if the profile can't be read, and
 * can't be dismissed. Solid `*-subtle` surfaces only (no alpha).
 */
export function VerificationBanner() {
    const { profile } = useSellerProfile();
    if (!profile || profile.verification_status === 'verified') return null;

    const { verification_status: status, verification_notes: notes, missing_documents: missing } = profile;
    const missingCategories = (profile.missing_fields ?? []).includes('selling_categories');
    const docLabels = missing.map((k) => DOCUMENT_KIND_LABELS[k] ?? k);
    const missingList = [...(missingCategories ? ['Selling categories'] : []), ...docLabels].join(', ');
    const onlyCategories = missingCategories && docLabels.length === 0;
    // Categories live in the Profile tab, so they come first when both are missing.
    const ctaTo = missingCategories ? PROFILE_TAB : VERIFICATION_TAB;

    if (status === 'suspended') {
        return (
            <div role="alert" className={cn('mb-3 flex items-start gap-2.5 rounded-lg border px-3 py-2', SURFACE.destructive)}>
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 text-sm">
                    <p className="font-semibold">Your store is suspended. Your products are not visible.</p>
                    <p>
                        Contact us to find out why and what to do next:{' '}
                        <a href="tel:+233248138722" className="font-semibold underline underline-offset-2">
                            024 813 8722
                        </a>{' '}
                        or{' '}
                        <a href="https://wa.me/233248138722" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
                            WhatsApp
                        </a>
                        .
                    </p>
                </div>
            </div>
        );
    }

    const rejected = status === 'rejected';
    const Icon = rejected ? AlertTriangle : ShieldCheck;

    return (
        <div role="status" className={cn('mb-3 flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3', rejected ? SURFACE.destructive : SURFACE.warning)}>
            <div className="flex min-w-0 items-start gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0 space-y-0.5 text-sm">
                    <p className="font-semibold">
                        {!rejected && onlyCategories
                            ? 'Tell us what you sell so we can review your application'
                            : "Your store isn't verified yet. Your products won't be live until it's verified."}
                    </p>
                    {rejected ? (
                        <p className="break-words">
                            <span className="font-semibold">Reason:</span> {notes?.trim() || 'Your application was not approved. Update your details and resubmit.'}
                        </p>
                    ) : onlyCategories ? (
                        <p>Your products won&apos;t be live until your store is verified &mdash; you can keep preparing your listings.</p>
                    ) : missingList ? (
                        <p>We can&apos;t start reviewing until everything we need is added &mdash; you can keep preparing your listings.</p>
                    ) : (
                        <p>We&apos;re reviewing your application &mdash; you can keep preparing your listings.</p>
                    )}
                    {missingList ? (
                        <p className="break-words">
                            <span className="font-semibold">Still needed:</span> {missingList}.
                        </p>
                    ) : null}
                </div>
            </div>
            <Button asChild size="sm" variant="outline" className="h-11 w-full shrink-0 sm:h-8 sm:w-auto sm:self-center">
                <Link to={ctaTo}>
                    {rejected ? 'Update & resubmit' : onlyCategories ? 'Add categories' : missingCategories ? 'Add categories' : docLabels.length ? 'Upload documents' : 'View application'}
                </Link>
            </Button>
        </div>
    );
}
