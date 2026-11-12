import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Eye, Package, Pencil, Plus, RefreshCw, Star, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { DataTable, type DataTableSort } from '@/components/shadcn/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { EmptyState } from '@/components/shadcn/empty-state';
import { PageHeader } from '@/components/shadcn/page-header';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { StatCard } from '@/components/shadcn/stat-card';
import { cn } from '@/lib/utils';
import axiosInstance from '../../../services/axiosInstance';
import { useCurrency } from '../../../contexts/CurrencyContext';

interface Product {
    id: string;
    name: string;
    /** Convenience from API (default/first variant). */
    primary_sku?: string | null;
    sku?: string;
    category?: string | null;
    category_name?: string | null;
    sub_category_name?: string | null;
    brand?: string | null;
    brand_name?: string | null;
    primary_variant_price?: string | null;
    price?: number | string | null;
    discount_percentage?: number | string | null;
    variant_stock_total?: number;
    inventory_level?: number | null;
    stock?: number;
    status?: string | null;
    /** API may return string (e.g. Decimal JSON). */
    average_rating?: number | string | null;
    total_reviews?: number;
    main_product_image?: string | null;
    available?: boolean;
    is_product_of_the_month?: boolean;
    created_at: string;
    updated_at?: string;
}

const PAGE_SIZE = 25;
const ALL = 'all';
const AVAILABLE_ONLY = '__available_only';
const FEATURED_ONLY = '__featured_only';

const variantPriceAmount = (p: Product): number => Number(p.primary_variant_price ?? p.price ?? 0) || 0;
const finalPrice = (p: Product): number => {
    const disc = Number(p.discount_percentage ?? 0) || 0;
    const base = variantPriceAmount(p);
    return disc > 0 ? base - (base * disc) / 100 : base;
};
const skuLine = (p: Product): string => String(p.primary_sku ?? p.sku ?? '').trim() || '-';
const stockOf = (p: Product): number => {
    const qty = p.variant_stock_total ?? p.stock ?? p.inventory_level ?? 0;
    return typeof qty === 'number' ? qty : Number(qty) || 0;
};

function statusVariant(status?: string | null): 'success' | 'warning' | 'destructive' | 'secondary' {
    const key = String(status ?? '').trim().toLowerCase();
    if (['active', 'published'].includes(key)) return 'success';
    if (['draft', 'pending'].includes(key)) return 'warning';
    if (key === 'deleted') return 'destructive';
    return 'secondary';
}

function StatusBadge({ status }: { status?: string | null }) {
    const label = String(status ?? 'Unknown').trim() || 'Unknown';
    return <Badge variant={statusVariant(status)}>{label}</Badge>;
}

function ProductThumb({ product, className }: { product: Product; className?: string }) {
    return (
        <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground', className)}>
            {product.main_product_image ? (
                <img src={product.main_product_image} alt={product.name || 'Product'} className="h-full w-full object-cover" loading="lazy" />
            ) : (
                <Package className="h-5 w-5" aria-hidden="true" />
            )}
        </div>
    );
}

function sortValue(p: Product, id: string): string | number {
    switch (id) {
        case 'name':
            return (p.name || '').toLowerCase();
        case 'category':
            return String(p.category_name || p.category || '').toLowerCase();
        case 'brand':
            return String(p.brand_name || p.brand || '').toLowerCase();
        case 'price':
            return finalPrice(p);
        case 'stock':
            return stockOf(p);
        case 'status':
            return String(p.status ?? '').toLowerCase();
        default:
            return 0;
    }
}

