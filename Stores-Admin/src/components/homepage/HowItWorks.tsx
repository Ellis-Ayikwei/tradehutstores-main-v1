import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faClipboardList, faTruck, faBox, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { IconArrowRight } from '@tabler/icons-react';

interface Step {
    icon: any;
    title: string;
    description: string;
    color: string;
}

const steps: Step[] = [
    {
        icon: faUser,
        title: 'Request a Move',
        description: 'Fill out our simple form with your moving details, including pickup and delivery locations, items to be moved, and preferred dates.',
        color: 'from-blue-500 to-blue-600',
    },
    {
        icon: faClipboardList,
        title: 'Get Instant Quotes',
        description: 'Receive competitive quotes from our network of verified moving professionals within minutes.',
        color: 'from-purple-500 to-purple-600',
    },
    {
        icon: faTruck,
        title: 'A Mover Is Assigned',
        description: 'A mover will be assigned to your move based on your location and the size of your move.',
        color: 'from-green-500 to-green-600',
    },
    {
        icon: faBox,
        title: 'Track Your Move',
        description: 'Follow your move in real-time with our tracking system and receive updates throughout the process.',
        color: 'from-orange-500 to-orange-600',
    },
];

const HowItWorks: React.FC = () => {
    return (
        <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">How MoreVans Works</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">Get your items moved in four simple steps with our efficient platform.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <Link to="/service-request" className="block">
                                <motion.div whileHover={{ y: -5 }} className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl h-full cursor-pointer transition-shadow hover:shadow-2xl">
                                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6`}>
                                        <FontAwesomeIcon icon={step.icon} className="text-2xl text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{step.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400">{step.description}</p>
                                </motion.div>
                            </Link>
                            {index < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2">
                                    <div className="relative">
                                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${steps[index + 1].color} flex items-center justify-center shadow-lg`}>
                                            <IconArrowRight className="text-2xl text-white" />
                                        </div>
                                        <div className="absolute inset-0 rounded-full animate-pulse bg-white/20"></div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <Link
                        to="/how-it-works"
                        className="inline-flex items-center bg-secondary hover:bg-secondary/90 text-white px-8 py-4 rounded-xl font-medium transition-all duration-300 hover:shadow-lg hover:scale-105"
                    >
                        Learn More About Our Process
                        <IconArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
