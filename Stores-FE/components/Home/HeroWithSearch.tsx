'use client'

/**
 * HeroWithSearch — Amazon-style bento hero grid
 *
 * Layout:
 *   Row 1: [Main hero carousel — 8 cols] [Flash sale — 4 cols]
 *   Row 2: [4 × category tiles — 3 cols each]
 *
 * To update content, edit the three config arrays:
 *   HERO_BANNERS   — hero carousel slides (image, text, CTA)
 *   FLASH_ITEMS    — flash sale rotating products
 *   CATEGORY_TILES — the 4 category tiles below the hero
 *
 * Wire up:
 *   - Replace FLASH_ITEMS with your flash-sale API response
 *   - Replace CATEGORY_TILES product images with your product API
 *   - Pass a real `endTime` Date to useCountdown() for accurate countdown
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import {
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Clock,
} from 'lucide-react'
import HeroSearchPanel from '@/components/Home/HeroSearchPanel'

// ─── Hero banners config ──────────────────────────────────────────────────────
// Swap `image` for any CDN URL or public asset path.
// `overlay` controls text legibility — darken for light images.
export interface HeroBanner {
    id: string
    image: string
    overlay: string
    eyebrow: string
    title: string
    subtitle: string
    cta: { label: string; href: string }
    accentClass: string // Tailwind text colour class for eyebrow
}

export const HERO_BANNERS: HeroBanner[] = [
    {
        id: 'summer-sale',
        image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1600&q=80',
        overlay: 'from-black/85 via-black/50 to-transparent',
        eyebrow: 'Limited Time',
        title: 'Summer\nSale',
        subtitle: 'Up to 70% off on Electronics, Fashion & more',
        cta: { label: 'Shop Now', href: '/deals' },
        accentClass: 'text-emerald-400',
    },
    {
        id: 'new-arrivals',
        image: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=1600&q=80',
        overlay: 'from-black/90 via-black/60 to-transparent',
        eyebrow: 'Just Dropped',
        title: 'Latest\nGadgets',
        subtitle: 'New smartphones, laptops & wearables in stock',
        cta: { label: 'Explore New', href: '/products?sort=new' },
        accentClass: 'text-sky-400',
    },
    {
        id: 'gaming',
        image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1600&q=80',
        overlay: 'from-violet-950/90 via-black/60 to-transparent',
        eyebrow: 'Gaming Zone',
        title: 'Play\nBetter',
        subtitle: 'Premium rigs, peripherals & accessories',
        cta: { label: 'Shop Gaming', href: '/products?category=gaming' },
        accentClass: 'text-violet-400',
    },
]

// ─── Flash sale config ────────────────────────────────────────────────────────
// Replace with API data. Shape must match FlashItem.
export interface FlashItem {
    id: string
    name: string
    price: number
    originalPrice: number
    image: string
    href: string
}

export const FLASH_ITEMS: FlashItem[] = [
    {
        id: 'f1',
        name: 'Xiaomi Redmi 15C – 256GB',
        price: 1607.0,
        originalPrice: 2200.0,
        image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=400',
        href: '/products/xiaomi-redmi-15c',
    },
    {
        id: 'f2',
        name: "Men's Business Suit",
        price: 450.0,
        originalPrice: 780.0,
        image: 'https://images.unsplash.com/photo-1594932224491-ef24446592ff?auto=format&fit=crop&q=80&w=400',
        href: '/products/mens-business-suit',
    },
    {
        id: 'f3',
        name: 'Sony WH-1000XM5',
        price: 890.0,
        originalPrice: 1399.0,
        image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=400',
        href: '/products/sony-wh1000xm5',
    },
]

// ─── Category tiles config ────────────────────────────────────────────────────
// Each tile shows a 2×2 product image grid.
// Replace `products[].image` with real product thumbnail URLs from your API.
export interface CategoryTile {
    id: string
    label: string
    href: string
    products: { id: string; image: string; alt: string }[]
}

export const CATEGORY_TILES: CategoryTile[] = [
    {
        id: 'electronics',
        label: 'Electronics',
        href: '/products?category=electronics',
        products: [
            { id: 'e1', image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&q=70', alt: 'Laptop' },
            { id: 'e2', image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&q=70', alt: 'Phone' },
            { id: 'e3', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=70', alt: 'Headphones' },
            { id: 'e4', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&q=70', alt: 'Watch' },
        ],
    },
    {
        id: 'fashion',
        label: 'Fashion',
        href: '/products?category=fashion',
        products: [
            { id: 'fa1', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=70', alt: 'Sneakers' },
            { id: 'fa2', image: 'https://images.unsplash.com/photo-1594938298603-c8148c4b4939?w=200&q=70', alt: 'Jacket' },
            { id: 'fa3', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&q=70', alt: 'Bag' },
            { id: 'fa4', image: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=200&q=70', alt: 'Shirt' },
        ],
    },
    {
        id: 'home',
        label: 'Home & Living',
        href: '/products?category=home-appliances',
        products: [
            { id: 'h1', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&q=70', alt: 'Blender' },
            { id: 'h2', image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=200&q=70', alt: 'Kettle' },
            { id: 'h3', image: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=200&q=70', alt: 'Chair' },
            { id: 'h4', image: 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=200&q=70', alt: 'Lamp' },
        ],
    },
    {
        id: 'gaming',
        label: 'Gaming',
        href: '/products?category=gaming',
        products: [
            { id: 'g1', image: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=200&q=70', alt: 'Controller' },
            { id: 'g2', image: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=200&q=70', alt: 'Headset' },
            { id: 'g3', image: 'https://images.unsplash.com/photo-1616588589676-62b3bd4ff6d2?w=200&q=70', alt: 'Monitor' },
            { id: 'g4', image: 'https://images.unsplash.com/photo-1547082299-de196ea013d6?w=200&q=70', alt: 'Laptop' },
        ],
    },
]

const TRENDING = ['Blender', 'Fridges', 'iPhone 15 Pro', 'Gaming Laptop', 'Washing Machine']

// ─── Countdown hook ───────────────────────────────────────────────────────────
// Pass a real ISO end-time from your flash-sale API to make this accurate
function useCountdown(endTime?: Date) {
    const getRemaining = useCallback(() => {
        const target = endTime ?? new Date(Date.now() + 7 * 3600_000 + 43 * 60_000 + 5_000)
        const diff = Math.max(0, target.getTime() - Date.now())
        return {
            h: Math.floor(diff / 3_600_000),
            m: Math.floor((diff % 3_600_000) / 60_000),
            s: Math.floor((diff % 60_000) / 1_000),
        }
    }, [endTime])

    const [time, setTime] = useState(getRemaining)
    useEffect(() => {
        const id = setInterval(() => setTime(getRemaining()), 1000)
        return () => clearInterval(id)
    }, [getRemaining])
    return time
}

const pad = (n: number) => String(n).padStart(2, '0')

// ─── Category Tile ────────────────────────────────────────────────────────────
function CategoryTileCard({ tile }: { tile: CategoryTile }) {
    return (
        <Link
            href={tile.href}
            className="group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 flex flex-col gap-3 hover:shadow-md hover:border-zinc-200 dark:hover:border-zinc-700 transition-all"
        >
            <div className="flex items-center justify-between">
                <h3 className="font-black text-sm text-zinc-900 dark:text-white uppercase tracking-tight">
                    {tile.label}
                </h3>
                <ArrowRight
                    size={14}
                    className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all"
                />
            </div>

            {/* 2×2 product image grid */}
            <div className="grid grid-cols-2 gap-1.5">
                {tile.products.slice(0, 4).map((p) => (
                    <div
                        key={p.id}
                        className="aspect-square relative rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800"
                    >
                        <Image
                            src={p.image}
                            alt={p.alt}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            unoptimized
                            sizes="120px"
                        />
                    </div>
                ))}
            </div>

            <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                See all in {tile.label} →
            </span>
        </Link>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function HeroWithSearch() {
    const [slide, setSlide] = useState(0)
    const [flashIdx, setFlashIdx] = useState(0)
    const countdown = useCountdown()

    const banner = HERO_BANNERS[slide]
    const flashItem = FLASH_ITEMS[flashIdx]
    const discountPct = Math.round(
        ((flashItem.originalPrice - flashItem.price) / flashItem.originalPrice) * 100
    )

    // Auto-advance carousel
    useEffect(() => {
        const id = setInterval(() => setSlide((p) => (p + 1) % HERO_BANNERS.length), 6000)
        return () => clearInterval(id)
    }, [])

    // Auto-advance flash items
    useEffect(() => {
        const id = setInterval(() => setFlashIdx((p) => (p + 1) % FLASH_ITEMS.length), 4000)
        return () => clearInterval(id)
    }, [])

    const prev = () => setSlide((p) => (p - 1 + HERO_BANNERS.length) % HERO_BANNERS.length)
    const next = () => setSlide((p) => (p + 1) % HERO_BANNERS.length)

    return (
        <section className="bg-zinc-50 dark:bg-zinc-950 py-6 md:py-10">
            <div className="max-w-7xl mx-auto px-4 space-y-6">

                {/* ── Search ────────────────────────────────────────────── */}
                <HeroSearchPanel trendingTerms={TRENDING} />

                {/* ── Bento grid ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

                    {/* Row 1 left: Hero carousel */}
                    <div className="lg:col-span-8 relative h-[320px] md:h-[420px] lg:h-[380px] rounded-3xl overflow-hidden group">

                        {/* Background — crossfade only */}
                        <AnimatePresence mode="sync">
                            <motion.div
                                key={banner.id + '-bg'}
                                className="absolute inset-0"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.9 }}
                            >
                                <Image
                                    src={banner.image}
                                    alt={banner.title.replace('\n', ' ')}
                                    fill
                                    className="object-cover object-center"
                                    priority
                                    unoptimized
                                />
                                <div className={`absolute inset-0 bg-gradient-to-r ${banner.overlay}`} />
                            </motion.div>
                        </AnimatePresence>

                        {/* Copy — slides up on change */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={banner.id + '-copy'}
                                className="absolute inset-0 z-10 flex flex-col justify-end p-7 md:p-10"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.45, ease: 'easeOut' }}
                            >
                                <span className={`text-[11px] font-black uppercase tracking-[0.2em] mb-2 ${banner.accentClass}`}>
                                    {banner.eyebrow}
                                </span>
                                <h2 className="text-white font-black text-4xl md:text-6xl leading-none uppercase tracking-tighter mb-3 whitespace-pre-line">
                                    {banner.title}
                                </h2>
                                <p className="text-white/65 text-sm mb-5 max-w-xs">
                                    {banner.subtitle}
                                </p>
                                <Link
                                    href={banner.cta.href}
                                    className="inline-flex items-center gap-2 bg-white text-zinc-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all w-fit group/cta"
                                >
                                    {banner.cta.label}
                                    <ArrowRight size={14} className="group-hover/cta:translate-x-0.5 transition-transform" />
                                </Link>
                            </motion.div>
                        </AnimatePresence>

                        {/* Slide counter */}
                        <div className="absolute top-5 right-5 z-20">
                            <span className="text-white/40 font-mono text-xs">
                                {String(slide + 1).padStart(2, '0')} / {String(HERO_BANNERS.length).padStart(2, '0')}
                            </span>
                        </div>

                        {/* Prev / Next */}
                        <button
                            onClick={prev}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-black/25 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
                            aria-label="Previous slide"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={next}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-black/25 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
                            aria-label="Next slide"
                        >
                            <ChevronRight size={16} />
                        </button>

                        {/* Dot indicators */}
                        <div className="absolute bottom-5 left-7 flex gap-1.5 z-20">
                            {HERO_BANNERS.map((b, i) => (
                                <button
                                    key={b.id}
                                    onClick={() => setSlide(i)}
                                    aria-label={`Slide ${i + 1}`}
                                    className={`h-1 rounded-full transition-all duration-300 ${
                                        i === slide ? 'w-7 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Row 1 right: Flash sale */}
                    <div className="lg:col-span-4 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden flex flex-col">

                        {/* Header */}
                        <div className="px-5 pt-5 pb-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock size={13} className="text-orange-500 animate-pulse" />
                                <span className="text-xs font-black uppercase tracking-[0.15em] text-zinc-900 dark:text-white">
                                    Flash Sale
                                </span>
                            </div>
                            <div className="flex items-center gap-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 px-2.5 py-1 rounded-lg font-mono text-[11px] font-black">
                                <span className="text-orange-500">{pad(countdown.h)}h</span>
                                <span className="text-zinc-300 dark:text-zinc-600">:</span>
                                <span className="text-orange-500">{pad(countdown.m)}m</span>
                                <span className="text-zinc-300 dark:text-zinc-600">:</span>
                                <span className="text-orange-500">{pad(countdown.s)}s</span>
                            </div>
                        </div>

                        {/* Product */}
                        <div className="flex-grow flex flex-col items-center justify-center px-5 py-5 relative overflow-hidden">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={flashItem.id}
                                    initial={{ x: 24, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: -24, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeOut' }}
                                    className="w-full flex flex-col items-center text-center"
                                >
                                    {/* Image */}
                                    <Link href={flashItem.href} className="block relative w-32 h-32 mb-4 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-700 hover:ring-zinc-400 transition-all">
                                        <Image
                                            src={flashItem.image}
                                            alt={flashItem.name}
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                        <span className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded">
                                            -{discountPct}%
                                        </span>
                                    </Link>

                                    <h4 className="text-zinc-900 dark:text-white text-xs font-bold uppercase tracking-tight line-clamp-2 px-2 mb-2">
                                        {flashItem.name}
                                    </h4>

                                    <div className="flex items-baseline gap-2 justify-center">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-black text-xl">
                                            GHS {flashItem.price.toFixed(2)}
                                        </span>
                                        <span className="text-zinc-400 font-mono text-xs line-through">
                                            {flashItem.originalPrice.toFixed(2)}
                                        </span>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Flash item dots */}
                        <div className="flex justify-center gap-1.5 pb-3">
                            {FLASH_ITEMS.map((item, i) => (
                                <button
                                    key={item.id}
                                    onClick={() => setFlashIdx(i)}
                                    className={`h-1 rounded-full transition-all ${
                                        i === flashIdx ? 'w-5 bg-orange-500' : 'w-1.5 bg-zinc-300 dark:bg-zinc-700'
                                    }`}
                                    aria-label={`Flash item ${i + 1}`}
                                />
                            ))}
                        </div>

                        {/* CTA */}
                        <Link
                            href="/flash-sales"
                            className="mx-4 mb-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-700 dark:hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-widest transition-all group"
                        >
                            View All Flash Sales
                            <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    {/* Row 2: Category tiles — horizontal scroll on mobile */}
                    <div className="lg:col-span-12">
                        {/* Mobile: horizontal scroll */}
                        <div className="flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0"
                             style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {CATEGORY_TILES.map((tile) => (
                                <div key={tile.id} className="flex-shrink-0 w-[240px] sm:w-[260px] lg:w-auto">
                                    <CategoryTileCard tile={tile} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}