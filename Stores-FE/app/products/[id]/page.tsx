'use client'

import { notFound, useParams } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import MainLayout from '@/components/Layouts/MainLayout'
import type { MappedReview } from '@/lib/reviewUtils'
import PdpMessage from './_components/PdpMessage'
import PdpSkeleton from './_components/PdpSkeleton'
import ProductDetail from './_components/ProductDetail'
import { PdpNotFoundError, usePdpProduct, useSellerInfo } from './_components/usePdpProduct'

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id ?? ''
  const { data, error, isLoading, mutate } = usePdpProduct(id)
  const seller = useSellerInfo(data?.product)

  if (error instanceof PdpNotFoundError) notFound()

  const addReview = (review: MappedReview, rating: number) => {
    void mutate(
      prev => {
        if (!prev) return prev
        const p = prev.product
        const count = p.total_reviews + 1
        const average = p.total_reviews === 0 ? rating : (p.average_rating * p.total_reviews + rating) / count
        return {
          ...prev,
          product: { ...p, reviews: [review, ...p.reviews], total_reviews: count, average_rating: average },
        }
      },
      { revalidate: false }
    )
  }

  return (
    <MainLayout>
      {isLoading || (!data && !error) ? (
        <PdpSkeleton />
      ) : error || !data ? (
        <PdpMessage
          icon={<AlertTriangle className="h-8 w-8" aria-hidden />}
          title="We could not load this product"
          message="Something went wrong while loading the product details. Please try again."
          action={
            <button
              type="button"
              onClick={() => void mutate()}
              className="inline-flex h-11 items-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 ring-offset-white dark:focus-visible:ring-primary-400 dark:ring-offset-gray-950 sm:h-9"
            >
              Try again
            </button>
          }
        />
      ) : (
        <ProductDetail product={data.product} related={data.related} seller={seller} onReviewAdded={addReview} />
      )}
    </MainLayout>
  )
}
