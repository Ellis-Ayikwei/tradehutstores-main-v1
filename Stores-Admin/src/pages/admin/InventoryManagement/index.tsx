import {
    IconAlertTriangle,
    IconEdit,
    IconPackage,
    IconPlus,
    IconMinus,
    IconRefresh,
    IconTrendingDown,
    IconTrendingUp,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import IconLoader from '../../../components/Icon/IconLoader';
import DraggableDataTable, { ColumnDefinition } from '../../../components/ui/DraggableDataTable';
import FilterSelect from '../../../components/ui/FilterSelect';
import axiosInstance from '../../../services/axiosInstance';
import { useCurrency } from '../../../contexts/CurrencyContext';

interface InventoryItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    current_stock: number;
    minimum_stock: number;
    maximum_stock: number;
    reorder_point: number;
    warehouse_location?: string;
    last_restocked: string;
    unit_cost: number;
    total_value: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
}

const InventoryManagement: React.FC = () => {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [showStockModal, setShowStockModal] = useState(false);
    const [stockAdjustment, setStockAdjustment] = useState({ quantity: 0, reason: '', type: 'add' as 'add' | 'remove' });

    // Fetch inventory from API
    const fetchInventory = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/products/inventory/');
            const data = response.data;
            const list = Array.isArray(data)
                ? data
                : Array.isArray(data?.results)
                ? data.results
                : [];
            setInventory(list);
        } catch (err) {
            setError('Failed to fetch inventory. Please try again later.');
            console.error('Error fetching inventory:', err);
            setInventory([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    // Calculate inventory stats
    const getInventoryStats = () => {
        const stats = {
            all: inventory.length,
            in_stock: inventory.filter((item) => item.status === 'in_stock').length,
            low_stock: inventory.filter((item) => item.status === 'low_stock').length,
            out_of_stock: inventory.filter((item) => item.status === 'out_of_stock').length,
            overstock: inventory.filter((item) => item.status === 'overstock').length,
            total_value: inventory.reduce((sum, item) => sum + item.total_value, 0),
        };
        return stats;
    };

    const inventoryStats = getInventoryStats();

    // Filter inventory based on active filter
    const getFilteredInventory = () => {
        if (activeFilter === 'all') return inventory;
        return inventory.filter((item) => item.status === activeFilter);
    };

    const handleFilterChange = (filter: string | number) => {
        setActiveFilter(String(filter));
    };

    // Handle stock adjustment
    const handleStockAdjustment = (item: InventoryItem, type: 'add' | 'remove') => {
        setSelectedItem(item);
        setStockAdjustment({ quantity: 0, reason: '', type });
        setShowStockModal(true);
    };

    const handleConfirmStockAdjustment = async () => {
        if (selectedItem && stockAdjustment.quantity > 0) {
            try {
                const newStock = stockAdjustment.type === 'add' 
                    ? selectedItem.current_stock + stockAdjustment.quantity
                    : selectedItem.current_stock - stockAdjustment.quantity;

                await axiosInstance.patch(`/products/inventory/${selectedItem.id}/`, {
                    current_stock: newStock,
                    adjustment_reason: stockAdjustment.reason,
                });

                await fetchInventory();
                setShowStockModal(false);
                setSelectedItem(null);
                setStockAdjustment({ quantity: 0, reason: '', type: 'add' });
            } catch (err) {
                setError('Failed to update stock. Please try again.');
                console.error('Error updating stock:', err);
            }
        }
    };

    const { formatDisplayPrice: formatCurrency } = useCurrency();

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
            in_stock: { bg: 'bg-green-100', text: 'text-green-800', icon: IconPackage },
            low_stock: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: IconAlertTriangle },
            out_of_stock: { bg: 'bg-red-100', text: 'text-red-800', icon: IconAlertTriangle },
            overstock: { bg: 'bg-blue-100', text: 'text-blue-800', icon: IconTrendingUp },
        };
        const safeStatus = status || 'unknown';
        const config = statusConfig[safeStatus as keyof typeof statusConfig] || statusConfig.in_stock;
        const Icon = config.icon;
        
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
                <Icon className="w-3 h-3" />
                {safeStatus.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    const getStockIndicator = (item: InventoryItem) => {
        const currentStock = item.current_stock || 0;
        const maxStock = item.maximum_stock || 1;
        const percentage = (currentStock / maxStock) * 100;
        let color = 'bg-green-500';
        if (percentage < 25) color = 'bg-red-500';
        else if (percentage < 50) color = 'bg-yellow-500';
        
        return (
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                    className={`${color} h-2 rounded-full transition-all`} 
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
        );
    };

    const columns: ColumnDefinition[] = [
        {
            accessor: 'product_name',
            title: 'Product',
            sortable: true,
            render: (item: InventoryItem) => (
                <div>
                    <div className="font-semibold text-gray-900">{item.product_name || 'N/A'}</div>
                    <div className="text-sm text-gray-500">SKU: {item.sku || 'N/A'}</div>
                </div>
            ),
        },
        {
            accessor: 'current_stock',
            title: 'Stock Level',
            sortable: true,
            render: (item: InventoryItem) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className={`font-semibold ${
                            (item.current_stock || 0) <= (item.reorder_point || 0) ? 'text-red-600' :
                            (item.current_stock || 0) <= (item.minimum_stock || 0) ? 'text-yellow-600' :
                            'text-gray-900'
                        }`}>
                            {item.current_stock ?? 0}
                        </span>
                        <span className="text-xs text-gray-500">/ {item.maximum_stock || 0}</span>
                    </div>
                    {getStockIndicator(item)}
                </div>
            ),
        },
        {
            accessor: 'reorder_point',
            title: 'Reorder Point',
            sortable: true,
            render: (item: InventoryItem) => (
                <div className="text-center">
                    <span className="text-gray-900">{item.reorder_point ?? 0}</span>
                </div>
            ),
        },
        {
            accessor: 'unit_cost',
            title: 'Unit Cost',
            sortable: true,
            render: (item: InventoryItem) => (
                <div className="text-gray-600">{formatCurrency(item.unit_cost || 0)}</div>
            ),
        },
        {
            accessor: 'total_value',
            title: 'Total Value',
            sortable: true,
            render: (item: InventoryItem) => (
                <div className="font-semibold text-gray-900">{formatCurrency(item.total_value || 0)}</div>
            ),
        },
        {
            accessor: 'warehouse_location',
            title: 'Location',
            render: (item: InventoryItem) => (
                <div className="text-sm text-gray-600">{item.warehouse_location || 'N/A'}</div>
            ),
        },
        {
            accessor: 'status',
            title: 'Status',
            sortable: true,
            render: (item: InventoryItem) => getStatusBadge(item.status),
        },
        {
            accessor: 'last_restocked',
            title: 'Last Restocked',
            sortable: true,
            render: (item: InventoryItem) => (
                <div className="text-sm text-gray-600">{item.last_restocked ? formatDate(item.last_restocked) : 'N/A'}</div>
            ),
        },
        {
            accessor: 'actions',
            title: 'Actions',
            render: (item: InventoryItem) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => handleStockAdjustment(item, 'add')}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Add Stock"
                    >
                        <IconPlus className="w-4 h-4 text-green-600" />
                    </button>
                    <button
                        onClick={() => handleStockAdjustment(item, 'remove')}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Remove Stock"
                    >
                        <IconMinus className="w-4 h-4 text-red-600" />
                    </button>
                    <Link
                        to={`/admin/products/${item.product_id}/edit`}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Edit Product"
                    >
                        <IconEdit className="w-4 h-4 text-blue-600" />
                    </Link>
                </div>
            ),
        },
    ];

    const filterOptions = [
        { value: 'all', label: `All Items (${inventoryStats.all})` },
        { value: 'in_stock', label: `In Stock (${inventoryStats.in_stock})` },
        { value: 'low_stock', label: `Low Stock (${inventoryStats.low_stock})` },
        { value: 'out_of_stock', label: `Out of Stock (${inventoryStats.out_of_stock})` },
        { value: 'overstock', label: `Overstock (${inventoryStats.overstock})` },
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
                    <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
                    <p className="text-gray-600 mt-1">Track and manage your product stock levels</p>
                </div>
                <button
                    onClick={fetchInventory}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                    <IconRefresh className="w-5 h-5" />
                    Refresh
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-start gap-3">
                    <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Items</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{inventoryStats.all}</p>
                        </div>
                        <IconPackage className="w-10 h-10 text-gray-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">In Stock</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{inventoryStats.in_stock}</p>
                        </div>
                        <IconPackage className="w-10 h-10 text-green-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Low Stock</p>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">{inventoryStats.low_stock}</p>
                        </div>
                        <IconAlertTriangle className="w-10 h-10 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Out of Stock</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">{inventoryStats.out_of_stock}</p>
                        </div>
                        <IconAlertTriangle className="w-10 h-10 text-red-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Value</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(inventoryStats.total_value)}</p>
                        </div>
                        <IconTrendingUp className="w-10 h-10 text-blue-500" />
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

            {/* Inventory Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DraggableDataTable
                    data={getFilteredInventory()}
                    columns={columns}
                    loading={loading}
                    title="Inventory"
                    quickCheckFields={['product_name', 'sku', 'warehouse_location']}
                />
            </div>

            {/* Stock Adjustment Modal */}
            {showStockModal && selectedItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-full ${stockAdjustment.type === 'add' ? 'bg-green-100' : 'bg-red-100'}`}>
                                {stockAdjustment.type === 'add' ? (
                                    <IconPlus className="w-6 h-6 text-green-600" />
                                ) : (
                                    <IconMinus className="w-6 h-6 text-red-600" />
                                )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {stockAdjustment.type === 'add' ? 'Add Stock' : 'Remove Stock'}
                            </h3>
                        </div>
                        <div className="mb-4">
                            <p className="text-sm text-gray-600"><strong>Product:</strong> {selectedItem.product_name}</p>
                            <p className="text-sm text-gray-600"><strong>Current Stock:</strong> {selectedItem.current_stock}</p>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity*</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={stockAdjustment.quantity}
                                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, quantity: parseInt(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason*</label>
                                <textarea
                                    value={stockAdjustment.reason}
                                    onChange={(e) => setStockAdjustment({ ...stockAdjustment, reason: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Enter reason for adjustment..."
                                    required
                                />
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-sm text-gray-600">
                                    <strong>New Stock:</strong>{' '}
                                    {stockAdjustment.type === 'add'
                                        ? selectedItem.current_stock + stockAdjustment.quantity
                                        : selectedItem.current_stock - stockAdjustment.quantity}
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowStockModal(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmStockAdjustment}
                                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                                    stockAdjustment.type === 'add'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                                disabled={!stockAdjustment.quantity || !stockAdjustment.reason}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryManagement;


