import {
    IconBell,
    IconClock,
    IconCurrencyDollar,
    IconMapPin,
    IconPackage,
    IconRoute,
    IconTruck,
    IconUser,
} from '@tabler/icons-react';
import { motion } from 'framer-motion';
import React from 'react';

interface BookingOverviewTabProps {
    booking: any;
    onStatusOverride: () => void;
    onPriceAdjustment: () => void;
    onRefund: () => void;
    onProviderAssignment: () => void;
    onConfirmJob: () => void;
    newAdminNote: string;
    setNewAdminNote: (note: string) => void;
    onAddAdminNote: () => void;
    isAddingNote: boolean;
}

const BookingOverviewTab: React.FC<BookingOverviewTabProps> = ({
    booking,
    onStatusOverride,
    onPriceAdjustment,
    onRefund,
    onProviderAssignment,
    onConfirmJob,
    newAdminNote,
    setNewAdminNote,
    onAddAdminNote,
    isAddingNote,
}) => {
    return (
        <div className="space-y-6">
            {/* Enhanced Header with Admin Controls */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 overflow-hidden"
            >
                <div className="p-6 text-white">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                    <IconCurrencyDollar className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-white/80">Total Value</p>
                                    <p className="font-semibold text-white text-lg">£{booking.final_price || booking.base_price || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                    <IconPackage className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-white/80">Items</p>
                                    <p className="font-semibold text-white text-lg">{booking.moving_items?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                    <IconMapPin className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-white/80">Stops</p>
                                    <p className="font-semibold text-white text-lg">{booking.stops?.length || 0}</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                    <IconTruck className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-white/80">Status</p>
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30">
                                        {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1).replace(/_/g, ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Service Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl flex items-center border border-white/20">
                            <IconTruck className="text-white mr-3 w-5 h-5" />
                            <div>
                                <div className="text-xs text-white/80">Request Type</div>
                                <div className="text-sm font-semibold text-white">{booking.request_type || 'Standard'}</div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl flex items-center border border-white/20">
                            <IconUser className="text-white mr-3 w-5 h-5" />
                            <div>
                                <div className="text-xs text-white/80">Service Level</div>
                                <div className="text-sm font-semibold text-white">{booking.service_level || 'Standard'}</div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl flex items-center border border-white/20">
                            <IconRoute className="text-white mr-3 w-5 h-5" />
                            <div>
                                <div className="text-xs text-white/80">Distance</div>
                                <div className="text-sm font-semibold text-white">{booking.estimated_distance || 0}km</div>
                            </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl flex items-center border border-white/20">
                            <IconClock className="text-white mr-3 w-5 h-5" />
                            <div>
                                <div className="text-xs text-white/80">Est. Duration</div>
                                <div className="text-sm font-semibold text-white">{booking.estimated_duration || 'Calculating...'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Admin Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={onStatusOverride}
                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 border border-amber-400/30"
                        >
                            <IconBell className="w-4 h-4" />
                            Override Status
                        </button>
                        <button
                            onClick={onPriceAdjustment}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 border border-emerald-400/30"
                        >
                            <IconCurrencyDollar className="w-4 h-4" />
                            Adjust Price
                        </button>
                        <button
                            onClick={onRefund}
                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 border border-red-400/30"
                        >
                            <IconBell className="w-4 h-4" />
                            Process Refund
                        </button>
                        {booking.driver && (
                            <button
                                onClick={onProviderAssignment}
                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 border border-blue-400/30"
                            >
                                <IconTruck className="w-4 h-4" />
                                Reassign Driver
                            </button>
                        )}
                        <button
                            onClick={onConfirmJob}
                            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 border border-purple-400/30"
                        >
                            <IconBell className="w-4 h-4" />
                            Confirm as Job
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Items Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Items</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dimensions</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Special</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {booking.moving_items?.map((item: any, index: number) => (
                                        <tr key={index}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {(() => {
                                                    const dims = item.dimensions;
                                                    if (!dims) return 'N/A';
                                                    
                                                    if (typeof dims === 'string') {
                                                        // Try to parse string format
                                                        const match = dims.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(\w+)/);
                                                        if (match) {
                                                            const [, width, height, length, unit] = match;
                                                            const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                            return `${volume.toFixed(0)} cubic ${unit}`;
                                                        }
                                                        return dims;
                                                    }
                                                    
                                                    if (typeof dims === 'object') {
                                                        const { unit, width, height, length } = dims as any;
                                                        if (width && height && length) {
                                                            const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                            return `${volume.toFixed(0)} cubic ${unit || 'cm'}`;
                                                        }
                                                    }
                                                    
                                                    return 'N/A';
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex gap-1">
                                                    {item.fragile && <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">Fragile</span>}
                                                    {item.needs_disassembly && <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Disassembly</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!booking.moving_items || booking.moving_items.length === 0) && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                                No items specified
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Route and Locations */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Route</h3>
                        <div className="space-y-4">
                            {booking.stops?.map((stop: any, index: number) => (
                                <div key={index} className="flex items-start gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                            stop.type === 'pickup' ? 'bg-green-500' : stop.type === 'dropoff' ? 'bg-red-500' : 'bg-blue-500'
                                        }`}
                                    >
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {stop.type.toUpperCase()}: {stop.location.address || 'Address not specified'}
                                        </div>
                                        <div className="text-sm text-gray-500 mt-1">{stop.instructions && `Instructions: ${stop.instructions}`}</div>
                                        <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                            <span>Floor: {stop.floor || 'Ground'}</span>
                                            <span>Elevator: {stop.has_elevator ? 'Yes' : 'No'}</span>
                                            {stop.unit_number && <span>Unit: {stop.unit_number}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer</h3>
                        <div className="space-y-3">
                            <div>
                                <div className="text-sm text-gray-500">Name</div>
                                <div className="font-medium">{booking.user?.first_name} {booking.user?.last_name}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">Email</div>
                                <div className="font-medium">{booking.user?.email || 'Not provided'}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">Phone</div>
                                <div className="font-medium">{booking.user?.phone_number || 'Not provided'}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-500">User Type</div>
                                <div className="font-medium">{booking.user?.user_type || 'customer'}</div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700">Contact Customer</button>
                        </div>
                    </div>

                    {/* Driver Info */}
                    {booking.driver && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Driver</h3>
                            <div className="space-y-3">
                                <div>
                                    <div className="text-sm text-gray-500">Name</div>
                                    <div className="font-medium">{booking.driver.name}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500">Phone</div>
                                    <div className="font-medium">{booking.driver.phone}</div>
                                </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                                <button className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700">Contact Driver</button>
                                <button onClick={onProviderAssignment} className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700">
                                    Reassign Driver
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Admin Notes */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl shadow-sm p-6 border border-yellow-200 dark:border-yellow-800">
                        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-4">Admin Notes</h3>
                        <div className="space-y-3 mb-4">
                            <div className="text-sm text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-800/30 p-3 rounded-lg">
                                <div className="font-medium">System Note</div>
                                <div>Booking created automatically from website</div>
                                <div className="text-xs mt-1">{new Date(booking.created_at).toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <textarea
                                value={newAdminNote}
                                onChange={(e) => setNewAdminNote(e.target.value)}
                                placeholder="Add admin note..."
                                className="w-full p-3 border border-yellow-300 dark:border-yellow-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                rows={3}
                            />
                            <button
                                onClick={onAddAdminNote}
                                className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 flex items-center justify-center"
                                disabled={isAddingNote || !newAdminNote.trim()}
                            >
                                {isAddingNote ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                        Adding...
                                    </>
                                ) : (
                                    'Add Note'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingOverviewTab; 