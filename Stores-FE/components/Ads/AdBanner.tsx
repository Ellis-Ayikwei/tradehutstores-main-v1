'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { markDismissed, sendClick, type AdSlot } from '@/lib/ads'
import { X } from 'lucide-react'

interface AdBannerProps {
    slot: AdSlot
    aspectClass?: string
    rounded?: string
    className?: string
    onDismiss?: () => void
}

/** Generic image/text banner. Renders desktop image on md+, mobile image otherwise. */
export default function AdBanner({
    slot,
    aspectClass = 'aspect-[16/4]',
    rounded = 'rounded-2xl',
    className = '',
    onDismiss,
}: Readonly<AdBannerProps>) {
    const c = slot.creative
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])

    const desktop = resolveMediaSrc(c.image_desktop)
    const mobile = resolveMediaSrc(c.image_mobile || c.image_desktop)
    const hasImage = !!(desktop || mobile)
    const hasCta = !!c.cta_url

    const onClick = () => {
        if (hasCta) sendClick(slot.id, c.cta_url)
    }

    const inner = (
        <div
            className={[
                'group relative w-full overflow-hidden',
                aspectClass,
                rounded,
                'shadow-card transition-all duration-300 hover:shadow-card-hover',
            ].join(' ')}
            style={{
                backgroundColor: c.background_color || undefined,
                color: c.text_color || undefined,
            }}
        >
            {hasImage && mounted && (
                <>
                    <Image
                        src={desktop || mobile || ''}
                        alt={c.alt_text || c.headline || 'Ad'}
                        fill
                        sizes="(max-width: 768px) 100vw, 100vw"
                        className="object-cover hidden md:block"
                        priority={false}
                    />
                    <Image
                        src={mobile || desktop || ''}
                        alt={c.alt_text || c.headline || 'Ad'}
                        fill
                        sizes="(max-width: 768px) 100vw, 0px"
                        className="object-cover md:hidden"
                        priority={false}
                    />
                </>
            )}

            {(c.headline || c.cta_label) && (
                <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 bg-gradient-to-r from-inverse-surface/65 via-inverse-surface/35 to-transparent font-body">
                    {c.eyebrow && (
                        <span
                            className={`inline-block w-fit text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mb-1.5 sm:mb-2 px-2 py-0.5 rounded-full ${
                                c.accent_color ? '' : 'bg-inverse-on-surface/20 text-inverse-on-surface'
                            }`}
                            style={
                                c.accent_color
                                    ? {
                                          backgroundColor: c.accent_color,
                                          color: c.text_color || '#ffede7',
                                      }
                                    : c.text_color
                                      ? { color: c.text_color }
                                      : undefined
                            }
                        >
                            {c.eyebrow}
                        </span>
                    )}
                    {c.headline && (
                        <h3
                            className={`font-syne text-lg sm:text-2xl md:text-3xl font-bold tracking-tight leading-tight max-w-md drop-shadow-lg ${
                                c.text_color ? '' : 'text-inverse-on-surface'
                            }`}
                            style={c.text_color ? { color: c.text_color } : undefined}
                        >
                            {c.headline}
                        </h3>
                    )}
                    {c.subheadline && (
                        <p
                            className={`mt-1 text-xs sm:text-sm md:text-base max-w-md line-clamp-2 ${
                                c.text_color ? 'opacity-90' : 'text-inverse-on-surface/90'
                            }`}
                            style={c.text_color ? { color: c.text_color } : undefined}
                        >
                            {c.subheadline}
                        </p>
                    )}
                    {c.cta_label && (
                        <span
                            className={`mt-3 inline-flex items-center gap-1.5 self-start px-4 py-2 rounded-full text-xs sm:text-sm font-semibold shadow-md transition-transform active:scale-95 group-hover:translate-x-0.5 ${
                                c.accent_color ? '' : 'bg-surface-container-lowest text-on-surface'
                            }`}
                            style={
                                c.accent_color
                                    ? {
                                          backgroundColor: c.accent_color,
                                          color:
                                              c.text_color === '#fff' || c.text_color === '#ffffff'
                                                  ? '#261813'
                                                  : c.text_color || '#261813',
                                      }
                                    : undefined
                            }
                        >
                            {c.cta_label} →
                        </span>
                    )}
                </div>
            )}

            {slot.dismissible && onDismiss && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        markDismissed(slot.id)
                        onDismiss()
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-inverse-surface/55 hover:bg-inverse-surface/80 text-inverse-on-surface transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                    aria-label="Dismiss ad"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    )

    if (!hasCta) return <div className={className}>{inner}</div>

    if (c.open_in_new_tab) {
        return (
            <a
                href={c.cta_url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={onClick}
                className={`block ${className}`}
            >
                {inner}
            </a>
        )
    }

    return (
        <Link href={c.cta_url} onClick={onClick} className={`block ${className}`}>
            {inner}
        </Link>
    )
}
