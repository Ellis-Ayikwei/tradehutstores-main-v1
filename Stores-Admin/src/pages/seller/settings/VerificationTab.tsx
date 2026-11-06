import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Loader2, RefreshCw, ShieldCheck, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge, type BadgeProps } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import {
    BUSINESS_TYPE_LABELS,
    DOCUMENT_ACCEPT,
    DOCUMENT_KINDS,
    DOCUMENT_KIND_LABELS,
    ID_TYPE_LABELS,
    SellerProfileWriteError,
    resubmitSellerApplication,
    uploadSellerDocument,
    validateDocumentFile,
    type DocumentKind,
    type DocumentStatus,
    type SellerDocument,
    type SellerProfile,
    type VerificationStatus,
} from '@/services/sellerProfileService';

const PROFILE_TAB = '/seller/settings?tab=profile';

const STATUS_BADGE: Record<VerificationStatus, { label: string; variant: BadgeProps['variant'] }> = {
    pending: { label: 'Pending review', variant: 'warning' },
    verified: { label: 'Verified', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'destructive' },
    suspended: { label: 'Suspended', variant: 'destructive' },
};

const DOC_BADGE: Record<DocumentStatus, { label: string; variant: BadgeProps['variant'] }> = {
    pending: { label: 'Under review', variant: 'warning' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'destructive' },
};

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm font-medium text-foreground">{value}</dd>
        </div>
    );
}

interface DocumentRowProps {
    kind: DocumentKind;
    doc?: SellerDocument;
    needed: boolean;
    optional: boolean;
    locked: boolean;
    uploading: boolean;
    error?: string;
    onPick: (kind: DocumentKind, file: File) => void;
}

function DocumentRow({ kind, doc, needed, optional, locked, uploading, error, onPick }: DocumentRowProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const label = DOCUMENT_KIND_LABELS[kind];
    const badge = doc ? DOC_BADGE[doc.status] : needed ? { label: 'Needed', variant: 'warning' as const } : { label: 'Not uploaded', variant: 'secondary' as const };
    const uploaded = doc?.uploaded_at ? new Date(doc.uploaded_at) : null;

    return (
        <li className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                        {optional && !doc ? <span className="text-xs text-muted-foreground">Optional</span> : null}
                    </div>
                    {doc?.note ? <p className="break-words text-sm text-destructive">{doc.note}</p> : null}
                    {uploaded && !Number.isNaN(uploaded.getTime()) ? <p className="text-xs text-muted-foreground">Uploaded {uploaded.toLocaleDateString()}</p> : null}
                    {error ? (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    ) : null}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 pl-6 sm:pl-0">
                {doc?.url ? (
                    <Button asChild type="button" variant="ghost" size="sm" className="h-8">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" aria-label={`View ${label}`}>
                            <ExternalLink aria-hidden="true" />
                            View
                        </a>
                    </Button>
                ) : null}
                {!locked ? (
                    <>
                        <input
                            ref={inputRef}
                            type="file"
                            accept={DOCUMENT_ACCEPT}
                            className="sr-only"
                            tabIndex={-1}
                            aria-label={`Choose file for ${label}`}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (file) onPick(kind, file);
                            }}
                        />
                        <Button type="button" variant={doc ? 'outline' : 'default'} size="sm" className="h-8" disabled={uploading} onClick={() => inputRef.current?.click()}>
                            {uploading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Upload aria-hidden="true" />}
                            {uploading ? 'Uploading' : doc ? 'Replace' : 'Upload'}
                        </Button>
                    </>
                ) : null}
            </div>
        </li>
    );
}

interface VerificationTabProps {
    profile: SellerProfile;
    onChanged: () => Promise<unknown>;
}

