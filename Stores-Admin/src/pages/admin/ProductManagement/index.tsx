import {
    IconAlertTriangle,
    IconEdit,
    IconEye,
    IconPlus,
    IconSearch,
    IconTrash,
    IconPackage,
    IconTag,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import IconLoader from '../../../components/Icon/IconLoader';
import DraggableDataTable, { ColumnDefinition } from '../../../components/ui/DraggableDataTable';
import FilterSelect from '../../../components/ui/FilterSelect';
import axiosInstance from '../../../services/axiosInstance';

interface Product {
    id: string;
    name: string;
    sku: string;
    category: string;
    brand: string;
    price: number;
    original_price?: number;
    discount_percentage?: number;
    stock: number;
    status: 'active' | 'inactive' | 'out_of_stock';
    main_product_image?: string;
    average_rating?: number;
    total_reviews?: number;
    created_at: string;
    updated_at: string;
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

    // Calculate product counts
    const getProductCounts = () => {
        // Ensure products is an array - defensive check with early return
        if (!products || !Array.isArray(products)) {
            return {
                all: 0,
                active: 0,
                inactive: 0,
                out_of_stock: 0,
            };
        }
        const productsArray = products;
        const counts = {
            all: productsArray.length,
            active: productsArray.filter((p) => p?.status === 'active').length,
            inactive: productsArray.filter((p) => p?.status === 'inactive').length,
            out_of_stock: productsArray.filter((p) => p?.status === 'out_of_stock').length,
        };
        return counts;
    };

    const productCounts = getProductCounts();

    // Filter products based on active filter
    const getFilteredProducts = () => {
        // Ensure products is an array - defensive check with early return
        if (!products || !Array.isArray(products)) {
            return [];
        }
        const productsArray = products;
        if (activeFilter === 'all') return productsArray;
        return productsArray.filter((product) => product?.status === activeFilter);
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

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        }).format(date);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-gray-100 text-gray-800',
            out_of_stock: 'bg-red-100 text-red-800',
        };
        const safeStatus = status || 'unknown';
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[safeStatus as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800'}`}>
                {safeStatus.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

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
                    <div className="text-sm text-gray-500">SKU: {product.sku || 'N/A'}</div>
                </div>
            ),
        },
        {
            accessor: 'category',
            title: 'Category',
            sortable: true,
            render: (product: Product) => (
                <span className="text-gray-900">{product.category || 'N/A'}</span>
            ),
        },
        {
            accessor: 'brand',
            title: 'Brand',
            sortable: true,
            render: (product: Product) => (
                <span className="text-gray-900">{product.brand || 'N/A'}</span>
            ),
        },
        {
            accessor: 'price',
            title: 'Price',
            sortable: true,
            render: (product: Product) => (
                <div>
                    <div className="font-semibold">{formatCurrency(product.price || 0)}</div>
                    {product.original_price && product.original_price > (product.price || 0) && (
                        <div className="text-sm text-gray-500 line-through">{formatCurrency(product.original_price)}</div>
                    )}
                </div>
            ),
        },
        {
            accessor: 'stock',
            title: 'Stock',
            sortable: true,
            render: (product: Product) => (
                <div className={`font-semibold ${(product.stock || 0) <= 10 ? 'text-red-600' : 'text-gray-900'}`}>
                    {product.stock ?? 0}
                    {(product.stock || 0) <= 10 && <span className="text-xs ml-1">(Low)</span>}
                </div>
            ),
        },
        {
            accessor: 'average_rating',
            title: 'Rating',
            render: (product: Product) => (
                <div className="flex items-center gap-1">
                    <span className="font-semibold">{product.average_rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-xs text-gray-500">({product.total_reviews || 0})</span>
                </div>
            ),
        },
        {
            accessor: 'status',
            title: 'Status',
            sortable: true,
            render: (product: Product) => getStatusBadge(product.status),
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

    const filterOptions = [
        { value: 'all', label: `All Products (${productCounts.all})` },
        { value: 'active', label: `Active (${productCounts.active})` },
        { value: 'inactive', label: `Inactive (${productCounts.inactive})` },
        { value: 'out_of_stock', label: `Out of Stock (${productCounts.out_of_stock})` },
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
                            <p className="text-sm text-gray-600">Total Products</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{productCounts.all}</p>
                        </div>
                        <IconPackage className="w-10 h-10 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Active</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{productCounts.active}</p>
                        </div>
                        <IconPackage className="w-10 h-10 text-green-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Inactive</p>
                            <p className="text-2xl font-bold text-gray-600 mt-1">{productCounts.inactive}</p>
                        </div>
                        <IconPackage className="w-10 h-10 text-gray-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Out of Stock</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{productCounts.out_of_stock}</p>
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
                    quickCheckFields={['name', 'sku', 'category', 'brand']}
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


