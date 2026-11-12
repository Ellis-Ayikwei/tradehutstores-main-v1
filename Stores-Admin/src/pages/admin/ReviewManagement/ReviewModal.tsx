import React, { useMemo, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/shadcn/sheet';
import { Textarea } from '@/components/shadcn/textarea';
import { cn } from '@/lib/utils';

interface Provider {
    id: string;
    name: string;
    company_name: string;
    email: string;
}

interface Customer {
    id: string;
    user: string;
    user_email: string;
    user_first_name: string;
    user_last_name: string;
}

interface Job {
    id: string;
    title: string;
    status: string;
    request?: {
        tracking_number: string;
    } | null;
}

interface Review {
    id: string;
    provider: string;
    customer: string;
}

export interface ReviewForm {
    provider: string;
    customer: string;
    overall_rating: string;
    punctuality_rating: string;
    service_quality_rating: string;
    communication_rating: string;
    professionalism_rating: string;
    value_for_money_rating: string;
    review_text: string;
    is_verified: boolean;
    is_public: boolean;
    job: string;
}

interface ReviewModalProps {
    isOpen: boolean;
    editingReview: Review | null;
    form: ReviewForm;
    providers: Provider[];
    customers: Customer[];
    jobs: Job[];
    saving: boolean;
    onClose: () => void;
    onFormChange: (field: string, value: any) => void;
    onSave: () => void;
}

interface Option {
    value: string;
    label: string;
}

/** Searchable single-select rendered inline (no popover), so it works inside a sheet on mobile. */
const PickerField: React.FC<{
    id: string;
    label: string;
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder: string;
    emptyText: string;
}> = ({ id, label, value, options, onChange, placeholder, emptyText }) => {
    const [query, setQuery] = useState('');
    const selected = options.find((o) => o.value === value);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    }, [options, query]);

    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            {selected ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted px-3 py-2 text-sm">
                    <span className="min-w-0 truncate font-medium">{selected.label}</span>
                    <Button type="button" variant="ghost" size="icon-xs" onClick={() => onChange('')} aria-label={`Clear ${label}`}>
                        <X aria-hidden="true" />
                    </Button>
                </div>
            ) : null}
            <Input id={id} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
            <ul className="max-h-40 overflow-y-auto rounded-xl border border-border bg-card" role="listbox" aria-label={label}>
                {filtered.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>
                ) : (
                    filtered.map((o) => (
                        <li key={o.value} role="option" aria-selected={o.value === value}>
                            <button
                                type="button"
                                onClick={() => onChange(o.value)}
                                className={cn(
                                    'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted',
                                    o.value === value && 'bg-primary-subtle text-primary-subtle-foreground'
                                )}
                            >
                                <span className="min-w-0 truncate">{o.label}</span>
                                {o.value === value ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
                            </button>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

const RATING_FIELDS: { key: keyof ReviewForm; label: string; hint: string }[] = [
    { key: 'overall_rating', label: 'Overall rating *', hint: 'Overall experience' },
    { key: 'punctuality_rating', label: 'Punctuality *', hint: 'On-time delivery' },
    { key: 'service_quality_rating', label: 'Service quality *', hint: 'Quality of service provided' },
    { key: 'communication_rating', label: 'Communication *', hint: 'Clear communication' },
    { key: 'professionalism_rating', label: 'Professionalism *', hint: 'Professional behavior' },
    { key: 'value_for_money_rating', label: 'Value for money *', hint: 'Price vs quality' },
];

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, editingReview, form, providers, customers, jobs, saving, onClose, onFormChange, onSave }) => {
    const providerOptions = useMemo(() => providers.map((p) => ({ value: p.id, label: p.company_name || p.name })), [providers]);
    const customerOptions = useMemo(
        () => customers.map((c) => ({ value: c.id, label: `${c.user_first_name} ${c.user_last_name} (${c.user_email})` })),
        [customers]
    );
    const jobOptions = useMemo(
        () => jobs.map((j) => ({ value: j.id, label: `${j.title} (${j.id})${j.request?.tracking_number ? ` - ${j.request.tracking_number}` : ''}` })),
        [jobs]
    );

    return (
        <Sheet open={isOpen} onOpenChange={(o) => (!o ? onClose() : undefined)}>
            <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
                <SheetHeader className="border-b border-border p-4 pr-14 sm:p-6 sm:pr-14">
                    <SheetTitle>{editingReview ? 'Edit review' : 'Add review'}</SheetTitle>
                    <SheetDescription>{editingReview ? 'Update review details and ratings.' : 'Create a customer review for a provider.'}</SheetDescription>
                </SheetHeader>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                    <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basic information</h3>
                        <PickerField
                            id="review-provider"
                            label="Provider *"
                            value={form.provider}
                            options={providerOptions}
                            onChange={(v) => onFormChange('provider', v)}
                            placeholder="Search providers"
                            emptyText="No providers found"
                        />
                        <PickerField
                            id="review-customer"
                            label="Customer *"
                            value={form.customer}
                            options={customerOptions}
                            onChange={(v) => onFormChange('customer', v)}
                            placeholder="Search customers"
                            emptyText="No customers found"
                        />
                    </section>

                    <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rating details</h3>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {RATING_FIELDS.map((f) => (
                                <div key={f.key} className="space-y-1.5">
                                    <Label htmlFor={`review-${f.key}`}>{f.label}</Label>
                                    <Input
                                        id={`review-${f.key}`}
                                        type="number"
                                        min="1"
                                        max="5"
                                        step="0.1"
                                        inputMode="decimal"
                                        value={form[f.key] as string}
                                        onChange={(e) => onFormChange(f.key, e.target.value)}
                                        placeholder="1.0 - 5.0"
                                    />
                                    <p className="text-xs text-muted-foreground">{f.hint}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review content</h3>
                        <div className="space-y-1.5">
                            <Label htmlFor="review-text">Review text</Label>
                            <Textarea id="review-text" value={form.review_text} onChange={(e) => onFormChange('review_text', e.target.value)} rows={5} maxLength={1000} className="resize-none" />
                            <p className="text-xs text-muted-foreground">{form.review_text.length}/1000 characters</p>
                        </div>
                        <PickerField
                            id="review-job"
                            label="Related job (optional)"
                            value={form.job}
                            options={jobOptions}
                            onChange={(v) => onFormChange('job', v)}
                            placeholder="Search jobs"
                            emptyText="No jobs found"
                        />
                    </section>

                    <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review settings</h3>
                        <div className="flex items-start gap-3">
                            <Checkbox id="review-verified" className="mt-0.5" checked={form.is_verified} onCheckedChange={(v) => onFormChange('is_verified', v === true)} />
                            <div className="space-y-0.5">
                                <Label htmlFor="review-verified" className="cursor-pointer">
                                    Verified review
                                </Label>
                                <p className="text-xs text-muted-foreground">Mark this review as verified by admin</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <Checkbox id="review-public" className="mt-0.5" checked={form.is_public} onCheckedChange={(v) => onFormChange('is_public', v === true)} />
                            <div className="space-y-0.5">
                                <Label htmlFor="review-public" className="cursor-pointer">
                                    Public review
                                </Label>
                                <p className="text-xs text-muted-foreground">Make this review visible to other users</p>
                            </div>
                        </div>
                    </section>
                </div>

                <SheetFooter className="border-t border-border bg-popover p-4 sm:p-6">
                    <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={onSave} disabled={saving || !form.provider || !form.customer}>
                        {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                        {saving ? (editingReview ? 'Updating…' : 'Creating…') : editingReview ? 'Update review' : 'Create review'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};

export default ReviewModal;
