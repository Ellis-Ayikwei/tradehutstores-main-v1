import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useSWR from 'swr';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import fetcher from '../../services/fetcher';
import { MyBookingCard } from './UserBookings/myBookingCard';
import { Booking, Provider, Bid } from '../../types/booking';
import {
    IconTruck,
    IconSearch,
    IconRefresh,
    IconFilter,
    IconCalendar,
    IconChartLine,
    IconMapPin,
    IconClock,
    IconUser,
    IconPlus,
    IconArrowLeft,
    IconArrowRight,
    IconTrendingUp,
    IconPackage,
    IconRoute,
    IconCircleCheck,
    IconX,
} from '@tabler/icons-react';
import IconLoader from '../../components/Icon/IconLoader';

interface AuthUser {
    user: {
        id: string;
        email?: string;
        first_name?: string;
        last_name?: string;
        user_type?: string;
    };
}

interface BookingsResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: Booking[];
}

// Status configuration with modern styling
const statusConfig = {
    draft: {
        color: 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-800 border-slate-300',
        label: 'Draft',
        description: 'Being prepared',
        icon: '📝',
    },
    pending: {
        color: 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-800 border-amber-300',
        label: 'Pending',
        description: 'Awaiting confirmation',
        icon: '⏳',
    },
    bidding: {
        color: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300',
        label: 'Bidding',
        description: 'Providers are bidding',
        icon: '🎯',
    },
    accepted: {
        color: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300',
        label: 'Accepted',
        description: 'Bid accepted',
        icon: '✅',
    },
    assigned: {
        color: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300',
        label: 'Assigned',
        description: 'Driver assigned',
        icon: '👤',
    },
    in_transit: {
        color: 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800 border-orange-300',
        label: 'In Transit',
        description: 'On the way',
        icon: '🚛',
    },
    completed: {
        color: 'bg-gradient-to-r from-emerald-100 to-emerald-200 text-emerald-800 border-emerald-300',
        label: 'Completed',
        description: 'Successfully delivered',
        icon: '✓',
    },
    cancelled: {
        color: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300',
        label: 'Cancelled',
        description: 'Booking cancelled',
        icon: '✗',
    },
};

