'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
    Baby,
    BookOpen,
    Briefcase,
    Camera,
    Car,
    Dumbbell,
    Gamepad2,
    Gift,
    Hammer,
    Headphones,
    Heart,
    Home,
    LayoutGrid,
    Laptop,
    Package,
    PawPrint,
    Refrigerator,
    Settings,
    Shirt,
    ShoppingBag,
    Smartphone,
    Sofa,
    Sparkles,
    Tv,
    UtensilsCrossed,
    Watch,
} from 'lucide-react'
import { useCatalogCategories } from '@/hooks/useCatalogCategories'
import { HIDE_SCROLLBAR, HOME_CONTAINER, SectionError } from './HomeSection'

/** Keyword -> icon; first match wins (specific before broad). */
const ICON_RULES: { keywords: string[]; icon: LucideIcon }[] = [
    { keywords: ['pet'], icon: PawPrint },
    { keywords: ['baby', 'kid', 'toy'], icon: Baby },
    { keywords: ['book', 'media', 'stationery'], icon: BookOpen },
    { keywords: ['jewelry', 'watch'], icon: Watch },
    { keywords: ['kitchen', 'food', 'beverage'], icon: UtensilsCrossed },
    { keywords: ['health', 'beauty', 'cosmetic', 'skincare', 'personal'], icon: Sparkles },
    { keywords: ['fitness', 'wellness'], icon: Heart },
    { keywords: ['sport', 'outdoor', 'camp'], icon: Dumbbell },
    { keywords: ['gift', 'party'], icon: Gift },
    { keywords: ['office', 'business'], icon: Briefcase },
    { keywords: ['auto', 'car', 'vehicle', 'motor'], icon: Car },
    { keywords: ['computer', 'laptop', 'computing'], icon: Laptop },
    { keywords: ['camera', 'photo'], icon: Camera },
    { keywords: ['audio', 'headphone'], icon: Headphones },
    { keywords: ['tv', 'entertainment'], icon: Tv },
    { keywords: ['gaming', 'game', 'console'], icon: Gamepad2 },
    { keywords: ['bag', 'luggage'], icon: ShoppingBag },
    { keywords: ['phone', 'mobile', 'electronic'], icon: Smartphone },
    { keywords: ['fashion', 'apparel', 'cloth', 'shoe'], icon: Shirt },
    { keywords: ['furniture', 'interior'], icon: Sofa },
    { keywords: ['appliance'], icon: Refrigerator },
    { keywords: ['tool', 'hardware', 'repair'], icon: Hammer },
    { keywords: ['industrial', 'machinery', 'equipment'], icon: Settings },
    { keywords: ['home', 'garden', 'living'], icon: Home },
]

const TINTS = [
    'bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
    'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
    'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
    'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400',
    'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
]

function iconFor(name: string): LucideIcon {
    const n = name.toLowerCase()
    return ICON_RULES.find((r) => r.keywords.some((k) => n.includes(k)))?.icon ?? Package
}

const DESKTOP_VISIBLE = 15
const MAX_ITEMS = 24

export default function Categories() {
    const { categories, loading, error } = useCatalogCategories()

    const rows = useMemo(
        () =>
            categories.slice(0, MAX_ITEMS).map((cat, i) => ({
                id: cat.id,
                name: cat.name,
                Icon: iconFor(cat.name),
                tint: TINTS[i % TINTS.length],
                href: `/products?category=${encodeURIComponent(cat.name)}`,
            })),
        [categories]
    )

    const listClass = `-mx-3 flex gap-1 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-8 lg:gap-3 lg:overflow-visible xl:grid-cols-8 ${HIDE_SCROLLBAR}`

    return (
        <section aria-label="Shop by category" className={`${HOME_CONTAINER} mt-4`}>
            <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800 sm:p-4">
                {loading ? (
                    <ul className={listClass} aria-hidden>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <li key={i} className="flex w-[76px] shrink-0 animate-pulse flex-col items-center gap-2 lg:w-auto">
                                <span className="h-14 w-14 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                                <span className="h-3 w-12 rounded bg-neutral-200 dark:bg-neutral-800" />
                            </li>
                        ))}
                    </ul>
                ) : error ? (
                    <SectionError message="Categories could not be loaded." />
                ) : rows.length === 0 ? (
                    <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
                        Categories are coming soon.
                    </p>
                ) : (
                    <ul className={listClass}>
                        {rows.map(({ id, name, Icon, tint, href }, i) => (
                            <li
                                key={id}
                                className={`w-[76px] shrink-0 lg:w-auto ${i >= DESKTOP_VISIBLE ? 'lg:hidden' : ''}`}
                            >
                                <Link
                                    href={href}
                                    className="group flex min-h-[44px] flex-col items-center gap-1.5 rounded-lg py-1"
                                >
                                    <span
                                        className={`flex h-14 w-14 items-center justify-center rounded-full transition-transform group-hover:scale-105 lg:h-16 lg:w-16 ${tint}`}
                                    >
                                        <Icon className="h-6 w-6 lg:h-7 lg:w-7" aria-hidden />
                                    </span>
                                    <span className="line-clamp-2 w-full text-center text-[11px] font-medium leading-tight text-neutral-800 group-hover:text-orange-600 dark:text-neutral-200 sm:text-xs">
                                        {name}
                                    </span>
                                </Link>
                            </li>
                        ))}
                        <li className="w-[76px] shrink-0 lg:w-auto">
                            <Link
                                href="/products"
                                className="group flex min-h-[44px] flex-col items-center gap-1.5 rounded-lg py-1"
                            >
                                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white transition-transform group-hover:scale-105 dark:bg-white dark:text-neutral-900 lg:h-16 lg:w-16">
                                    <LayoutGrid className="h-6 w-6 lg:h-7 lg:w-7" aria-hidden />
                                </span>
                                <span className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200 sm:text-xs">
                                    All
                                </span>
                            </Link>
                        </li>
                    </ul>
                )}
            </div>
        </section>
    )
}
