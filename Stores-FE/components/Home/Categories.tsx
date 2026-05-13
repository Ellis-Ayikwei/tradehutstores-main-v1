'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
    Smartphone,
    Shirt,
    Home,
    Dumbbell,
    Sparkles,
    Gamepad2,
    BookOpen,
    Car,
    PawPrint,
    Briefcase,
    Baby,
    Watch,
    Music,
    Wrench,
    Palette,
    UtensilsCrossed,
    Laptop,
    Camera,
    Headphones,
    Tv,
    ShoppingBag,
    Heart,
    Gift,
    Cpu,
    Zap,
    Droplet,
    Flower2,
    Sofa,
    Bed,
    Lamp,
    Refrigerator,
    Microwave,
    Fan,
    AirVent,
    ShowerHead,
    DoorOpen,
    Key,
    Hammer,
    Drill,
    Paintbrush,
    Scissors,
    Ruler,
    Package,
    Box,
    Truck,
    Bike,
    Plane,
    Ship,
    Train,
    Bus,
    Fuel,
    Settings,
    Cog,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { useCatalogCategories } from '@/hooks/useCatalogCategories'

type StyleRule = { keywords: string[]; icon: LucideIcon; gradient: string }

/** Keyword → icon + ring gradient; first match wins (order: specific → broad). */
const CAROUSEL_STYLE_RULES: StyleRule[] = [
    { keywords: ['microwave', 'small appliance'], icon: Microwave, gradient: 'from-red-500 to-pink-500' },
    { keywords: ['pet'], icon: PawPrint, gradient: 'from-amber-500 to-yellow-500' },
    { keywords: ['baby', 'kid'], icon: Baby, gradient: 'from-sky-400 to-blue-400' },
    { keywords: ['book', 'media', 'magazine', 'vinyl', 'audiobook'], icon: BookOpen, gradient: 'from-indigo-500 to-blue-500' },
    { keywords: ['toy', 'game', 'puzzle'], icon: Gamepad2, gradient: 'from-red-500 to-pink-500' },
    { keywords: ['jewelry', 'watch'], icon: Watch, gradient: 'from-yellow-500 to-orange-400' },
    { keywords: ['music', 'instrument'], icon: Music, gradient: 'from-violet-500 to-purple-500' },
    { keywords: ['food', 'beverage', 'kitchen', 'utensil', 'refrigerator'], icon: UtensilsCrossed, gradient: 'from-lime-500 to-green-500' },
    { keywords: ['health', 'beauty', 'skincare', 'makeup', 'cosmetic', 'droplet'], icon: Droplet, gradient: 'from-rose-500 to-pink-500' },
    { keywords: ['fitness', 'wellness', 'gym'], icon: Heart, gradient: 'from-pink-600 to-rose-600' },
    { keywords: ['sport', 'outdoor', 'camp', 'hike', 'dumbbell'], icon: Dumbbell, gradient: 'from-orange-500 to-amber-500' },
    { keywords: ['bike', 'bicycl'], icon: Bike, gradient: 'from-green-600 to-emerald-600' },
    { keywords: ['gift', 'party'], icon: Gift, gradient: 'from-cyan-500 to-blue-500' },
    { keywords: ['office', 'briefcase', 'stationery'], icon: Briefcase, gradient: 'from-teal-500 to-cyan-500' },
    { keywords: ['automotive', 'car ', 'motor', 'vehicle', 'tire'], icon: Car, gradient: 'from-slate-600 to-gray-700' },
    { keywords: ['fuel', 'energy'], icon: Fuel, gradient: 'from-yellow-600 to-orange-600' },
    { keywords: ['travel', 'plane', 'air'], icon: Plane, gradient: 'from-sky-500 to-blue-500' },
    { keywords: ['marine', 'boat', 'ship'], icon: Ship, gradient: 'from-blue-600 to-cyan-600' },
    { keywords: ['rail', 'train'], icon: Train, gradient: 'from-slate-600 to-gray-600' },
    { keywords: ['bus', 'transport'], icon: Bus, gradient: 'from-red-600 to-orange-600' },
    { keywords: ['computer', 'laptop'], icon: Laptop, gradient: 'from-blue-600 to-indigo-600' },
    { keywords: ['cpu', 'component'], icon: Cpu, gradient: 'from-indigo-600 to-purple-600' },
    { keywords: ['camera', 'photo'], icon: Camera, gradient: 'from-gray-600 to-slate-700' },
    { keywords: ['audio', 'headphone'], icon: Headphones, gradient: 'from-purple-600 to-violet-600' },
    { keywords: ['tv', 'entertainment'], icon: Tv, gradient: 'from-red-600 to-rose-600' },
    { keywords: ['gaming', 'console'], icon: Gamepad2, gradient: 'from-green-600 to-emerald-600' },
    { keywords: ['bag', 'luggage'], icon: ShoppingBag, gradient: 'from-amber-600 to-yellow-600' },
    { keywords: ['mobile', 'accessor', 'charger', 'zap'], icon: Zap, gradient: 'from-yellow-500 to-orange-500' },
    { keywords: ['electronic', 'smartphone', 'phone'], icon: Smartphone, gradient: 'from-blue-500 to-cyan-500' },
    { keywords: ['fashion', 'apparel', 'clothing'], icon: Shirt, gradient: 'from-pink-500 to-rose-500' },
    { keywords: ['garden', 'plant', 'flower'], icon: Flower2, gradient: 'from-green-500 to-emerald-500' },
    { keywords: ['furniture', 'sofa'], icon: Sofa, gradient: 'from-amber-500 to-yellow-500' },
    { keywords: ['bedding', 'bed ', 'bath'], icon: Bed, gradient: 'from-blue-400 to-cyan-400' },
    { keywords: ['lighting', 'lamp'], icon: Lamp, gradient: 'from-yellow-400 to-orange-400' },
    { keywords: ['appliance'], icon: Refrigerator, gradient: 'from-gray-500 to-slate-500' },
    { keywords: ['cool', 'heat', 'fan'], icon: Fan, gradient: 'from-cyan-400 to-blue-400' },
    { keywords: ['ventilat'], icon: AirVent, gradient: 'from-gray-400 to-slate-400' },
    { keywords: ['bathroom', 'shower', 'fixture'], icon: ShowerHead, gradient: 'from-blue-500 to-cyan-500' },
    { keywords: ['door', 'window'], icon: DoorOpen, gradient: 'from-amber-600 to-yellow-600' },
    { keywords: ['security', 'lock', 'key'], icon: Key, gradient: 'from-slate-600 to-gray-600' },
    { keywords: ['power tool', 'hammer'], icon: Hammer, gradient: 'from-orange-600 to-red-600' },
    { keywords: ['drill', 'saw'], icon: Drill, gradient: 'from-gray-700 to-slate-700' },
    { keywords: ['paint'], icon: Paintbrush, gradient: 'from-purple-500 to-pink-500' },
    { keywords: ['craft', 'scissor'], icon: Scissors, gradient: 'from-fuchsia-500 to-purple-500' },
    { keywords: ['measur'], icon: Ruler, gradient: 'from-teal-500 to-cyan-500' },
    { keywords: ['art'], icon: Palette, gradient: 'from-fuchsia-500 to-pink-500' },
    { keywords: ['storage', 'organiz', 'shipping supplies'], icon: Box, gradient: 'from-indigo-500 to-blue-500' },
    { keywords: ['package', 'parcel'], icon: Package, gradient: 'from-amber-500 to-orange-500' },
    { keywords: ['deliver', 'logistic', 'truck'], icon: Truck, gradient: 'from-gray-600 to-slate-600' },
    { keywords: ['industrial', 'machinery', 'equipment'], icon: Settings, gradient: 'from-gray-700 to-slate-700' },
    { keywords: ['industrial part', 'spare part'], icon: Cog, gradient: 'from-zinc-700 to-stone-700' },
    { keywords: ['tool', 'wrench', 'hardware'], icon: Wrench, gradient: 'from-zinc-600 to-stone-700' },
    { keywords: ['home', 'garden'], icon: Home, gradient: 'from-green-500 to-emerald-500' },
    { keywords: ['beauty', 'sparkle', 'cosmetic'], icon: Sparkles, gradient: 'from-purple-500 to-fuchsia-500' },
]

