import { useState, type CSSProperties } from 'react';
import { ImagePlus } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Switch } from '@/components/shadcn/switch';
import { cn } from '@/lib/utils';
import { formatMoney, LOW_STOCK_THRESHOLD } from '@/services/sellerListingsService';
import { MAX_IMAGE_BYTES, MAX_IMAGES, type ImageItem, type ListingFormValues, type OptionType } from '../schema';
import { MAX_GROUP_IMAGES, MAX_MATRIX, imagesForGroup, pictureTypeIndex, valueLabels } from './optionUtils';

interface VariantMatrixProps {
    fieldIds: string[];
    types: OptionType[];
    currency?: string;
    images: ImageItem[];
    onImagesChange: (next: ImageItem[]) => void;
    onBaseSkuChange: (value: string) => void;
    onBasePriceChange: (value: string) => void;
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];

/** Step C: one row per combination. A card on small screens, a table-like grid from md. */
export function VariantMatrix({ fieldIds, types, currency, images, onImagesChange, onBaseSkuChange, onBasePriceChange }: VariantMatrixProps) {
    const { control, watch, getValues, setValue } = useFormContext<ListingFormValues>();
    const variants = watch('variants');
    const discount = Number(watch('discount_percentage')) || 0;
    const [bulkPrice, setBulkPrice] = useState('');
    const [bulkStock, setBulkStock] = useState('');
    const picIdx = pictureTypeIndex(types);

    const enabledCount = variants.filter((v) => v.enabled).length;
    const gridStyle = { '--cols': `2.75rem repeat(${types.length}, minmax(0, 1fr)) 7rem 5.5rem minmax(0, 1.4fr)` } as CSSProperties;

    const applyAll = (field: 'price' | 'quantity', raw: string) => {
        const value = raw.trim();
        const valid = field === 'price' ? /^\d{1,8}(\.\d{1,2})?$/.test(value) : /^\d{1,7}$/.test(value);
        if (!valid) {
            toast.error(field === 'price' ? 'Enter a price such as 49.90' : 'Enter a whole number for stock');
            return;
        }
        getValues('variants').forEach((v, i) => {
            if (v.enabled) setValue(`variants.${i}.${field}`, value, { shouldDirty: true, shouldValidate: true });
        });
    };

    const addPicture = (groupId: string, file: File | undefined) => {
        if (!file) return;
        if (!ACCEPTED.includes(file.type)) return void toast.error(`${file.name} is not a JPG, PNG or WebP image`);
        if (file.size > MAX_IMAGE_BYTES) return void toast.error(`${file.name} is larger than ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB`);
        if (imagesForGroup(images, groupId).length >= MAX_GROUP_IMAGES) return void toast.error(`Up to ${MAX_GROUP_IMAGES} pictures per ${types[picIdx].name.toLowerCase()}`);
        if (images.length >= MAX_IMAGES) return void toast.error(`Up to ${MAX_IMAGES} images in total`);
        onImagesChange([...images, { key: `new-${crypto.randomUUID()}`, file, url: URL.createObjectURL(file), optionValueId: groupId }]);
    };

    return (
        <div className="space-y-3">
            <Card className="p-3">
                <h3 className="text-sm font-semibold text-foreground">3. Price, stock and SKU</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    One row per combination, up to {MAX_MATRIX}. Switch off the ones you do not sell.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <FormField
                        control={control}
                        name="basePrice"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel>{currency ? `Base price (${currency})` : 'Base price'}</FormLabel>
                                <FormControl>
                                    <Input {...field} inputMode="decimal" autoComplete="off" onChange={(e) => onBasePriceChange(e.target.value)} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="baseSku"
                        render={({ field }) => (
                            <FormItem className="space-y-1">
                                <FormLabel>SKU prefix</FormLabel>
                                <FormControl>
                                    <Input {...field} maxLength={80} autoComplete="off" placeholder="TEE" onChange={(e) => onBaseSkuChange(e.target.value)} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="space-y-1">
                        <label htmlFor="bulk-price" className="text-sm font-medium leading-none">
                            Set price for all
                        </label>
                        <div className="flex gap-1.5">
                            <Input id="bulk-price" value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} inputMode="decimal" autoComplete="off" />
                            <Button type="button" variant="outline" onClick={() => applyAll('price', bulkPrice)}>
                                Apply
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="bulk-stock" className="text-sm font-medium leading-none">
                            Set stock for all
                        </label>
                        <div className="flex gap-1.5">
                            <Input id="bulk-stock" value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} inputMode="numeric" autoComplete="off" />
                            <Button type="button" variant="outline" onClick={() => applyAll('quantity', bulkStock)}>
                                Apply
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            <p className="text-xs text-muted-foreground" aria-live="polite">
                {enabledCount} of {fieldIds.length} combinations offered.
            </p>

            <div className="hidden gap-2 px-3 text-xs font-medium text-muted-foreground md:grid md:[grid-template-columns:var(--cols)]" style={gridStyle} aria-hidden="true">
                <span>Offer</span>
                {types.map((t) => (
                    <span key={t.attributeId}>{t.name}</span>
                ))}
                <span>Price</span>
                <span>Stock</span>
                <span>SKU</span>
            </div>

            <ul className="space-y-2">
                {fieldIds.map((id, index) => {
                    const row = variants[index];
                    if (!row) return null;
                    const labels = valueLabels(types, row.valueIds ?? []);
                    const off = !row.enabled;
                    const priceNum = Number(row.price);
                    const qty = Number(row.quantity);
                    const showFinal = !off && discount > 0 && Number.isFinite(priceNum) && priceNum > 0;
                    const groupId = picIdx >= 0 ? row.valueIds?.[picIdx] : undefined;
                    const thumb = groupId ? imagesForGroup(images, groupId)[0] : undefined;
                    return (
                        <li key={id}>
                            <Card className={cn('grid grid-cols-2 gap-2 p-3 md:items-start md:[grid-template-columns:var(--cols)]', off && 'bg-muted')} style={gridStyle}>
                                <FormField
                                    control={control}
                                    name={`variants.${index}.enabled`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-2 flex items-center justify-between space-y-0 md:col-span-1 md:block md:pt-2">
                                            <FormLabel className="md:sr-only">{`Offer ${labels.join(' / ')}`}</FormLabel>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={`Offer this option: ${labels.join(' / ')}`} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                {types.map((t, ti) => (
                                    <div key={t.attributeId} className="min-w-0 md:pt-2">
                                        <p className="text-xs text-muted-foreground md:hidden">{t.name}</p>
                                        <div className="flex items-center gap-1.5">
                                            {ti === picIdx && groupId ? (
                                                <label
                                                    className={cn('relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border bg-muted focus-within:ring-2 focus-within:ring-ring', off && 'cursor-not-allowed')}
                                                    title={thumb ? 'Add another picture' : `Add a picture for ${labels[ti]}`}
                                                >
                                                    {thumb ? <img src={thumb.url} alt={`${labels[ti]} picture`} className="h-full w-full object-cover" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                                                    <input
                                                        type="file"
                                                        accept={ACCEPTED.join(',')}
                                                        className="sr-only"
                                                        disabled={off}
                                                        aria-label={`Add a picture for ${labels[ti]}`}
                                                        onChange={(e) => {
                                                            addPicture(groupId, e.target.files?.[0]);
                                                            e.target.value = '';
                                                        }}
                                                    />
                                                </label>
                                            ) : null}
                                            <span className="truncate text-sm font-medium text-foreground">{labels[ti]}</span>
                                        </div>
                                    </div>
                                ))}
                                <FormField
                                    control={control}
                                    name={`variants.${index}.price`}
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="md:sr-only">{currency ? `Price (${currency})` : 'Price'}</FormLabel>
                                            <FormControl>
                                                <Input {...field} inputMode="decimal" autoComplete="off" disabled={off} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`variants.${index}.quantity`}
                                    render={({ field }) => (
                                        <FormItem className="space-y-1">
                                            <FormLabel className="md:sr-only">Stock</FormLabel>
                                            <FormControl>
                                                <Input {...field} inputMode="numeric" autoComplete="off" disabled={off} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={control}
                                    name={`variants.${index}.sku`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-2 space-y-1 md:col-span-1">
                                            <FormLabel className="md:sr-only">SKU</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    maxLength={100}
                                                    autoComplete="off"
                                                    disabled={off}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        setValue(`variants.${index}.skuAuto`, false);
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {showFinal || (!off && Number.isFinite(qty) && qty <= LOW_STOCK_THRESHOLD && row.quantity.trim()) ? (
                                    <p className="col-span-2 text-xs text-muted-foreground md:col-span-full">
                                        {showFinal ? `Buyers pay ${formatMoney(priceNum - (priceNum * discount) / 100, currency)}. ` : ''}
                                        {qty === 0 && row.quantity.trim() ? 'Zero stock: buyers cannot order this item. ' : ''}
                                        {qty > 0 && qty <= LOW_STOCK_THRESHOLD ? 'Counts as low stock.' : ''}
                                    </p>
                                ) : null}
                            </Card>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
