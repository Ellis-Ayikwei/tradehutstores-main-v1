'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { HIDE_SCROLLBAR, HOME_CONTAINER } from './HomeSection'
import { useHomeSections } from './useHomeSections'

export interface HeroBanner {
    id: string
    /** Remote/public image path. Empty for admin text banners, which use `bgColor`. */
    image: string
    bgColor?: string
    eyebrow: string
    title: string
    subtitle: string
    cta: { label: string; href: string }
}

/** Default slides, shown immediately; admin `banner` sections are appended once loaded. */
export const HERO_BANNERS: HeroBanner[] = [
    {
        id: 'deals',
        image: '',
        bgColor: '#18181b',
        eyebrow: 'Deals',
        title: "Today's deals",
        subtitle: 'Flash sales and limited-time offers',
        cta: { label: 'Shop deals', href: '/deals' },
    },
    {
        id: 'new-arrivals',
        image: '',
        bgColor: '#8c2e06',
        eyebrow: 'Just in',
        title: 'New arrivals',
        subtitle: 'See the latest listings on TradeHut',
        cta: { label: 'Explore new', href: '/products?sort=new' },
    },
]

const AUTOPLAY_MS = 6000

/** Home promo carousel (the search lives in the header on every page). */
export default function HeroWithSearch() {
    const { sections } = useHomeSections()
    const trackRef = useRef<HTMLUListElement>(null)
    const indexRef = useRef(0)
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(false)

    const adminSlides: HeroBanner[] = sections
        .filter((s) => s.section_type === 'banner')
        .map((s) => ({
            id: `merch-${s.id}`,
            image: '',
            bgColor: s.background_color || undefined,
            eyebrow: 'Featured',
            title: s.title,
            subtitle: s.subtitle,
            cta: { label: 'Browse', href: '/products' },
        }))
    const slides = [...HERO_BANNERS, ...adminSlides]
    const count = slides.length

    const goTo = useCallback((i: number) => {
        const el = trackRef.current
        if (!el) return
        el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
    }, [])

    const onScroll = () => {
        const el = trackRef.current
        if (!el || el.clientWidth === 0) return
        const next = Math.round(el.scrollLeft / el.clientWidth)
        if (next !== indexRef.current) {
            indexRef.current = next
            setIndex(next)
        }
    }

    useEffect(() => {
        if (paused || count < 2) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const id = window.setInterval(() => goTo((indexRef.current + 1) % count), AUTOPLAY_MS)
        return () => window.clearInterval(id)
    }, [paused, count, goTo])

    return (
        <section aria-label="Promotions" className="bg-neutral-100 pb-1 pt-3 dark:bg-neutral-950 sm:pt-4">
            <div className={`${HOME_CONTAINER} space-y-3`}>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                    <div
                        className="relative overflow-hidden rounded-md lg:col-span-9"
                        onMouseEnter={() => setPaused(true)}
                        onMouseLeave={() => setPaused(false)}
                        onTouchStart={() => setPaused(true)}
                        onTouchEnd={() => setPaused(false)}
                        onFocus={() => setPaused(true)}
                        onBlur={() => setPaused(false)}
                    >
                        <ul
                            ref={trackRef}
                            onScroll={onScroll}
                            className={`flex snap-x snap-mandatory overflow-x-auto scroll-smooth ${HIDE_SCROLLBAR}`}
                        >
                            {slides.map((slide, i) => (
                                <li
                                    key={slide.id}
                                    className="relative aspect-[16/9] min-w-full snap-center bg-zinc-900 sm:aspect-[21/9] lg:aspect-auto lg:h-[360px]"
                                    style={slide.bgColor ? { backgroundColor: slide.bgColor } : undefined}
                                    aria-hidden={i !== index}
                                >
                                    {slide.image ? (
                                        <>
                                            <Image
                                                src={slide.image}
                                                alt=""
                                                fill
                                                sizes="(min-width: 1024px) 75vw, 100vw"
                                                priority={i === 0}
                                                loading={i === 0 ? undefined : 'lazy'}
                                                className="object-cover"
                                            />
                                            {/* Photo-legibility scrim, only over a real image */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
                                        </>
                                    ) : null}
                                    <div className="absolute inset-0 flex flex-col justify-center gap-1.5 p-5 pb-9 sm:gap-2 sm:p-8 sm:pb-10 lg:p-12">
                                        <span className="text-xs font-semibold text-white sm:text-sm">{slide.eyebrow}</span>
                                        <h2 className="max-w-md font-syne text-xl font-extrabold leading-tight text-white sm:text-3xl lg:text-4xl">
                                            {slide.title}
                                        </h2>
                                        {slide.subtitle ? (
                                            <p className="line-clamp-2 max-w-sm text-xs text-white sm:text-sm">{slide.subtitle}</p>
                                        ) : null}
                                        <Link
                                            href={slide.cta.href}
                                            tabIndex={i === index ? 0 : -1}
                                            className="mt-1 inline-flex min-h-[44px] w-fit items-center rounded-md bg-white px-5 text-sm font-bold text-zinc-900 hover:bg-zinc-100"
                                        >
                                            {slide.cta.label}
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {count > 1 ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => goTo((index - 1 + count) % count)}
                                    aria-label="Previous slide"
                                    className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:flex"
                                >
                                    <ChevronLeft className="h-5 w-5" aria-hidden />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => goTo((index + 1) % count)}
                                    aria-label="Next slide"
                                    className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:flex"
                                >
                                    <ChevronRight className="h-5 w-5" aria-hidden />
                                </button>
                                <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
                                    {slides.map((slide, i) => (
                                        <button
                                            key={slide.id}
                                            type="button"
                                            onClick={() => goTo(i)}
                                            aria-label={`Go to slide ${i + 1}`}
                                            aria-current={i === index}
                                            className="flex h-6 items-center px-1"
                                        >
                                            <span
                                                className={`block h-1.5 rounded-full ${
                                                    i === index ? 'w-6 bg-white' : 'w-1.5 bg-zinc-300'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : null}
                    </div>

                    <div className="hidden grid-rows-2 gap-3 lg:col-span-3 lg:grid">
                        <Link
                            href="/deals"
                            className="flex flex-col justify-end rounded-md bg-primary-700 p-4 text-white hover:bg-primary-800"
                        >
                            <span className="block font-syne text-lg font-bold">Today&apos;s deals</span>
                            <span className="text-sm font-semibold underline">Shop deals</span>
                        </Link>
                        <Link
                            href="/products?sort=new"
                            className="flex flex-col justify-end rounded-md border border-zinc-200 bg-white p-4 text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <span className="block font-syne text-lg font-bold">New arrivals</span>
                            <span className="text-sm font-semibold text-primary-700 underline dark:text-primary-400">See what&apos;s new</span>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}
