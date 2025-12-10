import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconMenu2, IconX, IconTruck, IconUser, IconPhone, IconInfoCircle, IconBriefcase } from '@tabler/icons-react';

const Navigation: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const navItems = [
        { name: 'Services', path: '/services', icon: IconBriefcase },
        { name: 'How it Works', path: '/how-it-works', icon: IconInfoCircle },
        { name: 'About', path: '/about', icon: IconInfoCircle },
        { name: 'Blog', path: '/blog', icon: IconInfoCircle },
        { name: 'Contact', path: '/contact', icon: IconPhone },
    ];

    return (
        <nav className="fixed w-full z-50 bg-white/95 backdrop-blur-sm shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link to="/" className="flex items-center space-x-2">
                        <IconTruck className="w-8 h-8 text-primary" />
                        <span className="text-2xl font-bold text-gray-900">MoreVans</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`text-sm font-medium transition-colors ${location.pathname === item.path ? 'text-primary' : 'text-gray-600 hover:text-primary'}`}
                            >
                                {item.name}
                            </Link>
                        ))}
                        <Link
                            to="/contact"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 transition-colors"
                        >
                            Get a Quote
                        </Link>
                    </div>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button onClick={() => setIsOpen(!isOpen)} className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-primary focus:outline-none">
                            {isOpen ? <IconX className="h-6 w-6" /> : <IconMenu2 className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden bg-white border-t">
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                                        location.pathname === item.path ? 'text-primary bg-primary/10' : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                                    }`}
                                    onClick={() => setIsOpen(false)}
                                >
                                    {item.name}
                                </Link>
                            ))}
                            <Link
                                to="/contact"
                                className="block w-full text-center px-3 py-2 rounded-md text-base font-medium text-white bg-primary hover:bg-primary/90"
                                onClick={() => setIsOpen(false)}
                            >
                                Get a Quote
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navigation;
