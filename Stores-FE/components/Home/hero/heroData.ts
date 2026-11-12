'use client'

import type { CSSProperties } from 'react'
import useSWR from 'swr'
import fetcher from '@/lib/fetcher'

export type HeroLayout = 'carousel' | 'carousel_side' | 'bento'
export type HeroTransition = 'slide' | 'fade'
export type HeroBackgroundStyle = 'none' | 'solid' | 'gradient'
export type HeroTextAlign = 'left' | 'center' | 'right'

export interface HeroConfig {
    layout: HeroLayout
    autoplay: boolean
    interval_seconds: number
    transition: HeroTransition
    show_arrows: boolean
    show_dots: boolean
    height_desktop: number
    rounded: boolean
    background_style: HeroBackgroundStyle
    background_color: string
    gradient_from: string
    gradient_to: string
    gradient_angle: number
}

export interface HeroSlide {
    id: number | string
    placement: 'main' | 'tile'
    image_desktop: string | null
    image_mobile: string | null
    alt_text: string
    eyebrow: string
    title: string
    subtitle: string
    cta_label: string
    link_url: string
    open_in_new_tab: boolean
    text_color: string
    text_align: HeroTextAlign
    overlay_strength: number
    background_style: 'solid' | 'gradient'
    background_color: string
    gradient_from: string
    gradient_to: string
    gradient_angle: number
}

interface HeroResponse {
    config: HeroConfig
    slides: HeroSlide[]
}

const FALLBACK_CONFIG: HeroConfig = {
    layout: 'carousel_side',
    autoplay: true,
    interval_seconds: 6,
    transition: 'slide',
    show_arrows: true,
    show_dots: true,
    height_desktop: 360,
    rounded: true,
    background_style: 'none',
    background_color: '',
    gradient_from: '',
    gradient_to: '',
    gradient_angle: 135,
}

const slideBase = {
    image_desktop: null,
    image_mobile: null,
    alt_text: '',
    open_in_new_tab: false,
    text_color: '#ffffff',
    text_align: 'left' as const,
    overlay_strength: 0,
    background_style: 'solid' as const,
    gradient_from: '',
    gradient_to: '',
    gradient_angle: 135,
}

/** Shown only when the admin has not published any hero slide yet (or the API is unreachable). */
const FALLBACK_SLIDES: HeroSlide[] = [
    {
        ...slideBase,
        id: 'fallback-deals',
        placement: 'main',
        background_color: '#18181b',
        eyebrow: 'Deals',
        title: "Today's deals",
        subtitle: 'Flash sales and limited-time offers',
        cta_label: 'Shop deals',
        link_url: '/deals',
    },
    {
        ...slideBase,
        id: 'fallback-new',
        placement: 'main',
        background_color: '#8c2e06',
        eyebrow: 'Just in',
        title: 'New arrivals',
        subtitle: 'See the latest listings on TradeHut',
        cta_label: 'Explore new',
        link_url: '/products?sort=new',
    },
    {
        ...slideBase,
        id: 'fallback-tile-deals',
        placement: 'tile',
        background_color: '#a43d00',
        eyebrow: '',
        title: "Today's deals",
        subtitle: '',
        cta_label: 'Shop deals',
        link_url: '/deals',
    },
    {
        ...slideBase,
        id: 'fallback-tile-new',
        placement: 'tile',
        background_color: '#3f3f46',
        eyebrow: '',
        title: 'New arrivals',
        subtitle: '',
        cta_label: "See what's new",
        link_url: '/products?sort=new',
    },
]

/** Admin-managed home hero (`GET homepage/hero/`). `loading` is true until the first response. */
export function useHero(): { config: HeroConfig; slides: HeroSlide[]; loading: boolean } {
    const { data, error, isLoading } = useSWR<HeroResponse>('homepage/hero/', (url: string) => fetcher(url), {
        revalidateOnFocus: false,
    })

    if (data && Array.isArray(data.slides) && data.slides.length > 0) {
        return { config: data.config, slides: data.slides, loading: false }
    }
    if (data?.config && !error) {
        // Configured but nothing live: keep the admin's layout, show the default slides.
        return { config: data.config, slides: FALLBACK_SLIDES, loading: false }
    }
    return { config: FALLBACK_CONFIG, slides: FALLBACK_SLIDES, loading: isLoading }
}

/** CSS `background` value for a solid colour or an angled two-stop gradient. */
export function heroBackground(
    style: HeroBackgroundStyle,
    color: string,
    from: string,
    to: string,
    angle: number
): CSSProperties | undefined {
    if (style === 'solid' && color) return { background: color }
    if (style === 'gradient' && from && to) {
        return { background: `linear-gradient(${angle}deg, ${from}, ${to})` }
    }
    return undefined
}
