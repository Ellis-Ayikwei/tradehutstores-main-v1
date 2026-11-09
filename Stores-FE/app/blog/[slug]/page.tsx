import { notFound } from 'next/navigation'

// Cloudflare Pages (next-on-pages) runs every server-rendered route on the Edge runtime.
export const runtime = 'edge'

// There is no blog backend yet, so no article exists for any slug.
export default function BlogArticlePage() {
  notFound()
}
