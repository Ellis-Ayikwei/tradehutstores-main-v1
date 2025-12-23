import { faBox, faCalendar, faCheck, faCreditCard, faLocationDot, faMoneyBill, faStar, faTruck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

interface Provider {
    id: string;
    name: string;
    image: string;
    rating: number;
    reviewCount: number;
    price: number;
    vehicleType: string;
    availableTime: string;
}

interface ServiceRequest {
    id: string;
    pickupLocation: string;
    dropoffLocation: string;
    itemType: string;
    itemSize: string;
    preferredTime: string;
    description?: string;
}

const BookingConfirmation: React.FC = () => {
    const { requestId, providerId } = useParams<{ requestId: string; providerId: string }>();
    const navigate = useNavigate();
    const [provider, setProvider] = useState<Provider | null>(null);
    const [serviceRequest, setServiceRequest] = useState<ServiceRequest | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<string>('credit_card');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [specialInstructions, setSpecialInstructions] = useState<string>('');

    useEffect(() => {
        // In a real app, this would be an API call
        const fetchData = async () => {
            try {
                // Simulate API call
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Mock service request
                const mockServiceRequest: ServiceRequest = {
                    id: requestId || 'REQ-12345',
                    pickupLocation: '123 Main St, New York, NY',
                    dropoffLocation: '456 Park Ave, New York, NY',
                    itemType: 'Furniture',
                    itemSize: 'Large',
                    preferredTime: '2023-06-20T09:00:00',
                    description: 'Large sofa and coffee table',
                };

                // Mock provider
                const mockProvider: Provider = {
                    id: providerId || 'P-123',
                    name: 'Express Movers',
                    image: 'https://via.placeholder.com/150',
                    rating: 4.8,
                    reviewCount: 124,
                    price: 120,
                    vehicleType: 'Cargo Van',
                    availableTime: '2023-06-20T10:00:00',
                };

                setServiceRequest(mockServiceRequest);
                setProvider(mockProvider);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching data:', err);
                setError('Failed to load booking details. Please try again.');
                setLoading(false);
            }
        };

        fetchData();
    }, [requestId, providerId]);

    const handleConfirmBooking = async () => {
        try {
            setIsSubmitting(true);

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Mock booking ID
            const bookingId = `BK-${Math.floor(10000 + Math.random() * 90000)}`;

            // Redirect to tracking page
            navigate(`/tracking/${bookingId}`);
        } catch (err) {
            console.error('Error confirming booking:', err);
            setError('Failed to confirm booking. Please try again.');
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
            </div>
        );
    }

    if (!serviceRequest || !provider) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">Booking details not found.</div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-6">
                <Link to={`/providers/${requestId}`} className="text-blue-600 hover:text-blue-800">
                    &larr; Back to Providers
                </Link>
            </div>

            <h1 className="text-2xl font-bold mb-6">Confirm Your Booking</h1>

            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Service Request Details */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Service Request Details</h2>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="mb-4">
                                <div className="text-sm text-gray-500">Pickup Location</div>
                                <div className="flex items-start">
                                    <FontAwesomeIcon icon={faLocationDot} className="text-red-500 mt-1 mr-2 flex-shrink-0" />
                                    <div>{serviceRequest.pickupLocation}</div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="text-sm text-gray-500">Dropoff Location</div>
                                <div className="flex items-start">
                                    <FontAwesomeIcon icon={faLocationDot} className="text-green-500 mt-1 mr-2 flex-shrink-0" />
                                    <div>{serviceRequest.dropoffLocation}</div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="text-sm text-gray-500">Item Details</div>
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faBox} className="text-gray-400 mr-2" />
                                    <span>
                                        {serviceRequest.itemType} - {serviceRequest.itemSize}
                                    </span>
                                </div>
                                {serviceRequest.description && <div className="mt-1 text-sm text-gray-600 ml-6">{serviceRequest.description}</div>}
                            </div>

                            <div>
                                <div className="text-sm text-gray-500">Preferred Time</div>
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faCalendar} className="text-gray-400 mr-2" />
                                    <span>{new Date(serviceRequest.preferredTime).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Provider Details */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4">Provider Details</h2>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center mb-4">
                                <img
                                    src={provider.image}
                                    alt={provider.name}
                                    className="w-16 h-16 object-cover rounded-full mr-4"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = 'https://via.placeholder.com/150?text=Provider';
                                    }}
                                />
                                <div>
                                    <div className="font-medium">{provider.name}</div>
                                    <div className="flex items-center text-sm">
                                        <FontAwesomeIcon icon={faStar} className="text-yellow-400 mr-1" />
                                        <span>{provider.rating}</span>
                                        <span className="text-gray-500 ml-1">({provider.reviewCount} reviews)</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="text-sm text-gray-500">Vehicle Type</div>
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faTruck} className="text-gray-400 mr-2" />
                                    <span>{provider.vehicleType}</span>
                                </div>
                            </div>

                            <div className="mb-4">
                                <div className="text-sm text-gray-500">Available Time</div>
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faCalendar} className="text-gray-400 mr-2" />
                                    <span>{new Date(provider.availableTime).toLocaleString()}</span>
                                </div>
                            </div>

                            <div>
                                <div className="text-sm text-gray-500">Price</div>
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={faMoneyBill} className="text-gray-400 mr-2" />
                                    <span className="text-lg font-semibold">${provider.price.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Special Instructions */}
                <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-4">Special Instructions (Optional)</h2>
                    <textarea
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Add any special instructions for the provider..."
                    ></textarea>
                </div>

                {/* Payment Method */}
                <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
                    <div className="space-y-4">
                        <label className="flex items-center p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="credit_card"
                                checked={paymentMethod === 'credit_card'}
                                onChange={() => setPaymentMethod('credit_card')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <div className="ml-3">
                                <span className="flex items-center text-gray-900 font-medium">
                                    <FontAwesomeIcon icon={faCreditCard} className="mr-2 text-blue-600" />
                                    Credit Card
                                </span>
                                <span className="text-sm text-gray-500">Pay securely with your credit card</span>
                            </div>
                        </label>

                        <label className="flex items-center p-4 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                            <input
                                type="radio"
                                name="paymentMethod"
                                value="cash"
                                checked={paymentMethod === 'cash'}
                                onChange={() => setPaymentMethod('cash')}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                            <div className="ml-3">
                                <span className="flex items-center text-gray-900 font-medium">
                                    <FontAwesomeIcon icon={faMoneyBill} className="mr-2 text-green-600" />
                                    Cash on Delivery
                                </span>
                                <span className="text-sm text-gray-500">Pay in cash when your items are delivered</span>
                            </div>
                        </label>
                    </div>
                </div>

                {/* Summary */}
                <div className="border-t border-gray-200 pt-6 mt-6">
                    <h2 className="text-lg font-semibold mb-4">Summary</h2>
                    <div className="flex justify-between mb-2">
                        <span>Service Fee</span>
                        <span>${provider.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                        <span>Platform Fee</span>
                        <span>${(provider.price * 0.1).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2 mt-2">
                        <span>Total</span>
                        <span>${(provider.price * 1.1).toFixed(2)}</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:justify-between items-center mt-6">
                    <p className="text-gray-500 mb-4 sm:mb-0">
                        By confirming, you agree to our{' '}
                        <Link to="/terms" className="text-blue-600">
                            Terms of Service
                        </Link>
                    </p>
                    <button
                        onClick={handleConfirmBooking}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded flex items-center justify-center disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                                Processing...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faCheck} className="mr-2" />
                                Confirm Booking
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BookingConfirmation;
