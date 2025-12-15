import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    IconPackage,
    IconCurrencyDollar,
    IconCalendar,
    IconFilter,
    IconFilterOff,
    IconSearch,
    IconDownload,
    IconEye,
    IconEdit,
    IconTrash,
    IconX,
    IconCheck,
    IconClock,
    IconUser,
    IconMapPin,
    IconTruck,
    IconFileExport,
    IconExclamationCircle,
    IconChevronLeft,
    IconChevronRight,
    IconShieldCheck,
    IconShieldX,
    IconShieldOff,
    IconShield,
} from '@tabler/icons-react';
import fetcher from '../../../services/fetcher';
import useSWR from 'swr';
import { Booking, transformBookingData } from '../../../types/booking';
import DraggableDataTable from '../../../components/ui/DraggableDataTable';
import confirmDialog from '../../../helper/confirmDialog';
import axiosInstance from '../../../services/axiosInstance';
import showNotification from '../../../utilities/showNotifcation';
import EnterpriseDateTime from '../../../utilities/EnterpriseDateTime';

const BookingManagement: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
    const [dateRangeFilter, setDateRangeFilter] = useState({
        startDate: '',
        endDate: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [selectedRecords, setSelectedRecords] = useState<Booking[]>([]);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    
    const { data: bookingsData, isLoading: bookingsLoading, error: bookingsError, mutate } = useSWR('requests/', fetcher, {
        refreshInterval: 30000, // Refresh every 30 seconds
        revalidateOnFocus: true, // Revalidate when window gains focus
        revalidateOnReconnect: true, // Revalidate when network reconnects
        dedupingInterval: 2000, // Dedupe requests within 2 seconds
        onError: (err) => {
            console.error('SWR Error:', err);
        },
        onSuccess: (data) => {
            console.log('SWR Success - Bookings data received:', data);
        },
    });

    useEffect(() => {
        if (bookingsData) {
            const transformedBookings = transformBookingData(bookingsData);
            setBookings(transformedBookings);
        }
        console.log('bookings data', bookingsData);
    }, [bookingsData]);

    useEffect(() => {
        filterBookings();
    }, [bookings, searchTerm, statusFilter, paymentStatusFilter, dateRangeFilter]);

    const filterBookings = () => {
        let filtered = bookings;

        // Apply search term filter
        if (searchTerm.trim() !== '') {
            filtered = filtered.filter(
                (booking) =>
                    booking?.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (booking?.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (booking?.provider?.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (booking?.pickup_location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (booking?.deliveryLocation || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    booking?.tracking_number.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Apply status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter((booking) => booking?.status === statusFilter);
        }

        // Apply payment status filter
        if (paymentStatusFilter !== 'all') {
            filtered = filtered.filter((booking) => booking?.payment_status === paymentStatusFilter);
        }

        // Apply date range filter
        if (dateRangeFilter.startDate && dateRangeFilter.endDate) {
            const startDate = new Date(dateRangeFilter.startDate);
            const endDate = new Date(dateRangeFilter.endDate);

            filtered = filtered.filter((booking) => {
                const bookingDate = new Date(booking?.created_at || booking.createdAt || '');
                return bookingDate >= startDate && bookingDate <= endDate;
            });
        }

        setFilteredBookings(filtered);
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value);
    };

    const handlePaymentStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPaymentStatusFilter(e.target.value);
    };

    const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDateRangeFilter({
            ...dateRangeFilter,
            [name]: value,
        });
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setPaymentStatusFilter('all');
        setDateRangeFilter({ startDate: '', endDate: '' });
    };

    const handleCancelBooking = (bookingId: string) => {
        if (window.confirm('Are you sure you want to cancel this booking?')) {
            setBookings(bookings.map((booking) => (booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking)));
        }
    };

    const handleDeleteBooking = async (bookingId: string) => {
        const booking = bookings.find((b) => b.id === bookingId);
        if (!booking) return;

        const isConfirmed = await confirmDialog({
            title:"Delete booking",
            note:"This Action Cannot Be Undone",
            recommended:"should rather deactivate it",
            finalQuestion: "Are You Sure You Want To Delete This",

        })

        if (isConfirmed) {
            try {
                // Make API call to delete the booking
                const response = await axiosInstance.delete(`/requests/${bookingId}/`);

                if(response.status===200 || response.status===201 || response.status===204){
                    showNotification({
                        message: "Booking Deleted Successfully",
                        type: 'success',
                        showHide: true
                    })

                    // Force revalidation of the SWR cache
                    console.log('Calling mutate to refresh data...');
                    await mutate();
                    console.log('Mutate called successfully');
                }
            } catch (error) {
                console.error('Error deleting booking:', error);
                showNotification({
                    message: "Failed to delete booking. Please try again or contact support.",
                    type: 'error',
                    showHide: true
                })
            }
        }
    };

    // Bulk Actions Handlers
    const handleBulkDelete = async () => {
        if (selectedRecords.length === 0) return;

        const isConfirmed = await confirmDialog({
            title: "Delete Multiple Bookings",
            note: `This action will permanently delete ${selectedRecords.length} booking(s)`,
            recommended: "This action cannot be undone",
            finalQuestion: `Are you sure you want to delete ${selectedRecords.length} booking(s)?`
        });

        if (isConfirmed) {
            setBulkActionLoading(true);
            try {
                const promises = selectedRecords.map(async (booking) => {
                    return axiosInstance.delete(`/requests/${booking.id}/`);
                });

                await Promise.all(promises);
                
                showNotification({
                    message: `${selectedRecords.length} booking(s) deleted successfully`,
                    type: 'success',
                    showHide: true
                });

                setSelectedRecords([]);
                await mutate();
            } catch (error) {
                console.error('Error deleting bookings:', error);
                showNotification({
                    message: "Failed to delete some bookings. Please try again.",
                    type: 'error',
                    showHide: true
                });
            } finally {
                setBulkActionLoading(false);
            }
        }
    };

    const handleBulkVerify = async () => {
        if (selectedRecords.length === 0) return;

        const isConfirmed = await confirmDialog({
            title: "Verify Multiple Bookings",
            note: `This action will verify ${selectedRecords.length} booking(s)`,
            recommended: "Verified bookings will be marked as confirmed",
            finalQuestion: `Are you sure you want to verify ${selectedRecords.length} booking(s)?`
        });

        if (isConfirmed) {
            setBulkActionLoading(true);
            try {
                const promises = selectedRecords.map(async (booking) => {
                    return axiosInstance.patch(`/requests/${booking.id}/`, {
                        status: 'confirmed',
                        verified: true
                    });
                });

                await Promise.all(promises);
                
                showNotification({
                    message: `${selectedRecords.length} booking(s) verified successfully`,
                    type: 'success',
                    showHide: true
                });

                setSelectedRecords([]);
                await mutate();
            } catch (error) {
                console.error('Error verifying bookings:', error);
                showNotification({
                    message: "Failed to verify some bookings. Please try again.",
                    type: 'error',
                    showHide: true
                });
            } finally {
                setBulkActionLoading(false);
            }
        }
    };

    const handleBulkDeactivate = async () => {
        if (selectedRecords.length === 0) return;

        const isConfirmed = await confirmDialog({
            title: "Deactivate Multiple Bookings",
            note: `This action will deactivate ${selectedRecords.length} booking(s)`,
            recommended: "Deactivated bookings will be marked as cancelled",
            finalQuestion: `Are you sure you want to deactivate ${selectedRecords.length} booking(s)?`
        });

        if (isConfirmed) {
            setBulkActionLoading(true);
            try {
                const promises = selectedRecords.map(async (booking) => {
                    return axiosInstance.patch(`/requests/${booking.id}/`, {
                        status: 'cancelled',
                        active: false
                    });
                });

                await Promise.all(promises);
                
                showNotification({
                    message: `${selectedRecords.length} booking(s) deactivated successfully`,
                    type: 'success',
                    showHide: true
                });

                setSelectedRecords([]);
                await mutate();
            } catch (error) {
                console.error('Error deactivating bookings:', error);
                showNotification({
                    message: "Failed to deactivate some bookings. Please try again.",
                    type: 'error',
                    showHide: true
                });
            } finally {
                setBulkActionLoading(false);
            }
        }
    };

    const handleBulkUnverify = async () => {
        if (selectedRecords.length === 0) return;

        const isConfirmed = await confirmDialog({
            title: "Unverify Multiple Bookings",
            note: `This action will unverify ${selectedRecords.length} booking(s)`,
            recommended: "Unverified bookings will be marked as pending",
            finalQuestion: `Are you sure you want to unverify ${selectedRecords.length} booking(s)?`
        });

        if (isConfirmed) {
            setBulkActionLoading(true);
            try {
                const promises = selectedRecords.map(async (booking) => {
                    return axiosInstance.patch(`/requests/${booking.id}/`, {
                        status: 'pending',
                        verified: false
                    });
                });

                await Promise.all(promises);
                
                showNotification({
                    message: `${selectedRecords.length} booking(s) unverified successfully`,
                    type: 'success',
                    showHide: true
                });

                setSelectedRecords([]);
                await mutate();
            } catch (error) {
                console.error('Error unverifying bookings:', error);
                showNotification({
                    message: "Failed to unverify some bookings. Please try again.",
                    type: 'error',
                    showHide: true
                });
            } finally {
                setBulkActionLoading(false);
            }
        }
    };

    const handleExportBookings = () => {
        // In a real app, this would create a CSV or PDF file for download
        alert('Exporting bookings...');
    };

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700';
            case 'confirmed':
                return 'bg-blue-100 text-blue-700';
            case 'in_progress':
                return 'bg-yellow-100 text-yellow-700';
            case 'pending':
                return 'bg-gray-100 text-gray-700';
            case 'cancelled':
                return 'bg-red-100 text-red-700';
            case 'accepted':
                return 'bg-purple-100 text-purple-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getPaymentStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-700';
            case 'pending':
                return 'bg-yellow-100 text-yellow-700';
            case 'refunded':
                return 'bg-gray-100 text-gray-700';
            case 'partial':
                return 'bg-orange-100 text-orange-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <IconClock className="w-3 h-3" />;
            case 'confirmed':
                return <IconCheck className="w-3 h-3" />;
            case 'in_progress':
                return <IconTruck className="w-3 h-3" />;
            case 'completed':
                return <IconCheck className="w-3 h-3" />;
            case 'cancelled':
                return <IconX className="w-3 h-3" />;
            default:
                return <IconExclamationCircle className="w-3 h-3" />;
        }
    };

    const formatDate = (dateString: string | undefined | null) => {
        if (!dateString) return 'Not specified';

        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }
            return date.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
            });
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid date';
        }
    };

    const formatDimensions = (dimensions: any) => {
        if (!dimensions) return 'Not specified';
        
        // If dimensions is a string, try to parse it for cubic calculation
        if (typeof dimensions === 'string') {
            // Try to extract numbers from string like "200 × 90 × 90 cm"
            const match = dimensions.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(\w+)/);
            if (match) {
                const [, width, height, length, unit] = match;
                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                return `${volume.toFixed(0)} cubic ${unit}`;
            }
            return dimensions; // Return as is if can't parse
        }
        
        // If dimensions is an object with unit, width, height, length
        if (typeof dimensions === 'object' && dimensions !== null) {
            const { unit, width, height, length } = dimensions;
            if (width && height && length) {
                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                return `${volume.toFixed(0)} cubic ${unit || 'cm'}`;
            } else if (width && height) {
                const area = parseFloat(width) * parseFloat(height);
                return `${area.toFixed(0)} square ${unit || 'cm'}`;
            } else if (width) {
                return `${width} ${unit || 'cm'}`;
            }
        }
        
        return 'Invalid dimensions';
    };

    const sortBookings = (key: string, direction: 'asc' | 'desc') => {
        const sortedBookings = [...filteredBookings].sort((a, b) => {
            let aValue: any = a[key as keyof Booking];
            let bValue: any = b[key as keyof Booking];

            // Handle specific cases
            if (key === 'amount') {
                aValue = a.amount || 0;
                bValue = b.amount || 0;
            } else if (key === 'createdAt') {
                aValue = new Date(a.createdAt || '').getTime();
                bValue = new Date(b.createdAt || '').getTime();
            }

            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredBookings(sortedBookings);
    };

    // Bulk Actions Component
    const renderBulkActions = (selectedRecords: Booking[]) => (
        <div className="flex items-center gap-2">
            <button
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete Selected"
            >
                <IconTrash className="w-3 h-3 mr-1" />
                Delete ({selectedRecords.length})
            </button>
            
            {/* <button
                onClick={handleBulkVerify}
                disabled={bulkActionLoading}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Verify Selected"
            >
                <IconShieldCheck className="w-3 h-3 mr-1" />
                Verify ({selectedRecords.length})
            </button>
            
            <button
                onClick={handleBulkDeactivate}
                disabled={bulkActionLoading}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-full hover:bg-orange-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Deactivate Selected"
            >
                <IconShieldOff className="w-3 h-3 mr-1" />
                Deactivate ({selectedRecords.length})
            </button>
            
            <button
                onClick={handleBulkUnverify}
                disabled={bulkActionLoading}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Unverify Selected"
            >
                <IconShieldX className="w-3 h-3 mr-1" />
                Unverify ({selectedRecords.length})
            </button> */}
        </div>
    );

    // Define columns for DraggableDataTable
    const columns = [
        {
            accessor: 'id',
            title: 'Booking ID',
            render: (booking: Booking) => (
                <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{booking.id}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <IconCalendar className="w-3 h-3" />
                        {formatDate(booking.createdAt)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <IconPackage className="w-3 h-3" />
                        <span className="truncate max-w-32">{booking.items.length > 0 ? booking.items[0].name : 'N/A'}</span>
                    </div>
                </div>
            ),
            
        },
        {
            accessor: 'booking.created_at',
            title: 'Created At',
            render: (booking: Booking) => (
                <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{EnterpriseDateTime({date: booking.created_at, showTime: true, showRelative: true})}</div>
                </div>
            ),
        },
        {
            accessor: 'booking.tracking_number',
            title: 'Tracking Number',
            render: (booking: Booking) => (
                <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{booking.tracking_number}</div>
                </div>
            ),
            
        },
        {
            accessor: 'booking.service_type',
            title: 'Service Type',
            render: (booking: Booking) => (
                <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{booking.service_type}</div>
                </div>
            ),
            
        },
        {
            accessor: 'customerName',
            title: 'Customer',
            render: (booking: Booking) => (
                <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <IconUser className="w-4 h-4 text-gray-400" />
                        {booking.customerName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <IconMapPin className="w-3 h-3 text-emerald-500" />
                        <span className="truncate max-w-40">{booking.pickup_location}</span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <IconMapPin className="w-3 h-3 text-red-500" />
                        <span className="truncate max-w-40">{booking.deliveryLocation}</span>
                    </div>
                </div>
            ),
        },
        {
            accessor: 'provider.name',
            title: 'Provider',
            render: (booking: Booking) => (
                <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        <IconTruck className="w-4 h-4 text-gray-400" />
                        {booking?.provider?.company_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{booking.providerId}</div>
                </div>
            ),
        },
        {
            accessor: 'status',
            title: 'Status',
            render: (booking: Booking) => {
                const safeStatus = booking?.status || 'unknown';
                return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusBadgeClass(safeStatus)}`}>
                        {getStatusIcon(safeStatus)}
                        {safeStatus.replace('_', ' ')}
                    </span>
                );
            },
        },
        {
            accessor: 'payment_status',
            title: 'Payment',
            render: (booking: Booking) => (
                <div className="space-y-2">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                        <IconCurrencyDollar className="w-4 h-4 text-gray-400" />£{booking.amount}
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPaymentStatusBadgeClass(booking.payment_status)}`}>
                        {booking.payment_status}
                    </span>
                </div>
            ),
        },
        {
            accessor: 'schedule',
            title: 'Schedule',
            render: (booking: Booking) => (
                <div className="space-y-1">
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Pickup:</span> {formatDate(booking.pickupDate)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Delivery:</span> {formatDate(booking.deliveryDate)}
                    </div>
                </div>
            ),
        },
        // {
        //     accessor: 'dimensions',
        //     title: 'Dimensions',
        //     render: (booking: Booking) => (
        //         <div className="space-y-1">
        //             <div className="text-xs text-gray-600 dark:text-gray-300">
        //                 <span className="font-medium">Total:</span> {formatDimensions(booking.dimensions)}
        //             </div>
        //             {booking.items && booking.items.length > 0 && (
        //                 <div className="text-xs text-gray-500 dark:text-gray-400">
        //                     <span className="font-medium">Items:</span> {booking.items.length} item(s)
        //                 </div>
        //             )}
        //         </div>
        //     ),
        // },
        {
            accessor: 'actions',
            title: 'Actions',
            textAlign: 'right' as const,
            render: (booking: Booking) => (
                <div className="flex items-center justify-end gap-2 text-right">
                    <Link
                        to={`/admin/bookings/${booking.id}`}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors duration-200"
                    >
                        <IconEye className="w-3 h-3 mr-1" />
                        View
                    </Link>
                    <button
                        onClick={() => handleDeleteBooking(booking.id)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors duration-200"
                        title="Delete Booking"
                    >
                        <IconTrash className="w-3 h-3 mr-1" />
                        Delete
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Booking Management</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and track all booking transactions</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportBookings}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                        <IconFileExport className="w-4 h-4" />
                        Export Data
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500 rounded-xl">
                            <IconPackage className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Bookings</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{bookings.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500 rounded-xl">
                            <IconCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Completed</p>
                            <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{bookings.filter((b) => b.status === 'completed').length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-6 border border-amber-100 dark:border-amber-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500 rounded-xl">
                            <IconClock className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Pending</p>
                            <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">{bookings.filter((b) => b.status === 'pending').length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-6 border border-purple-100 dark:border-purple-800">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500 rounded-xl">
                            <IconCurrencyDollar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Revenue</p>
                            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">£{bookings.reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <IconFilter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filters & Search</h2>
                    <button
                        onClick={clearFilters}
                        className="ml-auto px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                        <IconFilterOff className="w-4 h-4" />
                        Clear All
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <IconSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search bookings by ID, customer, provider, or location..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white transition-colors"
                        />
                    </div>

                    {/* Filter Controls */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                            <select
                                value={statusFilter}
                                onChange={handleStatusFilterChange}
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="all">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Status</label>
                            <select
                                value={paymentStatusFilter}
                                onChange={handlePaymentStatusFilterChange}
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                            >
                                <option value="all">All Payment Statuses</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="refunded">Refunded</option>
                                <option value="partial">Partial</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From Date</label>
                            <input
                                type="date"
                                name="startDate"
                                value={dateRangeFilter.startDate}
                                onChange={handleDateRangeChange}
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To Date</label>
                            <input
                                type="date"
                                name="endDate"
                                value={dateRangeFilter.endDate}
                                onChange={handleDateRangeChange}
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4">
                    <DraggableDataTable
                        data={filteredBookings}
                        columns={columns}
                        title="Bookings"
                        exportFileName="bookings"
                        quickCheckFields={['id', 'customerName', 'providerName', 'status', 'payment_status', 'tracking_number']}
                        loading={bookingsLoading}
                        allowSelection={true}
                        bulkActions={renderBulkActions}
                        selectedRecords={selectedRecords}
                        setSelectedRecords={setSelectedRecords}
                    />
                </div>
            </div>
        </div>
    );
};

export default BookingManagement;
