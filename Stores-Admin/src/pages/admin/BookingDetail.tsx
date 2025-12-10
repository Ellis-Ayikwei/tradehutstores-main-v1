import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    IconArrowLeft,
    IconEdit,
    IconTrash,
    IconCheck,
    IconX,
    IconCalendar,
    IconPackage,
    IconMapPin,
    IconCurrencyDollar,
    IconUser,
    IconTruck,
    IconPhone,
    IconMail,
    IconClock,
    IconAlertCircle,
    IconDeviceFloppy,
    IconRefresh,
    IconNotes,
    IconCreditCard,
} from '@tabler/icons-react';

interface Booking {
    id: string;
    customerId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    providerId: string;
    providerName: string;
    providerEmail: string;
    providerPhone: string;
    pickup_location: string;
    deliveryLocation: string;
    pickupDate: string;
    deliveryDate: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    amount: number;
    paymentStatus: 'paid' | 'pending' | 'refunded' | 'partial';
    items: string;
    createdAt: string;
    notes: string;
}

const BookingDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedBooking, setEditedBooking] = useState<Booking | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchBookingDetail();
    }, [id]);

    const fetchBookingDetail = async () => {
        setLoading(true);
        try {
            // Mock data - replace with actual API call
            setTimeout(() => {
                const mockBooking: Booking = {
                    id: id || 'BK-10045',
                    customerId: 'U-1001',
                    customerName: 'John Smith',
                    customerEmail: 'john.smith@example.com',
                    customerPhone: '+44 7123 456789',
                    providerId: 'P-101',
                    providerName: 'Express Movers',
                    providerEmail: 'contact@expressmovers.com',
                    providerPhone: '+44 20 1234 5678',
                    pickup_location: '123 Main St, New York, NY 10001',
                    deliveryLocation: '456 Park Ave, New York, NY 10022',
                    pickupDate: '2023-05-20T09:00:00',
                    deliveryDate: '2023-05-20T14:00:00',
                    status: 'completed',
                    amount: 120,
                    paymentStatus: 'paid',
                    items: 'Furniture, Boxes (5), Fragile items',
                    createdAt: '2023-05-15T10:30:00',
                    notes: 'Customer requested extra padding for furniture. Please handle with care.',
                };
                setBooking(mockBooking);
                setEditedBooking(mockBooking);
                setLoading(false);
            }, 1000);
        } catch (error) {
            console.error('Error fetching booking:', error);
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedBooking(booking);
    };

    const handleSave = async () => {
        if (!editedBooking) return;

        setSaving(true);
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));
            setBooking(editedBooking);
            setIsEditing(false);
            setSaving(false);
        } catch (error) {
            console.error('Error saving booking:', error);
            setSaving(false);
        }
    };

    const handleInputChange = (field: keyof Booking, value: string) => {
        if (editedBooking) {
            setEditedBooking({
                ...editedBooking,
                [field]: value,
            });
        }
    };

    const handleStatusChange = (newStatus: Booking['status']) => {
        if (editedBooking) {
            setEditedBooking({
                ...editedBooking,
                status: newStatus,
            });
        }
    };

    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this booking? This action cannot be undone.')) {
            // Simulate delete API call
            navigate('/admin/bookings');
        }
    };

    const getStatusBadgeClass = (status: string): string => {
        switch (status) {
            case 'pending':
                return 'bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 border border-amber-200';
            case 'confirmed':
                return 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-200';
            case 'in_progress':
                return 'bg-gradient-to-r from-purple-50 to-violet-50 text-purple-700 border border-purple-200';
            case 'completed':
                return 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200';
            case 'cancelled':
                return 'bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border border-red-200';
            default:
                return 'bg-gradient-to-r from-gray-50 to-slate-50 text-gray-700 border border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <IconClock className="w-4 h-4" />;
            case 'confirmed':
                return <IconCheck className="w-4 h-4" />;
            case 'in_progress':
                return <IconTruck className="w-4 h-4" />;
            case 'completed':
                return <IconCheck className="w-4 h-4" />;
            case 'cancelled':
                return <IconX className="w-4 h-4" />;
            default:
                return <IconAlertCircle className="w-4 h-4" />;
        }
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    };

    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading booking details...</p>
                </div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                    <IconAlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Booking Not Found</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">The booking you're looking for doesn't exist.</p>
                    <Link to="/admin/bookings" className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                        Back to Bookings
                    </Link>
                </div>
            </div>
        );
    }

    const currentBooking = isEditing ? editedBooking! : booking;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/admin/bookings')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <IconArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Booking {currentBooking.id}</h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage booking details</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleCancelEdit}
                                className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <IconDeviceFloppy className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={handleEdit} className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors flex items-center gap-2">
                                <IconEdit className="w-4 h-4" />
                                Edit
                            </button>
                            <button onClick={handleDelete} className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2">
                                <IconTrash className="w-4 h-4" />
                                Delete
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Status and Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Booking Status</h2>
                    {isEditing ? (
                        <select
                            value={currentBooking.status}
                            onChange={(e) => handleStatusChange(e.target.value as Booking['status'])}
                            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    ) : (
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusBadgeClass(currentBooking.status)}`}>
                            {getStatusIcon(currentBooking.status)}
                            {currentBooking.status.replace('_', ' ')}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                            <IconCurrencyDollar className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">£{currentBooking.amount}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <IconCreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Payment Status</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{currentBooking.paymentStatus}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                            <IconCalendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Created</p>
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatDate(currentBooking.createdAt)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Information */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <IconUser className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Information</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={currentBooking.customerName}
                                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                />
                            ) : (
                                <p className="text-gray-900 dark:text-white">{currentBooking.customerName}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <div className="flex items-center gap-2">
                                <IconMail className="w-4 h-4 text-gray-400" />
                                {isEditing ? (
                                    <input
                                        type="email"
                                        value={currentBooking.customerEmail}
                                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                                        className="flex-1 p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                    />
                                ) : (
                                    <p className="text-gray-900 dark:text-white">{currentBooking.customerEmail}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                            <div className="flex items-center gap-2">
                                <IconPhone className="w-4 h-4 text-gray-400" />
                                {isEditing ? (
                                    <input
                                        type="tel"
                                        value={currentBooking.customerPhone}
                                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                                        className="flex-1 p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                    />
                                ) : (
                                    <p className="text-gray-900 dark:text-white">{currentBooking.customerPhone}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Provider Information */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                            <IconTruck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Provider Information</h3>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
                            <p className="text-gray-900 dark:text-white">{currentBooking.providerName}</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <div className="flex items-center gap-2">
                                <IconMail className="w-4 h-4 text-gray-400" />
                                <p className="text-gray-900 dark:text-white">{currentBooking.providerEmail}</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                            <div className="flex items-center gap-2">
                                <IconPhone className="w-4 h-4 text-gray-400" />
                                <p className="text-gray-900 dark:text-white">{currentBooking.providerPhone}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedule and Location */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <IconMapPin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule & Locations</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pickup Location</label>
                            <div className="flex items-start gap-2">
                                <IconMapPin className="w-4 h-4 text-emerald-500 mt-1" />
                                {isEditing ? (
                                    <textarea
                                        value={currentBooking.pickup_location}
                                        onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                                        rows={2}
                                        className="flex-1 p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                    />
                                ) : (
                                    <p className="text-gray-900 dark:text-white">{currentBooking.pickup_location}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pickup Date & Time</label>
                            <div className="flex items-center gap-2">
                                <IconCalendar className="w-4 h-4 text-gray-400" />
                                {isEditing ? (
                                    <input
                                        type="datetime-local"
                                        value={currentBooking.pickupDate.slice(0, -1)}
                                        onChange={(e) => handleInputChange('pickupDate', e.target.value + 'Z')}
                                        className="flex-1 p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                    />
                                ) : (
                                    <p className="text-gray-900 dark:text-white">{formatDate(currentBooking.pickupDate)}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delivery Location</label>
                            <div className="flex items-start gap-2">
                                <IconMapPin className="w-4 h-4 text-red-500 mt-1" />
                                {isEditing ? (
                                    <textarea
                                        value={currentBooking.deliveryLocation}
                                        onChange={(e) => handleInputChange('deliveryLocation', e.target.value)}
                                        rows={2}
                                        className="flex-1 p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                    />
                                ) : (
                                    <p className="text-gray-900 dark:text-white">{currentBooking.deliveryLocation}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Delivery Date & Time</label>
                            <div className="flex items-center gap-2">
                                <IconCalendar className="w-4 h-4 text-gray-400" />
                                {isEditing ? (
                                    <input
                                        type="datetime-local"
                                        value={currentBooking.deliveryDate.slice(0, -1)}
                                        onChange={(e) => handleInputChange('deliveryDate', e.target.value + 'Z')}
                                        className="flex-1 p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                    />
                                ) : (
                                    <p className="text-gray-900 dark:text-white">{formatDate(currentBooking.deliveryDate)}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items and Notes */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                        <IconPackage className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Items & Notes</h3>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items to Move</label>
                        {isEditing ? (
                            <textarea
                                value={currentBooking.items}
                                onChange={(e) => handleInputChange('items', e.target.value)}
                                rows={3}
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                placeholder="List the items to be moved..."
                            />
                        ) : (
                            <p className="text-gray-900 dark:text-white">{currentBooking.items}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Notes</label>
                        {isEditing ? (
                            <textarea
                                value={currentBooking.notes}
                                onChange={(e) => handleInputChange('notes', e.target.value)}
                                rows={4}
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Add any special instructions or notes..."
                            />
                        ) : (
                            <div className="flex items-start gap-2">
                                <IconNotes className="w-4 h-4 text-gray-400 mt-1" />
                                <p className="text-gray-900 dark:text-white">{currentBooking.notes || 'No notes provided'}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingDetail;
