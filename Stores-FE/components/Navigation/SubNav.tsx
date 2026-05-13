'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useCatalogCategories } from '@/hooks/useCatalogCategories'
import {
    Shield,
    Star,
    HelpCircle,
    Store,
    ChevronDown,
    Grid3x3,
    Award,
    Truck,
    ShieldCheck,
    BadgeCheck,
    Lock,
    Flame,
    Tag,
    Menu,
    Gavel,
    X,
    ArrowRight,
    Zap,
    LayoutGrid,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type Subcategory = { name: string; count: number }
type Category = { name: string; icon: string; subcategories: Subcategory[] }
type FeaturedItem = {
    title: string
    description: string
    icon: React.ElementType
    color: string
    bgColor: string
    href: string
}
type ProtectionFeature = {
    title: string
    description: string
    icon: React.ElementType
}

// ─── Hook: hover + click popover ─────────────────────────────────────────────
// Desktop: opens on mouseenter, closes after a short delay on mouseleave
// so the cursor can travel into the panel without it snapping shut.
// Mobile: purely click-driven (no hover events on touch screens).

function useHoverPopover(delay = 120) {
    const [open, setOpen] = useState(false)
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const clear = () => { if (timer.current) clearTimeout(timer.current) }

    const onMouseEnter = useCallback(() => { clear(); setOpen(true) }, [])
    const onMouseLeave = useCallback(() => {
        clear()
        timer.current = setTimeout(() => setOpen(false), delay)
    }, [delay])
    const onClick = useCallback(() => setOpen((v) => !v), [])
    const close = useCallback(() => setOpen(false), [])

    useEffect(() => () => clear(), [])

    return { open, onMouseEnter, onMouseLeave, onClick, close }
}

// ─── Reusable HoverPopover wrapper ───────────────────────────────────────────

function HoverPopover({
    trigger,
    panel,
    className = '',
}: {
    trigger: (open: boolean) => React.ReactNode
    panel: (close: () => void) => React.ReactNode
    className?: string
}) {
    const { open, onMouseEnter, onMouseLeave, onClick, close } = useHoverPopover()

    return (
        <div
            className={`relative ${className}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <button onClick={onClick} aria-expanded={open} className="outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded">
                {trigger(open)}
            </button>

            {open && (
                <>
                    {/* Invisible bridge: prevents the gap between button and panel from triggering mouseleave */}
                    <div className="absolute left-0 top-full h-3 w-full z-[199]" />
                    <div
                        className="absolute left-0 z-[200] mt-3"
                        style={{ animation: 'subnavDrop 0.18s cubic-bezier(0.16,1,0.3,1) forwards' }}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        {panel(close)}
                    </div>
                </>
            )}
        </div>
    )
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const staticNavCategories: Category[] = [
    {
        name: 'Electronics',
        icon: '📱',
        subcategories: [
            { name: 'Smartphones', count: 1240 },
            { name: 'Laptops & Computers', count: 856 },
            { name: 'Tablets & E-readers', count: 432 },
            { name: 'Audio & Headphones', count: 678 },
            { name: 'Cameras & Photo', count: 345 },
            { name: 'Wearables', count: 234 },
        ],
    },
    {
        name: 'Fashion',
        icon: '👔',
        subcategories: [
            { name: "Men's Clothing", count: 2100 },
            { name: "Women's Clothing", count: 3200 },
            { name: 'Kids & Baby', count: 1450 },
            { name: 'Shoes & Footwear', count: 980 },
            { name: 'Bags & Accessories', count: 760 },
            { name: 'Jewelry & Watches', count: 540 },
        ],
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
            { name: 'Tools & Improvement', count: 720 },
        ],
    },
    {
        name: 'Sports',
        icon: '⚽',
        subcategories: [
            { name: 'Exercise & Fitness', count: 890 },
            { name: 'Camping & Hiking', count: 560 },
            { name: 'Sports Equipment', count: 1230 },
            { name: 'Cycling', count: 340 },
            { name: 'Water Sports', count: 210 },
            { name: 'Team Sports', count: 670 },
        ],
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
        ],
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
        ],
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
        ],
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
        ],
    },
]

const featuredItems: FeaturedItem[] = [
    { title: 'Trade Assurance', description: 'Order protection from payment to delivery', icon: ShieldCheck, color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', href: '/featured/trade-assurance' },
    { title: 'Verified Suppliers', description: 'Connect with trusted, certified suppliers', icon: BadgeCheck, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/30', href: '/featured/verified-suppliers' },
    { title: 'Quality Inspection', description: 'Professional quality control services', icon: Award, color: 'text-violet-500', bgColor: 'bg-violet-50 dark:bg-violet-900/30', href: '/featured/quality' },
    { title: 'Secure Payment', description: 'Multiple secure payment options', icon: Lock, color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/30', href: '/featured/payment' },
]

const protectionFeatures: ProtectionFeature[] = [
    { title: 'Payment Protection', description: 'Your money is safe until you receive your order', icon: ShieldCheck },
    { title: 'Product Quality', description: 'Guaranteed product quality or full refund', icon: Award },
    { title: 'On-time Shipping', description: 'Receive your order on time or get compensated', icon: Truck },
    { title: 'Dispute Resolution', description: '24/7 support to help resolve any issues', icon: HelpCircle },
]

const categoryIcons = ['📱', '👔', '🏠', '⚽', '💄', '🎮', '📚', '🚗', '🛠️', '📦']

function AllCategoriesPopover({
    categories,
}: {
    categories: Category[]
}) {
    return (
        <HoverPopover
            trigger={(open) => (
                <span className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap
                    ${open ? 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-none' : 'text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    <Grid3x3 className="h-4 w-4 shrink-0" />
                    <span className="hidden lg:inline">All Categories</span>
                    <span className="lg:hidden">Categories</span>
                    <ChevronDown className={`h-3.5 w-3.5 ml-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </span>
            )}
            panel={(close) => (
                <div
                    className="rounded-xl shadow-2xl ring-1 ring-black/[0.08] dark:ring-white/10 bg-white dark:bg-gray-900 overflow-hidden max-w-[96vw]"
                    style={{ width: 'min(96vw, 960px)' }}
                >
                    <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">Browse All Categories</span>
                        <Link href="/categories" onClick={close} className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors">
                            View all <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                    <div className="max-h-[72vh] overflow-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 divide-x divide-gray-100 dark:divide-gray-800 min-w-[720px] md:min-w-0">
                        {categories.map((cat, i) => (
                            <div key={i} className="p-4 hover:bg-orange-50/60 dark:hover:bg-orange-900/10 transition-colors">
                                <Link
                                    href={`/products?category=${encodeURIComponent(cat.name)}`}
                                    onClick={close}
                                    className="flex items-center gap-2 mb-3 group"
                                >
                                    <span className="text-xl leading-none">{cat.icon}</span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">{cat.name}</span>
                                </Link>
                                <ul className="space-y-1.5">
                                    {cat.subcategories.map((sub, j) => (
                                        <li key={j}>
                                            <Link
                                                href={`/products?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                                                onClick={close}
                                                className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors group/s"
                                            >
                                                <span className="pr-2">{sub.name}</span>
                                                <span className="text-gray-300 dark:text-gray-700 group-hover/s:text-orange-300 tabular-nums transition-colors">
                                                    {sub.count.toLocaleString()}
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
            )}
        />
    )
}

function FeaturedPopover() {
    return (
        <HoverPopover
            trigger={(open) => (
                <span className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap
                    ${open ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    <Star className="h-3.5 w-3.5 shrink-0" />
                    <span className="hidden lg:inline">Featured</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </span>
            )}
            panel={(close) => (
                <div className="w-80 rounded-xl shadow-2xl ring-1 ring-black/[0.08] dark:ring-white/10 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">Featured Programs</span>
                    </div>
                    <div className="p-2 space-y-0.5">
                        {featuredItems.map((item, i) => {
                            const Icon = item.icon
                            return (
                                <Link key={i} href={item.href} onClick={close}
                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                                >
                                    <div className={`p-2 rounded-lg ${item.bgColor} shrink-0`}>
                                        <Icon className={`h-5 w-5 ${item.color}`} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">{item.title}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{item.description}</p>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                    <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
                        <Link href="/featured" onClick={close} className="text-xs font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors">
                            View all featured <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            )}
        />
    )
}

function OrderProtectionPopover() {
    return (
        <HoverPopover
            className="hidden lg:block"
            trigger={(open) => (
                <span className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap
                    ${open ? 'text-orange-500 bg-orange-50 dark:bg-orange-900/20' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    <Shield className="h-3.5 w-3.5 shrink-0" />
                    <span>Order Protection</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </span>
            )}
            panel={(close) => (
                <div className="w-[420px] rounded-xl shadow-2xl ring-1 ring-black/[0.08] dark:ring-white/10 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="bg-gradient-to-br from-orange-500 to-rose-500 px-5 py-4 text-white">
                        <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck className="h-5 w-5" />
                            <h3 className="text-base font-bold">Trade Assurance</h3>
                        </div>
                        <p className="text-sm text-white/85 leading-snug">
                            Comprehensive protection for every order — from payment to your door.
                        </p>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-2">
                        {protectionFeatures.map((f, i) => {
                            const Icon = f.icon
                            return (
                                <div key={i} className="p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-orange-200 dark:hover:border-orange-800 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-all group">
                                    <Icon className="h-5 w-5 text-orange-500 mb-2" />
                                    <p className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">{f.title}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{f.description}</p>
                                </div>
                            )
                        })}
                    </div>
                    <div className="px-4 pb-4">
                        <Link href="/protection" onClick={close}
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                            Learn More <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            )}
        />
    )
}

// ─── SubNav ───────────────────────────────────────────────────────────────────

export default function SubNav() {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [expandedCat, setExpandedCat] = useState<number | null>(null)
    const { categories: catalogRows } = useCatalogCategories()

    const apiCategories = useMemo((): Category[] => {
        if (catalogRows.length === 0) return staticNavCategories
        return catalogRows.map((row, index) => ({
            name: row.name,
            icon: categoryIcons[index % categoryIcons.length],
            subcategories: row.subcategories,
        }))
    }, [catalogRows])

    // Close mobile menu on resize to desktop
    useEffect(() => {
        const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
        window.addEventListener('resize', handler)
        return () => window.removeEventListener('resize', handler)
    }, [])

    return (
        <>
            <style>{`
                @keyframes subnavDrop {
                    from { opacity: 0; transform: translateY(8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1); }
                }
            `}</style>

            <nav className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm relative z-50">
                <div className="max-w-screen-2xl mx-auto px-3 sm:px-6">
                    <div className="flex items-center h-11 gap-1">

                        {/* ════════════════════ DESKTOP LEFT ════════════════════ */}
                        <div className="hidden md:flex items-center gap-0.5 flex-1 min-w-0">

                            {/* ── All Categories ── */}
                            <AllCategoriesPopover categories={apiCategories} />

                            {/* ── Featured ── */}
                            <FeaturedPopover />

                            {/* ── Order Protection ── */}
                            <OrderProtectionPopover />

                            {/* ── Quick links ── */}
                            <Link
                                href="/products"
                                className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors whitespace-nowrap"
                            >
                                <LayoutGrid className="h-3.5 w-3.5 text-orange-500" />
                                All products
                            </Link>
                            <Link href="/deals" className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors whitespace-nowrap">
                                <Flame className="h-3.5 w-3.5 text-orange-500" />
                                Today's Deals
                            </Link>
                            <Link href="/new-arrivals" className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors whitespace-nowrap">
                                <Zap className="h-3.5 w-3.5 text-orange-500" />
                                New Arrivals
                            </Link>
                        </div>

                        {/* ════════════════════ DESKTOP RIGHT ════════════════════ */}
                        <div className="hidden md:flex items-center gap-1 ml-auto shrink-0">
                            <Link href="/buyer-central" className="px-3 py-2 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors whitespace-nowrap">
                                Buyer Central
                            </Link>
                            <Link href="/help" className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 font-medium transition-colors whitespace-nowrap">
                                <HelpCircle className="h-3.5 w-3.5" />
                                Help
                            </Link>
                            <Link href="/sell" className="flex items-center gap-1.5 px-3 py-2 ml-1 rounded-md bg-tertiary hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-bold transition-colors whitespace-nowrap shadow-sm">
                                <Store className="h-3.5 w-3.5" />
                                <span className="hidden lg:inline">Start Selling</span>
                                <span className="lg:hidden">Sell</span>
                            </Link>
                        </div>

                        {/* ════════════════════ MOBILE ════════════════════ */}
                        <div className="md:hidden flex items-center justify-between w-full">
                            {/* Hamburger */}
                            <button
                                onClick={() => setMobileOpen((v) => !v)}
                                aria-label="Toggle menu"
                                aria-expanded={mobileOpen}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                {mobileOpen
                                    ? <X className="h-5 w-5 text-orange-500" />
                                    : <Grid3x3 className="h-4 w-4 text-orange-500" />
                                }
                                <span className="text-sm font-semibold">{mobileOpen ? 'Close' : 'Menu'}</span>
                            </button>

                            {/* Mobile quick actions */}
                            <div className="flex items-center gap-1">
                                <Link href="/products" className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                    Products
                                </Link>
                                <Link href="/deals" className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                                    <Flame className="h-3.5 w-3.5" />
                                    Deals
                                </Link>
                                <Link href="/deals" className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors">
                                    <Gavel className="h-3.5 w-3.5" />
                                    Bid Zone
                                </Link>
                                <Link href="/help" className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <HelpCircle className="h-3.5 w-3.5" />
                                    Help
                                </Link>
                                <Link href="/sell" className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-colors shadow-sm">
                                    <Store className="h-3 w-3" />
                                    Sell
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ════════════════════ MOBILE DRAWER ════════════════════ */}
                {mobileOpen && (
                    <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 max-h-[80vh] overflow-y-auto">

                        {/* Category accordion */}
                        <div className="px-3 pt-3 pb-1">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-600 mb-2 px-1">Browse Categories</p>
                            {apiCategories.map((cat, i) => (
                                <div key={i}>
                                    <button
                                        onClick={() => setExpandedCat(expandedCat === i ? null : i)}
                                        className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                    >
                                        <span className="flex items-center gap-2.5 text-sm font-semibold text-gray-800 dark:text-gray-200">
                                            <span className="text-base leading-none">{cat.icon}</span>
                                            {cat.name}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${expandedCat === i ? 'rotate-180 text-orange-500' : ''}`} />
                                    </button>

                                    {expandedCat === i && (
                                        <div className="ml-9 mb-1 grid grid-cols-2 gap-x-3 gap-y-0.5 pb-2">
                                            {cat.subcategories.map((sub, j) => (
                                                <Link
                                                    key={j}
                                                    href={`/products?category=${encodeURIComponent(cat.name)}&subcategory=${encodeURIComponent(sub.name)}`}
                                                    onClick={() => setMobileOpen(false)}
                                                    className="flex items-center justify-between py-1.5 pr-2 text-xs text-gray-500 dark:text-gray-400 hover:text-orange-500 transition-colors"
                                                >
                                                    <span>{sub.name}</span>
                                                    <span className="text-gray-300 dark:text-gray-700 tabular-nums">{sub.count.toLocaleString()}</span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Quick links */}
                        <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2">
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-600 mb-2 px-1 pt-1">Quick Links</p>
                            {[
                                { href: '/products', icon: LayoutGrid, label: 'All products' },
                                { href: '/new-arrivals', icon: Zap, label: 'New Arrivals' },
                                { href: '/featured', icon: Star, label: 'Featured Selections' },
                                { href: '/protection', icon: Shield, label: 'Order Protection' },
                                { href: '/buyer-central', icon: Tag, label: 'Buyer Central' },
                            ].map(({ href, icon: Icon, label }) => (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors"
                                >
                                    <Icon className="h-4 w-4 text-gray-400 shrink-0" />
                                    {label}
                                </Link>
                            ))}
                        </div>

                        {/* Mobile CTA */}
                        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-800">
                            <Link
                                href="/sell"
                                onClick={() => setMobileOpen(false)}
                                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold text-sm shadow-lg shadow-orange-200 dark:shadow-none hover:opacity-90 active:opacity-95 transition-opacity"
                            >
                                <Store className="h-4 w-4" />
                                Start Selling on TradeHutStores
                            </Link>
                        </div>
                    </div>
                )}
            </nav>
        </>
    )
}