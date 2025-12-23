import React, { useEffect, useState } from 'react';
import { usePayment } from '../../hooks/usePayment';
import { PaymentMethod } from '../../store/slices/paymentSlice';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCreditCard, faBuilding, faWallet, faCheck, faPlus } from '@fortawesome/free-solid-svg-icons';

const PaymentMethods: React.FC = () => {
    const { paymentMethods, loading, error, getPaymentMethods, addNewPaymentMethod, setDefaultMethod } = usePayment();
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMethod, setNewMethod] = useState<Partial<PaymentMethod>>({
        payment_type: 'card',
        is_default: false,
        is_active: true,
    });

    useEffect(() => {
        getPaymentMethods();
    }, []);

    const handleAddMethod = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addNewPaymentMethod(newMethod);
            setShowAddForm(false);
            setNewMethod({
                payment_type: 'card',
                is_default: false,
                is_active: true,
            });
        } catch (error) {
            console.error('Failed to add payment method:', error);
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
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Payment Methods</h2>
                <button onClick={() => setShowAddForm(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center">
                    <FontAwesomeIcon icon={faPlus} className="mr-2" />
                    Add Payment Method
                </button>
            </div>

            {showAddForm && (
                <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-medium mb-4">Add New Payment Method</h3>
                    <form onSubmit={handleAddMethod} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Type</label>
                            <select
                                value={newMethod.payment_type}
                                onChange={(e) => setNewMethod({ ...newMethod, payment_type: e.target.value as any })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                                <option value="card">Credit/Debit Card</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="wallet">Digital Wallet</option>
                            </select>
                        </div>

                        {newMethod.payment_type === 'card' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Card Number</label>
                                    <input type="text" placeholder="1234 5678 9012 3456" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                                        <input type="text" placeholder="MM/YY" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">CVV</label>
                                        <input type="text" placeholder="123" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                                    </div>
                                </div>
                            </>
                        )}

                        {newMethod.payment_type === 'bank' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                                    <input type="text" placeholder="Bank Name" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Account Number</label>
                                    <input type="text" placeholder="Account Number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
                                </div>
                            </>
                        )}

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={newMethod.is_default}
                                onChange={(e) => setNewMethod({ ...newMethod, is_default: e.target.checked })}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label className="ml-2 block text-sm text-gray-700">Set as default payment method</label>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                                Cancel
                            </button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                Add Method
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentMethods.map((method: PaymentMethod) => (
                    <div key={method.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <FontAwesomeIcon icon={getPaymentIcon(method.payment_type)} className="text-blue-600 text-xl mr-3" />
                                <div>
                                    <h3 className="font-medium">{getPaymentMethodDisplay(method).title}</h3>
                                    <p className="text-sm text-gray-500">{getPaymentMethodDisplay(method).subtitle}</p>
                                </div>
                            </div>
                            {method.is_default && (
                                <span className="text-green-600">
                                    <FontAwesomeIcon icon={faCheck} />
                                </span>
                            )}
                        </div>
                        {!method.is_default && (
                            <button onClick={() => method.id && setDefaultMethod(method.id)} className="mt-3 text-sm text-blue-600 hover:text-blue-800">
                                Set as default
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PaymentMethods;
