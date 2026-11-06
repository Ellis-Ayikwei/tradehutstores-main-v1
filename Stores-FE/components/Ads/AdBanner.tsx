'use client'

import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { markDismissed, sendClick, type AdSlot } from '@/lib/ads'
import { accentStyle, creativeColors, resolveAspect } from './adLayout'

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
    const colors = creativeColors(c)
    const accent = accentStyle(c)

    const onClick = () => {
        if (hasCta) sendClick(slot.id, c.cta_url)
    }

    // Text-only ad: the whole box is the solid panel. Image ad: a compact solid panel on the photo.
    const textOnly = !hasImage
    const boxStyle = textOnly && colors ? colors : undefined
    const boxTone = textOnly && !colors ? 'bg-zinc-900 text-white' : 'bg-zinc-50'
    const panelStyle = colors ?? undefined
    const panelTone = colors ? '' : 'bg-white text-zinc-900'

    const caption = hasCaption ? (
        <div
            className={
                textOnly
                    ? 'absolute inset-0 flex max-w-2xl flex-col justify-center px-4 sm:px-8'
                    : `absolute bottom-2 left-2 max-w-[78%] rounded-md p-2 shadow-sm sm:bottom-3 sm:left-3 sm:max-w-[55%] sm:p-3 lg:max-w-[45%] ${panelTone}`
            }
            style={textOnly ? undefined : panelStyle}
        >
            {c.eyebrow ? (
                <p
                    className={`text-[11px] font-bold uppercase tracking-wide ${
                        textOnly || colors ? 'opacity-80' : 'text-primary-700'
                    }`}
                >
                    {c.eyebrow}
                </p>
            ) : null}
            {c.headline ? (
                <h3 className="line-clamp-2 font-syne text-sm font-bold leading-tight sm:text-lg md:text-xl">
                    {c.headline}
                </h3>
            ) : null}
            {c.subheadline ? (
                <p className="mt-0.5 hidden line-clamp-2 text-sm leading-snug opacity-80 sm:block">
                    {c.subheadline}
                </p>
            ) : null}
            {c.cta_label ? (
                <span
                    className={`mt-1.5 inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold sm:h-9 sm:px-4 sm:text-sm ${
                        accent ? '' : 'bg-primary-700 text-white'
                    }`}
                    style={accent}
                >
                    {c.cta_label}
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
