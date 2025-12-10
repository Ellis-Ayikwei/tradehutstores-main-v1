'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { IconArrowLeft, IconShieldLock, IconTruck, IconClock, IconStar, IconUsers, IconMapPin, IconShieldCheck } from '@tabler/icons-react';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
    showBackButton?: boolean;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle, showBackButton = true }) => {
    const features = [
        {
            icon: IconShieldLock,
            title: 'Secure & Reliable',
            description: 'Your data is protected with enterprise-grade security',
        },
        {
            icon: IconTruck,
            title: 'Nationwide Coverage',
            description: 'Access to trusted van operators across the UK',
        },
        {
            icon: IconClock,
            title: 'Quick & Efficient',
            description: 'Fast booking and real-time tracking',
        },
        {
            icon: IconStar,
            title: 'Verified Providers',
            description: 'All our van operators are thoroughly vetted',
        },
        {
            icon: IconUsers,
            title: 'Trusted Platform',
            description: 'Join thousands of satisfied customers',
        },
        {
            icon: IconMapPin,
            title: 'Local & National',
            description: 'Services available in your area and beyond',
        },
    ];

    return (
        <div className="min-h-screen flex">
            {/* Left side - Form */}
            <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="mx-auto w-full max-w-sm lg:w-96">
                    {/* Logo */}
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                        <div className="flex items-center justify-center mb-4">
                            <motion.div whileHover={{ scale: 1.05, rotate: 5 }} className="bg-gradient-to-r from-blue-600 to-blue-700 p-3 rounded-2xl shadow-lg">
                                <IconTruck className="h-8 w-8 text-white" />
                            </motion.div>
                        </div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">MoreVans</h1>
                        <p className="text-sm text-gray-600 mt-1">Moving made simple</p>
                    </motion.div>

                    {/* Header */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
                        <p className="text-gray-600">{subtitle}</p>
                    </motion.div>

                    {/* Form */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        {children}
                    </motion.div>

                    {/* Footer */}
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 text-center text-sm text-gray-500">
                        <p>© 2024 MoreVans. All rights reserved.</p>
                    </motion.div>
                </div>
            </div>

            {/* Right side - Hero */}
            <div className="hidden lg:block relative flex-1 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 to-blue-800/90"></div>
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }}
                ></div>

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center h-full px-12 py-12">
                    <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="max-w-lg">
                        <h1 className="text-4xl font-bold text-white mb-6 leading-tight">Your Trusted Moving Partner</h1>
                        <p className="text-xl text-blue-100 mb-8 leading-relaxed">Connect with professional movers, get instant quotes, and make your next move stress-free.</p>

                        {/* Features */}
                        <div className="space-y-4">
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="flex items-center text-white">
                                <div className="bg-white/20 rounded-full p-2 mr-4">
                                    <IconShieldCheck className="h-5 w-5" />
                                </div>
                                <span>Verified & insured providers</span>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }} className="flex items-center text-white">
                                <div className="bg-white/20 rounded-full p-2 mr-4">
                                    <IconStar className="h-5 w-5" />
                                </div>
                                <span>Top-rated customer service</span>
                            </motion.div>
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }} className="flex items-center text-white">
                                <div className="bg-white/20 rounded-full p-2 mr-4">
                                    <IconTruck className="h-5 w-5" />
                                </div>
                                <span>Real-time tracking & updates</span>
                            </motion.div>
                        </div>

                        {/* Testimonial */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
                            className="mt-12 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
                        >
                            <div className="flex items-start">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                        <span className="text-white font-semibold">M</span>
                                    </div>
                                </div>
                                <div className="ml-4">
                                    <p className="text-white/90 text-sm italic mb-2">"MoreVans made our office relocation seamless. Professional, reliable, and stress-free!"</p>
                                    <p className="text-white/70 text-xs">- Maria Johnson, Operations Manager</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Floating Elements */}
                <motion.div
                    animate={{
                        y: [0, -10, 0],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    className="absolute top-1/4 right-12 w-16 h-16 bg-white/10 rounded-full backdrop-blur-sm"
                ></motion.div>
                <motion.div
                    animate={{
                        y: [0, 15, 0],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 1,
                    }}
                    className="absolute bottom-1/4 right-24 w-8 h-8 bg-white/20 rounded-full backdrop-blur-sm"
                ></motion.div>
            </div>
        </div>
    );
};

export default AuthLayout;
