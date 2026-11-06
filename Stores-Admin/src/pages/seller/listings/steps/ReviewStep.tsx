import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import useSWR from 'swr';
import { Badge } from '@/components/shadcn/badge';
import { Card } from '@/components/shadcn/card';
import { fetchBrands, fetchCategories, fetchSubcategories, formatMoney } from '@/services/sellerListingsService';
import type { ImageItem, ListingFormValues } from '../schema';

interface ReviewStepProps {
    images: ImageItem[];
    currency?: string;
    canPublish: boolean;
}

const SWR_OPTIONS = { revalidateOnFocus: false, shouldRetryOnError: false } as const;

function Row({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
            <dt className="shrink-0 text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words text-right text-foreground">{children}</dd>
        </div>
    );
}

export function ReviewStep({ images, currency, canPublish }: ReviewStepProps) {
    const { getValues } = useFormContext<ListingFormValues>();
    const v = getValues();

    const categories = useSWR('catalog:categories', fetchCategories, SWR_OPTIONS);
    const subcategories = useSWR(v.category ? ['catalog:subcategories', v.category] : null, () => fetchSubcategories(v.category), SWR_OPTIONS);
    const brands = useSWR(v.category ? ['catalog:brands', v.category] : null, () => fetchBrands(v.category), SWR_OPTIONS);

    const label = (opts: { id: string; label: string }[] | undefined, id: string) => opts?.find((o) => o.id === id)?.label ?? '-';
    const discount = Number(v.discount_percentage) || 0;
    const totalStock = v.variants.reduce((sum, x) => sum + (Number(x.quantity) || 0), 0);

    const blockers: string[] = [];
    if (images.length === 0) blockers.push('Add at least one image to publish.');
    if (totalStock === 0) blockers.push('Every variant has zero stock, so buyers could not order it.');

    return (
        <div className="space-y-3">
            {blockers.length > 0 ? (
                <div className="flex items-start gap-2 rounded-lg bg-warning-subtle p-3 text-sm text-warning-subtle-foreground" role="status">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <ul className="space-y-0.5">
                        {blockers.map((b) => (
                            <li key={b}>{b}</li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="flex items-center gap-2 rounded-lg bg-success-subtle p-3 text-sm text-success-subtle-foreground" role="status">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{canPublish ? 'Ready to publish.' : 'Everything is filled in.'}</span>
                </div>
            )}

            <Card className="p-3">
                <h3 className="mb-1 text-sm font-semibold text-foreground">Details</h3>
                <dl className="divide-y">
                    <Row label="Title">{v.name}</Row>
                    <Row label="Category">{label(categories.data, v.category)}</Row>
                    <Row label="Subcategory">{label(subcategories.data, v.sub_category)}</Row>
                    <Row label="Brand">{label(brands.data, v.brand)}</Row>
                    <Row label="Condition">{v.condition}</Row>
                </dl>
            </Card>

            <Card className="p-3">
                <h3 className="mb-1 text-sm font-semibold text-foreground">Variants and stock</h3>
                <ul className="divide-y">
                    {v.variants.map((x, i) => (
                        <li key={`${x.sku}-${i}`} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                            <div className="min-w-0">
                                <p className="truncate font-medium text-foreground">{x.name.trim() || 'Single item'}</p>
                                <p className="truncate text-xs text-muted-foreground">SKU {x.sku}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="font-medium tabular-nums text-foreground">{formatMoney(x.price, currency)}</p>
                                <p className="text-xs text-muted-foreground">{Number(x.quantity) || 0} in stock</p>
                            </div>
                        </li>
                    ))}
                </ul>
                {discount > 0 ? <p className="mt-1 text-xs text-muted-foreground">{discount}% discount applies to every variant.</p> : null}
            </Card>

            <Card className="p-3">
                <h3 className="mb-1.5 text-sm font-semibold text-foreground">Images</h3>
                {images.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No images added.</p>
                ) : (
                    <ul className="flex flex-wrap gap-1.5">
                        {images.map((img, i) => (
                            <li key={img.key} className="h-14 w-14 overflow-hidden rounded-md border bg-muted">
                                <img src={img.url} alt={i === 0 ? 'Main product image' : `Product image ${i + 1}`} className="h-full w-full object-cover" />
                            </li>
                        ))}
                    </ul>
                )}
            </Card>

            <Card className="p-3">
                <h3 className="mb-1 text-sm font-semibold text-foreground">Shipping</h3>
                <Badge variant={v.free_shipping ? 'success' : 'secondary'}>{v.free_shipping ? 'Free shipping' : 'Standard delivery fees apply'}</Badge>
            </Card>
        </div>
    );
}
