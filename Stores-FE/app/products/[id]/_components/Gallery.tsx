'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Heart, ImageOff, X } from 'lucide-react'
import PdpImage from './PdpImage'

interface GalleryProps {
  images: string[]
  /** Hover preview (desktop): shown in the main stage without changing the selection. */
  previewSrc?: string | null
  alt: string
  wishlisted: boolean
  onToggleWishlist: () => void
}

function Lightbox({
  images,
  index,
  alt,
  onChange,
  onClose,
}: {
  images: string[]
  index: number
  alt: string
  onChange: (i: number) => void
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const n = images.length

  useEffect(() => {
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onChange((index + 1) % n)
      if (e.key === 'ArrowLeft') onChange((index - 1 + n) % n)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [index, n, onChange, onClose])

  const btn =
    'flex h-11 w-11 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-primary-400 dark:ring-offset-zinc-950'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} image viewer`}
      className="fixed inset-0 z-modal flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
    >
      <div className="flex items-center justify-between px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100">
        <span aria-live="polite">
          {index + 1} / {n}
        </span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close image viewer" className={btn}>
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="relative min-h-0 flex-1" onClick={onClose}>
        <PdpImage src={images[index]} alt={alt} sizes="100vw" className="object-contain p-2" />
      </div>
      {n > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous image"
            onClick={() => onChange((index - 1 + n) % n)}
            className={`${btn} absolute left-3 top-1/2 -translate-y-1/2`}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Next image"
            onClick={() => onChange((index + 1) % n)}
            className={`${btn} absolute right-3 top-1/2 -translate-y-1/2`}
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </>
      ) : null}
    </div>
  )
}

export default function Gallery({ images, previewSrc, alt, wishlisted, onToggleWishlist }: GalleryProps) {
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const slider = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<HTMLDivElement>(null)

  const safeActive = Math.min(active, Math.max(0, images.length - 1))
  const closeLightbox = useCallback(() => setLightbox(false), [])

  const onSliderScroll = () => {
    const el = slider.current
    if (!el || el.clientWidth === 0) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }

  const onZoomMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const img = zoomRef.current
    if (!img) return
    const x = ((e.clientX - box.left) / box.width) * 100
    const y = ((e.clientY - box.top) / box.height) * 100
    img.style.transformOrigin = `${x}% ${y}%`
  }

  const heart = (
    <button
      type="button"
      onClick={onToggleWishlist}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={wishlisted}
      className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:focus-visible:ring-primary-400 lg:hidden"
    >
      <Heart className={`h-5 w-5 ${wishlisted ? 'fill-red-600 dark:fill-red-400 text-red-600 dark:text-red-400' : ''}`} aria-hidden />
    </button>
  )

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
        <ImageOff className="h-12 w-12" aria-hidden />
        <span className="sr-only">No image available</span>
      </div>
    )
  }

  return (
    <div className="lg:flex lg:gap-3">
      {/* Desktop thumbnail rail */}
      <div
        className="hidden shrink-0 flex-col gap-2 lg:flex lg:max-h-[560px] lg:overflow-y-auto"
        role="tablist"
        aria-label="Product images"
      >
        {images.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            role="tab"
            aria-selected={safeActive === i}
            aria-label={`Image ${i + 1} of ${images.length}`}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(i)}
            className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-50 dark:bg-zinc-800 ${
              safeActive === i
                ? 'border-2 border-primary-700 dark:border-primary-400'
                : 'border border-zinc-300 hover:border-zinc-500 dark:border-zinc-700 dark:hover:border-zinc-400'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-1 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950`}
          >
            <PdpImage src={src} alt="" sizes="56px" className="object-contain p-0.5" />
          </button>
        ))}
      </div>

      {/* Desktop stage */}
      <div
        className="relative hidden aspect-square min-w-0 flex-1 cursor-zoom-in overflow-hidden rounded-lg bg-zinc-50 dark:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950 lg:block"
        onMouseMove={onZoomMove}
        onClick={() => setLightbox(true)}
        role="button"
        tabIndex={0}
        aria-label="Open larger image"
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setLightbox(true)
          }
        }}
      >
        <div ref={zoomRef} className="absolute inset-0 transition-transform duration-150 ease-out hover:scale-[1.8]">
          <PdpImage
            src={previewSrc ?? images[safeActive]}
            alt={alt}
            sizes="(min-width: 1280px) 520px, 40vw"
            priority
            className="object-contain p-3"
          />
        </div>
      </div>

      {/* Mobile swipe gallery */}
      <div className="relative lg:hidden">
        <div
          ref={slider}
          onScroll={onSliderScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-zinc-50 dark:bg-zinc-800"
        >
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setLightbox(true)}
              aria-label={`Open image ${i + 1} of ${images.length}`}
              className="relative aspect-square w-full shrink-0 snap-center snap-always"
            >
              <PdpImage
                src={src}
                alt={i === 0 ? alt : `${alt} - image ${i + 1}`}
                sizes="100vw"
                priority={i === 0}
                className="object-contain p-2"
              />
            </button>
          ))}
        </div>
        {heart}
        {images.length > 1 ? (
          <>
            <span className="absolute bottom-2 right-2 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
              {safeActive + 1}/{images.length}
            </span>
            <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5" aria-hidden>
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full ${safeActive === i ? 'w-4 bg-zinc-900 dark:bg-zinc-100' : 'w-1.5 bg-zinc-400 dark:bg-zinc-600'}`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      {lightbox ? (
        <Lightbox images={images} index={safeActive} alt={alt} onChange={setActive} onClose={closeLightbox} />
      ) : null}
    </div>
  )
}
