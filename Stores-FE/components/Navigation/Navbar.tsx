'use client'

import Link from 'next/link'
import NextImage from 'next/image'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { 
    Search, 
    ShoppingCart, 
    Heart, 
    User, 
    Menu, 
    X,
    Sun,
    Moon,
    Globe,
    Bell
} from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useCurrency } from '@/contexts/CurrencyContext'
import { Badge } from 'antd'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { motion, AnimatePresence } from 'framer-motion'
import SearchBar from '@/components/common/SearchBar'
import { useAuthModal } from '@/providers/AuthModalProvider'

export default function Navbar() {
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [showSearchBar, setShowSearchBar] = useState(false)
    const { openAuthModal } = useAuthModal()
    const pathname = usePathname()
    const { theme, toggleTheme } = useTheme()
    const { currency, setCurrency } = useCurrency()
    const cart = useSelector((state: RootState) => state.cart.cart)
    const wishlist = useSelector((state: RootState) => state.wishlist.wishlist)

    // Scroll detection to show/hide search bar
    useEffect(() => {
        const handleScroll = () => {
            // Show search bar when scrolled past 400px (roughly past the hero section)
            if (window.scrollY > 400) {
                setShowSearchBar(true)
            } else {
                setShowSearchBar(false)
            }
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const navLinks = [
        { href: '/', label: 'Home' },
        { href: '/products', label: 'Products' },
        { href: '/deals', label: 'Deals' },
        { href: '/sell', label: 'Sell' },
    ]

    return (
        <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg shadow-md border-b border-gray-200 dark:border-gray-800">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary-500 rounded-lg blur opacity-50 group-hover:opacity-75 transition-opacity" />
                            <div className="relative bg-gradient-to-br from-primary-500 to-orange-500 p-2 rounded-lg">
                                <ShoppingCart className="h-6 w-6 text-white" />
                            </div>
                        </div>
                        <span className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-orange-500 bg-clip-text text-transparent">
                            TradeHut
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center space-x-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`relative px-4 py-2 rounded-lg font-medium transition-all ${
                                    pathname === link.href
                                        ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                        : 'text-gray-700 dark:text-gray-200 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                            >
                                {link.label}
                                {pathname === link.href && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full"
                                        initial={false}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Search Bar - Shows after scrolling */}
                    <AnimatePresence>
                        {showSearchBar && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.3 }}
                                className="hidden lg:flex flex-1 max-w-2xl mx-4"
                            >
                                <SearchBar variant="navbar" className="w-full" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Right Icons */}
                    <div className="flex items-center space-x-2">
                        {/* Search Toggle (Mobile) */}
                        <button
                            onClick={() => setIsSearchOpen(!isSearchOpen)}
                            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <Search className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                        </button>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Toggle theme"
                        >
                            {theme === 'dark' ? (
                                <Sun className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                            ) : (
                                <Moon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                            )}
                        </button>

                        {/* Currency Selector */}
                        <div className="relative hidden md:block">
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="appearance-none bg-transparent text-gray-700 dark:text-gray-200 pr-8 pl-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                            >
                                <option value="GHS">GHS</option>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="JPY">JPY</option>
                            </select>
                            <Globe className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                        </div>

                        {/* Notifications */}
                        <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Badge count={0} size="small">
                                <Bell className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                            </Badge>
                        </Link>

                        {/* Wishlist */}
                        <Link href="/wishlist" className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Badge count={wishlist.item_count || 0} size="small" offset={[8, 0]}>
                                <Heart className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                            </Badge>
                        </Link>

                        {/* Cart */}
                        <Link href="/cart" className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <Badge count={cart.item_count || 0} size="small" offset={[8, 0]}>
                                <ShoppingCart className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                            </Badge>
                        </Link>

                        {/* User Account — opens AuthModal in-place rather than navigating away */}
                        <button
                            type="button"
                            onClick={() => openAuthModal('auto')}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Sign in"
                        >
                            <User className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                        </button>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? (
                                <X className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                            ) : (
                                <Menu className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Search */}
                <AnimatePresence>
                    {isSearchOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="lg:hidden overflow-hidden"
                        >
                            <div className="py-4">
                                <SearchBar variant="navbar" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="md:hidden overflow-hidden border-t border-gray-200 dark:border-gray-700"
                        >
                            <div className="py-4 space-y-1">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`block py-3 px-4 rounded-lg mx-2 transition-colors ${
                                            pathname === link.href
                                                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-500 font-semibold'
                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                                
                                {/* Mobile Currency Selector */}
                                <div className="px-4 py-2">
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="GHS">GHS</option>
                                        <option value="USD">USD</option>
                                        <option value="EUR">EUR</option>
                                        <option value="GBP">GBP</option>
                                        <option value="JPY">JPY</option>
                                    </select>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    )
}
