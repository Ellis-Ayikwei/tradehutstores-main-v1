import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    IconCircleCheck,
    IconCalendar,
    IconMapPin,
    IconCurrencyDollar,
    IconTruck,
    IconFileText,
    IconHome,
    IconMail,
    IconPhone,
    IconDownload,
    IconEye,
    IconArrowRight,
    IconLoader,
    IconAlertTriangle,
} from '@tabler/icons-react';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import paymentService, { SessionStatus } from '../../services/paymentService';
import useSWR from 'swr';
import fetcher from '../../services/fetcher';

interface AuthUser {
    user: {
        id: string;
        user_type: string;
        email: string;
        first_name: string;
        last_name: string;
    };
}

const PaymentSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const auth = useAuthUser<AuthUser>();
    const user = auth?.user;

    const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [emailSent, setEmailSent] = useState(false);

    const sessionId = searchParams.get('session_id');

    // Get booking details using the request_id from session metadata
    const { data: bookingData, isLoading: bookingLoading } = useSWR(sessionStatus?.metadata?.request_id ? `/requests/${sessionStatus.metadata.request_id}/` : null, fetcher);

    useEffect(() => {
        if (!sessionId) {
            setError('No payment session found');
            setLoading(false);
            return;
        }

        verifyPayment();
    }, [sessionId]);

    const verifyPayment = async () => {
        try {
            setLoading(true);
            const status = await paymentService.checkSessionStatus(sessionId!);

            if (status.payment_status === 'paid') {
                setSessionStatus(status);
                // Optionally send confirmation email
                setTimeout(() => setEmailSent(true), 2000);
            } else {
                setError('Payment was not completed successfully');
            }
        } catch (err) {
            console.error('Error verifying payment:', err);
            setError('Failed to verify payment status');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadReceipt = () => {
        // In a real implementation, you'd generate a PDF receipt
        console.log('Downloading receipt...');
        // You could call your backend to generate a PDF receipt
    };

    const formatAmount = (amount: number, currency: string) => {
        return paymentService.formatAmount(amount, currency);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconLoader className="w-8 h-8 text-green-600 dark:text-green-400 animate-spin" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Verifying Payment</h2>
                    <p className="text-gray-600 dark:text-gray-400">Please wait while we confirm your payment...</p>
                </motion.div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center p-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconAlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Verification Failed</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => navigate('/account/bookings')} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors">
                            View Bookings
                        </button>
                        <button onClick={() => window.location.reload()} className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors">
                            Try Again
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Success Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconCircleCheck className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Your booking has been confirmed and payment processed successfully.</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Payment Details */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <IconCurrencyDollar className="w-6 h-6 text-green-600 mr-2" />
                                Payment Summary
                            </h2>

                            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-700 dark:text-gray-300">Amount Paid</span>
                                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">{sessionStatus && formatAmount(sessionStatus.amount_total, sessionStatus.currency)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                                    <span className="text-gray-700 dark:text-gray-300">Credit Card</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Transaction ID</span>
                                    <span className="text-gray-700 dark:text-gray-300 font-mono text-xs">{sessionStatus?.id?.substring(0, 20)}...</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Status</span>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        <IconCircleCheck className="w-3 h-3 mr-1" />
                                        Paid
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Booking Details */}
                        {bookingData && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700"
                            >
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                    <IconTruck className="w-6 h-6 text-blue-600 mr-2" />
                                    Booking Details
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Booking Information</h3>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Booking ID:</span>
                                                <span className="text-gray-900 dark:text-white font-medium">{bookingData.tracking_number}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Service Type:</span>
                                                <span className="text-gray-900 dark:text-white">{bookingData.service_type}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                    Confirmed
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Service Details</h3>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Vehicle:</span>
                                                <span className="text-gray-900 dark:text-white">{bookingData.vehicle_type}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Staff Required:</span>
                                                <span className="text-gray-900 dark:text-white">{bookingData.persons_required}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600 dark:text-gray-400">Items:</span>
                                                <span className="text-gray-900 dark:text-white">{bookingData.items?.length || 0} items</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Schedule Information */}
                                {bookingData.pickupDate && (
                                    <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center">
                                            <IconCalendar className="w-4 h-4 mr-2" />
                                            Schedule
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-blue-700 dark:text-blue-300">Pickup Date:</span>
                                                <p className="text-blue-900 dark:text-blue-100 font-medium">{new Date(bookingData.pickupDate).toLocaleDateString()}</p>
                                                {bookingData.pickupWindow && <p className="text-blue-700 dark:text-blue-300">{bookingData.pickupWindow}</p>}
                                            </div>
                                            {bookingData.deliveryDate && (
                                                <div>
                                                    <span className="text-blue-700 dark:text-blue-300">Delivery Date:</span>
                                                    <p className="text-blue-900 dark:text-blue-100 font-medium">{new Date(bookingData.deliveryDate).toLocaleDateString()}</p>
                                                    {bookingData.deliveryWindow && <p className="text-blue-700 dark:text-blue-300">{bookingData.deliveryWindow}</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Email Confirmation */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <IconMail className="w-6 h-6 text-purple-600 mr-2" />
                                Email Confirmation
                            </h2>

                            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                                <div className="flex items-center">
                                    {emailSent ? <IconCircleCheck className="w-5 h-5 text-green-600 mr-3" /> : <IconLoader className="w-5 h-5 text-purple-600 mr-3 animate-spin" />}
                                    <div>
                                        <p className="text-purple-900 dark:text-purple-100 font-medium">{emailSent ? 'Confirmation email sent!' : 'Sending confirmation email...'}</p>
                                        <p className="text-purple-700 dark:text-purple-300 text-sm">To: {sessionStatus?.customer_email || user?.email}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>

                            <div className="space-y-3">
                                <Link
                                    to={`/account/bookings/${sessionStatus?.metadata?.request_id}`}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center transition-colors group"
                                >
                                    <IconEye className="w-4 h-4 mr-2" />
                                    View Booking Details
                                    <IconArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Link>

                                <button
                                    onClick={handleDownloadReceipt}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg flex items-center justify-center transition-colors"
                                >
                                    <IconDownload className="w-4 h-4 mr-2" />
                                    Download Receipt
                                </button>

                                <Link to="/account/bookings" className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg flex items-center justify-center transition-colors">
                                    <IconFileText className="w-4 h-4 mr-2" />
                                    All Bookings
                                </Link>

                                <Link to="/service-request" className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg flex items-center justify-center transition-colors">
                                    <IconHome className="w-4 h-4 mr-2" />
                                    Book Another Move
                                </Link>
                            </div>
                        </motion.div>

                        {/* Support */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800"
                        >
                            <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100 mb-4">Need Help?</h3>

                            <p className="text-yellow-800 dark:text-yellow-200 text-sm mb-4">If you have any questions about your booking or payment, our support team is here to help.</p>

                            <div className="space-y-2">
                                <a
                                    href="tel:+447497603774"
                                    className="block bg-yellow-100 dark:bg-yellow-800/30 hover:bg-yellow-200 dark:hover:bg-yellow-700/40 text-yellow-900 dark:text-yellow-100 px-4 py-2 rounded-lg text-center transition-colors text-sm"
                                >
                                    <IconPhone className="w-4 h-4 inline mr-2" />
                                    Call Support
                                </a>
                                <a
                                    href="mailto:support@tradehut.com"
                                    className="block bg-yellow-100 dark:bg-yellow-800/30 hover:bg-yellow-200 dark:hover:bg-yellow-700/40 text-yellow-900 dark:text-yellow-100 px-4 py-2 rounded-lg text-center transition-colors text-sm"
                                >
                                    <IconMail className="w-4 h-4 inline mr-2" />
                                    Email Support
                                </a>
                            </div>
                        </motion.div>

                        {/* Next Steps */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">What's Next?</h3>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-start">
                                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">1</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-900 dark:text-white font-medium">Provider Assignment</p>
                                        <p className="text-gray-600 dark:text-gray-400">A verified provider will be assigned to your booking within 2-4 hours.</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">2</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-900 dark:text-white font-medium">Pre-Move Contact</p>
                                        <p className="text-gray-600 dark:text-gray-400">Your provider will contact you 24 hours before the scheduled move.</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3 mt-0.5">
                                        <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">3</span>
                                    </div>
                                    <div>
                                        <p className="text-gray-900 dark:text-white font-medium">Move Day</p>
                                        <p className="text-gray-600 dark:text-gray-400">Track your move in real-time through the app.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;
