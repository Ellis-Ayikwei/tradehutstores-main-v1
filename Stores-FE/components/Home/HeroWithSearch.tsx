'use client'

import type { CSSProperties } from 'react'
import { HOME_CONTAINER } from './HomeSection'
import HeroCarousel from './hero/HeroCarousel'
import HeroSlideCard from './hero/HeroSlideCard'
import { heroBackground, useHero } from './hero/heroData'

/** Home hero. Layout, slides, timing and background are managed in Admin > Homepage hero. */
export default function HeroWithSearch() {
    const { config, slides, loading } = useHero()

    const main = slides.filter((s) => s.placement === 'main')
    const tiles = slides.filter((s) => s.placement === 'tile')
    // Only tile slides live: show them in the carousel and drop the (duplicate) tile column.
    const mainSlides = main.length > 0 ? main : slides
    const tileLimit = config.layout === 'bento' ? 4 : 2
    const shownTiles = config.layout === 'carousel' || main.length === 0 ? [] : tiles.slice(0, tileLimit)

    const band = heroBackground(
        config.background_style,
        config.background_color,
        config.gradient_from,
        config.gradient_to,
        config.gradient_angle
    )
    const bandClass = band ? '' : 'bg-neutral-100 dark:bg-neutral-950'
    const heightVar = { '--hero-h': `${config.height_desktop}px` } as CSSProperties
    const radius = config.rounded ? 'rounded-md' : ''

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

    let body
    if (shownTiles.length === 0) {
        body = <HeroCarousel slides={mainSlides} config={config} className={mainClass} />
    } else if (config.layout === 'bento') {
        body = (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <HeroCarousel slides={mainSlides} config={config} className={`${mainClass} lg:col-span-6`} />
                <div className="grid grid-cols-2 gap-3 lg:col-span-6 lg:h-[var(--hero-h)] lg:grid-rows-2">
                    {shownTiles.map((tile) => (
                        <div key={tile.id} className={`aspect-[4/3] overflow-hidden lg:aspect-auto ${radius}`}>
                            <HeroSlideCard slide={tile} size="sm" />
                        </div>
                    ))}
                </div>
            </div>
        )
    } else {
        body = (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                <HeroCarousel slides={mainSlides} config={config} className={`${mainClass} lg:col-span-9`} />
                <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:h-[var(--hero-h)] lg:grid-cols-1 lg:grid-rows-2">
                    {shownTiles.map((tile) => (
                        <div key={tile.id} className={`aspect-[16/10] overflow-hidden lg:aspect-auto ${radius}`}>
                            <HeroSlideCard slide={tile} size="sm" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <section aria-label="Promotions" className={`${bandClass} pb-3 pt-3 sm:pt-4`} style={{ ...band, ...heightVar }}>
            <div className={HOME_CONTAINER}>{body}</div>
        </section>
    )
}
