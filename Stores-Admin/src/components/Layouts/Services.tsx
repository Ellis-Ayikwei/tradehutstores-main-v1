import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import BookRepair from './BookRepair';
import CheckStatus from './CheckStatus';
import GetSupport from './GetSupport';
import ViewPlans from './ViewPlans';
import ContactModal from './ContactModal';
import ReviewCarousel from './ReviewCarousel';

interface ServiceItem {
    title: string;
    description: string;
    icon: string;
    image: string;
    features: string[];
    buttonText: string;
    buttonLink: string;
    reversed?: boolean;
}

interface ServiceCTA {
    title: string;
    description: string;
    primaryButton: {
        text: string;
        link: string;
    };
    secondaryButton?: {
        text: string;
        link: string;
    };
}

const services: ServiceItem[] = [
    {
        title: 'Sales of Electronic Devices',
        description: 'Premium quality devices and accessories at competitive prices',
        icon: 'fas fa-store',
        image: '/assets/images/services/shop.png',
        features: ['Latest Laptops', 'Premium Mobile Phones', 'Genuine Accessories'],
        buttonText: 'Shop Now',
        buttonLink: '#shop',
    },
    {
        title: 'Mobile Phone And Laptop Repairs',
        description: 'Expert repair services with quality guarantees',
        icon: 'fas fa-tools',
        image: '/assets/images/services/repairs.png',
        features: ['Screen replacement and repair', 'Battery replacement', 'Charging port repair', 'Software troubleshooting', 'Water damage repair', 'Hardware upgrades'],
        buttonText: 'Book Now',
        buttonLink: '#book',
        reversed: true,
    },
    {
        title: 'Web Development',
        description: 'Custom websites and applications tailored to your business needs',
        icon: 'fas fa-code',
        image: '/assets/images/services/webdev.png',
        features: ['Custom Website Development', 'Mobile App Development', 'E-commerce Solutions', 'Web Applications', 'UI/UX Design', 'API Integration'],
        buttonText: 'Get Started',
        buttonLink: '#website',
    },
    {
        title: 'Professional IT Support',
        description: 'Comprehensive IT solutions',
        icon: 'fas fa-headset',
        image: '/assets/images/services/support.png',
        features: [
            'Network setup and configuration',
            'Server maintenance and administration',
            'Data backup and recovery',
            'Software troubleshooting and updates',
            'Virus and malware removal',
            'Hardware upgrades and repairs',
            'IT security solutions',
            'Remote technical support',
            'Software Installation and Configuration',
        ],
        buttonText: 'Talk to a Professional',
        buttonLink: '#support',
        reversed: true,
    },
];

const serviceCTAs: Record<string, ServiceCTA> = {
    'Sales of Electronic Devices': {
        title: 'Ready to upgrade your devices?',
        description: 'Browse our premium selection of laptops, phones, and accessories. Get the best deals with warranty coverage.',
        primaryButton: {
            text: 'Shop Now',
            link: '#shop',
        },
        secondaryButton: {
            text: 'View Catalog',
            link: '#catalog',
        },
    },
    'Mobile Phone And Laptop Repairs': {
        title: 'Need expert repair service?',
        description: 'Get your devices fixed by certified technicians. Same-day service available for most repairs.',
        primaryButton: {
            text: 'Book Repair',
            link: '#book',
        },
        secondaryButton: {
            text: 'Check Status',
            link: '#status',
        },
    },
    'Web Development': {
        title: 'Ready to build your online presence?',
        description: 'Get a custom website that perfectly represents your brand and drives results.',
        primaryButton: {
            text: 'Get Started',
            link: '#start',
        },
        secondaryButton: {
            text: 'View Plans',
            link: '#plans',
        },
    },
    'Professional IT Support': {
        title: 'Need professional IT assistance?',
        description: 'Get reliable IT support for your business. 24/7 availability for critical issues.',
        primaryButton: {
            text: 'Get Support',
            link: '#support',
        },
        secondaryButton: {
            text: 'See Plans',
            link: '#plans',
        },
    },
};

const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

const staggerChildren = {
    visible: {
        transition: {
            staggerChildren: 0.3,
        },
    },
};

