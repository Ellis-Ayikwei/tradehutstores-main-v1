'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, X } from 'lucide-react'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { markDismissed, sendClick, type AdSlot } from '@/lib/ads'
import { accentStyle, creativeSurface, resolveAspect } from './adLayout'

interface AdBannerProps {
    slot: AdSlot
    /** Overrides the reserved box (e.g. `aspect-[21/4]`). Defaults to 16:9 / 21:9 / 3:1 (max 300px). */
    aspectClass?: string
    /** Placement `aspect_ratio` hint; used for md+ when no `aspectClass` is given. */
    ratio?: string | null
    rounded?: string
    className?: string
    onDismiss?: () => void
    /** Preload the image. Only for the first hero on a page. */
    priority?: boolean
    /** False when the banner sits in an off-screen carousel slide: links leave the tab order. */
    interactive?: boolean
}

/** Generic image/text banner. Desktop image on md+, mobile image below. Caption sits on a solid panel. */
export default function AdBanner({
    slot,
    aspectClass,
    ratio,
    rounded = 'rounded-lg',
    className = '',
    onDismiss,
    priority = false,
    interactive = true,
}: Readonly<AdBannerProps>) {
    const c = slot.creative
    const desktop = resolveMediaSrc(c.image_desktop)
    const mobile = resolveMediaSrc(c.image_mobile || c.image_desktop)
    const hasImage = !!(desktop || mobile)
    const hasCta = !!c.cta_url
    const hasCaption = !!(c.headline || c.subheadline || c.eyebrow || c.cta_label)
    const singleSource = !desktop || !mobile || desktop === mobile
    const alt = c.alt_text || c.headline || 'Advertisement'

    const aspect = resolveAspect(aspectClass, ratio)
    const surface = creativeSurface(c)
    const accent = accentStyle(c)

    const onClick = () => {
        if (hasCta) sendClick(slot.id, c.cta_url)
    }

    const textOnly = !hasImage
    const boxStyle = textOnly ? { background: surface.background } : undefined
    const boxTone = textOnly && !surface.background ? 'bg-zinc-900' : 'bg-zinc-100'

    // Caption sits directly on the photo (or on the solid/gradient surface), over a legibility scrim.
    // A caller-sized box (e.g. the 21:5 / 21:3 strips) is short, so the caption scales down to fit it.
    const compact = !!aspectClass
    const caption = hasCaption ? (
        <div
            className={`absolute inset-0 flex max-w-2xl flex-col justify-center ${
                compact ? 'gap-0.5 p-2 sm:gap-1 sm:p-4 lg:p-6' : 'justify-end gap-1 p-4 sm:justify-center sm:gap-2 sm:p-8 lg:p-12'
            }`}
            style={{ color: surface.color }}
        >
            {c.eyebrow ? (
                <span
                    className={`w-fit rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-zinc-900 ${
                        compact ? 'hidden sm:inline-block' : ''
                    }`}
                >
                    {c.eyebrow}
                </span>
            ) : null}
            {c.headline ? (
                <h3
                    className={`font-syne font-extrabold leading-tight ${
                        compact ? 'line-clamp-1 text-sm sm:text-lg lg:text-2xl' : 'line-clamp-2 text-xl sm:text-3xl lg:text-4xl'
                    }`}
                >
                    {c.headline}
                </h3>
            ) : null}
            {c.subheadline ? (
                <p
                    className={`line-clamp-2 hidden max-w-md leading-snug sm:block ${
                        compact ? 'text-xs lg:text-sm' : 'text-sm sm:text-base'
                    }`}
                >
                    {c.subheadline}
                </p>
            ) : null}
            {c.cta_label ? (
                <span
                    className={`inline-flex w-fit items-center gap-1 rounded-full font-bold ${
                        compact ? 'mt-0.5 h-7 px-3 text-xs sm:h-8 sm:px-4 sm:text-sm' : 'mt-1 h-9 px-4 text-sm sm:mt-2 sm:h-11 sm:px-6'
                    } ${accent ? '' : 'bg-white text-zinc-900'}`}
                    style={accent}
                >
                    {c.cta_label}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </span>
            ) : null}
        </div>
    ) : null

    const media = (
        <div
            className={`relative block w-full overflow-hidden ${aspect.className} ${rounded} ${boxTone}`}
            style={{ ...aspect.style, ...boxStyle }}
        >
            {hasImage ? (
                singleSource ? (
                    <Image
                        src={desktop || mobile}
                        alt={alt}
                        fill
                        sizes="(min-width: 1440px) 1440px, 100vw"
                        className="object-cover"
                        priority={priority}
                    />
                ) : (
                    <>
                        <Image
                            src={desktop}
                            alt={alt}
                            fill
                            sizes="(min-width: 1440px) 1440px, 100vw"
                            className="hidden object-cover md:block"
                        />
                        <Image src={mobile} alt={alt} fill sizes="100vw" className="object-cover md:hidden" />
                    </>
                )
            ) : null}
            {hasImage && hasCaption ? (
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent sm:bg-gradient-to-r sm:from-black/70 sm:via-black/30 sm:to-transparent" />
            ) : null}
            {caption}
        </div>
    )

    const tabIndex = interactive ? undefined : -1
    const linkClass =
        'block rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2'

    let body = media
    if (hasCta) {
        body = c.open_in_new_tab ? (
            <a
                href={c.cta_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={onClick}
                tabIndex={tabIndex}
                className={linkClass}
            >
                {media}
            </a>
        ) : (
            <Link href={c.cta_url} onClick={onClick} tabIndex={tabIndex} className={linkClass}>
                {media}
            </Link>
        )
    }

    return (
        <div className={`relative ${rounded} ${className}`}>
            {body}

            <span className="pointer-events-none absolute left-0 top-0 rounded-br-md bg-white px-1.5 py-0.5 text-[11px] leading-4 text-zinc-500">
                Sponsored
            </span>

            {slot.dismissible && onDismiss ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        markDismissed(slot.id)
                        onDismiss()
                    }}
                    tabIndex={tabIndex}
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                    aria-label="Dismiss ad"
                >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm hover:bg-zinc-50">
                        <X className="h-4 w-4" aria-hidden="true" />
                    </span>
                </button>
            ) : null}
        </div>
    )
}
