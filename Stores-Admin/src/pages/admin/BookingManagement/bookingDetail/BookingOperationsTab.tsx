import {
    IconBell,
    IconClock,
    IconExternalLink,
    IconFlag,
    IconMapPin,
    IconMessage,
    IconMessages,
    IconNotes,
    IconPhone,
    IconRefresh,
    IconShield,
    IconStar,
    IconTruck,
    IconUser,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import React from 'react';

interface BookingOperationsTabProps {
    booking: any;
    onProviderAssignment: () => void;
    newAdminNote: string;
    setNewAdminNote: (note: string) => void;
    onAddAdminNote: () => void;
    isAddingNote: boolean;
}

const BookingOperationsTab: React.FC<BookingOperationsTabProps> = ({
    booking,
    onProviderAssignment,
    newAdminNote,
    setNewAdminNote,
    onAddAdminNote,
    isAddingNote,
}) => {
    return (
        <div className="space-y-6">
            {/* Operations Control Panel */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 dark:from-purple-600 dark:via-purple-700 dark:to-purple-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 overflow-hidden"
            >
                <div className="p-6 text-white">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Operations Control</h2>
                            <p className="text-white/90">Manage booking operations and driver coordination</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30">
                                Active
                            </span>
                        </div>
                    </div>

                    {/* Operations Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                    <IconTruck className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-white/80">Driver Status</p>
                                    <p className="font-semibold text-white text-sm">{booking.driver ? 'Assigned' : 'Pending'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                    <IconClock className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-white/80">ETA</p>
                                    <p className="font-semibold text-white text-sm">{booking.estimated_completion_time ? new Date(booking.estimated_completion_time).toLocaleString() : 'Calculating...'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                    <IconMapPin className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-white/80">Progress</p>
                                    <p className="font-semibold text-white text-sm">
                                        {booking.status === 'completed' ? '100%' : booking.status === 'in_progress' ? '60%' : booking.status === 'confirmed' ? '25%' : '10%'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                    <IconBell className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-white/80">Notifications</p>
                                    <p className="font-semibold text-white text-sm">3 Active</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Operations Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <button className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2">
                            <IconTruck className="w-4 h-4" />
                            Track Vehicle
                        </button>
                        <button className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2">
                            <IconPhone className="w-4 h-4" />
                            Contact Driver
                        </button>
                        <button className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2">
                            <IconMessage className="w-4 h-4" />
                            Send Update
                        </button>
                        <button className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2">
                            <IconFlag className="w-4 h-4" />
                            Escalate
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Driver Information */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <IconTruck className="w-5 h-5 text-blue-600" />
                            Driver Details
                        </h3>
                    </div>
                    <div className="p-6">
                        {booking.driver ? (
                            <div className="space-y-4">
                                <div className="flex items-start space-x-4">
                                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                        <IconUser className="w-6 h-6 text-gray-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-semibold text-gray-900 dark:text-white">{booking.driver.name}</h4>
                                            {booking.driver.verified && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                                    <IconShield className="w-3 h-3 mr-1" />
                                                    Verified
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm">{booking.driver.companyName}</p>
                                        <div className="flex items-center mt-1">
                                            <div className="flex items-center">
                                                {[...Array(5)].map((_, i) => (
                                                    <IconStar
                                                        key={i}
                                                        className={`w-4 h-4 ${i < Math.floor(booking.driver?.rating || 0) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="ml-2 text-gray-600 dark:text-gray-400 text-sm">
                                                {booking.driver.rating} ({booking.driver.reviewCount} reviews)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Vehicle Type</div>
                                        <div className="font-medium text-gray-900 dark:text-white">{booking.driver.vehicleType}</div>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Capacity</div>
                                        <div className="font-medium text-gray-900 dark:text-white">{booking.driver.capacity}</div>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center justify-center gap-2">
                                        <IconPhone className="w-4 h-4" />
                                        Call
                                    </button>
                                    <button className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center justify-center gap-2">
                                        <IconMessage className="w-4 h-4" />
                                        Message
                                    </button>
                                    <button
                                        onClick={onProviderAssignment}
                                        className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center justify-center gap-2"
                                    >
                                        <IconUser className="w-4 h-4" />
                                        Reassign
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <IconTruck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                <div className="text-gray-500 dark:text-gray-400 mb-4">No driver assigned</div>
                                <button
                                    onClick={onProviderAssignment}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                                >
                                    <IconUser className="w-4 h-4" />
                                    Assign Driver
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tracking & Communication */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <IconMapPin className="w-5 h-5 text-green-600" />
                            Live Tracking
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {/* Mock GPS Tracking */}
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="text-green-800 dark:text-green-200 font-medium text-sm">Live Location</span>
                                    </div>
                                    <span className="text-green-600 dark:text-green-400 text-xs">Updated 2 min ago</span>
                                </div>
                                <p className="text-green-700 dark:text-green-300 text-sm">Currently: M25 Junction 15, heading towards destination</p>
                                <div className="mt-3 flex gap-2">
                                    <button className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1">
                                        <IconExternalLink className="w-3 h-3" />
                                        View Map
                                    </button>
                                    <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 flex items-center gap-1">
                                        <IconRefresh className="w-3 h-3" />
                                        Refresh
                                    </button>
                                </div>
                            </div>

                            {/* Communication Log */}
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <IconMessages className="w-4 h-4" />
                                    Recent Communications
                                </h4>
                                <div className="space-y-3">
                                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-sm text-gray-900 dark:text-white">Customer Message</span>
                                            <span className="text-gray-500 dark:text-gray-400 text-xs">10 min ago</span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">"Are you still on schedule for 3 PM pickup?"</p>
                                    </div>
                                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-sm text-gray-900 dark:text-white">Driver Update</span>
                                            <span className="text-gray-500 dark:text-gray-400 text-xs">15 min ago</span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">"Running 10 minutes late due to traffic, ETA now 3:10 PM"</p>
                                    </div>
                                    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium text-sm text-gray-900 dark:text-white">System Alert</span>
                                            <span className="text-gray-500 dark:text-gray-400 text-xs">1 hour ago</span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">"Driver has departed from origin location"</p>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button className="flex-1 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm flex items-center justify-center gap-2">
                                    <IconBell className="w-4 h-4" />
                                    Alert Customer
                                </button>
                                <button className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm flex items-center justify-center gap-2">
                                    <IconMessage className="w-4 h-4" />
                                    Send Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Operations Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <IconClock className="w-5 h-5 text-purple-600" />
                        Operations Timeline
                    </h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {/* Mock timeline events */}
                        <div className="relative pl-6">
                            <div className="absolute left-0 top-2 w-3 h-3 bg-green-500 rounded-full"></div>
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-green-800 dark:text-green-200 text-sm">Booking Confirmed</span>
                                    <span className="text-green-600 dark:text-green-400 text-xs">2 hours ago</span>
                                </div>
                                <p className="text-green-700 dark:text-green-300 text-sm">Admin confirmed booking and assigned driver</p>
                            </div>
                        </div>

                        <div className="relative pl-6">
                            <div className="absolute left-0 top-2 w-3 h-3 bg-blue-500 rounded-full"></div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-blue-800 dark:text-blue-200 text-sm">Driver Notified</span>
                                    <span className="text-blue-600 dark:text-blue-400 text-xs">1.5 hours ago</span>
                                </div>
                                <p className="text-blue-700 dark:text-blue-300 text-sm">Driver received job notification and accepted assignment</p>
                            </div>
                        </div>

                        <div className="relative pl-6">
                            <div className="absolute left-0 top-2 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-yellow-800 dark:text-yellow-200 text-sm">En Route to Pickup</span>
                                    <span className="text-yellow-600 dark:text-yellow-400 text-xs">15 min ago</span>
                                </div>
                                <p className="text-yellow-700 dark:text-yellow-300 text-sm">Driver is currently traveling to pickup location</p>
                            </div>
                        </div>

                        <div className="relative pl-6">
                            <div className="absolute left-0 top-2 w-3 h-3 bg-gray-300 rounded-full"></div>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-gray-600 dark:text-gray-300 text-sm">Pickup Scheduled</span>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">In 45 min</span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Scheduled pickup at customer location</p>
                            </div>
                        </div>

                        <div className="relative pl-6">
                            <div className="absolute left-0 top-2 w-3 h-3 bg-gray-300 rounded-full"></div>
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-gray-600 dark:text-gray-300 text-sm">Delivery Scheduled</span>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">In 4 hours</span>
                                </div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Scheduled delivery at destination</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin Notes Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <IconNotes className="w-5 h-5 text-indigo-600" />
                        Admin Notes
                    </h3>
                </div>
                <div className="p-6">
                    <div className="space-y-4">
                        {/* Add new note */}
                        <div className="flex gap-3">
                            <textarea
                                value={newAdminNote}
                                onChange={(e) => setNewAdminNote(e.target.value)}
                                placeholder="Add administrative note..."
                                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                                rows={3}
                            />
                            <button
                                onClick={onAddAdminNote}
                                disabled={!newAdminNote.trim()}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 self-start"
                            >
                                Add Note
                            </button>
                        </div>

                        {/* Existing notes */}
                        <div className="space-y-3">
                            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-blue-900 dark:text-blue-200 text-sm">Admin Override Applied</span>
                                    <span className="text-blue-600 dark:text-blue-400 text-xs">2 hours ago</span>
                                </div>
                                <p className="text-blue-800 dark:text-blue-300 text-sm">Status manually changed to confirmed due to customer request. Payment verified manually.</p>
                                <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">By: admin@morevans.com</div>
                            </div>

                            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-medium text-gray-900 dark:text-white text-sm">Customer Communication</span>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">3 hours ago</span>
                                </div>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">
                                    Customer called to confirm pickup time. Requested to move pickup window from 2-4 PM to 3-5 PM. Driver notified and confirmed availability.
                                </p>
                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">By: support@morevans.com</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingOperationsTab; 