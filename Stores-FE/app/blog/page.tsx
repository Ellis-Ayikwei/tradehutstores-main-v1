import Link from 'next/link'
import { Newspaper } from 'lucide-react'
import MainLayout from '@/components/Layouts/MainLayout'

export const metadata = {
  title: 'Blog | TradeHut',
  description: 'News and guides from TradeHut.',
}

// There is no blog backend yet, so the index renders an honest empty state.
export default function BlogIndexPage() {
  return (
    <MainLayout>
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center sm:px-6">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <Newspaper className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-4 font-syne text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Blog
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">No articles have been published yet. Check back soon.</p>
        <Link
          href="/products"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-lg bg-primary px-5 text-sm font-bold text-white hover:bg-primary-600"
        >
          Browse products
        </Link>
      </main>
    </MainLayout>
  )
}
