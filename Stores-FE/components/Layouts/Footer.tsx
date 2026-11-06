'use client'

import Link from 'next/link'
import { 
    Mail,
    Phone,
    MapPin,
    CreditCard,
    Truck,
    Shield,
    HeadphonesIcon
} from 'lucide-react'

export default function Footer() {
    const currentYear = new Date().getFullYear()

    const footerLinks = {
        company: [
            { label: 'About Us', href: '/about' },
            { label: 'Careers', href: '/careers' },
            { label: 'Press', href: '/press' },
            { label: 'Blog', href: '/blog' },
        ],
        customer: [
            { label: 'Contact Us', href: '/contact' },
            { label: 'FAQs', href: '/faq' },
            { label: 'Shipping Info', href: '/shipping-info' },
            { label: 'Return Policy', href: '/return-policy' },
        ],
        account: [
            { label: 'My Account', href: '/profile' },
            { label: 'Order History', href: '/profile/orders' },
            { label: 'Wishlist', href: '/wishlist' },
            { label: 'Newsletter', href: '/newsletter' },
        ],
    }

    const features = [
        { icon: Truck, label: 'Delivery', desc: 'Shipping options shown at checkout' },
        { icon: Shield, label: 'Secure Payment', desc: 'Protected checkout' },
        { icon: HeadphonesIcon, label: 'Customer Support', desc: 'Call or WhatsApp us' },
        { icon: CreditCard, label: 'Returns', desc: 'See our returns policy' },
    ]

    return (
        <footer className="bg-gray-900 text-gray-300">
            {/* Features Section */}
            <div className="border-b border-gray-800">
                <div className="container mx-auto px-4 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => {
                            const Icon = feature.icon
                            return (
                                <div key={index} className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <Icon className="h-8 w-8 text-primary-500" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white">{feature.label}</h4>
                                        <p className="text-sm text-gray-400">{feature.desc}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* Main Footer Content */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                    {/* Brand Section */}
                    <div className="lg:col-span-2">
                        <Link href="/" className="inline-block mb-4">
                            <h2 className="text-2xl font-bold text-primary-500">TradeHutStores.com</h2>
                        </Link>
                        <p className="text-gray-400 mb-4">
                            Your one-stop destination for quality products at unbeatable prices. 
                            Shop with confidence and discover amazing deals every day.
                        </p>
                    </div>

                    {/* Company Links */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Company</h3>
                        <ul className="space-y-2">
                            {footerLinks.company.map(link => (
                                <li key={link.href}>
                                    <Link 
                                        href={link.href}
                                        className="text-gray-400 hover:text-primary-500 transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Customer Service */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">Customer Service</h3>
                        <ul className="space-y-2">
                            {footerLinks.customer.map(link => (
                                <li key={link.href}>
                                    <Link 
                                        href={link.href}
                                        className="text-gray-400 hover:text-primary-500 transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* My Account */}
                    <div>
                        <h3 className="text-white font-semibold mb-4">My Account</h3>
                        <ul className="space-y-2">
                            {footerLinks.account.map(link => (
                                <li key={link.href}>
                                    <Link 
                                        href={link.href}
                                        className="text-gray-400 hover:text-primary-500 transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="mt-8 pt-8 border-t border-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-primary-500" />
                            <a href="mailto:support@tradehut.com" className="hover:text-primary-500">support@tradehut.com</a>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-primary-500" />
                            <a href="tel:+233248138722" className="hover:text-primary-500">024 813 8722</a>
                            <a href="https://wa.me/233248138722" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary-500">(WhatsApp)</a>
                        </div>
                        <div className="flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-primary-500" />
                            <span>La Trade Fair, Accra, Ghana</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <p className="text-sm text-gray-400">
                            © {currentYear} TradeHutStores.com. All rights reserved.
                        </p>
                        <div className="flex space-x-4 mt-2 md:mt-0">
                            <Link href="/terms" className="text-sm text-gray-400 hover:text-primary-500">
                                Terms of Service
                            </Link>
                            <Link href="/privacy" className="text-sm text-gray-400 hover:text-primary-500">
                                Privacy Policy
                            </Link>
                            <Link href="/cookies" className="text-sm text-gray-400 hover:text-primary-500">
                                Cookie Policy
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}