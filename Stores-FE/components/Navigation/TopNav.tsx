'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import {
    ShoppingCart,
    User,
    MapPin,
    ChevronDown,
    Globe,
    Sun,
    Moon,
    Heart,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useTheme } from '@/contexts/ThemeContext'
import Logo from '../common/logo'
import SearchBar from '@/components/common/SearchBar'

// ─── Custom badge — no antd dependency ───────────────────────────────────────
// Renders a small pill over the top-right of any child element.
// count=0 → hidden. count>99 → shows "99+".

function NavBadge({ count, children }: { count: number; children: React.ReactNode }) {
    const label = count > 99 ? '99+' : String(count)
    return (
        <span className="relative inline-flex">
            {children}
            {count > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-orange-500 text-white text-[9px] font-extrabold leading-none ring-2 ring-white dark:ring-gray-950 pointer-events-none">
                    {label}
                </span>
            )}
        </span>
    )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const COUNTRIES = [
    { code: 'GH', name: 'Ghana',          flag: '🇬🇭' },
    { code: 'US', name: 'United States',  flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
    { code: 'NG', name: 'Nigeria',        flag: '🇳🇬' },
    { code: 'KE', name: 'Kenya',          flag: '🇰🇪' },
    { code: 'ZA', name: 'South Africa',   flag: '🇿🇦' },
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'GHS', 'NGN', 'KES']

// ─── Component ────────────────────────────────────────────────────────────────

export default function TopNav() {
    const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0])
    const [countryOpen, setCountryOpen] = useState(false)
    const countryRef = useRef<HTMLDivElement>(null)

    const cart     = useSelector((state: RootState) => state.cart.cart)
    const wishlist = useSelector((state: RootState) => state.wishlist.wishlist)

    const { currency, setCurrency } = useCurrency()
    const { theme, toggleTheme }    = useTheme()
    const pathname = usePathname()

    const cartCount     = cart?.item_count  ?? 0
    const wishlistCount = wishlist?.length  ?? 0
    const showTopSearch = pathname !== '/'

    // Close country dropdown on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
                setCountryOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div className="bg-white text-gray-800 border-b border-gray-200 dark:bg-gray-950 dark:text-white dark:border-gray-800">
            <div className="max-w-screen-2xl mx-auto px-2 sm:px-6 overflow-x-clip">
                <div className="flex items-center justify-between h-12 gap-2 min-w-0">

                    {/* ── Logo ── */}
                    <div className="shrink min-w-0 max-w-[128px] sm:max-w-none">
                        <Logo />
                    </div>

                    {/* ── Search (non-home pages) ── */}
                    {showTopSearch && (
                        <div className="hidden md:flex flex-1 max-w-2xl mx-2">
                            <SearchBar variant="navbar" className="w-full" />
                        </div>
                    )}

                    {/* ── Right cluster ── */}
                    <div className="flex items-center gap-0.5 sm:gap-1 min-w-0">

                        {/* Country selector */}
                        <div ref={countryRef} className="relative hidden md:block">
                            <button
                                onClick={() => setCountryOpen(v => !v)}
                                onMouseEnter={() => setCountryOpen(true)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors text-xs font-medium text-gray-700 dark:text-white whitespace-nowrap"
                            >
                                <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-500 dark:text-white" />
                                <span className="hidden lg:inline text-gray-400 dark:text-white/70">Ship to</span>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                    {selectedCountry.flag} {selectedCountry.code}
                                </span>
                                <ChevronDown className={`h-3 w-3 text-gray-400 dark:text-white/70 transition-transform duration-200 ${countryOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {countryOpen && (
                                <div
                                    className="absolute top-full left-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-1.5 z-[200] overflow-hidden"
                                    style={{ animation: 'dropIn 0.15s cubic-bezier(0.16,1,0.3,1) forwards' }}
                                    onMouseLeave={() => setCountryOpen(false)}
                                >
                                    <p className="px-3 pt-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                                        Delivery region
                                    </p>
                                    {COUNTRIES.map(c => (
                                        <button
                                            key={c.code}
                                            onClick={() => { setSelectedCountry(c); setCountryOpen(false) }}
                                            className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors
                                                ${selectedCountry.code === c.code
                                                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 font-semibold'
                                                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            <span className="text-xl leading-none">{c.flag}</span>
                                            <span>{c.name}</span>
                                            {selectedCountry.code === c.code && (
                                                <span className="ml-auto text-orange-500 text-xs">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Divider */}
                        <div className="hidden md:block h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

                        {/* Currency selector */}
                        <div className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors">
                            <Globe className="h-3.5 w-3.5 text-gray-500 dark:text-white shrink-0" />
                            <select
                                value={currency}
                                onChange={e => setCurrency(e.target.value)}
                                className="bg-transparent border-none text-gray-700 dark:text-white focus:outline-none cursor-pointer font-medium text-xs leading-none"
                            >
                                {CURRENCIES.map(c => (
                                    <option key={c} value={c} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Divider */}
                        <div className="hidden sm:block h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

                        {/* Theme toggle */}
                        <button
                            onClick={toggleTheme}
                            aria-label="Toggle theme"
                            className="hidden sm:inline-flex p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors text-gray-600 dark:text-white"
                        >
                            {theme === 'dark'
                                ? <Sun  className="h-4 w-4" />
                                : <Moon className="h-4 w-4" />
                            }
                        </button>

                        {/* Wishlist */}
                        <Link
                            href="/wishlist"
                            className="hidden sm:flex items-center gap-1.5 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors text-gray-600 dark:text-white"
                            aria-label={`Wishlist (${wishlistCount} items)`}
                        >
                            <NavBadge count={wishlistCount}>
                                <Heart className="h-4 w-4" />
                            </NavBadge>
                        </Link>

                        {/* Cart */}
                        <Link
                            href="/cart"
                            className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors text-gray-700 dark:text-white"
                            aria-label={`Cart (${cartCount} items)`}
                        >
                            <NavBadge count={cartCount}>
                                <ShoppingCart className="h-4 w-4" />
                            </NavBadge>
                            <span className="hidden md:inline text-xs font-medium">
                                Cart
                                {cartCount > 0 && (
                                    <span className="ml-1 text-orange-500 font-bold">({cartCount})</span>
                                )}
                            </span>
                        </Link>

                        {/* Sign In */}
                        <Link
                            href="/auth/login"
                            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 ml-0.5 rounded-md bg-orange-500 hover:bg-orange-600 active:bg-orange-700 transition-colors font-semibold text-xs text-white shadow-sm whitespace-nowrap"
                        >
                            <User className="h-3.5 w-3.5 shrink-0" />
                            <span className="hidden sm:inline">Sign In</span>
                        </Link>
                    </div>
                </div>

                {/* ── Search (mobile / tablet) ── */}
                {showTopSearch && (
                    <div className="md:hidden pb-2">
                        <SearchBar variant="navbar" className="w-full" />
                    </div>
                )}
            </div>

            {/* Keyframe for country dropdown */}
            <style>{`
                @keyframes dropIn {
                    from { opacity: 0; transform: translateY(6px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    )
}