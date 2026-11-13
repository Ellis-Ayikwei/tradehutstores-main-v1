import { useEffect, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/shadcn/sheet';
import { Textarea } from '@/components/shadcn/textarea';
import { ATTRIBUTE_REQUESTS_KEY, approveValueRequest, rejectValueRequest, type AttributeRequestError, type AttributeValueRequest } from '@/services/attributeRequestsService';
import { listAttributeValues, type AdminAttribute, type AdminAttributeValue } from '@/services/catalogAdminService';
import { ErrorPanel } from '@/components/admin/ErrorPanel';
import { ColourField, colourError, isColourAttribute } from './ColourField';
import { StatusBadge, formatDate, requesterLabel } from './requestUi';

const MIN_REJECT_NOTE = 5;
const SWR_OPTIONS = { shouldRetryOnError: false, revalidateOnFocus: false } as const;

const unwrap = <T,>(data: T[] | { results?: T[] } | null | undefined): T[] => (Array.isArray(data) ? data : (data?.results ?? []));

interface ReviewSheetProps {
    request: AttributeValueRequest | null;
    attributes: AdminAttribute[];
    onClose: () => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="break-words text-sm text-foreground">{children}</dd>
        </div>
    );
}

export function ReviewSheet({ request, attributes, onClose }: ReviewSheetProps) {
    const { mutate } = useSWRConfig();
    const [name, setName] = useState('');
    const [colour, setColour] = useState('');
    const [rejectNote, setRejectNote] = useState('');
    const [error, setError] = useState<AttributeRequestError | null>(null);
    const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
    const lock = useRef(false);

    const requestId = request?.id ?? null;
    useEffect(() => {
        setName(request?.value_name ?? '');
        setColour(request?.color_code ?? '');
        setRejectNote('');
        setError(null);
        // Reset only when a different request is opened.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId]);

    const attributeId = request ? String(request.attribute.id) : null;
    const attribute = attributes.find((a) => String(a.id) === attributeId);
    const withColour = request ? isColourAttribute(request.attribute.name, attribute?.display_type) : false;

    const values = useSWR<AdminAttributeValue[], unknown>(attributeId ? ['admin:attribute-values', attributeId] : null, () => listAttributeValues(attributeId ?? undefined).then((rows) => unwrap(rows)), SWR_OPTIONS);

    const trimmed = name.trim();
    const similar = values.data?.find((v) => (v.value_name ?? '').trim().toLowerCase() === trimmed.toLowerCase() && trimmed !== '');
    const hexMessage = withColour ? colourError(colour) : '';
    const pending = request?.status === 'pending';
    const canApprove = pending && trimmed.length >= 1 && trimmed.length <= 100 && !hexMessage && busy === null;
    const canReject = pending && rejectNote.trim().length >= MIN_REJECT_NOTE && busy === null;

    const refreshAll = () => mutate((key) => Array.isArray(key) && key[0] === ATTRIBUTE_REQUESTS_KEY);

    const run = async (kind: 'approve' | 'reject') => {
        if (!request || lock.current) return;
        lock.current = true;
        setBusy(kind);
        setError(null);
        try {
            if (kind === 'approve') {
                const result = await approveValueRequest(request.id, {
                    value_name: trimmed,
                    ...(withColour || request.color_code ? { color_code: colour.trim().toUpperCase() } : {}),
                });
                toast.success(result.status === 'duplicate' ? 'Linked to existing value' : `${trimmed} added to ${request.attribute.name}`);
            } else {
                await rejectValueRequest(request.id, rejectNote.trim());
                toast.success('Request rejected. The seller will see your note.');
            }
            await refreshAll();
            onClose();
        } catch (err) {
            const e = err as AttributeRequestError;
            if (e.code === 'already_reviewed') {
                toast.error('Someone already reviewed this request. The list has been refreshed.');
                await refreshAll();
                onClose();
            } else {
                setError(e);
            }
        } finally {
            lock.current = false;
            setBusy(null);
        }
    };

    const who = request ? requesterLabel(request) : { primary: '', secondary: '' };

    return (
        <Sheet open={Boolean(request)} onOpenChange={(open) => (!open && busy === null ? onClose() : undefined)}>
            <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md sm:p-0">
                <SheetHeader className="space-y-1 border-b p-4 pr-12">
                    <SheetTitle>Review value request</SheetTitle>
                    <SheetDescription>{request ? `${request.attribute.name} · requested by ${who.primary}` : ''}</SheetDescription>
                </SheetHeader>

                {request ? (
                    <>
                        <div className="flex-1 space-y-4 overflow-y-auto p-4">
                            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                                <Field label="Status">
                                    <StatusBadge status={request.status} />
                                </Field>
                                <Field label="Requested">{formatDate(request.created_on) || '-'}</Field>
                                <Field label="Seller store">{request.requester?.store_name || '-'}</Field>
                                <Field label="Seller email">{request.requester?.email || '-'}</Field>
                            </dl>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground">Seller&apos;s note</p>
                                <p className="whitespace-pre-wrap break-words text-sm text-foreground">{request.note || 'No note left.'}</p>
                            </div>

                            {!pending ? (
                                <div className="space-y-1 rounded-md border bg-muted p-3 text-sm">
                                    <p className="font-semibold text-foreground">{request.value_name}</p>
                                    {request.review_note ? <p className="text-muted-foreground">Review note: {request.review_note}</p> : <p className="text-muted-foreground">This request has already been reviewed.</p>}
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="review-value-name">Value name</Label>
                                            <Input id="review-value-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="off" disabled={busy !== null} />
                                        </div>
                                        {withColour ? <ColourField id="review-value-colour" value={colour} onChange={setColour} label="Colour" disabled={busy !== null} /> : null}
                                        <p className="text-sm text-muted-foreground">
                                            Will be added to <span className="font-semibold text-foreground">{request.attribute.name}</span>
                                            {trimmed ? (
                                                <>
                                                    {' '}
                                                    as <span className="font-semibold text-foreground">{trimmed}</span>
                                                </>
                                            ) : null}
                                            .
                                        </p>
                                        {similar ? (
                                            <p role="status" className="flex items-start gap-2 rounded-md bg-warning-subtle p-2.5 text-sm text-warning-subtle-foreground">
                                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                                <span>
                                                    {request.attribute.name} already has a value named &quot;{similar.value_name}&quot;. Approving will link the seller to it instead of creating a duplicate.
                                                </span>
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="space-y-1.5 border-t pt-4">
                                        <Label htmlFor="review-reject-note">Reject instead</Label>
                                        <Textarea
                                            id="review-reject-note"
                                            value={rejectNote}
                                            onChange={(e) => setRejectNote(e.target.value)}
                                            rows={3}
                                            placeholder="Tell the seller why (at least 5 characters)"
                                            disabled={busy !== null}
                                        />
                                        <Button type="button" variant="destructive" size="sm" onClick={() => void run('reject')} disabled={!canReject}>
                                            {busy === 'reject' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <X aria-hidden="true" />}
                                            Reject request
                                        </Button>
                                    </div>
                                </>
                            )}

                            {error ? <ErrorPanel title="Could not save" message={error.message} /> : null}
                        </div>

                        {pending ? (
                            <div className="flex items-center justify-end gap-2 border-t bg-card p-3">
                                <Button type="button" variant="outline" onClick={onClose} disabled={busy !== null}>
                                    Cancel
                                </Button>
                                <Button type="button" onClick={() => void run('approve')} disabled={!canApprove}>
                                    {busy === 'approve' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
                                    Approve
                                </Button>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </SheetContent>
        </Sheet>
    );
}
