'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { HIDE_SCROLLBAR } from '../HomeSection'
import HeroSlideCard from './HeroSlideCard'
import type { HeroConfig, HeroSlide } from './heroData'

interface HeroCarouselProps {
    slides: HeroSlide[]
    config: HeroConfig
    className?: string
}

const ARROW =
    'absolute top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 sm:flex'

/** Autoplaying carousel. `slide` = native scroll-snap (free swipe); `fade` = stacked cross-fade. */
export default function HeroCarousel({ slides, config, className = '' }: Readonly<HeroCarouselProps>) {
    const count = slides.length
    const trackRef = useRef<HTMLUListElement>(null)
    const indexRef = useRef(0)
    const touchX = useRef<number | null>(null)
    const [index, setIndex] = useState(0)
    const [paused, setPaused] = useState(false)
    const [stopped, setStopped] = useState(false)
    const fade = config.transition === 'fade'

    const goTo = useCallback(
        (i: number) => {
            const next = ((i % count) + count) % count
            if (fade) {
                indexRef.current = next
                setIndex(next)
                return
            }
            const el = trackRef.current
            if (el) el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' })
        },
        [count, fade]
    )

    // Keep the index valid when the slide list shrinks.
    useEffect(() => {
        if (indexRef.current >= count) {
            indexRef.current = 0
            setIndex(0)
        }
    }, [count])

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
        if (!config.autoplay || paused || stopped || count < 2) return
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        const id = window.setInterval(() => goTo(indexRef.current + 1), config.interval_seconds * 1000)
        return () => window.clearInterval(id)
    }, [config.autoplay, config.interval_seconds, paused, stopped, count, goTo])

    const onTouchStart = (e: React.TouchEvent) => {
        setPaused(true)
        touchX.current = e.touches[0].clientX
    }
    const onTouchEnd = (e: React.TouchEvent) => {
        setPaused(false)
        if (fade && touchX.current !== null) {
            const dx = e.changedTouches[0].clientX - touchX.current
            if (Math.abs(dx) > 40) goTo(indexRef.current + (dx < 0 ? 1 : -1))
        }
        touchX.current = null
    }

    return (
        <div
            className={`relative overflow-hidden ${config.rounded ? 'rounded-md' : ''} ${className}`}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
        >
            <ul
                ref={trackRef}
                onScroll={fade ? undefined : onScroll}
                className={
                    fade
                        ? 'relative h-full w-full'
                        : `flex h-full snap-x snap-mandatory overflow-x-auto scroll-smooth ${HIDE_SCROLLBAR}`
                }
            >
                {slides.map((slide, i) => (
                    <li
                        key={slide.id}
                        aria-hidden={i !== index}
                        className={
                            fade
                                ? `absolute inset-0 transition-opacity duration-500 ${
                                      i === index ? 'z-10 opacity-100' : 'pointer-events-none z-0 opacity-0'
                                  }`
                                : 'h-full min-w-full snap-center'
                        }
                    >
                        <HeroSlideCard slide={slide} priority={i === 0} interactive={i === index} />
                    </li>
                ))}
            </ul>

            {count > 1 && config.show_arrows ? (
                <>
                    <button
                        type="button"
                        onClick={() => goTo(index - 1)}
                        aria-label="Previous slide"
                        className={`${ARROW} left-3`}
                    >
                        <ChevronLeft className="h-5 w-5" aria-hidden />
                    </button>
                    <button
                        type="button"
                        onClick={() => goTo(index + 1)}
                        aria-label="Next slide"
                        className={`${ARROW} right-3`}
                    >
                        <ChevronRight className="h-5 w-5" aria-hidden />
                    </button>
                </>
            ) : null}

            {count > 1 && config.autoplay ? (
                <button
                    type="button"
                    onClick={() => setStopped((s) => !s)}
                    aria-label={stopped ? 'Play slideshow' : 'Pause slideshow'}
                    className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                    {stopped ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
                </button>
            ) : null}

            {count > 1 && config.show_dots ? (
                <div className="absolute inset-x-0 bottom-2 z-20 flex justify-center gap-1">
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
                                className={`block h-1.5 rounded-full ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-zinc-300'}`}
                            />
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    )
}
