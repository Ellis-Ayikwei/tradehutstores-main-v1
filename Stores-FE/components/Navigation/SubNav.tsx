'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
    Shield,
    HelpCircle,
    Store,
    ChevronDown,
    ChevronRight,
    Grid3x3,
    ShieldCheck,
    Flame,
    Tag,
    Gavel,
    FileText,
    ArrowRight,
    LayoutGrid,
    MoreHorizontal,
} from 'lucide-react'
import {
    categoryHref,
    openNavDrawer,
    useNavCategories,
    useSellerNav,
    type NavCategory,
} from '@/components/Navigation/navData'
import SellerNavLink, { SellerNavBadge } from '@/components/seller-onboarding/SellerNavLink'

// ─── Types ───────────────────────────────────────────────────────────────────

// ─── Hook: hover + click popover ─────────────────────────────────────────────
// Desktop: opens on mouseenter, closes after a short delay on mouseleave
// so the cursor can travel into the panel without it snapping shut.
// Touch / keyboard: click toggles.

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
            onKeyDown={(e) => { if (e.key === 'Escape') close() }}
        >
            <button
                type="button"
                onClick={onClick}
                aria-expanded={open}
                aria-haspopup="true"
                className="outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded"
            >
                {trigger(open)}
            </button>

            {open && (
                <>
                    {/* Invisible bridge so the gap between button and panel doesn't trigger mouseleave */}
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

const popoverTrigger = (open: boolean) =>
    `flex items-center gap-1.5 px-3 h-10 rounded-md text-sm font-medium transition-all whitespace-nowrap
     ${open
        ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950'
        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'}`

// ─── Mega popover: category rail + subcategory pane ──────────────────────────

function MegaPanel({ categories, loading, error, close }: { categories: NavCategory[]; loading: boolean; error: boolean; close: () => void }) {
    const [active, setActive] = useState(0)
    const current = categories[Math.min(active, categories.length - 1)] as NavCategory | undefined

    return (
        <div
            className="rounded-xl shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
            style={{ width: 'min(96vw, 880px)' }}
        >
            <div className="flex items-center justify-between px-5 py-2.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                    Shop by category
                </span>
                <Link
                    href="/categories"
                    onClick={close}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
                >
                    View all <ArrowRight className="h-3 w-3" />
                </Link>
            </div>

            {categories.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-500 dark:text-gray-400">
                    {loading
                        ? 'Loading categories…'
                        : error
                          ? 'Categories could not be loaded. Try again shortly.'
                          : 'No categories yet.'}
                </p>
            ) : (
            <div className="flex max-h-[70vh] min-h-[320px]">
                <ul className="w-60 shrink-0 overflow-y-auto border-r border-gray-100 dark:border-gray-800 py-1.5" role="menu">
                    {categories.map((cat, i) => (
                        <li key={cat.name} role="none">
                            <Link
                                href={categoryHref(cat.name)}
                                role="menuitem"
                                onClick={close}
                                onMouseEnter={() => setActive(i)}
                                onFocus={() => setActive(i)}
                                className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors
                                    ${i === active
                                        ? 'bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 font-semibold'
                                        : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                            >
                                <span className="flex min-w-0 items-center gap-2.5">
                                    <span className="text-base leading-none">{cat.icon}</span>
                                    <span className="truncate">{cat.name}</span>
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                            </Link>
                        </li>
                    ))}
                </ul>

                {current && (
                    <div className="min-w-0 flex-1 overflow-y-auto p-5">
                        <Link
                            href={categoryHref(current.name)}
                            onClick={close}
                            className="mb-3 inline-flex items-center gap-1.5 text-base font-bold text-gray-900 dark:text-white hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                        >
                            {current.name}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        {current.subcategories.length === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No subcategories yet.</p>
                        ) : (
                            <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
                                {current.subcategories.map((sub) => (
                                    <li key={sub.name}>
                                        <Link
                                            href={categoryHref(current.name, sub.name)}
                                            onClick={close}
                                            className="flex min-h-[36px] items-center justify-between gap-2 rounded-md px-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                        >
                                            <span className="min-w-0 truncate">{sub.name}</span>
                                            <span className="shrink-0 text-xs tabular-nums text-gray-300 dark:text-gray-600">
                                                {sub.count.toLocaleString()}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
            )}
        </div>
    )
}

function AllCategoriesPopover({ categories, loading, error }: { categories: NavCategory[]; loading: boolean; error: boolean }) {
    return (
        <HoverPopover
            trigger={(open) => (
                <span
                    className={`flex items-center gap-1.5 px-3 h-10 rounded-md text-sm font-bold transition-all whitespace-nowrap
                    ${open ? 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-none' : 'text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    <Grid3x3 className="h-4 w-4 shrink-0" />
                    All categories
                    <ChevronDown className={`h-3.5 w-3.5 ml-0.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </span>
            )}
            panel={(close) => <MegaPanel categories={categories} loading={loading} error={error} close={close} />}
        />
    )
}

/** All products, buyer central, help — keeps the sub-nav row uncluttered. */
function ShopMorePopover() {
    const items = [
        { href: '/products', icon: LayoutGrid, label: 'All products' },
        { href: '/buyer-central', icon: Tag, label: 'Buyer Central' },
        { href: '/buyer-protection', icon: Shield, label: 'Buyer protection' },
        { href: '/help', icon: HelpCircle, label: 'Help' },
    ] as const

    return (
        <HoverPopover
            trigger={(open) => (
                <span className={popoverTrigger(open)}>
                    <MoreHorizontal className="h-4 w-4 shrink-0" />
                    <span>More</span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                </span>
            )}
            panel={(close) => (
                <div className="w-56 rounded-xl shadow-2xl ring-1 ring-gray-200 dark:ring-gray-800 bg-white dark:bg-gray-900 overflow-hidden py-1">
                    {items.map(({ href, icon: Icon, label }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={close}
                            className="flex items-center gap-3 px-3 min-h-[44px] text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-orange-50 dark:hover:bg-orange-950 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                        >
                            <Icon className="h-4 w-4 text-gray-500 dark:text-gray-400 shrink-0" />
                            {label}
                        </Link>
                    ))}
                </div>
            )}
        />
    )
}

// ─── SubNav ───────────────────────────────────────────────────────────────────

const LINKS = [
    { href: '/deals',    label: "Today's Deals", short: 'Deals',       icon: Flame,    accent: true },
    { href: '/auctions', label: 'Bid Central',   short: 'Bid Central', icon: Gavel,    accent: false },
    { href: '/rfq',      label: 'RFQ',           short: 'RFQ',         icon: FileText, accent: false },
] as const

export default function SubNav() {
    const { categories, loading, error } = useNavCategories()
    const pathname = usePathname()
    const sellerNav = useSellerNav()

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

    return (
        <>
            <style>{`
                @keyframes subnavDrop {
                    from { opacity: 0; transform: translateY(8px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0)   scale(1); }
                }
            `}</style>

            <nav aria-label="Marketplace" className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm relative z-50">
                <div className="max-w-screen-2xl mx-auto px-2 sm:px-6">

                    {/* ═════════ Desktop (lg+) ═════════ */}
                    <div className="hidden lg:flex items-center h-11 gap-0.5">
                        <AllCategoriesPopover categories={categories} loading={loading} error={error} />

                        {LINKS.map(({ href, label, icon: Icon, accent }) => (
                            <Link
                                key={href}
                                href={href}
                                aria-current={isActive(href) ? 'page' : undefined}
                                className={`flex items-center gap-1.5 px-3 h-10 rounded-md text-sm font-medium whitespace-nowrap transition-colors
                                    ${isActive(href)
                                        ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950'
                                        : 'text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950'}`}
                            >
                                <Icon className={`h-4 w-4 ${accent ? 'text-orange-500' : ''}`} />
                                {label}
                            </Link>
                        ))}

                        <Link
                            href="/buyer-protection"
                            aria-current={isActive('/buyer-protection') ? 'page' : undefined}
                            className="hidden xl:flex items-center gap-1.5 px-3 h-10 rounded-md text-sm font-medium whitespace-nowrap text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950 transition-colors"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            Buyer protection
                        </Link>
                        <ShopMorePopover />

                        <div className="ml-auto flex items-center gap-1 shrink-0">
                            <SellerNavLink
                                item={sellerNav}
                                className="flex items-center gap-1.5 px-4 h-9 rounded-md bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-bold transition-colors whitespace-nowrap shadow-sm"
                            >
                                <Store className="h-4 w-4" />
                                {sellerNav.label}
                                {sellerNav.badge ? <SellerNavBadge text={sellerNav.badge} /> : null}
                            </SellerNavLink>
                        </div>
                    </div>

                    {/* ═════════ Mobile / tablet rail (below lg) ═════════ */}
                    <div className="lg:hidden flex items-stretch h-11 gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <button
                            type="button"
                            onClick={openNavDrawer}
                            className="flex shrink-0 items-center gap-1.5 px-3 text-sm font-bold text-gray-800 dark:text-gray-100"
                        >
                            <Grid3x3 className="h-4 w-4 text-orange-500" />
                            Categories
                        </button>

                        {LINKS.map(({ href, short, icon: Icon, accent }) => (
                            <Link
                                key={href}
                                href={href}
                                aria-current={isActive(href) ? 'page' : undefined}
                                className={`flex shrink-0 items-center gap-1.5 px-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                                    ${isActive(href)
                                        ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                                        : 'border-transparent text-gray-700 dark:text-gray-300'}`}
                            >
                                <Icon className={`h-4 w-4 ${accent ? 'text-orange-500' : 'text-gray-400'}`} />
                                {short}
                            </Link>
                        ))}

                        <SellerNavLink
                            item={sellerNav}
                            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md bg-orange-500 px-3 text-sm font-bold text-white whitespace-nowrap hover:bg-orange-600 active:bg-orange-700 transition-colors"
                        >
                            <Store className="h-4 w-4" />
                            {sellerNav.shortLabel}
                            {sellerNav.badge ? (
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300 ring-2 ring-white" role="img" aria-label={sellerNav.badge} />
                            ) : null}
                        </SellerNavLink>
                    </div>
                </div>
            </nav>
        </>
    )
}
