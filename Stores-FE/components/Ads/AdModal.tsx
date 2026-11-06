'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { X } from 'lucide-react'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import { useAd } from '@/hooks/useAd'
import { markDismissed, sendClick } from '@/lib/ads'
import { accentStyle, creativeColors } from './adLayout'

interface AdModalProps {
    /** Placement slug. Defaults to homepage-modal. */
    slug?: string
}

const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function AdModal({ slug = 'homepage-modal' }: AdModalProps) {
    const { placement } = useAd(slug, { trackImpressions: true })
    const slot = placement?.slots?.[0]

    const [open, setOpen] = useState(false)
    const [canClose, setCanClose] = useState(false)
    const dialogRef = useRef<HTMLDivElement>(null)
    const titleId = useId()

    const slotId = slot?.id
    const delaySeconds = slot?.delay_seconds
    const closeAfterSeconds = slot?.show_close_after_seconds

    useEffect(() => {
        if (!slotId) return
        const t = setTimeout(() => setOpen(true), (delaySeconds || 0) * 1000)
        return () => clearTimeout(t)
    }, [slotId, delaySeconds])

    useEffect(() => {
        if (!open || !slotId) return
        const closeDelay = (closeAfterSeconds || 0) * 1000
        if (closeDelay === 0) {
            setCanClose(true)
            return
        }
        setCanClose(false)
        const t = setTimeout(() => setCanClose(true), closeDelay)
        return () => clearTimeout(t)
    }, [open, slotId, closeAfterSeconds])

    const close = useCallback(() => {
        if (!canClose || !slot) return
        markDismissed(slot.id)
        setOpen(false)
    }, [canClose, slot])

    // Scroll lock + focus management while open.
    useEffect(() => {
        if (!open) return
        const previouslyFocused = document.activeElement as HTMLElement | null
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const dialog = dialogRef.current
        const first = dialog?.querySelector<HTMLElement>(FOCUSABLE)
        ;(first ?? dialog)?.focus()
        return () => {
            document.body.style.overflow = prevOverflow
            previouslyFocused?.focus?.()
        }
    }, [open])

    // Esc closes (when closing is allowed); Tab is trapped inside the dialog.
    useEffect(() => {
        if (!open) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                close()
                return
            }
            if (e.key !== 'Tab') return
            const dialog = dialogRef.current
            if (!dialog) return
            const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
            if (nodes.length === 0) {
                e.preventDefault()
                dialog.focus()
                return
            }
            const firstEl = nodes[0]
            const lastEl = nodes[nodes.length - 1]
            const activeEl = document.activeElement
            if (e.shiftKey && (activeEl === firstEl || activeEl === dialog)) {
                e.preventDefault()
                lastEl.focus()
            } else if (!e.shiftKey && activeEl === lastEl) {
                e.preventDefault()
                firstEl.focus()
            }
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, close])

    if (!slot || !open) return null

    const c = slot.creative
    const desktop = resolveMediaSrc(c.image_desktop)
    const mobile = resolveMediaSrc(c.image_mobile || c.image_desktop)
    const hasImage = !!(desktop || mobile)
    const singleSource = !desktop || !mobile || desktop === mobile
    const alt = c.alt_text || c.headline || 'Promotion'
    const colors = creativeColors(c)
    const accent = accentStyle(c)

    const onClickCta = () => {
        if (c.cta_url) sendClick(slot.id, c.cta_url)
        markDismissed(slot.id)
        setOpen(false)
    }

    const ctaClass = `mt-3 flex h-11 w-full items-center justify-center rounded-full px-6 text-sm font-semibold sm:inline-flex sm:w-auto ${
        accent ? '' : 'bg-primary-700 text-white hover:bg-primary-800'
    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2`

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6"
            onClick={close}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={c.headline ? titleId : undefined}
                aria-label={c.headline ? undefined : alt}
                tabIndex={-1}
                className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-zinc-200 font-body shadow-xl outline-none ${
                    colors ? '' : 'bg-white text-zinc-900'
                }`}
                style={colors ?? undefined}
                onClick={(e) => e.stopPropagation()}
            >
                {hasImage ? (
                    <div className="relative aspect-[16/10] w-full bg-zinc-50">
                        {singleSource ? (
                            <Image
                                src={desktop || mobile}
                                alt={alt}
                                fill
                                sizes="(min-width: 640px) 448px, 100vw"
                                className="object-cover"
                            />
                        ) : (
                            <>
                                <Image
                                    src={desktop}
                                    alt={alt}
                                    fill
                                    sizes="448px"
                                    className="hidden object-cover sm:block"
                                />
                                <Image src={mobile} alt={alt} fill sizes="100vw" className="object-cover sm:hidden" />
                            </>
                        )}
                    </div>
                ) : null}

                <div className="p-4 sm:p-5">
                    <p className="text-[11px] leading-4 text-zinc-500">Sponsored</p>
                    {c.eyebrow ? (
                        <span
                            className={`mt-1 inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                                accent ? '' : 'bg-primary-50 text-primary-800'
                            }`}
                            style={accent}
                        >
                            {c.eyebrow}
                        </span>
                    ) : null}
                    {c.headline ? (
                        <h2 id={titleId} className="mt-1 font-syne text-xl font-bold leading-tight sm:text-2xl">
                            {c.headline}
                        </h2>
                    ) : null}
                    {c.subheadline ? (
                        <p className="mt-1.5 text-sm leading-snug sm:text-base">{c.subheadline}</p>
                    ) : null}

                    {c.cta_label && c.cta_url ? (
                        c.open_in_new_tab ? (
                            <a
                                href={c.cta_url}
                                target="_blank"
                                rel="noopener noreferrer sponsored"
                                onClick={onClickCta}
                                className={ctaClass}
                                style={accent}
                            >
                                {c.cta_label}
                            </a>
                        ) : (
                            <Link href={c.cta_url} onClick={onClickCta} className={ctaClass} style={accent}>
                                {c.cta_label}
                            </Link>
                        )
                    ) : null}
                </div>

                {slot.dismissible ? (
                    <button
                        type="button"
                        onClick={close}
                        disabled={!canClose}
                        className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 disabled:cursor-not-allowed"
                        aria-label="Close"
                    >
                        <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 shadow-sm ${
                                canClose ? 'hover:bg-zinc-50' : 'text-zinc-400'
                            }`}
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </span>
                    </button>
                ) : null}
            </div>
        </div>
    )
}
