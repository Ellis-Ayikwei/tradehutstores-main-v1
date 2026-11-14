'use client'

import Image from 'next/image'
import Link from 'next/link'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import HeroVideo from './HeroVideo'
import { heroBackground, type HeroSlide } from './heroData'

const ALIGN: Record<HeroSlide['text_align'], string> = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
}

interface HeroSlideCardProps {
    slide: HeroSlide
    /** `lg` for the main carousel, `sm` for tiles. */
    size?: 'lg' | 'sm'
    priority?: boolean
    /** False for off-screen carousel slides: the link leaves the tab order. */
    interactive?: boolean
    className?: string
}

/** One hero banner: image (desktop/mobile) or solid/gradient background, caption, whole-card link. */
export default function HeroSlideCard({
    slide,
    size = 'lg',
    priority = false,
    interactive = true,
    className = '',
}: Readonly<HeroSlideCardProps>) {
    const desktop = resolveMediaSrc(slide.image_desktop)
    const mobile = resolveMediaSrc(slide.image_mobile || slide.image_desktop)
    const hasImage = !!(desktop || mobile)
    const singleSource = !desktop || !mobile || desktop === mobile
    const alt = slide.alt_text || slide.title || ''
    const large = size === 'lg'

    const background = heroBackground(
        slide.background_style,
        slide.background_color,
        slide.gradient_from,
        slide.gradient_to,
        slide.gradient_angle
    )

    const hasCaption = !!(slide.eyebrow || slide.title || slide.subtitle || slide.cta_label)
    const link = slide.link_url
    const external = /^https?:\/\//.test(link)

    const overlayLink = link ? (
        external || slide.open_in_new_tab ? (
            <a
                href={link}
                target={slide.open_in_new_tab ? '_blank' : undefined}
                rel={slide.open_in_new_tab ? 'noopener noreferrer' : undefined}
                tabIndex={interactive ? undefined : -1}
                aria-label={slide.title || slide.cta_label || 'Open promotion'}
                className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            />
        ) : (
            <Link
                href={link}
                tabIndex={interactive ? undefined : -1}
                aria-label={slide.title || slide.cta_label || 'Open promotion'}
                className="absolute inset-0 z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
            />
        )
    ) : null

    return (
        <div className={`relative h-full w-full overflow-hidden bg-zinc-900 ${className}`} style={background}>
            {hasImage ? (
                <>
                    {singleSource ? (
                        <Image
                            src={desktop || mobile}
                            alt={alt}
                            fill
                            sizes={large ? '(min-width: 1024px) 75vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
                            priority={priority}
                            className="object-cover"
                        />
                    ) : (
                        <>
                            <Image
                                src={desktop}
                                alt={alt}
                                fill
                                sizes={large ? '(min-width: 1024px) 75vw, 100vw' : '(min-width: 1024px) 25vw, 50vw'}
                                priority={priority}
                                className="hidden object-cover md:block"
                            />
                            <Image src={mobile} alt={alt} fill sizes="100vw" className="object-cover md:hidden" />
                        </>
                    )}
                    {slide.video && interactive ? <HeroVideo src={slide.video} /> : null}
                    {/* Photo-legibility scrim, only over a real image. */}
                    {slide.overlay_strength > 0 ? (
                        <div
                            className="absolute inset-0"
                            style={{
                                background: `linear-gradient(${
                                    slide.text_align === 'right' ? 'to left' : slide.text_align === 'center' ? 'to top' : 'to right'
                                }, rgba(0,0,0,${slide.overlay_strength / 100}), rgba(0,0,0,0))`,
                            }}
                        />
                    ) : null}
                </>
            ) : null}

            {hasCaption ? (
                <div
                    className={`absolute inset-0 flex flex-col justify-center gap-1 ${ALIGN[slide.text_align]} ${
                        large ? 'p-5 pb-9 sm:gap-2 sm:p-8 sm:pb-10 lg:p-12' : 'p-3 sm:p-4'
                    }`}
                    style={{ color: slide.text_color }}
                >
                    {slide.eyebrow ? (
                        <span className={`font-semibold ${large ? 'text-xs sm:text-sm' : 'text-xs'}`}>{slide.eyebrow}</span>
                    ) : null}
                    {slide.title ? (
                        <h2
                            className={`font-syne font-extrabold leading-tight ${
                                large ? 'max-w-md text-xl sm:text-3xl lg:text-4xl' : 'line-clamp-2 text-base sm:text-lg'
                            }`}
                        >
                            {slide.title}
                        </h2>
                    ) : null}
                    {slide.subtitle ? (
                        <p className={`line-clamp-2 ${large ? 'max-w-sm text-xs sm:text-sm' : 'hidden text-sm sm:block'}`}>
                            {slide.subtitle}
                        </p>
                    ) : null}
                    {slide.cta_label ? (
                        <span
                            style={{ backgroundColor: slide.cta_bg_color || '#ffffff', color: slide.cta_text_color || '#18181b' }}
                            className={`inline-flex w-fit items-center rounded-md font-bold ${
                                large ? 'mt-1 min-h-[44px] px-5 text-sm' : 'mt-0.5 h-8 px-3 text-xs sm:text-sm'
                            }`}
                        >
                            {slide.cta_label}
                        </span>
                    ) : null}
                </div>
            ) : null}

            {overlayLink}
        </div>
    )
}
