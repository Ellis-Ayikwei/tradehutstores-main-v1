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
    IconBuildingStore,
} from '@tabler/icons-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import IconLoader from '../../../components/Icon/IconLoader';
import DraggableDataTable, { ColumnDefinition } from '../../../components/ui/DraggableDataTable';
import FilterSelect from '../../../components/ui/FilterSelect';
import axiosInstance from '../../../services/axiosInstance';
import { useCurrency } from '../../../contexts/CurrencyContext';

interface Seller {
    id: string;
    user: {
        id: string;
        username: string;
        email: string;
        first_name?: string;
        last_name?: string;
    };
    business_name: string;
    business_description?: string;
    business_email?: string;
    business_phone?: string;
    business_address?: string;
    verification_status: 'pending' | 'verified' | 'rejected' | 'suspended';
    is_verified: boolean;
    is_active: boolean;
    is_accepting_orders: boolean;
    total_sales: number;
    total_orders: number;
    rating: number;
    total_reviews: number;
    store_logo?: string;
    store_banner?: string;
    store_slug?: string;
    created_at: string;
    updated_at: string;
}

const SellerManagement: React.FC = () => {
    const [sellers, setSellers] = useState<Seller[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
    const [showSuspendModal, setShowSuspendModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [suspensionReason, setSuspensionReason] = useState('');

    // Fetch sellers from API
    const fetchSellers = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/sellers/admin/list/');
            // Handle both array response and paginated response with results
            const sellersData = Array.isArray(response.data) 
                ? response.data 
                : (response.data?.results || response.data?.data || []);
            setSellers(sellersData);
        } catch (err) {
            setError('Failed to fetch sellers. Please try again later.');
            console.error('Error fetching sellers:', err);
            setSellers([]); // Ensure sellers is always an array
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    // Calculate seller counts
    const getSellerCounts = () => {
        // Ensure sellers is an array
        const sellersArray = Array.isArray(sellers) ? sellers : [];
        const counts = {
            all: sellersArray.length,
            verified: sellersArray.filter((s) => s.verification_status === 'verified' && s.is_active).length,
            pending: sellersArray.filter((s) => s.verification_status === 'pending').length,
            rejected: sellersArray.filter((s) => s.verification_status === 'rejected').length,
            suspended: sellersArray.filter((s) => s.verification_status === 'suspended' || !s.is_active).length,
        };
        return counts;
    };

    const sellerCounts = getSellerCounts();

    // Filter sellers based on active filter
    const getFilteredSellers = () => {
        // Ensure sellers is an array
        const sellersArray = Array.isArray(sellers) ? sellers : [];
        if (activeFilter === 'all') return sellersArray;
        if (activeFilter === 'verified') {
            return sellersArray.filter((seller) => seller.verification_status === 'verified' && seller.is_active);
        }
        if (activeFilter === 'suspended') {
            return sellersArray.filter((seller) => seller.verification_status === 'suspended' || !seller.is_active);
        }
        return sellersArray.filter((seller) => seller.verification_status === activeFilter);
    };

    const handleFilterChange = (filter: string | number) => {
        setActiveFilter(String(filter));
    };

    // Handle seller suspension/activation
    const handleSuspend = async (seller: Seller) => {
        setSelectedSeller(seller);
        setShowSuspendModal(true);
        setSuspensionReason('');
    };

    const handleConfirmSuspend = async () => {
        if (selectedSeller) {
            try {
                const newStatus = selectedSeller.verification_status === 'suspended' || !selectedSeller.is_active
                    ? 'verified'
                    : 'suspended';
                const isActive = selectedSeller.verification_status === 'suspended' || !selectedSeller.is_active;
                
                await axiosInstance.patch(`/sellers/admin/${selectedSeller.id}/`, {
                    verification_status: newStatus,
                    is_active: !isActive,
                    verification_notes: suspensionReason,
                });
                await fetchSellers();
                setShowSuspendModal(false);
                setSuspensionReason('');
                setSelectedSeller(null);
            } catch (err) {
                setError('Failed to update seller status. Please try again.');
                console.error('Error updating seller status:', err);
            }
        }
    };

    // Handle seller deletion
    const handleDelete = (seller: Seller) => {
        setSelectedSeller(seller);
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (selectedSeller) {
            try {
                await axiosInstance.delete(`/sellers/admin/${selectedSeller.id}/`);
                await fetchSellers();
                setShowDeleteModal(false);
                setSelectedSeller(null);
            } catch (err) {
                setError('Failed to delete seller. Please try again.');
                console.error('Error deleting seller:', err);
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

    const getStatusBadge = (status: string, isActive: boolean) => {
        const statusConfig: Record<string, string> = {
            verified: 'bg-green-100 text-green-800',
            pending: 'bg-yellow-100 text-yellow-800',
            rejected: 'bg-red-100 text-red-800',
            suspended: 'bg-red-100 text-red-800',
        };
        const safeStatus = status || 'pending';
        const displayStatus = !isActive ? 'suspended' : safeStatus;
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusConfig[displayStatus] || statusConfig.pending}`}>
                {displayStatus.toUpperCase().replace('_', ' ')}
            </span>
        );
    };

    const columns: ColumnDefinition[] = [
        {
            accessor: 'store_logo',
            title: 'Logo',
            render: (seller: Seller) => (
                <div className="w-10 h-10 flex-shrink-0">
                    {seller.store_logo ? (
                        <img src={seller.store_logo} alt={seller.business_name || ''} className="w-full h-full object-cover rounded-full" />
                    ) : (
                        <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center">
                            <IconBuildingStore className="w-5 h-5 text-gray-400" />
                        </div>
                    )}
                </div>
            ),
        },
        {
            accessor: 'business_name',
            title: 'Business Name',
            sortable: true,
            render: (seller: Seller) => (
                <div>
                    <div className="font-semibold text-gray-900">
                        {seller.business_name || 'N/A'}
                    </div>
                    <div className="text-sm text-gray-500">
                        {seller.user?.email || seller.business_email || 'N/A'}
                    </div>
                </div>
            ),
        },
        {
            accessor: 'business_phone',
            title: 'Phone',
            sortable: true,
            render: (seller: Seller) => (
                <div className="text-sm text-gray-600">{seller.business_phone || 'N/A'}</div>
            ),
        },
        {
            accessor: 'total_orders',
            title: 'Orders',
            sortable: true,
            render: (seller: Seller) => (
                <div className="text-center">
                    <span className="font-semibold text-gray-900">{seller.total_orders ?? 0}</span>
                </div>
            ),
        },
        {
            accessor: 'total_sales',
            title: 'Total Sales',
            sortable: true,
            render: (seller: Seller) => (
                <div className="font-semibold text-gray-900">{formatCurrency(Number(seller.total_sales) || 0)}</div>
            ),
        },
        {
            accessor: 'rating',
            title: 'Rating',
            sortable: true,
            render: (seller: Seller) => (
                <div className="flex items-center gap-1">
                    <IconStar className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-gray-900 font-semibold">
                        {seller.rating ? Number(seller.rating).toFixed(1) : '0.0'}
                    </span>
                    <span className="text-sm text-gray-500">
                        ({seller.total_reviews || 0})
                    </span>
                </div>
            ),
        },
        {
            accessor: 'verification_status',
            title: 'Status',
            sortable: true,
            render: (seller: Seller) => getStatusBadge(seller.verification_status, seller.is_active),
        },
        {
            accessor: 'is_accepting_orders',
            title: 'Orders',
            sortable: true,
            render: (seller: Seller) => (
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    seller.is_accepting_orders 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                }`}>
                    {seller.is_accepting_orders ? 'Accepting' : 'Not Accepting'}
                </span>
            ),
        },
        {
            accessor: 'created_at',
            title: 'Joined',
            sortable: true,
            render: (seller: Seller) => (
                <div className="text-sm text-gray-600">{seller.created_at ? formatDate(seller.created_at) : 'N/A'}</div>
            ),
        },
        {
            accessor: 'actions',
            title: 'Actions',
            render: (seller: Seller) => (
                <div className="flex gap-2">
                    <Link
                        to={`/admin/sellers/${seller.id}`}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="View Details"
                    >
                        <IconEye className="w-4 h-4 text-blue-600" />
                    </Link>
                    <button
                        onClick={() => handleSuspend(seller)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title={seller.verification_status === 'suspended' || !seller.is_active ? 'Activate' : 'Suspend'}
                    >
                        {seller.verification_status === 'suspended' || !seller.is_active ? (
                            <IconCheck className="w-4 h-4 text-green-600" />
                        ) : (
                            <IconBan className="w-4 h-4 text-orange-600" />
                        )}
                    </button>
                    <button
                        onClick={() => handleDelete(seller)}
                        className="p-2 hover:bg-gray-100 rounded transition-colors"
                        title="Delete Seller"
                    >
                        <IconTrash className="w-4 h-4 text-red-600" />
                    </button>
                </div>
            ),
        },
    ];

    const filterOptions = [
        { value: 'all', label: `All Sellers (${sellerCounts.all})` },
        { value: 'verified', label: `Verified (${sellerCounts.verified})` },
        { value: 'pending', label: `Pending (${sellerCounts.pending})` },
        { value: 'rejected', label: `Rejected (${sellerCounts.rejected})` },
        { value: 'suspended', label: `Suspended (${sellerCounts.suspended})` },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <IconLoader className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    // Calculate total revenue
    const sellersArray = Array.isArray(sellers) ? sellers : [];
    const totalRevenue = sellersArray.reduce((sum, seller) => sum + (Number(seller.total_sales) || 0), 0);
    const averageRating = sellersArray.length > 0 
        ? sellersArray.reduce((sum, seller) => sum + (Number(seller.rating) || 0), 0) / sellersArray.length 
        : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Seller Management</h1>
                    <p className="text-gray-600 mt-1">Manage seller accounts and verification</p>
                </div>
                <Link
                    to="/admin/sellers/new"
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                    <IconPlus className="w-5 h-5" />
                    Add New Seller
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
                            <p className="text-sm text-gray-600">Total Sellers</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">{sellerCounts.all}</p>
                        </div>
                        <IconUsers className="w-10 h-10 text-blue-500" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Verified</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{sellerCounts.verified}</p>
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
                            <p className="text-sm text-gray-600">Avg. Rating</p>
                            <p className="text-2xl font-bold text-purple-600 mt-1">{averageRating.toFixed(1)}</p>
                        </div>
                        <IconStar className="w-10 h-10 text-purple-500" />
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

            {/* Sellers Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <DraggableDataTable
                    data={getFilteredSellers()}
                    columns={columns}
                    loading={loading}
                    title="Sellers"
                    quickCheckFields={['business_name', 'business_email', 'business_phone', 'user.email']}
                />
            </div>

            {/* Suspend/Activate Modal */}
            {showSuspendModal && selectedSeller && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-2 rounded-full ${selectedSeller.verification_status === 'suspended' || !selectedSeller.is_active ? 'bg-green-100' : 'bg-orange-100'}`}>
                                {selectedSeller.verification_status === 'suspended' || !selectedSeller.is_active ? (
                                    <IconCheck className="w-6 h-6 text-green-600" />
                                ) : (
                                    <IconBan className="w-6 h-6 text-orange-600" />
                                )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">
                                {selectedSeller.verification_status === 'suspended' || !selectedSeller.is_active ? 'Activate Seller' : 'Suspend Seller'}
                            </h3>
                        </div>
                        <p className="text-gray-600 mb-4">
                            {selectedSeller.verification_status === 'suspended' || !selectedSeller.is_active
                                ? `Are you sure you want to activate ${selectedSeller.business_name}?`
                                : `Are you sure you want to suspend ${selectedSeller.business_name}?`}
                        </p>
                        {selectedSeller.verification_status !== 'suspended' && selectedSeller.is_active && (
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
                                    selectedSeller.verification_status === 'suspended' || !selectedSeller.is_active
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-orange-600 hover:bg-orange-700'
                                }`}
                            >
                                {selectedSeller.verification_status === 'suspended' || !selectedSeller.is_active ? 'Activate' : 'Suspend'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedSeller && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-full">
                                <IconTrash className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Delete Seller</h3>
                        </div>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to delete <strong>{selectedSeller.business_name}</strong>? This action cannot be undone and will remove all seller data.
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
                                Delete Seller
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SellerManagement;

