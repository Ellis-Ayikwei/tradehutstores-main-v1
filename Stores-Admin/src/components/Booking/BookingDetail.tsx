import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faUser, faCar, faMoneyBillWave, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import axiosInstance from '../../services/axiosInstance';

interface Booking {
    id: string;
    requestId: string;
    providerId: string;
    vehicleId: string;
    status: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    createdAt: string;
    providerName: string;
    vehicleDetails: {
        make: string;
        model: string;
        year: number;
        licensePlate: string;
    };
    requestDetails: {
        pickupLocation: string;
        dropoffLocation: string;
        specialInstructions: string;
    };
}

const BookingDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState<boolean>(false);

    useEffect(() => {
        const fetchBooking = async () => {
            try {
                setLoading(true);
                const response = await axiosInstance.get(`/bookings/${id}/`);
                setBooking(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching booking:', err);
                setError('Failed to load booking details');
            } finally {
                setLoading(false);
            }
        };

        fetchBooking();
    }, [id]);

    const handleStatusUpdate = async (newStatus: string) => {
        try {
            setUpdating(true);
            await axiosInstance.patch(`/bookings/${id}/`, {
                status: newStatus,
            });
            setBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
        } catch (err) {
            console.error('Error updating booking status:', err);
            setError('Failed to update booking status');
        } finally {
            setUpdating(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
            case 'completed':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                <p>{error || 'Booking not found'}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Booking Details</h1>
                <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(booking.status)}`}>{booking.status}</span>
                    <button onClick={() => navigate('/bookings')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                        Back to Bookings
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Booking Information</h2>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faCalendarAlt} className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Booking Period</div>
                                <div className="text-gray-900 dark:text-white">
                                    {new Date(booking.startDate).toLocaleDateString()} to {new Date(booking.endDate).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faMoneyBillWave} className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Total Price</div>
                                <div className="text-gray-900 dark:text-white">${booking.totalPrice.toFixed(2)}</div>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Booking ID</div>
                                <div className="text-gray-900 dark:text-white">{booking.id}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Vehicle Information</h2>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faCar} className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Vehicle</div>
                                <div className="text-gray-900 dark:text-white">
                                    {booking.vehicleDetails.make} {booking.vehicleDetails.model} ({booking.vehicleDetails.year})
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">License Plate: {booking.vehicleDetails.licensePlate}</div>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <FontAwesomeIcon icon={faUser} className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">Provider</div>
                                <div className="text-gray-900 dark:text-white">{booking.providerName}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Request Details</h2>
                <div className="space-y-4">
                    <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Pickup Location</div>
                        <div className="text-gray-900 dark:text-white">{booking.requestDetails.pickupLocation}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Dropoff Location</div>
                        <div className="text-gray-900 dark:text-white">{booking.requestDetails.dropoffLocation}</div>
                    </div>
                    {booking.requestDetails.specialInstructions && (
                        <div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Special Instructions</div>
                            <div className="text-gray-900 dark:text-white">{booking.requestDetails.specialInstructions}</div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Update Status</h2>
                <div className="flex gap-4">
                    <button
                        onClick={() => handleStatusUpdate('confirmed')}
                        disabled={updating || booking.status === 'confirmed'}
                        className={`px-4 py-2 rounded-lg ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                    >
                        Confirm
                    </button>
                    <button
                        onClick={() => handleStatusUpdate('completed')}
                        disabled={updating || booking.status === 'completed'}
                        className={`px-4 py-2 rounded-lg ${
                            booking.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        Mark as Completed
                    </button>
                    <button
                        onClick={() => handleStatusUpdate('cancelled')}
                        disabled={updating || booking.status === 'cancelled'}
                        className={`px-4 py-2 rounded-lg ${booking.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' : 'bg-red-600 text-white hover:bg-red-700'}`}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookingDetail;
