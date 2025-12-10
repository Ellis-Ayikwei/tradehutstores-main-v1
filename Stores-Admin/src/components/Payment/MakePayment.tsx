import React, { useEffect, useState } from 'react';
import { usePayment } from '../../hooks/usePayment';
import { PaymentMethod } from '../../store/slices/paymentSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard, faBuilding, faWallet, faCheck } from '@fortawesome/free-solid-svg-icons';

interface MakePaymentProps {
    requestId: string;
    amount: number;
    onSuccess?: () => void;
    onCancel?: () => void;
}

const MakePayment: React.FC<MakePaymentProps> = ({ requestId, amount, onSuccess, onCancel }) => {
    const { paymentMethods, loading, error, getPaymentMethods, makePayment } = usePayment();
    const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

    useEffect(() => {
        getPaymentMethods();
    }, []);

    const handlePayment = async () => {
        if (!selectedMethod) return;

        try {
            await makePayment({
                request_id: requestId,
                payment_method_id: selectedMethod,
                amount,
                status: 'pending',
                transaction_id: `TXN-${Date.now()}`,
            });
            onSuccess?.();
        } catch (error) {
            console.error('Payment failed:', error);
        }
    };

    const getPaymentIcon = (type: string) => {
        switch (type) {
            case 'card':
                return faCreditCard;
            case 'bank':
                return faBuilding;
            case 'wallet':
                return faWallet;
            default:
                return faCreditCard;
        }
    };

    const getPaymentMethodDisplay = (method: PaymentMethod) => {
        switch (method.payment_type) {
            case 'card':
                return {
                    title: `Card ending in ${method.card_last_four}`,
                    subtitle: method.card_brand,
                };
            case 'bank':
                return {
                    title: `${method.bank_name} - ${method.account_last_four}`,
                    subtitle: 'Bank Account',
                };
            case 'wallet':
                return {
                    title: 'Digital Wallet',
                    subtitle: 'Digital Payment',
                };
            default:
                return {
                    title: 'Unknown Payment Method',
                    subtitle: '',
                };
        }
    };

    if (loading) {
        return <div>Loading payment methods...</div>;
    }

    if (error) {
        return <div className="text-red-500">Error: {error}</div>;
    }

    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Make Payment</h2>
                <div className="mb-4">
                    <p className="text-lg font-medium">Amount: ${amount.toFixed(2)}</p>
                </div>

                <div className="space-y-3">
                    <h3 className="font-medium">Select Payment Method</h3>
                    {paymentMethods.map((method: PaymentMethod) => (
                        <div
                            key={method.id}
                            onClick={() => setSelectedMethod(method.id || null)}
                            className={`p-4 rounded-lg border cursor-pointer ${selectedMethod === method.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <FontAwesomeIcon icon={getPaymentIcon(method.payment_type)} className="text-blue-600 text-xl mr-3" />
                                    <div>
                                        <h4 className="font-medium">{getPaymentMethodDisplay(method).title}</h4>
                                        <p className="text-sm text-gray-500">{getPaymentMethodDisplay(method).subtitle}</p>
                                    </div>
                                </div>
                                {selectedMethod === method.id && (
                                    <span className="text-green-600">
                                        <FontAwesomeIcon icon={faCheck} />
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onCancel} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                        Cancel
                    </button>
                    <button
                        onClick={handlePayment}
                        disabled={!selectedMethod}
                        className={`px-4 py-2 rounded-md text-white ${selectedMethod ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
                    >
                        Pay Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MakePayment;
