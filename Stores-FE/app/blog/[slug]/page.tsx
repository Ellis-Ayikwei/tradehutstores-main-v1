import { notFound } from 'next/navigation'

// There is no blog backend yet, so no article exists for any slug.
export default function BlogArticlePage() {
  notFound()
}
