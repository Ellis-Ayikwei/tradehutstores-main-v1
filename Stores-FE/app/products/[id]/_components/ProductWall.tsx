'use client'

import { useState } from 'react'
import PdpImage from './PdpImage'

interface ProductWallProps {
  images: string[]
  name: string
}

/** Reserved ratio until the picture reports its own, so the page does not jump while the wall loads. */
const DEFAULT_RATIO = 4 / 3

function WallImage({ src, alt, eager }: { src: string; alt: string; eager: boolean }) {
  const [ratio, setRatio] = useState(DEFAULT_RATIO)
  return (
    <div className="relative w-full bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: ratio }}>
      <PdpImage
        src={src}
        alt={alt}
        sizes="(min-width: 1024px) 896px, 100vw"
        className="object-cover"
        priority={eager}
        onLoad={(e) => {
          const { naturalWidth, naturalHeight } = e.currentTarget
          if (naturalWidth > 0 && naturalHeight > 0) setRatio(naturalWidth / naturalHeight)
        }}
      />
    </div>
  )
}

/**
 * "From the seller": the large infographic pictures, stacked edge to edge at their natural ratio
 * (the Amazon A+ / AliExpress detail-page wall). Renders nothing when the seller added none.
 */
export default function ProductWall({ images, name }: Readonly<ProductWallProps>) {
  if (images.length === 0) return null
  return (
    <section id="product-wall" aria-label="Product story" className="scroll-mt-28 border-t border-zinc-200 dark:border-zinc-800">
      <h2 className="pb-2 pt-3 text-base font-bold text-zinc-900 dark:text-zinc-100 lg:text-xl">From the seller</h2>
      <div className="mx-auto max-w-4xl overflow-hidden rounded-md">
        {images.map((src, i) => (
          <WallImage key={src} src={src} alt={`${name} - detail ${i + 1} of ${images.length}`} eager={false} />
        ))}
      </div>
    </section>
  )
}
