'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Share2 } from 'lucide-react'
import { RatingStars } from '@/components/common/marketplace'
import { AdSlot } from '@/components/Ads'
import { SellerPromosStrip } from '@/components/Promo'
import WriteReviewModal from '@/components/Products/WriteReviewModal'
import { recordRecentlyViewed } from '@/components/Home/homeProduct'
import type { MappedReview } from '@/lib/reviewUtils'
import BuyBox, { DeliveryLine, QuantitySelect, StockLine } from './BuyBox'
import CollapsibleSection from './CollapsibleSection'
import Gallery from './Gallery'
import MobileActionBar from './MobileActionBar'
import PriceBlock from './PriceBlock'
import { AboutList, DetailsTable, SellerPolicies, detailRows } from './ProductInfo'
import ProductJsonLd from './ProductJsonLd'
import RelatedProducts from './RelatedProducts'
import Reviews from './Reviews'
import { toImageList } from './pdpUtils'
import type { PdpProduct, SellerInfo } from './types'
import { usePurchase } from './usePurchase'
import VariantSelector from './VariantSelector'

interface ProductDetailProps {
  product: PdpProduct
  related: PdpProduct[]
  seller: SellerInfo | null
  onReviewAdded: (review: MappedReview, rating: number) => void
}

export default function ProductDetail({ product, related, seller, onReviewAdded }: ProductDetailProps) {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }, [])
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    []
  )

  const purchase = usePurchase(product, showToast)
  const { selectedVariant } = purchase

  useEffect(() => {
    recordRecentlyViewed({
      id: product.id,
      name: product.name,
      image: product.main_product_image || product.images[0] || '',
      price: product.final_price,
    })
  }, [product.id, product.name, product.main_product_image, product.images, product.final_price])

  const galleryImages = useMemo(() => {
    const variantList = toImageList(selectedVariant?.images)
    const base = variantList.length > 0 ? variantList : product.images
    const lead = selectedVariant?.primary_image
    return lead ? [lead, ...base.filter(src => src !== lead)] : base
  }, [product.images, selectedVariant])

  const rows = useMemo(() => detailRows(product, selectedVariant), [product, selectedVariant])

  const jumpToReviews = () => {
    setReviewsOpen(true)
    requestAnimationFrame(() => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' }))
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: product.name, url })
      else {
        await navigator.clipboard.writeText(url)
        showToast('Link copied to clipboard', 'success')
      }
    } catch {
      /* share dismissed or clipboard unavailable */
    }
  }

  const hasAbout = product.description.trim() !== '' || product.key_features.length > 0

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-3 sm:px-4 lg:px-6">
      <ProductJsonLd product={product} inStock={purchase.stock.inStock} />

      {toast ? (
        <div
          role="status"
          className={`fixed right-3 top-28 z-toast max-w-[calc(100vw-1.5rem)] rounded-md border px-4 py-2.5 text-sm font-medium shadow-lg ${
            toast.type === 'success'
              ? 'border-green-700 bg-green-700 text-white dark:border-green-500 dark:bg-green-900 dark:text-green-50'
              : 'border-red-700 bg-red-700 text-white dark:border-red-500 dark:bg-red-900 dark:text-red-50'
          }`}
        >
          {toast.msg}
        </div>
      ) : null}

      <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 overflow-hidden text-xs text-zinc-600 dark:text-zinc-400">
        <Link href="/products" className="shrink-0 hover:text-primary-700 dark:hover:text-primary-400 hover:underline">
          Products
        </Link>
        {product.category ? (
          <>
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
            <Link
              href={`/products?category=${encodeURIComponent(product.category)}`}
              className="shrink-0 hover:text-primary-700 dark:hover:text-primary-400 hover:underline"
            >
              {product.category}
            </Link>
          </>
        ) : null}
        <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        <span className="min-w-0 truncate text-zinc-900 dark:text-zinc-100" aria-current="page">
          {product.name}
        </span>
      </nav>

      <div className="lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)_260px] lg:gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_320px]">
        <Gallery
          key={selectedVariant?.id ?? 'base'}
          images={galleryImages}
          alt={product.name}
          wishlisted={purchase.wishlisted}
          onToggleWishlist={purchase.toggleWishlist}
        />

        <div className="mt-3 min-w-0 space-y-3 lg:mt-0">
          <div className="space-y-1">
            <h1 className="break-words text-xl font-medium leading-snug text-zinc-900 dark:text-zinc-100 lg:text-2xl">{product.name}</h1>
            {product.brand || product.category ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {product.brand ? (
                  <Link
                    href={`/products?search=${encodeURIComponent(product.brand)}`}
                    className="text-primary-700 dark:text-primary-400 hover:underline"
                  >
                    Brand: {product.brand}
                  </Link>
                ) : null}
                {product.brand && product.category ? ' · ' : null}
                {product.category ? (
                  <Link
                    href={`/products?category=${encodeURIComponent(product.category)}`}
                    className="text-primary-700 dark:text-primary-400 hover:underline"
                  >
                    {product.category}
                  </Link>
                ) : null}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {product.total_reviews > 0 ? (
                <>
                  <RatingStars rating={product.average_rating} showValue size="md" />
                  <a
                    href="#reviews"
                    onClick={e => {
                      e.preventDefault()
                      jumpToReviews()
                    }}
                    className="text-sm text-primary-700 dark:text-primary-400 hover:underline"
                  >
                    {product.total_reviews.toLocaleString()} {product.total_reviews === 1 ? 'rating' : 'ratings'}
                  </a>
                </>
              ) : (
                <a
                  href="#reviews"
                  onClick={e => {
                    e.preventDefault()
                    jumpToReviews()
                  }}
                  className="text-sm text-primary-700 dark:text-primary-400 hover:underline"
                >
                  No ratings yet
                </a>
              )}
              <button
                type="button"
                onClick={share}
                className="ml-auto inline-flex h-8 items-center gap-1 rounded-md px-1 text-sm text-zinc-700 dark:text-zinc-300 hover:text-primary-700 dark:hover:text-primary-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400"
              >
                <Share2 className="h-4 w-4" aria-hidden />
                Share
              </button>
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          <PriceBlock info={purchase.price} />

          {seller ? <SellerPromosStrip sellerId={seller.id} sellerName={seller.name ?? undefined} variant="compact" /> : null}

          <div className="space-y-1 lg:hidden">
            <StockLine stock={purchase.stock} />
            <DeliveryLine freeShipping={product.free_shipping} />
          </div>

          <VariantSelector
            product={product}
            useAxisPicker={purchase.useAxisPicker}
            themeAxes={purchase.themeAxes}
            selections={purchase.selections}
            selectedVariant={purchase.selectedVariant}
            onSelectAxis={purchase.selectAxis}
            onSelectVariant={purchase.selectVariant}
            discountPct={purchase.price.discountPct}
          />

          <div className="flex items-center justify-between gap-3 lg:hidden">
            <QuantitySelect purchase={purchase} id="pdp-qty-mobile" />
            <button
              type="button"
              onClick={purchase.toggleWishlist}
              aria-pressed={purchase.wishlisted}
              className="h-10 text-sm text-primary-700 dark:text-primary-400 hover:underline"
            >
              {purchase.wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            </button>
          </div>

          {rows.length > 0 ? (
            <div className="hidden lg:block">
              <DetailsTable rows={rows} />
            </div>
          ) : null}

          {hasAbout ? (
            <div className="hidden space-y-1.5 lg:block">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">About this item</h2>
              <AboutList product={product} />
            </div>
          ) : null}
        </div>

        <BuyBox product={product} purchase={purchase} seller={seller} />
      </div>

      <div className="mt-3 space-y-0">
        {hasAbout ? (
          <CollapsibleSection title="About this item" className="lg:hidden" defaultOpen>
            <AboutList product={product} />
          </CollapsibleSection>
        ) : null}
        <CollapsibleSection title="Details" className="lg:hidden">
          <DetailsTable rows={rows} />
        </CollapsibleSection>
        <CollapsibleSection title="Seller and policies" className="lg:hidden">
          <SellerPolicies product={product} seller={seller} />
        </CollapsibleSection>
        <CollapsibleSection
          id="reviews"
          title={`Customer reviews${product.total_reviews > 0 ? ` (${product.total_reviews.toLocaleString()})` : ''}`}
          open={reviewsOpen}
          onOpenChange={setReviewsOpen}
        >
          <Reviews product={product} onWrite={() => setReviewModalOpen(true)} />
        </CollapsibleSection>
      </div>

      <div className="mt-3 space-y-3">
        <AdSlot slug="product-page" aspectClass="aspect-[21/4] md:aspect-[21/3]" rounded="rounded-lg" />
        <RelatedProducts items={related} category={product.category} />
      </div>

      <MobileActionBar purchase={purchase} />

      <WriteReviewModal
        open={reviewModalOpen}
        onOpenChange={setReviewModalOpen}
        productId={product.id}
        onSubmitted={onReviewAdded}
        onToast={showToast}
      />
    </div>
  )
}
