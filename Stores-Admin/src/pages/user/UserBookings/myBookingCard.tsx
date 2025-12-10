import { Booking } from '../../../types/booking';
import { getPrimaryActionButton, getSecondaryActionButton, getStatusBadgeClass, getStatusTag } from './getActions';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IconCalendar,
    IconMapPin,
    IconTruck,
    IconClock,
    IconBox,
    IconCurrencyDollar,
    IconShield,
    IconClipboardCheck,
    IconClipboardList,
    IconDots,
    IconStar,
    IconSearch,
    IconFilter,
    IconChevronDown,
    IconChevronUp,
    IconBell,
    IconFileInvoice,
    IconCircleCheck,
    IconExclamationCircle,
    IconInfoCircle,
    IconTruckLoading,
    IconHistory,
    IconArrowRight,
    IconEye,
    IconUsers,
    IconUserCheck,
    IconBulb,
    IconMessageDots,
    IconReceipt,
    IconExternalLink,
    IconEdit,
    IconHash,
    IconLocation,
    IconPhone,
    IconUser,
    IconPackage,
    IconRoute,
    IconStarFilled,
    IconHome,
    IconFlag,
    IconMapPinFilled,
} from '@tabler/icons-react';

interface MyBookingCardProps {
    booking: Booking;
    expandedBooking: string | null;
    toggleBookingDetails: (id: string) => void;
}

