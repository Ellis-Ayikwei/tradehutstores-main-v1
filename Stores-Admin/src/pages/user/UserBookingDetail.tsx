import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import BookingHeader from '../../components/Booking/BookingHeader';
import BookingActions from '../../components/Booking/BookingActions';
import JourneyOverview from '../../components/Booking/JourneyOverview';
import ItemsTable from '../../components/Booking/ItemsTable';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import { IRootState } from '../../store';
import { useSelector } from 'react-redux';
import { useServiceRequestForm } from '../../hooks/useServiceRequestForm';

const UserBookingDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const authUser = useAuthUser();
    const user = authUser?.user;
    const [booking, setBooking] = useState(null);
    // const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { fetchRequestById } = useServiceRequestForm();
    useEffect(() => {
        if (!id) return;
        fetchRequestById(id, user?.id);
    }, [id]);

    const { currentRequest, loading } = useSelector((state: IRootState) => state.serviceRequests);

    useEffect(() => {
        if (currentRequest) {
            setBooking(currentRequest);
        }
    }, [id]);

    const handleBack = () => {
        navigate(-1);
    };

    const handleConfirm = async () => {
        // Implement confirm booking logic
    };

    const handleCancel = async () => {
        // Implement cancel booking logic
    };

    const handleEdit = () => {
        // Implement edit booking logic
    };

    const handleDelete = async () => {
        // Implement delete booking logic
    };

    const handleViewInvoice = () => {
        // Implement view invoice logic
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="h-64 bg-gray-200 rounded"></div>
                            <div className="h-64 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                        <p className="text-yellow-700">Booking not found</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Back button */}
                <button onClick={handleBack} className="mb-6 text-blue-600 hover:text-blue-800 flex items-center">
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                    Back
                </button>

                {/* Booking Header */}
                <BookingHeader
                    tracking_number={booking.tracking_number}
                    created_at={booking.created_at}
                    request_type={booking.request_type}
                    status={booking.status}
                    userRole={user?.user_type === 'customer' ? 'customer' : 'provider'}
                    onBack={handleBack}
                />

                {/* Booking Actions */}
                <div className="mt-6">
                    <BookingActions
                        status={booking.status}
                        userRole={user?.user_type === 'customer' ? 'customer' : 'provider'}
                        onConfirm={handleConfirm}
                        onCancel={handleCancel}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onViewInvoice={handleViewInvoice}
                    />
                </div>

                {/* Journey Overview */}
                <div className="mt-6">
                    <JourneyOverview
                        service_type={booking.service_type}
                        vehicle_type={booking.vehicle_type}
                        persons_required={booking.persons_required}
                        distance={booking.distance}
                        estimated_travel_time={booking.estimated_travel_time}
                        stops={booking.journey_stops}
                        items={booking.items}
                        special_instructions={booking.special_instructions}
                    />
                </div>

                {/* Items Table */}
                {booking.items && booking.items.length > 0 && (
                    <div className="mt-6">
                        <ItemsTable items={booking.items} totalVolume={booking.total_volume} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserBookingDetail;
