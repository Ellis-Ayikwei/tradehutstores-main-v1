import { useState } from 'react';
import { Info, Loader2, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Switch } from '@/components/shadcn/switch';
import { fetchAttributeValues, fetchAttributes, formatMoney, LOW_STOCK_THRESHOLD } from '@/services/sellerListingsService';
import { OptionTypesEditor } from '../components/OptionTypesEditor';
import { VariantMatrix } from '../components/VariantMatrix';
import { resuggestSkus, syncMatrix, toOptionValue, valueLabels } from '../components/optionUtils';
import { emptyVariant, type ImageItem, type ListingFormValues, type OptionType } from '../schema';

const MAX_NAMED_VARIANTS = 50;

interface VariantsStepProps {
    currency?: string;
    images: ImageItem[];
    onImagesChange: (next: ImageItem[]) => void;
}

export function VariantsStep({ currency, images, onImagesChange }: VariantsStepProps) {
    const { control, watch, setValue, getValues, formState } = useFormContext<ListingFormValues>();
    const { fields, append, remove, replace } = useFieldArray({ control, name: 'variants' });
    const variants = watch('variants');
    const hasOptions = watch('hasOptions');
    const mode = watch('optionsMode');
    const types = watch('optionTypes');
    const discount = Number(watch('discount_percentage')) || 0;
    const [confirmOff, setConfirmOff] = useState(false);
    const [converting, setConverting] = useState(false);

    const structured = hasOptions && mode === 'attributes';
    const named = hasOptions && mode === 'names';
    const savedNamedRows = named && variants.some((v) => v.serverId);

    const arrayError = formState.errors.variants?.root?.message ?? formState.errors.variants?.message;
    const typesError = formState.errors.optionTypes?.root?.message ?? formState.errors.optionTypes?.message ?? (formState.errors.optionTypes as unknown as { message?: string }[] | undefined)?.find?.((e) => e?.message)?.message;

    /* ------------------------------------------------------------- toggle */

    const turnOn = () => {
        const first = variants?.[0];
        setValue('hasOptions', true, { shouldDirty: true });
        setValue('optionsMode', 'attributes', { shouldDirty: true });
        setValue('optionTypes', [], { shouldDirty: true });
        // The simple item's price and SKU become the starting point for the matrix.
        if (first?.price.trim() && !getValues('basePrice').trim()) setValue('basePrice', first.price.trim());
        if (first?.sku.trim() && !getValues('baseSku').trim()) setValue('baseSku', first.sku.trim());
        replace([]);
    };

    const turnOff = () => {
        const rows = getValues('variants');
        const first = rows.find((r) => r.enabled) ?? rows[0];
        setValue('hasOptions', false, { shouldDirty: true });
        setValue('optionTypes', [], { shouldDirty: true });
        // A row that carried structured values is cleared so it saves as a plain item.
        replace([first ? { ...first, name: '', enabled: true, skuAuto: false, ...(first.valueIds ? { valueIds: [] } : {}) } : emptyVariant()]);
        setConfirmOff(false);
    };

    const onToggle = (checked: boolean) => {
        if (checked) turnOn();
        else if (variants.filter((v) => v.enabled).length > 1) setConfirmOff(true);
        else turnOff();
    };

    /* --------------------------------------------------- structured options */

    const rebuild = (nextTypes: OptionType[]) => {
        setValue('optionTypes', nextTypes, { shouldDirty: true });
        replace(syncMatrix(nextTypes, getValues('variants'), { baseSku: getValues('baseSku'), basePrice: getValues('basePrice') }));
    };

    const onBaseSkuChange = (value: string) => {
        setValue('baseSku', value, { shouldDirty: true });
        replace(resuggestSkus(getValues('optionTypes'), getValues('variants'), value));
    };

    const onBasePriceChange = (value: string) => {
        setValue('basePrice', value, { shouldDirty: true });
        // Rows that have no price yet follow the base price; anything the seller entered is left alone.
        getValues('variants').forEach((v, i) => {
            if (v.enabled && !v.price.trim()) setValue(`variants.${i}.price`, value.trim(), { shouldDirty: true });
        });
    };

    const useNamedOptions = () => {
        setValue('optionsMode', 'names', { shouldDirty: true });
        setValue('optionTypes', [], { shouldDirty: true });
        replace([emptyVariant(), emptyVariant()]);
    };

    const useOptionTypes = () => {
        setValue('optionsMode', 'attributes', { shouldDirty: true });
        setValue('optionTypes', [], { shouldDirty: true });
        replace([]);
    };

    /** Best effort: split names like "Red / Large" and match each part to an existing option value. */
    const convertNames = async () => {
        setConverting(true);
        try {
            const [attrs, allValues] = await Promise.all([fetchAttributes(), fetchAttributeValues()]);
            const rows = getValues('variants');
            const parts = rows.map((r) => r.name.split(/\s*[/,|]\s*|\s+-\s+/).map((p) => p.trim()).filter(Boolean));
            const width = parts[0]?.length ?? 0;
            if (width < 1 || width > 3 || parts.some((p) => p.length !== width)) throw new Error('shape');

            const attrById = new Map(attrs.map((a) => [a.id, a]));
            const matched: { attributeId: string; valueId: string }[][] = [];
            for (const p of parts) {
                const row: { attributeId: string; valueId: string }[] = [];
                for (const part of p) {
                    const hits = allValues.filter((v) => v.label.toLowerCase() === part.toLowerCase());
                    if (new Set(hits.map((h) => h.attributeId)).size !== 1) throw new Error('match');
                    row.push({ attributeId: hits[0].attributeId, valueId: hits[0].id });
                }
                matched.push(row);
            }
            const nextTypes: OptionType[] = [];
            for (let j = 0; j < width; j += 1) {
                const attributeId = matched[0][j].attributeId;
                const attr = attrById.get(attributeId);
                if (!attr || matched.some((m) => m[j].attributeId !== attributeId) || nextTypes.some((t) => t.attributeId === attributeId)) throw new Error('types');
                const seen = new Set<string>();
                const values = matched
                    .map((m) => allValues.find((v) => v.id === m[j].valueId))
                    .filter((v): v is NonNullable<typeof v> => Boolean(v) && !seen.has((v as { id: string }).id) && Boolean(seen.add((v as { id: string }).id)))
                    .map(toOptionValue);
                nextTypes.push({ attributeId, name: attr.name, displayType: attr.displayType, values });
            }
            const keys = new Set(matched.map((m) => m.map((x) => x.valueId).join('|')));
            if (keys.size !== rows.length) throw new Error('dupes');

            const converted = rows.map((r, i) => ({ ...r, name: '', enabled: true, skuAuto: false, valueIds: matched[i].map((m) => m.valueId) }));
            const next = syncMatrix(nextTypes, converted, { baseSku: '', basePrice: '' }).map((r) => (r.serverId ? r : { ...r, enabled: false, sku: '', skuAuto: false }));
            setValue('optionsMode', 'attributes', { shouldDirty: true });
            setValue('optionTypes', nextTypes, { shouldDirty: true });
            replace(next);
            toast.success('Converted. Check the rows below, then continue.');
        } catch (e) {
            const network = e instanceof Error && !['shape', 'match', 'types', 'dupes'].includes(e.message);
            toast.error(network ? 'Could not load option values. Try again.' : 'We could not match every name to an existing option value. Pick option types yourself below or keep the names.');
        } finally {
            setConverting(false);
        }
    };

    /* ------------------------------------------------------------- render */

    const rowFields = (index: number, withName: boolean) => {
        const price = variants?.[index]?.price?.trim() ?? '';
        const qty = Number(variants?.[index]?.quantity);
        const priceNum = Number(price);
        const showFinal = discount > 0 && Number.isFinite(priceNum) && priceNum > 0;
        return (
            <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                    {withName ? (
                        <FormField
                            control={control}
                            name={`variants.${index}.name`}
                            render={({ field: f }) => (
                                <FormItem className="col-span-2 space-y-1 sm:col-span-12">
                                    <FormLabel>Option name</FormLabel>
                                    <FormControl>
                                        <Input {...f} maxLength={255} autoComplete="off" placeholder="Red / Large" />
                                    </FormControl>
                                    <FormDescription>This is what buyers choose from, e.g. Red / Large</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    ) : null}
                    <FormField
                        control={control}
                        name={`variants.${index}.price`}
                        render={({ field: f }) => (
                            <FormItem className="col-span-1 space-y-1 sm:col-span-4">
                                <FormLabel>{currency ? `Price (${currency})` : 'Price'}</FormLabel>
                                <FormControl>
                                    <Input {...f} inputMode="decimal" autoComplete="off" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`variants.${index}.quantity`}
                        render={({ field: f }) => (
                            <FormItem className="col-span-1 space-y-1 sm:col-span-3">
                                <FormLabel>Stock</FormLabel>
                                <FormControl>
                                    <Input {...f} inputMode="numeric" autoComplete="off" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`variants.${index}.sku`}
                        render={({ field: f }) => (
                            <FormItem className="col-span-2 space-y-1 sm:col-span-5">
                                <FormLabel>SKU</FormLabel>
                                <FormControl>
                                    <Input {...f} maxLength={100} autoComplete="off" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                {showFinal || (Number.isFinite(qty) && qty <= LOW_STOCK_THRESHOLD && variants?.[index]?.quantity?.trim()) ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                        {showFinal ? `Buyers pay ${formatMoney(priceNum - (priceNum * discount) / 100, currency)}. ` : ''}
                        {Number.isFinite(qty) && qty === 0 && variants?.[index]?.quantity?.trim() ? 'Zero stock: buyers cannot order this item. ' : ''}
                        {Number.isFinite(qty) && qty > 0 && qty <= LOW_STOCK_THRESHOLD ? 'Counts as low stock.' : ''}
                    </p>
                ) : null}
            </>
        );
    };

    const offeredFirst = variants.find((v) => v.enabled);
    const offeredLabel = offeredFirst?.valueIds?.length ? valueLabels(types, offeredFirst.valueIds).join(' / ') : offeredFirst?.name?.trim() || 'the first option';

    return (
        <div className="space-y-3">
            <Card className="p-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <label htmlFor="has-options" className="text-sm font-semibold text-foreground">
                            This product has options (size, colour…)
                        </label>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {hasOptions ? 'Buyers will choose one of the options below.' : 'Leave this off if you sell one item. Buyers will not see any options.'}
                        </p>
                    </div>
                    <Switch id="has-options" checked={hasOptions} onCheckedChange={onToggle} aria-label="This product has options" />
                </div>
            </Card>

            {!hasOptions
                ? fields.map((field, index) => (
                      <Card key={field.id} className="p-3">
                          {rowFields(index, false)}
                      </Card>
                  ))
                : null}

            {structured ? (
                <>
                    <OptionTypesEditor
                        types={types}
                        onChange={rebuild}
                        onUseNames={variants.some((v) => v.serverId && v.valueIds?.length) ? undefined : useNamedOptions}
                        error={typesError ? String(typesError) : undefined}
                    />
                    {fields.length > 0 ? (
                        <VariantMatrix
                            fieldIds={fields.map((f) => f.id)}
                            types={types}
                            currency={currency}
                            images={images}
                            onImagesChange={onImagesChange}
                            onBaseSkuChange={onBaseSkuChange}
                            onBasePriceChange={onBasePriceChange}
                        />
                    ) : null}
                </>
            ) : null}

            {named ? (
                <>
                    <div className="flex items-start gap-2 rounded-lg bg-info-subtle p-3 text-sm text-info-subtle-foreground" role="note">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <div className="min-w-0 space-y-2">
                            <p>Use option types so buyers can pick colour and size.</p>
                            <div className="flex flex-wrap gap-2">
                                {savedNamedRows ? (
                                    <Button type="button" size="sm" variant="outline" onClick={() => void convertNames()} disabled={converting}>
                                        {converting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                                        Convert to option types
                                    </Button>
                                ) : null}
                                <Button type="button" size="sm" variant="outline" onClick={useOptionTypes}>
                                    {savedNamedRows ? 'Start again with option types' : 'Use option types'}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {fields.map((field, index) => (
                        <Card key={field.id} className="p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-foreground">{`Option ${index + 1}`}</p>
                                {fields.length > 2 ? (
                                    <Button type="button" variant="ghost" size="sm" className="-mr-2 text-destructive hover:text-destructive" onClick={() => remove(index)} aria-label={`Remove option ${index + 1}`}>
                                        <Trash2 aria-hidden="true" />
                                        Remove
                                    </Button>
                                ) : null}
                            </div>
                            {rowFields(index, true)}
                        </Card>
                    ))}
                    {fields.length < 2 ? <p className="text-sm text-muted-foreground">Add at least two options or turn this off.</p> : null}
                    <Button type="button" variant="outline" size="sm" onClick={() => append(emptyVariant())} disabled={fields.length >= MAX_NAMED_VARIANTS}>
                        <Plus aria-hidden="true" />
                        Add option
                    </Button>
                </>
            ) : null}

            {arrayError ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                    {String(arrayError)}
                </p>
            ) : null}

            <Card className="p-3">
                <FormField
                    control={control}
                    name="discount_percentage"
                    render={({ field }) => (
                        <FormItem className="max-w-[12rem] space-y-1">
                            <FormLabel>Discount (%)</FormLabel>
                            <FormControl>
                                <Input {...field} inputMode="numeric" autoComplete="off" />
                            </FormControl>
                            <FormDescription>{hasOptions ? 'Takes this percentage off every option price. Use 0 for no discount.' : 'Takes this percentage off the price. Use 0 for no discount.'}</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </Card>

            <Dialog open={confirmOff} onOpenChange={setConfirmOff}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Turn off options?</DialogTitle>
                        <DialogDescription>Only the first option ({offeredLabel}) is kept, as a single item with no option name. The other options are removed when you save.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" onClick={() => setConfirmOff(false)}>
                            Keep options
                        </Button>
                        <Button type="button" variant="destructive" onClick={turnOff}>
                            Turn off
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
