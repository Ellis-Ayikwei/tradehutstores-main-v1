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
                href: `/products?category=${encodeURIComponent(cat.name)}`,
            })),
        [categories]
    )

    const listClass = `-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-8 lg:overflow-visible ${HIDE_SCROLLBAR}`

    // Flat solid tile: white/zinc surface, 1px border, brand-coloured icon. No tinted circles, rings, shadows or hover scale.
    const TILE =
        'group flex h-[92px] w-full flex-col items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-1 text-center hover:border-primary-700 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-primary-400 lg:h-24'

    return (
        <section aria-label="Shop by category" className={`${HOME_CONTAINER} mt-3`}>
            <div>
                {loading ? (
                    <ul className={listClass} aria-hidden>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <li key={i} className="w-20 shrink-0 lg:w-auto">
                                <span className="block h-[92px] rounded-md bg-zinc-200 dark:bg-zinc-800 lg:h-24" />
                            </li>
                        ))}
                    </ul>
                ) : error ? (
                    <SectionError message="Categories could not be loaded." />
                ) : rows.length === 0 ? (
                    <p className="py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        Categories are coming soon.
                    </p>
                ) : (
                    <ul className={listClass}>
                        {rows.map(({ id, name, Icon, href }, i) => (
                            <li
                                key={id}
                                className={`w-20 shrink-0 lg:w-auto ${i >= DESKTOP_VISIBLE ? 'lg:hidden' : ''}`}
                            >
                                <Link href={href} className={TILE}>
                                    <Icon className="h-6 w-6 text-primary-700 dark:text-primary-400" aria-hidden />
                                    <span className="line-clamp-2 w-full text-[12px] font-medium leading-[15px] text-zinc-800 dark:text-zinc-100">
                                        {name}
                                    </span>
                                </Link>
                            </li>
                        ))}
                        <li className="w-20 shrink-0 lg:w-auto">
                            <Link
                                href="/products"
                                className="flex h-[92px] w-full flex-col items-center justify-center gap-2 rounded-md bg-zinc-900 px-1 text-center text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 lg:h-24"
                            >
                                <LayoutGrid className="h-6 w-6" aria-hidden />
                                <span className="text-[12px] font-medium leading-[15px]">All</span>
                            </Link>
                        </li>
                    </ul>
                )}
            </div>
        </section>
    )
}
