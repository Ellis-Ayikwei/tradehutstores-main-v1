import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faClock, faMapMarkerAlt, faUser, faTruck } from '@fortawesome/free-solid-svg-icons';

interface Booking {
    id: string;
    serviceType: string;
    date: string;
    time: string;
    pickupLocation: string;
    dropoffLocation: string;
    status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
    provider?: {
        id: string;
        name: string;
        rating: number;
    };
    price: number;
    vehicle?: {
        type: string;
        capacity: string;
    };
}

const BookingList: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([
        {
            id: '1',
            serviceType: 'Moving Service',
            date: '2024-03-15',
            time: '09:00 AM',
            pickupLocation: '123 Main St, London',
            dropoffLocation: '456 Park Ave, Manchester',
            status: 'confirmed',
            provider: {
                id: 'p1',
                name: 'Express Movers Ltd',
                rating: 4.8,
            },
            price: 250.0,
            vehicle: {
                type: 'Large Van',
                capacity: '3 Bedrooms',
            },
        },
        {
            id: '2',
            serviceType: 'Delivery Service',
            date: '2024-03-16',
            time: '02:30 PM',
            pickupLocation: '789 Market St, Birmingham',
            dropoffLocation: '321 High St, Leeds',
            status: 'pending',
            price: 120.0,
            vehicle: {
                type: 'Medium Van',
                capacity: '2 Bedrooms',
            },
        },
    ]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'confirmed':
                return 'bg-blue-100 text-blue-800';
            case 'in-progress':
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
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Bookings</h2>
                <Link to="/bookings/new" className="bg-[#dc711a] text-white px-4 py-2 rounded-lg hover:bg-[#dc711a]/90 transition-colors">
                    New Booking
                </Link>
            </div>

            <div className="grid gap-4">
                {bookings.map((booking) => (
                    <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{booking.serviceType}</h3>
                                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>{booking.status}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">£{booking.price.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                    <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 mr-2" />
                                    <span>{booking.date}</span>
                                </div>
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                    <FontAwesomeIcon icon={faClock} className="w-4 h-4 mr-2" />
                                    <span>{booking.time}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 mr-2" />
                                    <span>{booking.pickupLocation}</span>
                                </div>
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                    <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 mr-2" />
                                    <span>{booking.dropoffLocation}</span>
                                </div>
                            </div>
                        </div>

                        {booking.provider && (
                            <div className="flex items-center mb-4">
                                <FontAwesomeIcon icon={faUser} className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">
                                    Provider: {booking.provider.name} ({booking.provider.rating}★)
                                </span>
                            </div>
                        )}

                        {booking.vehicle && (
                            <div className="flex items-center mb-4">
                                <FontAwesomeIcon icon={faTruck} className="w-4 h-4 mr-2 text-gray-600 dark:text-gray-400" />
                                <span className="text-gray-600 dark:text-gray-400">
                                    {booking.vehicle.type} ({booking.vehicle.capacity})
                                </span>
                            </div>
                        )}

                        <div className="flex justify-end space-x-2">
                            <Link to={`/bookings/${booking.id}`} className="text-[#dc711a] hover:text-[#dc711a]/80 font-medium">
                                View Details
                            </Link>
                            {booking.status === 'pending' && (
                                <Link to={`/bidding/${booking.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                                    View Bids
                                </Link>
                            )}
                            {booking.status === 'completed' && (
                                <Link to={`/bookings/${booking.id}/review`} className="text-green-600 hover:text-green-800 font-medium">
                                    Leave Review
                                </Link>
                            )}
                            {booking.status === 'pending' && <button className="text-red-600 hover:text-red-800 font-medium">Cancel Booking</button>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BookingList;
