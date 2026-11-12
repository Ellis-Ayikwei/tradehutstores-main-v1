import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Calendar, DollarSign, Lightbulb, Package, Pencil, Image as ImageIcon, RefreshCw, Star, Tag, Truck, type LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { EmptyState } from '@/components/shadcn/empty-state';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Switch } from '@/components/shadcn/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';
import { cn } from '@/lib/utils';
import axiosInstance from '../../../services/axiosInstance';

/** Matches backend VARIATION_THEMES labels (subset for display lookup). */
const VARIATION_THEME_LABELS: Record<string, string> = {
    single: 'Single Product',
    size: 'Size',
    color: 'Color',
    material: 'Material',
    pattern: 'Pattern',
    style: 'Style',
    capacity: 'Capacity',
    memory: 'Memory',
    'size-color': 'Size & Color',
    'size-material': 'Size & Material',
    'color-style': 'Color & Style',
    'size-pattern': 'Size & Pattern',
    'size-style': 'Size & Style',
    'size-color-style': 'Size, Color & Style',
    'RAM Capacity-memory': 'RAM Capacity & Memory',
    custom: 'Custom',
    all: 'All variants (flat list)',
};

function num(v: unknown): number {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
}

function formatMoney(amount: unknown, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
    }).format(num(amount));
}

function DetailCard({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0 border-b p-4 sm:p-4">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-4 sm:p-4 sm:pt-4">{children}</CardContent>
        </Card>
    );
}

function DlGrid({ pairs }: { pairs: [string, React.ReactNode][] }) {
    return (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pairs.map(([k, v]) => (
                <div key={k} className="min-w-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5 break-words text-sm text-foreground">{v ?? '-'}</dd>
                </div>
            ))}
        </dl>
    );
}

function MiniStat({ icon: Icon, value, label }: { icon: LucideIcon; value: React.ReactNode; label: string }) {
    return (
        <Card>
            <CardContent className="p-4 pt-4 sm:p-4 sm:pt-4">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 truncate text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
        </Card>
    );
}

function DetailSkeleton() {
    return (
        <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <Skeleton className="aspect-square w-full lg:col-span-4" />
                <div className="space-y-4 lg:col-span-8">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
        </div>
    );
}

