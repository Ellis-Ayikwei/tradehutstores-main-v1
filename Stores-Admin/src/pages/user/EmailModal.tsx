import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import showMessage from '../../helper/showMessage';
import axiosInstance from '../../services/axiosInstance';
import { Mail, User, Phone, X, Loader, ShieldCheck, ArrowRight, Clock, Star, CircleCheck, Truck, Gift, Headphones } from 'lucide-react';

interface EmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (userData: GuestUserData) => void;
    title?: string;
    subtitle?: string;
}

interface GuestUserData {
    name: string;
    email: string;
    phone: string;
    user_id: string;
}

const EmailModal: React.FC<EmailModalProps> = ({ isOpen, onClose, onSubmit, title = 'Get Your Instant Quote! 🚚✨', subtitle = "Join thousands of happy customers who've moved with us" }) => {
    const [formData, setFormData] = useState<GuestUserData>({
        name: '',
        email: '',
        phone: '',
        user_id: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Partial<GuestUserData>>({});

    const validateForm = (): boolean => {
        const newErrors: Partial<GuestUserData> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!formData.phone.trim()) {
            newErrors.phone = 'Phone number is required';
        } else if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
            newErrors.phone = 'Please enter a valid phone number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof GuestUserData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Create or get existing user
            const names = formData.name.trim().split(' ');
            const firstName = names[0] || '';
            const lastName = names.slice(1).join(' ') || '';

            const response = await axiosInstance.post('/users/create_customer/', {
                first_name: firstName,
                last_name: lastName,
                email: formData.email.trim().toLowerCase(),
                phone_number: formData.phone.trim(),
                user_type: 'customer',
            });

            if (response.status === 200 || response.status === 201) {
                showMessage('Contact details saved successfully!', 'success');
                formData.user_id = response.data.user_id;
                console.log('the response to check the user id ', response);

                // Save user details to localStorage for subsequent requests
                const userDetails = {
                    user_id: response.data.id,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    first_name: response.data.first_name || formData.name.split(' ')[0],
                    last_name: response.data.last_name || formData.name.split(' ').slice(1).join(' '),
                    savedAt: new Date().toISOString(),
                };

                localStorage.setItem('guestUserDetails', JSON.stringify(userDetails));
                console.log('User details saved to localStorage:', userDetails);

                onSubmit(formData);
                onClose();
            }
        } catch (error: any) {
            console.error('Error creating/getting guest user:', error);
            showMessage('Failed to save contact details. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSubmit(e);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={handleBackdropClick}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-400/20 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-400/20 to-transparent rounded-full translate-y-12 -translate-x-12"></div>

                    {/* Header */}
                    <div className="relative overflow-hidden">
                        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-8 py-6 relative">
                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors bg-white/10 rounded-full w-8 h-8 flex items-center justify-center hover:bg-white/20"
                            >
                                <X size={16} />
                            </button>

                            <div className="text-center">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: 'spring' }}
                                    className="bg-white/15 backdrop-blur-sm rounded-2xl p-4 inline-block mb-4"
                                >
                                    <Truck size={32} className="text-white" />
                                </motion.div>
                                <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
                                <p className="text-blue-100">{subtitle}</p>
                            </div>

                            {/* Trust Indicators */}
                        </div>
                    </div>

                    {/* Form */}
                    <div className="px-8 py-6">
                        <div className="text-center mb-6">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Let's get you the perfect quote! 📋</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Just a few quick details and you'll receive personalized pricing</p>
                        </div>

                        <div className="space-y-5" onKeyPress={handleKeyPress}>
                            {/* Name Field */}
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    What should we call you? <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <User size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-gray-50 focus:bg-white ${
                                            errors.name ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        placeholder="Your full name"
                                    />
                                </div>
                                {errors.name && (
                                    <p className="mt-2 text-sm text-red-500 flex items-center space-x-1">
                                        <span>⚠️</span>
                                        <span>{errors.name}</span>
                                    </p>
                                )}
                            </motion.div>

                            {/* Email Field */}
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Email for quotes & updates <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <Mail size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-gray-50 focus:bg-white ${
                                            errors.email ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        placeholder="your.email@example.com"
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-2 text-sm text-red-500 flex items-center space-x-1">
                                        <span>⚠️</span>
                                        <span>{errors.email}</span>
                                    </p>
                                )}
                            </motion.div>

                            {/* Phone Field */}
                            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 }}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Phone for quick coordination <span className="text-red-500">*</span>
                                </label>
                                <div className="relative group">
                                    <Phone size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        className={`w-full pl-12 pr-4 py-4 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 dark:bg-gray-800 dark:border-gray-600 dark:text-white bg-gray-50 focus:bg-white ${
                                            errors.phone ? 'border-red-500' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                        placeholder="+44 7XXX XXXXXX"
                                    />
                                </div>
                                {errors.phone && (
                                    <p className="mt-2 text-sm text-red-500 flex items-center space-x-1">
                                        <span>⚠️</span>
                                        <span>{errors.phone}</span>
                                    </p>
                                )}
                            </motion.div>

                            {/* Privacy Notice - More Subtle */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.9 }}
                                className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-4 border border-green-200 dark:border-gray-600"
                            >
                                <div className="flex items-start space-x-3">
                                    <ShieldCheck size={20} className="text-green-600 dark:text-green-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300">
                                            <span className="font-semibold text-green-700 dark:text-green-400">100% Secure & Private</span> • We\'ll send you personalized quotes and important updates
                                            about your move. No spam, ever! 🛡️
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            {/* Submit Button */}
                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.0 }}
                                onClick={(e) => handleSubmit(e)}
                                disabled={isSubmitting}
                                className={`w-full bg-gradient-to-r from-secondary-400 to-secondary-700 hover:from-secondary/80 hover:to-secondary/80 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                                    isSubmitting ? 'opacity-50 cursor-not-allowed transform-none' : ''
                                }`}
                                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader size={20} className="animate-spin" />
                                        <span>Getting your quotes ready...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Get Prices</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </motion.button>
                        </div>

                        {/* Footer Note */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="text-center mt-6">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Average response time: Under 5 minutes • 📱 Available 24/7</p>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default EmailModal;
