// E-COMMERCE DASHBOARD
import {
    IconAlertTriangle,
    IconArrowUp,
    IconArrowDown,
    IconCurrencyDollar,
    IconPackage,
    IconShoppingCart,
    IconTrendingUp,
    IconUsers,
    IconStar,
    IconTruck,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import fetcher from '../../services/fetcher';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconLoader from '../../components/Icon/IconLoader';

interface DashboardStats {
    total_revenue: number;
    revenue_growth: number;
    total_orders: number;
    orders_growth: number;
    total_customers: number;
    customers_growth: number;
    average_order_value: number;
    aov_growth: number;
    pending_orders: number;
    low_stock_items: number;
    out_of_stock_items: number;
    total_products: number;
}

interface RecentOrder {
    id: string;
    order_number: string;
    customer_name: string;
    total_amount: number;
    status: string;
    created_at: string;
}

interface TopProduct {
    id: string;
    name: string;
    sales_count: number;
    revenue: number;
    image?: string;
}

const EcommerceDashboard = () => {
    const dispatch = useDispatch();
    const [period, setPeriod] = useState('week');

    useEffect(() => {
        dispatch(setPageTitle('E-commerce Dashboard'));
    }, [dispatch]);

    // Fetch dashboard data
    const { data: stats, isLoading: statsLoading } = useSWR<DashboardStats>(
        '/dashboard/stats/',
        fetcher,
        { refreshInterval: 30000 }
    );

    const { data: recentOrders, isLoading: ordersLoading } = useSWR<RecentOrder[]>(
        '/dashboard/recent-orders/',
        fetcher
    );

    const { data: topProducts, isLoading: productsLoading } = useSWR<TopProduct[]>(
        '/dashboard/top-products/',
        fetcher
    );

    // Revenue chart data
    const revenueChartOptions: any = {
        series: [
            {
                name: 'Revenue',
                data: [28000, 35000, 31000, 42000, 38000, 45000, 52000],
            },
        ],
        chart: {
            height: 300,
            type: 'area',
            toolbar: { show: false },
        },
        colors: ['#4361ee'],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 2 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.1,
                stops: [0, 90, 100],
            },
        },
        xaxis: {
            categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        },
        yaxis: {
            labels: {
                formatter: (value: number) => `$${(value / 1000).toFixed(0)}k`,
            },
        },
        tooltip: {
            y: {
                formatter: (value: number) => `$${value.toLocaleString()}`,
            },
        },
    };

    // Orders status distribution
    const ordersChartOptions: any = {
        series: [45, 30, 15, 10],
        chart: {
            type: 'donut',
            height: 300,
        },
        labels: ['Delivered', 'Processing', 'Pending', 'Cancelled'],
        colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
        legend: {
            position: 'bottom',
        },
        plotOptions: {
            pie: {
                donut: {
                    size: '65%',
                    labels: {
                        show: true,
                        total: {
                            show: true,
                            label: 'Total Orders',
                            formatter: () => stats?.total_orders.toString() || '0',
                        },
                    },
                },
            },
        },
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            shipped: 'bg-purple-100 text-purple-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800',
        };
        return statusConfig[status] || 'bg-gray-100 text-gray-800';
    };

    if (statsLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <IconLoader className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">E-commerce Dashboard</h1>
                <p className="text-gray-600 mt-1">Monitor your store performance and metrics</p>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Revenue Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <IconCurrencyDollar className="w-6 h-6 text-green-600" />
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-semibold ${
                            (stats?.revenue_growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {(stats?.revenue_growth || 0) >= 0 ? (
                                <IconArrowUp className="w-4 h-4" />
                            ) : (
                                <IconArrowDown className="w-4 h-4" />
                            )}
                            {Math.abs(stats?.revenue_growth || 0)}%
                        </div>
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium">Total Revenue</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(stats?.total_revenue || 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">vs last period</p>
                </div>

                {/* Orders Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <IconShoppingCart className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-semibold ${
                            (stats?.orders_growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {(stats?.orders_growth || 0) >= 0 ? (
                                <IconArrowUp className="w-4 h-4" />
                            ) : (
                                <IconArrowDown className="w-4 h-4" />
                            )}
                            {Math.abs(stats?.orders_growth || 0)}%
                        </div>
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium">Total Orders</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_orders || 0}</p>
                    <p className="text-xs text-gray-500 mt-2">vs last period</p>
                </div>

                {/* Customers Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <IconUsers className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-semibold ${
                            (stats?.customers_growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {(stats?.customers_growth || 0) >= 0 ? (
                                <IconArrowUp className="w-4 h-4" />
                            ) : (
                                <IconArrowDown className="w-4 h-4" />
                            )}
                            {Math.abs(stats?.customers_growth || 0)}%
                        </div>
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium">Total Customers</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_customers || 0}</p>
                    <p className="text-xs text-gray-500 mt-2">vs last period</p>
                </div>

                {/* AOV Card */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <IconTrendingUp className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-semibold ${
                            (stats?.aov_growth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                            {(stats?.aov_growth || 0) >= 0 ? (
                                <IconArrowUp className="w-4 h-4" />
                            ) : (
                                <IconArrowDown className="w-4 h-4" />
                            )}
                            {Math.abs(stats?.aov_growth || 0)}%
                        </div>
                    </div>
                    <h3 className="text-gray-600 text-sm font-medium">Avg. Order Value</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(stats?.average_order_value || 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">vs last period</p>
                </div>
            </div>

            {/* Alerts Section */}
            {(stats?.pending_orders || 0) > 0 || (stats?.low_stock_items || 0) > 0 || (stats?.out_of_stock_items || 0) > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {(stats?.pending_orders || 0) > 0 && (
                        <Link
                            to="/admin/orders/pending"
                            className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg hover:bg-yellow-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <IconAlertTriangle className="w-5 h-5 text-yellow-600" />
                                <div>
                                    <p className="font-semibold text-yellow-900">
                                        {stats?.pending_orders} Pending Orders
                                    </p>
                                    <p className="text-sm text-yellow-700">Requires attention</p>
                                </div>
                            </div>
                        </Link>
                    )}
                    {(stats?.low_stock_items || 0) > 0 && (
                        <Link
                            to="/admin/inventory/low-stock"
                            className="bg-orange-50 border border-orange-200 p-4 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <IconPackage className="w-5 h-5 text-orange-600" />
                                <div>
                                    <p className="font-semibold text-orange-900">
                                        {stats?.low_stock_items} Low Stock Items
                                    </p>
                                    <p className="text-sm text-orange-700">Restock needed</p>
                                </div>
                            </div>
                        </Link>
                    )}
                    {(stats?.out_of_stock_items || 0) > 0 && (
                        <Link
                            to="/admin/inventory/stock"
                            className="bg-red-50 border border-red-200 p-4 rounded-lg hover:bg-red-100 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <IconAlertTriangle className="w-5 h-5 text-red-600" />
                                <div>
                                    <p className="font-semibold text-red-900">
                                        {stats?.out_of_stock_items} Out of Stock
                                    </p>
                                    <p className="text-sm text-red-700">Urgent action required</p>
                                </div>
                            </div>
                        </Link>
                    )}
                </div>
            ) : null}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Revenue Overview</h3>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="text-sm border border-gray-300 rounded px-3 py-1"
                        >
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="year">This Year</option>
                        </select>
                    </div>
                    <ReactApexChart options={revenueChartOptions} series={revenueChartOptions.series} type="area" height={300} />
                </div>

                {/* Orders Distribution */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Orders Distribution</h3>
                    <ReactApexChart options={ordersChartOptions} series={ordersChartOptions.series} type="donut" height={300} />
                </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                        <Link to="/admin/orders/list" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                            View All
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {ordersLoading ? (
                            <div className="text-center py-4">
                                <IconLoader className="w-6 h-6 animate-spin mx-auto" />
                            </div>
                        ) : recentOrders && recentOrders.length > 0 ? (
                            recentOrders.slice(0, 5).map((order) => (
                                <Link
                                    key={order.id}
                                    to={`/admin/orders/${order.id}`}
                                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-gray-900">#{order.order_number}</p>
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(order.status)}`}>
                                                {order.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{order.customer_name}</p>
                                        <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900">{formatCurrency(order.total_amount)}</p>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-4">No recent orders</p>
                        )}
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
                        <Link to="/admin/products/list" className="text-sm text-primary-500 hover:text-primary-600 font-medium">
                            View All
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {productsLoading ? (
                            <div className="text-center py-4">
                                <IconLoader className="w-6 h-6 animate-spin mx-auto" />
                            </div>
                        ) : topProducts && topProducts.length > 0 ? (
                            topProducts.slice(0, 5).map((product, index) => (
                                <Link
                                    key={product.id}
                                    to={`/admin/products/${product.id}`}
                                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                        {product.image ? (
                                            <img src={product.image} alt={product.name} className="w-full h-full object-cover rounded" />
                                        ) : (
                                            <IconPackage className="w-6 h-6 text-gray-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                                        <p className="text-sm text-gray-600">{product.sales_count} sales</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900">{formatCurrency(product.revenue)}</p>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className="text-center text-gray-500 py-4">No data available</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EcommerceDashboard;


