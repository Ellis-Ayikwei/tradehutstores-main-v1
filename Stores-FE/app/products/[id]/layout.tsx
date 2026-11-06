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

/** Title, description and share image come from the product API only; nothing is invented. */
export async function generateMetadata({ params }: Pick<LayoutProps, 'params'>): Promise<Metadata> {
  const { id } = await params
  try {
    const res = await fetch(new URL(`products/${encodeURIComponent(id)}/`, apiUrl).toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    })
    if (!res.ok) return { title: 'Product | TradeHut' }
    const p = (await res.json()) as Record<string, unknown>
    const name = text(p.name)
    if (!name) return { title: 'Product | TradeHut' }
    const description = text(p.description)?.slice(0, 160)
    const imageRaw = text(p.main_product_image)
    const image = imageRaw ? resolveMediaSrc(imageRaw) : ''
    return {
      title: `${name} | TradeHut`,
      ...(description ? { description } : {}),
      openGraph: {
        title: `${name} | TradeHut`,
        type: 'website',
        ...(description ? { description } : {}),
        ...(image ? { images: [{ url: image }] } : {}),
      },
    }
  } catch {
    return { title: 'Product | TradeHut' }
  }
}

export default function ProductDetailLayout({ children }: Pick<LayoutProps, 'children'>) {
  return children
}
