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

const SAFE_GRADIENT = /^(linear|radial)-gradient\([#a-z0-9%.,()\s-]+\)$/i
const UNSAFE_CSS = /url\s*\(|image-set|expression|var\s*\(|@import|\\/i

/** Relative luminance (0-1) of a `#rgb` / `#rrggbb` colour, or null when it is not one. */
function hexLuminance(hex: string): number | null {
    const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex)
    if (!m) return null
    const h = m[1].length === 3 ? m[1].replace(/./g, (ch) => ch + ch) : m[1]
    const channel = (i: number) => {
        const v = parseInt(h.slice(i, i + 2), 16) / 255
        return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
}

/**
 * Banner surface: a solid colour or a CSS gradient set by the admin. Anything that is not a plain colour
 * or a simple linear/radial gradient (urls, semicolons, expressions) is rejected. When the admin set no text
 * colour, light solid backgrounds get dark text and everything else gets white.
 */
export function creativeSurface(c: AdCreative): { background?: string; color: string } {
    const bg = c.background_color?.trim()
    const set = c.text_color?.trim()
    if (!bg) return { color: set || '#ffffff' }
    const plain = /^#[0-9a-f]{3,8}$/i.test(bg) || /^[a-z]+$/i.test(bg) || /^(rgb|hsl)a?\([\d\s.,%/]+\)$/i.test(bg)
    const safe = plain || (SAFE_GRADIENT.test(bg) && !UNSAFE_CSS.test(bg))
    if (!safe) return { color: set || '#ffffff' }
    const lum = hexLuminance(bg)
    const auto = lum !== null && lum > 0.5 ? '#18181b' : '#ffffff'
    return { background: bg, color: set || auto }
}

/** Solid accent colour for a CTA pill, when the admin set one. */
export function accentStyle(c: AdCreative): CSSProperties | undefined {
    const a = c.accent_color?.trim()
    return a ? { backgroundColor: a, color: 'white' } : undefined
}
