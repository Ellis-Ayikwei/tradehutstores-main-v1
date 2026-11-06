import { useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Resolver } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useBlocker } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { CategoryMultiSelect, MAX_SELLING_CATEGORIES } from '../components/CategoryMultiSelect';
import { Switch } from '@/components/shadcn/switch';
import { Textarea } from '@/components/shadcn/textarea';
import { SellerProfileWriteError, updateSellerProfile, type SellerProfile, type SellerProfileUpdate } from '@/services/sellerProfileService';
import { IDENTITY_LOCKED_FIELDS, buildProfileSchema, normaliseOther, toFormValues, type ProfileFormValues } from './schema';

interface ProfileTabProps {
    profile: SellerProfile;
    onSaved: (profile: SellerProfile) => void;
}

export function ProfileTab({ profile, onSaved }: ProfileTabProps) {
    const status = profile.verification_status;
    const identityLocked = status === 'verified';
    const readOnly = status === 'suspended';
    const noneSaved = (profile.selling_categories ?? []).length === 0 && !(profile.other_category ?? '').trim();
    const categoriesRequired = (profile.missing_fields ?? []).includes('selling_categories');
    const lockedHint = 'Contact support to change this.';

    // Set once the seller edits either category field. Until then, sellers with no categories saved can still save other changes.
    const categoriesTouched = useRef(false);
    const lockedForm = identityLocked || readOnly;
    const requiredByStatus = status === 'pending' || status === 'rejected' || categoriesRequired;
    const resolver: Resolver<ProfileFormValues> = (values, context, options) =>
        zodResolver(buildProfileSchema({ locked: lockedForm, enforceCategories: requiredByStatus || categoriesTouched.current }))(values, context, options);

    const form = useForm<ProfileFormValues>({ resolver, defaultValues: toFormValues(profile), mode: 'onTouched' });
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const isDirty = form.formState.isDirty;
    const dirty = isDirty && !saving;
    const dirtyRef = useRef(dirty);
    dirtyRef.current = dirty;

    // Pick up server-side changes (e.g. a status change) without clobbering what the seller is typing.
    useEffect(() => {
        if (!dirtyRef.current) form.reset(toFormValues(profile));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile]);

    // Tab switches only change the query string, so only a different page counts as leaving.
    const blocker = useBlocker(({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname);

    useEffect(() => {
        if (!dirty) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    const onSubmit = form.handleSubmit(async (values) => {
        setSaving(true);
        setFormError(null);
        try {
            const body: SellerProfileUpdate = { ...values, other_category: normaliseOther(values.other_category) };
            // The API validates the pair only when it is sent, so leave both out unless the seller edited them.
            if (!categoriesTouched.current) {
                delete body.selling_categories;
                delete body.other_category;
            }
            if (identityLocked) IDENTITY_LOCKED_FIELDS.forEach((k) => delete body[k]);
            const updated = await updateSellerProfile(body);
            categoriesTouched.current = false;
            form.reset(toFormValues(updated));
            onSaved(updated);
            toast.success('Store details saved');
        } catch (e) {
            const err = e instanceof SellerProfileWriteError ? e : new SellerProfileWriteError('Could not save your store details. Please try again.', 'unknown');
            const known = Object.keys(form.getValues());
            let placed = false;
            err.fields.forEach((f) => {
                if (known.includes(f.name)) {
                    form.setError(f.name as keyof ProfileFormValues, { type: 'server', message: f.message });
                    placed = true;
                }
            });
            if (!placed) setFormError(err.message);
            toast.error(err.code === 'identity_locked' ? 'Some details can only be changed by support' : placed ? 'Please fix the highlighted fields' : err.message);
        } finally {
            setSaving(false);
        }
    });

    return (
        <Form {...form}>
            <form onSubmit={onSubmit} noValidate className="space-y-3">
                {formError ? (
                    <p role="alert" className="rounded-lg border border-destructive-subtle bg-destructive-subtle px-3 py-2 text-sm text-destructive-subtle-foreground">
                        {formError}
                    </p>
                ) : null}

                <Card>
                    <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
                        <CardTitle className="text-base">Store details</CardTitle>
                        <CardDescription>Shown to buyers and used by our team to reach you.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 p-3 pt-0 sm:grid-cols-2 sm:p-4 sm:pt-0">
                        <FormField
                            control={form.control}
                            name="business_name"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5 sm:col-span-2">
                                    <FormLabel>Store name</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled={identityLocked || readOnly} maxLength={255} autoComplete="organization" />
                                    </FormControl>
                                    {identityLocked ? <FormDescription>{lockedHint}</FormDescription> : null}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="business_description"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5 sm:col-span-2">
                                    <FormLabel>About your store (optional)</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} disabled={readOnly} rows={3} maxLength={2000} />
                                    </FormControl>
                                    <FormDescription>Tell buyers about your store.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="selling_categories"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5 sm:col-span-2">
                                    <FormLabel>Categories you sell</FormLabel>
                                    {categoriesRequired && !readOnly ? (
                                        <p role="status" className="rounded-md border border-warning-subtle bg-warning-subtle px-3 py-2 text-sm text-warning-subtle-foreground">
                                            Add the categories you sell. We need this before we can review your application.
                                        </p>
                                    ) : noneSaved && !readOnly ? (
                                        <p className="rounded-md bg-info-subtle px-3 py-2 text-sm text-info-subtle-foreground">Add the categories you sell so buyers and RFQ requests can find you.</p>
                                    ) : null}
                                    <FormControl>
                                        <div role="group">
                                            <CategoryMultiSelect
                                                value={field.value}
                                                onChange={(ids) => {
                                                    categoriesTouched.current = true;
                                                    form.setValue('selling_categories', ids, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                                                }}
                                                knownCategories={profile.selling_categories ?? []}
                                                max={MAX_SELLING_CATEGORIES}
                                                disabled={readOnly}
                                                invalid={Boolean(form.formState.errors.selling_categories)}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormDescription>Pick everything you sell. You can change this later.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="other_category"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5 sm:col-span-2">
                                    <FormLabel>Other category</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            disabled={readOnly}
                                            maxLength={80}
                                            autoComplete="off"
                                            onChange={(event) => {
                                                categoriesTouched.current = true;
                                                field.onChange(event);
                                                void form.trigger('selling_categories');
                                            }}
                                        />
                                    </FormControl>
                                    <FormDescription>Only if your category isn't listed.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="business_email"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel>Contact email</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled={readOnly} type="email" inputMode="email" autoComplete="email" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="business_phone"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel>Contact phone</FormLabel>
                                    <FormControl>
                                        <Input {...field} disabled={identityLocked || readOnly} type="tel" inputMode="tel" autoComplete="tel" />
                                    </FormControl>
                                    {identityLocked ? <FormDescription>{lockedHint}</FormDescription> : null}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="business_address"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5 sm:col-span-2">
                                    <FormLabel>Business address</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} disabled={identityLocked || readOnly} rows={2} maxLength={500} autoComplete="street-address" />
                                    </FormControl>
                                    {identityLocked ? <FormDescription>{lockedHint}</FormDescription> : null}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
                        <CardTitle className="text-base">Orders and policies</CardTitle>
                        <CardDescription>What buyers see before they order from you.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 gap-3 p-3 pt-0 sm:p-4 sm:pt-0 lg:grid-cols-2">
                        <FormField
                            control={form.control}
                            name="is_accepting_orders"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between gap-3 space-y-0 rounded-md border bg-background p-3 lg:col-span-2">
                                    <div className="min-w-0 space-y-0.5">
                                        <FormLabel>Accepting orders</FormLabel>
                                        <FormDescription>Turn off to pause new orders without hiding your store.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch disabled={readOnly} checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="return_policy"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel>Return policy</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} disabled={readOnly} rows={4} maxLength={5000} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="shipping_policy"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel>Shipping policy</FormLabel>
                                    <FormControl>
                                        <Textarea {...field} disabled={readOnly} rows={4} maxLength={5000} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <div className="sticky bottom-[4.25rem] z-40 flex items-center justify-between gap-2 border-t bg-background py-2.5 md:bottom-0">
                    <p className="min-w-0 truncate text-sm text-muted-foreground" aria-live="polite">
                        {readOnly ? 'Your store is suspended, so these details are read-only.' : isDirty ? 'You have unsaved changes' : 'All changes saved'}
                    </p>
                    <div className="flex shrink-0 gap-2">
                        <Button type="button" variant="outline" disabled={!isDirty || saving || readOnly} onClick={() => {
                                categoriesTouched.current = false;
                                form.clearErrors();
                                form.reset(toFormValues(profile));
                            }}>
                            Discard
                        </Button>
                        <Button type="submit" disabled={!isDirty || saving || readOnly}>
                            {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                            Save changes
                        </Button>
                    </div>
                </div>

                <Dialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.state === 'blocked' && blocker.reset()}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Leave without saving?</DialogTitle>
                            <DialogDescription>You have changes that have not been saved. If you leave now they will be lost.</DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => blocker.state === 'blocked' && blocker.reset()}>
                                Keep editing
                            </Button>
                            <Button type="button" variant="destructive" onClick={() => blocker.state === 'blocked' && blocker.proceed()}>
                                Leave
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </form>
        </Form>
    );
}
