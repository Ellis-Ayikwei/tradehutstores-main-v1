'use client';

import { faArrowLeft, faHeadset } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { Button } from '../ui/Button';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

interface GuestCheckoutFlowProps {
    isOpen: boolean;
    onClose: () => void;
    onBack: () => void;
    total: number;
}

interface CheckoutStep {
    title: string;
    fields: {
        name: string;
        label: string;
        type: string;
        placeholder: string;
        required?: boolean;
        options?: string[];
    }[];
}

export default function GuestCheckoutFlow({ isOpen, onClose, onBack, total }: GuestCheckoutFlowProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState({
        // Personal Information
        firstName: '',
        lastName: '',
        email: '',
        phone: '',

        // Shipping Information
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        deliveryInstructions: '',

        // Additional Preferences
        receiveUpdates: false,
        preferredContact: 'email',
    });

    const steps: CheckoutStep[] = [
        {
            title: 'Personal Information',
            fields: [
                { name: 'firstName', label: 'First Name', type: 'text', placeholder: 'John', required: true },
                { name: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Doe', required: true },
                { name: 'email', label: 'Email Address', type: 'email', placeholder: 'john@example.com', required: true },
                { name: 'phone', label: 'Phone Number', type: 'tel', placeholder: '+1234567890', required: true },
            ],
        },
        {
            title: 'Shipping Information',
            fields: [
                { name: 'address', label: 'Street Address', type: 'text', placeholder: '123 Main St', required: true },
                { name: 'city', label: 'City', type: 'text', placeholder: 'New York', required: true },
                { name: 'state', label: 'State/Province', type: 'text', placeholder: 'NY', required: true },
                { name: 'zipCode', label: 'ZIP/Postal Code', type: 'text', placeholder: '10001', required: true },
                { name: 'country', label: 'Country', type: 'select', placeholder: 'Select Country', required: true, options: ['United States', 'Canada', 'United Kingdom', 'Australia'] },
                { name: 'deliveryInstructions', label: 'Delivery Instructions', type: 'textarea', placeholder: 'Any special instructions for delivery?' },
            ],
        },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        }));
    };

    const handleWhatsAppSupport = () => {
        // Replace with your actual WhatsApp business number
        const whatsappNumber = '+1234567890';
        const message = encodeURIComponent(`Hi! I need help with my order #${Date.now().toString().slice(-6)}`);
        window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
    };

    const isStepValid = () => {
        const currentFields = steps[currentStep].fields;
        return currentFields.every((field) => !field.required || formData[field.name as keyof typeof formData]);
    };

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
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <button onClick={onBack} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                            <FontAwesomeIcon icon={faArrowLeft} className="w-5 h-5" />
                                        </button>
                                        <Dialog.Title as="h3" className="text-2xl font-bold text-gray-900 dark:text-white">
                                            Guest Checkout - Step {currentStep + 1}
                                        </Dialog.Title>
                                    </div>
                                    <button onClick={handleWhatsAppSupport} className="flex items-center gap-2 text-green-500 hover:text-green-600">
                                        <FontAwesomeIcon icon={faWhatsapp} className="w-5 h-5" />
                                        <span className="text-sm">Need Help?</span>
                                    </button>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-8">
                                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-6">
                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">{steps[currentStep].title}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {steps[currentStep].fields.map((field) => (
                                            <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    {field.label}
                                                    {field.required && <span className="text-red-500">*</span>}
                                                </label>
                                                {field.type === 'select' ? (
                                                    <select
                                                        name={field.name}
                                                        value={formData[field.name as keyof typeof formData] as string}
                                                        onChange={handleInputChange}
                                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                                                    >
                                                        <option value="">{field.placeholder}</option>
                                                        {field.options?.map((option) => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : field.type === 'textarea' ? (
                                                    <textarea
                                                        name={field.name}
                                                        value={formData[field.name as keyof typeof formData] as string}
                                                        onChange={handleInputChange}
                                                        rows={4}
                                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                                                        placeholder={field.placeholder}
                                                    />
                                                ) : (
                                                    <input
                                                        type={field.type}
                                                        name={field.name}
                                                        value={formData[field.name as keyof typeof formData] as string}
                                                        onChange={handleInputChange}
                                                        placeholder={field.placeholder}
                                                        className="w-full rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:ring-primary-500 focus:border-primary-500"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Support Section */}
                                <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center gap-4">
                                        <FontAwesomeIcon icon={faHeadset} className="w-6 h-6 text-primary-500" />
                                        <div>
                                            <h5 className="font-medium text-gray-900 dark:text-white">Need Assistance?</h5>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Our support team is available 24/7 via WhatsApp</p>
                                        </div>
                                        <Button variant="outline" className="ml-auto" onClick={handleWhatsAppSupport}>
                                            <FontAwesomeIcon icon={faWhatsapp} className="mr-2" />
                                            Chat Now
                                        </Button>
                                    </div>
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex justify-between mt-8">
                                    <Button variant="outline" onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))} disabled={currentStep === 0}>
                                        Previous
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            if (currentStep < steps.length - 1) {
                                                setCurrentStep((prev) => prev + 1);
                                            } else {
                                                // Handle final submission
                                                console.log('Form submitted:', formData);
                                                onClose();
                                            }
                                        }}
                                        disabled={!isStepValid()}
                                    >
                                        {currentStep === steps.length - 1 ? 'Complete Order' : 'Next'}
                                    </Button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
