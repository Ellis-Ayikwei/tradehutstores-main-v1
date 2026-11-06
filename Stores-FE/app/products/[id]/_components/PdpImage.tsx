import Image from 'next/image'
import { getApiPublicOrigin } from '@/lib/mediaUrl'

function hostOf(src: string): string | null {
  try {
    return new URL(src).hostname
  } catch {
    return null
  }
}

/** next/image rejects plain-http hosts that are not in next.config remotePatterns; skip optimisation for those. */
function needsUnoptimized(src: string): boolean {
  if (!src.startsWith('http://')) return false
  const host = hostOf(src)
  if (!host) return false
  return !['localhost', '127.0.0.1', hostOf(getApiPublicOrigin())].includes(host)
}

interface PdpImageProps {
  src: string
  alt: string
  sizes: string
  className?: string
  priority?: boolean
  draggable?: boolean
}

/** Fill-mode next/image: the parent must be `relative` with a fixed size or aspect ratio. */
export default function PdpImage({ src, alt, sizes, className, priority, draggable }: PdpImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      draggable={draggable}
      unoptimized={needsUnoptimized(src)}
      className={className}
    />
  )
}
