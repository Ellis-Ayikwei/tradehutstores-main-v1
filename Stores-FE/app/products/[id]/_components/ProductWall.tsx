import Image from 'next/image'

interface ProductWallProps {
  images: string[]
  name: string
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
      <div className="mx-auto max-w-4xl space-y-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
        {images.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={`${name} - detail ${i + 1} of ${images.length}`}
            width={0}
            height={0}
            sizes="(min-width: 1024px) 896px, 100vw"
            loading="lazy"
            className="block h-auto w-full"
          />
        ))}
      </div>
    </section>
  )
}