const ProductManagement: React.FC = () => {
    const navigate = useNavigate();
    const { formatDisplayPrice: formatCurrency } = useCurrency();

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState(ALL);
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<DataTableSort | null>(null);
    const [page, setPage] = useState(1);
    const [toDelete, setToDelete] = useState<Product | null>(null);
    const [deleting, setDeleting] = useState(false);

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/products/');
            // Handle both array response and paginated response with results
            const productsData = Array.isArray(response.data) ? response.data : response.data?.results || response.data?.data || [];
            setProducts(productsData);
        } catch (err) {
            setError('Failed to fetch products. Please try again later.');
            console.error('Error fetching products:', err);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchProducts();
    }, [fetchProducts]);

    const stats = useMemo(
        () => ({
            total: products.length,
            available: products.filter((p) => p.available !== false).length,
            spotlight: products.filter((p) => Boolean(p.is_product_of_the_month)).length,
            discounted: products.filter((p) => Number(p.discount_percentage ?? 0) > 0).length,
        }),
        [products]
    );

    const filterOptions = useMemo(() => {
        const statusCounts = new Map<string, number>();
        products.forEach((p) => {
            const st = String(p.status ?? '').trim() || '(no status)';
            statusCounts.set(st, (statusCounts.get(st) || 0) + 1);
        });
        const sorted = [...statusCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        return [
            { value: ALL, label: `All products (${products.length})` },
            ...sorted.map(([st, count]) => ({ value: st, label: `${st} (${count})` })),
            { value: AVAILABLE_ONLY, label: `Available only (${stats.available})` },
            { value: FEATURED_ONLY, label: `Product of month (${stats.spotlight})` },
        ];
    }, [products, stats.available, stats.spotlight]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        let rows = products.filter((p) => {
            if (activeFilter === AVAILABLE_ONLY) return p.available !== false;
            if (activeFilter === FEATURED_ONLY) return Boolean(p.is_product_of_the_month);
            if (activeFilter !== ALL) return (String(p.status ?? '').trim() || '(no status)') === activeFilter;
            return true;
        });
        if (q) {
            rows = rows.filter((p) =>
                [p.name, p.primary_sku, p.sku, p.category_name, p.category, p.brand_name, p.brand].some((v) => String(v ?? '').toLowerCase().includes(q))
            );
        }
        if (sort) {
            const dir = sort.desc ? -1 : 1;
            rows = [...rows].sort((a, b) => {
                const av = sortValue(a, sort.id);
                const bv = sortValue(b, sort.id);
                if (av < bv) return -1 * dir;
                if (av > bv) return 1 * dir;
                return 0;
            });
        }
        return rows;
    }, [products, activeFilter, search, sort]);

    const pageRows = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

    const confirmDelete = async () => {
        if (!toDelete) return;
        setDeleting(true);
        try {
            await axiosInstance.delete(`/products/${toDelete.id}/`);
            toast.success('Product deleted');
            setToDelete(null);
            await fetchProducts();
        } catch (err) {
            console.error('Error deleting product:', err);
            toast.error('Failed to delete product. Please try again.');
        } finally {
            setDeleting(false);
        }
    };

    const priceCell = useCallback(
        (product: Product) => {
            const disc = Number(product.discount_percentage ?? 0) || 0;
            const base = variantPriceAmount(product);
            return (
                <div>
                    <div className="font-semibold tabular-nums text-foreground">{formatCurrency(finalPrice(product))}</div>
                    {disc > 0 ? (
                        <div className="text-xs text-muted-foreground">
                            <span className="tabular-nums line-through">{formatCurrency(base)}</span> <span className="font-medium text-destructive">-{disc}%</span>
                        </div>
                    ) : null}
                </div>
            );
        },
        [formatCurrency]
    );

    const stockCell = (product: Product) => {
        const qn = stockOf(product);
        const low = qn <= 10;
        return (
            <span className={cn('font-semibold tabular-nums', low ? 'text-destructive' : 'text-foreground')}>
                {qn}
                {low ? <span className="ml-1 text-xs font-normal">(Low)</span> : null}
            </span>
        );
    };

    const actionButtons = (product: Product) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button asChild variant="ghost" size="icon-sm">
                <Link to={`/admin/products/${product.id}`} aria-label={`View ${product.name}`} title="View details">
                    <Eye />
                </Link>
            </Button>
            <Button asChild variant="ghost" size="icon-sm">
                <Link to={`/admin/products/${product.id}/edit`} aria-label={`Edit ${product.name}`} title="Edit product">
                    <Pencil />
                </Link>
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${product.name}`} title="Delete product" onClick={() => setToDelete(product)}>
                <Trash2 className="text-destructive" />
            </Button>
        </div>
    );

    const columns = useMemo<ColumnDef<Product>[]>(
        () => [
            {
                id: 'image',
                header: () => <span className="sr-only">Image</span>,
                enableSorting: false,
                enableHiding: false,
                meta: { className: 'w-16' },
                cell: ({ row }) => <ProductThumb product={row.original} />,
            },
            {
                id: 'name',
                accessorFn: (p) => sortValue(p, 'name'),
                header: 'Product',
                meta: { label: 'Product', cardTitle: true },
                cell: ({ row }) => (
                    <div className="min-w-[10rem]">
                        <Link to={`/admin/products/${row.original.id}`} className="font-semibold text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
                            {row.original.name || 'Unnamed product'}
                        </Link>
                        <p className="text-xs text-muted-foreground">SKU: {skuLine(row.original)}</p>
                    </div>
                ),
            },
            {
                id: 'category',
                accessorFn: (p) => sortValue(p, 'category'),
                header: 'Category',
                meta: { label: 'Category' },
                cell: ({ row }) => (
                    <div>
                        <p className="text-sm text-foreground">{row.original.category_name || row.original.category || '-'}</p>
                        {row.original.sub_category_name ? <p className="text-xs text-muted-foreground">{row.original.sub_category_name}</p> : null}
                    </div>
                ),
            },
            {
                id: 'brand',
                accessorFn: (p) => sortValue(p, 'brand'),
                header: 'Brand',
                meta: { label: 'Brand' },
                cell: ({ row }) => <span className="text-sm text-foreground">{row.original.brand_name || row.original.brand || '-'}</span>,
            },
            {
                id: 'price',
                accessorFn: (p) => sortValue(p, 'price'),
                header: 'Price',
                meta: { label: 'Price', className: 'text-right' },
                cell: ({ row }) => priceCell(row.original),
            },
            {
                id: 'stock',
                accessorFn: (p) => sortValue(p, 'stock'),
                header: 'Stock',
                meta: { label: 'Stock', className: 'text-right' },
                cell: ({ row }) => stockCell(row.original),
            },
            {
                id: 'rating',
                header: 'Rating',
                enableSorting: false,
                meta: { label: 'Rating' },
                cell: ({ row }) => (
                    <span className="inline-flex items-center gap-1 text-sm text-foreground">
                        <Star className="h-3.5 w-3.5 text-warning-subtle-foreground" aria-hidden="true" />
                        <span className="font-semibold tabular-nums">{(Number(row.original.average_rating ?? 0) || 0).toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({row.original.total_reviews || 0})</span>
                    </span>
                ),
            },
            {
                id: 'status',
                accessorFn: (p) => sortValue(p, 'status'),
                header: 'Status',
                meta: { label: 'Status' },
                cell: ({ row }) => <StatusBadge status={row.original.status} />,
            },
            {
                id: 'actions',
                header: () => <span className="sr-only">Actions</span>,
                enableSorting: false,
                enableHiding: false,
                meta: { className: 'w-36 text-right' },
                cell: ({ row }) => actionButtons(row.original),
            },
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [priceCell]
    );

    const renderMobileCard = useCallback(
        (product: Product) => (
            <Card key={product.id} className="p-3">
                <div className="flex items-start gap-3">
                    <ProductThumb product={product} className="h-16 w-16" />
                    <div className="min-w-0 flex-1 space-y-1">
                        <Link to={`/admin/products/${product.id}`} className="block truncate text-sm font-semibold text-foreground hover:underline">
                            {product.name || 'Unnamed product'}
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">
                            SKU: {skuLine(product)}
                            {product.category_name || product.category ? ` · ${product.category_name || product.category}` : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                            {priceCell(product)}
                            <span className="text-xs text-muted-foreground">Stock</span>
                            {stockCell(product)}
                        </div>
                        <StatusBadge status={product.status} />
                    </div>
                </div>
                <div className="mt-2 border-t pt-2">{actionButtons(product)}</div>
            </Card>
        ),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [priceCell]
    );

    const emptyState = useMemo(() => {
        if (search.trim() || activeFilter !== ALL) return undefined;
        return (
            <EmptyState
                icon={Package}
                title="No products yet"
                description="Products added to the catalog will appear here."
                action={
                    <Button asChild size="sm">
                        <Link to="/admin/products/new">
                            <Plus />
                            Add product
                        </Link>
                    </Button>
                }
            />
        );
    }, [search, activeFilter]);

    return (
        <div className="space-y-3">
            <PageHeader
                title="Products"
                description="Manage the product catalog and inventory"
                className="pb-0"
                actions={
                    <>
                        <Button type="button" variant="outline" size="sm" onClick={() => void fetchProducts()} disabled={loading}>
                            <RefreshCw className={cn(loading && 'animate-spin')} aria-hidden="true" />
                            Refresh
                        </Button>
                        <Button asChild size="sm">
                            <Link to="/admin/products/new">
                                <Plus />
                                Add product
                            </Link>
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Catalog size" value={stats.total} icon={Package} isLoading={loading} />
                <StatCard label="Available" value={stats.available} icon={Package} isLoading={loading} />
                <StatCard label="Product of the month" value={stats.spotlight} icon={Star} isLoading={loading} />
                <StatCard label="With discount" value={stats.discounted} icon={Tag} isLoading={loading} />
            </div>

            {error && !loading ? (
                <div className="flex items-start gap-2 rounded-xl bg-destructive-subtle px-3 py-2 text-sm text-destructive-subtle-foreground" role="alert">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>{error}</p>
                </div>
            ) : null}

            <DataTable
                columns={columns}
                data={pageRows}
                total={filtered.length}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
                sort={sort}
                onSortChange={(next) => {
                    setSort(next);
                    setPage(1);
                }}
                search={search}
                onSearchChange={(value) => {
                    setSearch(value);
                    setPage(1);
                }}
                searchPlaceholder="Search by name, SKU, category or brand"
                toolbar={
                    <Select
                        value={activeFilter}
                        onValueChange={(value) => {
                            setActiveFilter(value);
                            setPage(1);
                        }}
                    >
                        <SelectTrigger className="w-full sm:w-56" aria-label="Filter by status">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            {filterOptions.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                    {o.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
                isLoading={loading}
                error={error && products.length === 0 ? error : undefined}
                onRetry={() => void fetchProducts()}
                emptyState={emptyState}
                getRowId={(row) => row.id}
                onRowClick={(row) => navigate(`/admin/products/${row.id}`)}
                renderMobileCard={renderMobileCard}
            />

            <Dialog open={Boolean(toDelete)} onOpenChange={(open) => (!open && !deleting ? setToDelete(null) : undefined)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete product</DialogTitle>
                        <DialogDescription>
                            Delete <span className="font-semibold text-foreground">{toDelete?.name}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={deleting}>
                            <Trash2 />
                            {deleting ? 'Deleting...' : 'Delete product'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProductManagement;