export const MyBookingCard: React.FC<MyBookingCardProps> = ({ booking, expandedBooking, toggleBookingDetails }) => {
    const navigate = useNavigate();

    // Safe date formatting function
    const formatDate = (dateString: string | undefined, options?: Intl.DateTimeFormatOptions) => {
        if (!dateString) return 'Date not set';
        try {
            return new Date(dateString).toLocaleDateString('en-US', options);
        } catch {
            return 'Invalid date';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl dark:shadow-gray-900/30 overflow-hidden border border-white/20 dark:border-gray-700/50 transition-all duration-300 hover:shadow-2xl dark:hover:shadow-gray-900/50 hover:border-gray-200 dark:hover:border-gray-600 transform hover:-translate-y-1"
        >
            {/* Modern Booking Header */}
            <div
                className="p-6 md:p-8 border-b border-gray-100/50 dark:border-gray-700/50 cursor-pointer 
                             hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-blue-50/30 dark:hover:from-gray-750/50 dark:hover:to-blue-900/20 transition-all duration-300"
                onClick={() => toggleBookingDetails(booking.id)}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-grow">
                        {/* Service Type and Status */}
                        <div className="flex items-center gap-4 mb-4">
                            <h3 className="font-bold text-xl text-gray-800 dark:text-gray-100 tracking-tight">{booking.service_type || 'Moving Service'}</h3>
                            <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusBadgeClass(booking.status)} shadow-sm`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                            {booking.request_type === 'instant' && (
                                <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm px-3 py-1.5 rounded-full font-semibold shadow-lg">⚡ Instant</span>
                            )}
                        </div>

                        {/* Tracking Code and Booking Date */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 px-4 py-2 rounded-xl border border-blue-200/50 dark:border-blue-700/50">
                                <IconHash className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" stroke={2} />
                                <span className="font-mono text-sm font-semibold text-blue-800 dark:text-blue-200">{booking.tracking_number || booking.id}</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Booked on{' '}
                                <span className="font-medium text-gray-700 dark:text-gray-300">
                                    {formatDate(booking.created_at, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </span>
                            </div>
                        </div>

                        {/* Modern Info Cards - All using primary blue color */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 px-4 py-3 rounded-xl border border-blue-200/50 dark:border-blue-700/50 shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                    <IconCalendar className="w-5 h-5 text-white" stroke={2} />
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Date & Time</p>
                                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                        {formatDate(booking.preferred_pickup_date, { month: 'short', day: 'numeric' })} at {booking.preferred_pickup_time || booking.time || 'TBD'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 px-4 py-3 rounded-xl border border-blue-200/50 dark:border-blue-700/50 shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                    <IconTruck className="w-5 h-5 text-white" stroke={2} />
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Load Size</p>
                                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">{booking.service_type || 'Standard'} Load</p>
                                </div>
                            </div>

                            <div className="flex items-center bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 px-4 py-3 rounded-xl border border-blue-200/50 dark:border-blue-700/50 shadow-sm">
                                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                    <IconCurrencyDollar className="w-5 h-5 text-white" stroke={2} />
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Price</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Euro{booking.amount?.toFixed(2)}</p>
                                        {booking.status !== 'completed' && booking.status !== 'bidding' && (
                                            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">Pending</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Status-specific information */}
                        <div className="mt-4">{getStatusTag(booking)}</div>
                    </div>

                    {/* Provider Info and Expand Button */}
                    <div className="flex items-center gap-4">
                        {booking.status !== 'bidding' && booking.status !== 'pending' && booking.provider_name && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-gray-200/50 dark:border-gray-600/50 shadow-lg"
                            >
                                <div>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{booking.provider_name}</p>
                                    <div className="flex items-center text-amber-500">
                                        <IconStarFilled className="w-3 h-3" />
                                        <span className="ml-1 text-xs font-medium text-gray-700 dark:text-gray-300">{booking.provider_rating?.toFixed(1) || 'N/A'}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <IconChevronDown className={`w-5 h-5 text-white transition-transform duration-300 ${expandedBooking === booking.id ? 'rotate-180' : ''}`} stroke={2} />
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Modern Expanded Details */}
            <AnimatePresence>
                {expandedBooking === booking.id && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="bg-gradient-to-br from-gray-50/50 to-blue-50/30 dark:from-gray-800/50 dark:to-blue-900/20 backdrop-blur-sm"
                    >
                        <div className="p-6 md:p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Locations Section */}
                                <div>
                                    <h3 className="text-lg font-bold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                            <IconMapPin className="w-4 h-4 text-white" stroke={2} />
                                        </div>
                                        Journey Route
                                    </h3>
                                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 mb-6">
                                        <div className="space-y-6">
                                            {booking.journey_stops?.map((stop: any, index: number) => (
                                                <motion.div
                                                    key={stop.id || index}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.1 }}
                                                    className="flex items-start"
                                                >
                                                    <div className="mt-1 mr-4">
                                                        <div
                                                            className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-lg ${
                                                                stop.type === 'pickup' ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-orange-500 to-amber-500'
                                                            }`}
                                                        >
                                                            {stop.type === 'pickup' ? <IconHome className="w-5 h-5" stroke={2} /> : <IconFlag className="w-5 h-5" stroke={2} />}
                                                        </div>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">
                                                                {stop.type === 'pickup' ? 'Pickup Location' : 'Dropoff Location'}
                                                            </h4>
                                                            <span
                                                                className={`text-xs px-2 py-1 rounded-full font-medium ${
                                                                    stop.type === 'pickup'
                                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                                                        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                                                }`}
                                                            >
                                                                {stop.type}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-start">
                                                            <IconLocation className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" stroke={2} />
                                                            {stop.location?.address || stop.address || 'Address not provided'}
                                                        </p>
                                                        {stop.location?.contact_name && (
                                                            <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-2 bg-blue-50/50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                                                                <IconUser className="w-3 h-3 text-blue-500 mr-2" stroke={2} />
                                                                Contact: {stop.location.contact_name}
                                                                {stop.location?.contact_phone && (
                                                                    <>
                                                                        <IconPhone className="w-3 h-3 text-blue-500 ml-3 mr-1" stroke={2} />
                                                                        {stop.location.contact_phone}
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                        {stop.notes && (
                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
                                                                <IconInfoCircle className="w-3 h-3 text-blue-500 inline mr-1" stroke={2} />
                                                                {stop.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )) || <p className="text-sm text-gray-500 dark:text-gray-400">No route information available</p>}
                                        </div>
                                    </div>

                                    {/* Service Details */}
                                    <h3 className="text-lg font-bold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                            <IconClipboardList className="w-4 h-4 text-white" stroke={2} />
                                        </div>
                                        Service Details
                                    </h3>
                                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl">
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">Service Provider</p>
                                                <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{booking.provider_name || 'Not assigned yet'}</p>
                                            </div>

                                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl">
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">Insurance</p>
                                                <div className="flex items-center">
                                                    {booking.insurance_required ? (
                                                        <>
                                                            <IconShield className="w-4 h-4 text-blue-600 dark:text-blue-400 mr-2" stroke={2} />
                                                            <span className="text-sm font-bold text-blue-800 dark:text-blue-200">Protected</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">No Coverage</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl">
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">Moving Date</p>
                                                <p className="text-sm font-bold text-blue-800 dark:text-blue-200">
                                                    {formatDate(booking.preferred_pickup_date, {
                                                        weekday: 'short',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                    })}
                                                </p>
                                            </div>

                                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl">
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">Time Slot</p>
                                                <p className="text-sm font-bold text-blue-800 dark:text-blue-200">{booking.preferred_pickup_time || booking.time || 'Flexible'}</p>
                                            </div>
                                        </div>

                                        {booking.status === 'pending' && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="mt-6 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/30"
                                            >
                                                <div className="flex items-center">
                                                    <IconExclamationCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-3" stroke={2} />
                                                    <div>
                                                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Payment Required</p>
                                                        <p className="text-xs text-amber-600 dark:text-amber-400">Please complete payment to confirm this booking.</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {booking.special_instructions && (
                                            <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-2 uppercase tracking-wide">Special Notes</p>
                                                <p className="text-sm text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                                                    {booking.special_instructions}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Tracking and Actions */}
                                <div>
                                    <h3 className="text-lg font-bold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                            <IconBell className="w-4 h-4 text-white" stroke={2} />
                                        </div>
                                        Tracking Updates
                                    </h3>
                                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-white/20 dark:border-gray-700/50 mb-6">
                                        <div className="text-center py-8">
                                            <IconHistory className="w-12 h-12 text-blue-400 mx-auto mb-4" stroke={1.5} />
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Tracking updates will appear here once your booking is confirmed</p>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold mb-6 text-gray-800 dark:text-gray-200 flex items-center">
                                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                                            <IconClipboardCheck className="w-4 h-4 text-white" stroke={2} />
                                        </div>
                                        Actions
                                    </h3>
                                    <div className="flex flex-wrap gap-3">
                                        {getPrimaryActionButton(booking, navigate)}
                                        {getSecondaryActionButton(booking, navigate)}
                                        {booking.status === 'pending' && (
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
                                            >
                                                Cancel Booking
                                            </motion.button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
