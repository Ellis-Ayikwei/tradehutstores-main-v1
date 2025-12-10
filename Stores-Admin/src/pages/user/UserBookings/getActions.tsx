import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faCalendarAlt,
    faLocationDot,
    faTruck,
    faClock,
    faBox,
    faMoneyBillWave,
    faShieldAlt,
    faClipboardCheck,
    faClipboardList,
    faEllipsisV,
    faStar,
    faSearch,
    faFilter,
    faChevronDown,
    faChevronUp,
    faMapMarkerAlt,
    faBell,
    faFileInvoiceDollar,
    faCheckCircle,
    faExclamationCircle,
    faInfoCircle,
    faTruckLoading,
    faHistory,
    faArrowRight,
    faEye,
    faPeopleCarry,
    faHandshake,
    faUserCheck,
    faLightbulb,
    faCommentDots,
    faReceipt,
    faExternalLinkAlt,
    faEdit,
} from '@fortawesome/free-solid-svg-icons';
import { Booking } from '../../../types/booking';
import { NavigateFunction } from 'react-router-dom';

// Get status-specific action button
export const getPrimaryActionButton = (booking: Booking, navigate: NavigateFunction) => {
    switch (booking.status) {
        case 'bidding':
            return (
                <button
                    onClick={() => navigate(`/bookings/${booking.id}/bids`)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                    <FontAwesomeIcon icon={faClock} className="mr-2" />
                    {booking.total_bids ? `View ${booking.total_bids} Bids` : 'View Bids'}
                </button>
            );
        case 'pending':
            if (booking.allow_instant_booking) {
                return (
                    <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center">
                        <FontAwesomeIcon icon={faHandshake} className="mr-2" />
                        Book Instantly
                    </button>
                );
            }
            return (
                <button
                    onClick={() => navigate(`/bookings/${booking.id}`)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                    <FontAwesomeIcon icon={faEye} className="mr-2" />
                    View Booking
                </button>
            );
        case 'confirmed':
            return (
                <button
                    onClick={() => navigate(`/bookings/${booking.id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                    <FontAwesomeIcon icon={faEye} className="mr-2" />
                    View Details
                </button>
            );
        case 'in_transit':
            return (
                <button
                    onClick={() => navigate(`/bookings/${booking.id}/track`)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                    <FontAwesomeIcon icon={faTruckLoading} className="mr-2" />
                    Track Move
                </button>
            );
        case 'completed':
            return (
                <button
                    onClick={() => navigate(`/bookings/${booking.id}/review`)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                    <FontAwesomeIcon icon={faStar} className="mr-2" />
                    Leave Review
                </button>
            );
        default:
            return (
                <button
                    onClick={() => navigate(`/bookings/${booking.id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                    <FontAwesomeIcon icon={faEye} className="mr-2" />
                    View Details
                </button>
            );
    }
};

// Get secondary action button based on booking status
export const getSecondaryActionButton = (booking: Booking, navigate: NavigateFunction) => {
    switch (booking.status) {
        case 'bidding':
            return (
                <button
                    onClick={() => navigate(`/bookings/${booking.id}/edit`)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                    <FontAwesomeIcon icon={faEdit} className="mr-2" />
                    Edit Request
                </button>
            );
        case 'pending':
            if (!booking.is_paid) {
                return (
                    <button
                        onClick={() => navigate(`/bookings/${booking.id}/payment`)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                    >
                        <FontAwesomeIcon icon={faMoneyBillWave} className="mr-2" />
                        Complete Payment
                    </button>
                );
            }
            return (
                <button
                    onClick={() => navigate(`/bookings/${booking.id}/edit`)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                    <FontAwesomeIcon icon={faEdit} className="mr-2" />
                    Modify Booking
                </button>
            );
        case 'confirmed':
            return (
                <button
                    onClick={() => navigate(`/bookings/${booking.id}/chat`)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                    <FontAwesomeIcon icon={faCommentDots} className="mr-2" />
                    Message Provider
                </button>
            );
        case 'in_transit':
            return (
                <button
                    onClick={() => navigate(`/bookings/${booking.id}/chat`)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                    <FontAwesomeIcon icon={faCommentDots} className="mr-2" />
                    Contact Driver
                </button>
            );
        case 'completed':
            return (
                <button
                    onClick={() => navigate(`/bookings/${booking.id}/receipt`)}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                >
                    <FontAwesomeIcon icon={faReceipt} className="mr-2" />
                    View Receipt
                </button>
            );
        default:
            return null;
    }
};

// Updated status badge classes with dark mode support
export const getStatusBadgeClass = (status: string) => {
    switch (status) {
        case 'confirmed':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'in_transit':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        case 'completed':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'cancelled':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        case 'bidding':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case 'pending':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
};

// Get status tag with icon
export const getStatusTag = (booking: Booking) => {
    let icon;
    let message = '';

    switch (booking.status) {
        case 'bidding':
            icon = faClock;
            message = booking.total_bids ? `${booking.total_bids} Bids Available` : 'Awaiting Bids';
            break;
        case 'pending':
            icon = faInfoCircle;
            message = booking.is_paid ? 'Pending Confirmation' : `Payment Due: ${booking.payment_due}`;
            break;
        case 'confirmed':
            icon = faCheckCircle;
            message = 'Provider Confirmed';
            break;
        case 'in_transit':
            icon = faTruckLoading;
            message = 'Move in Progress';
            break;
        case 'completed':
            icon = faClipboardCheck;
            message = 'Service Completed';
            break;
        case 'canceled':
            icon = faExclamationCircle;
            message = 'Booking Canceled';
            break;
        default:
            icon = faInfoCircle;
    }

    return (
        <div className="flex items-center text-xs">
            <FontAwesomeIcon icon={icon} className="mr-1" />
            <span>{message}</span>
        </div>
    );
};
