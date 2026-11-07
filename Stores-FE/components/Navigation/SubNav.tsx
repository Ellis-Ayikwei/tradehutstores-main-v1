'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, ChevronRight, Grid3x3, MoreHorizontal, Store } from 'lucide-react'
import {
    categoryHref,
    openNavDrawer,
    useNavCategories,
    useSellerNav,
    type NavCategory,
} from '@/components/Navigation/navData'
import SellerNavLink, { SellerNavBadge } from '@/components/seller-onboarding/SellerNavLink'

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
                className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            >
                {trigger(open)}
            </button>

            {open && (
                <>
                    {/* Invisible bridge so the gap between button and panel doesn't trigger mouseleave */}
                    <div className="absolute left-0 top-full z-[199] h-2 w-full" />
                    <div
                        className="absolute left-0 z-[200] mt-1"
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

// ─── Shared classes ──────────────────────────────────────────────────────────

const panelSurface =
    'rounded-md border border-zinc-300 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900'

const popoverTrigger = (open: boolean) =>
    `flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap ${
        open
            ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white'
            : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
    }`

// ─── Mega popover: category rail + subcategory pane ──────────────────────────

function MegaPanel({ categories, loading, error, close }: { categories: NavCategory[]; loading: boolean; error: boolean; close: () => void }) {
    const [active, setActive] = useState(0)
    const current = categories[Math.min(active, categories.length - 1)] as NavCategory | undefined

    return (
        <div className={`${panelSurface} overflow-hidden`} style={{ width: 'min(96vw, 880px)' }}>
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100 px-5 py-2.5 dark:border-zinc-800 dark:bg-zinc-800">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Shop by category</span>
                <Link
                    href="/categories"
                    onClick={close}
                    className="text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400"
                >
                    View all
                </Link>
            </div>

            {categories.length === 0 ? (
                <p className="px-5 py-8 text-sm text-zinc-600 dark:text-zinc-400">
                    {loading
                        ? 'Loading categories…'
                        : error
                          ? 'Categories could not be loaded. Try again shortly.'
                          : 'No categories yet.'}
                </p>
            ) : (
                <div className="flex max-h-[70vh] min-h-[320px]">
                    <ul className="w-60 shrink-0 overflow-y-auto border-r border-zinc-200 py-1 dark:border-zinc-800" role="menu">
                        {categories.map((cat, i) => (
                            <li key={cat.name} role="none">
                                <Link
                                    href={categoryHref(cat.name)}
                                    role="menuitem"
                                    onClick={close}
                                    onMouseEnter={() => setActive(i)}
                                    onFocus={() => setActive(i)}
                                    className={`flex items-center justify-between gap-2 px-4 py-2.5 text-sm ${
                                        i === active
                                            ? 'bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-white'
                                            : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800'
                                    }`}
                                >
                                    <span className="truncate">{cat.name}</span>
                                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {current && (
                        <div className="min-w-0 flex-1 overflow-y-auto p-5">
                            <Link
                                href={categoryHref(current.name)}
                                onClick={close}
                                className="mb-3 inline-block text-base font-bold text-zinc-900 hover:text-primary-700 hover:underline dark:text-white dark:hover:text-primary-400"
                            >
                                {current.name}
                            </Link>
                            {current.subcategories.length === 0 ? (
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">No subcategories yet.</p>
                            ) : (
                                <ul className="grid grid-cols-2 gap-x-6 gap-y-1">
                                    {current.subcategories.map((sub) => (
                                        <li key={sub.name}>
                                            <Link
                                                href={categoryHref(current.name, sub.name)}
                                                onClick={close}
                                                className="flex min-h-[36px] items-center justify-between gap-2 rounded-md px-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-primary-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-primary-400"
                                            >
                                                <span className="min-w-0 truncate">{sub.name}</span>
                                                <span className="shrink-0 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
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
                    className={`flex h-10 items-center gap-1.5 rounded-md px-3 text-sm font-bold whitespace-nowrap ${
                        open
                            ? 'bg-primary-700 text-white'
                            : 'text-zinc-900 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                >
                    <Grid3x3 className="h-4 w-4 shrink-0" aria-hidden />
                    All categories
                    <ChevronDown className={`ml-0.5 h-3.5 w-3.5 ${open ? 'rotate-180' : ''}`} aria-hidden />
                </span>
            )}
            panel={(close) => <MegaPanel categories={categories} loading={loading} error={error} close={close} />}
        />
    )
}

/** All products, buyer central, protection, help: keeps the sub-nav row uncluttered. */
function ShopMorePopover() {
    const items = [
        { href: '/products', label: 'All products' },
        { href: '/buyer-central', label: 'Buyer Central' },
        { href: '/buyer-protection', label: 'Buyer protection' },
        { href: '/help', label: 'Help' },
    ] as const

    return (
        <HoverPopover
            trigger={(open) => (
                <span className={popoverTrigger(open)}>
                    <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden />
                    <span>More</span>
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 ${open ? 'rotate-180' : ''}`} aria-hidden />
                </span>
            )}
            panel={(close) => (
                <div className={`${panelSurface} w-56 overflow-hidden py-1`}>
                    {items.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={close}
                            className="flex min-h-[44px] items-center px-3 text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
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
    { href: '/deals',    label: "Today's Deals", short: 'Deals' },
    { href: '/auctions', label: 'Bid Central',   short: 'Bid Central' },
    { href: '/rfq',      label: 'RFQ',           short: 'RFQ' },
] as const

/**
 * Desktop bar (lg+). Rendered inside MainLayout's sticky block, which supplies the
 * background and the bottom border; hidden below lg.
 */
function SubNavDesktop() {
    const { categories, loading, error } = useNavCategories()
    const pathname = usePathname()
    const sellerNav = useSellerNav()

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

    return (
        <nav aria-label="Marketplace" className="relative z-50 hidden border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:block">
            <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 lg:px-6">
                <div className="flex h-11 items-center gap-0.5">
                    <AllCategoriesPopover categories={categories} loading={loading} error={error} />

                    {LINKS.map(({ href, label }) => (
                        <Link
                            key={href}
                            href={href}
                            aria-current={isActive(href) ? 'page' : undefined}
                            className={`flex h-10 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                                isActive(href)
                                    ? 'bg-zinc-100 text-primary-700 dark:bg-zinc-800 dark:text-primary-400'
                                    : 'text-zinc-800 dark:text-zinc-200'
                            }`}
                        >
                            {label}
                        </Link>
                    ))}

                    <Link
                        href="/buyer-protection"
                        aria-current={isActive('/buyer-protection') ? 'page' : undefined}
                        className="hidden h-10 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-zinc-800 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800 xl:flex"
                    >
                        Buyer protection
                    </Link>
                    <ShopMorePopover />

                    <div className="ml-auto flex shrink-0 items-center gap-1">
                        <SellerNavLink
                            item={sellerNav}
                            className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary-700 px-4 text-sm font-bold text-white hover:bg-primary-800"
                        >
                            <Store className="h-4 w-4" aria-hidden />
                            {sellerNav.label}
                            {sellerNav.badge ? <SellerNavBadge text={sellerNav.badge} /> : null}
                        </SellerNavLink>
                    </div>
                </div>
            </div>
        </nav>
    )
}

/**
 * Mobile / tablet rail (below lg). Rendered in normal flow after the sticky header so it
 * scrolls away with the page; hidden at lg+.
 */
function SubNavRail() {
    const pathname = usePathname()
    const sellerNav = useSellerNav()

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

    return (
        <nav aria-label="Marketplace" className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:hidden">
            <div className="mx-auto max-w-screen-2xl px-3 sm:px-4">
                <div className="flex h-11 items-stretch gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <button
                        type="button"
                        onClick={openNavDrawer}
                        className="flex shrink-0 items-center gap-1.5 pr-3 text-sm font-bold text-zinc-900 dark:text-zinc-100"
                    >
                        <Grid3x3 className="h-4 w-4" aria-hidden />
                        Categories
                    </button>

                    {LINKS.map(({ href, short }) => (
                        <Link
                            key={href}
                            href={href}
                            aria-current={isActive(href) ? 'page' : undefined}
                            className={`flex shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium ${
                                isActive(href)
                                    ? 'border-primary-700 text-primary-700 dark:border-primary-400 dark:text-primary-400'
                                    : 'border-transparent text-zinc-800 dark:text-zinc-200'
                            }`}
                        >
                            {short}
                        </Link>
                    ))}

                    <SellerNavLink
                        item={sellerNav}
                        className="my-1 ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary-700 px-3 text-sm font-bold text-white hover:bg-primary-800"
                    >
                        <Store className="h-4 w-4" aria-hidden />
                        {sellerNav.shortLabel}
                        {sellerNav.badge ? (
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300 ring-2 ring-primary-700" role="img" aria-label={sellerNav.badge} />
                        ) : null}
                    </SellerNavLink>
                </div>
            </div>
        </nav>
    )
}

/**
 * `sticky`: desktop bar, goes inside the pinned header block (visible at lg+ only).
 * `inline`: mobile category rail, goes in normal flow so it scrolls away (visible below lg only).
 * Mount both in MainLayout; CSS shows exactly one per breakpoint.
 */
export default function SubNav({ placement }: { placement: 'sticky' | 'inline' }) {
    return placement === 'sticky' ? <SubNavDesktop /> : <SubNavRail />
}
