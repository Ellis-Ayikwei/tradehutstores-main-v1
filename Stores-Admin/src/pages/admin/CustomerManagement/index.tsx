import {
    IconAlertTriangle,
    IconBan,
    IconCheck,
    IconEdit,
    IconEye,
    IconMail,
    IconPlus,
    IconSearch,
    IconShoppingBag,
    IconStar,
    IconTrash,
    IconUser,
    IconUsers,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import IconLoader from '../../../components/Icon/IconLoader';
import DraggableDataTable, { ColumnDefinition } from '../../../components/ui/DraggableDataTable';
import FilterSelect from '../../../components/ui/FilterSelect';
import axiosInstance from '../../../services/axiosInstance';

interface Customer {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    account_status: 'active' | 'pending' | 'suspended' | 'inactive';
    profile_picture?: string;
    date_joined: string;
    last_active: string;
    total_orders: number;
    total_spent: number;
    average_order_value: number;
    address?: {
        address_line1: string;
        city: string;
        state?: string;
        postal_code: string;
        country: string;
    };
}

const CustomerManagement: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');

    // Fetch customers from API
    const fetchCustomers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/customers/');
            setCustomers(response.data);
        } catch (err) {
            setError('Failed to fetch customers. Please try again later.');
            console.error('Error fetching customers:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    // Calculate customer counts
    const getCustomerCounts = () => {
        const counts = {
            all: customers.length,
            active: customers.filter((c) => c.account_status === 'active').length,
            suspended: customers.filter((c) => c.account_status === 'suspended').length,
            pending: customers.filter((c) => c.account_status === 'pending').length,
            inactive: customers.filter((c) => c.account_status === 'inactive').length,
        };
        return counts;
    };

    const customerCounts = getCustomerCounts();

    // Filter customers based on active filter
    const getFilteredCustomers = () => {
        if (activeFilter === 'all') return customers;
        return customers.filter((customer) => customer.account_status === activeFilter);
    };

    const handleFilterChange = (filter: string) => {
        setActiveFilter(filter);
    };

    // Handle customer suspension
    const handleSuspend = async (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowSuspendModal(true);
        setSuspensionReason('');
    };

    const handleConfirmSuspend = async () => {
        if (selectedCustomer) {
            try {
                const newStatus = selectedCustomer.account_status === 'suspended' ? 'active' : 'suspended';
                await axiosInstance.patch(`/customers/${selectedCustomer.id}/`, {
                    account_status: newStatus,
                    suspension_reason: suspensionReason,
                });
                await fetchCustomers();
                setShowSuspendModal(false);
                setSuspensionReason('');
                setSelectedCustomer(null);
            } catch (err) {
                setError('Failed to update customer status. Please try again.');
                console.error('Error updating customer status:', err);
            }
        }
    };

    // Handle customer deletion
    const handleDelete = (customer: Customer) => {
        setSelectedCustomer(customer);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (selectedCustomer) {
            try {
                await axiosInstance.delete(`/customers/${selectedCustomer.id}/`);
                await fetchCustomers();
                setShowDeleteModal(false);
                setSelectedCustomer(null);
            } catch (err) {
                setError('Failed to delete customer. Please try again.');
                console.error('Error deleting customer:', err);
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
            pending: 'bg-yellow-100 text-yellow-800',
            suspended: 'bg-red-100 text-red-800',
            inactive: 'bg-gray-100 text-gray-800',
        };
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[status as keyof typeof statusConfig]}`}>
                {status.toUpperCase()}
            </span>
        );
    };

    const columns: ColumnDefinition<Customer>[] = [
        {
            key: 'profile_picture',
            label: 'Avatar',
            render: (customer) => (
                <div className="w-10 h-10 flex-shrink-0">
                    {customer.profile_picture ? (
                        <img src={customer.profile_picture} alt={`${customer.first_name} ${customer.last_name}`} className="w-full h-full object-cover rounded-full" />
                    ) : (
                        <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                            <IconUser className="w-5 h-5 text-gray-400" />
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'first_name',
            label: 'Customer Name',
            sortable: true,
            render: (customer) => (
                <div>
                    <div className="font-semibold text-gray-900">
                        {customer.first_name} {customer.last_name}
                    </div>
                    <div className="text-sm text-gray-500">{customer.email}</div>
                </div>
            ),
        },
        {
            key: 'phone_number',
            label: 'Phone',
            sortable: true,
            render: (customer) => (
                <div className="text-sm text-gray-600">{customer.phone_number}</div>
            ),
        },
        {
            key: 'total_orders',
            label: 'Orders',
            sortable: true,
            render: (customer) => (
                <div className="text-center">
                    <span className="font-semibold text-gray-900">{customer.total_orders}</span>
                </div>
            ),
        },
        {
            key: 'total_spent',
            label: 'Total Spent',
            sortable: true,
            render: (customer) => (
                <div className="font-semibold text-gray-900">{formatCurrency(customer.total_spent)}</div>
            ),
        },
        {
            key: 'average_order_value',
            label: 'Avg. Order',
            sortable: true,
            render: (customer) => (
                <div className="text-gray-600">{formatCurrency(customer.average_order_value)}</div>
            ),
        },
        {
            key: 'account_status',
            label: 'Status',
            sortable: true,
            render: (customer) => getStatusBadge(customer.account_status),
        },
        {
            key: 'date_joined',
            label: 'Joined',
            sortable: true,
            render: (customer) => (
                <div className="text-sm text-gray-600">{formatDate(customer.date_joined)}</div>
            ),
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (customer) => (
                <div className="flex gap-2">
                    <Link
                        to={`/admin/customers/${customer.id}`}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="View Details"
                    >
                        <IconEye className="w-4 h-4 text-blue-600" />
                    </Link>
                    <button
                        onClick={() => handleSuspend(customer)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title={customer.account_status === 'suspended' ? 'Activate' : 'Suspend'}
                    >
                        {customer.account_status === 'suspended' ? (
                            <IconCheck className="w-4 h-4 text-green-600" />
                        ) : (
                            <IconBan className="w-4 h-4 text-orange-600" />
                        )}
                    </button>
                    <button
                        onClick={() => handleDelete(customer)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Delete Customer"
                    >
                        <IconTrash className="w-4 h-4 text-red-600" />
                    </button>
                </div>
            ),
        },
    ];

    const filterOptions = [
        { value: 'all', label: `All Customers (${customerCounts.all})`, icon: IconUsers },
        { value: 'active', label: `Active (${customerCounts.active})`, icon: IconCheck },
        { value: 'pending', label: `Pending (${customerCounts.pending})`, icon: IconAlertTriangle },
        { value: 'suspended', label: `Suspended (${customerCounts.suspended})`, icon: IconBan },
        { value: 'inactive', label: `Inactive (${customerCounts.inactive})`, icon: IconUser },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <IconLoader className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    // Calculate total revenue
    const totalRevenue = customers.reduce((sum, customer) => sum + customer.total_spent, 0);
    const averageOrderValue = customers.length > 0 
        ? customers.reduce((sum, customer) => sum + customer.average_order_value, 0) / customers.length 
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
                    <p className="text-gray-600 mt-1">Manage customer accounts and relationships</p>
                </div>
                <Link
                    to="/admin/customers/new"
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                    <IconPlus className="w-5 h-5" />
                    Add New Customer
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
                            <p className="text-sm text-gray-600">Total Customers</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{customerCounts.all}</p>
                        </div>
                        <IconUsers className="w-10 h-10 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Active</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{customerCounts.active}</p>
                        </div>
                        <IconCheck className="w-10 h-10 text-green-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalRevenue)}</p>
                        </div>
                        <IconShoppingBag className="w-10 h-10 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Avg. Order Value</p>
                            <p className="text-2xl font-bold text-purple-600 mt-1">{formatCurrency(averageOrderValue)}</p>
                        </div>
                        <IconStar className="w-10 h-10 text-purple-500" />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <FilterSelect options={filterOptions} activeFilter={activeFilter} onFilterChange={handleFilterChange} />
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DraggableDataTable
                    data={getFilteredCustomers()}
                    columns={columns}
                    searchable={true}
                    searchableColumns={['first_name', 'last_name', 'email', 'phone_number']}
                    pagination={true}
                    pageSize={20}
                />
            </div>

            {/* Suspend/Activate Modal */}
            {showSuspendModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-full ${selectedCustomer.account_status === 'suspended' ? 'bg-green-100' : 'bg-orange-100'}`}>
                                {selectedCustomer.account_status === 'suspended' ? (
                                    <IconCheck className="w-6 h-6 text-green-600" />
                                ) : (
                                    <IconBan className="w-6 h-6 text-orange-600" />
                                )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {selectedCustomer.account_status === 'suspended' ? 'Activate Customer' : 'Suspend Customer'}
                            </h3>
                        </div>
                        <p className="text-gray-600 mb-4">
                            {selectedCustomer.account_status === 'suspended'
                                ? `Are you sure you want to activate ${selectedCustomer.first_name} ${selectedCustomer.last_name}?`
                                : `Are you sure you want to suspend ${selectedCustomer.first_name} ${selectedCustomer.last_name}?`}
                        </p>
                        {selectedCustomer.account_status !== 'suspended' && (
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Suspension Reason</label>
                                <textarea
                                    value={suspensionReason}
                                    onChange={(e) => setSuspensionReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Enter reason for suspension..."
                                />
                            </div>
                        )}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowSuspendModal(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmSuspend}
                                className={`px-4 py-2 text-white rounded-lg transition-colors ${
                                    selectedCustomer.account_status === 'suspended'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-orange-600 hover:bg-orange-700'
                                }`}
                            >
                                {selectedCustomer.account_status === 'suspended' ? 'Activate' : 'Suspend'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedCustomer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-full">
                                <IconTrash className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Delete Customer</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete <strong>{selectedCustomer.first_name} {selectedCustomer.last_name}</strong>? This action cannot be undone and will remove all customer data.
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
                                Delete Customer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerManagement;


