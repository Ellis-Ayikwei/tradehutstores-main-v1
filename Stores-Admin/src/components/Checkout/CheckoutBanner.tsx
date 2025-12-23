'use client';

import { faCreditCard, faLock, faMoneyBill, faShieldAlt, faTruck, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface CheckoutBannerProps {
    onGuestCheckout: () => void;
    onSignInCheckout: () => void;
}

export default function CheckoutBanner({ onGuestCheckout, onSignInCheckout }: CheckoutBannerProps) {
    const [selectedPayment, setSelectedPayment] = useState<string>('card');

    const paymentMethods = [
        {
            id: 'card',
            name: 'Credit/Debit Card',
            icon: faCreditCard,
            description: 'Secure payment with credit or debit card',
        },
        {
            id: 'cod',
            name: 'Cash on Delivery',
            icon: faMoneyBill,
            description: 'Pay when you receive your order',
        },
    ];

    return (
        <Card className="mb-8">
            <div className="space-y-6">
                {/* Payment Methods */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Payment Method</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paymentMethods.map((method) => (
                            <div
                                key={method.id}
                                className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                                    selectedPayment === method.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-primary-200'
                                }`}
                                onClick={() => setSelectedPayment(method.id)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="flex-shrink-0">
                                        <FontAwesomeIcon icon={method.icon} className={`w-6 h-6 ${selectedPayment === method.id ? 'text-primary-500' : 'text-gray-400'}`} />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">{method.name}</h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{method.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Checkout Options */}
                <div className="border-t dark:border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Checkout Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button variant="outline" size="lg" className="flex items-center justify-center gap-2" onClick={onGuestCheckout}>
                            <FontAwesomeIcon icon={faUser} className="w-4 h-4" />
                            Checkout as Guest
                        </Button>
                        <Button variant="primary" size="lg" className="flex items-center justify-center gap-2" onClick={onSignInCheckout}>
                            <FontAwesomeIcon icon={faLock} className="w-4 h-4" />
                            Sign in to Checkout
                        </Button>
                    </div>
                </div>

                {/* Trust Badges */}
                <div className="border-t dark:border-gray-700 pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                        <div className="space-y-2">
                            <FontAwesomeIcon icon={faShieldAlt} className="w-6 h-6 text-primary-500" />
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Secure Payment</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">256-bit SSL encryption</p>
                        </div>
                        <div className="space-y-2">
                            <FontAwesomeIcon icon={faTruck} className="w-6 h-6 text-primary-500" />
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Fast Delivery</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">2-4 business days</p>
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-1">
                            <FontAwesomeIcon icon={faMoneyBill} className="w-6 h-6 text-primary-500" />
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Money-Back Guarantee</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">30-day return policy</p>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}
