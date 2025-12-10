import React, { useState } from 'react';
import { motion } from 'framer-motion';
import QuickQuoteModal from '../modals/QuickQuoteModal';

interface QuickQuoteButtonProps {
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    serviceType?: string;
}

const QuickQuoteButton: React.FC<QuickQuoteButtonProps> = ({ variant = 'primary', size = 'md', className = '', serviceType = 'manvan' }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';

    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700',
        outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-900/20',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    return (
        <>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} onClick={() => setIsModalOpen(true)}>
                Get Quick Quote
            </motion.button>

            <QuickQuoteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} serviceType={serviceType} />
        </>
    );
};

export default QuickQuoteButton;
