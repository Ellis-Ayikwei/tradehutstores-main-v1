import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
    IconArrowLeft,
    IconBulb,
    IconCalendar,
    IconCurrencyDollar,
    IconEdit,
    IconPackage,
    IconPhoto,
    IconStar,
    IconTag,
    IconTruck,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import axiosInstance from '../../../services/axiosInstance';
import IconLoader from '../../../components/Icon/IconLoader';

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

function DetailCard({
    title,
    icon: Icon,
    children,
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <header className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <Icon className="h-5 w-5 text-primary-600" />
                <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            </header>
            <div className="p-5">{children}</div>
        </section>
    );
}

function DlGrid({ pairs }: { pairs: [string, React.ReactNode][] }) {
    return (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {pairs.map(([k, v]) => (
                <div key={k} className="border-b border-gray-50 pb-2 sm:border-0">
                    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{k}</dt>
                    <dd className="mt-0.5 text-sm text-gray-900">{v ?? '—'}</dd>
                </div>
            ))}
        </dl>
    );
}

const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
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

            const hadFailure = settled.some((r) => r.status === 'rejected');
            if (hadFailure) {
                notifications.show({
                    title: 'Partial load',
                    message: 'Some related data (reviews, inventory, etc.) failed to load. Core product is shown.',
                    color: 'yellow',
                });
            }
        } catch {
            notifications.show({
                title: 'Error',
                message: 'Failed to load product',
                color: 'red',
            });
            navigate('/admin/products/list');
        } finally {
            setLoading(false);
        }
    }, [id, navigate]);

    useEffect(() => {
        loadAll();
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
            notifications.show({ title: 'Saved', message: 'Product updated.', color: 'green' });
        } catch {
            notifications.show({
                title: 'Error',
                message: `Could not update ${field}`,
                color: 'red',
            });
        } finally {
            setSavingQuick(false);
        }
    };

    const themeLabel = useMemo(() => {
        const raw = product?.variation_theme != null ? String(product.variation_theme) : '';
        return VARIATION_THEME_LABELS[raw] || raw || '—';
    }, [product?.variation_theme]);

    if (!id) {
        return null;
    }

    if (loading || !product) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <IconLoader className="h-10 w-10 animate-spin" />
            </div>
        );
    }

    const pname = product.name != null ? String(product.name) : 'Product';
    const skuLine = product.primary_sku != null ? String(product.primary_sku) : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/products/list')}
                        className="mt-1 rounded-lg p-2 transition-colors hover:bg-gray-100"
                        title="Back"
                    >
                        <IconArrowLeft className="h-5 w-5 text-gray-700" />
                    </button>
                    <div className="min-w-0">
                        <nav className="text-xs text-gray-500">
                            <Link to="/admin/products/list" className="hover:text-gray-700">
                                Products
                            </Link>{' '}
                            /{' '}
                            <span className="text-gray-800">{pname}</span>
                        </nav>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{pname}</h1>
                        {skuLine && <p className="text-sm text-gray-600">SKU: {skuLine}</p>}
                        <div className="mt-2 flex flex-wrap gap-2">
                            {product.status != null && (
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold uppercase text-gray-700">
                                    {String(product.status)}
                                </span>
                            )}
                            {product.available ? (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                                    Available
                                </span>
                            ) : (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                                    Not available
                                </span>
                            )}
                            {product.is_product_of_the_month ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                                    Product of the month
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link
                        to={`/admin/products/${id}/edit`}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
                    >
                        <IconEdit className="h-4 w-4" />
                        Edit (form)
                    </Link>
                    <button
                        type="button"
                        onClick={() => loadAll()}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="lg:col-span-4">
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="aspect-square bg-gray-100">
                            {product.main_product_image ? (
                                <img
                                    src={String(product.main_product_image)}
                                    alt={pname}
                                    className="h-full w-full object-contain"
                                />
                            ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400">
                                    <IconPackage className="h-12 w-12" />
                                    <span className="text-sm">No hero image</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                        <h3 className="text-sm font-semibold text-blue-900">Quick flags</h3>
                        <p className="mt-1 text-xs text-blue-800/90">
                            Same booleans as Django admin “Flags”; saved with PATCH.
                        </p>
                        <ul className="mt-4 space-y-3">
                            {(
                                [
                                    ['Available', 'available'],
                                    ['Spare part', 'is_spare_part'],
                                    ['Requires installation', 'requires_installation'],
                                    ['Product of the month', 'is_product_of_the_month'],
                                ] as const
                            ).map(([label, field]) => (
                                <li key={field} className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-gray-800">{label}</span>
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-40"
                                        checked={quickFlags[field]}
                                        disabled={savingQuick}
                                        onChange={(e) => patchQuick(field, e.target.checked)}
                                    />
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <IconStar className="h-5 w-5 text-amber-500" />
                            <p className="mt-2 text-xl font-bold text-gray-900">
                                {(num(product.average_rating) || 0).toFixed(1)}
                            </p>
                            <p className="text-xs text-gray-500">{num(product.total_reviews)} reviews</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <IconTag className="h-5 w-5 text-primary-500" />
                            <p className="mt-2 text-xl font-bold text-gray-900">
                                {product.primary_variant_price != null
                                    ? formatMoney(product.primary_variant_price, currency)
                                    : '—'}
                            </p>
                            <p className="text-xs text-gray-500">Primary variant</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <IconTruck className="h-5 w-5 text-slate-500" />
                            <p className="mt-2 text-xl font-bold text-gray-900">{num(product.variant_stock_total)}</p>
                            <p className="text-xs text-gray-500">Variant qty total</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                            <IconCurrencyDollar className="h-5 w-5 text-emerald-500" />
                            <p className="mt-2 text-xl font-bold text-gray-900">
                                {num(product.discount_percentage)}%
                            </p>
                            <p className="text-xs text-gray-500">Catalog discount</p>
                        </div>
                    </div>

                    <DetailCard title="Variations & default" icon={IconPackage}>
                        <DlGrid
                            pairs={[
                                ['Variation theme', themeLabel],
                                ['Default variant id', product.default_variant != null ? String(product.default_variant) : '—'],
                                ['Variants', String(variants.length)],
                            ]}
                        />
                    </DetailCard>

                    <DetailCard title="Basic information" icon={IconTag}>
                        <DlGrid
                            pairs={[
                                ['Slug', product.slug != null ? String(product.slug) : '—'],
                                ['Keywords', product.keywords != null ? String(product.keywords) : '—'],
                                [
                                    'Category',
                                    product.category_name != null
                                        ? String(product.category_name)
                                        : String(product.category ?? '—'),
                                ],
                                [
                                    'Sub-category',
                                    product.sub_category_name != null
                                        ? String(product.sub_category_name)
                                        : String(product.sub_category ?? '—'),
                                ],
                                [
                                    'Brand',
                                    product.brand_name != null
                                        ? String(product.brand_name)
                                        : String(product.brand ?? '—'),
                                ],
                                ['Condition', product.condition != null ? String(product.condition) : '—'],
                                ['Description', (
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {product.description != null ? String(product.description) : '—'}
                                    </p>
                                )],
                                ['Thin (THIN)', product.thin != null ? String(product.thin) : '—'],
                            ]}
                        />
                    </DetailCard>

                    <DetailCard title="Commercial & inventory (IDs)" icon={IconCurrencyDollar}>
                        <DlGrid
                            pairs={[
                                ['Seller profile', product.seller_profile != null ? String(product.seller_profile) : '—'],
                                ['Legacy seller user', product.seller != null ? String(product.seller) : '—'],
                                ['Store', product.store != null ? String(product.store) : '—'],
                                ['Min purchase qty', product.min_amount != null ? String(product.min_amount) : '—'],
                                ['Inventory level (rollup)', product.inventory_level != null ? String(product.inventory_level) : '—'],
                            ]}
                        />
                    </DetailCard>

                    <DetailCard title="SEO" icon={IconBulb}>
                        <DlGrid
                            pairs={[
                                ['Meta title', product.meta_title != null ? String(product.meta_title) : '—'],
                                [
                                    'Meta description',
                                    product.meta_description != null ? String(product.meta_description) : '—',
                                ],
                            ]}
                        />
                    </DetailCard>

                    <DetailCard title={`Variants (${variants.length})`} icon={IconTag}>
                        <div className="-mx-2 overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                                    <tr>
                                        <th className="px-3 py-2">SKU</th>
                                        <th className="px-3 py-2">{currency}</th>
                                        <th className="px-3 py-2">Qty</th>
                                        <th className="px-3 py-2">Min buy</th>
                                        <th className="px-3 py-2 hidden md:table-cell">Attributes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {variants.map((row) => {
                                        const attrs = Array.isArray(row.attribute_values)
                                            ? row.attribute_values
                                            : [];
                                        const summary = attrs
                                            .map((av: Record<string, unknown>) =>
                                                [av.attribute_name, av.value_name].filter(Boolean).join(': ')
                                            )
                                            .join(' · ');
                                        return (
                                            <tr key={String(row.id ?? row.sku)}>
                                                <td className="max-w-[10rem] truncate px-3 py-2 font-mono text-xs">
                                                    {String(row.sku)}
                                                </td>
                                                <td className="px-3 py-2">{formatMoney(row.price, currency)}</td>
                                                <td className="px-3 py-2">{num(row.quantity)}</td>
                                                <td className="px-3 py-2">{num(row.min_buy_amount)}</td>
                                                <td className="hidden max-w-[20rem] px-3 py-2 text-xs text-gray-600 md:table-cell">
                                                    {summary || '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {variants.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                                                No variants returned.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </DetailCard>

                    <DetailCard title={`Gallery images (${images.length})`} icon={IconPhoto}>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                            {images.map((row) => {
                                const img = typeof row.image === 'string' ? row.image : null;
                                const main = Boolean(row.is_main);
                                return (
                                    <div
                                        key={String(row.id)}
                                        className={`overflow-hidden rounded-md border bg-gray-50 ${main ? 'ring-2 ring-primary-400' : 'border-gray-200'}`}
                                    >
                                        <div className="aspect-square">
                                            {img ? (
                                                <img src={img} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-xs text-gray-400">
                                                    No file
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase text-gray-600">
                                            <span>{String(row.image_type ?? '')}</span>
                                            {main && <span className="font-bold text-primary-600">Main</span>}
                                        </div>
                                    </div>
                                );
                            })}
                            {images.length === 0 && (
                                <p className="text-sm text-gray-500">No product-level gallery rows.</p>
                            )}
                        </div>
                    </DetailCard>

                    <DetailCard title={`Key features (${keyFeatures.length})`} icon={IconBulb}>
                        <ul className="list-inside list-disc space-y-1 text-sm">
                            {keyFeatures.map((f) => (
                                <li key={String(f.id)}>{f.name != null ? String(f.name) : '—'}</li>
                            ))}
                            {keyFeatures.length === 0 && <li className="list-none text-gray-500">None recorded.</li>}
                        </ul>
                    </DetailCard>

                    <DetailCard title={`Inventory rows (${inventoryRows.length})`} icon={IconCalendar}>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase text-gray-500">
                                    <tr>
                                        <th className="px-3 py-2">Qty in stock</th>
                                        <th className="px-3 py-2">Restock</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {inventoryRows.map((row) => (
                                        <tr key={String(row.id)}>
                                            <td className="px-3 py-2">{num(row.quantity_in_stock)}</td>
                                            <td className="px-3 py-2 text-xs">{String(row.restock_date ?? '—')}</td>
                                        </tr>
                                    ))}
                                    {inventoryRows.length === 0 && (
                                        <tr>
                                            <td colSpan={2} className="px-3 py-6 text-gray-500">
                                                No standalone inventory rows.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </DetailCard>

                    <DetailCard title={`Scheduled discounts (${discounts.length})`} icon={IconCurrencyDollar}>
                        <div className="space-y-3">
                            {discounts.map((d) => (
                                <div key={String(d.id)} className="rounded border border-gray-100 bg-gray-50 p-3 text-sm">
                                    <p className="font-semibold text-gray-900">
                                        {formatMoney(d.new_price, currency)} new price
                                    </p>
                                    <p className="text-xs text-gray-600">
                                        {String(d.discount_start ?? '')} → {String(d.discount_end ?? '')}
                                    </p>
                                    <p className="mt-1 text-[11px] text-gray-400">Discount link: {String(d.discount ?? '—')}</p>
                                </div>
                            ))}
                            {discounts.length === 0 && (
                                <p className="text-sm text-gray-500">No product discount windows.</p>
                            )}
                        </div>
                    </DetailCard>

                    <DetailCard title={`Buyer reviews (${reviews.length})`} icon={IconStar}>
                        <ul className="space-y-3">
                            {reviews.slice(0, 20).map((r) => (
                                <li key={String(r.id)} className="rounded border border-gray-100 bg-white p-3 text-sm">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-gray-900">
                                            Rating {num(r.rating).toFixed(1)}
                                            {r.verified ? (
                                                <span className="ml-2 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                                                    Verified
                                                </span>
                                            ) : null}
                                        </span>
                                        <span className="text-xs text-gray-500">{String(r.created_at ?? '')}</span>
                                    </div>
                                    <p className="mt-1 text-gray-700">{String(r.comment ?? '')}</p>
                                </li>
                            ))}
                            {reviews.length === 0 && (
                                <li className="list-none text-sm text-gray-500">No public reviews matched.</li>
                            )}
                            {reviews.length > 20 && (
                                <p className="text-xs text-gray-500">Showing 20 newest.</p>
                            )}
                        </ul>
                    </DetailCard>

                    <DetailCard title="Audit" icon={IconCalendar}>
                        <DlGrid
                            pairs={[
                                ['Created', product.created_at != null ? String(product.created_at) : '—'],
                                ['Updated', product.updated_at != null ? String(product.updated_at) : '—'],
                            ]}
                        />
                    </DetailCard>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
