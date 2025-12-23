'use client'

import Link from 'next/link'
import { useState } from 'react'
import { 
    ShoppingCart, 
    User, 
    Bell,
    MapPin,
    ChevronDown,
    Globe,
    Sun,
    Moon
} from 'lucide-react'
import { Badge } from 'antd'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useTheme } from '@/contexts/ThemeContext'
import Image from 'next/image'

export default function TopNav() {
    const [showCountryDropdown, setShowCountryDropdown] = useState(false)
    const cart = useSelector((state: RootState) => state.cart.cart)
    const wishlist = useSelector((state: RootState) => state.wishlist.wishlist)
    const { currency, setCurrency } = useCurrency()
    const { theme, toggleTheme } = useTheme()

    const countries = [
        { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
        { code: 'US', name: 'United States', flag: '🇺🇸' },
        { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
        { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
        { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
    ]

    const [selectedCountry, setSelectedCountry] = useState(countries[0])

    return (
        <div className="bg-gray-800 dark:bg-gray-950 text-white py-2 border-b border-gray-700">
            <div className="container mx-auto px-2 sm:px-4">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                    {/* Left Section - Logo */}
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition-opacity" />
                            <div className="relative bg-gradient-to-br from-primary-500 to-orange-500 p-2 rounded-lg">
                                <Image src="/assets/images/logos/tradehutfullText.png" alt="TradeHut" width={100} height={50} />
                            </div>
                        </div>
                        
                    </Link>

                    {/* Right Section */}
                    <div className="flex items-center gap-1 md:gap-4 lg:gap-2">
                        {/* Country/Location Selector */}
                        <div className="relative hidden md:block">
                            <button
                                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                                className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1.5 hover:bg-gray-700 rounded transition-colors text-xs lg:text-sm"
                            >
                                <MapPin className="h-3 w-3 lg:h-4 lg:w-4" />
                                <span className="text-gray-300 hidden lg:inline">Deliver to:</span>
                                <span className="font-semibold">{selectedCountry.flag} {selectedCountry.code}</span>
                                <ChevronDown className="h-3 w-3 lg:h-4 lg:w-4" />
                            </button>

                            {showCountryDropdown && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                                    {countries.map((country) => (
                                        <button
                                            key={country.code}
                                            onClick={() => {
                                                setSelectedCountry(country)
                                                setShowCountryDropdown(false)
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                                        >
                                            <span className="text-2xl">{country.flag}</span>
                                            <span className="font-medium">{country.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Currency Selector */}
                        <div className="hidden sm:flex items-center gap-1 lg:gap-2">
                            <Globe className="h-3 w-3 lg:h-4 lg:w-4" />
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="bg-transparent border-none text-white focus:outline-none cursor-pointer font-medium text-xs lg:text-sm"
                            >
                                <option value="USD" className="bg-gray-800 text-white">USD</option>
                                <option value="EUR" className="bg-gray-800 text-white">EUR</option>
                                <option value="GBP" className="bg-gray-800 text-white">GBP</option>
                                <option value="GHS" className="bg-gray-800 text-white">GHS</option>
                            </select>
                        </div>
                       

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-1 lg:p-1.5 hover:bg-gray-700 rounded transition-colors"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? (
                                <Sun className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                            ) : (
                                <Moon className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                            )}
                        </button>

                        {/* Notifications */}
                        {/* <Link 
                            href="/notifications" 
                            className="p-1 lg:p-1.5 hover:bg-gray-700 rounded transition-colors hidden sm:block"
                        >
                            <Badge count={0} size="small">
                                <Bell className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                            </Badge>
                        </Link> */}

                        {/* Cart */}
                        <Link 
                            href="/cart" 
                            className="flex items-center gap-1 lg:gap-2 px-2 lg:px-3 py-1.5 hover:bg-gray-700 rounded transition-colors"
                        >
                            <Badge count={cart.item_count || 0} size="small">
                                <ShoppingCart className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                            </Badge>
                            <span className="font-medium text-xs lg:text-sm hidden md:inline">Cart</span>
                        </Link>

                        {/* User Account */}
                        <Link 
                            href="/auth/login" 
                            className="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-1.5 bg-primary-500 hover:bg-primary-600 rounded transition-colors font-medium text-xs lg:text-sm"
                        >
                            <User className="h-3 w-3 lg:h-4 lg:w-4" />
                            <span className="hidden sm:inline">Sign In</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

