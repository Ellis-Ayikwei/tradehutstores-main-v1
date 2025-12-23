import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard, faMoneyBillWave, faBank, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import axiosInstance from '../../services/axiosInstance';
import { ServiceRequest } from '../../store/slices/serviceRequestSice';
import { usePayment } from '../../hooks/usePayment';
import { useSelector } from 'react-redux';

// Mock data for testing
const mockServiceRequest: ServiceRequest = {
    id: 'SR-12345',
    request_type: 'biddable',
    status: 'pending',
    priority: 'normal',
    contact_name: 'John Doe',
    contact_phone: '+1234567890',
    contact_email: 'john@example.com',
    pickup_location: {
        address: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
    },
    dropoff_location: {
        address: '456 Park Ave',
        city: 'New York',
        state: 'NY',
        zip: '10022',
    },
    preferred_pickup_date: '2024-04-15',
    preferred_pickup_time: '09:00',
    preferred_delivery_date: '2024-04-15',
    preferred_delivery_time: '17:00',
    is_flexible: true,
    items_description: 'Moving household items',
    total_weight: 500,
    dimensions: {
        length: 10,
        width: 5,
        height: 8,
    },
    requires_special_handling: false,
    special_instructions: 'Handle with care',
    base_price: 250.0,
    final_price: 275.0,
    insurance_required: true,
    insurance_value: 5000,
};

const PaymentDetail: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(true);
    const [request, setRequest] = useState<ServiceRequest | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<string>('card');
    const [processing, setProcessing] = useState<boolean>(false);
    const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
    const { makePayment } = usePayment();

    useEffect(() => {
        // Simulate API call with mock data
        const fetchServiceRequest = async () => {
            try {
                setLoading(true);
                // Simulate API delay
                await new Promise((resolve) => setTimeout(resolve, 1000));
                setRequest(mockServiceRequest);
                setError(null);
            } catch (err) {
                console.error('Error fetching service request:', err);
                setError('Failed to load service request');
            } finally {
                setLoading(false);
            }
        };

        if (requestId) {
            fetchServiceRequest();
        }
    }, [requestId]);

    const handlePayment = async () => {
        try {
            setProcessing(true);
            // Simulate payment processing
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // Mock successful payment
            setPaymentSuccess(true);

            // Simulate API call
            await makePayment({
                request_id: requestId,
                amount: request?.final_price || request?.base_price,
                status: 'completed',
                transaction_id: `TXN-${Date.now()}`,
            });

            // Show success message for 2 seconds before redirecting
            setTimeout(() => {
                navigate('/service-requests');
            }, 2000);
        } catch (err) {
            console.error('Error processing payment:', err);
            setError('Failed to process payment');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                <p>{error || 'Service request not found'}</p>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-6xl mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h2>
                <p className="text-gray-600 dark:text-gray-300">You will be redirected shortly...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Details</h1>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">Total: ${request.final_price || request.base_price}</span>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
                <div className="space-y-2">
                    <p>
                        <span className="font-medium">Base Price:</span> ${request.base_price}
                    </p>
                    <p>
                        <span className="font-medium">Final Price:</span> ${request.final_price}
                    </p>
                    {request.final_price !== request.base_price && <p className="text-sm text-gray-500">(Includes additional charges)</p>}
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Request Details</h2>
                <div className="space-y-2">
                    <p>
                        <span className="font-medium">Type:</span> {request.request_type}
                    </p>
                    <p>
                        <span className="font-medium">Status:</span> {request.status}
                    </p>
                    <p>
                        <span className="font-medium">Pickup:</span> {request.pickup_location?.address}
                    </p>
                    <p>
                        <span className="font-medium">Delivery:</span> {request.dropoff_location?.address}
                    </p>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Select Payment Method</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                        onClick={() => setPaymentMethod('card')}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center ${
                            paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        <FontAwesomeIcon icon={faCreditCard} className="text-2xl mb-2" />
                        <span>Credit Card</span>
                    </button>
                    <button
                        onClick={() => setPaymentMethod('bank')}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center ${
                            paymentMethod === 'bank' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        <FontAwesomeIcon icon={faBank} className="text-2xl mb-2" />
                        <span>Bank Transfer</span>
                    </button>
                    <button
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-4 rounded-lg border-2 flex flex-col items-center ${
                            paymentMethod === 'cash' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                        }`}
                    >
                        <FontAwesomeIcon icon={faMoneyBillWave} className="text-2xl mb-2" />
                        <span>Cash on Delivery</span>
                    </button>
                </div>
            </div>

            {paymentMethod === 'card' && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Card Details</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Card Number</label>
                            <input
                                type="text"
                                placeholder="1234 5678 9012 3456"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date</label>
                                <input
                                    type="text"
                                    placeholder="MM/YY"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CVV</label>
                                <input
                                    type="text"
                                    placeholder="123"
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-end">
                <button
                    onClick={handlePayment}
                    disabled={processing}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                    {processing ? (
                        <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                        </div>
                    ) : (
                        'Pay Now'
                    )}
                </button>
            </div>
        </div>
    );
};

export default PaymentDetail;