const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [product, setProduct] = useState<Record<string, unknown> | null>(null);
    const [variants, setVariants] = useState<Record<string, unknown>[]>([]);
    const [images, setImages] = useState<Record<string, unknown>[]>([]);
    const [discounts, setDiscounts] = useState<Record<string, unknown>[]>([]);
    const [keyFeatures, setKeyFeatures] = useState<Record<string, unknown>[]>([]);
    const [inventoryRows, setInventoryRows] = useState<Record<string, unknown>[]>([]);
    const [reviews, setReviews] = useState<Record<string, unknown>[]>([]);
    const [savingQuick, setSavingQuick] = useState(false);

    function normalizeReviewPayload(data: unknown): Record<string, unknown>[] {
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
            return (data as { results: Record<string, unknown>[] }).results;
        }
        return [];
    }

    const loadAll = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setLoadError(false);
        try {
            const pRes = await axiosInstance.get(`/products/${id}/`);
            const pdata = pRes?.data;
            setProduct(pdata && typeof pdata === 'object' ? pdata : null);

            const settled = await Promise.allSettled([
                axiosInstance.get(`/products/${id}/variants/`),
                axiosInstance.get(`/products/${id}/images/`),
                axiosInstance.get(`/products/${id}/discounts/`),
                axiosInstance.get(`/products/key-features/?product=${encodeURIComponent(id)}`),
                axiosInstance.get(`/products/inventory/?product=${encodeURIComponent(id)}`),
                axiosInstance.get(`/reviews/?product=${encodeURIComponent(id)}`),
            ]);

            const arrays = settled.map((r, idx) => {
                if (r.status !== 'fulfilled') {
                    console.warn('[ProductDetail] optional fetch failed', idx, r.reason);
                    return [];
                }
                const d = r.value?.data;
                if (idx === 5) return normalizeReviewPayload(d);
                return Array.isArray(d) ? d : [];
            }) as Record<string, unknown>[][];

            setVariants(arrays[0]);
            setImages(arrays[1]);
            setDiscounts(arrays[2]);
            setKeyFeatures(arrays[3]);
            setInventoryRows(arrays[4]);
            setReviews(arrays[5]);

            if (settled.some((r) => r.status === 'rejected')) {
                toast.warning('Some related data (reviews, inventory, etc.) failed to load. Core product is shown.');
            }
        } catch {
            toast.error('Failed to load product');
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        void loadAll();
    }, [loadAll]);

    const currency = String(product?.pricing_currency ?? 'USD').toUpperCase();

    const quickFlags = useMemo(
        () => ({
            available: Boolean(product?.available),
            is_spare_part: Boolean(product?.is_spare_part),
            requires_installation: Boolean(product?.requires_installation),
            is_product_of_the_month: Boolean(product?.is_product_of_the_month),
        }),
        [product]
    );

    const patchQuick = async (field: keyof typeof quickFlags, value: boolean) => {
        if (!id || !product) return;
        setSavingQuick(true);
        try {
            await axiosInstance.patch(`/products/${id}/`, { [field]: value });
            setProduct({ ...product, [field]: value });
            toast.success('Product updated.');
        } catch {
            toast.error(`Could not update ${field}`);
        } finally {
            setSavingQuick(false);
        }
    };

    const themeLabel = useMemo(() => {
        const raw = product?.variation_theme != null ? String(product.variation_theme) : '';
        return VARIATION_THEME_LABELS[raw] || raw || '-';
    }, [product?.variation_theme]);

    if (!id) {
        return null;
    }

    if (loading && !product) {
        return <DetailSkeleton />;
    }

    if (loadError || !product) {
        return (
            <Card>
                <EmptyState
                    icon={AlertTriangle}
                    title="Could not load this product"
                    description="It may have been removed, or the request failed."
                    action={
                        <div className="flex flex-wrap justify-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => void loadAll()}>
                                <RefreshCw />
                                Try again
                            </Button>
                            <Button type="button" size="sm" onClick={() => navigate('/admin/products/list')}>
                                Back to products
                            </Button>
                        </div>
                    }
                />
            </Card>
        );
    }

    const pname = product.name != null ? String(product.name) : 'Product';
    const skuLine = product.primary_sku != null ? String(product.primary_sku) : null;
    const dash = (v: unknown) => (v != null && String(v) !== '' ? String(v) : '-');

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/admin/products/list')} aria-label="Back to products">
                        <ArrowLeft />
                    </Button>
                    <div className="min-w-0">
                        <nav className="text-xs text-muted-foreground" aria-label="Breadcrumb">
                            <Link to="/admin/products/list" className="hover:text-foreground hover:underline">
                                Products
                            </Link>{' '}
                            / <span className="text-foreground">{pname}</span>
                        </nav>
                        <h1 className="mt-1 break-words text-xl font-bold tracking-tight text-foreground sm:text-2xl">{pname}</h1>
                        {skuLine ? <p className="text-sm text-muted-foreground">SKU: {skuLine}</p> : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                            {product.status != null ? <Badge variant="secondary" className="uppercase">{String(product.status)}</Badge> : null}
                            {product.available ? <Badge variant="success">Available</Badge> : <Badge variant="destructive">Not available</Badge>}
                            {product.is_product_of_the_month ? <Badge variant="warning">Product of the month</Badge> : null}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                        <Link to={`/admin/products/${id}/edit`}>
                            <Pencil />
                            Edit
                        </Link>
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void loadAll()} disabled={loading}>
                        <RefreshCw className={cn(loading && 'animate-spin')} />
                        Refresh
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-4">
                    <Card className="overflow-hidden">
                        <div className="aspect-square bg-muted">
                            {product.main_product_image ? (
                                <img src={String(product.main_product_image)} alt={pname} className="h-full w-full object-contain" />
                            ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                                    <Package className="h-12 w-12" aria-hidden="true" />
                                    <span className="text-sm">No hero image</span>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader className="space-y-1 p-4 pb-0 sm:p-4 sm:pb-0">
                            <CardTitle className="text-sm">Quick flags</CardTitle>
                            <p className="text-xs text-muted-foreground">Changes save immediately.</p>
                        </CardHeader>
                        <CardContent className="p-4 pt-3 sm:p-4 sm:pt-3">
                            <ul className="space-y-3">
                                {(
                                    [
                                        ['Available', 'available'],
                                        ['Spare part', 'is_spare_part'],
                                        ['Requires installation', 'requires_installation'],
                                        ['Product of the month', 'is_product_of_the_month'],
                                    ] as const
                                ).map(([label, field]) => (
                                    <li key={field} className="flex items-center justify-between gap-2">
                                        <span className="text-sm text-foreground">{label}</span>
                                        <Switch checked={quickFlags[field]} disabled={savingQuick} onCheckedChange={(checked) => void patchQuick(field, checked)} aria-label={label} />
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4 lg:col-span-8">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <MiniStat icon={Star} value={(num(product.average_rating) || 0).toFixed(1)} label={`${num(product.total_reviews)} reviews`} />
                        <MiniStat icon={Tag} value={product.primary_variant_price != null ? formatMoney(product.primary_variant_price, currency) : '-'} label="Primary variant" />
                        <MiniStat icon={Truck} value={num(product.variant_stock_total)} label="Variant qty total" />
                        <MiniStat icon={DollarSign} value={`${num(product.discount_percentage)}%`} label="Catalog discount" />
                    </div>

                    <DetailCard title="Variations & default" icon={Package}>
                        <DlGrid
                            pairs={[
                                ['Variation theme', themeLabel],
                                ['Default variant id', dash(product.default_variant)],
                                ['Variants', String(variants.length)],
                            ]}
                        />
                    </DetailCard>

                    <DetailCard title="Basic information" icon={Tag}>
                        <DlGrid
                            pairs={[
                                ['Slug', dash(product.slug)],
                                ['Keywords', dash(product.keywords)],
                                ['Category', product.category_name != null ? String(product.category_name) : dash(product.category)],
                                ['Sub-category', product.sub_category_name != null ? String(product.sub_category_name) : dash(product.sub_category)],
                                ['Brand', product.brand_name != null ? String(product.brand_name) : dash(product.brand)],
                                ['Condition', dash(product.condition)],
                                ['Thin (THIN)', dash(product.thin)],
                                ['Description', <p key="d" className="whitespace-pre-wrap leading-relaxed">{dash(product.description)}</p>],
                            ]}
                        />
                    </DetailCard>

                    <DetailCard title="Commercial & inventory (IDs)" icon={DollarSign}>
                        <DlGrid
                            pairs={[
                                ['Seller profile', dash(product.seller_profile)],
                                ['Legacy seller user', dash(product.seller)],
                                ['Store', dash(product.store)],
                                ['Min purchase qty', dash(product.min_amount)],
                                ['Inventory level (rollup)', dash(product.inventory_level)],
                            ]}
                        />
                    </DetailCard>

                    <DetailCard title="SEO" icon={Lightbulb}>
                        <DlGrid
                            pairs={[
                                ['Meta title', dash(product.meta_title)],
                                ['Meta description', dash(product.meta_description)],
                            ]}
                        />
                    </DetailCard>

                    <DetailCard title={`Variants (${variants.length})`} icon={Tag}>
                        {variants.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No variants returned.</p>
                        ) : (
                            <>
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>SKU</TableHead>
                                                <TableHead>Price ({currency})</TableHead>
                                                <TableHead>Qty</TableHead>
                                                <TableHead>Min buy</TableHead>
                                                <TableHead>Attributes</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {variants.map((row) => {
                                                const summary = variantSummary(row);
                                                return (
                                                    <TableRow key={String(row.id ?? row.sku)}>
                                                        <TableCell className="max-w-[10rem] truncate font-mono text-xs">{String(row.sku)}</TableCell>
                                                        <TableCell className="tabular-nums">{formatMoney(row.price, currency)}</TableCell>
                                                        <TableCell className="tabular-nums">{num(row.quantity)}</TableCell>
                                                        <TableCell className="tabular-nums">{num(row.min_buy_amount)}</TableCell>
                                                        <TableCell className="max-w-[20rem] text-xs text-muted-foreground">{summary || '-'}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="space-y-2 md:hidden">
                                    {variants.map((row) => (
                                        <div key={String(row.id ?? row.sku)} className="rounded-xl border p-3 text-sm">
                                            <p className="break-all font-mono text-xs text-foreground">{String(row.sku)}</p>
                                            <p className="mt-1 text-foreground">
                                                <span className="font-semibold tabular-nums">{formatMoney(row.price, currency)}</span>
                                                <span className="text-muted-foreground"> · Qty {num(row.quantity)} · Min buy {num(row.min_buy_amount)}</span>
                                            </p>
                                            {variantSummary(row) ? <p className="mt-1 text-xs text-muted-foreground">{variantSummary(row)}</p> : null}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </DetailCard>

                    <DetailCard title={`Gallery images (${images.length})`} icon={ImageIcon}>
                        {images.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No product-level gallery rows.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                                {images.map((row) => {
                                    const img = typeof row.image === 'string' ? row.image : null;
                                    const main = Boolean(row.is_main);
                                    return (
                                        <div key={String(row.id)} className={cn('overflow-hidden rounded-xl border bg-muted', main && 'border-primary')}>
                                            <div className="aspect-square">
                                                {img ? <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No file</div>}
                                            </div>
                                            <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase text-muted-foreground">
                                                <span>{String(row.image_type ?? '')}</span>
                                                {main ? <span className="font-bold text-foreground">Main</span> : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </DetailCard>

                    <DetailCard title={`Key features (${keyFeatures.length})`} icon={Lightbulb}>
                        {keyFeatures.length === 0 ? (
                            <p className="text-sm text-muted-foreground">None recorded.</p>
                        ) : (
                            <ul className="list-inside list-disc space-y-1 text-sm text-foreground">
                                {keyFeatures.map((f) => (
                                    <li key={String(f.id)}>{f.name != null ? String(f.name) : '-'}</li>
                                ))}
                            </ul>
                        )}
                    </DetailCard>

                    <DetailCard title={`Inventory rows (${inventoryRows.length})`} icon={Calendar}>
                        {inventoryRows.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No standalone inventory rows.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Qty in stock</TableHead>
                                        <TableHead>Restock</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventoryRows.map((row) => (
                                        <TableRow key={String(row.id)}>
                                            <TableCell className="tabular-nums">{num(row.quantity_in_stock)}</TableCell>
                                            <TableCell className="text-xs">{String(row.restock_date ?? '-')}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </DetailCard>

                    <DetailCard title={`Scheduled discounts (${discounts.length})`} icon={DollarSign}>
                        {discounts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No product discount windows.</p>
                        ) : (
                            <div className="space-y-3">
                                {discounts.map((d) => (
                                    <div key={String(d.id)} className="rounded-xl border bg-muted p-3 text-sm">
                                        <p className="font-semibold text-foreground">{formatMoney(d.new_price, currency)} new price</p>
                                        <p className="text-xs text-muted-foreground">
                                            {String(d.discount_start ?? '')} to {String(d.discount_end ?? '')}
                                        </p>
                                        <p className="mt-1 text-[11px] text-muted-foreground">Discount link: {String(d.discount ?? '-')}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DetailCard>

                    <DetailCard title={`Buyer reviews (${reviews.length})`} icon={Star}>
                        {reviews.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No public reviews matched.</p>
                        ) : (
                            <ul className="space-y-3">
                                {reviews.slice(0, 20).map((r) => (
                                    <li key={String(r.id)} className="rounded-xl border p-3 text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-2 font-medium text-foreground">
                                                Rating {num(r.rating).toFixed(1)}
                                                {r.verified ? <Badge variant="success">Verified</Badge> : null}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{String(r.created_at ?? '')}</span>
                                        </div>
                                        <p className="mt-1 text-foreground">{String(r.comment ?? '')}</p>
                                    </li>
                                ))}
                                {reviews.length > 20 ? <p className="text-xs text-muted-foreground">Showing 20 newest.</p> : null}
                            </ul>
                        )}
                    </DetailCard>

                    <DetailCard title="Audit" icon={Calendar}>
                        <DlGrid
                            pairs={[
                                ['Created', dash(product.created_at)],
                                ['Updated', dash(product.updated_at)],
                            ]}
                        />
                    </DetailCard>
                </div>
            </div>
        </div>
    );
};

function variantSummary(row: Record<string, unknown>): string {
    const attrs = Array.isArray(row.attribute_values) ? row.attribute_values : [];
    return attrs
        .map((av: Record<string, unknown>) => [av.attribute_name, av.value_name].filter(Boolean).join(': '))
        .join(' · ');
}

export default ProductDetail;
