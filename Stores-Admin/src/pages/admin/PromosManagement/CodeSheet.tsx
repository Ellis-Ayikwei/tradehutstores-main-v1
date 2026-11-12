import React from 'react';
import { Building2, Loader2, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/shadcn/sheet';
import { cn } from '@/lib/utils';
import { DISCOUNT_TYPES, PromoCodeWritePayload, TARGET_TYPES, USER_SEGMENTS } from '@/services/promosAdminService';
import { Alert, Field } from './_shared';

export function toLocalInput(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string): string | null {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const Section: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
        </div>
        {children}
    </section>
);

const CheckRow: React.FC<{ id: string; checked: boolean; onChange: (v: boolean) => void; label: string; strong?: boolean }> = ({
    id,
    checked,
    onChange,
    label,
    strong,
}) => (
    <div className="flex items-center gap-2">
        <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} />
        <Label htmlFor={id} className={cn('cursor-pointer leading-snug', strong && 'font-semibold')}>
            {label}
        </Label>
    </div>
);

interface CodeSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: boolean;
    draft: PromoCodeWritePayload;
    setDraft: React.Dispatch<React.SetStateAction<PromoCodeWritePayload>>;
    error: string | null;
    saving: boolean;
    onSave: () => void;
}

export const CodeSheet: React.FC<CodeSheetProps> = ({ open, onOpenChange, editing, draft, setDraft, error, saving, onSave }) => {
    const numField = (key: 'discount_value' | 'buy_quantity' | 'get_quantity' | 'min_order_value' | 'min_items_count' | 'max_redemptions_per_user' | 'auto_apply_priority') =>
        (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) || 0 }));

    const nullableNum = (key: 'max_discount_amount' | 'fixed_price' | 'max_redemptions') => (e: React.ChangeEvent<HTMLInputElement>) =>
        setDraft((d) => ({ ...d, [key]: e.target.value ? Number(e.target.value) : null }));

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
                <SheetHeader className="border-b border-border p-4 pr-14 sm:p-6 sm:pr-14">
                    <SheetTitle>{editing ? 'Edit promo code' : 'New promo code'}</SheetTitle>
                    <SheetDescription>Define the discount, who can use it, and when it runs.</SheetDescription>
                </SheetHeader>

                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
                    {error ? <Alert>{error}</Alert> : null}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Code *" htmlFor="promo-code" hint="Customer types this at checkout. Auto-uppercased.">
                            <Input
                                id="promo-code"
                                className="font-mono uppercase"
                                value={draft.code}
                                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
                                placeholder="SUMMER20"
                            />
                        </Field>
                        <Field label="Internal name *" htmlFor="promo-name" hint="Only shown in admin">
                            <Input id="promo-name" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Summer campaign" />
                        </Field>
                    </div>
                    <Field label="Description" htmlFor="promo-desc" hint="Shown to the customer when they successfully apply">
                        <Input id="promo-desc" value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
                    </Field>

                    <Field label="Scope" hint="Leave Platform unless this code is paid for / scoped to a single seller.">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Button type="button" variant={draft.seller === null ? 'default' : 'outline'} onClick={() => setDraft((d) => ({ ...d, seller: null }))}>
                                <Zap aria-hidden="true" /> Platform-wide
                            </Button>
                            <div className="relative">
                                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                                <Input
                                    className="pl-9 font-mono"
                                    aria-label="Seller UUID"
                                    value={draft.seller ?? ''}
                                    onChange={(e) => setDraft((d) => ({ ...d, seller: e.target.value.trim() || null }))}
                                    placeholder="Seller UUID (paste here)"
                                />
                            </div>
                        </div>
                    </Field>

                    <Section title="Discount" icon={<Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />}>
                        <Field label="Type">
                            <Select value={draft.discount_type} onValueChange={(v) => setDraft((p) => ({ ...p, discount_type: v as typeof p.discount_type }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {DISCOUNT_TYPES.map((d) => (
                                        <SelectItem key={d.value} value={d.value}>
                                            {d.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field
                                label="Value"
                                htmlFor="promo-value"
                                hint={draft.discount_type === 'percentage' ? '1-100 (%)' : draft.discount_type === 'fixed_amount' ? 'GHS amount off' : 'Ignored for this type'}
                            >
                                <Input id="promo-value" type="number" min={0} value={draft.discount_value} onChange={numField('discount_value')} />
                            </Field>
                            {draft.discount_type === 'percentage' && (
                                <Field label="Max discount (GHS)" htmlFor="promo-max" hint="Cap the absolute amount (e.g. 20% but never more than GHS 50)">
                                    <Input id="promo-max" type="number" min={0} value={draft.max_discount_amount ?? ''} onChange={nullableNum('max_discount_amount')} placeholder="No cap" />
                                </Field>
                            )}
                            {draft.discount_type === 'fixed_price' && (
                                <Field label="Fixed cart price (GHS)" htmlFor="promo-fixed" hint="Customer pays this total regardless of subtotal">
                                    <Input id="promo-fixed" type="number" min={0} value={draft.fixed_price ?? ''} onChange={nullableNum('fixed_price')} />
                                </Field>
                            )}
                            {draft.discount_type === 'buy_x_get_y' && (
                                <>
                                    <Field label="Buy quantity" htmlFor="promo-buy">
                                        <Input id="promo-buy" type="number" min={1} value={draft.buy_quantity} onChange={numField('buy_quantity')} />
                                    </Field>
                                    <Field label="Get quantity (free)" htmlFor="promo-get">
                                        <Input id="promo-get" type="number" min={1} value={draft.get_quantity} onChange={numField('get_quantity')} />
                                    </Field>
                                </>
                            )}
                        </div>

                        <CheckRow
                            id="promo-free-ship"
                            checked={draft.include_free_shipping ?? false}
                            onChange={(v) => setDraft((d) => ({ ...d, include_free_shipping: v }))}
                            label="Also include free shipping"
                        />
                    </Section>

                    <Section title="Eligibility">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label="Min order value (GHS)" htmlFor="promo-minval">
                                <Input id="promo-minval" type="number" min={0} value={draft.min_order_value ?? 0} onChange={numField('min_order_value')} />
                            </Field>
                            <Field label="Min items in cart" htmlFor="promo-minitems">
                                <Input id="promo-minitems" type="number" min={0} value={draft.min_items_count ?? 0} onChange={numField('min_items_count')} />
                            </Field>
                            <Field label="Target">
                                <Select value={draft.target_type} onValueChange={(v) => setDraft((d) => ({ ...d, target_type: v as typeof d.target_type }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TARGET_TYPES.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="User segment">
                                <Select value={draft.user_segment} onValueChange={(v) => setDraft((d) => ({ ...d, user_segment: v as typeof d.user_segment }))}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {USER_SEGMENTS.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-6">
                            <CheckRow id="promo-first" checked={draft.first_order_only ?? false} onChange={(v) => setDraft((d) => ({ ...d, first_order_only: v }))} label="First order only" />
                            <CheckRow id="promo-stack" checked={draft.stackable ?? false} onChange={(v) => setDraft((d) => ({ ...d, stackable: v }))} label="Stackable with other promos" />
                        </div>
                    </Section>

                    <Section title="Limits & schedule">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <Field label="Max redemptions" htmlFor="promo-maxred" hint="Total cap. Empty = unlimited.">
                                <Input id="promo-maxred" type="number" min={0} value={draft.max_redemptions ?? ''} onChange={nullableNum('max_redemptions')} placeholder="Unlimited" />
                            </Field>
                            <Field label="Max per user" htmlFor="promo-maxuser" hint="Per-user cap. 0 = unlimited per user.">
                                <Input id="promo-maxuser" type="number" min={0} value={draft.max_redemptions_per_user ?? 1} onChange={numField('max_redemptions_per_user')} />
                            </Field>
                            <Field label="Starts at" htmlFor="promo-starts">
                                <Input
                                    id="promo-starts"
                                    type="datetime-local"
                                    value={toLocalInput(draft.starts_at ?? null)}
                                    onChange={(e) => setDraft((d) => ({ ...d, starts_at: fromLocalInput(e.target.value) }))}
                                />
                            </Field>
                            <Field label="Ends at" htmlFor="promo-ends">
                                <Input
                                    id="promo-ends"
                                    type="datetime-local"
                                    value={toLocalInput(draft.ends_at ?? null)}
                                    onChange={(e) => setDraft((d) => ({ ...d, ends_at: fromLocalInput(e.target.value) }))}
                                />
                            </Field>
                        </div>
                        <CheckRow id="promo-active" checked={draft.is_active ?? true} onChange={(v) => setDraft((d) => ({ ...d, is_active: v }))} label="Active (eligible to be applied)" />
                    </Section>

                    <Section title="Auto apply">
                        <CheckRow
                            id="promo-auto"
                            strong
                            checked={draft.auto_apply ?? false}
                            onChange={(v) => setDraft((d) => ({ ...d, auto_apply: v }))}
                            label="Auto-apply when conditions are met (no code entry needed)"
                        />
                        {draft.auto_apply && (
                            <Field label="Auto-apply priority" htmlFor="promo-prio" hint="Higher wins if multiple auto-apply codes qualify">
                                <Input id="promo-prio" type="number" min={0} value={draft.auto_apply_priority ?? 0} onChange={numField('auto_apply_priority')} />
                            </Field>
                        )}
                    </Section>
                </div>

                <SheetFooter className="border-t border-border bg-popover p-4 sm:p-6">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={onSave} disabled={saving}>
                        {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                        {saving ? 'Saving…' : editing ? 'Save changes' : 'Create code'}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
};
