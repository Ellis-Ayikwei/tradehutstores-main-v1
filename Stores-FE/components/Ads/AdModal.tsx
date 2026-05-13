'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { useAd } from '@/hooks/useAd'
import { markDismissed, sendClick } from '@/lib/ads'

interface AdModalProps {
    /** Placement slug. Defaults to homepage-modal. */
    slug?: string
}

export default function AdModal({ slug = 'homepage-modal' }: AdModalProps) {
    const { placement } = useAd(slug, { trackImpressions: true })
    const slot = placement?.slots?.[0]

    const [open, setOpen] = useState(false)
    const [canClose, setCanClose] = useState(false)

    useEffect(() => {
        if (!slot) return
        const delay = (slot.delay_seconds || 0) * 1000
        const t = setTimeout(() => setOpen(true), delay)
        return () => clearTimeout(t)
    }, [slot?.id])

    useEffect(() => {
        if (!open || !slot) return
        const closeDelay = (slot.show_close_after_seconds || 0) * 1000
        if (closeDelay === 0) {
            setCanClose(true)
            return
        }
        setCanClose(false)
        const t = setTimeout(() => setCanClose(true), closeDelay)
        return () => clearTimeout(t)
    }, [open, slot?.id, slot?.show_close_after_seconds])

    if (!slot || !open) return null

    const c = slot.creative
    const desktop = resolveMediaSrc(c.image_desktop)
    const mobile = resolveMediaSrc(c.image_mobile || c.image_desktop)

    const close = () => {
        if (!canClose) return
        markDismissed(slot.id)
        setOpen(false)
    }

    const onClickCta = () => {
        if (c.cta_url) sendClick(slot.id, c.cta_url)
        markDismissed(slot.id)
        setOpen(false)
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-inverse-surface/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={close}
        >
            <div
                className="relative max-w-lg w-full overflow-hidden rounded-2xl shadow-card ring-1 ring-outline-variant/15 font-body bg-surface-container-lowest text-on-surface"
                style={{
                    ...(c.background_color ? { backgroundColor: c.background_color } : {}),
                    ...(c.text_color ? { color: c.text_color } : {}),
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {(desktop || mobile) && (
                    <div className="relative w-full aspect-[16/10] bg-surface-container-low">
                        <Image
                            src={desktop || mobile || ''}
                            alt={c.alt_text || c.headline || 'Promotion'}
                            fill
                            className="object-cover hidden sm:block"
                            sizes="(max-width: 640px) 100vw, 512px"
                        />
                        <Image
                            src={mobile || desktop || ''}
                            alt={c.alt_text || c.headline || 'Promotion'}
                            fill
                            className="object-cover sm:hidden"
                            sizes="100vw"
                        />
                    </div>
                )}

                <div className="p-6 sm:p-8 text-center">
                    {c.eyebrow && (
                        <span
                            className={`inline-block text-xs font-bold uppercase tracking-[0.2em] mb-3 px-3 py-1 rounded-full ${
                                c.accent_color ? '' : 'bg-primary-container text-on-primary'
                            }`}
                            style={
                                c.accent_color
                                    ? { backgroundColor: c.accent_color, color: '#ffffff' }
                                    : undefined
                            }
                        >
                            {c.eyebrow}
                        </span>
                    )}
                    {c.headline && (
                        <h2 className="font-syne text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
                            {c.headline}
                        </h2>
                    )}
                    {c.subheadline && (
                        <p
                            className={`mt-3 text-sm sm:text-base leading-relaxed ${
                                c.text_color ? 'opacity-80' : 'text-on-surface-variant'
                            }`}
                        >
                            {c.subheadline}
                        </p>
                    )}

                    {c.cta_label && c.cta_url && (
                        c.open_in_new_tab ? (
                            <a
                                href={c.cta_url}
                                target="_blank"
                                rel="noopener noreferrer sponsored"
                                onClick={onClickCta}
                                className={`mt-6 inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm sm:text-base font-bold shadow-md transition-transform hover:scale-105 active:scale-95 ${
                                    c.accent_color ? '' : 'bg-primary-container text-on-primary'
                                }`}
                                style={
                                    c.accent_color
                                        ? { backgroundColor: c.accent_color, color: '#ffffff' }
                                        : undefined
                                }
                            >
                                {c.cta_label} →
                            </a>
                        ) : (
                            <Link
                                href={c.cta_url}
                                onClick={onClickCta}
                                className={`mt-6 inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm sm:text-base font-bold shadow-md transition-transform hover:scale-105 active:scale-95 ${
                                    c.accent_color ? '' : 'bg-primary-container text-on-primary'
                                }`}
                                style={
                                    c.accent_color
                                        ? { backgroundColor: c.accent_color, color: '#ffffff' }
                                        : undefined
                                }
                            >
                                {c.cta_label} →
                            </Link>
                        )
                    )}
                </div>

                {slot.dismissible && (
                    <button
                        type="button"
                        onClick={close}
                        disabled={!canClose}
                        className="absolute top-3 right-3 p-2 rounded-full bg-inverse-surface/55 hover:bg-inverse-surface/80 text-inverse-on-surface transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    )
}
