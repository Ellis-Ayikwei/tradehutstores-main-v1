import {
    IconAlertTriangle,
    IconClock,
    IconCheck,
    IconX,
    IconTruck,
    IconPackage,
    IconEye,
    IconSearch,
    IconDownload,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import IconLoader from '../../../components/Icon/IconLoader';
import DraggableDataTable, { ColumnDefinition } from '../../../components/ui/DraggableDataTable';
import FilterSelect from '../../../components/ui/FilterSelect';
import axiosInstance from '../../../services/axiosInstance';

interface Order {
    id: string;
    order_number: string;
    customer_name: string;
    customer_email: string;
    total_amount: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    payment_status: 'pending' | 'paid' | 'refunded';
    items_count: number;
    shipping_address: string;
    created_at: string;
    updated_at: string;
}

const OrderManagement: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');

    // Fetch orders from API
    const fetchOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/orders/');
            setOrders(response.data);
        } catch (err) {
            setError('Failed to fetch orders. Please try again later.');
            console.error('Error fetching orders:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // Calculate order counts
    const getOrderCounts = () => {
        const counts = {
            all: orders.length,
            pending: orders.filter((o) => o.status === 'pending').length,
            processing: orders.filter((o) => o.status === 'processing').length,
            shipped: orders.filter((o) => o.status === 'shipped').length,
            delivered: orders.filter((o) => o.status === 'delivered').length,
            cancelled: orders.filter((o) => o.status === 'cancelled').length,
        };
        return counts;
    };

    const orderCounts = getOrderCounts();

    // Filter orders based on active filter
    const getFilteredOrders = () => {
        if (activeFilter === 'all') return orders;
        return orders.filter((order) => order.status === activeFilter);
    };

    const handleFilterChange = (filter: string) => {
        setActiveFilter(filter);
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
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: IconClock },
            processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: IconPackage },
            shipped: { bg: 'bg-purple-100', text: 'text-purple-800', icon: IconTruck },
            delivered: { bg: 'bg-green-100', text: 'text-green-800', icon: IconCheck },
            cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: IconX },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        const Icon = config.icon;
        
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
                <Icon className="w-3 h-3" />
                {status.toUpperCase()}
            </span>
        );
    };

    const getPaymentStatusBadge = (status: string) => {
        const statusConfig = {
            pending: 'bg-yellow-100 text-yellow-800',
            paid: 'bg-green-100 text-green-800',
            refunded: 'bg-gray-100 text-gray-800',
        };
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[status as keyof typeof statusConfig]}`}>
                {status.toUpperCase()}
            </span>
        );
    };

    const columns: ColumnDefinition<Order>[] = [
        {
            key: 'order_number',
            label: 'Order Number',
            sortable: true,
            render: (order) => (
                <Link to={`/admin/orders/${order.id}`} className="font-semibold text-blue-600 hover:text-blue-800">
                    #{order.order_number}
                </Link>
            ),
        },
        {
            key: 'customer_name',
            label: 'Customer',
            sortable: true,
            render: (order) => (
                <div>
                    <div className="font-semibold text-gray-900">{order.customer_name}</div>
                    <div className="text-sm text-gray-500">{order.customer_email}</div>
                </div>
            ),
        },
        {
            key: 'items_count',
            label: 'Items',
            sortable: true,
            render: (order) => (
                <div className="text-center">
                    <span className="font-semibold">{order.items_count}</span>
                </div>
            ),
        },
        {
            key: 'total_amount',
            label: 'Total Amount',
            sortable: true,
            render: (order) => (
                <div className="font-semibold text-gray-900">{formatCurrency(order.total_amount)}</div>
            ),
        },
        {
            key: 'status',
            label: 'Order Status',
            sortable: true,
            render: (order) => getStatusBadge(order.status),
        },
        {
            key: 'payment_status',
            label: 'Payment',
            sortable: true,
            render: (order) => getPaymentStatusBadge(order.payment_status),
        },
        {
            key: 'created_at',
            label: 'Order Date',
            sortable: true,
            render: (order) => (
                <div className="text-sm text-gray-600">{formatDate(order.created_at)}</div>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (order) => (
                <div className="flex gap-2">
                    <Link
                        to={`/admin/orders/${order.id}`}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="View Details"
                    >
                        <IconEye className="w-4 h-4 text-blue-600" />
                    </Link>
                    <button
                        onClick={() => {/* Handle invoice download */}}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Download Invoice"
                    >
                        <IconDownload className="w-4 h-4 text-green-600" />
                    </button>
                </div>
            ),
        },
    ];

    const filterOptions = [
        { value: 'all', label: `All Orders (${orderCounts.all})`, icon: IconPackage },
        { value: 'pending', label: `Pending (${orderCounts.pending})`, icon: IconClock },
        { value: 'processing', label: `Processing (${orderCounts.processing})`, icon: IconPackage },
        { value: 'shipped', label: `Shipped (${orderCounts.shipped})`, icon: IconTruck },
        { value: 'delivered', label: `Delivered (${orderCounts.delivered})`, icon: IconCheck },
        { value: 'cancelled', label: `Cancelled (${orderCounts.cancelled})`, icon: IconX },
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
                    <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
                    <p className="text-gray-600 mt-1">Track and manage customer orders</p>
                </div>
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
                            <p className="text-sm text-gray-600">Total Orders</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{orderCounts.all}</p>
                        </div>
                        <IconPackage className="w-10 h-10 text-gray-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">{orderCounts.pending}</p>
                        </div>
                        <IconClock className="w-10 h-10 text-yellow-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Processing</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{orderCounts.processing}</p>
                        </div>
                        <IconPackage className="w-10 h-10 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Shipped</p>
                            <p className="text-2xl font-bold text-purple-600 mt-1">{orderCounts.shipped}</p>
                        </div>
                        <IconTruck className="w-10 h-10 text-purple-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Delivered</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{orderCounts.delivered}</p>
                        </div>
                        <IconCheck className="w-10 h-10 text-green-500" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <FilterSelect options={filterOptions} activeFilter={activeFilter} onFilterChange={handleFilterChange} />
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DraggableDataTable
                    data={getFilteredOrders()}
                    columns={columns}
                    searchable={true}
                    searchableColumns={['order_number', 'customer_name', 'customer_email']}
                    pagination={true}
                    pageSize={20}
                />
            </div>
        </div>
    );
};

export default OrderManagement;


