import type { CSSProperties } from 'react'
import type { AdCreative } from '@/lib/ads'

/**
 * Reserved box for banner/carousel ads: 16:9 on phones, 21:9 on tablets, 3:1 on desktop
 * (never taller than 300px). Reserving the box up front means the page never shifts when
 * the ad arrives.
 */
export const DEFAULT_AD_ASPECT = 'aspect-[16/9] md:aspect-[21/9] lg:aspect-[3/1] lg:max-h-[300px]'

/** Same, but tablet/desktop use the ratio the placement declares (via the --ad-ar CSS variable). */
const PLACEMENT_AD_ASPECT = 'aspect-[16/9] md:aspect-[var(--ad-ar)] lg:max-h-[300px]'

const RATIO_RE = /^\s*(\d+(?:\.\d+)?)\s*[/:x]\s*(\d+(?:\.\d+)?)\s*$/i

/** "21/9", "21:9" -> "21 / 9". Returns null for anything else (the BE field is a free-text hint). */
export function parseRatio(value?: string | null): string | null {
    if (!value) return null
    const m = RATIO_RE.exec(value)
    if (!m) return null
    const w = Number(m[1])
    const h = Number(m[2])
    if (!(w > 0) || !(h > 0)) return null
    return `${w} / ${h}`
}

/** Class + inline style for the reserved box. A caller-supplied `aspectClass` always wins. */
export function resolveAspect(
    aspectClass?: string,
    placementRatio?: string | null
): { className: string; style?: CSSProperties } {
    if (aspectClass) return { className: aspectClass }
    const ratio = parseRatio(placementRatio)
    if (ratio) {
        return { className: PLACEMENT_AD_ASPECT, style: { ['--ad-ar' as string]: ratio } }
    }
    return { className: DEFAULT_AD_ASPECT }
}

/**
 * Creative colours are only honoured as a pair, so text can never end up unreadable
 * against a background the admin did not intend it for. Gradients are ignored (solid only).
 */
export function creativeColors(c: AdCreative): { backgroundColor: string; color: string } | null {
    const bg = c.background_color?.trim()
    const fg = c.text_color?.trim()
    if (!bg || !fg) return null
    if (bg.includes('gradient') || bg.startsWith('linear-')) return null
    return { backgroundColor: bg, color: fg }
}

/** Solid accent colour for a CTA pill, when the admin set one. */
export function accentStyle(c: AdCreative): CSSProperties | undefined {
    const a = c.accent_color?.trim()
    return a ? { backgroundColor: a, color: 'white' } : undefined
}
