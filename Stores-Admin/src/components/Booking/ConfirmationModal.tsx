import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { format, isValid } from 'date-fns';
import { CalendarIcon, UserIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../helper/formatCurrency';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    price: number;
    email: string;
    trackingNumber: string;
    onConfirm: () => void;
    bookingDetails?: {
        date: string;
        time: string;
        serviceType: string;
        staffCount: number;
        pickupLocation?: string;
        dropoffLocation?: string;
    };
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, price, email, trackingNumber, bookingDetails, onConfirm }) => {
    // Helper function to safely format dates
    const formatBookingDate = (dateString: string | undefined, timeString: string | undefined): string => {
        if (!dateString) return 'Date not specified';

        try {
            const date = new Date(dateString);
            if (!isValid(date)) return 'Invalid date';

            const formattedDate = format(date, 'EEEE, MMMM d, yyyy');
            return timeString ? `${formattedDate} at ${timeString}` : formattedDate;
        } catch (error) {
            console.error('Error formatting date:', error);
            return 'Invalid date';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-75">
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
                        <div className="flex flex-col items-center space-y-6">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircleIcon className="h-10 w-10 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-semibold text-gray-900">Booking Confirmed!</h3>
                                <p className="text-gray-600">Your booking has been successfully confirmed.</p>
                            </div>

                            <div className="w-full space-y-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600">Tracking Number</p>
                                        <p className="text-2xl font-bold text-blue-600">{trackingNumber}</p>
                                        <p className="text-sm text-gray-600 mt-2">Keep this number for tracking your booking</p>
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-600">Confirmed Price</p>
                                        <p className="text-3xl font-bold text-blue-600">{formatCurrency(price)}</p>
                                    </div>
                                </div>

                                {bookingDetails && (
                                    <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                <CalendarIcon className="h-5 w-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Booking Date & Time</p>
                                                <p className="font-medium text-gray-900">{formatBookingDate(bookingDetails.date, bookingDetails.time)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                <UserIcon className="h-5 w-5 text-gray-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-gray-600">Service Details</p>
                                                <p className="font-medium text-gray-900">
                                                    {bookingDetails.serviceType} with {bookingDetails.staffCount} {bookingDetails.staffCount === 1 ? 'staff member' : 'staff members'}
                                                </p>
                                            </div>
                                        </div>

                                        {bookingDetails.pickupLocation && (
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                    <MapPinIcon className="h-5 w-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Pickup Location</p>
                                                    <p className="font-medium text-gray-900">{bookingDetails.pickupLocation}</p>
                                                </div>
                                            </div>
                                        )}

                                        {bookingDetails.dropoffLocation && (
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                    <MapPinIcon className="h-5 w-5 text-gray-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm text-gray-600">Dropoff Location</p>
                                                    <p className="font-medium text-gray-900">{bookingDetails.dropoffLocation}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Confirmation email has been sent to</p>
                                            <p className="font-medium text-gray-900">{email}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onConfirm}
                                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                            >
                                Ok
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
