import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { IconMenu2, IconX, IconHome, IconBriefcase, IconInfoCircle, IconUsers, IconLogin } from '@tabler/icons-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

interface NavbarProps {
    isScrolled: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ isScrolled }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    const navLinks = [
        { to: '/', label: 'Home', icon: IconHome },
        { to: '/services', label: 'Services', icon: IconBriefcase },
        // { to: '/how-it-works', label: 'How it Works', icon: IconInfoCircle },
        // { to: '/blog', label: 'Blog', icon: IconInfoCircle },
        { to: '/about', label: 'About', icon: IconInfoCircle },
        // { to: '/contact', label: 'Contact', icon: IconInfoCircle },
    ];

    const isActive = (path: string) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };

    const toggleMobileMenu = () => {
        setMobileMenuOpen(!mobileMenuOpen);
    };

    return (
        <div className="fixed top-0 left-0 w-full z-50">
            <nav className={`w-full transition-all duration-300 ${isScrolled ? 'bg-white dark:bg-gray-900 shadow-md' : 'bg-transparent'}`}>
                <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                    {/* Logo */}
                        <Link to="/" className="flex items-center flex-shrink-0">
                        <img
                                className={`w-[120px] sm:w-[160px] transition-all duration-300 ${isScrolled ? '' : 'brightness-0 invert'}`}
                            src="/assets/images/morevanstext.png"
                            alt="MoreVans"
                        />
                    </Link>

                    {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
                        {navLinks.map(({ to, label, icon: Icon }) => {
                            const active = isActive(to);
                            return (
                                <Link
                                    key={to}
                                    to={to}
                                        className={`flex items-center text-base lg:text-lg font-medium transition-colors duration-200 ${
                                        active
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : isScrolled
                                            ? 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                                            : 'text-white hover:text-blue-200'
                                    }`}
                                >
                                        <Icon className={`w-5 h-5 lg:w-6 lg:h-6 mr-2 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                                    {label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Auth Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        <Link
                            to="/login"
                                className={`flex items-center text-base lg:text-lg font-medium transition-colors duration-200 ${
                                isScrolled ? 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400' : 'text-white hover:text-blue-200'
                            }`}
                        >
                                <IconLogin className="w-5 h-5 lg:w-6 lg:h-6 mr-2" />
                            Log In
                        </Link>
                        <Link
                            to="/service-request"
                                className={`px-4 lg:px-6 py-2 lg:py-3 rounded-lg text-base lg:text-lg font-medium transition-all duration-200 ${
                                isScrolled ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg' : 'bg-white text-blue-600 hover:bg-blue-50 shadow-md hover:shadow-lg'
                            }`}
                        >
                            Request a Move
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                        <button 
                            onClick={toggleMobileMenu} 
                            className={`md:hidden p-2 rounded-lg transition-colors duration-200 ${
                                isScrolled ? 'text-gray-700 hover:bg-gray-100' : 'text-white hover:bg-white/10'
                            }`}
                        >
                            <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} className="text-xl" />
                    </button>
                </div>
            </div>
            </nav>

            {/* Mobile Menu */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="md:hidden bg-white dark:bg-gray-900 shadow-lg"
                    >
                        <div className="px-4 py-2 space-y-1">
                                {navLinks.map(({ to, label, icon: Icon }) => {
                                    const active = isActive(to);
                                    return (
                                        <Link
                                            key={to}
                                            to={to}
                                        className={`flex items-center px-4 py-2.5 rounded-lg text-base font-medium transition-colors duration-200 ${
                                            active 
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                                            }`}
                                            onClick={() => setMobileMenuOpen(false)}
                                        >
                                        <Icon className={`w-5 h-5 mr-3 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                                            {label}
                                        </Link>
                                    );
                                })}

                            <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                                    <Link
                                        to="/login"
                                    className="flex items-center px-4 py-2.5 text-base text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                    <IconLogin className="w-5 h-5 mr-3" />
                                        Log In
                                    </Link>
                                    <Link
                                        to="/service-request"
                                    className="block mt-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 text-center text-base font-medium"
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        Request a Move
                                    </Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Navbar;
