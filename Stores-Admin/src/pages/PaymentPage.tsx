import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import PaymentMethods from '../components/Payment/PaymentMethods';
import PaymentHistory from '../components/Payment/PaymentHistory';
import PaymentForm from '../components/Payment/PaymentForm';
import PaymentAmountInput from '../components/Payment/PaymentAmountInput';
import PaymentStatus from '../components/Payment/PaymentStatus';
import PaymentAnalytics from '../components/Payment/PaymentAnalytics';
import PaymentNotifications from '../components/Payment/PaymentNotifications';

const PaymentPage: React.FC = () => {
    const { requestId } = useParams();
    const [showPaymentForm, setShowPaymentForm] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [currentPayment, setCurrentPayment] = useState<any>(null);

    // Sample analytics data for demonstration
    const analyticsData = {
        totalSpent: 1250.75,
        paymentCount: 8,
        averageAmount: 156.34,
        paymentMethods: [
            { type: 'credit card', count: 5 },
            { type: 'paypal', count: 2 },
            { type: 'bank transfer', count: 1 },
        ],
    };

    useEffect(() => {
        // Fetch payments based on requestId
        if (requestId) {
            // TODO: Implement payment fetching logic
            setCurrentPayment({
                id: '123',
                status: 'completed',
                amount: 150.0,
                transactionId: 'TRX-789012',
            });
        }
    }, [requestId]);

    const handlePaymentSuccess = () => {
        setShowPaymentForm(false);
        // TODO: Refresh payment history
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <div className="mb-8">
                        <PaymentAnalytics {...analyticsData} />
                    </div>

                    <Tab.Group>
                        <Tab.List className="flex space-x-4 mb-6">
                            <Tab className={({ selected }) => `px-4 py-2 rounded-lg font-medium ${selected ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Payment Methods</Tab>
                            <Tab className={({ selected }) => `px-4 py-2 rounded-lg font-medium ${selected ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>Payment History</Tab>
                        </Tab.List>

                        <Tab.Panels>
                            <Tab.Panel>
                                <PaymentMethods />
                            </Tab.Panel>
                            <Tab.Panel>
                                <PaymentHistory requestId={requestId || ''} />
                            </Tab.Panel>
                        </Tab.Panels>
                    </Tab.Group>

                    {requestId && (
                        <div className="mt-8">
                            <button onClick={() => setShowPaymentForm(true)} className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                                Make Payment
                            </button>
                        </div>
                    )}

                    {showPaymentForm && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                            <div className="bg-white rounded-lg p-6 max-w-md w-full">
                                <h2 className="text-xl font-semibold mb-4">Make Payment</h2>
                                <PaymentAmountInput initialAmount={paymentAmount} onAmountChange={setPaymentAmount} />
                                <PaymentForm amount={paymentAmount} requestId={requestId || ''} onSuccess={handlePaymentSuccess} />
                            </div>
                        </div>
                    )}

                    {currentPayment && (
                        <div className="mt-8">
                            <PaymentStatus status={currentPayment.status} message={`Transaction ID: ${currentPayment.transactionId}`} />
                        </div>
                    )}
                </div>

                <div className="lg:col-span-1">
                    <PaymentNotifications />
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