export function VerificationTab({ profile, onChanged }: VerificationTabProps) {
    const [uploadingKind, setUploadingKind] = useState<DocumentKind | null>(null);
    const [rowErrors, setRowErrors] = useState<Partial<Record<DocumentKind, string>>>({});
    const [docsChanged, setDocsChanged] = useState(false);
    const [resubmitting, setResubmitting] = useState(false);
    const [resubmitError, setResubmitError] = useState<string | null>(null);
    const [resubmitNeedsCategories, setResubmitNeedsCategories] = useState(false);

    const status = profile.verification_status;
    const badge = STATUS_BADGE[status];
    const missing = profile.missing_documents;
    const locked = status === 'verified' || status === 'suspended';
    const registered = profile.business_type === 'registered_business';
    const docByKind = new Map(profile.documents.map((d) => [d.kind, d]));
    const visibleKinds = DOCUMENT_KINDS.filter((k) => k !== 'business_registration' || registered || docByKind.has(k) || missing.includes(k));

    const details: { label: string; value: string }[] = [
        profile.business_type ? { label: 'Business type', value: BUSINESS_TYPE_LABELS[profile.business_type] ?? profile.business_type } : null,
        profile.business_registration_number ? { label: 'Registration number', value: profile.business_registration_number } : null,
        profile.tax_id ? { label: 'Tax ID', value: profile.tax_id } : null,
        profile.id_type ? { label: 'ID type', value: ID_TYPE_LABELS[profile.id_type] ?? profile.id_type } : null,
        profile.id_number_last4 ? { label: 'ID number', value: `•••• ${profile.id_number_last4}` } : null,
    ].filter((d): d is { label: string; value: string } => d !== null);

    const missingCategories = (profile.missing_fields ?? []).includes('selling_categories');
    const canResubmit = !locked && missing.length === 0 && !missingCategories && (status === 'rejected' || Boolean(profile.can_resubmit));

    const handlePick = async (kind: DocumentKind, file: File) => {
        const problem = validateDocumentFile(file);
        setRowErrors((e) => ({ ...e, [kind]: problem ?? undefined }));
        if (problem) return;
        setUploadingKind(kind);
        try {
            await uploadSellerDocument(kind, file);
            setDocsChanged(true);
            toast.success(`${DOCUMENT_KIND_LABELS[kind]} uploaded`);
            await onChanged();
        } catch (e) {
            const err = e instanceof SellerProfileWriteError ? e : null;
            const message = err?.message ?? 'Could not upload this document. Please try again.';
            setRowErrors((prev) => ({ ...prev, [kind]: message }));
            toast.error(message);
        } finally {
            setUploadingKind(null);
        }
    };

    const handleResubmit = async () => {
        setResubmitting(true);
        setResubmitError(null);
        setResubmitNeedsCategories(false);
        try {
            await resubmitSellerApplication();
            setDocsChanged(false);
            toast.success('Application resubmitted for review');
            await onChanged();
        } catch (e) {
            if (e instanceof SellerProfileWriteError && (e.code === 'missing_categories' || e.missingFields.includes('selling_categories'))) {
                // Not a generic failure: point the seller at the Profile tab instead.
                setResubmitNeedsCategories(true);
                await onChanged().catch(() => undefined);
                return;
            }
            if (e instanceof SellerProfileWriteError && e.code === 'missing_documents') {
                setResubmitError(e.message);
                await onChanged().catch(() => undefined);
                return;
            }
            const message = e instanceof SellerProfileWriteError ? e.message : 'Could not resubmit your application. Please try again.';
            setResubmitError(message);
            toast.error(message);
        } finally {
            setResubmitting(false);
        }
    };

    return (
        <div className="space-y-3">
            <Card>
                <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">Verification status</CardTitle>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-1.5 p-3 pt-0 text-sm sm:p-4 sm:pt-0">
                    {status === 'verified' ? (
                        <p className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                            Your store is verified. Your products can be seen by buyers.
                        </p>
                    ) : null}
                    {status === 'pending' ? (
                        <p className="flex items-start gap-2">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                            <span>Your application is with our team for review. Your products won&apos;t be live until your store is verified, but you can keep preparing your listings.</span>
                        </p>
                    ) : null}
                    {status === 'rejected' ? (
                        <div className="space-y-1.5">
                            <p className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                                <span>Your application was not approved. Your products won&apos;t be live until your store is verified.</span>
                            </p>
                            <p className="break-words rounded-md border bg-muted px-3 py-2">
                                <span className="font-semibold">Reason:</span> {profile.verification_notes?.trim() || 'No reason was given. Please contact us.'}
                            </p>
                            <p className="text-muted-foreground">Fix the points above, replace any document that needs it, then resubmit your application.</p>
                        </div>
                    ) : null}
                    {status === 'suspended' ? (
                        <p className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                            <span>
                                Your store is suspended and your products are not visible. Contact us on{' '}
                                <a href="tel:+233248138722" className="font-semibold underline underline-offset-2">
                                    024 813 8722
                                </a>{' '}
                                or{' '}
                                <a href="https://wa.me/233248138722" target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
                                    WhatsApp
                                </a>
                                .
                            </span>
                        </p>
                    ) : null}
                </CardContent>
            </Card>

            {details.length ? (
                <Card>
                    <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
                        <CardTitle className="text-base">Submitted details</CardTitle>
                        <CardDescription>What you gave us when you applied. These can&apos;t be edited here.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                            {details.map((d) => (
                                <DetailRow key={d.label} label={d.label} value={d.value} />
                            ))}
                        </dl>
                    </CardContent>
                </Card>
            ) : null}

            <Card>
                <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-1">
                    <CardTitle className="text-base">Documents</CardTitle>
                    <CardDescription>JPG, PNG or PDF, up to 10 MB each. Our team reviews your application once the documents we need are uploaded.</CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                    {missing.length ? (
                        <p className="mb-1 rounded-md border border-warning-subtle bg-warning-subtle px-3 py-2 text-sm text-warning-subtle-foreground">
                            <span className="font-semibold">Still needed:</span> {missing.map((k) => DOCUMENT_KIND_LABELS[k] ?? k).join(', ')}.
                        </p>
                    ) : null}
                    <ul className="divide-y">
                        {visibleKinds.map((kind) => (
                            <DocumentRow
                                key={kind}
                                kind={kind}
                                doc={docByKind.get(kind)}
                                needed={missing.includes(kind)}
                                optional={kind === 'selfie_with_id'}
                                locked={locked}
                                uploading={uploadingKind === kind}
                                error={rowErrors[kind]}
                                onPick={handlePick}
                            />
                        ))}
                    </ul>
                </CardContent>
            </Card>

            {!locked ? (
                <div className="sticky bottom-[4.25rem] z-40 flex flex-col gap-2 border-t bg-background py-2.5 sm:flex-row sm:items-center sm:justify-between md:bottom-0">
                    <div className="min-w-0 text-sm text-muted-foreground" aria-live="polite">
                        {resubmitError ? (
                            <p role="alert" className="text-destructive">
                                {resubmitError}
                            </p>
                        ) : missingCategories || resubmitNeedsCategories ? (
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-1" role={resubmitNeedsCategories ? 'alert' : undefined}>
                                <span className={resubmitNeedsCategories ? 'text-destructive' : undefined}>Add what you sell in the Profile tab first</span>
                                <Button asChild type="button" variant="outline" size="sm" className="h-8">
                                    <Link to={PROFILE_TAB}>Go to Profile</Link>
                                </Button>
                                {missing.length ? <span className="basis-full">Then upload the missing documents.</span> : null}
                            </p>
                        ) : missing.length ? (
                            <p>Upload the missing documents to resubmit.</p>
                        ) : canResubmit ? (
                            <p>Ready to send for review.</p>
                        ) : (
                            <p>Resubmitting is only needed if your application is not approved. Changes you make now are included when we review it.</p>
                        )}
                    </div>
                    <Button type="button" className="shrink-0" disabled={!canResubmit || resubmitting} onClick={handleResubmit}>
                        {resubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RefreshCw aria-hidden="true" />}
                        Resubmit for review
                    </Button>
                </div>
            ) : null}
        </div>
    );
}
