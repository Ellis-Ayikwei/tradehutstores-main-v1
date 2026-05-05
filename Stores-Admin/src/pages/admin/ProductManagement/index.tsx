import {
    IconPackage,
    IconTag,
} from '@tabler/icons-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import IconLoader from '../../../components/Icon/IconLoader';
import DraggableDataTable, { ColumnDefinition } from '../../../components/ui/DraggableDataTable';
import FilterSelect from '../../../components/ui/FilterSelect';
import axiosInstance from '../../../services/axiosInstance';

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

const ProductManagement: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Fetch products from API
    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/products/');
            // Handle both array response and paginated response with results
            const productsData = Array.isArray(response.data) 
                ? response.data 
                : (response.data?.results || response.data?.data || []);
            setProducts(productsData);
        } catch (err) {
            setError('Failed to fetch products. Please try again later.');
            console.error('Error fetching products:', err);
            setProducts([]); // Ensure products is always an array
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const dashboardStats = useMemo(() => {
        const rows = Array.isArray(products) ? products : [];
        return {
            total: rows.length,
            available: rows.filter((p) => p.available !== false).length,
            spotlight: rows.filter((p) => Boolean(p.is_product_of_the_month)).length,
            discounted: rows.filter((p) => Number(p.discount_percentage ?? 0) > 0).length,
        };
    }, [products]);

    const filterOptions = useMemo(() => {
        if (!Array.isArray(products) || products.length === 0) {
            return [
                { value: 'all', label: 'All products (0)' },
                { value: '__available_only', label: 'Available only (0)' },
                { value: '__featured_only', label: 'Product of month (0)' },
            ];
        }
        const statusCounts = new Map<string, number>();
        products.forEach((p) => {
            const st = String(p.status ?? '').trim() || '(no status)';
            statusCounts.set(st, (statusCounts.get(st) || 0) + 1);
        });
        const sorted = [...statusCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        return [
            { value: 'all', label: `All products (${products.length})` },
            ...sorted.map(([st, count]) => ({ value: st, label: `${st} (${count})` })),
            {
                value: '__available_only',
                label: `Available only (${products.filter((p) => p.available !== false).length})`,
            },
            {
                value: '__featured_only',
                label: `Product of month (${products.filter((p) => p.is_product_of_the_month).length})`,
            },
        ];
    }, [products]);

    // Filter products based on active filter
    const getFilteredProducts = () => {
        // Ensure products is an array - defensive check with early return
        if (!products || !Array.isArray(products)) {
            return [];
        }
        const productsArray = products;
        if (activeFilter === 'all') return productsArray;
        if (activeFilter === '__available_only') return productsArray.filter((p) => p.available !== false);
        if (activeFilter === '__featured_only') return productsArray.filter((p) => p.is_product_of_the_month);
        return productsArray.filter((p) => String(p.status ?? '').trim() === activeFilter);
    };

    const handleFilterChange = (filter: string | number) => {
        setActiveFilter(String(filter));
    };

    // Handle product deletion
    const handleDelete = (product: Product) => {
        setSelectedProduct(product);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (selectedProduct) {
            try {
                await axiosInstance.delete(`/products/${selectedProduct.id}/`);
                await fetchProducts();
                setShowDeleteModal(false);
                setSelectedProduct(null);
            } catch (err) {
                setError('Failed to delete product. Please try again.');
                console.error('Error deleting product:', err);
            }
        }
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

        const label = String(status ?? 'Unknown').trim() || 'Unknown';
        const key = label.toLowerCase();
        const greens = ['active', 'published'];
        const warm = ['draft', 'pending'];
        let cls = 'bg-gray-100 text-gray-800';
        if (greens.includes(key)) cls = 'bg-green-100 text-green-800';
        else if (warm.includes(key)) cls = 'bg-amber-100 text-amber-900';
        else if (['deleted'].includes(key)) cls = 'bg-red-100 text-red-900';
        else if (['deactivated', 'suspended', 'archived'].includes(key)) cls = 'bg-slate-100 text-slate-800';
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${cls}`}>{label}</span>;
    };

    const variantPriceAmount = (p: Product): number =>
        Number(p.primary_variant_price ?? p.price ?? 0) || 0;

    const skuLine = (p: Product): string =>
        String((p.primary_sku ?? p.sku) ?? '')
            .trim() || '—';

    const columns: ColumnDefinition[] = [
        {
            accessor: 'main_product_image',
            title: 'Image',
            render: (product: Product) => (
                <div className="w-12 h-12 flex-shrink-0">
                    {product.main_product_image ? (
                        <img src={product.main_product_image} alt={product.name || 'Product'} className="w-full h-full object-cover rounded" />
                    ) : (
                        <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                            <IconPackage className="w-6 h-6 text-gray-400" />
                        </div>
                    )}
                </div>
            ),
        },
        {
            accessor: 'name',
            title: 'Product Name',
            sortable: true,
            render: (product: Product) => (
                <div>
                    <div className="font-semibold text-gray-900">{product.name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">SKU: {skuLine(product)}</div>
                </div>
            ),
        },
        {
            accessor: 'category',
            title: 'Category',
            sortable: true,
            render: (product: Product) => (
                <div className="text-gray-900">
                    <div>{product.category_name || product.category || '—'}</div>
                    {product.sub_category_name && (
                        <div className="text-xs text-gray-500">{product.sub_category_name}</div>
                    )}
                </div>
            ),
        },
        {
            accessor: 'brand',
            title: 'Brand',
            sortable: true,
            render: (product: Product) => (
                <span className="text-gray-900">{product.brand_name || product.brand || '—'}</span>
            ),
        },
        {
            accessor: 'price',
            title: 'Price',
            sortable: true,
            render: (product: Product) => {
                const disc = Number(product.discount_percentage ?? 0) || 0;
                const base = variantPriceAmount(product);
                const finalAmt = disc > 0 ? base - (base * disc) / 100 : base;
                return (
                    <div>
                        <div className="font-semibold">{formatCurrency(finalAmt)}</div>
                        {disc > 0 && (
                            <div className="text-xs text-gray-500">
                                <span className="line-through text-gray-400">{formatCurrency(base)}</span>{' '}
                                <span className="text-red-600">-{disc}%</span>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessor: 'stock',
            title: 'Stock',
            sortable: true,
            render: (product: Product) => {
                const qty =
                    product.variant_stock_total ??
                    product.stock ??
                    product.inventory_level ??
                    0;
                const qn = typeof qty === 'number' ? qty : Number(qty) || 0;
                const low = qn <= 10;
                return (
                    <div className={`font-semibold ${low ? 'text-red-600' : 'text-gray-900'}`}>
                        {qn}
                        {low && <span className="text-xs ml-1">(Low)</span>}
                    </div>
                );
            },
        },
        {
            accessor: 'average_rating',
            title: 'Rating',
            render: (product: Product) => (
                <div className="flex items-center gap-1">
                    <span className="font-semibold">
                        {(Number(product.average_rating ?? 0) || 0).toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-500">({product.total_reviews || 0})</span>
                </div>
            ),
        },
        {
            accessor: 'status',
            title: 'Status',
            sortable: true,
            render: (product: Product) => getStatusBadge(product.status ?? undefined),
        },
        {
            accessor: 'actions',
            title: 'Actions',
            render: (product: Product) => (
                <div className="flex gap-2">
                    <Link
                        to={`/admin/products/${product.id}`}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="View Details"
                    >
                        <IconEye className="w-4 h-4 text-blue-600" />
                    </Link>
                    <Link
                        to={`/admin/products/${product.id}/edit`}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Edit Product"
                    >
                        <IconEdit className="w-4 h-4 text-green-600" />
                    </Link>
                    <button
                        onClick={() => handleDelete(product)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Delete Product"
                    >
                        <IconTrash className="w-4 h-4 text-red-600" />
                    </button>
                </div>
            ),
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <IconLoader className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Product Management</h1>
                    <p className="text-gray-600 mt-1">Manage your product catalog and inventory</p>
                </div>
                <Link
                    to="/admin/products/new"
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                    <IconPlus className="w-5 h-5" />
                    Add New Product
                </Link>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
                    <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Catalog size</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{dashboardStats.total}</p>
                        </div>
                        <IconPackage className="w-10 h-10 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Available flag</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{dashboardStats.available}</p>
                        </div>
                        <IconPackage className="w-10 h-10 text-green-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Spotlight (POTM)</p>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{dashboardStats.spotlight}</p>
                        </div>
                        <IconTag className="w-10 h-10 text-amber-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">With discount%</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{dashboardStats.discounted}</p>
                        </div>
                        <IconAlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <FilterSelect 
                    options={filterOptions} 
                    value={activeFilter} 
                    onChange={handleFilterChange}
                    placeholder="Filter by status"
                />
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DraggableDataTable
                    data={getFilteredProducts()}
                    columns={columns}
                    loading={loading}
                    title="Products"
                    quickCheckFields={['name', 'primary_sku', 'sku', 'category_name', 'category', 'brand_name', 'brand']}
                />
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-full">
                                <IconTrash className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Delete Product</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete <strong>{selectedProduct.name}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Delete Product
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductManagement;


