import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ContactModal from './ContactModal';

interface FAQItem {
    question: string;
    answer: string;
    category: 'general' | 'repairs' | 'services' | 'payment';
}

const faqData: FAQItem[] = [
    {
        question: 'What services does TradeHut Ghana offer?',
        answer: 'We offer a comprehensive range of services including phone and laptop repairs, device sales, IT support, and web development solutions. Our team of experts ensures professional service delivery for all your tech needs.',
        category: 'general',
    },
    {
        question: 'How long does a typical repair take?',
        answer: "Most repairs are completed within 24-48 hours. However, the exact duration depends on the type of repair and parts availability. We'll provide you with a specific timeline after diagnosing your device.",
        category: 'repairs',
    },
    {
        question: 'Do you offer warranty on repairs?',
        answer: "Yes, we provide a 90-day warranty on all our repairs. This covers both parts and labor. If you experience any issues related to our repair work within this period, we'll fix it free of charge.",
        category: 'repairs',
    },
    {
        question: 'What payment methods do you accept?',
        answer: 'We accept various payment methods including cash, mobile money (MTN, Vodafone, AirtelTigo), bank transfers, and major credit/debit cards.',
        category: 'payment',
    },
    {
        question: 'Do you offer on-site IT support?',
        answer: 'Yes, we provide on-site IT support for businesses within Accra. Our team can visit your location for installations, troubleshooting, and maintenance.',
        category: 'services',
    },
];

const FAQ = () => {
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [openItems, setOpenItems] = useState<number[]>([]);

    const categories = [
        { id: 'all', name: 'All Questions' },
        { id: 'general', name: 'General' },
        { id: 'repairs', name: 'Repairs' },
        { id: 'services', name: 'Services' },
        { id: 'payment', name: 'Payment' },
    ];

    const toggleItem = (index: number) => {
        setOpenItems(openItems.includes(index) ? openItems.filter((item) => item !== index) : [...openItems, index]);
    };

    const filteredFAQs = activeCategory === 'all' ? faqData : faqData.filter((item) => item.category === activeCategory);

    return (
        <section id="faq" className="py-20 bg-gray-50 mt-10 mx-2 md:mx-10 border-2 border-gray-200 rounded-3xl">
            <div className="container mx-auto px-4 max-w-4xl">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
                    <p className="text-gray-600 mb-8">Find answers to common questions about our services and support</p>

                    {/* Category Filter */}
                    <div className="flex flex-wrap justify-center gap-2 mb-8">
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => setActiveCategory(category.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                                    activeCategory === category.id ? 'bg-[#dc711a] text-white' : 'bg-white text-gray-600 hover:bg-orange-50'
                                }`}
                            >
                                {category.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* FAQ Items */}
                <div className="space-y-4">
                    {filteredFAQs.map((faq, index) => (
                        <div key={index} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300">
                            <button onClick={() => toggleItem(index)} className="w-full px-6 py-4 text-left flex justify-between items-center">
                                <span className="font-medium text-gray-900">{faq.question}</span>
                                <motion.span animate={{ rotate: openItems.includes(index) ? 180 : 0 }} transition={{ duration: 0.3 }} className="text-[#dc711a]">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </motion.span>
                            </button>
                            <AnimatePresence>
                                {openItems.includes(index) && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-6 pb-4 text-gray-600">{faq.answer}</div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>

                {/* Contact CTA */}
                <div className="mt-12 text-center">
                    <p className="text-gray-600 mb-4">Can't find what you're looking for?</p>
                    <button
                        onClick={() => setIsContactModalOpen(true)}
                        className="inline-flex items-center px-6 py-3 text-base font-medium text-white bg-[#dc711a] rounded-full hover:bg-[#b95d13] transition-colors"
                    >
                        Contact Us
                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Contact Modal */}
            <ContactModal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} />
        </section>
    );
};

export default FAQ;
