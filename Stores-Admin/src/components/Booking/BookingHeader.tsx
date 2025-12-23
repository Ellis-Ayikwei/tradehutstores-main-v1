import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

interface BookingHeaderProps {
    tracking_number: string;
    created_at: string;
    request_type: string;
    status: string;
    userRole: 'customer' | 'provider';
    onBack: () => void;
}

const BookingHeader: React.FC<BookingHeaderProps> = ({ tracking_number, created_at, request_type, status, userRole, onBack }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft':
                return 'bg-gray-100 text-gray-800';
            case 'bidding':
                return 'bg-yellow-100 text-yellow-800';
            case 'confirmed':
                return 'bg-blue-100 text-blue-800';
            case 'in_progress':
                return 'bg-purple-100 text-purple-800';
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="mb-6">
            <div className="flex items-center">
                <button onClick={onBack} className="text-blue-600 hover:text-blue-800 mr-4">
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
                    {userRole === 'customer' ? 'Back to My Bookings' : 'Back to Job Board'}
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden mt-4">
                <div className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Booking #{tracking_number}</h1>
                            <p className="text-gray-500 mt-1">Created on {new Date(created_at).toLocaleDateString()}</p>
                        </div>
                        <div className={`mt-2 sm:mt-0 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                            {request_type?.charAt(0).toUpperCase() + request_type?.slice(1).replace('_', ' ')}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingHeader;
