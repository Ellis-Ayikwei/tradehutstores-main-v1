'use client';

import { faBitcoin, faCcMastercard, faCcVisa, faGooglePay, faPaypal } from '@fortawesome/free-brands-svg-icons';
import { faCreditCard, faLock, faMoneyBill, faPhone, faShieldAlt, faTimes, faTruck, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { Button } from '../ui/Button';
import GuestCheckoutFlow from './GuestCheckoutFlow';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    total: number;
    onGuestCheckout: () => void;
    onSignInCheckout: () => void;
}

interface PaymentMethod {
    id: string;
    name: string;
    icon: any;
    description: string;
    brands?: { icon: any; name: string }[];
    fields?: { name: string; type: string; placeholder: string; mask?: string }[];
}

export default function CheckoutModal({ isOpen, onClose, total, onGuestCheckout, onSignInCheckout }: CheckoutModalProps) {
    const [selectedPayment, setSelectedPayment] = useState<string>('card');
    const [cardDetails, setCardDetails] = useState({
        number: '',
        name: '',
        expiry: '',
        cvv: '',
    });
    const [mobileNumber, setMobileNumber] = useState('');
    const [showGuestCheckout, setShowGuestCheckout] = useState(false);

    const paymentMethods: PaymentMethod[] = [
        {
            id: 'card',
            name: 'Credit/Debit Card',
            icon: faCreditCard,
            description: 'Pay securely with your card',
            brands: [
                { icon: faCcVisa, name: 'Visa' },
                { icon: faCcMastercard, name: 'Mastercard' },
            ],
            fields: [
                { name: 'number', type: 'text', placeholder: 'Card Number', mask: '0000 0000 0000 0000' },
                { name: 'name', type: 'text', placeholder: 'Cardholder Name' },
                { name: 'expiry', type: 'text', placeholder: 'MM/YY', mask: '00/00' },
                { name: 'cvv', type: 'text', placeholder: 'CVV', mask: '000' },
            ],
        },
        {
            id: 'mobile',
            name: 'Mobile Money',
            icon: faPhone,
            description: 'Pay with Mobile Money',
            fields: [{ name: 'mobile', type: 'tel', placeholder: 'Mobile Number' }],
        },
        {
            id: 'paypal',
            name: 'PayPal',
            icon: faPaypal,
            description: 'Pay with your PayPal account',
            brands: [
                { icon: faPaypal, name: 'PayPal' },
                { icon: faGooglePay, name: 'Google Pay' },
            ],
        },
        {
            id: 'crypto',
            name: 'Cryptocurrency',
            icon: faBitcoin,
            description: 'Pay with Bitcoin, Ethereum, etc.',
        },
        {
            id: 'cod',
            name: 'Cash on Delivery',
            icon: faMoneyBill,
            description: 'Pay when you receive',
        },
    ];

    const renderPaymentFields = () => {
        const method = paymentMethods.find((m) => m.id === selectedPayment);
        if (!method?.fields) return null;

        return (
            <div className="mt-4 space-y-4">
                {method.id === 'card' && (
                    <div className="flex gap-4 mb-4">
                        {method.brands?.map((brand) => (
                            <div key={brand.name} className="text-center">
                                <FontAwesomeIcon icon={brand.icon} className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                                <p className="text-xs mt-1 text-gray-500">{brand.name}</p>
                            </div>
                        ))}
                    </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {method.fields.map((field) => (
                        <div key={field.name} className={field.name === 'number' ? 'md:col-span-2' : ''}>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{field.placeholder}</label>
                            <input
                                type={field.type}
                                placeholder={field.placeholder}
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                                value={field.name === 'mobile' ? mobileNumber : cardDetails[field.name as keyof typeof cardDetails]}
                                onChange={(e) => {
                                    if (field.name === 'mobile') {
                                        setMobileNumber(e.target.value);
                                    } else {
                                        setCardDetails((prev) => ({
                                            ...prev,
                                            [field.name]: e.target.value,
                                        }));
                                    }
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (showGuestCheckout) {
        return <GuestCheckoutFlow isOpen={isOpen} onClose={onClose} onBack={() => setShowGuestCheckout(false)} total={total} />;
    }

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white">
                                        Checkout
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                        <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* Order Summary */}
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Amount</span>
                                            <span className="text-2xl font-bold text-primary-500">${total.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Payment Methods */}
                                    <div>
                                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Payment Method</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {paymentMethods.map((method) => (
                                                <div
                                                    key={method.id}
                                                    className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                                                        selectedPayment === method.id
                                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                                            : 'border-gray-200 dark:border-gray-700 hover:border-primary-200'
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

                                        {/* Payment Method Fields */}
                                        {renderPaymentFields()}
                                    </div>

                                    {/* Checkout Options */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Button variant="outline" size="lg" className="flex items-center justify-center gap-2" onClick={() => setShowGuestCheckout(true)}>
                                            <FontAwesomeIcon icon={faUser} className="w-4 h-4" />
                                            Checkout as Guest
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            className="flex items-center justify-center gap-2"
                                            onClick={() => {
                                                onSignInCheckout();
                                                onClose();
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faLock} className="w-4 h-4" />
                                            Sign in to Checkout
                                        </Button>
                                    </div>

                                    {/* Trust Badges */}
                                    <div className="grid grid-cols-3 gap-4 text-center border-t dark:border-gray-700 pt-6">
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
                                        <div className="space-y-2">
                                            <FontAwesomeIcon icon={faMoneyBill} className="w-6 h-6 text-primary-500" />
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">Money-Back</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">30-day return policy</p>
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
