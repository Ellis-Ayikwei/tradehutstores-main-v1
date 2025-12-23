import {
    IconCreditCard,
    IconCurrencyDollar,
    IconEdit,
    IconRefresh,
} from '@tabler/icons-react';
import React from 'react';

interface BookingFinancialTabProps {
    booking: any;
    onPriceAdjustment: () => void;
    onRefund: () => void;
}

const BookingFinancialTab: React.FC<BookingFinancialTabProps> = ({
    booking,
    onPriceAdjustment,
    onRefund,
}) => {
    return (
        <div className="space-y-6">
            {/* Financial Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <IconCurrencyDollar className="w-6 h-6 text-green-600" />
                    Financial Overview
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="text-sm text-green-600 dark:text-green-400">Base Price</div>
                        <div className="text-2xl font-bold text-green-900 dark:text-green-100">£{booking.base_price || 0}</div>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                        <div className="text-sm text-amber-600 dark:text-amber-400">Final Price</div>
                        <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">£{booking.final_price || booking.base_price || 0}</div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="text-sm text-blue-600 dark:text-blue-400">Payment Status</div>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 capitalize">{booking.payment_status || 'pending'}</div>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button onClick={onPriceAdjustment} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                        <IconEdit className="w-4 h-4" />
                        Adjust Pricing
                    </button>
                    <button onClick={onRefund} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2">
                        <IconRefresh className="w-4 h-4" />
                        Process Refund
                    </button>
                </div>
            </div>

            {/* Price Breakdown */}
            {booking.price_breakdown && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <IconCurrencyDollar className="w-5 h-5" />
                            Price Breakdown
                        </h3>
                    </div>
                    <div className="p-6">
                        <div className="space-y-3">
                            {Object.entries(booking.price_breakdown).map(([key, value]: [string, any]) => (
                                <div key={key} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                                    <span className="text-gray-700 dark:text-gray-300 capitalize">{key.replace(/_/g, ' ')}</span>
                                    <span className="font-medium text-gray-900 dark:text-white">£{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Payment History */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <IconCreditCard className="w-5 h-5" />
                        Payment History
                    </h3>
                </div>
                <div className="p-6">
                    <div className="text-center py-8">
                        <IconCreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <div className="text-gray-500 dark:text-gray-400">No payment records found</div>
                    </div>
                </div>
            </div>

            {/* Insurance Information */}
            {booking.insurance_required && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Insurance Details</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-gray-500">Insurance Required</div>
                                <div className="font-medium">{booking.insurance_required ? 'Yes' : 'No'}</div>
                            </div>
                            {booking.insurance_value && (
                                <div>
                                    <div className="text-sm text-gray-500">Insurance Value</div>
                                    <div className="font-medium">£{booking.insurance_value}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingFinancialTab; 