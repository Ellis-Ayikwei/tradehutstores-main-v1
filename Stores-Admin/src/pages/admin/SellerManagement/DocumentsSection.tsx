import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, ExternalLink, FileText, ImageOff, Loader2, X } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { apiUrl } from '@/services/axiosInstance';
import { reviewAdminSellerDocument, type AdminSellerError, type SellerDocument } from '@/services/adminSellersService';
import { DecisionDialog, type ActionResult } from './DecisionDialog';
import { DocStatusBadge, formatDate, kindLabel } from './sellerUi';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|bmp)$/i;

function resolveUrl(url: string): string {
    try {
        return new URL(url, apiUrl || window.location.origin).toString();
    } catch {
        return url;
    }
}

function isImage(url: string): boolean {
    try {
        return IMAGE_EXT.test(new URL(url, window.location.origin).pathname);
    } catch {
        return IMAGE_EXT.test(url.split('?')[0]);
    }
}

function Preview({ doc, url }: { doc: SellerDocument; url: string }) {
    const [failed, setFailed] = useState(false);
    const [enlarged, setEnlarged] = useState(false);
    const label = kindLabel(doc.kind);

    if (!isImage(url)) {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Open
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
        );
    }

    if (failed) {
        return (
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted p-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                    <ImageOff className="h-4 w-4" aria-hidden="true" />
                    Preview unavailable
                </span>
                <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    Open
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
            </div>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setEnlarged(true)}
                className="flex h-40 w-full items-center justify-center overflow-hidden rounded-md border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Enlarge ${label}`}
            >
                <img src={url} alt={label} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-contain" />
            </button>
            <Dialog open={enlarged} onOpenChange={setEnlarged}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{label}</DialogTitle>
                        <DialogDescription className="sr-only">Enlarged document image</DialogDescription>
                    </DialogHeader>
                    <div className="flex max-h-[70vh] items-center justify-center overflow-auto rounded-md border bg-muted">
                        <img src={url} alt={label} className="max-h-[70vh] w-auto max-w-full object-contain" />
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                        Open original
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                </DialogContent>
            </Dialog>
        </>
    );
}

interface DocumentsSectionProps {
    documents: SellerDocument[];
    missing: string[];
    /** Refetch detail and list after a document changes. */
    onChanged: () => void;
    /** 403/404/409 on a document should surface at sheet level too. */
    onError: (error: AdminSellerError) => void;
}

export function DocumentsSection({ documents, missing, onChanged, onError }: DocumentsSectionProps) {
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [rejecting, setRejecting] = useState<SellerDocument | null>(null);

    // Newest upload of each kind is the one under review; earlier uploads are kept as history.
    const { rows, latestIds } = useMemo(() => {
        const sorted = [...documents].sort((a, b) => (b.uploaded_at ?? '').localeCompare(a.uploaded_at ?? ''));
        const latest = new Set<string>();
        const seen = new Set<string>();
        for (const doc of sorted) {
            if (!seen.has(doc.kind)) {
                seen.add(doc.kind);
                latest.add(String(doc.id));
            }
        }
        return { rows: sorted, latestIds: latest };
    }, [documents]);

    const approve = async (doc: SellerDocument) => {
        if (pendingId) return;
        setPendingId(String(doc.id));
        try {
            await reviewAdminSellerDocument(doc.id, { status: 'approved' });
            toast.success(`${kindLabel(doc.kind)} approved`);
            onChanged();
        } catch (e) {
            const err = e as AdminSellerError;
            toast.error(err.message);
            if (err.kind === 'forbidden' || err.kind === 'not_found' || err.kind === 'conflict') {
                onError(err);
                onChanged();
            }
        } finally {
            setPendingId(null);
        }
    };

    const reject = async (note: string): Promise<ActionResult> => {
        if (!rejecting) return null;
        try {
            await reviewAdminSellerDocument(rejecting.id, { status: 'rejected', note });
            toast.success(`${kindLabel(rejecting.kind)} rejected`);
            setRejecting(null);
            onChanged();
            return null;
        } catch (e) {
            const err = e as AdminSellerError;
            if (err.kind === 'network' || err.kind === 'server') toast.error(err.message);
            return err;
        }
    };

    if (rows.length === 0 && missing.length === 0) {
        return <p className="text-sm text-muted-foreground">No documents have been uploaded.</p>;
    }

    return (
        <>
            <ul className="space-y-2">
                {rows.map((doc) => {
                    const url = doc.file_url ? resolveUrl(doc.file_url) : null;
                    const isLatest = latestIds.has(String(doc.id));
                    const working = pendingId === String(doc.id);
                    return (
                        <li key={doc.id} className="space-y-2 rounded-lg border p-3">
                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-foreground">
                                        {kindLabel(doc.kind)}
                                        {!isLatest ? <span className="ml-1.5 text-xs font-normal text-muted-foreground">Earlier upload</span> : null}
                                    </p>
                                    {doc.uploaded_at ? <p className="text-xs text-muted-foreground">Uploaded {formatDate(doc.uploaded_at)}</p> : null}
                                </div>
                                <DocStatusBadge status={doc.status} />
                            </div>

                            {url ? <Preview doc={doc} url={url} /> : <p className="text-xs text-muted-foreground">No file link was returned for this document.</p>}

                            {doc.note ? (
                                <p className="rounded-md bg-muted p-2 text-xs text-foreground">
                                    <span className="font-semibold">Note: </span>
                                    {doc.note}
                                </p>
                            ) : null}

                            {isLatest ? (
                                <div className="flex gap-2">
                                    <Button type="button" size="sm" variant="outline" disabled={Boolean(pendingId) || doc.status === 'approved'} onClick={() => void approve(doc)}>
                                        {working ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
                                        Approve
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="text-destructive hover:text-destructive"
                                        disabled={Boolean(pendingId) || doc.status === 'rejected'}
                                        onClick={() => setRejecting(doc)}
                                    >
                                        <X aria-hidden="true" />
                                        Reject
                                    </Button>
                                </div>
                            ) : null}
                        </li>
                    );
                })}

                {missing.map((kind) => (
                    <li key={`missing-${kind}`} className="flex items-center justify-between gap-2 rounded-lg border border-dashed p-3">
                        <p className="text-sm font-semibold text-foreground">{kindLabel(kind)}</p>
                        <span className="text-sm text-muted-foreground">Not provided</span>
                    </li>
                ))}
            </ul>

            <DecisionDialog
                open={Boolean(rejecting)}
                onOpenChange={(open) => (open ? undefined : setRejecting(null))}
                title={rejecting ? `Reject ${kindLabel(rejecting.kind)}?` : 'Reject document'}
                description="Say what is wrong with this document so the seller can replace it. This note is shown to the seller."
                confirmLabel="Reject document"
                destructive
                minReason={5}
                reasonLabel="Note"
                reasonField="note"
                onSubmit={reject}
            />
        </>
    );
}