const MyBookings: React.FC = () => {
    const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeTab, setActiveTab] = useState<string>('upcoming');
    const navigate = useNavigate();
    const authUser = useAuthUser();
    const user = authUser as AuthUser | null;

    // API call to fetch bookings
    const apiUrl = user?.user.id ? `/requests/?user_id=${user.user.id}` : null;

    // Debug logging
    console.log('=== MyBookings Debug Info ===');
    console.log('User object:', user);
    console.log('User ID:', user?.user.id);
    console.log('API URL:', apiUrl);

    const {
        data: apiResponse,
        isLoading,
        error,
        mutate,
    } = useSWR<Booking[]>(apiUrl, fetcher, {
        refreshInterval: 30000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        onError: (err) => {
            console.error('SWR Error:', err);
            console.error('Error details:', err.response?.data);
            console.error('Error status:', err.response?.status);
        },
        onSuccess: (data) => {
            console.log('SWR Success - API Response received:', data);
        },
    });

    // Transform API response
    console.log('Final API Response:', apiResponse);
    console.log('Is Loading:', isLoading);
    console.log('Error:', error);

    const transformBookingData = (rawBooking: any): Booking => {
        const stops = rawBooking.journey_stops || rawBooking.stops || [];
        const pickupStop = stops.find((stop: any) => stop.type === 'pickup');
        const dropoffStop = stops.find((stop: any) => stop.type === 'dropoff');

        const pickupLocation = pickupStop?.location ? `${pickupStop.location.address_line1 || pickupStop.location.address || ''}, ${pickupStop.location.city || ''}` : 'No pickup location';

        const dropoffLocation = dropoffStop?.location ? `${dropoffStop.location.address_line1 || dropoffStop.location.address || ''}, ${dropoffStop.location.city || ''}` : 'No dropoff location';

        const providerName = rawBooking.driver?.user ? `${rawBooking.driver.user.first_name} ${rawBooking.driver.user.last_name}` : 'No provider assigned';

        // Ensure amount is a number
        const finalPrice = rawBooking.final_price || rawBooking.base_price || 0;
        const amount = typeof finalPrice === 'string' ? parseFloat(finalPrice) || 0 : finalPrice || 0;

        // Ensure provider_rating is a number
        const providerRating = rawBooking.driver?.rating || 0;
        const rating = typeof providerRating === 'string' ? parseFloat(providerRating) || 0 : providerRating || 0;

        return {
            ...rawBooking,
            pickup_location: pickupLocation,
            dropoff_location: dropoffLocation,
            date: rawBooking.preferred_pickup_date || new Date().toISOString().split('T')[0],
            time: rawBooking.preferred_pickup_time || 'flexible',
            amount: amount,
            provider_name: providerName,
            provider_rating: rating,
            has_insurance: rawBooking.insurance_required,
            notes: rawBooking.special_instructions || '',
            journey_stops: stops,
            stops: stops,
        };
    };

    const bookings: Booking[] = apiResponse ? apiResponse.map(transformBookingData) : [];

    // Filter bookings
    const filteredBookings = bookings.filter((booking) => {
        const matchesStatus = filterStatus === 'all' || booking.status === filterStatus;

        const searchableText = [booking.id, booking.tracking_number, booking.service_type, booking.pickup_location, booking.dropoff_location, booking.provider_name, booking.contact_name]
            .join(' ')
            .toLowerCase();

        const matchesSearch = searchQuery === '' || searchableText.includes(searchQuery.toLowerCase());

        let matchesTab = true;
        if (activeTab === 'upcoming') {
            const bookingDate = new Date(booking.preferred_pickup_date || booking.date || '');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            matchesTab = bookingDate >= today && !['completed', 'cancelled'].includes(booking.status);
        } else if (activeTab === 'instant') {
            matchesTab = booking.request_type === 'instant';
        } else if (activeTab === 'journey') {
            matchesTab = booking.request_type === 'journey' || !booking.request_type || booking.request_type !== 'instant';
        } else if (activeTab === 'active') {
            matchesTab = ['pending', 'accepted', 'assigned', 'in_transit', 'bidding'].includes(booking.status);
        } else if (activeTab === 'completed') {
            matchesTab = booking.status === 'completed';
        }
        // 'all' tab shows everything, so no additional filter needed

        return matchesStatus && matchesSearch && matchesTab;
    });

    const toggleBookingDetails = (bookingId: string) => {
        setExpandedBooking(expandedBooking === bookingId ? null : bookingId);
    };

    // Static counter component (no animation)
    const StaticCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
        return (
            <span className="text-3xl font-bold text-white">
                {value}
                {suffix}
            </span>
        );
    };

    // Loading state
    if (isLoading) {
        return (
            <div className="w-full px-4 md:px-8 py-8 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 min-h-screen">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl border border-white/20 dark:border-gray-700/50 rounded-2xl py-12 mb-8">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-slate-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent flex items-center justify-center gap-4">
                            <IconTruck className="w-10 h-10 text-blue-600" stroke={1.5} />
                            My Bookings
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">Track and manage your moving services</p>
                    </div>
                </div>

                <div className="w-full max-w-7xl mx-auto">
                    <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                            <IconLoader className="animate-spin" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="w-full px-4 md:px-8 py-8 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 min-h-screen">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl border border-white/20 dark:border-gray-700/50 rounded-2xl py-12 mb-8">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-slate-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent flex items-center justify-center gap-4">
                            <IconTruck className="w-10 h-10 text-red-600" stroke={1.5} />
                            My Bookings
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-3 text-lg">Something went wrong</p>
                    </div>
                </div>

                <div className="w-full max-w-7xl mx-auto">
                    <div className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800 rounded-2xl p-12 text-center shadow-xl">
                        <h3 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-3">Unable to load bookings</h3>
                        <p className="text-red-600 dark:text-red-300 mb-8 text-lg">{error.message || 'Failed to load your bookings. Please try again.'}</p>
                        <button
                            onClick={() => mutate()}
                            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            <IconRefresh className="w-5 h-5 mr-3" stroke={2} />
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // No user state
    if (!user) {
        return (
            <div className="w-full px-4 md:px-8 py-8 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 min-h-screen">
                <div className="text-center py-16">
                    <IconUser className="w-20 h-20 text-gray-400 mx-auto mb-6" stroke={1.5} />
                    <p className="text-gray-600 dark:text-gray-400 text-xl mb-8">Please log in to view your bookings.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-10 py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full px-4 md:px-8 py-8 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 min-h-screen">
            {/* Modern header with gradient and stats */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 dark:from-blue-700 dark:via-indigo-800 dark:to-purple-900 backdrop-blur-sm shadow-xl border border-white/20 dark:border-gray-700/50 rounded-2xl py-8 md:py-12 mb-8 relative overflow-hidden"
            >
                {/* Enhanced background decoration with floating elements */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-pink-500/10"></div>
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(120,119,198,0.3),transparent)]"></div>

                {/* Floating geometric shapes for commercial effect */}
                <motion.div
                    animate={{
                        rotate: 360,
                        scale: [1, 1.1, 1],
                    }}
                    transition={{
                        rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
                        scale: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    className="absolute top-4 right-4 w-20 h-20 border-2 border-white/20 rounded-full"
                ></motion.div>

                <motion.div
                    animate={{
                        rotate: -360,
                        y: [0, -10, 0],
                    }}
                    transition={{
                        rotate: { duration: 25, repeat: Infinity, ease: 'linear' },
                        y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                    }}
                    className="absolute bottom-4 left-4 w-16 h-16 border-2 border-white/15 rounded-lg rotate-45"
                ></motion.div>

                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 1,
                    }}
                    className="absolute top-1/2 right-1/4 w-12 h-12 bg-white/10 rounded-full"
                ></motion.div>

                <div className="relative z-10">
                    <div className="text-center mb-8">
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-4xl font-bold text-white flex items-center justify-center gap-4"
                        >
                            <motion.div whileHover={{ scale: 1.1, rotate: 5 }} transition={{ type: 'spring', stiffness: 400, damping: 10 }}>
                                <IconTruck className="w-10 h-10 text-white" stroke={1.5} />
                            </motion.div>
                            My Bookings
                        </motion.h1>
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-blue-100 mt-3 text-lg">
                            Track and manage your moving services
                        </motion.p>
                        {apiResponse && (
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-sm text-blue-200 mt-2">
                                {apiResponse.length} total booking{apiResponse.length !== 1 ? 's' : ''}
                            </motion.p>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Content container */}
            <div className="w-full mx-auto">
                {/* Search and filters section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 md:p-8 rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 mb-8"
                >
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="relative flex-grow">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <IconSearch className="text-gray-400 dark:text-gray-500 w-5 h-5" stroke={2} />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-12 pr-12 py-4 border border-gray-200 dark:border-gray-600 rounded-xl
                                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                         bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400
                                         text-lg font-medium shadow-sm transition-all duration-200"
                                placeholder="Search bookings by ID, location, or provider..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                                >
                                    <IconX className="w-5 h-5" stroke={2} />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="flex items-center">
                                <IconFilter className="w-5 h-5 text-gray-500 mr-3" stroke={2} />
                                <label className="mr-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Status:</label>
                                <select
                                    className="border border-gray-200 dark:border-gray-600 rounded-xl
                                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent py-3 px-4
                                             bg-white/80 dark:bg-gray-700/80 text-gray-900 dark:text-gray-100 min-w-[160px]
                                             font-medium shadow-sm"
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="draft">Draft</option>
                                    <option value="pending">Pending</option>
                                    <option value="bidding">Bidding</option>
                                    <option value="accepted">Accepted</option>
                                    <option value="assigned">Assigned</option>
                                    <option value="in_transit">In Transit</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            <button
                                onClick={() => mutate()}
                                className="inline-flex items-center px-6 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300
                                         bg-white/80 dark:bg-gray-700/80 border border-gray-200 dark:border-gray-600 rounded-xl
                                         hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 shadow-sm hover:shadow-md
                                         transform hover:-translate-y-0.5"
                                title="Refresh bookings"
                            >
                                <IconRefresh className="w-4 h-4 mr-2" stroke={2} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Modern timeline tabs */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-8 flex flex-row border-b-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/20 dark:border-gray-700/50 gap-1"
                >
                    {[
                        { key: 'all', label: 'All Bookings', icon: IconTruck },
                        { key: 'upcoming', label: 'Upcoming', icon: IconCalendar },
                        { key: 'instant', label: 'Instant', icon: IconTrendingUp },
                        { key: 'journey', label: 'Journey', icon: IconRoute },
                        { key: 'active', label: 'Active', icon: IconPackage },
                        { key: 'completed', label: 'Completed', icon: IconCircleCheck },
                    ].map(({ key, label, icon: Icon }) => {
                        let count = 0;

                        if (key === 'all') {
                            count = bookings.length;
                        } else if (key === 'upcoming') {
                            count = bookings.filter((b) => {
                                const bookingDate = new Date(b.preferred_pickup_date || b.date || '');
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return bookingDate >= today && !['completed', 'cancelled'].includes(b.status);
                            }).length;
                        } else if (key === 'instant') {
                            count = bookings.filter((b) => b.request_type === 'instant').length;
                        } else if (key === 'journey') {
                            count = bookings.filter((b) => b.request_type === 'journey' || !b.request_type || b.request_type !== 'instant').length;
                        } else if (key === 'active') {
                            count = bookings.filter((b) => ['pending', 'accepted', 'assigned', 'in_transit', 'bidding'].includes(b.status)).length;
                        } else if (key === 'completed') {
                            count = bookings.filter((b) => b.status === 'completed').length;
                        }

                        return (
                            <button
                                key={key}
                                className={`flex items-center px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm font-semibold transition-all duration-300 rounded-xl whitespace-nowrap flex-shrink-0 ${
                                    activeTab === key
                                        ? 'bg-secondary text-white shadow-lg transform scale-105'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                onClick={() => setActiveTab(key)}
                            >
                                <Icon className="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" stroke={2} />
                                <span className="hidden sm:inline">{label}</span>
                                <span className="sm:hidden">{label.split(' ')[0]}</span>
                                <span
                                    className={`ml-1 md:ml-2 text-xs px-1.5 md:px-2 py-0.5 md:py-1 rounded-full font-bold ${
                                        activeTab === key ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </motion.div>

                {/* Bookings List */}
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab + filterStatus + searchQuery} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                        {filteredBookings.length > 0 ? (
                            filteredBookings.map((booking, index) => (
                                <motion.div key={booking.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                                    <MyBookingCard booking={booking} expandedBooking={expandedBooking} toggleBookingDetails={toggleBookingDetails} />
                                </motion.div>
                            ))
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 dark:border-gray-700/50 p-16 text-center"
                            >
                                <div className="mb-8">
                                    {searchQuery || filterStatus !== 'all' ? (
                                        <IconSearch className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto" stroke={1.5} />
                                    ) : (
                                        <IconTruck className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto" stroke={1.5} />
                                    )}
                                </div>
                                <h3 className="text-2xl font-bold text-gray-600 dark:text-gray-300 mb-4">
                                    {searchQuery || filterStatus !== 'all' ? 'No bookings match your filters' : 'No bookings yet'}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 mb-8 text-lg">
                                    {searchQuery || filterStatus !== 'all'
                                        ? 'Try adjusting your search terms or filters'
                                        : "You haven't made any bookings yet. Create your first booking to get started!"}
                                </p>
                                {!searchQuery && filterStatus === 'all' && (
                                    <button
                                        onClick={() => navigate('/instant-booking')}
                                        className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-10 py-4 rounded-xl transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                    >
                                        <IconPlus className="w-5 h-5 mr-3" stroke={2} />
                                        Create Your First Booking
                                    </button>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default MyBookings;
