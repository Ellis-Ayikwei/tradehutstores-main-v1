import type { Metadata } from 'next'
import { apiUrl } from '@/lib/config'
import { resolveMediaSrc } from '@/lib/mediaUrl'

export const runtime = 'edge'

interface LayoutProps {
    children: React.ReactNode
    params: Promise<{ id: string }>
}

function text(v: unknown): string | null {
    return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** Title, description and share image come from the auction API only; nothing is invented. */
export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
    const { id } = await params
    const fallback: Metadata = { title: 'Auction | TradeHut' }
    try {
        const res = await fetch(new URL(`auctions/${encodeURIComponent(id)}/`, apiUrl).toString(), {
            headers: { Accept: 'application/json' },
            cache: 'no-store',
        })
        if (!res.ok) return fallback
        const a = (await res.json()) as Record<string, unknown>
        const title = text(a.title)
        if (!title) return fallback
        const description = text(a.description)?.slice(0, 160)
        const first = Array.isArray(a.images) ? a.images[0] : undefined
        const imageRaw =
            typeof first === 'string'
                ? text(first)
                : first && typeof first === 'object'
                  ? text((first as Record<string, unknown>).image) ?? text((first as Record<string, unknown>).url)
                  : null
        const image = imageRaw ? resolveMediaSrc(imageRaw) : ''
        return {
            title: `${title} | Bid Central | TradeHut`,
            ...(description ? { description } : {}),
            openGraph: {
                title: `${title} | TradeHut`,
                type: 'website',
                ...(description ? { description } : {}),
                ...(image ? { images: [{ url: image }] } : {}),
            },
        }
    } catch {
        return fallback
    }
}

export default function AuctionDetailLayout({ children }: Pick<LayoutProps, 'children'>) {
    return children
}
