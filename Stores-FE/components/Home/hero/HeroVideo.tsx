'use client'

import { useEffect, useState } from 'react'

/**
 * Looping background clip over the slide image. Renders nothing (so nothing is downloaded) on phones,
 * with reduced motion, or with Data Saver on; those visitors see the image underneath.
 */
export default function HeroVideo({ src }: Readonly<{ src: string }>) {
    const [canPlay, setCanPlay] = useState(false)

    useEffect(() => {
        const wide = window.matchMedia('(min-width: 768px)')
        const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
        const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
        const update = () => setCanPlay(wide.matches && !calm.matches && !connection?.saveData)
        update()
        wide.addEventListener('change', update)
        calm.addEventListener('change', update)
        return () => {
            wide.removeEventListener('change', update)
            calm.removeEventListener('change', update)
        }
    }, [])

    if (!canPlay) return null
    return (
        <video
            src={src}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
        />
    )
}