const Services: React.FC = () => {
    const [ref, inView] = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const servicesRef = useRef(null);
    const [isBookRepairOpen, setIsBookRepairOpen] = useState(false);
    const [isCheckStatusOpen, setIsCheckStatusOpen] = useState(false);
    const [isGetSupportOpen, setIsGetSupportOpen] = useState(false);
    const [isGetAppOpen, setIsGetAppOpen] = useState(false);
    const [isViewPlansOpen, setIsViewPlansOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    const handleCTAClick = (serviceTitle: string, buttonType: 'primary' | 'secondary') => {
        switch (serviceTitle) {
            case 'Mobile Phone And Laptop Repairs':
                if (buttonType === 'primary') {
                    setIsBookRepairOpen(true);
                } else {
                    setIsCheckStatusOpen(true);
                }
                break;
            case 'Sales of Electronic Devices':
                console.log(buttonType === 'primary' ? 'Shop Now' : 'View Catalog');
                break;
            case 'Web Development':
                if (buttonType === 'primary') {
                    setIsGetAppOpen(true);
                } else {
                    setIsViewPlansOpen(true);
                }
                break;
            case 'Professional IT Support':
                if (buttonType === 'primary') {
                    setIsGetSupportOpen(true);
                } else {
                    console.log('See Plans');
                }
                break;
            default:
                break;
        }
    };

    return (
        <section id="services" className="relative bg-gradient-to-b from-white to-gray-50 py-24 mx-2 md:mx-10 mt-10 border-2 border-gray-200 rounded-3xl">
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[url('/src/assets/images/pattern-light.svg')] opacity-[0.03]" />
                <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-orange-100/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-orange-100/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
            </div>

            <div className="container mx-auto px-4 max-w-6xl relative">
                {/* Refined Section Header */}
                <motion.div className="text-center mb-20" initial="hidden" animate={inView ? 'visible' : 'hidden'} variants={fadeInUp} ref={ref}>
                    <span className="inline-block px-4 py-1.5 bg-orange-100/40 text-[#dc711a] rounded-full text-sm font-medium mb-6">Our Services</span>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
                        Comprehensive Digital{' '}
                        <span className="relative inline-block">
                            <span className="relative z-10 text-[#dc711a]">Solutions</span>
                            <span className="absolute bottom-1 left-0 w-full h-2 bg-orange-200 -z-0"></span>
                        </span>
                    </h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">From device repairs to web development, we provide end-to-end technology services with exceptional quality.</p>
                </motion.div>

                {/* Refined Services List */}
                <motion.div variants={staggerChildren} initial="hidden" animate="visible" className="space-y-24">
                    {services.map((service, index) => (
                        <motion.div key={index} variants={fadeInUp} className="group">
                            <div
                                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl ${
                                    service.reversed ? 'md:flex-row-reverse' : ''
                                }`}
                            >
                                {/* Service Content Grid */}
                                <div className="grid md:grid-cols-2 gap-0">
                                    {/* Refined Image Section */}
                                    <div className="relative h-[400px] md:h-full overflow-hidden">
                                        <motion.div
                                            className="absolute inset-0 bg-gradient-to-br from-[#dc711a]/80 to-[#E19D66FF]/80 mix-blend-multiply"
                                            initial={{ opacity: 0.6 }}
                                            whileHover={{ opacity: 0.7 }}
                                            transition={{ duration: 0.3 }}
                                        />
                                        <motion.img
                                            src={service.image}
                                            alt={service.title}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                                        <div className="absolute bottom-0 left-0 right-0 p-8">
                                            <div className="text-3xl mb-4 text-white/90">
                                                <i className={service.icon}></i>
                                            </div>
                                            <h3 className="text-2xl font-bold mb-2 text-white">{service.title}</h3>
                                            <p className="text-white/80 text-sm">{service.description}</p>
                                        </div>
                                    </div>

                                    {/* Refined Content Section */}
                                    <div className="p-8 flex flex-col justify-center bg-white">
                                        <div className="grid grid-cols-1 gap-4">
                                            {service.features.map((feature, idx) => (
                                                <motion.div key={idx} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-orange-50/50 transition-colors" whileHover={{ x: 4 }}>
                                                    <span clFassName="flex-shrink-0 w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                                                        <i className="fas fa-check text-[#dc711a] text-sm"></i>
                                                    </span>
                                                    <span className="text-gray-700 text-sm">{feature}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Refined CTA Section */}
                                <div className="bg-gradient-to-r from-[#dc711a] to-[#E19D66FF] p-8">
                                    <div className="max-w-3xl mx-auto text-center">
                                        <h3 className="text-2xl font-bold mb-3 text-white">{serviceCTAs[service.title].title}</h3>
                                        <p className="text-white/80 mb-6 text-sm max-w-xl mx-auto">{serviceCTAs[service.title].description}</p>
                                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                            <motion.button
                                                onClick={() => handleCTAClick(service.title, 'primary')}
                                                className="group inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-[#dc711a] bg-white rounded-lg hover:bg-gray-50 transition-all"
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                            >
                                                {serviceCTAs[service.title].primaryButton.text}
                                                <i className="fas fa-arrow-right ml-2 transform transition-transform group-hover:translate-x-1"></i>
                                            </motion.button>
                                            {serviceCTAs[service.title].secondaryButton && (
                                                <motion.button
                                                    onClick={() => handleCTAClick(service.title, 'secondary')}
                                                    className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white border border-white/30 rounded-lg hover:bg-white/10 transition-all"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    {serviceCTAs[service.title].secondaryButton?.text}
                                                </motion.button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            <ReviewCarousel />
        </section>
    );
};

export default Services;
