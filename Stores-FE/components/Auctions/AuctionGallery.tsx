'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import { resolveMediaSrc } from '@/lib/mediaUrl'

interface AuctionGalleryProps {
    images: string[]
    alt: string
    dimmed?: boolean
}

/** Square neutral stage (no layout shift) with a thumbnail strip. Images come from the API only. */
export default function AuctionGallery({ images, alt, dimmed = false }: AuctionGalleryProps) {
    const [index, setIndex] = useState(0)
    const list = images.map(resolveMediaSrc).filter(Boolean)
    const current = list[Math.min(index, Math.max(0, list.length - 1))]

    return (
        <div className="min-w-0">
            <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800">
                {current ? (
                    <Image
                        src={current}
                        alt={alt}
                        fill
                        priority
                        sizes="(min-width: 1280px) 40vw, (min-width: 1024px) 45vw, 100vw"
                        className={`object-contain p-3 sm:p-4 ${dimmed ? 'grayscale' : ''}`}
                    />
                ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-zinc-500 dark:text-zinc-400">
                        <ImageOff className="h-10 w-10" aria-hidden="true" />
                        <span className="text-xs">No image available</span>
                    </div>
                )}
            </div>
            {list.length > 1 ? (
                <ul className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Image thumbnails">
                    {list.map((src, i) => (
                        <li key={src} className="shrink-0">
                            <button
                                type="button"
                                onClick={() => setIndex(i)}
                                aria-label={`Show image ${i + 1} of ${list.length}`}
                                aria-current={i === index}
                                className={`relative block h-14 w-14 overflow-hidden rounded-md border-2 bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:bg-zinc-800 dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950 ${
                                    i === index ? 'border-primary-700 dark:border-primary-400' : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-500'
                                }`}
                            >
                                <Image src={src} alt="" fill sizes="56px" className="object-contain p-1" />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    )
}
