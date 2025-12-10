import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatCurrency } from '../../helper/formatCurrency';
import axiosInstance from '../../services/axiosInstance';

interface GuestPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: (paymentDetails: any) => void;
    amount: number;
    requestId: string;
}

const GuestPaymentModal: React.FC<GuestPaymentModalProps> = ({ isOpen, onClose, onComplete, amount, requestId }) => {
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
    const [cardDetails, setCardDetails] = useState({
        number: '',
        expiry: '',
        cvc: '',
        name: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);
        setError(null);

        try {
            // Call our new payment confirmation endpoint
            const response = await axiosInstance.post('/payments/confirm_payment/', {
                request_id: requestId,
                amount: amount,
            });

            // Pass the complete response to the parent component
            onComplete({
                ...response.data,
                method: paymentMethod,
                amount,
                status: 'completed',
            });
        } catch (error: any) {
            console.error('Payment failed:', error);
            setError(error.response?.data?.error || 'Payment failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg rounded-xl bg-white dark:bg-gray-800 p-6 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">Complete Payment</Dialog.Title>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="mb-6">
                        <div className="text-sm text-gray-500 dark:text-gray-400">Total Amount</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(amount)}</div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('card')}
                                    className={`p-4 rounded-lg border ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                                            />
                                        </svg>
                                        <span className="text-sm font-medium">Credit Card</span>
                                    </div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentMethod('paypal')}
                                    className={`p-4 rounded-lg border ${paymentMethod === 'paypal' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}
                                >
                                    <div className="flex items-center justify-center space-x-2">
                                        <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                            />
                                        </svg>
                                        <span className="text-sm font-medium">PayPal</span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {paymentMethod === 'card' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Card Number</label>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="1234 5678 9012 3456"
                                        value={cardDetails.number}
                                        onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expiry Date</label>
                                        <input
                                            type="text"
                                            required
                                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="MM/YY"
                                            value={cardDetails.expiry}
                                            onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CVC</label>
                                        <input
                                            type="text"
                                            required
                                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                            placeholder="123"
                                            value={cardDetails.cvc}
                                            onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name on Card</label>
                                    <input
                                        type="text"
                                        required
                                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="John Doe"
                                        value={cardDetails.name}
                                        onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {paymentMethod === 'paypal' && (
                            <div className="text-center py-4">
                                <p className="text-gray-600 dark:text-gray-300 mb-4">You will be redirected to PayPal to complete your payment.</p>
                                <button
                                    type="button"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Continue with PayPal
                                </button>
                            </div>
                        )}

                        <div className="flex justify-end space-x-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isProcessing}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                                    isProcessing ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                }`}
                            >
                                {isProcessing ? 'Processing...' : 'Pay Now'}
                            </button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default GuestPaymentModal;
