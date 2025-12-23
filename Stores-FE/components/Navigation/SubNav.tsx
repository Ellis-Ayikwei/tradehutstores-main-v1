'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { Popover, Transition, PopoverButton, PopoverPanel } from '@headlessui/react'
import { 
    Shield, 
    Star, 
    HelpCircle, 
    Smartphone, 
    Store,
    ChevronDown,
    Grid3x3,
    Package,
    Award,
    Truck,
    ShieldCheck,
    BadgeCheck,
    Lock
} from 'lucide-react'

export default function SubNav() {
    const categories = [
        { 
            name: 'Electronics & Accessories', 
            icon: '📱', 
            subcategories: [
                { name: 'Smartphones', count: 1240 },
                { name: 'Laptops & Computers', count: 856 },
                { name: 'Tablets & E-readers', count: 432 },
                { name: 'Audio & Headphones', count: 678 },
                { name: 'Cameras & Photo', count: 345 },
                { name: 'Wearables & Smartwatches', count: 234 },
            ]
        },
        { 
            name: 'Fashion & Apparel', 
            icon: '👔', 
            subcategories: [
                { name: 'Men\'s Clothing', count: 2100 },
                { name: 'Women\'s Clothing', count: 3200 },
                { name: 'Kids & Baby', count: 1450 },
                { name: 'Shoes & Footwear', count: 980 },
                { name: 'Bags & Accessories', count: 760 },
                { name: 'Jewelry & Watches', count: 540 },
            ]
        },
        { 
            name: 'Home & Garden', 
            icon: '🏠', 
            subcategories: [
                { name: 'Furniture', count: 1890 },
                { name: 'Kitchen & Dining', count: 1240 },
                { name: 'Bedding & Bath', count: 870 },
                { name: 'Home Decor', count: 1560 },
                { name: 'Garden & Outdoor', count: 450 },
                { name: 'Tools & Home Improvement', count: 720 },
            ]
        },
        { 
            name: 'Sports & Outdoors', 
            icon: '⚽', 
            subcategories: [
                { name: 'Exercise & Fitness', count: 890 },
                { name: 'Camping & Hiking', count: 560 },
                { name: 'Sports Equipment', count: 1230 },
                { name: 'Cycling', count: 340 },
                { name: 'Water Sports', count: 210 },
                { name: 'Team Sports', count: 670 },
            ]
        },
        { 
            name: 'Health & Beauty', 
            icon: '💄', 
            subcategories: [
                { name: 'Skincare', count: 1450 },
                { name: 'Makeup & Cosmetics', count: 1780 },
                { name: 'Hair Care', count: 890 },
                { name: 'Fragrances', count: 560 },
                { name: 'Personal Care', count: 1120 },
                { name: 'Healthcare Supplies', count: 430 },
            ]
        },
        { 
            name: 'Toys & Games', 
            icon: '🎮', 
            subcategories: [
                { name: 'Video Games & Consoles', count: 780 },
                { name: 'Action Figures & Dolls', count: 560 },
                { name: 'Board Games & Puzzles', count: 340 },
                { name: 'Educational Toys', count: 450 },
                { name: 'RC & Drones', count: 230 },
                { name: 'Outdoor Play', count: 380 },
            ]
        },
        { 
            name: 'Books & Media', 
            icon: '📚', 
            subcategories: [
                { name: 'Books', count: 3400 },
                { name: 'Music & Vinyl', count: 890 },
                { name: 'Movies & TV', count: 1230 },
                { name: 'Magazines', count: 340 },
                { name: 'E-books & Audiobooks', count: 1560 },
                { name: 'Sheet Music', count: 120 },
            ]
        },
        { 
            name: 'Automotive', 
            icon: '🚗', 
            subcategories: [
                { name: 'Car Parts & Accessories', count: 2340 },
                { name: 'Motorcycle Parts', count: 890 },
                { name: 'Tools & Equipment', count: 560 },
                { name: 'Car Electronics', count: 780 },
                { name: 'Tires & Wheels', count: 450 },
                { name: 'Exterior Accessories', count: 340 },
            ]
        },
    ]

    const featuredItems = [
        {
            title: 'Trade Assurance',
            description: 'Order protection from payment to delivery',
            icon: ShieldCheck,
            color: 'text-green-500',
            bgColor: 'bg-green-50',
        },
        {
            title: 'Verified Suppliers',
            description: 'Connect with trusted, certified suppliers',
            icon: BadgeCheck,
            color: 'text-blue-500',
            bgColor: 'bg-blue-50',
        },
        {
            title: 'Quality Inspection',
            description: 'Professional quality control services',
            icon: Award,
            color: 'text-purple-500',
            bgColor: 'bg-purple-50',
        },
        {
            title: 'Secure Payment',
            description: 'Multiple secure payment options',
            icon: Lock,
            color: 'text-orange-500',
            bgColor: 'bg-orange-50',
        },
    ]

    const protectionFeatures = [
        {
            title: 'Payment Protection',
            description: 'Your money is safe until you receive your order',
            icon: ShieldCheck,
        },
        {
            title: 'Product Quality',
            description: 'Guaranteed product quality or full refund',
            icon: Award,
        },
        {
            title: 'On-time Shipping',
            description: 'Receive your order on time or get compensated',
            icon: Truck,
        },
        {
            title: 'Dispute Resolution',
            description: '24/7 support to help resolve any issues',
            icon: HelpCircle,
        },
    ]

    return (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="container mx-auto px-2 sm:px-4">
                <div className="flex items-center justify-between h-10 sm:h-12">
                    {/* Left Section - Main Categories */}
                    <div className="flex items-center gap-1 sm:gap-2 md:gap-4 overflow-x-auto flex-1 min-w-0" style={{ overflowY: 'visible' }}>
                        {/* All Categories Mega Dropdown */}
                        <Popover className="relative">
                            {({ open }) => (
                                <>
                                    <PopoverButton
                                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors font-medium text-gray-900 dark:text-white outline-none text-xs sm:text-sm whitespace-nowrap"
                                    >
                                        <Grid3x3 className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">All categories</span>
                                        <span className="sm:hidden">Categories</span>
                                        <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                    </PopoverButton>

                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-200"
                                        enterFrom="opacity-0 translate-y-1"
                                        enterTo="opacity-100 translate-y-0"
                                        leave="transition ease-in duration-150"
                                        leaveFrom="opacity-100 translate-y-0"
                                        leaveTo="opacity-0 translate-y-1"
                                    >
                                        <PopoverPanel className="absolute left-0 z-[100] mt-3 w-screen max-w-5xl transform -translate-x-0">
                                            <div className=" rounded-lg shadow-2xl ring-1 ring-black ring-opacity-5">
                                                <div className="relative bg-white dark:bg-gray-800 p-6">
                                                    <div className="grid grid-cols-4 gap-6">
                                                        {categories.map((category, index) => (
                                                            <div key={index} className="group">
                                                                <Link
                                                                    href={`/products?category=${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                                                                    className="flex items-center gap-2 mb-3 font-semibold text-gray-900 dark:text-white hover:text-primary-500 transition-colors"
                                                                >
                                                                    <span className="text-2xl">{category.icon}</span>
                                                                    <span className="text-sm">{category.name}</span>
                                                                </Link>
                                                                <ul className="space-y-2">
                                                                    {category.subcategories.map((sub, subIndex) => (
                                                                        <li key={subIndex}>
                                                                            <Link
                                                                                href={`/products?category=${sub.name.toLowerCase().replace(/\s+/g, '-')}`}
                                                                                className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-500 transition-colors flex items-center justify-between group/item"
                                                                            >
                                                                                <span>{sub.name}</span>
                                                                                <span className="text-xs text-gray-400 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                                    {sub.count}
                                                                                </span>
                                                                            </Link>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </PopoverPanel>
                                    </Transition>
                                </>
                            )}
                        </Popover>

                        {/* Featured Selections Mega Dropdown */}
                        <Popover className="relative hidden md:block">
                            {({ open }) => (
                                <>
                                    <PopoverButton
                                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-700 dark:text-gray-300 hover:text-primary-500 font-medium outline-none text-xs sm:text-sm whitespace-nowrap"
                                    >
                                        <Star className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span className="hidden lg:inline">Featured selections</span>
                                        <span className="lg:hidden">Featured</span>
                                        <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                    </PopoverButton>

                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-200"
                                        enterFrom="opacity-0 translate-y-1"
                                        enterTo="opacity-100 translate-y-0"
                                        leave="transition ease-in duration-150"
                                        leaveFrom="opacity-100 translate-y-0"
                                        leaveTo="opacity-0 translate-y-1"
                                    >
                                        <PopoverPanel className="absolute left-0 z-[100] mt-3 w-screen max-w-md transform -translate-x-0">
                                            <div className=" rounded-lg shadow-2xl ring-1 ring-black ring-opacity-5">
                                                <div className="relative bg-white dark:bg-gray-800 p-6">
                                                    <div className="space-y-4">
                                                        {featuredItems.map((item, index) => {
                                                            const Icon = item.icon
                                                            return (
                                                                <Link
                                                                    key={index}
                                                                    href="/featured"
                                                                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                                                                >
                                                                    <div className={`p-3 rounded-lg ${item.bgColor} dark:bg-gray-700`}>
                                                                        <Icon className={`h-6 w-6 ${item.color} dark:text-white`} />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-500 transition-colors">
                                                                            {item.title}
                                                                        </h4>
                                                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                                            {item.description}
                                                                        </p>
                                                                    </div>
                                                                </Link>
                                                            )
                                                        })}
                                                    </div>
                                                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                        <Link
                                                            href="/featured"
                                                            className="text-sm font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-2"
                                                        >
                                                            View all featured products
                                                            <ChevronDown className="h-4 w-4 -rotate-90" />
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </PopoverPanel>
                                    </Transition>
                                </>
                            )}
                        </Popover>

                        {/* Order Protection Mega Dropdown */}
                        <Popover className="relative hidden lg:block">
                            {({ open }) => (
                                <>
                                    <PopoverButton
                                        className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors text-gray-700 dark:text-gray-300 hover:text-primary-500 font-medium outline-none text-xs sm:text-sm whitespace-nowrap"
                                    >
                                        <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>Order protections</span>
                                        <ChevronDown className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                    </PopoverButton>

                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-200"
                                        enterFrom="opacity-0 translate-y-1"
                                        enterTo="opacity-100 translate-y-0"
                                        leave="transition ease-in duration-150"
                                        leaveFrom="opacity-100 translate-y-0"
                                        leaveTo="opacity-0 translate-y-1"
                                    >
                                        <PopoverPanel className="absolute left-0 z-[100] mt-3 w-screen max-w-lg transform -translate-x-0">
                                            <div className=" rounded-lg shadow-2xl ring-1 ring-black ring-opacity-5">
                                                <div className="relative bg-white dark:bg-gray-800">
                                                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 p-6 text-white">
                                                        <h3 className="text-xl font-bold mb-2">Trade Assurance</h3>
                                                        <p className="text-sm text-white/90">
                                                            Comprehensive protection for your orders from payment to delivery
                                                        </p>
                                                    </div>
                                                    <div className="p-6">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {protectionFeatures.map((feature, index) => {
                                                                const Icon = feature.icon
                                                                return (
                                                                    <div key={index} className="flex flex-col items-center text-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                                        <div className="p-3 rounded-full bg-primary-50 dark:bg-gray-700 mb-3">
                                                                            <Icon className="h-6 w-6 text-primary-500" />
                                                                        </div>
                                                                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                                                                            {feature.title}
                                                                        </h4>
                                                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                                                            {feature.description}
                                                                        </p>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                                                            <Link
                                                                href="/protection"
                                                                className="block w-full text-center py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
                                                            >
                                                                Learn More
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </PopoverPanel>
                                    </Transition>
                                </>
                            )}
                        </Popover>
                    </div>

                    {/* Right Section - Secondary Links */}
                    <div className="hidden xl:flex items-center gap-3 lg:gap-4 xl:gap-6 text-xs lg:text-sm">
                        <Link
                            href="/buyer-central"
                            className="text-gray-700 dark:text-gray-300 hover:text-primary-500 transition-colors font-medium whitespace-nowrap"
                        >
                            Buyer Central
                        </Link>
                       
                        {/* Help */}
                        <div className="hidden sm:flex items-center gap-1 lg:gap-2 text-gray-700 dark:text-gray-300">
                            <HelpCircle className="h-3 w-3 lg:h-4 lg:w-4" />
                            <select
                                // value={}
                                // onChange={}
                                className="bg-transparent border-none text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer font-medium text-xs lg:text-sm"
                            >
                                <option value="USD" className="bg-gray-800 text-white">Help</option>
                                <option value="EUR" className="bg-gray-800 text-white">EUR</option>
                                <option value="GBP" className="bg-gray-800 text-white">GBP</option>
                                <option value="GHS" className="bg-gray-800 text-white">GHS</option>
                            </select>
                        </div>
                        
                        <Link
                            href="/sell"
                            className="text-gray-700 dark:text-gray-300 hover:text-primary-500 transition-colors font-medium flex items-center gap-1 whitespace-nowrap"
                        >
                            <Store className="h-3 w-3 lg:h-4 lg:w-4" />
                            <span className="hidden lg:inline">Sell ON TradeHutStores</span>
                            <span className="lg:hidden">Sell</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}