import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import { cn } from '@/lib/utils';
import type { AdminSellerError } from '@/services/adminSellersService';
import { ErrorPanel } from '../../seller/components/ErrorPanel';
import { kindLabel } from './sellerUi';

/** Resolves to the error when the action failed (the dialog stays open), or null on success. */
export type ActionResult = AdminSellerError | null;

interface DecisionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: ReactNode;
    confirmLabel: string;
    destructive?: boolean;
    /** When set, a reason textarea is shown and must reach this many (trimmed) characters. */
    minReason?: number;
    reasonLabel?: string;
    reasonHint?: string;
    /** Field in a 400 response that belongs to the reason textarea. */
    reasonField?: string;
    onSubmit: (reason: string) => Promise<ActionResult>;
}

export function DecisionDialog({ open, onOpenChange, title, description, confirmLabel, destructive, minReason, reasonLabel = 'Reason', reasonHint, reasonField = 'verification_notes', onSubmit }: DecisionDialogProps) {
    const [reason, setReason] = useState('');
    const [error, setError] = useState<AdminSellerError | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const busy = useRef(false);

    useEffect(() => {
        if (!open) {
            setReason('');
            setError(null);
        }
    }, [open]);

    const trimmed = reason.trim();
    const needsReason = minReason !== undefined;
    const tooShort = needsReason && trimmed.length < (minReason ?? 0);

    const submit = async () => {
        if (busy.current || tooShort) return;
        busy.current = true;
        setSubmitting(true);
        setError(null);
        try {
            const result = await onSubmit(trimmed);
            if (result) setError(result);
        } finally {
            busy.current = false;
            setSubmitting(false);
        }
    };

    const fieldMessage = error?.fieldErrors?.[reasonField];
    const generalMessage = error && !fieldMessage ? error.message : null;

    return (
        <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>

                <form
                    className="space-y-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void submit();
                    }}
                    noValidate
                >
                    {error && generalMessage ? (
                        <ErrorPanel
                            title={error.code === 'missing_documents' ? 'Required documents are missing' : 'That did not go through'}
                            message={error.code === 'missing_documents' && error.missing?.length ? `Cannot approve until these are provided: ${error.missing.map(kindLabel).join(', ')}.` : generalMessage}
                        />
                    ) : null}

                    {needsReason ? (
                        <div className="space-y-1.5">
                            <Label htmlFor="decision-reason">{reasonLabel}</Label>
                            {reasonHint ? <p className="text-xs text-muted-foreground">{reasonHint}</p> : null}
                            <Textarea id="decision-reason" rows={4} value={reason} onChange={(event) => setReason(event.target.value)} disabled={submitting} autoFocus aria-invalid={Boolean(fieldMessage)} />
                            <div className="flex items-start justify-between gap-3 text-xs">
                                <span className={cn('text-muted-foreground', fieldMessage && 'text-destructive')}>{fieldMessage ?? (tooShort ? `At least ${minReason} characters` : '')}</span>
                                <span className={cn('shrink-0 tabular-nums', tooShort ? 'text-muted-foreground' : 'text-success-subtle-foreground')}>
                                    {trimmed.length} / {minReason} min
                                </span>
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter className="pt-1">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={submitting || tooShort}>
                            {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                            {confirmLabel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
