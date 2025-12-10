import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faTwitter, faInstagram, faLinkedin, faYoutube } from '@fortawesome/free-brands-svg-icons';
import { faPhone, faEnvelope, faMapMarkerAlt, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    const footerLinks = {
        company: [
            { name: 'About Us', href: '/about' },
            { name: 'Careers', href: '/careers' },
            { name: 'Press', href: '/press' },
            { name: 'Blog', href: '/blog' },
            { name: 'Contact Us', href: '/contact' },
        ],
        services: [
            { name: 'Home Moves', href: '/services/home-moves' },
            { name: 'Office Relocations', href: '/services/office-relocations' },
            { name: 'Furniture Delivery', href: '/services/furniture-delivery' },
            { name: 'International Moves', href: '/services/international-moves' },
            { name: 'Storage Solutions', href: '/services/storage' },
        ],
        support: [
            { name: 'Help Center', href: '/help' },
            { name: 'Safety', href: '/safety' },
            { name: 'Terms of Service', href: '/terms' },
            { name: 'Privacy Policy', href: '/privacy' },
            { name: 'Cookie Policy', href: '/cookies' },
        ],
        providers: [
            { name: 'Become a Provider', href: '/providers/register' },
            { name: 'Provider Login', href: '/providers/login' },
            { name: 'Provider Resources', href: '/providers/resources' },
            { name: 'Provider Insurance', href: '/providers/insurance' },
            { name: 'Provider Support', href: '/providers/support' },
        ],
    };

    const socialLinks = [
        { icon: faFacebook, href: 'https://facebook.com', label: 'Facebook' },
        { icon: faTwitter, href: 'https://twitter.com', label: 'Twitter' },
        { icon: faInstagram, href: 'https://instagram.com', label: 'Instagram' },
        { icon: faLinkedin, href: 'https://linkedin.com', label: 'LinkedIn' },
        { icon: faYoutube, href: 'https://youtube.com', label: 'YouTube' },
    ];

    return (
        <footer className="bg-gray-900 text-gray-300">
            {/* Main Footer */}
            <div className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                    {/* Company Info */}
                    <div className="lg:col-span-2">
                        <Link to="/" className="inline-block mb-6">
                            <img src="/logo-white.png" alt="MoreVans" className="h-8" />
                        </Link>
                        <p className="text-gray-400 mb-6 max-w-md">MoreVans is the UK's leading platform connecting customers with reliable van operators for all their moving and delivery needs.</p>
                        <div className="space-y-3">
                            <div className="flex items-center">
                                <FontAwesomeIcon icon={faPhone} className="w-5 h-5 text-secondary mr-3" />
                                <span>0800 123 4567</span>
                            </div>
                            <div className="flex items-center">
                                <FontAwesomeIcon icon={faEnvelope} className="w-5 h-5 text-secondary mr-3" />
                                <span>support@morevans.com</span>
                            </div>
                            <div className="flex items-center">
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="w-5 h-5 text-secondary mr-3" />
                                <span>123 Business Street, London, UK</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Company</h3>
                        <ul className="space-y-2">
                            {footerLinks.company.map((link) => (
                                <li key={link.name}>
                                    <Link to={link.href} className="text-gray-400 hover:text-secondary transition-colors flex items-center">
                                        <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 mr-2" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-4">Services</h3>
                        <ul className="space-y-2">
                            {footerLinks.services.map((link) => (
                                <li key={link.name}>
                                    <Link to={link.href} className="text-gray-400 hover:text-secondary transition-colors flex items-center">
                                        <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 mr-2" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-white font-semibold mb-4">Support</h3>
                        <ul className="space-y-2">
                            {footerLinks.support.map((link) => (
                                <li key={link.name}>
                                    <Link to={link.href} className="text-gray-400 hover:text-secondary transition-colors flex items-center">
                                        <FontAwesomeIcon icon={faChevronRight} className="w-3 h-3 mr-2" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Social Links */}
                <div className="mt-12 pt-8 border-t border-gray-800">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex space-x-4 mb-4 md:mb-0">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-secondary hover:text-white transition-colors"
                                    aria-label={social.label}
                                >
                                    <FontAwesomeIcon icon={social.icon} className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                        <div className="text-gray-400 text-sm">© {currentYear} MoreVans. All rights reserved.</div>
                    </div>
                </div>
            </div>

            {/* Trust Badges */}
            <div className="bg-gray-800 py-6">
                <div className="container mx-auto px-4">
                    <div className="flex flex-wrap justify-center items-center gap-8 overflow-hidden max-w-full">
                        <img src="/trust-badges/trustpilot.png" alt="Trustpilot" className="h-8" />
                        <img src="/trust-badges/verified.png" alt="Verified Business" className="h-8" />
                        <img src="/trust-badges/secure.png" alt="Secure Payment" className="h-8" />
                        <img src="/trust-badges/insurance.png" alt="Fully Insured" className="h-8" />
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
