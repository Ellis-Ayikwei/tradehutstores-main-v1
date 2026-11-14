'use client'

import type { CSSProperties } from 'react'
import { HOME_CONTAINER } from './HomeSection'
import HeroCarousel from './hero/HeroCarousel'
import HeroSlideCard from './hero/HeroSlideCard'
import { heroBackground, useHero, type HeroLayout, type HeroSlide } from './hero/heroData'

/** Most tiles each layout can show. */
const TILE_LIMIT: Record<HeroLayout, number> = {
    carousel: 0,
    full_bleed: 0,
    carousel_side: 2,
    bento: 4,
    tiles_below: 4,
    flanked: 4,
}

const ROW_COLS = ['', 'lg:grid-cols-1', 'lg:grid-cols-2', 'lg:grid-cols-3', 'lg:grid-cols-4']

/** Home hero. Layout, slides, timing and background are managed in Admin > Homepage hero. */
export default function HeroWithSearch() {
    const { config, slides, loading } = useHero()

    const main = slides.filter((s) => s.placement === 'main')
    const tiles = slides.filter((s) => s.placement === 'tile')
    // Only tile slides live: show them in the carousel and drop the (duplicate) tile column.
    const mainSlides = main.length > 0 ? main : slides
    const shownTiles = main.length === 0 ? [] : tiles.slice(0, TILE_LIMIT[config.layout] ?? 0)

    const band = heroBackground(
        config.background_style,
        config.background_color,
        config.gradient_from,
        config.gradient_to,
        config.gradient_angle
    )
    const bandClass = band ? '' : 'bg-neutral-100 dark:bg-neutral-950'
    const heightVar = { '--hero-h': `${config.height_desktop}px` } as CSSProperties
    const bleed = config.layout === 'full_bleed'
    const radius = config.rounded && !bleed ? 'rounded-md' : ''

    if (loading) {
        return (
            <section aria-label="Promotions" className="bg-neutral-100 pb-1 pt-3 dark:bg-neutral-950 sm:pt-4">
                {/* Same footprint as the default layout (main box + two tiles) so nothing jumps when data arrives. */}
                <div className={`${HOME_CONTAINER} grid grid-cols-1 gap-3 lg:grid-cols-12`} aria-hidden>
                    <div className="aspect-[16/9] animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 sm:aspect-[21/9] lg:col-span-9 lg:aspect-auto lg:h-[360px]" />
                    <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:h-[360px] lg:grid-cols-1 lg:grid-rows-2">
                        <div className="aspect-[16/10] animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 lg:aspect-auto" />
                        <div className="aspect-[16/10] animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800 lg:aspect-auto" />
                    </div>
                </div>
            </section>
        )
    }

    const mainClass = 'aspect-[16/9] sm:aspect-[21/9] lg:aspect-auto lg:h-[var(--hero-h)]'
    const tile = (t: HeroSlide, box: string) => (
        <div key={t.id} className={`overflow-hidden ${box} ${radius}`}>
            <HeroSlideCard slide={t} size="sm" />
        </div>
    )

    let body
    if (bleed) {
        body = <HeroCarousel slides={mainSlides} config={{ ...config, rounded: false }} className={mainClass} />
    } else if (shownTiles.length === 0) {
        body = <HeroCarousel slides={mainSlides} config={config} className={mainClass} />
    } else if (config.layout === 'bento') {
        body = (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <HeroCarousel slides={mainSlides} config={config} className={`${mainClass} lg:col-span-6`} />
                <div className="grid grid-cols-2 gap-3 lg:col-span-6 lg:h-[var(--hero-h)] lg:grid-rows-2">
                    {shownTiles.map((t) => tile(t, 'aspect-[4/3] lg:aspect-auto'))}
                </div>
            </div>
        )
    } else if (config.layout === 'tiles_below') {
        body = (
            <div className="space-y-3">
                <HeroCarousel slides={mainSlides} config={config} className={mainClass} />
                <div className={`grid grid-cols-2 gap-3 ${ROW_COLS[shownTiles.length]}`}>
                    {shownTiles.map((t) => tile(t, 'aspect-[16/9] lg:aspect-[16/7]'))}
                </div>
            </div>
        )
    } else if (config.layout === 'flanked') {
        const left = shownTiles.slice(0, Math.ceil(shownTiles.length / 2))
        const right = shownTiles.slice(left.length)
        // Phones: banner first, then every tile in a two-column grid. Desktop: tile column, banner, tile column.
        const column = (items: HeroSlide[], order: string) => (
            <div className={`grid grid-cols-2 gap-3 lg:col-span-3 lg:flex lg:h-[var(--hero-h)] lg:flex-col ${order}`}>
                {items.map((t) => tile(t, 'aspect-[16/10] lg:aspect-auto lg:min-h-0 lg:flex-1'))}
            </div>
        )
        body = (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                {column(left, 'order-2 lg:order-1')}
                <HeroCarousel
                    slides={mainSlides}
                    config={config}
                    className={`${mainClass} order-1 ${right.length > 0 ? 'lg:col-span-6' : 'lg:col-span-9'} lg:order-2`}
                />
                {right.length > 0 ? column(right, 'order-3') : null}
            </div>
        )
    } else {
        body = (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <HeroCarousel slides={mainSlides} config={config} className={`${mainClass} lg:col-span-9`} />
                <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:h-[var(--hero-h)] lg:grid-cols-1 lg:grid-rows-2">
                    {shownTiles.map((t) => tile(t, 'aspect-[16/10] lg:aspect-auto'))}
                </div>
            </div>
        )
    }

    return (
        <section aria-label="Promotions" className={`${bandClass} pb-3 pt-3 sm:pt-4`} style={{ ...band, ...heightVar }}>
            {bleed ? body : <div className={HOME_CONTAINER}>{body}</div>}
        </section>
    )
}
