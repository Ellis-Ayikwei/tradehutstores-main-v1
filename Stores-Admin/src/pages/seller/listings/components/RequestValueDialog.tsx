import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import { requestNewValue, type AttributeRequestError, type RequestValueOutcome } from '@/services/attributeRequestsService';
import type { OptionValue } from '../schema';
import { ColourField, colourError, isColourAttribute } from './ColourField';

const MAX_NAME = 100;
const MAX_NOTE = 500;

interface RequestValueDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    attributeId: string;
    attributeName: string;
    displayType: string;
    /** Values already loaded for this option type, to catch an exact match before asking staff. */
    existing: OptionValue[];
    /** Called with the outcome of a request that reached the server (created, exists, already requested). */
    onOutcome: (outcome: RequestValueOutcome) => void;
    /** Called when a loaded value already matches the typed name. */
    onMatchedExisting: (value: OptionValue) => void;
}

export function RequestValueDialog({ open, onOpenChange, attributeId, attributeName, displayType, existing, onOutcome, onMatchedExisting }: RequestValueDialogProps) {
    const [name, setName] = useState('');
    const [colour, setColour] = useState('');
    const [note, setNote] = useState('');
    const [error, setError] = useState<AttributeRequestError | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const busy = useRef(false);
    const withColour = isColourAttribute(attributeName, displayType);

    useEffect(() => {
        if (!open) {
            setName('');
            setColour('');
            setNote('');
            setError(null);
        }
    }, [open]);

    const trimmed = name.trim();
    const nameInvalid = trimmed.length < 1 || trimmed.length > MAX_NAME;
    const hexMessage = withColour ? colourError(colour) : '';
    const canSubmit = !nameInvalid && !hexMessage && !submitting;

    const submit = async () => {
        if (busy.current || !canSubmit) return;

        const match = existing.find((v) => v.label.trim().toLowerCase() === trimmed.toLowerCase());
        if (match) {
            onMatchedExisting(match);
            onOpenChange(false);
            return;
        }

        busy.current = true;
        setSubmitting(true);
        setError(null);
        try {
            const outcome = await requestNewValue({
                attribute: attributeId,
                value_name: trimmed,
                ...(withColour && colour.trim() ? { color_code: colour.trim().toUpperCase() } : {}),
                ...(note.trim() ? { note: note.trim() } : {}),
            });
            onOutcome(outcome);
            onOpenChange(false);
        } catch (err) {
            setError(err as AttributeRequestError);
        } finally {
            busy.current = false;
            setSubmitting(false);
        }
    };

    const nameFieldError = error?.fieldErrors?.value_name;
    const generalError = error && !nameFieldError ? error.message : null;

    return (
        <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : onOpenChange(next))}>
            <DialogContent className="gap-4 rounded-lg p-4 sm:max-w-md sm:rounded-lg sm:p-5">
                <DialogHeader>
                    <DialogTitle>Request a new {attributeName.toLowerCase()} value</DialogTitle>
                    <DialogDescription>Our team checks every new value before it can be used. You will be able to pick it here once it is approved.</DialogDescription>
                </DialogHeader>

                <form
                    className="space-y-3"
                    noValidate
                    onSubmit={(event) => {
                        event.preventDefault();
                        void submit();
                    }}
                >
                    <div className="space-y-1.5">
                        <Label htmlFor="request-value-name">Value name</Label>
                        <Input
                            id="request-value-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={MAX_NAME}
                            placeholder={withColour ? 'For example Mustard' : 'The value you need'}
                            autoComplete="off"
                            autoFocus
                            disabled={submitting}
                            aria-invalid={nameFieldError ? true : undefined}
                            aria-describedby={nameFieldError ? 'request-value-name-error' : undefined}
                        />
                        {nameFieldError ? (
                            <p id="request-value-name-error" className="text-xs font-medium text-destructive">
                                {nameFieldError}
                            </p>
                        ) : null}
                    </div>

                    {withColour ? <ColourField id="request-value-colour" value={colour} onChange={setColour} label="Colour (optional)" disabled={submitting} /> : null}

                    <div className="space-y-1.5">
                        <Label htmlFor="request-value-note">Note for our team (optional)</Label>
                        <Textarea id="request-value-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={MAX_NOTE} rows={2} disabled={submitting} />
                    </div>

                    {generalError ? (
                        <p role="alert" className="rounded-md bg-destructive-subtle p-2.5 text-sm text-destructive-subtle-foreground">
                            {generalError}
                        </p>
                    ) : null}

                    <DialogFooter className="pt-1">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!canSubmit}>
                            {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                            Send request
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
