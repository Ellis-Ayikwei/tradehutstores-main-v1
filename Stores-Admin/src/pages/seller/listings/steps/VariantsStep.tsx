import { Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { formatMoney, LOW_STOCK_THRESHOLD } from '@/services/sellerListingsService';
import { emptyVariant, type ListingFormValues } from '../schema';

const MAX_VARIANTS = 50;

export function VariantsStep({ currency }: { currency?: string }) {
    const { control, watch, formState } = useFormContext<ListingFormValues>();
    const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
    const variants = watch('variants');
    const discount = Number(watch('discount_percentage')) || 0;

    const arrayError = formState.errors.variants?.root?.message ?? formState.errors.variants?.message;
    const multiple = fields.length > 1;

    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
                One row per thing a buyer can pick, such as a size or colour. Selling a single item? Keep one row and leave the name blank.
            </p>

            {fields.map((field, index) => {
                const price = variants?.[index]?.price?.trim() ?? '';
                const qty = Number(variants?.[index]?.quantity);
                const priceNum = Number(price);
                const showFinal = discount > 0 && Number.isFinite(priceNum) && priceNum > 0;
                return (
                    <Card key={field.id} className="p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-foreground">{multiple ? `Variant ${index + 1}` : 'Item'}</p>
                            {fields.length > 1 ? (
                                <Button type="button" variant="ghost" size="sm" className="-mr-2 text-destructive hover:text-destructive" onClick={() => remove(index)} aria-label={`Remove variant ${index + 1}`}>
                                    <Trash2 aria-hidden="true" />
                                    Remove
                                </Button>
                            ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                            <FormField
                                control={control}
                                name={`variants.${index}.name`}
                                render={({ field: f }) => (
                                    <FormItem className="col-span-2 space-y-1 sm:col-span-4">
                                        <FormLabel>{multiple ? 'Option name' : 'Option name (optional)'}</FormLabel>
                                        <FormControl>
                                            <Input {...f} maxLength={255} autoComplete="off" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`variants.${index}.sku`}
                                render={({ field: f }) => (
                                    <FormItem className="col-span-2 space-y-1 sm:col-span-3">
                                        <FormLabel>SKU</FormLabel>
                                        <FormControl>
                                            <Input {...f} maxLength={100} autoComplete="off" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`variants.${index}.price`}
                                render={({ field: f }) => (
                                    <FormItem className="col-span-1 space-y-1 sm:col-span-3">
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
                                    <FormItem className="col-span-1 space-y-1 sm:col-span-2">
                                        <FormLabel>Stock</FormLabel>
                                        <FormControl>
                                            <Input {...f} inputMode="numeric" autoComplete="off" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        {showFinal || (Number.isFinite(qty) && qty <= LOW_STOCK_THRESHOLD && variants?.[index]?.quantity?.trim()) ? (
                            <p className="mt-1.5 text-xs text-muted-foreground">
                                {showFinal ? `Buyers pay ${formatMoney(priceNum - (priceNum * discount) / 100, currency)}. ` : ''}
                                {Number.isFinite(qty) && qty === 0 && variants?.[index]?.quantity?.trim() ? 'Zero stock: buyers cannot order this variant.' : ''}
                                {Number.isFinite(qty) && qty > 0 && qty <= LOW_STOCK_THRESHOLD ? 'Counts as low stock.' : ''}
                            </p>
                        ) : null}
                    </Card>
                );
            })}

            {arrayError ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                    {String(arrayError)}
                </p>
            ) : null}

            <Button type="button" variant="outline" size="sm" onClick={() => append(emptyVariant())} disabled={fields.length >= MAX_VARIANTS}>
                <Plus aria-hidden="true" />
                Add variant
            </Button>

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
                            <FormDescription>Takes this percentage off every variant price. Use 0 for no discount.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </Card>
        </div>
    );
}
