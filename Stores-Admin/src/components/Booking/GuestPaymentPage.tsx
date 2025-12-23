import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../helper/formatCurrency';
import { ArrowLeftIcon, CreditCardIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import axiosInstance from '../../services/axiosInstance';

interface GuestPaymentPageProps {
    selectedPrice: {
        price: number;
        staff_count: number;
        date: string;
    };
    bookingDetails: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        pickupAddress: string;
        pickupUnit?: string;
        pickupFloor?: string;
        pickupInstructions?: string;
        dropoffAddress: string;
        dropoffUnit?: string;
        dropoffFloor?: string;
        dropoffInstructions?: string;
    };
    onBack: () => void;
    requestId: string;
}

const GuestPaymentPage: React.FC<GuestPaymentPageProps> = ({ selectedPrice, bookingDetails, onBack, requestId }) => {
    const navigate = useNavigate();
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
    const [cardDetails, setCardDetails] = useState({
        number: '',
        expiry: '',
        cvc: '',
        name: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            // Process the payment for the existing request
            const paymentResponse = await axiosInstance.post('/payments/process/', {
                request_id: requestId,
                payment_method: paymentMethod,
                amount: selectedPrice.price,
                card_details: paymentMethod === 'card' ? cardDetails : undefined,
            });

            if (paymentResponse.status === 200) {
                // Update request status to confirmed
                await axiosInstance.patch(`/requests/${requestId}/`, {
                    status: 'confirmed',
                });

                // Navigate to success page
                navigate('/booking-success', {
                    state: {
                        requestId,
                        bookingDetails,
                        selectedPrice,
                    },
                });
            }
        } catch (error) {
            console.error('Payment processing error:', error);
            // Handle error (show error message to user)
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Header */}
                <div className="mb-8">
                    <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 mb-4">
                        <ArrowLeftIcon className="h-5 w-5 mr-2" />
                        Back to Booking Details
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Complete Your Payment</h1>
                    <p className="text-gray-600 mt-2">Secure payment processing for your booking</p>
                </div>

                {/* Price Summary Card */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Booking Summary</h2>
                            <p className="text-gray-600">Staff Count: {selectedPrice.staff_count}</p>
                            <p className="text-gray-600">Date: {new Date(selectedPrice.date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedPrice.price)}</p>
                        </div>
                    </div>
                </div>

                {/* Payment Form */}
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>

                        {/* Payment Method Selection */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('card')}
                                className={`p-4 rounded-lg border-2 ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                            >
                                <CreditCardIcon className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                                <span className="block text-sm font-medium">Credit Card</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('paypal')}
                                className={`p-4 rounded-lg border-2 ${paymentMethod === 'paypal' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                            >
                                <img src="/paypal-logo.png" alt="PayPal" className="h-6 mx-auto mb-2" />
                                <span className="block text-sm font-medium">PayPal</span>
                            </button>
                        </div>

                        {/* Card Details Form */}
                        {paymentMethod === 'card' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="1234 5678 9012 3456"
                                        value={cardDetails.number}
                                        onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Expiry Date</label>
                                        <input
                                            type="text"
                                            required
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="MM/YY"
                                            value={cardDetails.expiry}
                                            onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">CVC</label>
                                        <input
                                            type="text"
                                            required
                                            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="123"
                                            value={cardDetails.cvc}
                                            onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Name on Card</label>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="John Doe"
                                        value={cardDetails.name}
                                        onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* PayPal Button */}
                        {paymentMethod === 'paypal' && (
                            <div className="text-center py-4">
                                <button
                                    type="button"
                                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    <img src="/paypal-logo.png" alt="PayPal" className="h-6 mr-2" />
                                    Pay with PayPal
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Security Notice */}
                    <div className="flex items-center justify-center text-sm text-gray-600">
                        <LockClosedIcon className="h-5 w-5 mr-2" />
                        Your payment information is secure and encrypted
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={isProcessing}
                            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Processing...' : 'Complete Payment'}
                        </motion.button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GuestPaymentPage;
