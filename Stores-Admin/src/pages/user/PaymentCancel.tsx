import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IconX, IconArrowLeft, IconHome, IconRefresh, IconPhone, IconMail, IconAlertTriangle, IconCreditCard, IconHelp } from '@tabler/icons-react';

const PaymentCancel: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-slate-900">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconX className="w-12 h-12 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Payment Cancelled</h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">Your payment was cancelled and no charges were made to your account.</p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* What Happened */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <IconAlertTriangle className="w-6 h-6 text-orange-600 mr-2" />
                                What Happened?
                            </h2>

                            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                                <p className="text-orange-900 dark:text-orange-100 mb-3">Your booking payment was cancelled before completion. This could have happened because:</p>
                                <ul className="text-orange-800 dark:text-orange-200 text-sm space-y-1">
                                    <li>• You clicked the back button during payment</li>
                                    <li>• You closed the payment window</li>
                                    <li>• The payment session timed out</li>
                                    <li>• You chose to return to booking details</li>
                                </ul>
                            </div>

                            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                <div className="flex items-start">
                                    <IconCreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-3 mt-0.5" />
                                    <div>
                                        <p className="text-blue-900 dark:text-blue-100 font-medium">No Charges Made</p>
                                        <p className="text-blue-700 dark:text-blue-300 text-sm">Your credit card or payment method has not been charged. You can safely try again.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Your Booking Status */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Booking Status</h2>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
                                <div className="flex items-start">
                                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3 mt-2"></div>
                                    <div>
                                        <p className="text-yellow-900 dark:text-yellow-100 font-medium">Booking Pending Payment</p>
                                        <p className="text-yellow-800 dark:text-yellow-200 text-sm mt-1">
                                            Your booking details have been saved but payment is still required to confirm your reservation. The booking will remain in "pending" status until payment is
                                            completed.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">What You Can Do:</h3>
                                <ul className="text-gray-700 dark:text-gray-300 text-sm space-y-1">
                                    <li>• Try payment again with the same or different payment method</li>
                                    <li>• Review and modify your booking details if needed</li>
                                    <li>• Contact support if you're experiencing payment issues</li>
                                    <li>• Your booking details are saved for 24 hours</li>
                                </ul>
                            </div>
                        </motion.div>

                        {/* Common Payment Issues */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                                <IconHelp className="w-6 h-6 text-purple-600 mr-2" />
                                Having Payment Issues?
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                                    <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Common Solutions</h3>
                                    <ul className="text-purple-800 dark:text-purple-200 text-sm space-y-1">
                                        <li>• Check your card details are correct</li>
                                        <li>• Ensure you have sufficient funds</li>
                                        <li>• Try a different payment method</li>
                                        <li>• Disable browser popup blockers</li>
                                        <li>• Clear browser cache and cookies</li>
                                    </ul>
                                </div>

                                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                                    <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Security Features</h3>
                                    <ul className="text-purple-800 dark:text-purple-200 text-sm space-y-1">
                                        <li>• 3D Secure authentication may be required</li>
                                        <li>• Some banks block online transactions by default</li>
                                        <li>• International cards may need approval</li>
                                        <li>• Contact your bank if payment keeps failing</li>
                                    </ul>
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
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">What's Next?</h3>

                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center transition-colors"
                                >
                                    <IconRefresh className="w-4 h-4 mr-2" />
                                    Try Payment Again
                                </button>

                                <Link to="/account/bookings" className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg flex items-center justify-center transition-colors">
                                    <IconArrowLeft className="w-4 h-4 mr-2" />
                                    View My Bookings
                                </Link>

                                <Link to="/service-request" className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg flex items-center justify-center transition-colors">
                                    <IconHome className="w-4 h-4 mr-2" />
                                    Start New Booking
                                </Link>
                            </div>
                        </motion.div>

                        {/* Payment Security */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800"
                        >
                            <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-4">Payment Security</h3>

                            <div className="space-y-3 text-sm">
                                <div className="flex items-start">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                                    <div>
                                        <p className="text-green-900 dark:text-green-100 font-medium">256-bit SSL Encryption</p>
                                        <p className="text-green-800 dark:text-green-200">Your payment data is fully encrypted</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                                    <div>
                                        <p className="text-green-900 dark:text-green-100 font-medium">PCI DSS Compliant</p>
                                        <p className="text-green-800 dark:text-green-200">Industry-standard security protocols</p>
                                    </div>
                                </div>

                                <div className="flex items-start">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3 mt-2"></div>
                                    <div>
                                        <p className="text-green-900 dark:text-green-100 font-medium">Stripe Powered</p>
                                        <p className="text-green-800 dark:text-green-200">Trusted by millions worldwide</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Support */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800"
                        >
                            <h3 className="text-lg font-bold text-yellow-900 dark:text-yellow-100 mb-4">Need Help?</h3>

                            <p className="text-yellow-800 dark:text-yellow-200 text-sm mb-4">Our support team is available 24/7 to help with payment issues or booking questions.</p>

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

                        {/* Tips */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 }}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700"
                        >
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">💡 Pro Tips</h3>

                            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                <p>• Keep your browser window open during payment</p>
                                <p>• Don't refresh the page during payment processing</p>
                                <p>• Have your card details ready before starting</p>
                                <p>• Use a reliable internet connection</p>
                                <p>• Contact your bank if payments keep failing</p>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentCancel;