const DEFAULT_STYLE: Pick<StyleRule, 'icon' | 'gradient'> = {
    icon: Package,
    gradient: 'from-slate-500 to-slate-700',
}

function resolveCarouselStyle(name: string): Pick<StyleRule, 'icon' | 'gradient'> {
    const n = name.toLowerCase()
    for (const rule of CAROUSEL_STYLE_RULES) {
        if (rule.keywords.some((k) => n.includes(k))) {
            return { icon: rule.icon, gradient: rule.gradient }
        }
    }
    return DEFAULT_STYLE
}

const CAROUSEL_SKELETON_IDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const

export default function CategoryCarousel() {
    const { categories, loading, error } = useCatalogCategories()
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const rows = useMemo(
        () =>
            categories.map((cat) => ({
                ...cat,
                ...resolveCarouselStyle(cat.name),
                href: `/products?category=${encodeURIComponent(cat.name)}`,
            })),
        [categories]
    )

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
            setCanScrollLeft(scrollLeft > 20)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 20)
        }
    }

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = scrollRef.current.clientWidth * 0.8
            scrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            })
        }
    }

    useEffect(() => {
        const currentRef = scrollRef.current
        checkScroll()
        window.addEventListener('resize', checkScroll)
        currentRef?.addEventListener('scroll', checkScroll)
        return () => {
            window.removeEventListener('resize', checkScroll)
            currentRef?.removeEventListener('scroll', checkScroll)
        }
    }, [rows.length])

    return (
        <section className="py-16 bg-white dark:bg-slate-950">
            <div className="container mx-auto px-6">
                <div className="flex items-end justify-between mb-10">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                            Shop by Category
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl">
                            Explore our meticulously curated collections designed for every lifestyle.
                        </p>
                    </div>

                    <div className="hidden sm:flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => scroll('left')}
                            disabled={!canScrollLeft || rows.length === 0}
                            className={`p-3 rounded-full border transition-all duration-300 ${
                                canScrollLeft && rows.length > 0
                                    ? 'border-slate-200 text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:text-white dark:hover:bg-slate-900 shadow-sm'
                                    : 'border-slate-100 text-slate-300 cursor-not-allowed dark:border-slate-900 dark:text-slate-700'
                            }`}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => scroll('right')}
                            disabled={!canScrollRight || rows.length === 0}
                            className={`p-3 rounded-full border transition-all duration-300 ${
                                canScrollRight && rows.length > 0
                                    ? 'border-slate-200 text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:text-white dark:hover:bg-slate-900 shadow-sm'
                                    : 'border-slate-100 text-slate-300 cursor-not-allowed dark:border-slate-900 dark:text-slate-700'
                            }`}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {loading && (
                    <div className="flex gap-6 overflow-hidden pb-8 pt-4 animate-pulse">
                        {CAROUSEL_SKELETON_IDS.map((sid) => (
                            <div key={sid} className="flex-shrink-0 flex flex-col items-center gap-4 w-32 sm:w-40">
                                <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-[2.5rem] bg-slate-200 dark:bg-slate-800" />
                                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && error && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-8">
                        Categories could not be loaded. Please try again later.
                    </p>
                )}

                {!loading && !error && rows.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 py-8">No categories yet.</p>
                )}

                {!loading && !error && rows.length > 0 && (
                    <div className="relative group">
                        <div
                            ref={scrollRef}
                            className="flex gap-6 overflow-x-auto pb-8 pt-4 no-scrollbar scroll-smooth snap-x snap-mandatory"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {rows.map((cat) => {
                                const Icon = cat.icon
                                return (
                                    <Link
                                        key={cat.id}
                                        href={cat.href}
                                        className="flex-shrink-0 snap-start group/card"
                                    >
                                        <div className="flex flex-col items-center gap-4 w-32 sm:w-40">
                                            <div
                                                className={`relative h-24 w-24 sm:h-32 sm:w-32 rounded-[2.5rem] p-[2px] bg-gradient-to-br ${cat.gradient} transition-all duration-500 group-hover/card:rounded-3xl group-hover/card:-translate-y-2 group-hover/card:shadow-xl group-hover/card:shadow-slate-300/40 dark:group-hover/card:shadow-black/50`}
                                            >
                                                <div className="flex h-full w-full items-center justify-center rounded-[calc(2.5rem-2px)] bg-slate-50 transition-colors duration-500 group-hover/card:rounded-[calc(1.5rem-2px)] group-hover/card:bg-white dark:rounded-[calc(2.5rem-2px)] dark:bg-slate-900 dark:group-hover/card:rounded-[calc(1.5rem-2px)] dark:group-hover/card:bg-slate-800/90">
                                                    <div className="text-slate-700 transition-transform duration-500 group-hover/card:scale-110 dark:text-slate-200">
                                                        <Icon strokeWidth={1.5} size={40} className="text-inherit" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-center">
                                                <span className="block text-sm font-bold text-slate-900 transition-colors duration-300 dark:text-slate-100 group-hover/card:text-slate-950 dark:group-hover/card:text-white">
                                                    {cat.name}
                                                </span>
                                                <span className="mt-1 block text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                                    {cat.totalCount.toLocaleString()} Items
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>

                        <div className="absolute top-0 bottom-8 left-0 w-20 bg-gradient-to-r from-white dark:from-slate-950 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-0 bottom-8 right-0 w-20 bg-gradient-to-l from-white dark:from-slate-950 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}
            </div>

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </section>
    )
}
