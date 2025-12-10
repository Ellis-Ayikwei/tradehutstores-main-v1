import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import AddressAutocomplete from '../ServiceRequest/AddressAutocomplete';
import QuickQuoteModal from '../modals/QuickQuoteModal';
import {
    IconArrowRight,
    IconCheck,
    IconStar,
    IconStarHalf,
    IconMapPin,
    IconCalendar,
    IconUser,
    IconPhone,
    IconMail,
    IconClipboardList,
    IconTruck,
    IconShieldCheck,
    IconCertificate,
    IconClock,
} from '@tabler/icons-react';

interface QuickFormData {
    pickup_location: string;
    dropoff_location: string;
    serviceType: string;
    move_date: string;
    name: string;
    phone: string;
    email: string;
}

const Hero: React.FC = () => {
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [formError, setFormError] = useState('');
    const [isQuickQuoteModalOpen, setIsQuickQuoteModalOpen] = useState(false);
    const [selectedServiceType, setSelectedServiceType] = useState('manvan');
    const [quickFormData, setQuickFormData] = useState<QuickFormData>({
        pickup_location: '',
        dropoff_location: '',
        serviceType: 'home',
        move_date: '',
        name: '',
        phone: '',
        email: '',
    });

    // Service cards data
    const serviceCards = [
        {
            id: 1,
            title: 'Home Moves',
            description: 'Full house relocations',
            image: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
            badge: 'Most popular',
            progress: 70,
            delay: 0,
            icon: IconTruck,
            iconColor: 'text-yellow-400',
            hoverColor: 'group-hover:text-yellow-400',
            badgeColor: 'bg-yellow-500/20 border-yellow-500/30',
            serviceType: 'manvan',
        },
        {
            id: 2,
            title: 'Office Moves',
            description: 'Business relocations',
            image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
            badge: 'Business',
            progress: 60,
            delay: 0.1,
            icon: IconTruck,
            iconColor: 'text-blue-400',
            hoverColor: 'group-hover:text-blue-400',
            badgeColor: 'bg-blue-500/20 border-blue-500/30',
            serviceType: 'manvan',
        },
        {
            id: 3,
            title: 'Man & Van',
            description: 'Small & flexible moves',
            image: 'https://images.unsplash.com/photo-1586864387789-628af9feed72?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
            badge: 'Affordable',
            progress: 65,
            delay: 0.2,
            icon: IconTruck,
            iconColor: 'text-green-400',
            hoverColor: 'group-hover:text-green-400',
            badgeColor: 'bg-green-500/20 border-green-500/30',
            serviceType: 'manvan',
        },
        {
            id: 4,
            title: 'Specialty Items',
            description: 'Pianos & antiques',
            image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
            badge: 'Premium',
            progress: 80,
            delay: 0.3,
            icon: IconTruck,
            iconColor: 'text-purple-400',
            hoverColor: 'group-hover:text-purple-400',
            badgeColor: 'bg-purple-500/20 border-purple-500/30',
            serviceType: 'piano',
        },
    ];

    // Handle input changes for quick quote form
    const handleQuickFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setQuickFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        if (formError) setFormError('');
    };

    // Submit handler for quick quote form
    const handleQuickFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic form validation
        if (!quickFormData.pickup_location || !quickFormData.dropoff_location) {
            setFormError('Please enter both pickup and delivery locations');
            return;
        }

        if (!quickFormData.move_date) {
            setFormError('Please select a moving date');
            return;
        }

        if (!quickFormData.name || !quickFormData.phone || !quickFormData.email) {
            setFormError('Please complete all contact information');
            return;
        }

        setIsLoadingQuote(true);
        setFormError('');

        try {
            // Simulate API call with timeout
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Map the quick form data to match the structure of the full service request form
            const fullFormData = {
                contact_name: quickFormData.name,
                contact_phone: quickFormData.phone,
                contact_email: quickFormData.email,
                pickup_location: quickFormData.pickup_location,
                dropoff_location: quickFormData.dropoff_location,
                itemType: mapServiceType(quickFormData.serviceType),
                preferred_date: quickFormData.move_date,
                item_size: 'medium',
                preferred_time: '',
                description: '',
                request_type: 'instant',
            };

            // Navigate to the service request form with the collected data
            window.location.href = '/service-request';
        } catch (error) {
            console.error('Error submitting quote request:', error);
            setFormError('There was a problem submitting your request. Please try again.');
        } finally {
            setIsLoadingQuote(false);
        }
    };

    // Map the select dropdown values to match the full form's expected values
    const mapServiceType = (type: string): string => {
        switch (type) {
            case 'home':
                return 'Residential Moving';
            case 'office':
                return 'Office Relocation';
            case 'furniture':
                return 'Furniture Assembly';
            case 'vehicle':
                return 'Vehicle Transportation';
            case 'international':
                return 'International Moving';
            case 'specialty':
                return 'Specialty Items';
            case 'storage':
                return 'Storage Services';
            default:
                return 'Residential Moving';
        }
    };

    return (
        <section className="relative min-h-[90vh] pt-28 lg:pt-32 pb-24 lg:pb-32 overflow-hidden">
            {/* Ultra Modern Background */}
            <div className="absolute inset-0">
                {/* Base gradient using system colors */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-secondary/60"></div>
                
               
                
         
</div>

            <div className="max-w-[100vw] mx-auto px-2 sm:px-2 lg:px-16 relative z-20">
                <div className="flex flex-col lg:flex-row items-center">
                    {/* Enhanced Content Column */}
                    <motion.div className="lg:w-1/2 mb-16 lg:mb-0 text-white px-4 lg:px-0" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
                        <div className="relative">
                            {/* Pre-heading accent */}
                            <motion.div
                                className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs sm:text-sm font-medium text-white mb-4 sm:mb-6 border border-white/20 text-center mx-auto sm:mx-0 block sm:inline-block"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.6 }}
                            >
                                <span className="flex items-center justify-center">
                                    <span className="w-2 h-2 rounded-full bg-secondary mr-1.5 animate-pulse"></span>
                                    Trusted by 15,000+ customers
                                </span>
                            </motion.div>

                            {/* Main heading with enhanced animation */}
                            <motion.h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 text-white leading-tight bg-clip-text text-center sm:text-left">
                                <div className="overflow-hidden">
                                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.4, ease: [0.33, 1, 0.68, 1] }} className="font-Charlie font-bold">
                                        Moving Made
                                    </motion.div>
                                </div>
                                <div className="overflow-hidden">
                                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.6, ease: [0.33, 1, 0.68, 1] }} className="relative">
                                        <span className="relative inline-block text-white/65 text-7xl sm:text-8xl lg:text-9xl xl:text-[12rem] font-Charlie font-bold">
                                            Simple
                                        </span>
                                    </motion.div>
                                </div>
                            </motion.h1>

                            {/* Enhanced description */}
                            <motion.p
                                className="text-lg md:text-xl text-white/80 mb-8 max-w-xl text-center sm:text-left mx-auto sm:mx-0"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8, duration: 0.6 }}
                            >
                                Connect with trusted moving professionals. Get instant quotes, compare prices, and book your move with confidence.
                            </motion.p>

                            {/* Enhanced Trust Badges with CTA for mobile */}
                            <motion.div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3 mb-8 sm:mb-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1 }}>
                                {/* Mobile CTA Button */}
                                <motion.button
                                    onClick={() => {
                                        setSelectedServiceType('manvan');
                                        setIsQuickQuoteModalOpen(true);
                                    }}
                                    className="sm:hidden w-full py-4 rounded-lg font-medium text-lg flex items-center justify-center transition-all bg-secondary"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <span className="relative z-10">Get Instant Prices</span>
                                    <motion.span className="ml-2 z-10" animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
                                        <IconArrowRight className="w-5 h-5" />
                                    </motion.span>
                                </motion.button>

                                {/* Trust Badges (hidden on mobile) */}
                                <motion.div
                                    className="hidden sm:flex items-center px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/10 shadow-lg flex-1"
                                    whileHover={{ y: -3, backgroundColor: 'rgba(255,255,255,0.15)' }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                >
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary/20 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                                        <IconShieldCheck className="w-3 h-3 sm:w-4 sm:h-4 text-secondary" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Verified Providers</span>
                                </motion.div>

                                <motion.div
                                    className="hidden sm:flex items-center px-2 sm:px-3 py-2 sm:py-2.5 rounded-lg bg-gradient-to-r from-white/10 to-white/5 backdrop-blur-sm border border-white/10 shadow-lg flex-1"
                                    whileHover={{ y: -3, backgroundColor: 'rgba(255,255,255,0.15)' }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                                >
                                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary/20 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                                        <IconClock className="w-3 h-3 sm:w-4 sm:h-4 text-secondary" />
                                    </div>
                                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">24/7 Support</span>
                                </motion.div>
                            </motion.div>

                            {/* Enhanced Quick Quote Form */}
                            <motion.div
                                className="hidden lg:block bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 1.2, duration: 0.6 }}
                            >
                                <form onSubmit={handleQuickFormSubmit} className="space-y-4">
                                    {/* Service Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/90 mb-2">What do you need to move?</label>
                                        <div className="relative">
                                            <select
                                                name="serviceType"
                                                value={quickFormData.serviceType}
                                                onChange={handleQuickFormChange}
                                                className="w-full pl-10 pr-12 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent appearance-none transition"
                                            >
                                                <option value="home" className="bg-gray-800 text-white">
                                                    Home Move
                                                </option>
                                                <option value="office" className="bg-gray-800 text-white">
                                                    Office Move
                                                </option>
                                                <option value="furniture" className="bg-gray-800 text-white">
                                                    Single Item/Furniture
                                                </option>
                                                <option value="vehicle" className="bg-gray-800 text-white">
                                                    Vehicle Transport
                                                </option>
                                                <option value="international" className="bg-gray-800 text-white">
                                                    International Move
                                                </option>
                                                <option value="specialty" className="bg-gray-800 text-white">
                                                    Specialty Item
                                                </option>
                                                <option value="storage" className="bg-gray-800 text-white">
                                                    Storage Service
                                                </option>
                                            </select>
                                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary">
                                                <IconClipboardList className="w-5 h-5" />
                                            </div>
                                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-white/50">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Pickup Location */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/90 mb-2">Pickup Location</label>
                                        <div className="relative">
                                            <IconMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5 z-10" />
                                            <AddressAutocomplete
                                                name="pickup_location"
                                                value={quickFormData.pickup_location}
                                                onChange={(value, coords) => {
                                                    setQuickFormData(prev => ({
                                                        ...prev,
                                                        pickup_location: value
                                                    }));
                                                }}
                                                placeholder="Enter pickup address"
                                                className="[&_input]:w-full [&_input]:pl-10 [&_input]:pr-4 [&_input]:py-3 [&_input]:rounded-lg [&_input]:bg-white/5 [&_input]:border [&_input]:border-white/20 [&_input]:text-white [&_input]:placeholder-white/50 [&_input]:backdrop-blur-sm [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-secondary [&_input]:focus:border-transparent [&_input]:transition [&_.pac-container]:bg-gray-800 [&_.pac-container]:border-white/20 [&_.pac-item]:text-white/90 [&_.pac-item]:hover:bg-white/10 [&_.pac-item-query]:text-white [&_.pac-matched]:text-secondary"
                                            />
                                        </div>
                                    </div>

                                    {/* Dropoff Location */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/90 mb-2">Dropoff Location</label>
                                        <div className="relative">
                                            <IconMapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5 z-10" />
                                            <AddressAutocomplete
                                                name="dropoff_location"
                                                value={quickFormData.dropoff_location}
                                                onChange={(value, coords) => {
                                                    setQuickFormData(prev => ({
                                                        ...prev,
                                                        dropoff_location: value
                                                    }));
                                                }}
                                                placeholder="Enter dropoff address"
                                                className="[&_input]:w-full [&_input]:pl-10 [&_input]:pr-4 [&_input]:py-3 [&_input]:rounded-lg [&_input]:bg-white/5 [&_input]:border [&_input]:border-white/20 [&_input]:text-white [&_input]:placeholder-white/50 [&_input]:backdrop-blur-sm [&_input]:focus:outline-none [&_input]:focus:ring-2 [&_input]:focus:ring-secondary [&_input]:focus:border-transparent [&_input]:transition [&_.pac-container]:bg-gray-800 [&_.pac-container]:border-white/20 [&_.pac-item]:text-white/90 [&_.pac-item]:hover:bg-white/10 [&_.pac-item-query]:text-white [&_.pac-matched]:text-secondary"
                                            />
                                        </div>
                                    </div>

                                    {/* Move Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-white/90 mb-2">Move Date</label>
                                        <div className="relative">
                                            <IconCalendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                                            <input
                                                type="date"
                                                name="move_date"
                                                value={quickFormData.move_date}
                                                onChange={handleQuickFormChange}
                                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition"
                                            />
                                        </div>
                                    </div>

                                    {/* Contact Information */}
                                    {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-white/90 mb-2">Your Name</label>
                                            <div className="relative">
                                                <IconUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                                                <input
                                                    type="text"
                                                    name="name"
                                                    value={quickFormData.name}
                                                    onChange={handleQuickFormChange}
                                                    placeholder="Enter your name"
                                                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-white/90 mb-2">Phone Number</label>
                                            <div className="relative">
                                                <IconPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={quickFormData.phone}
                                                    onChange={handleQuickFormChange}
                                                    placeholder="Enter phone number"
                                                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition"
                                                />
                                            </div>
                                        </div>
                                    </div> */}

                                    {/* <div>
                                        <label className="block text-sm font-medium text-white/90 mb-2">Email Address</label>
                                        <div className="relative">
                                            <IconMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary w-5 h-5" />
                                            <input
                                                type="email"
                                                name="email"
                                                value={quickFormData.email}
                                                onChange={handleQuickFormChange}
                                                placeholder="Enter email address"
                                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-transparent transition"
                                            />
                                        </div>
                                    </div> */}

                                    {formError && <div className="text-red-400 text-sm mt-2">{formError}</div>}

                                    <motion.button
                                        type="submit"
                                        disabled={isLoadingQuote}
                                        className="w-full py-4 rounded-lg font-medium text-lg flex items-center justify-center transition-all"
                                        initial={{ background: 'linear-gradient(to right, var(--color-secondary), var(--color-secondary-light))' }}
                                        whileHover={{
                                            scale: 1.02,
                                            boxShadow: '0 10px 25px -5px rgba(var(--color-secondary-rgb), 0.5)',
                                            background: 'linear-gradient(to right, var(--color-secondary-dark), var(--color-secondary))',
                                        }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            background: isLoadingQuote
                                                ? 'linear-gradient(to right, var(--color-secondary-light), var(--color-secondary-lighter))'
                                                : 'linear-gradient(to right, var(--color-secondary), var(--color-secondary-light))',
                                        }}
                                    >
                                        {isLoadingQuote ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path
                                                        className="opacity-75"
                                                        fill="currentColor"
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <span className="relative z-10">Get Instant Prices</span>
                                                <motion.span className="ml-2 z-10" animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}>
                                                    <IconArrowRight className="w-5 h-5" />
                                                </motion.span>
                                            </>
                                        )}
                                    </motion.button>

                                    <p className="text-sm text-white/70 text-center mt-4">
                                        Free, no-obligation quotes. Compare and save.
                                        <span className="block mt-2 opacity-80">
                                            By continuing, you agree to our{' '}
                                            <a href="/terms" className="underline hover:text-white transition-colors">
                                                Terms
                                            </a>{' '}
                                            and{' '}
                                            <a href="/privacy" className="underline hover:text-white transition-colors">
                                                Privacy Policy
                                            </a>
                                        </span>
                                    </p>
                                </form>
                            </motion.div>
                        </div>
                    </motion.div>

                    {/* Enhanced Service Cards Column */}
                    <motion.div className="lg:w-1/2 w-full px-4 lg:px-8" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
                        {/* Hero service grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 sm:gap-6 mx-auto lg:mx-0">
                            {serviceCards.map((card) => (
                                <motion.div
                                    key={card.id}
                                    className="rounded-xl overflow-hidden relative group cursor-pointer h-[200px] sm:h-[260px]"
                                    whileHover={{ y: -8, scale: 1.03 }}
                                    transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0, transition: { delay: card.delay } }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setSelectedServiceType(card.serviceType);
                                        setIsQuickQuoteModalOpen(true);
                                    }}
                                >
                                    {/* Base gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/70 to-black/95 opacity-95 transition-opacity"></div>
                                    <img src={card.image} alt={card.title} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-700 brightness-90" />

                                    {/* Hover reveal overlay with consistent color */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-full group-hover:translate-y-0"></div>

                                    <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 text-white group-hover:text-white transition-colors duration-500">
                                        <div
                                            className={`absolute top-3 right-3 sm:top-4 sm:right-4 backdrop-blur-md rounded-full px-2 py-1 text-xs font-medium border border-white/20 shadow-lg group-hover:bg-white/10 transition-colors duration-500`}
                                        >
                                            {card.badge}
                                        </div>
                                        <h3 className="font-bold text-lg sm:text-2xl transition-colors duration-300 group-hover:text-white drop-shadow-lg group-hover:drop-shadow-none">
                                            {card.title}
                                        </h3>
                                        <div className="hidden group-hover:flex flex-col items-start opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 mt-1 sm:mt-2">
                                            <div className="flex items-center mb-3">
                                                <card.icon className="text-white mr-2 drop-shadow-lg group-hover:drop-shadow-none" />
                                                <span className="text-xs sm:text-sm font-medium drop-shadow-lg group-hover:drop-shadow-none text-white/90">{card.description}</span>
                                            </div>
                                            <motion.button
                                                className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg text-sm font-medium hover:bg-white/30 transition-colors flex items-center gap-2"
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                            >
                                                Get Prices
                                                <IconArrowRight className="w-4 h-4" />
                                            </motion.button>
                                        </div>
                                        <motion.div
                                            className="h-1 bg-gradient-to-r from-secondary to-secondary/50 rounded-full opacity-90 shadow-lg group-hover:from-white group-hover:to-white/50 transition-colors duration-500 mt-2 sm:mt-3"
                                            initial={{ width: '0%' }}
                                            whileInView={{ width: `${card.progress}%` }}
                                            viewport={{ once: true }}
                                            transition={{ delay: 0.5 + card.delay, duration: 1.2, ease: 'easeOut' }}
                                        />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Enhanced Stats Card with natural elements */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.2, duration: 0.6 }}
                            className="bg-white/10 backdrop-blur-md p-3 sm:p-4 md:p-6 rounded-xl shadow-xl border border-white/10 mt-6 sm:mt-8 transform mx-auto lg:mx-0 relative overflow-hidden"
                        >
                            {/* Natural decorative elements */}
                            <div className="absolute -top-8 -right-8 w-32 h-32 bg-secondary/20 rounded-full blur-3xl"></div>
                            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/20 rounded-full blur-3xl"></div>

                            <div className="flex items-center justify-between relative z-10">
                                <motion.div className="flex items-center" whileHover={{ x: 5 }}>
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-secondary/20 flex items-center justify-center border border-secondary/30">
                                        <IconCheck className="w-4 h-4 sm:w-5 sm:h-5 text-secondary" />
                                    </div>
                                    <div className="ml-2 sm:ml-3">
                                        <p className="text-xs sm:text-sm text-white/70">Service Categories</p>
                                        <p className="font-bold text-white text-sm sm:text-base">6+ Categories</p>
                                    </div>
                                </motion.div>

                                <div className="w-px h-10 sm:h-12 bg-white/20 mr-3"></div>

                                <motion.div className="flex items-center" whileHover={{ x: 5 }}>
                                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-yellow-500/20 flex items-center justify-center border border-yellow-500/30">
                                        <IconStar className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                                    </div>
                                    <div className="ml-2 sm:ml-3">
                                        <p className="text-xs sm:text-sm text-white/70">Customer Satisfaction</p>
                                        <p className="font-bold text-white text-sm sm:text-base">98.3%</p>
                                    </div>
                                </motion.div>
                            </div>

                            <div className="mt-4 sm:mt-6 flex justify-center">
                                <motion.button
                                    onClick={() => (window.location.href = '/services')}
                                    className="flex items-center text-white rounded-full px-4 sm:px-6 py-2 sm:py-3 backdrop-blur-sm transition-all overflow-hidden group relative"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-primary/40 to-secondary/40 group-hover:from-primary/50 group-hover:to-secondary/50 transition-colors"></span>
                                    <span className="relative flex items-center text-xs sm:text-sm font-medium">
                                        View all services
                                        <motion.span className="ml-2" animate={{ x: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                            <IconArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </motion.span>
                                    </span>
                                </motion.button>
                            </div>
                        </motion.div>

                        {/* Enhanced Customer satisfaction badge */}
                        <motion.div
                            className="absolute -bottom-6 -right-6 lg:-bottom-8 lg:right-16 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full p-1 shadow-xl hidden sm:block"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.4, duration: 0.8, type: 'spring' }}
                        >
                            <motion.div
                                className="bg-white rounded-full p-3 flex items-center justify-center"
                                animate={{ rotate: [0, 10, 0] }}
                                transition={{
                                    rotate: {
                                        repeat: Infinity,
                                        duration: 5,
                                        ease: 'easeInOut',
                                        type: 'tween',
                                    },
                                }}
                            >
                                <div className="text-center">
                                    <div className="flex justify-center text-amber-500 text-sm sm:text-base mb-1">
                                        <IconStar className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                                        <IconStar className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                                        <IconStar className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                                        <IconStar className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                                        <IconStarHalf className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
                                    </div>
                                    <p className="font-bold text-gray-800 text-xs sm:text-sm">15,742 Moves</p>
                                    <p className="text-xs text-gray-600">and counting!</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>

            {/* Enhanced wave separator with animation */}
            <div className="absolute bottom-0 left-0 right-0">
                <motion.svg
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1 }}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 1440 200"
                    className="fill-white dark:fill-gray-900 w-full"
                >
                    <path d="M0,128L48,133.3C96,139,192,149,288,138.7C384,128,480,96,576,90.7C672,85,768,107,864,122.7C960,139,1056,149,1152,133.3C1248,117,1344,75,1392,53.3L1440,32L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                </motion.svg>
            </div>

            {/* Fixed scroll indicator animation and enhanced hero section */}
            <motion.div
                className="absolute hidden lg:block bottom-14 left-1/2 transform -translate-x-1/2 flex flex-col items-center text-white cursor-pointer z-20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, 10, 0] }}
                transition={{
                    y: {
                        delay: 2,
                        duration: 2,
                        repeat: Infinity,
                        type: 'tween',
                    },
                    opacity: { delay: 2, duration: 1 },
                }}
                onClick={() => (window.location.href = '#services')}
            >
                <span className="text-xs mb-2 text-white/70 mx-auto justify-center">Scroll to explore</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                </svg>
            </motion.div>

            {/* Quick Quote Modal */}
            <QuickQuoteModal 
                isOpen={isQuickQuoteModalOpen} 
                onClose={() => setIsQuickQuoteModalOpen(false)} 
                serviceType={selectedServiceType}
            />
        </section>
    );
};

export default Hero;
